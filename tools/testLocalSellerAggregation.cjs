const Database = require("better-sqlite3");

const DB_PATH =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db";

const db =
    new Database(
        DB_PATH,
        {
            readonly: true
        }
    );

console.log("");
console.log("========================================");
console.log("LOCAL SELLER AGGREGATION DIAGNOSTIC");
console.log("========================================");

try {

    const columns =
        db.prepare(
            "PRAGMA table_info(sales_history)"
        ).all();

    console.log("");
    console.log("sales_history columns:");
    console.table(columns);

    for (const branchId of [2, 4]) {

        console.log("");
        console.log("----------------------------------------");
        console.log(`BRANCH ${branchId}`);
        console.log("----------------------------------------");

        /*
         * =================================================
         * BASIC STATS
         * =================================================
         */

        const stats =
            db.prepare(`
                SELECT

                    COUNT(*) AS total_rows,

                    COUNT(
                        sales_rep_id
                    ) AS rows_with_sales_rep_id,

                    COUNT(
                        DISTINCT sales_rep_id
                    ) AS unique_sales_rep_ids,

                    COUNT(
                        DISTINCT ticket_id
                    ) AS unique_tickets,

                    MIN(date) AS min_date,

                    MAX(date) AS max_date

                FROM sales_history

                WHERE
                    branch_id = ?

                AND
                    date >= '2025-10-01'

                AND
                    date < '2026-09-24'
            `).get(
                branchId
            );

        console.table(
            [stats]
        );

        /*
         * =================================================
         * TOP SELLER IDS
         * =================================================
         */

        const topSellerIds =
            db.prepare(`
                SELECT

                    CAST(
                        sales_rep_id AS TEXT
                    ) AS sales_rep_id,

                    COUNT(*) AS row_count,

                    COUNT(
                        DISTINCT ticket_id
                    ) AS ticket_count,

                    SUM(
                        CASE
                            WHEN
                                sales_return = 2

                            THEN
                                -ABS(
                                    COALESCE(
                                        net_line_value,
                                        0
                                    )
                                )

                            ELSE
                                COALESCE(
                                    net_line_value,
                                    0
                                )
                        END
                    ) AS sales

                FROM sales_history

                WHERE
                    branch_id = ?

                AND
                    date >= '2025-10-01'

                AND
                    date < '2026-09-24'

                AND
                    sales_rep_id IS NOT NULL

                AND
                    TRIM(
                        CAST(
                            sales_rep_id AS TEXT
                        )
                    ) NOT IN (
                        '',
                        '0'
                    )

                GROUP BY
                    sales_rep_id

                ORDER BY
                    ticket_count DESC

                LIMIT 20
            `).all(
                branchId
            );

        console.log("");
        console.log(
            `BRANCH ${branchId} TOP SALES_REP_ID`
        );

        console.table(
            topSellerIds
        );

        /*
         * =================================================
         * MONTHLY AGGREGATION
         * =================================================
         */

        const started =
            Date.now();

        const aggregation =
            db.prepare(`
                SELECT

                    substr(
                        date,
                        1,
                        7
                    ) AS month_key,

                    CAST(
                        sales_rep_id AS TEXT
                    ) AS employee_id,

                    SUM(
                        CASE

                            WHEN
                                sales_return = 2

                            THEN
                                -ABS(
                                    COALESCE(
                                        net_line_value,
                                        0
                                    )
                                )

                            ELSE
                                COALESCE(
                                    net_line_value,
                                    0
                                )

                        END
                    ) AS sales,

                    COUNT(
                        DISTINCT ticket_id
                    ) AS invoices

                FROM sales_history

                WHERE
                    branch_id = ?

                AND
                    date >= '2025-10-01'

                AND
                    date < '2026-09-24'

                AND
                    sales_rep_id IS NOT NULL

                AND
                    TRIM(
                        CAST(
                            sales_rep_id AS TEXT
                        )
                    ) NOT IN (
                        '',
                        '0'
                    )

                GROUP BY

                    substr(
                        date,
                        1,
                        7
                    ),

                    CAST(
                        sales_rep_id AS TEXT
                    )

                ORDER BY

                    month_key,

                    employee_id
            `).all(
                branchId
            );

        const elapsed =
            Date.now() -
            started;

        console.log("");
        console.log(
            `BRANCH ${branchId} LOCAL AGGREGATION RESULT`
        );

        console.log(
            `rows=${aggregation.length}`
        );

        console.log(
            `elapsed=${elapsed} ms`
        );

        console.table(
            aggregation.slice(
                0,
                30
            )
        );
    }

}
catch (
    error
) {

    console.error(
        "LOCAL SELLER DIAGNOSTIC FAILED:",
        error
    );

}
finally {

    db.close();

}
