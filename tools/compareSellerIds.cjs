const { app } = require("electron");

app.setPath(
    "userData",
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
);

async function main() {

    await app.whenReady();

    const {
        getAllSavedConnections
    } =
        await import(
            "../electron/settings/connectionStore.js"
        );

    const {
        getBranchPool
    } =
        await import(
            "../electron/connection/connectionManager.js"
        );

    const connections =
        getAllSavedConnections();

    for (const branchId of [2, 4]) {

        console.log("");
        console.log("========================================");
        console.log(
            `BRANCH ${branchId} SELLER ID COMPARISON`
        );
        console.log("========================================");

        const connection =
            connections.find(
                item =>
                    Number(item?.branchId) === branchId
            );

        if (!connection) {
            console.log(
                `BRANCH ${branchId}: SAVED CONNECTION NOT FOUND`
            );
            continue;
        }

        const pool =
            await getBranchPool(
                branchId,
                connection
            );

        try {

            /*
             * SUMMARY
             */

            const summary =
                await pool
                    .request()
                    .input(
                        "fromDate",
                        "2025-10-01 00:00:00"
                    )
                    .input(
                        "toDateExclusive",
                        "2026-09-24 00:00:00"
                    )
                    .query(`
                        SET NOCOUNT ON;

                        SELECT

                            COUNT_BIG(*) AS total_tickets,

                            COUNT(DISTINCT t.PinNumber)
                                AS unique_pin_numbers,

                            COUNT(DISTINCT t.SalesRepID)
                                AS unique_sales_rep_ids,

                            SUM(
                                CASE
                                    WHEN t.PinNumber IS NULL
                                      OR t.PinNumber = 0
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS null_or_zero_pin,

                            SUM(
                                CASE
                                    WHEN t.SalesRepID IS NULL
                                      OR t.SalesRepID = 0
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS null_or_zero_sales_rep,

                            SUM(
                                CASE
                                    WHEN t.PinNumber = t.SalesRepID
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS exact_same,

                            SUM(
                                CASE
                                    WHEN ISNULL(cPin.IsEmployee, 0) = 1
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS pin_employee_rows,

                            SUM(
                                CASE
                                    WHEN ISNULL(cRep.IsEmployee, 0) = 1
                                    THEN 1
                                    ELSE 0
                                END
                            ) AS sales_rep_employee_rows

                        FROM dbo.posTickets t

                        LEFT JOIN dbo.Cards cPin
                            ON cPin.ID = t.PinNumber

                        LEFT JOIN dbo.Cards cRep
                            ON cRep.ID = t.SalesRepID

                        WHERE t.ztime >= @fromDate
                          AND t.ztime < @toDateExclusive;
                    `);

            console.log("");

            console.table(
                summary.recordset
            );

            /*
             * EMPLOYEE PIN NUMBERS
             *
             * We use PinNumber because the summary
             * already proves that employee rows are
             * mapped through PinNumber.
             */

            const employees =
                await pool
                    .request()
                    .input(
                        "fromDate",
                        "2025-10-01 00:00:00"
                    )
                    .input(
                        "toDateExclusive",
                        "2026-09-24 00:00:00"
                    )
                    .query(`
                        SET NOCOUNT ON;

                        SELECT TOP 100

                            t.PinNumber,

                            MAX(
                                LTRIM(
                                    RTRIM(
                                        CONVERT(
                                            nvarchar(400),
                                            cPin.Name
                                        )
                                    )
                                )
                            ) AS employee_name,

                            COUNT_BIG(*) AS ticket_count

                        FROM dbo.posTickets t

                        INNER JOIN dbo.Cards cPin
                            ON cPin.ID = t.PinNumber
                           AND ISNULL(cPin.IsEmployee, 0) = 1

                        WHERE t.ztime >= @fromDate
                          AND t.ztime < @toDateExclusive
                          AND t.PinNumber IS NOT NULL
                          AND t.PinNumber <> 0

                        GROUP BY
                            t.PinNumber

                        ORDER BY
                            COUNT_BIG(*) DESC;
                    `);

            console.log("");
            console.log(
                "EMPLOYEE PIN NUMBERS:"
            );

            console.table(
                employees.recordset
            );

        }
        catch (error) {

            console.error(
                `BRANCH ${branchId} FAILED:`,
                error?.message || error
            );

        }
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
