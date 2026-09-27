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

    const connection =
        connections.find(
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
        "BRANCH 2 EMPLOYEE 5037 - 2026-09 DETAIL"
    );
    console.log(
        "========================================"
    );

    /*
     * =========================================================
     * SQL BY TICKET
     * =========================================================
     */

    const sqlResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    CONVERT(
                        nvarchar(100),
                        t.ID
                    ) AS ticket_id,

                    SUM(

                        CASE

                            WHEN
                                t.SalesReturn = 2

                            THEN
                                -ABS(

                                    (

                                        (
                                            ISNULL(
                                                pi.Packs,
                                                0
                                            )
                                            *
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

                                            END
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

                                            END,

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

                                )

                            ELSE

                                (

                                    (
                                        ISNULL(
                                            pi.Packs,
                                            0
                                        )
                                        *
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

                                        END
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

                                        END,

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

                        END

                    ) AS sales

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

                WHERE
                    t.PinNumber = 5037

                AND
                    t.ztime >=
                    '2026-09-01 00:00:00'

                AND
                    t.ztime <
                    '2026-10-01 00:00:00'

                GROUP BY
                    t.ID

                ORDER BY
                    t.ID;

            `);

    /*
     * =========================================================
     * LOCAL BY TICKET
     * =========================================================
     */

    const localRows =
        db.prepare(`

            SELECT

                ticket_id,

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
                branch_id = 2

            AND
                pin_number = '5037'

            AND
                date >= '2026-09-01'

            AND
                date < '2026-10-01'

            GROUP BY
                ticket_id

            ORDER BY
                ticket_id;

        `).all();

    const sqlMap =
        new Map();

    for (
        const row
        of sqlResult.recordset || []
    ) {

        sqlMap.set(
            String(
                row.ticket_id
            ),
            Number(
                row.sales
            ) || 0
        );

    }

    const localMap =
        new Map();

    for (
        const row
        of localRows
    ) {

        localMap.set(
            String(
                row.ticket_id
            ),
            Number(
                row.sales
            ) || 0
        );

    }

    const keys =
        new Set([
            ...sqlMap.keys(),
            ...localMap.keys()
        ]);

    const differences =
        [];

    for (
        const ticketId
        of keys
    ) {

        const sql =
            sqlMap.get(
                ticketId
            ) || 0;

        const local =
            localMap.get(
                ticketId
            ) || 0;

        const diff =
            Math.abs(
                sql - local
            );

        if (
            diff > 0.01
        ) {

            differences.push({

                ticket_id:
                    ticketId,

                sql_sales:
                    Number(
                        sql.toFixed(2)
                    ),

                local_sales:
                    Number(
                        local.toFixed(2)
                    ),

                difference:
                    Number(
                        diff.toFixed(2)
                    )

            });

        }

    }

    console.log("");
    console.log(
        `SQL tickets   : ${sqlMap.size}`
    );

    console.log(
        `LOCAL tickets : ${localMap.size}`
    );

    console.log(
        `DIFFERENCES   : ${differences.length}`
    );

    console.log("");

    if (
        differences.length
    ) {

        console.table(
            differences
        );

    }
    else {

        console.log(
            "NO TICKET-LEVEL DIFFERENCES"
        );

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
