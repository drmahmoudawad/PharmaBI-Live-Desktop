import { app } from "electron";
import { getBranchConnection } from "../electron/settings/connectionStore.js";
import { getBranchPool } from "../electron/connection/connectionManager.js";

const FROM_DATE = "2025-10-01";
const TO_DATE = "2026-09-24";

function addDay(dateText) {
    const d = new Date(`${dateText}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

async function benchBranch(branchId) {

    console.log(`\n========================================`);
    console.log(`BRANCH ${branchId}`);
    console.log(`========================================`);

    const connection =
        getBranchConnection(branchId);

    if (!connection) {
        throw new Error(
            `No saved connection for branch ${branchId}`
        );
    }

    console.log(
        `Connection: ${connection.server}:${connection.port}/${connection.database}`
    );

    const poolStart = Date.now();

    const pool =
        await getBranchPool(
            branchId,
            connection
        );

    console.log(
        `getBranchPool: ${((Date.now() - poolStart) / 1000).toFixed(3)} sec`
    );

    const toExclusive =
        addDay(TO_DATE);

    /*
     * 1) EXACT metricsTicketResult
     */

    let start = Date.now();

    const metricsResult =
        await pool
            .request()
            .input(
                "metricsFromDate",
                `${FROM_DATE} 00:00:00`
            )
            .input(
                "metricsToDateExclusive",
                `${toExclusive} 00:00:00`
            )
            .query(`

                SET NOCOUNT ON;

                SELECT

                    t.ID AS ticket_id,

                    CONVERT(
                        varchar(10),
                        CAST(t.ztime AS date),
                        23
                    ) AS ticket_date,

                    t.CustomerID AS customer_id,

                    c.Name AS delivery_customer_name,

                    t.SalesReturn AS sales_return,

                    ISNULL(
                        t.Total,
                        0
                    ) AS ticket_total

                FROM dbo.posTickets t

                LEFT JOIN dbo.Cards c
                    ON c.ID = t.CustomerID

                WHERE

                    t.ztime >= @metricsFromDate

                AND

                    t.ztime < @metricsToDateExclusive;

            `);

    console.log(
        `1) metricsTicketResult: ${((Date.now() - start) / 1000).toFixed(3)} sec | rows=${metricsResult.recordset.length}`
    );

    /*
     * 2) EXACT ticketResult / PinNumber
     */

    start = Date.now();

    const ticketResult =
        await pool
            .request()
            .input(
                "fromDate",
                `${FROM_DATE} 00:00:00`
            )
            .input(
                "toDateExclusive",
                `${toExclusive} 00:00:00`
            )
            .query(`

                SET NOCOUNT ON;

                SELECT

                    t.ID AS ticket_id,

                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) AS employee_id

                FROM dbo.posTickets t

                LEFT JOIN dbo.Cards c
                    ON c.ID = t.CustomerID

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
                    );

            `);

    console.log(
        `2) ticketResult PinNumber: ${((Date.now() - start) / 1000).toFixed(3)} sec | rows=${ticketResult.recordset.length}`
    );

    /*
     * Build exact employee ID list used by loadEmployeeNames
     */

    const employeeKeys =
        new Set();

    for (
        const row of ticketResult.recordset
    ) {

        const employeeId =
            String(
                row?.employee_id ?? ""
            ).trim();

        if (
            employeeId &&
            employeeId !== "0"
        ) {
            employeeKeys.add(
                employeeId
            );
        }
    }

    console.log(
        `unique PinNumbers: ${employeeKeys.size}`
    );

    /*
     * 3) EXACT Cards lookup
     */

    const request =
        pool.request();

    const placeholders =
        Array.from(
            employeeKeys
        ).map(
            (
                employeeId,
                index
            ) => {

                const parameterName =
                    `employeeCardId${index}`;

                request.input(
                    parameterName,
                    employeeId
                );

                return `@${parameterName}`;
            }
        );

    start = Date.now();

    const cardsResult =
        await request.query(`

            SET NOCOUNT ON;

            SELECT

                CONVERT(
                    nvarchar(100),
                    c.ID
                ) AS employee_id,

                LTRIM(
                    RTRIM(
                        CONVERT(
                            nvarchar(400),
                            c.Name
                        )
                    )
                ) AS employee_name

            FROM dbo.Cards c

            WHERE

                CONVERT(
                    nvarchar(100),
                    c.ID
                ) IN (

                    ${placeholders.join(", ")}

                )

            AND

                NULLIF(
                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ),
                    ''
                ) IS NOT NULL;

        `);

    console.log(
        `3) Cards lookup: ${((Date.now() - start) / 1000).toFixed(3)} sec | rows=${cardsResult.recordset.length}`
    );

    /*
     * 4) TEMP diagnostic currently present in dashboardOverviewService
     */

    start = Date.now();

    const diagnosticCards =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    ID,
                    Name,
                    IsEmployee,
                    IsSalesRep,
                    SalesRepID
                FROM dbo.Cards
                WHERE
                    SalesRepID IN (10,26,28)
                ORDER BY
                    SalesRepID,
                    ID;

            `);

    console.log(
        `4) Diagnostic Cards: ${((Date.now() - start) / 1000).toFixed(3)} sec | rows=${diagnosticCards.recordset.length}`
    );

    start = Date.now();

    const diagnosticTickets =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT TOP 30
                    t.ID AS TicketID,
                    t.SalesRepID,
                    t.PinNumber,
                    t.ztime
                FROM dbo.posTickets t
                WHERE
                    t.SalesRepID IN (10,26,28)
                ORDER BY
                    t.ztime DESC,
                    t.ID DESC;

            `);

    console.log(
        `5) Diagnostic tickets: ${((Date.now() - start) / 1000).toFixed(3)} sec | rows=${diagnosticTickets.recordset.length}`
    );

    console.log(
        `TOTAL employee mapping SQL: measurements complete`
    );
}

await app.whenReady();

try {

    await benchBranch(2);
    await benchBranch(4);

}
catch (error) {

    console.error(error);

}
finally {

    app.quit();

}
