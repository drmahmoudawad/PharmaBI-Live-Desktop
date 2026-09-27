const { app } = require("electron");

app.setPath(
    "userData",
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    await app.whenReady();

    const {
        getAllSavedConnections
    } = await import(
        "../electron/settings/connectionStore.js"
    );

    const {
        getSales
    } = await import(
        "../electron/pharmfly/sales/salesService.js"
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

    const connection =
        getAllSavedConnections().find(
            item =>
                Number(item?.branchId) === 2
        );

    if (!connection) {
        throw new Error(
            "Branch 2 connection not found"
        );
    }

    const db =
        getLocalSalesDatabase();

    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        "REFRESH BRANCH 2 CURRENT DAY"
    );
    console.log(
        "========================================"
    );

    /*
     * This invokes the existing local-first sales path.
     * For the current month it starts the existing
     * background refresh of the newest local day.
     */

    await getSales({
        branchId: 2,
        fromDate: "2026-09-23",
        toDate: "2026-09-24",
        connection,
        forceRefresh: false
    });

    /*
     * Wait until the two missing tickets appear locally.
     */

    let found = false;

    for (
        let attempt = 1;
        attempt <= 45;
        attempt += 1
    ) {

        const rows =
            db.prepare(`
                SELECT
                    ticket_id,
                    COUNT(*) AS line_count,
                    MIN(date) AS min_date,
                    MAX(date) AS max_date,
                    pin_number
                FROM sales_history
                WHERE branch_id = 2
                  AND ticket_id IN (
                      '707650',
                      '707651'
                  )
                GROUP BY
                    ticket_id,
                    pin_number
                ORDER BY
                    ticket_id;
            `).all();

        console.log(
            `[sellerSync] check ${attempt}/45 -> ${rows.length} ticket groups`
        );

        if (
            rows.some(
                row =>
                    String(row.ticket_id) === "707650"
            ) &&
            rows.some(
                row =>
                    String(row.ticket_id) === "707651"
            )
        ) {

            found = true;

            console.log("");
            console.log(
                "TICKETS NOW IN LOCAL DB:"
            );

            console.table(rows);

            break;
        }

        await sleep(2000);
    }

    if (!found) {

        console.error(
            "The existing current-day refresh did not add both tickets within 90 seconds."
        );

        await app.quit();
        return;
    }

    /*
     * Get the authoritative PinNumber from SQL.
     */

    const pool =
        await getBranchPool(
            2,
            connection
        );

    const pinResult =
        await pool
            .request()
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

                WHERE t.ID IN (
                    707650,
                    707651
                );
            `);

    console.log("");
    console.log(
        "SQL PIN NUMBERS:"
    );

    console.table(
        pinResult.recordset
    );

    /*
     * Put the authoritative PinNumber onto
     * the newly inserted local rows.
     */

    const updatePin =
        db.prepare(`
            UPDATE sales_history
            SET pin_number = ?
            WHERE branch_id = 2
              AND ticket_id = ?
        `);

    const update =
        db.transaction(
            rows => {

                let changes = 0;

                for (
                    const row
                    of rows
                ) {

                    const pin =
                        row?.pin_number === null ||
                        row?.pin_number === undefined
                            ? null
                            : String(
                                row.pin_number
                            ).trim();

                    const result =
                        updatePin.run(
                            pin,
                            String(
                                row.ticket_id
                            )
                        );

                    changes +=
                        result.changes;

                }

                return changes;
            }
        );

    const updated =
        update(
            pinResult.recordset
        );

    console.log(
        `[sellerSync] pin_number updated rows=${updated}`
    );

    /*
     * =========================================================
     * FOCUSED COMPARISON: EMPLOYEE 5037 / SEPTEMBER
     * =========================================================
     */

    const local =
        db.prepare(`
            SELECT

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
                    DISTINCT ticket_id
                ) AS invoices

            FROM sales_history

            WHERE branch_id = 2
              AND pin_number = '5037'
              AND date >= '2026-09-01'
              AND date < '2026-10-01';
        `).get();

    const sql =
        await pool
            .request()
            .query(`
                SET NOCOUNT ON;

                SELECT

                    SUM(
                        CASE
                            WHEN t.SalesReturn = 2
                            THEN
                                -ABS(
                                    calculated.net_line_value
                                )
                            ELSE
                                calculated.net_line_value
                        END
                    ) AS sales,

                    COUNT(
                        DISTINCT t.ID
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
                            WHEN ISNULL(pi.iParts, 0) > 0
                            THEN pi.iParts

                            WHEN ISNULL(i.Parts, 0) > 0
                            THEN i.Parts

                            ELSE 1
                        END AS parts
                ) partsData

                CROSS APPLY (
                    SELECT
                        (
                            (
                                ISNULL(pi.Packs, 0)
                                *
                                partsData.parts
                            )
                            +
                            ISNULL(pi.Units, 0)
                        )
                        *
                        (
                            ISNULL(pi.SalesPrice, 0)
                            /
                            NULLIF(
                                partsData.parts,
                                0
                            )
                        )
                        -
                        ISNULL(pi.Discount, 0)
                        -
                        ISNULL(pi.ExtraDiscount, 0)
                        AS net_line_value
                ) calculated

                WHERE t.PinNumber = 5037
                  AND t.ztime >= '2026-09-01 00:00:00'
                  AND t.ztime < '2026-10-01 00:00:00';
            `);

    const sqlRow =
        sql.recordset?.[0] || {};

    const localSales =
        Number(
            local?.sales
        ) || 0;

    const sqlSales =
        Number(
            sqlRow?.sales
        ) || 0;

    const localInvoices =
        Number(
            local?.invoices
        ) || 0;

    const sqlInvoices =
        Number(
            sqlRow?.invoices
        ) || 0;

    console.log("");
    console.log(
        "================ COMPARISON ================"
    );

    console.log(
        `LOCAL  sales=${localSales.toFixed(2)} invoices=${localInvoices}`
    );

    console.log(
        `SQL    sales=${sqlSales.toFixed(2)} invoices=${sqlInvoices}`
    );

    console.log(
        `SALES DIFF=${Math.abs(localSales - sqlSales).toFixed(2)}`
    );

    console.log(
        `INVOICE DIFF=${Math.abs(localInvoices - sqlInvoices)}`
    );

    if (
        Math.abs(localSales - sqlSales) <= 0.01 &&
        localInvoices === sqlInvoices
    ) {
        console.log(
            "RESULT: MATCH"
        );
    }
    else {
        console.log(
            "RESULT: STILL MISMATCHED"
        );
    }

    await app.quit();
}

main().catch(error => {

    console.error(
        "FATAL:",
        error
    );

    app.quit();

});
