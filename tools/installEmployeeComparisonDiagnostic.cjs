const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup =
    file + ".backup-before-employee-comparison";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

const content = `import {
    getBranchPool,
    closeBranchConnection
} from "../connection/connectionManager.js";

export async function getEmployeeDirectory({
    branchId,
    connection = null
}) {
    const numericBranchId = Number(branchId);

    if (!Number.isInteger(numericBranchId) || numericBranchId <= 0) {
        throw new Error("Invalid branchId");
    }

    let pool =
        await getBranchPool(
            numericBranchId,
            connection
        );

    /*
     * Verify the actual database.
     */
    if (
        connection &&
        typeof connection === "object" &&
        connection.database
    ) {
        const expectedDatabase =
            String(connection.database)
                .trim()
                .toLowerCase();

        const identity =
            await pool
                .request()
                .query(\`
                    SELECT
                        DB_NAME() AS current_database
                \`);

        const actualDatabase =
            String(
                identity?.recordset?.[0]?.current_database ||
                ""
            )
                .trim()
                .toLowerCase();

        console.log(
            "[employeeComparison] branch=",
            numericBranchId,
            "expectedDatabase=",
            expectedDatabase,
            "actualDatabase=",
            actualDatabase
        );

        if (
            actualDatabase &&
            expectedDatabase &&
            actualDatabase !== expectedDatabase
        ) {
            console.warn(
                "[employeeComparison] WRONG DATABASE - reconnecting"
            );

            await closeBranchConnection(
                numericBranchId
            );

            pool =
                await getBranchPool(
                    numericBranchId,
                    connection
                );
        }
    }

    /*
     * 1. ALL EMPLOYEES IN CARDS
     * 2. REAL SELLERS IN posTickets
     * 3. REAL SELLERS THAT ARE EMPLOYEES
     * 4. EMPLOYEES WITH NO SALES
     * 5. SELLERS THAT ARE NOT MARKED AS EMPLOYEES
     */
    const result =
        await pool
            .request()
            .query(\`
                WITH AllEmployees AS (
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
                ),

                RealSellers AS (
                    SELECT
                        CONVERT(
                            nvarchar(100),
                            t.PinNumber
                        ) AS employee_id

                    FROM dbo.posTickets t

                    WHERE t.SalesReturn = 1
                      AND t.PinNumber IS NOT NULL

                    GROUP BY
                        t.PinNumber
                ),

                SellingEmployees AS (
                    SELECT
                        e.employee_id,
                        e.employee_name

                    FROM AllEmployees e

                    INNER JOIN RealSellers s
                        ON s.employee_id =
                           e.employee_id
                ),

                EmployeesWithoutSales AS (
                    SELECT
                        e.employee_id,
                        e.employee_name

                    FROM AllEmployees e

                    LEFT JOIN RealSellers s
                        ON s.employee_id =
                           e.employee_id

                    WHERE s.employee_id IS NULL
                ),

                SellersNotMarkedEmployee AS (
                    SELECT
                        s.employee_id

                    FROM RealSellers s

                    LEFT JOIN AllEmployees e
                        ON e.employee_id =
                           s.employee_id

                    WHERE e.employee_id IS NULL
                )

                SELECT
                    "ALL_EMPLOYEES" AS result_type,
                    e.employee_id,
                    e.employee_name
                FROM AllEmployees e

                UNION ALL

                SELECT
                    "SELLING_EMPLOYEES",
                    e.employee_id,
                    e.employee_name
                FROM SellingEmployees e

                UNION ALL

                SELECT
                    "EMPLOYEES_WITHOUT_SALES",
                    e.employee_id,
                    e.employee_name
                FROM EmployeesWithoutSales e

                UNION ALL

                SELECT
                    "SELLERS_NOT_MARKED_EMPLOYEE",
                    s.employee_id,
                    NULL
                FROM SellersNotMarkedEmployee s

                ORDER BY
                    result_type,
                    employee_name;
            \`);

    const rows =
        result?.recordset || [];

    const allEmployees =
        rows.filter(
            row =>
                row.result_type ===
                "ALL_EMPLOYEES"
        );

    const sellingEmployees =
        rows.filter(
            row =>
                row.result_type ===
                "SELLING_EMPLOYEES"
        );

    const employeesWithoutSales =
        rows.filter(
            row =>
                row.result_type ===
                "EMPLOYEES_WITHOUT_SALES"
        );

    const sellersNotMarkedEmployee =
        rows.filter(
            row =>
                row.result_type ===
                "SELLERS_NOT_MARKED_EMPLOYEE"
        );

    console.log("");
    console.log("==============================================");
    console.log(
        "[employeeComparison] BRANCH",
        numericBranchId
    );
    console.log("==============================================");

    console.log(
        "[employeeComparison] ALL EMPLOYEES IN Cards:",
        allEmployees.length
    );

    console.log(
        "[employeeComparison] REAL SELLING EMPLOYEES:",
        sellingEmployees.length
    );

    console.log(
        "[employeeComparison] EMPLOYEES WITHOUT SALES:",
        employeesWithoutSales.length
    );

    console.log(
        "[employeeComparison] SELLERS NOT MARKED IsEmployee:",
        sellersNotMarkedEmployee.length
    );

    console.log("");
    console.log(
        "[employeeComparison] REAL SELLING EMPLOYEES LIST:"
    );

    console.table(
        sellingEmployees.map(
            row => ({
                employeeId:
                    row.employee_id,
                employeeName:
                    row.employee_name
            })
        )
    );

    console.log("");
    console.log(
        "[employeeComparison] EMPLOYEES WITHOUT SALES:"
    );

    console.table(
        employeesWithoutSales.map(
            row => ({
                employeeId:
                    row.employee_id,
                employeeName:
                    row.employee_name
            })
        )
    );

    console.log("");
    console.log(
        "[employeeComparison] SELLERS NOT MARKED AS EMPLOYEE:"
    );

    console.table(
        sellersNotMarkedEmployee.map(
            row => ({
                employeeId:
                    row.employee_id
            })
        )
    );

    console.log(
        "=============================================="
    );
    console.log("");

    return {
        employees:
            sellingEmployees.map(
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
    "EMPLOYEE COMPARISON DIAGNOSTIC INSTALLED"
);
console.log(
    "NO DATA CHANGES"
);
console.log(
    "Backup:",
    backup
);
