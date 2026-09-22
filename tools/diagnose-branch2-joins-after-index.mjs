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


const TESTS = [
    {
        code: "A",
        name: "posTickets + posItems",
        sql: `
            SELECT COUNT_BIG(*) AS row_count
            FROM posTickets t
            INNER JOIN posItems pi
                ON pi.TicketID = t.ID
            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;
        `
    },

    {
        code: "B",
        name: "A + Cards",
        sql: `
            SELECT COUNT_BIG(*) AS row_count
            FROM posTickets t
            INNER JOIN posItems pi
                ON pi.TicketID = t.ID
            LEFT JOIN Cards c
                ON c.Id = t.CustomerID
            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;
        `
    },

    {
        code: "C",
        name: "A + Items",
        sql: `
            SELECT COUNT_BIG(*) AS row_count
            FROM posTickets t
            INNER JOIN posItems pi
                ON pi.TicketID = t.ID
            LEFT JOIN Items i
                ON i.ID = pi.ItemID
            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;
        `
    },

    {
        code: "D",
        name: "A + Cards + Items",
        sql: `
            SELECT COUNT_BIG(*) AS row_count
            FROM posTickets t
            INNER JOIN posItems pi
                ON pi.TicketID = t.ID
            LEFT JOIN Cards c
                ON c.Id = t.CustomerID
            LEFT JOIN Items i
                ON i.ID = pi.ItemID
            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;
        `
    }
];


async function runTest(
    pool,
    test
) {

    const started =
        Date.now();

    console.log("");
    console.log(
        `[START] Test ${test.code} - ${test.name}`
    );

    try {

        const result =
            await pool
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

                    ${test.sql}
                `);

        const elapsed =
            Date.now() - started;

        const rows =
            result?.recordset?.[0]?.row_count;

        console.log(
            `[RESULT] Test ${test.code} -> rows=${rows} | ${elapsed} ms`
        );

    }
    catch (error) {

        console.log(
            `[FAILED] Test ${test.code} -> ${Date.now() - started} ms`
        );

        console.log(
            `[ERROR] ${error?.message || error}`
        );
    }
}


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );


    const connections =
        getAllSavedConnections();


    // Diagnostic only.
    for (const branch of connections) {
        branch.password = "123";
    }


    const branch =
        connections.find(
            item =>
                Number(item.branchId) === BRANCH_ID
        );


    if (!branch) {
        throw new Error(
            `Branch ${BRANCH_ID} not found.`
        );
    }


    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "BRANCH 2 JOIN TEST AFTER UNIQUE INDEX"
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
        `${FROM_DATE} -> 2026-09-17`
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


    for (
        const test of TESTS
    ) {

        await runTest(
            pool,
            test
        );

    }


    await closeAllConnections();

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