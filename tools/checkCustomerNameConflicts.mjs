import Database from "better-sqlite3";

const db = new Database(
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
    {
        readonly: true
    }
);

for (const branchId of [3, 4]) {

    console.log("");
    console.log("================================================");
    console.log(`BRANCH ${branchId}`);
    console.log("================================================");

    const ids = db.prepare(`
        SELECT DISTINCT
            customer_id
        FROM sales_history
        WHERE branch_id = ?
          AND customer_id IS NOT NULL
          AND TRIM(customer_id) <> ''
          AND TRIM(customer_id) <> '0'
          AND (
              customer_name IS NULL
              OR TRIM(customer_name) = ''
          )
        ORDER BY customer_id
        LIMIT 30
    `).all(branchId);

    for (const item of ids) {

        const customerId =
            String(item.customer_id).trim();

        const rows = db.prepare(`
            SELECT
                customer_id,
                customer_name,
                COUNT(*) AS rows_count
            FROM sales_history
            WHERE branch_id = ?
              AND customer_id = ?
            GROUP BY
                customer_id,
                customer_name
            ORDER BY
                rows_count DESC
        `).all(
            branchId,
            customerId
        );

        console.log("");
        console.log(
            `CUSTOMER ID: ${customerId}`
        );

        console.table(rows);
    }
}

db.close();