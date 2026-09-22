import { app } from "electron";
import sql from "mssql";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const BRANCH_ID = 2;

const FROM_DATE = "2026-09-01";
const TO_DATE_EXCLUSIVE = "2026-09-18";


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );

    const connections =
        getAllSavedConnections();

    // Diagnostic only
    for (const branch of connections) {
        branch.password = "123";
    }

    const branch =
        connections.find(
            item =>
                Number(item.branchId) === BRANCH_ID
        );

    if (!branch) {
        throw new Error("Branch 2 not found.");
    }

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "BRANCH 2 - CARDS COVERING INDEX TEST"
    );
    console.log(
        `SERVER=${branch.server}`
    );
    console.log(
        `DATABASE=${branch.database}`
    );
    console.log(
        `PORT=${branch.port}`
    );
    console.log(
        "============================================================"
    );

    const pool =
        await getBranchPool(
            BRANCH_ID,
            branch
        );

    console.log("[CONNECTED]");

    const transaction =
        new sql.Transaction(pool);

    try {

        await transaction.begin();

        console.log(
            "[TRANSACTION] Started."
        );

        console.log(
            "[INDEX] Creating temporary UNIQUE covering index..."
        );

        const indexStarted =
            Date.now();

        await transaction
            .request()
            .query(`
                CREATE UNIQUE NONCLUSTERED INDEX
                    UX_DIAG_Cards_Id_Name
                ON dbo.Cards (
                    Id
                )
                INCLUDE (
                    Name
                );
            `);

        console.log(
            `[INDEX] Created in ${Date.now() - indexStarted} ms`
        );

        console.log(
            "[QUERY] Running minimal SELECT with Cards.Name..."
        );

        const queryStarted =
            Date.now();

        const result =
            await transaction
                .request()
                .input(
                    "fromDate",
                    `${FROM_DATE} 00:00:00`
                )
                .input(
                    "toDateExclusive",
                    `${TO_DATE_EXCLUSIVE} 00:00:00`
                )
                .query(`
                    SET NOCOUNT ON;

                    SELECT
                        t.ID AS ticket_id,
                        pi.ID AS line_id,
                        c.Name AS customer_name

                    FROM posTickets t

                    INNER JOIN posItems pi
                        ON pi.TicketID = t.ID

                    LEFT JOIN Cards c
                        ON c.Id = t.CustomerID

                    WHERE
                        t.ztime >= @fromDate
                        AND t.ztime < @toDateExclusive;
                `);

        const elapsed =
            Date.now() - queryStarted;

        console.log(
            `[QUERY] rows=${result.recordset.length}`
        );

        console.log(
            `[QUERY] Completed in ${elapsed} ms`
        );

        console.log(
            "[ROLLBACK] Removing temporary covering index..."
        );

        await transaction.rollback();

        console.log(
            "[ROLLBACK] Complete. No permanent change."
        );

        console.log("");
        console.log(
            "============================================================"
        );

        if (elapsed < 10000) {
            console.log(
                "DIAGNOSIS CONFIRMED: Cards.Name lookup was the bottleneck."
            );
        }
        else {
            console.log(
                "Covering index did not fully solve the bottleneck."
            );
        }

        console.log(
            "============================================================"
        );

    }
    catch (error) {

        console.error(
            "[FAILED]",
            error?.stack || error
        );

        try {
            await transaction.rollback();
        }
        catch {}
    }

    try {
        await closeAllConnections();
    }
    catch {}

    app.quit();
}


main().catch(
    async error => {

        console.error(
            error?.stack || error
        );

        try {
            await closeAllConnections();
        }
        catch {}

        app.quit();

        process.exitCode = 1;
    }
);