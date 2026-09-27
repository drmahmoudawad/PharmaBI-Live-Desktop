const { app } = require("electron");

const TEST_BRANCHES = [1, 2, 4];

const FROM_DATE = "2025-10-01";
const TO_DATE = "2026-09-24";

async function run() {

    await app.whenReady();

    const {
        getBranchConnection
    } = await import(
        "../electron/settings/connectionStore.js"
    );

    const {
        getBranchPool
    } = await import(
        "../electron/connection/connectionManager.js"
    );

    for (
        const branchId
        of TEST_BRANCHES
    ) {

        console.log("");
        console.log(
            "=================================================="
        );
        console.log(
            `SELLER COMPARISON BRANCH ${branchId}`
        );
        console.log(
            "=================================================="
        );

        const branchStarted =
            Date.now();

        try {

            const connection =
                getBranchConnection(
                    branchId
                );

            if (!connection) {

                console.log(
                    `BRANCH ${branchId}: NO SAVED CONNECTION`
                );

                continue;

            }

            console.log(
                `SERVER=${connection.server || ""}`
            );

            console.log(
                `PORT=${connection.port || ""}`
            );

            console.log(
                `DATABASE=${connection.database || ""}`
            );

            const pool =
                await getBranchPool(
                    branchId,
                    connection
                );

            console.log(
                `BRANCH ${branchId}: CONNECTION OK`
            );

            /*
             * =================================================
             * 1. DATABASE / SQL SERVER INFO
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "DATABASE INFO",
                `
                    SELECT

                        DB_NAME() AS database_name,

                        CAST(
                            SERVERPROPERTY(
                                'ProductVersion'
                            )
                            AS nvarchar(100)
                        ) AS sql_version,

                        CAST(
                            SERVERPROPERTY(
                                'ProductLevel'
                            )
                            AS nvarchar(100)
                        ) AS sql_level,

                        CAST(
                            SERVERPROPERTY(
                                'Edition'
                            )
                            AS nvarchar(200)
                        ) AS sql_edition,

                        d.compatibility_level,

                        d.collation_name

                    FROM sys.databases d

                    WHERE
                        d.name = DB_NAME()
                `
            );

            /*
             * =================================================
             * 2. TICKETS COUNT
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "TOTAL TICKETS",
                `
                    SELECT
                        COUNT_BIG(*) AS ticket_count
                    FROM dbo.posTickets
                    WHERE
                        ztime >= @fromDate
                    AND
                        ztime < @toDate
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

            /*
             * =================================================
             * 3. POS ITEMS COUNT
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "TOTAL POS ITEMS",
                `
                    SELECT
                        COUNT_BIG(*) AS pos_items_count
                    FROM dbo.posItems
                    WHERE
                        EXISTS (
                            SELECT 1
                            FROM dbo.posTickets t
                            WHERE
                                t.ID =
                                posItems.TicketID
                            AND
                                t.ztime >= @fromDate
                            AND
                                t.ztime < @toDate
                        )
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

            /*
             * =================================================
             * 4. TICKETS WITH PIN
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "TICKETS WITH PIN",
                `
                    SELECT
                        COUNT_BIG(*) AS ticket_count
                    FROM dbo.posTickets
                    WHERE
                        ztime >= @fromDate
                    AND
                        ztime < @toDate
                    AND
                        PinNumber IS NOT NULL
                    AND
                        PinNumber <> 0
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

            /*
             * =================================================
             * 5. UNIQUE PIN
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "UNIQUE PIN NUMBERS",
                `
                    SELECT
                        COUNT(
                            DISTINCT PinNumber
                        ) AS unique_pin_numbers
                    FROM dbo.posTickets
                    WHERE
                        ztime >= @fromDate
                    AND
                        ztime < @toDate
                    AND
                        PinNumber IS NOT NULL
                    AND
                        PinNumber <> 0
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

            /*
             * =================================================
             * 6. PIN -> CARDS
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "PIN TO CARDS MATCH",
                `
                    SELECT

                        COUNT_BIG(*) AS matched_rows,

                        COUNT_BIG(
                            DISTINCT t.PinNumber
                        ) AS matched_pins

                    FROM dbo.posTickets t

                    INNER JOIN dbo.Cards c
                        ON c.ID = t.PinNumber

                    WHERE
                        t.ztime >= @fromDate
                    AND
                        t.ztime < @toDate
                    AND
                        t.PinNumber IS NOT NULL
                    AND
                        t.PinNumber <> 0
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

            /*
             * =================================================
             * 7. RELEVANT INDEXES
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "RELEVANT INDEXES",
                `
                    SELECT

                        OBJECT_NAME(
                            i.object_id
                        ) AS table_name,

                        i.name AS index_name,

                        i.type_desc,

                        i.is_disabled,

                        i.is_hypothetical

                    FROM sys.indexes i

                    WHERE
                        i.object_id IN (

                            OBJECT_ID(
                                'dbo.posTickets'
                            ),

                            OBJECT_ID(
                                'dbo.posItems'
                            ),

                            OBJECT_ID(
                                'dbo.Cards'
                            ),

                            OBJECT_ID(
                                'dbo.Items'
                            )

                        )

                    AND
                        i.index_id > 0

                    ORDER BY

                        table_name,

                        i.index_id
                `
            );

            /*
             * =================================================
             * 8. IMPORTANT INDEX COLUMNS
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "INDEX COLUMNS",
                `
                    SELECT

                        OBJECT_NAME(
                            i.object_id
                        ) AS table_name,

                        i.name AS index_name,

                        ic.key_ordinal,

                        c.name AS column_name,

                        ic.is_included_column

                    FROM sys.indexes i

                    INNER JOIN sys.index_columns ic
                        ON ic.object_id =
                           i.object_id

                    AND
                       ic.index_id =
                           i.index_id

                    INNER JOIN sys.columns c
                        ON c.object_id =
                           ic.object_id

                    AND
                       c.column_id =
                           ic.column_id

                    WHERE
                        i.object_id IN (

                            OBJECT_ID(
                                'dbo.posTickets'
                            ),

                            OBJECT_ID(
                                'dbo.posItems'
                            ),

                            OBJECT_ID(
                                'dbo.Cards'
                            ),

                            OBJECT_ID(
                                'dbo.Items'
                            )

                        )

                    AND
                        i.index_id > 0

                    ORDER BY

                        table_name,

                        index_name,

                        ic.key_ordinal,

                        c.name
                `
            );

            /*
             * =================================================
             * 9. PIN DISTRIBUTION
             * =================================================
             */

            await runQuery(
                pool,
                branchId,
                "TOP SELLER PINS",
                `
                    SELECT TOP 20

                        t.PinNumber AS pin_number,

                        c.Name AS seller_name,

                        COUNT_BIG(*) AS ticket_count

                    FROM dbo.posTickets t

                    LEFT JOIN dbo.Cards c
                        ON c.ID = t.PinNumber

                    WHERE
                        t.ztime >= @fromDate
                    AND
                        t.ztime < @toDate
                    AND
                        t.PinNumber IS NOT NULL
                    AND
                        t.PinNumber <> 0

                    GROUP BY

                        t.PinNumber,

                        c.Name

                    ORDER BY

                        COUNT_BIG(*) DESC
                `,
                request => {

                    request.input(
                        "fromDate",
                        FROM_DATE
                    );

                    request.input(
                        "toDate",
                        TO_DATE
                    );

                }
            );

        }
        catch (
            error
        ) {

            console.error(
                `BRANCH ${branchId} FAILED:`,
                error?.message ||
                error
            );

        }

        console.log(
            `BRANCH ${branchId} TOTAL ELAPSED = ${
                Date.now() - branchStarted
            } ms`
        );

    }

    await app.quit();

}

async function runQuery(
    pool,
    branchId,
    label,
    sqlText,
    configure = null
) {

    const started =
        Date.now();

    console.log(
        `[BRANCH ${branchId}] START ${label}`
    );

    const request =
        pool.request();

    if (
        typeof configure ===
        "function"
    ) {

        configure(
            request
        );

    }

    try {

        const result =
            await request.query(
                sqlText
            );

        const elapsed =
            Date.now() -
            started;

        console.log(
            `[BRANCH ${branchId}] DONE ${label} in ${elapsed} ms`
        );

        console.table(
            result?.recordset ||
            []
        );

    }
    catch (
        error
    ) {

        const elapsed =
            Date.now() -
            started;

        console.error(
            `[BRANCH ${branchId}] FAILED ${label} in ${elapsed} ms:`,
            error?.message ||
            error
        );

    }

}

run().catch(
    error => {

        console.error(
            "SELLER DIAGNOSTIC FATAL:",
            error
        );

        app.quit();

    }
);
