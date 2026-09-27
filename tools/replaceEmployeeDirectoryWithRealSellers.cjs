const path = require("path");
const fs = require("fs");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-real-sellers-source";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

const content = `import { getBranchPool } from "../connection/connectionManager.js";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getEmployeeDirectory({
    branchId,
    connection = null
}) {
    const numericBranchId = Number(branchId);

    if (!Number.isFinite(numericBranchId)) {
        throw new Error("Invalid branchId");
    }

    const cached = cache.get(numericBranchId);

    if (
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL_MS
    ) {
        return {
            employees: cached.employees
        };
    }

    const pool = await getBranchPool(
        numericBranchId,
        connection
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
            SELECT DISTINCT
                t.PinNumber
            FROM dbo.posTickets t
            WHERE t.SalesReturn = 1
              AND t.PinNumber IS NOT NULL
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
        ORDER BY c.Name;
    \`);

    const employees = (result.recordset || []).map(
        (row) => ({
            employeeId: String(row.employee_id),
            employeeName: String(row.employee_name)
        })
    );

    cache.set(
        numericBranchId,
        {
            timestamp: Date.now(),
            employees
        }
    );

    return {
        employees
    };
}

export function clearEmployeeDirectoryCache(
    branchId = null
) {
    if (branchId === null) {
        cache.clear();
        return;
    }

    cache.delete(Number(branchId));
}
`;

fs.writeFileSync(file, content, "utf8");

console.log("EMPLOYEE DIRECTORY REPLACED");
console.log("SOURCE: REAL SELLERS FROM posTickets");
console.log("FILTER: SalesReturn = 1");
console.log("Backup:", backup);
