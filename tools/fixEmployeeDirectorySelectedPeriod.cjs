const fs = require("fs");
const path = require("path");

function replaceRequired(file, pattern, replacement, label) {
    let text = fs.readFileSync(file, "utf8");

    if (!pattern.test(text)) {
        throw new Error(label + " NOT FOUND");
    }

    text = text.replace(pattern, replacement);

    fs.writeFileSync(file, text, "utf8");

    console.log(label + " UPDATED");
}

/* =========================================================
   1) EMPLOYEE DIRECTORY SERVICE
   ========================================================= */

const directoryFile = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const directoryBackup =
    directoryFile + ".backup-before-period-filter-final";

if (!fs.existsSync(directoryBackup)) {
    fs.copyFileSync(directoryFile, directoryBackup);
}

const directoryContent = `import { getBranchPool } from "../connection/connectionManager.js";

export async function getEmployeeDirectory({
    branchId,
    fromDate,
    toDate,
    connection = null
}) {
    const numericBranchId = Number(branchId);

    if (
        !Number.isInteger(numericBranchId) ||
        numericBranchId <= 0
    ) {
        throw new Error("Invalid branchId");
    }

    if (!fromDate || !toDate) {
        throw new Error(
            "Employee directory requires fromDate and toDate"
        );
    }

    const pool =
        await getBranchPool(
            numericBranchId,
            connection
        );

    const branchResult =
        await pool
            .request()
            .query(\`
                SELECT TOP (1)
                    DefaultStoreID,
                    DefaultStoreName,
                    BranchName,
                    IsSelfBranch
                FROM dbo.Branches
                ORDER BY
                    CASE
                        WHEN IsSelfBranch = 1 THEN 0
                        ELSE 1
                    END;
            \`);

    const branchRow =
        branchResult?.recordset?.[0];

    const storeId =
        branchRow?.DefaultStoreID;

    if (
        storeId === null ||
        storeId === undefined
    ) {
        throw new Error(
            "DefaultStoreID not found for selected branch"
        );
    }

    console.log(
        "[employeeDirectory] branch=",
        numericBranchId,
        "storeId=",
        String(storeId),
        "fromDate=",
        String(fromDate),
        "toDate=",
        String(toDate)
    );

    const result =
        await pool
            .request()
            .input(
                "storeId",
                storeId
            )
            .input(
                "fromDate",
                String(fromDate) + " 00:00:00"
            )
            .input(
                "toDate",
                String(toDate) + " 00:00:00"
            )
            .query(\`
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

                FROM (
                    SELECT
                        t.PinNumber

                    FROM dbo.posTickets t

                    WHERE t.StoreID = @storeId

                      AND t.ztime >= @fromDate

                      AND t.ztime < DATEADD(
                          day,
                          1,
                          @toDate
                      )

                      AND t.SalesReturn = 1

                      AND t.PinNumber IS NOT NULL

                      AND CONVERT(
                          nvarchar(100),
                          t.PinNumber
                      ) NOT IN (
                          N'',
                          N'0'
                      )

                    GROUP BY
                        t.PinNumber
                ) sellers

                INNER JOIN dbo.Cards c
                    ON c.ID = sellers.PinNumber

                WHERE ISNULL(
                    c.IsEmployee,
                    0
                ) = 1

                  AND NULLIF(
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
            result?.recordset || []
        ).map(
            row => ({
                employeeId:
                    String(
                        row.employee_id
                    ),

                employeeName:
                    String(
                        row.employee_name
                    )
            })
        );

    console.log(
        "[employeeDirectory] branch=",
        numericBranchId,
        "storeId=",
        String(storeId),
        "period=",
        String(fromDate),
        "->",
        String(toDate),
        "realSellingEmployees=",
        employees.length
    );

    return {
        employees
    };
}
`;

fs.writeFileSync(
    directoryFile,
    directoryContent,
    "utf8"
);

console.log(
    "EMPLOYEE DIRECTORY SERVICE UPDATED"
);

/* =========================================================
   2) DASHBOARD IPC
   ========================================================= */

const ipcFile = path.join(
    process.cwd(),
    "electron",
    "ipc",
    "dashboard.ipc.js"
);

const ipcBackup =
    ipcFile + ".backup-before-employee-period-filter";

if (!fs.existsSync(ipcBackup)) {
    fs.copyFileSync(ipcFile, ipcBackup);
}

replaceRequired(
    ipcFile,
    /return getEmployeeDirectory\(\{\s*branchId:\s*payload\?\.branchId,\s*connection:\s*payload\?\.connection\s*\|\|\s*null\s*\}\);/s,
`return getEmployeeDirectory({
                    branchId:
                        payload?.branchId,

                    fromDate:
                        payload?.fromDate,

                    toDate:
                        payload?.toDate,

                    connection:
                        payload?.connection ||
                        null
                });`,
    "EMPLOYEE DIRECTORY IPC"
);

/* =========================================================
   3) EMPLOYEE SHIFTS PAGE
   ========================================================= */

const pageFile = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const pageBackup =
    pageFile + ".backup-before-selected-period-filter";

if (!fs.existsSync(pageBackup)) {
    fs.copyFileSync(pageFile, pageBackup);
}

let pageText =
    fs.readFileSync(
        pageFile,
        "utf8"
    );

/* Add fromDate / toDate to component props if missing. */
const propsPattern =
    /export default function EmployeeShiftsPage\(\{\s*branchId,\s*connection\s*\}\)/s;

if (propsPattern.test(pageText)) {
    pageText =
        pageText.replace(
            propsPattern,
`export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
})`
        );
}

/* Remove the old hardcoded period from the directory request. */
const oldDirectoryArgs =
`                                      branchId,

                                      fromDate:
                                          "2013-01-01",

                                      toDate:
                                          "2026-12-31",

                                      connection`;

const newDirectoryArgs =
`                                      branchId,

                                      fromDate:
                                          normalizedFromDate,

                                      toDate:
                                          normalizedToDate,

                                      connection`;

if (
    pageText.includes(
        oldDirectoryArgs
    )
) {
    pageText =
        pageText.replace(
            oldDirectoryArgs,
            newDirectoryArgs
        );
}
else if (
    !pageText.includes(
        "normalizedFromDate"
    )
) {
    throw new Error(
        "EMPLOYEE DIRECTORY REQUEST BLOCK NOT FOUND"
    );
}

/* Restore selected-period normalization if absent. */
if (
    !pageText.includes(
        "const normalizedFromDate ="
    )
) {
    const anchor =
        `export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
}) {`;

    if (!pageText.includes(anchor)) {
        throw new Error(
            "EMPLOYEE PAGE COMPONENT ANCHOR NOT FOUND"
        );
    }

    pageText =
        pageText.replace(
            anchor,
`${anchor}

    const normalizedFromDate =
        normalizeDateInput(
            fromDate,
            true
        );

    const normalizedToDate =
        normalizeDateInput(
            toDate,
            false
        );
`
        );
}

/* Ensure callback reacts to selected period changes. */
pageText =
    pageText.replace(
        /(\n\s*branchId,\s*connection\s*\n\s*\]\s*\);)/s,
        `
                normalizedFromDate,
                normalizedToDate,
                branchId,
                connection
            ]
        );`
    );

/* More precise dependency replacement if the generic one did not hit. */
pageText =
    pageText.replace(
        /,\s*\[\s*branchId,\s*connection\s*\]\s*\);/s,
        `,
            [
                branchId,
                connection,
                normalizedFromDate,
                normalizedToDate
            ]
        );`
    );

fs.writeFileSync(
    pageFile,
    pageText,
    "utf8"
);

console.log(
    "EMPLOYEE SHIFTS PAGE UPDATED"
);

console.log("");
console.log(
    "FINAL EMPLOYEE FILTER:"
);

console.log(
    "Selected branch StoreID"
);

console.log(
    "SalesReturn = 1"
);

console.log(
    "Selected fromDate/toDate"
);

console.log(
    "Cards.IsEmployee = 1"
);
