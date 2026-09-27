import Database from "better-sqlite3";

const db = new Database(
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
    {
        readonly: true
    }
);

const fromDate = "2025-09-25";
const toDate = "2026-09-25";

console.log("");
console.log("===== RFM RANGE PERFORMANCE TEST =====");
console.log(`Range: ${fromDate} -> ${toDate}`);
console.log("");

console.log("===== QUERY PLAN =====");

const plan = db.prepare(`
    EXPLAIN QUERY PLAN
    SELECT
        customer_id,
        COUNT(DISTINCT ticket_id) AS tickets,
        SUM(
            CASE
                WHEN transaction_type = 'SALE'
                    THEN ABS(COALESCE(net_line_value, 0))
                WHEN transaction_type = 'RETURN'
                    THEN -ABS(COALESCE(net_line_value, 0))
                ELSE 0
            END
        ) AS net_sales
    FROM sales_history
    WHERE
        branch_id = ?
        AND customer_id IS NOT NULL
        AND TRIM(customer_id) <> ''
        AND CAST(customer_id AS INTEGER) > 0
        AND transaction_type IN ('SALE', 'RETURN')
        AND date >= ?
        AND date < ?
    GROUP BY customer_id
`).all(
    1,
    `${fromDate}T00:00:00.000Z`,
    `${toDate}T00:00:00.000Z`
);

for (const row of plan) {
    console.log(row);
}

console.log("");
console.log("===== EXECUTION =====");

console.time("RFM_RANGE");

const result = db.prepare(`
    SELECT
        customer_id,
        COUNT(DISTINCT ticket_id) AS tickets,
        MIN(substr(date,1,10)) AS first_date,
        MAX(substr(date,1,10)) AS last_date,
        SUM(
            CASE
                WHEN transaction_type = 'SALE'
                    THEN ABS(COALESCE(net_line_value, 0))
                WHEN transaction_type = 'RETURN'
                    THEN -ABS(COALESCE(net_line_value, 0))
                ELSE 0
            END
        ) AS net_sales
    FROM sales_history
    WHERE
        branch_id = ?
        AND customer_id IS NOT NULL
        AND TRIM(customer_id) <> ''
        AND CAST(customer_id AS INTEGER) > 0
        AND transaction_type IN ('SALE', 'RETURN')
        AND date >= ?
        AND date < ?
    GROUP BY customer_id
`).all(
    1,
    `${fromDate}T00:00:00.000Z`,
    `${toDate}T00:00:00.000Z`
);

console.timeEnd("RFM_RANGE");

console.log("");
console.log(`CUSTOMERS = ${result.length}`);

console.log("");
console.log("===== SQLITE INDEXES =====");

const indexes = db.prepare(`
    SELECT
        name,
        sql
    FROM sqlite_master
    WHERE
        type = 'index'
        AND tbl_name = 'sales_history'
    ORDER BY name
`).all();

for (const index of indexes) {
    console.log(index);
}

db.close();

console.log("");
console.log("TEST DONE");
