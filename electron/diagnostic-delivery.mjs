import {
    getAllSavedConnections
} from "./settings/connectionStore.js";

import {
    getBranchPool
} from "./connection/connectionManager.js";


async function main() {

    const connections =
        getAllSavedConnections();

    console.log(
        "\n=== SAVED CONNECTIONS ==="
    );

    for (const connection of connections) {

        console.log({
            branchId: connection.branchId,
            branchName: connection.branchName,
            server: connection.server,
            port: connection.port,
            database: connection.database,
            user: connection.user
        });

    }


    const target =
        connections.find(
            item =>
                Number(item.branchId) === 1
        ) ||
        connections[0];


    if (!target) {

        throw new Error(
            "No saved PharmaFly connection found."
        );

    }


    console.log(
        "\n=== TESTING BRANCH ==="
    );

    console.log({
        branchId: target.branchId,
        branchName: target.branchName,
        server: target.server,
        database: target.database
    });


    const pool =
        await getBranchPool(
            target.branchId,
            target
        );


    console.log(
        "\n=== DELIVERY BOY DISTRIBUTION ==="
    );


    const result =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    t.DeliveryBoyId,
                    COUNT(*) AS ticket_count,
                    MIN(t.ztime) AS first_ticket,
                    MAX(t.ztime) AS last_ticket

                FROM dbo.posTickets t

                WHERE
                    t.ztime >= '2026-08-01 00:00:00'

                AND
                    t.ztime < '2026-09-01 00:00:00'

                GROUP BY
                    t.DeliveryBoyId

                ORDER BY
                    ticket_count DESC;

            `);


    console.table(
        result.recordset || []
    );


    console.log(
        "\n=== NON-ZERO DELIVERY TICKETS ==="
    );


    const deliveryResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    COUNT(DISTINCT t.ID) AS delivery_tickets,
                    SUM(ISNULL(t.Total, 0)) AS delivery_total

                FROM dbo.posTickets t

                WHERE
                    t.ztime >= '2026-08-01 00:00:00'

                AND
                    t.ztime < '2026-09-01 00:00:00'

                AND
                    t.DeliveryBoyId IS NOT NULL

                AND
                    t.DeliveryBoyId <> 0;

            `);


    console.table(
        deliveryResult.recordset || []
    );


    console.log(
        "\n=== SAMPLE NON-ZERO DELIVERY ROWS ==="
    );


    const sampleResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT TOP 30

                    t.ID,
                    t.ztime,
                    t.DeliveryBoyId,
                    t.CustomerID,
                    t.SalesReturn,
                    t.Total

                FROM dbo.posTickets t

                WHERE
                    t.ztime >= '2026-08-01 00:00:00'

                AND
                    t.ztime < '2026-09-01 00:00:00'

                AND
                    t.DeliveryBoyId IS NOT NULL

                AND
                    t.DeliveryBoyId <> 0

                ORDER BY
                    t.ztime DESC;

            `);


    console.table(
        sampleResult.recordset || []
    );


    await pool.close();

    console.log(
        "\n=== DONE ==="
    );

}


main()
    .catch(
        error => {

            console.error(
                "\n=== DIAGNOSTIC ERROR ===\n",
                error
            );

            process.exitCode = 1;

        }
    );