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
 * 1) DIRECT EMPLOYEE DIRECTORY SERVICE
 * =========================================================
 */

const serviceFile =
    "electron/pharmfly/employeeDirectoryService.js";

const serviceCode = `
import {
    getBranchPool
} from "../connection/connectionManager.js";


const cache =
    new Map();


const CACHE_TTL_MS =
    5 * 60 * 1000;


export async function getEmployeeDirectory({
    branchId,
    connection = null
}) {

    const numericBranchId =
        Number(branchId);

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


    const cached =
        cache.get(
            numericBranchId
        );

    if (
        cached &&
        Date.now() -
            cached.createdAt <
            CACHE_TTL_MS
    ) {
        return {
            success: true,
            branchId:
                numericBranchId,
            employees:
                cached.employees,
            cached: true
        };
    }


    const pool =
        await getBranchPool(
            numericBranchId,
            connection
        );


    const result =
        await pool
            .request()
            .query(\`
                SET NOCOUNT ON;

                SELECT
                    CONVERT(
                        nvarchar(100),
                        c.ID
                    ) AS employee_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ) AS employee_name

                FROM dbo.Cards c

                WHERE
                    ISNULL(
                        c.IsEmployee,
                        0
                    ) = 1

                AND
                    NULLIF(
                        LTRIM(
                            RTRIM(
                                CONVERT(
                                    nvarchar(400),
                                    c.Name
                                )
                            )
                        ),
                        ''
                    ) IS NOT NULL

                ORDER BY
                    c.Name;
            \`);


    const employees =
        (
            result?.recordset ||
            []
        )
        .map(
            row => ({

                employeeId:
                    String(
                        row?.employee_id ||
                        ""
                    ).trim(),

                employeeName:
                    String(
                        row?.employee_name ||
                        ""
                    ).trim()

            })
        )
        .filter(
            row =>
                row.employeeId &&
                row.employeeName
        );


    cache.set(
        numericBranchId,
        {
            createdAt:
                Date.now(),
            employees
        }
    );


    console.log(
        "[employeeDirectory] branch=" +
        numericBranchId +
        " employees=" +
        employees.length
    );


    return {
        success: true,
        branchId:
            numericBranchId,
        employees,
        cached: false
    };

}


export default {
    getEmployeeDirectory
};
`;

backupOnce(
    serviceFile,
    ".backup-before-direct-directory"
);

write(
    serviceFile,
    serviceCode
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
    ".backup-before-direct-directory"
);

let ipc =
    read(ipcFile);


if (
    !ipc.includes(
        "getEmployeeDirectory"
    )
) {

    const shiftImport =
`import {
    getEmployeeShiftAssignments,
    saveEmployeeShiftAssignment
} from "../pharmfly/settings/employeeShiftStore.js";`;

    if (
        !ipc.includes(
            shiftImport
        )
    ) {
        throw new Error(
            "Employee shift store import not found"
        );
    }

    const directoryImport =
`${shiftImport}

import {
    getEmployeeDirectory
} from "../pharmfly/employeeDirectoryService.js";`;

    ipc =
        ipc.replace(
            shiftImport,
            directoryImport
        );
}


if (
    !ipc.includes(
        '"employee-directory-get"'
    )
) {

    const shiftAction =
`            if (
                payload?.action ===
                "employee-shift-get"
            ) {`;

    const position =
        ipc.indexOf(
            shiftAction
        );

    if (
        position === -1
    ) {
        throw new Error(
            "Employee shift GET action not found"
        );
    }

    const directoryAction = `
            if (
                payload?.action ===
                "employee-directory-get"
            ) {

                return getEmployeeDirectory({

                    branchId:
                        payload?.branchId,

                    connection:
                        payload?.connection ||
                        null

                });

            }


`;

    ipc =
        ipc.slice(
            0,
            position
        ) +
        directoryAction +
        ipc.slice(
            position
        );
}

write(
    ipcFile,
    ipc
);


/*
 * =========================================================
 * 3) EMPLOYEE SHIFTS PAGE
 * =========================================================
 */

const pageFile =
    "src/components/EmployeeShiftsPage.jsx";

backupOnce(
    pageFile,
    ".backup-before-direct-directory"
);

let page =
    read(pageFile);


/*
 * Replace seller-overview with direct directory.
 */

page =
    page.replace(
`                                    action:
                                        "seller-overview",`,
`                                    action:
                                        "employee-directory-get",`
);


page =
    page.replace(
`                                    fromDate:
                                        employeeListRange.fromDate,

                                    toDate:
                                        employeeListRange.toDate,

`,
``
);


/*
 * Remove date helper and current date range usage.
 */

const helperStart =
    page.indexOf(
        "function getEmployeeListDateRange()"
    );

if (
    helperStart !== -1
) {

    const openBrace =
        page.indexOf(
            "{",
            helperStart
        );

    let depth = 0;
    let helperEnd = -1;

    for (
        let i = openBrace;
        i < page.length;
        i++
    ) {

        if (
            page[i] === "{"
        ) {
            depth++;
        }
        else if (
            page[i] === "}"
        ) {
            depth--;

            if (
                depth === 0
            ) {
                helperEnd =
                    i + 1;
                break;
            }
        }
    }

    if (
        helperEnd !== -1
    ) {

        page =
            page.slice(
                0,
                helperStart
            ) +
            page.slice(
                helperEnd
            );

    }
}


/*
 * Remove employeeListRange declaration.
 */

page =
    page.replace(
`                const employeeListRange =
                    getEmployeeListDateRange();

`,
``
);


/*
 * Remove date dependencies from load callback.
 */

page =
    page.replace(
`            [
                branchId,
                connection,
                fromDate,
                toDate
            ]`,
`            [
                branchId,
                connection
            ]`
);


/*
 * Remove unused date props from component signature.
 */

page =
    page.replace(
`export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
}) {`,
`export default function EmployeeShiftsPage({
    branchId,
    connection
}) {`
);


write(
    pageFile,
    page
);


/*
 * =========================================================
 * 4) VALIDATION
 * =========================================================
 */

const requiredFiles = [
    serviceFile,
    ipcFile,
    pageFile
];

for (
    const file of requiredFiles
) {

    if (
        !fs.existsSync(
            full(file)
        )
    ) {
        throw new Error(
            "Missing file: " +
            file
        );
    }
}


console.log(
    "DIRECT EMPLOYEE DIRECTORY INSTALLED"
);

console.log(
    "Employee list now comes directly from Cards.IsEmployee"
);

console.log(
    "No sales-overview query is used by EmployeeShiftsPage"
);
