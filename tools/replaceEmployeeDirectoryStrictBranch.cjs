const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-strict-branch-directory";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

const content = `import { getBranchPool } from "../connection/connectionManager.js";

export async function getEmployeeDirectory({
    branchId
}) {
    const numericBranchId = Number(branchId);

    if (!Number.isFinite(numericBranchId)) {
        throw new Error("Invalid branchId");
    }

    // IMPORTANT:
    // The branchId is the only source of truth.
    // Do not reuse a connection object from another branch.
    const pool = await getBranchPool(
        numericBranchId,
        null
    );

    const result = await pool.request().query(\`
        SELECT
            CONVERT(nvarchar(100), c.ID) AS employee_id,
            LTRIM(
                RTRIM(
                    CONVERT(nvarchar(400), c.Name)
                )
            ) AS employee_name
        FROM (
            SELECT
                t.PinNumber
            FROM dbo.posTickets t
            WHERE t.SalesReturn = 1
              AND t.PinNumber IS NOT NULL
            GROUP BY t.PinNumber
        ) sellers
        INNER JOIN dbo.Cards c
            ON c.ID = sellers.PinNumber
        WHERE ISNULL(c.IsEmployee, 0) = 1
          AND NULLIF(
                LTRIM(
                    RTRIM(
                        CONVERT(nvarchar(400), c.Name)
                    )
                ),
                ''
              ) IS NOT NULL
        ORDER BY
            c.Name;
    \`);

    const employees = (result.recordset || []).map(
        (row) => ({
            employeeId: String(row.employee_id),
            employeeName: String(row.employee_name)
        })
    );

    return {
        employees
    };
}
`;

fs.writeFileSync(file, content, "utf8");

console.log("STRICT BRANCH EMPLOYEE DIRECTORY INSTALLED");
console.log("SOURCE = selected branch database only");
console.log("NO CONNECTION OVERRIDE");
console.log("NO CACHE");
console.log("ONLY REAL SELLERS: SalesReturn = 1");
console.log("Backup:", backup);
