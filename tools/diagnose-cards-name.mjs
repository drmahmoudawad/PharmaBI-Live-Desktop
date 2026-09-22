import { app } from "electron";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const TEST_BRANCH_IDS = [2, 5];

const FROM_DATE = "2026-09-01";
const TO_DATE_EXCLUSIVE = "2026-09-18";


async function timed(label, fn) {
    const started = Date.now();

    console.log("");
    console.log(`[START] ${label}`);

    try {
        const result = await fn();

        console.log(
            `[RESULT] ${label} -> ${Date.now() - started} ms`
        );

        return result;
    }
    catch (error) {
        console.log(
            `[FAILED] ${label} -> ${Date.now() - started} ms`
        );

        console.log(
            `[ERROR] ${error?.message || error}`
        );

        return null;
    }
}


async function runBranch(branch) {

    const branchId = Number(branch.branchId);

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        `BRANCH ${branchId} - ${branch.branchName || ""}`
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
            branchId,
            branch
        );

    console.log("[CONNECTED]");


    /*
     * =========================================================
     * 1) Cards.Name metadata
     * =========================================================
     */

    await timed(
        "1. Cards.Name metadata",
        async () => {

            const result =
                await pool
                    .request()
                    .query(`
                        SELECT
                            c.column_id,
                            c.name AS column_name,
                            ty.name AS data_type,
                            c.max_length,
                            c.precision,
                            c.scale,
                            c.is_nullable
                        FROM sys.columns c
                        INNER JOIN sys.tables t
                            ON t.object_id = c.object_id
                        INNER JOIN sys.types ty
                            ON ty.user_type_id = c.user_type_id
                        WHERE
                            t.name = 'Cards'
                            AND c.name = 'Name';
                    `);

            console.log(
                JSON.stringify(
                    result.recordset,
                    null,
                    2
                )
            );
        }
    );


    /*
     * =========================================================
     * 2) Actual Cards.Name lengths
     * =========================================================
     */

    await timed(
        "2. Cards.Name length statistics",
        async () => {

            const result =
                await pool
                    .request()
                    .query(`
                        SELECT
                            COUNT_BIG(*) AS rows_count,
                            COUNT(Name) AS nonnull_names,
                            MAX(
                                CASE
                                    WHEN Name IS NULL THEN 0
                                    ELSE DATALENGTH(Name)
                                END
                            ) AS max_bytes,
                            MAX(
                                CASE
                                    WHEN Name IS NULL THEN 0
                                    ELSE LEN(Name)
                                END
                            ) AS max_characters
                        FROM dbo.Cards;
                    `);

            console.log(
                JSON.stringify(
                    result.recordset,
                    null,
                    2
                )
            );
        }
    );


    /*
     * =========================================================
     * 3) Cards.Name alone
     * =========================================================
     */

    await timed(
        "3. Read Cards.Name only",
        async () => {

            const result =
                await pool
                    .request()
                    .query(`
                        SELECT
                            COUNT_BIG(*) AS rows_count,
                            MAX(
                                CASE
                                    WHEN Name IS NULL THEN 0
                                    ELSE LEN(Name)
                                END
                            ) AS max_len
                        FROM dbo.Cards;
                    `);

            console.log(
                JSON.stringify(
                    result.recordset,
                    null,
                    2
                )
            );
        }
    );


    /*
     * =========================================================
     * 4) Join + COUNT(Name)
     * =========================================================
     */

    await timed(
        "4. posTickets + posItems + Cards + COUNT(Name)",
        async () => {

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
                        SELECT
                            COUNT_BIG(*) AS rows_count,
                            COUNT(c.Name) AS named_rows
                        FROM posTickets t
                        INNER JOIN posItems pi
                            ON pi.TicketID = t.ID
                        LEFT JOIN Cards c
                            ON c.Id = t.CustomerID
                        WHERE
                            t.ztime >= @fromDate
                            AND t.ztime < @toDateExclusive;
                    `);

            console.log(
                JSON.stringify(
                    result.recordset,
                    null,
                    2
                )
            );
        }
    );


    /*
     * =========================================================
     * 5) Very small projection with Cards.Name
     * =========================================================
     */

    await timed(
        "5. Minimal SELECT with Cards.Name",
        async () => {

            const request =
                pool
                    .request()
                    .input(
                        "fromDate",
                        `${FROM_DATE} 00:00:00`
                    )
                    .input(
                        "toDateExclusive",
                        `${TO_DATE_EXCLUSIVE} 00:00:00`
                    );


            const result =
                await request.query(`
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

            console.log(
                `[ROWS] ${result.recordset.length}`
            );
        }
    );
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


    for (
        const branchId of TEST_BRANCH_IDS
    ) {

        const branch =
            connections.find(
                item =>
                    Number(item.branchId) === branchId
            );

        if (!branch) {
            console.log(
                `[SKIP] Branch ${branchId} not found`
            );
            continue;
        }

        try {
            await runBranch(branch);
        }
        catch (error) {
            console.error(
                `[BRANCH FAILED] ${branchId}`,
                error?.stack || error
            );
        }
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