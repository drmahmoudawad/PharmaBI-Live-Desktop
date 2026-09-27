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

    const pool =
        await getBranchPool(
            2,
            connection
        );

    const db =
        getLocalSalesDatabase();

    console.log("");
    console.log(
        "========================================"
    );
    console.log(
        "CHECK TICKETS 707650 / 707651"
    );
    console.log(
        "========================================"
    );

    const sqlTickets =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    t.ID AS ticket_id,

                    t.ztime,

                    t.PinNumber,

                    t.SalesRepID,

                    t.SalesReturn,

                    t.Total AS ticket_total,

                    COUNT(pi.ID) AS line_count

                FROM dbo.posTickets t

                LEFT JOIN dbo.posItems pi
                    ON pi.TicketID = t.ID

                WHERE
                    t.ID IN (
                        707650,
                        707651
                    )

                GROUP BY

                    t.ID,
                    t.ztime,
                    t.PinNumber,
                    t.SalesRepID,
                    t.SalesReturn,
                    t.Total

                ORDER BY
                    t.ID;

            `);

    console.log("");
    console.log(
        "SQL TICKETS:"
    );

    console.table(
        sqlTickets.recordset
    );

    const sqlLines =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    pi.TicketID AS ticket_id,

                    pi.ID AS line_id,

                    pi.ItemID AS item_id,

                    pi.Packs,

                    pi.Units,

                    pi.iParts,

                    pi.SalesPrice,

                    pi.Discount,

                    pi.ExtraDiscount,

                    pi.Cost

                FROM dbo.posItems pi

                WHERE
                    pi.TicketID IN (
                        707650,
                        707651
                    )

                ORDER BY
                    pi.TicketID,
                    pi.ID;

            `);

    console.log("");
    console.log(
        "SQL LINES:"
    );

    console.table(
        sqlLines.recordset
    );

    const localRows =
        db.prepare(`

            SELECT

                ticket_id,

                line_id,

                item_id,

                date,

                pin_number,

                sales_return,

                packs,

                units,

                parts,

                sales_price,

                discount,

                extra_discount,

                net_line_value

            FROM sales_history

            WHERE
                branch_id = 2

            AND
                ticket_id IN (
                    '707650',
                    '707651'
                )

            ORDER BY
                ticket_id,
                line_id;

        `).all();

    console.log("");
    console.log(
        "LOCAL SALES HISTORY:"
    );

    console.table(
        localRows
    );

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
