import Database from "better-sqlite3";

const db = new Database(
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
    {
        readonly: true
    }
);

for (const branchId of [1, 2, 3, 4, 5]) {

    const result = db.prepare(`
        SELECT
            COUNT(*) AS total_rows,

            SUM(
                CASE
                    WHEN customer_id IS NOT NULL
                     AND TRIM(customer_id) <> ''
                     AND TRIM(customer_id) <> '0'
                    THEN 1
                    ELSE 0
                END
            ) AS customer_id_rows,

            SUM(
                CASE
                    WHEN customer_name IS NOT NULL
                     AND TRIM(customer_name) <> ''
                    THEN 1
                    ELSE 0
                END
            ) AS named_rows,

            SUM(
                CASE
                    WHEN customer_id IS NOT NULL
                     AND TRIM(customer_id) <> ''
                     AND TRIM(customer_id) <> '0'
                     AND (
                         customer_name IS NULL
                         OR TRIM(customer_name) = ''
                     )
                    THEN 1
                    ELSE 0
                END
            ) AS missing_name_rows

        FROM sales_history
        WHERE branch_id = ?
    `).get(branchId);

    console.log("");
    console.log(`========== BRANCH ${branchId} ==========`);

    console.log(
        `total_rows      = ${result.total_rows}`
    );

    console.log(
        `customer_id_rows= ${result.customer_id_rows}`
    );

    console.log(
        `named_rows      = ${result.named_rows}`
    );

    console.log(
        `missing_name    = ${result.missing_name_rows}`
    );

    console.log("");
    console.log("SAMPLES:");

    const samples = db.prepare(`
        SELECT
            customer_id,
            customer_name
        FROM sales_history
        WHERE branch_id = ?
          AND customer_id IS NOT NULL
          AND TRIM(customer_id) <> ''
          AND TRIM(customer_id) <> '0'
        GROUP BY
            customer_id,
            customer_name
        ORDER BY
            customer_id
        LIMIT 10
    `).all(branchId);

    console.table(samples);
}

db.close();