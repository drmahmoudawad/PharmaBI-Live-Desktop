const { app } = require("electron");

const TEST_BRANCHES = [1, 2, 4];

const FROM_DATE = "2025-10-01";
const TO_DATE = "2026-09-24";

const SELLER_AGGREGATION_SQL = `
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

        ON
            pi.TicketID =
            t.ID

    INNER JOIN dbo.Items i

        ON
            i.ID =
            pi.ItemID

    INNER JOIN dbo.Cards c

        ON
            c.ID =
            t.PinNumber

        AND
            ISNULL(
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
                    ) *
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
`;

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
            `EXACT SELLER AGGREGATION BRANCH ${branchId}`
        );
        console.log(
            "=================================================="
        );

        try {

            const connection =
                getBranchConnection(
                    branchId
                );

            if (!connection) {

                console.log(
                    `BRANCH ${branchId}: NO CONNECTION`
                );

                continue;

            }

            console.log(
                `SERVER=${connection.server}`
            );

            console.log(
                `PORT=${connection.port}`
            );

            console.log(
                `DATABASE=${connection.database}`
            );

            const pool =
                await getBranchPool(
                    branchId,
                    connection
                );

            console.log(
                `BRANCH ${branchId}: CONNECTION OK`
            );

            const started =
                Date.now();

            const request =
                pool
                    .request()
                    .input(
                        "fromDate",
                        `${FROM_DATE} 00:00:00`
                    )
                    .input(
                        "toDateExclusive",
                        `${TO_DATE} 00:00:00`
                    );

            console.log(
                `[BRANCH ${branchId}] START EXACT SELLER AGGREGATION`
            );

            const result =
                await request.query(
                    SELLER_AGGREGATION_SQL
                );

            const elapsed =
                Date.now() -
                started;

            const rows =
                Array.isArray(
                    result?.recordset
                )
                    ? result.recordset
                    : [];

            console.log(
                `[BRANCH ${branchId}] DONE in ${elapsed} ms`
            );

            console.log(
                `[BRANCH ${branchId}] RESULT ROWS = ${rows.length}`
            );

            console.table(
                rows.slice(
                    0,
                    15
                )
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

    }

    await app.quit();

}

run().catch(
    error => {

        console.error(
            "FATAL:",
            error
        );

        app.quit();

    }
);
