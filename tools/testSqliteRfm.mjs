import Database from "better-sqlite3";

const db = new Database(
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
    {
        readonly: true
    }
);


console.log("");
console.log("===== SQLITE TEST =====");


console.time("QUERY");


const result =
    db.prepare(`
        SELECT
            branch_id,
            COUNT(*) AS rows,
            COUNT(
                DISTINCT customer_id
            ) AS customers,
            MIN(
                substr(
                    date,
                    1,
                    10
                )
            ) AS oldest,
            MAX(
                substr(
                    date,
                    1,
                    10
                )
            ) AS newest
        FROM sales_history
        WHERE
            branch_id = 1
            AND transaction_type = 'SALE'
            AND customer_id IS NOT NULL
    `).get();


console.timeEnd("QUERY");


console.log(result);


db.close();


console.log("");
console.log("SQLITE TEST DONE");