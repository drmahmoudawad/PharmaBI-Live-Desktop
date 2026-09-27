const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup =
    file + ".backup-before-branch-link-diagnostic";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

const content = `import { getBranchPool } from "../connection/connectionManager.js";

export async function getEmployeeDirectory({
    branchId,
    connection = null
}) {
    const numericBranchId = Number(branchId);

    if (!Number.isInteger(numericBranchId) || numericBranchId <= 0) {
        throw new Error("Invalid branchId");
    }

    const pool =
        await getBranchPool(
            numericBranchId,
            connection
        );

    console.log("");
    console.log("==============================================");
    console.log(
        "[employeeBranchDiagnostic] BRANCH",
        numericBranchId
    );
    console.log("==============================================");

    const dbResult =
        await pool
            .request()
            .query(\`
                SELECT
                    DB_NAME() AS database_name;
            \`);

    console.log(
        "[employeeBranchDiagnostic] DATABASE:",
        dbResult?.recordset?.[0]?.database_name || ""
    );

    /*
     * Cards columns relevant to employee/branch/store/user.
     */
    const cardsResult =
        await pool
            .request()
            .query(\`
                SELECT
                    COLUMN_NAME,
                    DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo'
                  AND TABLE_NAME = 'Cards'
                  AND (
                        LOWER(COLUMN_NAME) LIKE '%branch%'
                     OR LOWER(COLUMN_NAME) LIKE '%store%'
                     OR LOWER(COLUMN_NAME) LIKE '%employee%'
                     OR LOWER(COLUMN_NAME) LIKE '%staff%'
                     OR LOWER(COLUMN_NAME) LIKE '%user%'
                     OR LOWER(COLUMN_NAME) LIKE '%pin%'
                  )
                ORDER BY ORDINAL_POSITION;
            \`);

    console.log(
        "[employeeBranchDiagnostic] RELEVANT Cards COLUMNS:"
    );

    console.table(
        cardsResult?.recordset || []
    );

    /*
     * Find only tables that contain BOTH:
     * 1) a branch/store column
     * 2) an employee/staff/user/card/pin column
     *
     * This is the important relationship search.
     */
    const relationTablesResult =
        await pool
            .request()
            .query(\`
                SELECT
                    TABLE_SCHEMA,
                    TABLE_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo'
                GROUP BY
                    TABLE_SCHEMA,
                    TABLE_NAME
                HAVING
                    SUM(
                        CASE
                            WHEN LOWER(COLUMN_NAME) LIKE '%branch%'
                              OR LOWER(COLUMN_NAME) LIKE '%store%'
                            THEN 1
                            ELSE 0
                        END
                    ) > 0
                    AND
                    SUM(
                        CASE
                            WHEN LOWER(COLUMN_NAME) LIKE '%employee%'
                              OR LOWER(COLUMN_NAME) LIKE '%staff%'
                              OR LOWER(COLUMN_NAME) LIKE '%user%'
                              OR LOWER(COLUMN_NAME) LIKE '%card%'
                              OR LOWER(COLUMN_NAME) LIKE '%pin%'
                            THEN 1
                            ELSE 0
                        END
                    ) > 0
                ORDER BY
                    TABLE_NAME;
            \`);

    console.log(
        "[employeeBranchDiagnostic] POSSIBLE EMPLOYEE-BRANCH TABLES:"
    );

    console.table(
        relationTablesResult?.recordset || []
    );

    const relationTables =
        relationTablesResult?.recordset || [];

    for (const table of relationTables) {
        const schema =
            String(
                table.TABLE_SCHEMA || "dbo"
            ).replace(/[^A-Za-z0-9_]/g, "");

        const tableName =
            String(
                table.TABLE_NAME || ""
            ).replace(/[^A-Za-z0-9_]/g, "");

        if (!tableName) {
            continue;
        }

        const columnsResult =
            await pool
                .request()
                .query(\`
                    SELECT
                        COLUMN_NAME,
                        DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = '\${schema}'
                      AND TABLE_NAME = '\${tableName}'
                      AND (
                            LOWER(COLUMN_NAME) LIKE '%branch%'
                         OR LOWER(COLUMN_NAME) LIKE '%store%'
                         OR LOWER(COLUMN_NAME) LIKE '%employee%'
                         OR LOWER(COLUMN_NAME) LIKE '%staff%'
                         OR LOWER(COLUMN_NAME) LIKE '%user%'
                         OR LOWER(COLUMN_NAME) LIKE '%card%'
                         OR LOWER(COLUMN_NAME) LIKE '%pin%'
                      )
                    ORDER BY ORDINAL_POSITION;
                \`);

        console.log(
            "[employeeBranchDiagnostic] TABLE:",
            schema + "." + tableName
        );

        console.table(
            columnsResult?.recordset || []
        );
    }

    console.log(
        "=============================================="
    );
    console.log("");

    /*
     * Current real seller list.
     * Only this branch's database is queried.
     */
    const result =
        await pool
            .request()
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
                    WHERE t.SalesReturn = 1
                      AND t.PinNumber IS NOT NULL
                      AND CONVERT(
                            nvarchar(100),
                            t.PinNumber
                          ) NOT IN (N'', N'0')
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

    return {
        employees:
            (result?.recordset || []).map(
                row => ({
                    employeeId:
                        String(row.employee_id),

                    employeeName:
                        String(row.employee_name)
                })
            )
    };
}
`;

fs.writeFileSync(
    file,
    content,
    "utf8"
);

console.log(
    "EMPLOYEE-BRANCH RELATION DIAGNOSTIC INSTALLED"
);
console.log(
    "Uses selected branch connection."
);
console.log(
    "No data changes."
);
console.log(
    "Backup:",
    backup
);

