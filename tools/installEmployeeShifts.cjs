const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
    return fs.readFileSync(
        path.join(root, file),
        "utf8"
    );
}

function write(file, content) {
    fs.writeFileSync(
        path.join(root, file),
        content,
        "utf8"
    );
}

function backupOnce(file, suffix) {
    const full = path.join(root, file);
    const backup = full + suffix;

    if (!fs.existsSync(backup)) {
        fs.copyFileSync(full, backup);
    }
}

/*
 * =========================================================
 * 1) EMPLOYEE SHIFT STORE
 * =========================================================
 */

const storeFile =
    "electron/pharmfly/settings/employeeShiftStore.js";

const storeDir =
    path.dirname(
        path.join(root, storeFile)
    );

fs.mkdirSync(
    storeDir,
    { recursive: true }
);

const storeCode = String.raw`
import {
    getLocalSalesDatabase
} from "../../localdb/localSalesDb.js";


function ensureSchema() {

    const db =
        getLocalSalesDatabase();

    db.exec(\`
        CREATE TABLE IF NOT EXISTS employee_shift_assignments (

            branch_id INTEGER NOT NULL,

            employee_id TEXT NOT NULL,

            shift_code TEXT NOT NULL,

            updated_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (
                branch_id,
                employee_id
            )

        );

        CREATE INDEX IF NOT EXISTS
            idx_employee_shift_branch
        ON employee_shift_assignments (
            branch_id
        );
    \`);

    return db;

}


export function getEmployeeShiftAssignments(
    branchId
) {

    const db =
        ensureSchema();

    const rows =
        db.prepare(\`
            SELECT
                branch_id,
                employee_id,
                shift_code,
                updated_at
            FROM employee_shift_assignments
            WHERE branch_id = ?
            ORDER BY employee_id
        \`).all(
            Number(branchId)
        );

    return {
        success: true,
        branchId: Number(branchId),
        assignments: rows
    };

}


export function saveEmployeeShiftAssignment({
    branchId,
    employeeId,
    shiftCode
}) {

    const numericBranchId =
        Number(branchId);

    const normalizedEmployeeId =
        String(
            employeeId ?? ""
        ).trim();

    const normalizedShift =
        String(
            shiftCode ?? ""
        ).trim();

    if (
        !Number.isFinite(
            numericBranchId
        ) ||
        numericBranchId <= 0
    ) {
        throw new Error(
            "A valid branch is required."
        );
    }

    if (
        !normalizedEmployeeId
    ) {
        throw new Error(
            "A valid employee is required."
        );
    }

    const allowed =
        new Set([
            "MORNING",
            "EVENING",
            "NIGHT"
        ]);

    if (
        !allowed.has(
            normalizedShift
        )
    ) {
        throw new Error(
            "Invalid shift code."
        );
    }

    const db =
        ensureSchema();

    db.prepare(\`
        INSERT INTO employee_shift_assignments (
            branch_id,
            employee_id,
            shift_code,
            updated_at
        )
        VALUES (
            ?,
            ?,
            ?,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (
            branch_id,
            employee_id
        )
        DO UPDATE SET
            shift_code = excluded.shift_code,
            updated_at = CURRENT_TIMESTAMP
    \`).run(
        numericBranchId,
        normalizedEmployeeId,
        normalizedShift
    );

    return {
        success: true,
        branchId: numericBranchId,
        employeeId: normalizedEmployeeId,
        shiftCode: normalizedShift
    };

}


export default {
    getEmployeeShiftAssignments,
    saveEmployeeShiftAssignment
};
`;

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
    ".backup-before-employee-shifts"
);

let ipc =
    read(ipcFile);

const importAnchor =
`import {
    getSellerPerformance
} from "../pharmfly/sellerPerformanceService.js";`;

const importReplacement =
`import {
    getSellerPerformance
} from "../pharmfly/sellerPerformanceService.js";

import {
    getEmployeeShiftAssignments,
    saveEmployeeShiftAssignment
} from "../pharmfly/settings/employeeShiftStore.js";`;

if (
    !ipc.includes(
        "getEmployeeShiftAssignments"
    )
) {
    if (
        !ipc.includes(
            importAnchor
        )
    ) {
        throw new Error(
            "dashboard ipc seller performance import anchor not found"
        );
    }

    ipc =
        ipc.replace(
            importAnchor,
            importReplacement
        );
}

const actionAnchor =
`            /*
             * =====================================================
             * SELLER PERFORMANCE
             * =====================================================
             */`;

const actionBlock =
`            /*
             * =====================================================
             * EMPLOYEE SHIFT ASSIGNMENTS - GET
             * =====================================================
             */

            if (
                payload?.action ===
                "employee-shift-get"
            ) {

                return getEmployeeShiftAssignments(
                    payload?.branchId
                );

            }


            /*
             * =====================================================
             * EMPLOYEE SHIFT ASSIGNMENTS - SAVE
             * =====================================================
             */

            if (
                payload?.action ===
                "employee-shift-save"
            ) {

                return saveEmployeeShiftAssignment({

                    branchId:
                        payload?.branchId,

                    employeeId:
                        payload?.employeeId,

                    shiftCode:
                        payload?.shiftCode

                });

            }


` + actionAnchor;

if (
    !ipc.includes(
        'payload?.action ===\n                "employee-shift-get"'
    )
) {
    const at =
        ipc.indexOf(
            actionAnchor
        );

    if (at === -1) {
        throw new Error(
            "dashboard ipc action anchor not found"
        );
    }

    ipc =
        ipc.slice(0, at) +
        actionBlock +
        ipc.slice(at);
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
    ".backup-before-employee-shifts"
);

let nav =
    read(navFile);

const navAnchor =
`{ id: "staff-productivity", label: "الإنتاجية", sectionId: "staff" }`;

const navReplacement =
`${navAnchor},
            {
                id: "staff-shifts",
                label: "\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a \\u0627\\u0644\\u0645\\u0648\\u0638\\u0641\\u064a\\u0646",
                sectionId: "staff"
            }`;

if (
    !nav.includes(
        'id: "staff-shifts"'
    )
) {

    if (
        !nav.includes(
            navAnchor
        )
    ) {
        throw new Error(
            "staff productivity navigation anchor not found"
        );
    }

    nav =
        nav.replace(
            navAnchor,
            navReplacement
        );
}

write(
    navFile,
    nav
);

/*
 * =========================================================
 * 4) DEDICATED STAFF SHIFTS PAGE
 * =========================================================
 */

const pageFile =
    "src/components/EmployeeShiftsPage.jsx";

const pageCode = String.raw`
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";


const SHIFTS = [
    {
        code: "MORNING",
        name:
            "\u0627\u0644\u0635\u0628\u0627\u062d\u064a",
        time:
            "09:00 - 17:00"
    },
    {
        code: "EVENING",
        name:
            "\u0627\u0644\u0645\u0633\u0627\u0626\u064a",
        time:
            "17:00 - 02:00"
    },
    {
        code: "NIGHT",
        name:
            "\u0627\u0644\u0644\u064a\u0644\u064a",
        time:
            "02:00 - 09:00"
    }
];


function normalizeEmployees(
    result
) {

    const source =
        Array.isArray(
            result?.employees
        )
            ? result.employees
            : Array.isArray(
                result?.sellers
            )
                ? result.sellers
                : [];

    return source
        .map(
            row => ({
                employeeId:
                    String(
                        row?.employeeId ??
                        row?.employee_id ??
                        row?.sellerId ??
                        ""
                    ).trim(),

                employeeName:
                    String(
                        row?.employeeName ??
                        row?.employee_name ??
                        row?.sellerName ??
                        row?.name ??
                        row?.employeeId ??
                        "-"
                    ).trim()
            })
        )
        .filter(
            row =>
                row.employeeId &&
                row.employeeId !==
                    "UNASSIGNED"
        );
}


export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
}) {

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        savingId,
        setSavingId
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    const [
        employees,
        setEmployees
    ] = useState([]);

    const [
        assignments,
        setAssignments
    ] = useState({});


    const assignmentMap =
        useMemo(
            () => {

                const map = {};

                for (
                    const row
                    of (
                        Array.isArray(
                            assignments
                        )
                            ? assignments
                            : []
                    )
                ) {

                    map[
                        String(
                            row.employee_id
                        )
                    ] =
                        row.shift_code;

                }

                return map;

            },
            [
                assignments
            ]
        );


    const load =
        useCallback(
            async () => {

                if (
                    branchId ===
                    "all" ||
                    branchId == null
                ) {

                    setEmployees([]);
                    setAssignments([]);
                    setLoading(false);
                    return;

                }

                try {

                    setLoading(true);
                    setError("");

                    const [
                        sellerResult,
                        shiftResult
                    ] =
                        await Promise.all([

                            window
                                .pharmaBI
                                .dashboard
                                .overview({

                                    action:
                                        "seller-overview",

                                    branchId,

                                    fromDate,
                                    toDate,

                                    connection

                                }),

                            window
                                .pharmaBI
                                .dashboard
                                .overview({

                                    action:
                                        "employee-shift-get",

                                    branchId

                                })

                        ]);


                    setEmployees(
                        normalizeEmployees(
                            sellerResult
                        )
                    );


                    setAssignments(
                        Array.isArray(
                            shiftResult?.assignments
                        )
                            ? shiftResult.assignments
                            : []
                    );

                }
                catch (
                    requestError
                ) {

                    console.error(
                        "[EmployeeShiftsPage] load failed:",
                        requestError
                    );

                    setError(
                        requestError?.message ||
                        "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646."
                    );

                }
                finally {

                    setLoading(false);

                }

            },
            [
                branchId,
                connection,
                fromDate,
                toDate
            ]
        );


    useEffect(
        () => {

            load();

        },
        [load]
    );


    const save =
        async (
            employeeId,
            shiftCode
        ) => {

            try {

                setSavingId(
                    String(
                        employeeId
                    )
                );

                setError("");

                await window
                    .pharmaBI
                    .dashboard
                    .overview({

                        action:
                            "employee-shift-save",

                        branchId,

                        employeeId,

                        shiftCode

                    });


                setAssignments(
                    previous => {

                        const rows =
                            Array.isArray(
                                previous
                            )
                                ? previous.filter(
                                    row =>
                                        String(
                                            row.employee_id
                                        ) !==
                                        String(
                                            employeeId
                                        )
                                )
                                : [];

                        rows.push({

                            branch_id:
                                Number(
                                    branchId
                                ),

                            employee_id:
                                String(
                                    employeeId
                                ),

                            shift_code:
                                shiftCode

                        });

                        return rows;

                    }
                );

            }
            catch (
                requestError
            ) {

                console.error(
                    "[EmployeeShiftsPage] save failed:",
                    requestError
                );

                setError(
                    requestError?.message ||
                    "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0634\u064a\u0641\u062a."
                );

            }
            finally {

                setSavingId("");

            }

        };


    if (
        branchId ===
        "all"
    ) {

        return (
            <section className="page-card">

                <div className="page-header">
                    <div>

                        <div className="page-eyebrow">
                            STAFF SHIFTS
                        </div>

                        <h2>
                            {"\u0634\u064a\u0641\u062a\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646"}
                        </h2>

                    </div>
                </div>

                <p>
                    {"\u0627\u062e\u062a\u0631 \u0641\u0631\u0639\u064b\u0627 \u0645\u062d\u062f\u062f\u064b\u0627 \u0644\u0625\u062f\u0627\u0631\u0629 \u0634\u064a\u0641\u062a\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646."}
                </p>

            </section>
        );

    }


    return (
        <section className="page-card">

            <div className="page-header">

                <div>

                    <div className="page-eyebrow">
                        STAFF SHIFTS
                    </div>

                    <h2>
                        {"\u0634\u064a\u0641\u062a\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646"}
                    </h2>

                    <p>
                        {"\u0644\u0643\u0644 \u0645\u0648\u0638\u0641 \u0634\u064a\u0641\u062a \u0623\u0633\u0627\u0633\u064a \u0648\u0627\u062d\u062f."}
                    </p>

                </div>

            </div>


            {error && (
                <div className="error-card">
                    {error}
                </div>
            )}


            {loading ? (
                <div className="loading-card">
                    <div className="loading-spinner" />
                    <h2>
                        {"\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646..."}
                    </h2>
                </div>
            ) : (
                <div className="table-card">

                    <div className="table-wrap">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        {"\u0627\u0644\u0645\u0648\u0638\u0641"}
                                    </th>

                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        {"\u0627\u0644\u0634\u064a\u0641\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a"}
                                    </th>

                                    <th>
                                        {"\u0627\u0644\u062d\u0627\u0644\u0629"}
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {employees.length ? (
                                    employees.map(
                                        employee => {

                                            const current =
                                                assignmentMap[
                                                    employee.employeeId
                                                ];

                                            const selected =
                                                current ||
                                                "";

                                            const saving =
                                                savingId ===
                                                employee.employeeId;

                                            return (
                                                <tr
                                                    key={
                                                        employee.employeeId
                                                    }
                                                >

                                                    <td>
                                                        <strong>
                                                            {
                                                                employee.employeeName
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {
                                                            employee.employeeId
                                                        }
                                                    </td>

                                                    <td>

                                                        <select
                                                            value={
                                                                selected
                                                            }
                                                            disabled={
                                                                saving
                                                            }
                                                            onChange={
                                                                event =>
                                                                    save(
                                                                        employee.employeeId,
                                                                        event.target.value
                                                                    )
                                                            }
                                                            style={{
                                                                minWidth: 210,
                                                                padding: 8,
                                                                borderRadius: 8,
                                                                border: "1px solid rgba(127,127,127,.3)",
                                                                fontFamily: "inherit"
                                                            }}
                                                        >

                                                            <option value="">
                                                                {"\u0627\u062e\u062a\u0631 \u0627\u0644\u0634\u064a\u0641\u062a"}
                                                            </option>

                                                            {SHIFTS.map(
                                                                shift => (
                                                                    <option
                                                                        key={
                                                                            shift.code
                                                                        }
                                                                        value={
                                                                            shift.code
                                                                        }
                                                                    >
                                                                        {
                                                                            shift.name
                                                                        }
                                                                        {"  "}
                                                                        (
                                                                        {
                                                                            shift.time
                                                                        }
                                                                        )
                                                                    </option>
                                                                )
                                                            )}

                                                        </select>

                                                    </td>

                                                    <td>

                                                        {saving ? (
                                                            <span>
                                                                {"\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..."}
                                                            </span>
                                                        ) : current ? (
                                                            <span>
                                                                {"\u0645\u0631\u062a\u0628\u0637"}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {"\u063a\u064a\u0631 \u0645\u062d\u062f\u062f"}
                                                            </span>
                                                        )}

                                                    </td>

                                                </tr>
                                            );

                                        }
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={4}
                                        >
                                            {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0648\u0638\u0641\u064a\u0646 \u0644\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629."}
                                        </td>
                                    </tr>
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}

        </section>
    );

}
`;

write(
    pageFile,
    pageCode
);

/*
 * =========================================================
 * 5) ROUTER
 * =========================================================
 */

const routerFile =
    "src/app/BranchAnalyticsRouter.jsx";

backupOnce(
    routerFile,
    ".backup-before-employee-shifts"
);

let router =
    read(routerFile);

const routerImportAnchor =
`import SalesShiftsPage
      from "../components/SalesShiftsPage.jsx";`;

const routerImportReplacement =
`${routerImportAnchor}

import EmployeeShiftsPage
      from "../components/EmployeeShiftsPage.jsx";`;

if (
    !router.includes(
        "EmployeeShiftsPage"
    )
) {
    if (
        !router.includes(
            routerImportAnchor
        )
    ) {
        throw new Error(
            "router SalesShiftsPage import anchor not found"
        );
    }

    router =
        router.replace(
            routerImportAnchor,
            routerImportReplacement
        );
}


const staffRouteAnchor =
`    if (
        activeSection ===
            "profitability" ||
        activeSection ===
            "branches" ||
        activeSection ===
            "staff" ||
        activeSection ===
            "forecast" ||
        activeSection ===
            "quality"
    ) {`;

const staffRouteBlock =
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


` + staffRouteAnchor;

if (
    !router.includes(
        'activeModule ===\n            "staff-shifts"'
    )
) {

    if (
        !router.includes(
            staffRouteAnchor
        )
    ) {
        throw new Error(
            "router analytics hub anchor not found"
        );
    }

    router =
        router.replace(
            staffRouteAnchor,
            staffRouteBlock
        );
}

write(
    routerFile,
    router
);

/*
 * =========================================================
 * 6) VALIDATION
 * =========================================================
 */

const required = [
    storeFile,
    ipcFile,
    navFile,
    pageFile,
    routerFile
];

for (
    const file of required
) {
    if (
        !fs.existsSync(
            path.join(root, file)
        )
    ) {
        throw new Error(
            "Missing file after edit: " +
            file
        );
    }
}

console.log(
    "EMPLOYEE SHIFT FEATURE INSTALLED"
);
console.log(
    "Files updated:",
    required.length
);
console.log(
    "Shift codes: MORNING / EVENING / NIGHT"
);
