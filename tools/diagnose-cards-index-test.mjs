import { app } from "electron";

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

    for (
        const branch of connections
    ) {
        branch.password = "123";
    }

    const branch =
        connections.find(
            item =>
                Number(item.branchId) === BRANCH_ID
        );

    if (!branch) {
        throw new Error(
            "Branch 2 not found."
        );
    }

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "BRANCH 2 - TEMPORARY CARDS INDEX TEST"
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

    console.log(
        "[CONNECTED]"
    );

    const transaction =
        new (await import("mssql")).default.Transaction(
            pool
        );

    try {

        await transaction.begin();

        console.log(
            "[TRANSACTION] Started."
        );

        console.log(
            "[INDEX] Creating temporary diagnostic index on Cards.Id..."
        );

        const indexStart =
            Date.now();

        await transaction
            .request()
            .query(`
                CREATE NONCLUSTERED INDEX
                    IX_DIAG_Cards_Id
                ON dbo.Cards (
                    Id
                );
            `);

        console.log(
            `[INDEX] Created in ${Date.now() - indexStart} ms`
        );

        console.log(
            "[QUERY] Running exact Cards JOIN..."
        );

        const queryStart =
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
                        COUNT_BIG(*) AS joined_rows
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
            Date.now() - queryStart;

        console.log(
            `[QUERY] Result rows=${result.recordset[0].joined_rows}`
        );

        console.log(
            `[QUERY] Completed in ${elapsed} ms`
        );

        console.log(
            "[ROLLBACK] Removing diagnostic index..."
        );

        await transaction.rollback();

        console.log(
            "[ROLLBACK] Complete. No permanent index remains."
        );

        console.log("");
        console.log(
            "============================================================"
        );

        if (
            elapsed < 10000
        ) {
            console.log(
                "DIAGNOSIS CONFIRMED: Cards.Id index fixes the bottleneck."
            );
        }
        else {
            console.log(
                "INDEX HELPED, BUT BOTTLENECK NEEDS FURTHER INVESTIGATION."
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