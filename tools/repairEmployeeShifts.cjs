const fs = require("fs");
const path = require("path");

const root = process.cwd();

function full(file) {
    return path.join(root, file);
}

function read(file) {
    return fs.readFileSync(
        full(file),
        "utf8"
    );
}

function write(file, content) {
    fs.writeFileSync(
        full(file),
        content,
        "utf8"
    );
}

function backupOnce(file, suffix) {
    const source = full(file);
    const backup = source + suffix;

    if (
        fs.existsSync(source) &&
        !fs.existsSync(backup)
    ) {
        fs.copyFileSync(
            source,
            backup
        );
    }
}


/*
 * =========================================================
 * 1) REPAIR EMPLOYEE SHIFT STORE
 * =========================================================
 */

const storeFile =
    "electron/pharmfly/settings/employeeShiftStore.js";

const storeCode = [
    'import {',
    '    getLocalSalesDatabase',
    '} from "../../localdb/localSalesDb.js";',
    '',
    'function ensureSchema() {',
    '    const db = getLocalSalesDatabase();',
    '',
    '    db.exec(',
    '        "CREATE TABLE IF NOT EXISTS employee_shift_assignments (" +',
    '        "branch_id INTEGER NOT NULL," +',
    '        "employee_id TEXT NOT NULL," +',
    '        "shift_code TEXT NOT NULL," +',
    '        "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +',
    '        "PRIMARY KEY (branch_id, employee_id)" +',
    '        ")"',
    '    );',
    '',
    '    db.exec(',
    '        "CREATE INDEX IF NOT EXISTS idx_employee_shift_branch " +',
    '        "ON employee_shift_assignments (branch_id)"',
    '    );',
    '',
    '    return db;',
    '}',
    '',
    'export function getEmployeeShiftAssignments(branchId) {',
    '    const db = ensureSchema();',
    '',
    '    const rows = db.prepare(',
    '        "SELECT branch_id, employee_id, shift_code, updated_at " +',
    '        "FROM employee_shift_assignments " +',
    '        "WHERE branch_id = ? " +',
    '        "ORDER BY employee_id"',
    '    ).all(Number(branchId));',
    '',
    '    return {',
    '        success: true,',
    '        branchId: Number(branchId),',
    '        assignments: rows',
    '    };',
    '}',
    '',
    'export function saveEmployeeShiftAssignment({',
    '    branchId,',
    '    employeeId,',
    '    shiftCode',
    '}) {',
    '    const numericBranchId = Number(branchId);',
    '    const normalizedEmployeeId = String(employeeId ?? "").trim();',
    '    const normalizedShift = String(shiftCode ?? "").trim();',
    '',
    '    if (!Number.isFinite(numericBranchId) || numericBranchId <= 0) {',
    '        throw new Error("A valid branch is required.");',
    '    }',
    '',
    '    if (!normalizedEmployeeId) {',
    '        throw new Error("A valid employee is required.");',
    '    }',
    '',
    '    const allowed = new Set([',
    '        "MORNING",',
    '        "EVENING",',
    '        "NIGHT"',
    '    ]);',
    '',
    '    if (!allowed.has(normalizedShift)) {',
    '        throw new Error("Invalid shift code.");',
    '    }',
    '',
    '    const db = ensureSchema();',
    '',
    '    db.prepare(',
    '        "INSERT INTO employee_shift_assignments (" +',
    '        "branch_id, employee_id, shift_code, updated_at" +',
    '        ") VALUES (?, ?, ?, CURRENT_TIMESTAMP) " +',
    '        "ON CONFLICT(branch_id, employee_id) DO UPDATE SET " +',
    '        "shift_code = excluded.shift_code, " +',
    '        "updated_at = CURRENT_TIMESTAMP"',
    '    ).run(',
    '        numericBranchId,',
    '        normalizedEmployeeId,',
    '        normalizedShift',
    '    );',
    '',
    '    return {',
    '        success: true,',
    '        branchId: numericBranchId,',
    '        employeeId: normalizedEmployeeId,',
    '        shiftCode: normalizedShift',
    '    };',
    '}',
    '',
    'export default {',
    '    getEmployeeShiftAssignments,',
    '    saveEmployeeShiftAssignment',
    '};',
    ''
].join("\n");

backupOnce(
    storeFile,
    ".backup-before-employee-shifts-repair"
);

write(
    storeFile,
    storeCode
);


/*
 * =========================================================
 * 2) DASHBOARD IPC
 * =========================================================
 */

const ipcFile =
    "electron/ipc/dashboard.ipc.js";

backupOnce(
    ipcFile,
    ".backup-before-employee-shifts-repair"
);

let ipc =
    read(ipcFile);

if (
    !ipc.includes(
        "getEmployeeShiftAssignments"
    )
) {

    const importMatch =
        /import\s*\{\s*getSellerPerformance\s*\}\s*from\s*"[^"]+sellerPerformanceService\.js";/;

    const importFound =
        ipc.match(
            importMatch
        );

    if (!importFound) {
        throw new Error(
            "Could not find sellerPerformance import"
        );
    }

    const addition =
`import {
    getEmployeeShiftAssignments,
    saveEmployeeShiftAssignment
} from "../pharmfly/settings/employeeShiftStore.js";

`;

    ipc =
        ipc.replace(
            importMatch,
            importFound[0] +
            "\n\n" +
            addition.trimEnd()
        );
}

if (
    !ipc.includes(
        '"employee-shift-get"'
    )
) {

    const sellerComment =
        /(\s*\/\*\s*[\s\S]*?SELLER PERFORMANCE[\s\S]*?\*\/\s*)/;

    const found =
        ipc.match(
            sellerComment
        );

    if (!found) {
        throw new Error(
            "Could not find seller performance IPC section"
        );
    }

    const actionBlock = [
        "",
        "            /*",
        "             * =====================================================",
        "             * EMPLOYEE SHIFT ASSIGNMENTS",
        "             * =====================================================",
        "             */",
        "",
        "            if (",
        "                payload?.action ===",
        '                "employee-shift-get"',
        "            ) {",
        "",
        "                return getEmployeeShiftAssignments(",
        "                    payload?.branchId",
        "                );",
        "",
        "            }",
        "",
        "",
        "            if (",
        "                payload?.action ===",
        '                "employee-shift-save"',
        "            ) {",
        "",
        "                return saveEmployeeShiftAssignment({",
        "",
        "                    branchId:",
        "                        payload?.branchId,",
        "",
        "                    employeeId:",
        "                        payload?.employeeId,",
        "",
        "                    shiftCode:",
        "                        payload?.shiftCode",
        "",
        "                });",
        "",
        "            }",
        "",
        ""
    ].join("\n");

    ipc =
        ipc.replace(
            found[1],
            actionBlock +
            found[1]
        );
}

write(
    ipcFile,
    ipc
);


/*
 * =========================================================
 * 3) NAVIGATION
 * =========================================================
 */

const navFile =
    "src/app/navigation.js";

backupOnce(
    navFile,
    ".backup-before-employee-shifts-repair"
);

let nav =
    read(navFile);

if (
    !nav.includes(
        'id: "staff-shifts"'
    )
) {

    const pattern =
        /(\{\s*id:\s*"staff-productivity"[\s\S]*?sectionId:\s*"staff"\s*\})/;

    if (!pattern.test(nav)) {
        throw new Error(
            "staff-productivity navigation item not found"
        );
    }

    const newItem =
`$1,
            {
                id: "staff-shifts",
                label: "\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a \\u0627\\u0644\\u0645\\u0648\\u0638\\u0641\\u064a\\0646",
                sectionId: "staff"
            }`;

    nav =
        nav.replace(
            pattern,
            newItem
        );
}

write(
    navFile,
    nav
);


/*
 * =========================================================
 * 4) ROUTER
 * =========================================================
 */

const routerFile =
    "src/app/BranchAnalyticsRouter.jsx";

backupOnce(
    routerFile,
    ".backup-before-employee-shifts-repair"
);

let router =
    read(routerFile);

if (
    !router.includes(
        "EmployeeShiftsPage"
    )
) {

    const reactImport =
        'import React from "react";';

    if (
        router.includes(
            reactImport
        )
    ) {

        router =
            router.replace(
                reactImport,
                reactImport +
                '\nimport EmployeeShiftsPage from "../components/EmployeeShiftsPage.jsx";'
            );

    }
    else {
        throw new Error(
            "React import not found in router"
        );
    }
}

if (
    !router.includes(
        'activeModule ===\n            "staff-shifts"'
    ) &&
    !router.includes(
        'activeModule ===\n                "staff-shifts"'
    )
) {

    const anchor =
`    /*
     * =========================================================
     * ANALYTICS HUB SECTIONS
     * =========================================================
     */`;

    if (
        !router.includes(
            anchor
        )
    ) {
        throw new Error(
            "Analytics Hub section anchor not found"
        );
    }

    const route =
`    if (
        activeSection ===
            "staff" &&
        activeModule ===
            "staff-shifts"
    ) {

        return (
            <EmployeeShiftsPage

                branchId={
                    selectedBranchId
                }

                connection={
                    selectedConnection
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }

            />
        );

    }


`;

    router =
        router.replace(
            anchor,
            route + anchor
        );
}

write(
    routerFile,
    router
);


/*
 * =========================================================
 * 5) PAGE CHECK
 * =========================================================
 */

const pageFile =
    "src/components/EmployeeShiftsPage.jsx";

if (
    !fs.existsSync(
        full(pageFile)
    )
) {
    throw new Error(
        "EmployeeShiftsPage.jsx was not created"
    );
}


/*
 * =========================================================
 * DONE
 * =========================================================
 */

console.log(
    "EMPLOYEE SHIFTS REPAIR COMPLETED"
);

console.log(
    "Store: OK"
);

console.log(
    "Dashboard IPC: OK"
);

console.log(
    "Navigation: OK"
);

console.log(
    "Router: OK"
);

console.log(
    "Page: OK"
);
