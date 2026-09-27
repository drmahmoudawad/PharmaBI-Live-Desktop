const { app } = require("electron");

app.setPath(
    "userData",
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
);

async function main() {

    await app.whenReady();

    const {
        getAllSavedConnections
    } = await import(
        "../electron/settings/connectionStore.js"
    );

    const {
        getBranchPool
    } = await import(
        "../electron/connection/connectionManager.js"
    );

    const {
        getLocalSalesDatabase
    } = await import(
        "../electron/localdb/localSalesDb.js"
    );

    const connections =
        getAllSavedConnections();

    const db =
        getLocalSalesDatabase();

    /*
     * =========================================================
     * SCHEMA MIGRATION
     * =========================================================
     */

    const columns =
        db.prepare(
            "PRAGMA table_info(sales_history)"
        ).all();

    const hasPinNumber =
        columns.some(
            column =>
                column.name === "pin_number"
        );

    if (!hasPinNumber) {

        console.log(
            "[sellerPin] Adding sales_history.pin_number"
        );

        db.exec(`
            ALTER TABLE sales_history
            ADD COLUMN pin_number TEXT
        `);

    }
    else {

        console.log(
            "[sellerPin] pin_number already exists"
        );

    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS
            idx_sales_history_branch_pin_date
        ON sales_history (
            branch_id,
            pin_number,
            date
        )
    `);

    /*
     * =========================================================
     * PREPARED LOCAL STATEMENTS
     * =========================================================
     */

    const getLocalRange =
        db.prepare(`
            SELECT
                MIN(date) AS oldest_date,
                MAX(date) AS newest_date
            FROM sales_history
            WHERE branch_id = ?
        `);

    const updatePin =
        db.prepare(`
            UPDATE sales_history
            SET pin_number = ?
            WHERE branch_id = ?
              AND ticket_id = ?
        `);

    const localCoverage =
        db.prepare(`
            SELECT
                COUNT(*) AS total_rows,

                SUM(
                    CASE
                        WHEN pin_number IS NOT NULL
                         AND TRIM(pin_number) <> ''
                         AND pin_number <> '0'
                        THEN 1
                        ELSE 0
                    END
                ) AS rows_with_pin,

                COUNT(
                    DISTINCT
                    CASE
                        WHEN pin_number IS NOT NULL
                         AND TRIM(pin_number) <> ''
                         AND pin_number <> '0'
                        THEN pin_number
                        ELSE NULL
                    END
                ) AS unique_pins

            FROM sales_history
            WHERE branch_id = ?
              AND date >= ?
              AND date < ?
        `);

    const localAggregate =
        db.prepare(`
            SELECT

                substr(
                    date,
                    1,
                    7
                ) AS month_key,

                CAST(
                    pin_number
                    AS TEXT
                ) AS employee_id,

                SUM(
                    CASE
                        WHEN sales_return = 2
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
                    DISTINCT
                    ticket_id
                ) AS invoices

            FROM sales_history

            WHERE
                branch_id = ?

            AND
                date >= ?

            AND
                date < ?

            AND
                pin_number IS NOT NULL

            AND
                TRIM(
                    pin_number
                ) <> ''

            AND
                pin_number <> '0'

            GROUP BY

                substr(
                    date,
                    1,
                    7
                ),

                pin_number

            ORDER BY
                month_key,
                employee_id
        `);

    /*
     * =========================================================
     * BRANCHES
     * =========================================================
     */

    for (
        const branchId
        of [2, 4]
    ) {

        console.log("");
        console.log(
            "=================================================="
        );
        console.log(
            `BRANCH ${branchId} SELLER PIN BACKFILL`
        );
        console.log(
            "=================================================="
        );

        const connection =
            connections.find(
                item =>
                    Number(
                        item?.branchId
                    ) === branchId
            );

        if (!connection) {

            console.log(
                `BRANCH ${branchId}: CONNECTION NOT FOUND`
            );

            continue;

        }

        const range =
            getLocalRange.get(
                branchId
            );

        const fromDate =
            String(
                range?.oldest_date ||
                "2025-10-01"
            ).slice(
                0,
                10
            );

        const newestDate =
            String(
                range?.newest_date ||
                "2026-09-23"
            ).slice(
                0,
                10
            );

        const toDate =
            (() => {

                const d =
                    new Date(
                        `${newestDate}T00:00:00Z`
                    );

                d.setUTCDate(
                    d.getUTCDate() + 1
                );

                return d
                    .toISOString()
                    .slice(
                        0,
                        10
                    );

            })();

        console.log(
            `[sellerPin] range ${fromDate} -> ${toDate}`
        );

        const pool =
            await getBranchPool(
                branchId,
                connection
            );

        /*
         * -----------------------------------------------------
         * LOAD PIN NUMBERS FROM SQL
         * -----------------------------------------------------
         */

        const sqlStarted =
            Date.now();

        const ticketResult =
            await pool
                .request()
                .input(
                    "fromDate",
                    `${fromDate} 00:00:00`
                )
                .input(
                    "toDateExclusive",
                    `${toDate} 00:00:00`
                )
                .query(`

                    SET NOCOUNT ON;

                    SELECT

                        CONVERT(
                            nvarchar(100),
                            t.ID
                        ) AS ticket_id,

                        CONVERT(
                            nvarchar(100),
                            t.PinNumber
                        ) AS pin_number

                    FROM dbo.posTickets t

                    WHERE
                        t.ztime >= @fromDate

                    AND
                        t.ztime < @toDateExclusive;

                `);

        const tickets =
            Array.isArray(
                ticketResult?.recordset
            )
                ? ticketResult.recordset
                : [];

        console.log(
            `[sellerPin] SQL tickets=${tickets.length} in ${Date.now() - sqlStarted} ms`
        );

        /*
         * -----------------------------------------------------
         * BACKFILL SQLITE
         * -----------------------------------------------------
         */

        const before =
            localCoverage.get(
                branchId,
                fromDate,
                toDate
            );

        console.log(
            `[sellerPin] LOCAL BEFORE rows=${before?.total_rows || 0} pin_rows=${before?.rows_with_pin || 0} uniquePins=${before?.unique_pins || 0}`
        );

        let updated =
            0;

        const updateTransaction =
            db.transaction(
                rows => {

                    for (
                        const row
                        of rows
                    ) {

                        if (
                            row?.ticket_id ===
                            null ||
                            row?.ticket_id ===
                            undefined
                        ) {

                            continue;

                        }

                        const result =
                            updatePin.run(
                                row?.pin_number === null ||
                                row?.pin_number === undefined ||
                                String(
                                    row.pin_number
                                ).trim() === ""
                                    ? null
                                    : String(
                                        row.pin_number
                                    ).trim(),

                                branchId,

                                String(
                                    row.ticket_id
                                )
                            );

                        updated +=
                            result.changes;

                    }

                }
            );

        const batchSize =
            10000;

        const updateStarted =
            Date.now();

        for (
            let start = 0;

            start < tickets.length;

            start += batchSize
        ) {

            updateTransaction(
                tickets.slice(
                    start,
                    start + batchSize
                )
            );

        }

        console.log(
            `[sellerPin] SQLITE updated rows=${updated} in ${Date.now() - updateStarted} ms`
        );

        const after =
            localCoverage.get(
                branchId,
                fromDate,
                toDate
            );

        console.log(
            `[sellerPin] LOCAL AFTER rows=${after?.total_rows || 0} pin_rows=${after?.rows_with_pin || 0} uniquePins=${after?.unique_pins || 0}`
        );

        /*
         * -----------------------------------------------------
         * SQL EMPLOYEE PIN SET
         * -----------------------------------------------------
         */

        const employeeResult =
            await pool
                .request()
                .query(`

                    SET NOCOUNT ON;

                    SELECT

                        CONVERT(
                            nvarchar(100),
                            c.ID
                        ) AS employee_id

                    FROM dbo.Cards c

                    WHERE
                        ISNULL(
                            c.IsEmployee,
                            0
                        ) = 1

                `);

        const employeeIds =
            new Set(
                (
                    employeeResult?.recordset ||
                    []
                )
                    .map(
                        row =>
                            String(
                                row?.employee_id ||
                                ""
                            ).trim()
                    )
                    .filter(
                        value =>
                            value &&
                            value !== "0"
                    )
            );

        console.log(
            `[sellerPin] SQL employee cards=${employeeIds.size}`
        );

        /*
         * -----------------------------------------------------
         * LOCAL AGGREGATION
         * -----------------------------------------------------
         */

        const localStarted =
            Date.now();

        const localRows =
            localAggregate.all(
                branchId,
                fromDate,
                toDate
            )
            .filter(
                row =>
                    employeeIds.has(
                        String(
                            row?.employee_id ||
                            ""
                        ).trim()
                    )
            );

        console.log(
            `[sellerPin] LOCAL employee aggregation rows=${localRows.length} in ${Date.now() - localStarted} ms`
        );

        /*
         * -----------------------------------------------------
         * SQL AGGREGATION
         * -----------------------------------------------------
         */

        const sqlAggStarted =
            Date.now();

        const sqlAggResult =
            await pool
                .request()
                .input(
                    "fromDate",
                    `${fromDate} 00:00:00`
                )
                .input(
                    "toDateExclusive",
                    `${toDate} 00:00:00`
                )
                .query(`

                    SET NOCOUNT ON;

                    SELECT

                        CONVERT(
                            varchar(7),
                            t.ztime,
                            23
                        ) AS month_key,

                        CONVERT(
                            nvarchar(100),
                            t.PinNumber
                        ) AS employee_id,

                        SUM(

                            CASE

                                WHEN
                                    t.SalesReturn = 2

                                THEN
                                    -ABS(
                                        calculated.net_line_value
                                    )

                                ELSE
                                    calculated.net_line_value

                            END

                        ) AS sales,

                        COUNT(
                            DISTINCT
                            t.ID
                        ) AS invoices

                    FROM dbo.posTickets t

                    INNER JOIN dbo.posItems pi
                        ON pi.TicketID = t.ID

                    INNER JOIN dbo.Items i
                        ON i.ID = pi.ItemID

                    INNER JOIN dbo.Cards c
                        ON c.ID = t.PinNumber

                       AND ISNULL(
                            c.IsEmployee,
                            0
                       ) = 1

                    CROSS APPLY (

                        SELECT

                            CASE

                                WHEN
                                    ISNULL(
                                        pi.iParts,
                                        0
                                    ) > 0

                                THEN
                                    pi.iParts

                                WHEN
                                    ISNULL(
                                        i.Parts,
                                        0
                                    ) > 0

                                THEN
                                    i.Parts

                                ELSE
                                    1

                            END AS parts

                    ) partsData

                    CROSS APPLY (

                        SELECT

                            (

                                (
                                    ISNULL(
                                        pi.Packs,
                                        0
                                    )
                                    *
                                    partsData.parts
                                )
                                +
                                ISNULL(
                                    pi.Units,
                                    0
                                )

                            )
                            *
                            (
                                ISNULL(
                                    pi.SalesPrice,
                                    0
                                )
                                /
                                NULLIF(
                                    partsData.parts,
                                    0
                                )
                            )
                            -
                            ISNULL(
                                pi.Discount,
                                0
                            )
                            -
                            ISNULL(
                                pi.ExtraDiscount,
                                0
                            )

                            AS net_line_value

                    ) calculated

                    WHERE
                        t.ztime >= @fromDate

                    AND
                        t.ztime < @toDateExclusive

                    AND
                        t.PinNumber IS NOT NULL

                    AND
                        CONVERT(
                            nvarchar(100),
                            t.PinNumber
                        ) NOT IN (
                            N'',
                            N'0'
                        )

                    GROUP BY

                        CONVERT(
                            varchar(7),
                            t.ztime,
                            23
                        ),

                        CONVERT(
                            nvarchar(100),
                            t.PinNumber
                        )

                    ORDER BY
                        month_key,
                        employee_id;

                `);

        const sqlRows =
            Array.isArray(
                sqlAggResult?.recordset
            )
                ? sqlAggResult.recordset
                : [];

        console.log(
            `[sellerPin] SQL employee aggregation rows=${sqlRows.length} in ${Date.now() - sqlAggStarted} ms`
        );

        /*
         * -----------------------------------------------------
         * COMPARE
         * -----------------------------------------------------
         */

        const makeKey =
            row =>
                [
                    String(
                        row?.month_key ||
                        ""
                    ).trim(),

                    String(
                        row?.employee_id ||
                        ""
                    ).trim()
                ].join("|");

        const localMap =
            new Map();

        for (
            const row
            of localRows
        ) {

            localMap.set(
                makeKey(row),
                {
                    sales:
                        Number(
                            row?.sales
                        ) || 0,

                    invoices:
                        Number(
                            row?.invoices
                        ) || 0
                }
            );

        }

        const sqlMap =
            new Map();

        for (
            const row
            of sqlRows
        ) {

            sqlMap.set(
                makeKey(row),
                {
                    sales:
                        Number(
                            row?.sales
                        ) || 0,

                    invoices:
                        Number(
                            row?.invoices
                        ) || 0
                }
            );

        }

        const keys =
            new Set([
                ...localMap.keys(),
                ...sqlMap.keys()
            ]);

        let mismatches =
            0;

        let maxSalesDiff =
            0;

        let maxInvoiceDiff =
            0;

        const mismatchRows =
            [];

        for (
            const key
            of keys
        ) {

            const local =
                localMap.get(
                    key
                ) ||
                {
                    sales: 0,
                    invoices: 0
                };

            const sql =
                sqlMap.get(
                    key
                ) ||
                {
                    sales: 0,
                    invoices: 0
                };

            const salesDiff =
                Math.abs(
                    local.sales -
                    sql.sales
                );

            const invoiceDiff =
                Math.abs(
                    local.invoices -
                    sql.invoices
                );

            maxSalesDiff =
                Math.max(
                    maxSalesDiff,
                    salesDiff
                );

            maxInvoiceDiff =
                Math.max(
                    maxInvoiceDiff,
                    invoiceDiff
                );

            if (
                salesDiff > 0.01 ||
                invoiceDiff !== 0
            ) {

                mismatches += 1;

                if (
                    mismatchRows.length < 20
                ) {

                    mismatchRows.push({

                        key,

                        localSales:
                            Number(
                                local.sales.toFixed(
                                    2
                                )
                            ),

                        sqlSales:
                            Number(
                                sql.sales.toFixed(
                                    2
                                )
                            ),

                        salesDiff:
                            Number(
                                salesDiff.toFixed(
                                    2
                                )
                            ),

                        localInvoices:
                            local.invoices,

                        sqlInvoices:
                            sql.invoices,

                        invoiceDiff

                    });

                }

            }

        }

        console.log("");
        console.log(
            "---------------- COMPARISON ----------------"
        );

        console.log(
            `LOCAL ROWS : ${localRows.length}`
        );

        console.log(
            `SQL ROWS   : ${sqlRows.length}`
        );

        console.log(
            `KEYS       : ${keys.size}`
        );

        console.log(
            `MISMATCHES : ${mismatches}`
        );

        console.log(
            `MAX SALES DIFF: ${maxSalesDiff.toFixed(2)}`
        );

        console.log(
            `MAX INVOICE DIFF: ${maxInvoiceDiff}`
        );

        if (
            mismatchRows.length > 0
        ) {

            console.log("");
            console.log(
                "FIRST MISMATCHES:"
            );

            console.table(
                mismatchRows
            );

        }

        else {

            console.log(
                "RESULT: LOCAL AGGREGATION MATCHES SQL"
            );

        }

    }

    await app.quit();
}

main().catch(
    error => {

        console.error(
            "FATAL:",
            error
        );

        app.quit();

    }
);
