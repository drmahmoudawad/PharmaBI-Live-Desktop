const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-branch-db-verification";

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

    /*
     * The selected branch connection is the source of truth.
     * First obtain the branch pool using that connection.
     */
    let pool = await getBranchPool(
        numericBranchId,
        connection
    );

    /*
     * Verify that the actual SQL database behind the pool
     * matches the selected branch connection.
     */
    if (
        connection &&
        typeof connection === "object" &&
        connection.database
    ) {
        const expectedDatabase =
            String(connection.database).trim().toLowerCase();

        const identityResult =
            await pool
                .request()
                .query(\`
                    SELECT
                        DB_NAME() AS current_database
                \`);

        const actualDatabase =
            String(
                identityResult?.recordset?.[0]?.current_database ||
                ""
            )
                .trim()
                .toLowerCase();

        console.log(
            "[employeeDirectory] branch=",
            numericBranchId,
            "expectedDatabase=",
            expectedDatabase,
            "actualDatabase=",
            actualDatabase
        );

        /*
         * A pool can be cached under the branch ID while actually
         * belonging to an older/different connection configuration.
         * In that case close it and reconnect using the selected branch.
         */
        if (
            actualDatabase &&
            expectedDatabase &&
            actualDatabase !== expectedDatabase
        ) {
            console.warn(
                "[employeeDirectory] WRONG BRANCH POOL DETECTED. Reconnecting..."
            );

            await closeBranchConnection(
                numericBranchId
            );

            pool = await getBranchPool(
                numericBranchId,
                connection
            );

            const verifyAgain =
                await pool
                    .request()
                    .query(\`
                        SELECT
                            DB_NAME() AS current_database
                    \`);

            const verifiedDatabase =
                String(
                    verifyAgain?.recordset?.[0]?.current_database ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            console.log(
                "[employeeDirectory] reconnectedDatabase=",
                verifiedDatabase
            );
        }
    }

    /*
     * IMPORTANT:
     * Start from actual sellers in THIS branch's posTickets.
     * Only SaleReturn = 1 is considered a sale.
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
        "realSellingEmployees=",
        employees.length
    );

    return {
        employees
    };
}
`;

fs.writeFileSync(
    file,
    content,
    "utf8"
);

console.log("EMPLOYEE DIRECTORY BRANCH VERIFICATION INSTALLED");
console.log("SOURCE = selected branch connection");
console.log("VERIFY = DB_NAME()");
console.log("SELLERS = this branch posTickets + SalesReturn=1");
console.log("NO CACHE");
console.log("Backup:", backup);
