const Database = require("better-sqlite3");

const db = new Database(
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
    { readonly: true }
);

const sql = `
    SELECT
        branch_id,
        COUNT(*) AS total,
        SUM(
            CASE
                WHEN pin_number IS NOT NULL
                 AND TRIM(pin_number) <> ''
                THEN 1
                ELSE 0
            END
        ) AS with_pin
    FROM sales_history
    WHERE date >= ?
      AND date < ?
    GROUP BY branch_id
    ORDER BY branch_id
`;

console.log(
    db.prepare(sql).all(
        "2026-09-01",
        "2026-10-01"
    )
);

db.close();
