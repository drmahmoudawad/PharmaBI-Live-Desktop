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


function log(message) {
    console.log(message);
}


async function timed(label, fn) {
    const started = Date.now();

    try {
        const result = await fn();

        console.log(
            `[RESULT] ${label} -> ${Date.now() - started} ms`
        );

        return result;
    } catch (error) {
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
    console.log("============================================================");
    console.log(
        `BRANCH ${branchId} - ${branch.branchName || ""}`
    );
    console.log(`SERVER=${branch.server}`);
    console.log(`DATABASE=${branch.database}`);
    console.log(`PORT=${branch.port}`);
    console.log("============================================================");

    const pool = await getBranchPool(
        branchId,
        branch
    );

    console.log(
        `[CONNECTED] Branch ${branchId}`
    );

    /*
     * 1) Data types
     */
    await timed(
        "1. DATATYPES Cards.ID / posTickets.CustomerID",
        async () => {
            const result = await pool.request().query(`
                SELECT
                    'Cards.ID' AS source,
                    c.name AS column_name,
                    ty.name AS data_type,
                    c.max_length,
                    c.precision,
                    c.scale
                FROM sys.columns c
                INNER JOIN sys.tables t
                    ON t.object_id = c.object_id
                INNER JOIN sys.types ty
                    ON ty.user_type_id = c.user_type_id
                WHERE
                    t.name = 'Cards'
                    AND c.name = 'ID'

                UNION ALL

                SELECT
                    'posTickets.CustomerID' AS source,
                    c.name AS column_name,
                    ty.name AS data_type,
                    c.max_length,
                    c.precision,
                    c.scale
                FROM sys.columns c
                INNER JOIN sys.tables t
                    ON t.object_id = c.object_id
                INNER JOIN sys.types ty
                    ON ty.user_type_id = c.user_type_id
                WHERE
                    t.name = 'posTickets'
                    AND c.name = 'CustomerID';
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
     * 2) Indexes on Cards.ID
     */
    await timed(
        "2. INDEXES Cards.ID",
        async () => {
            const result = await pool.request().query(`
                SELECT
                    i.name AS index_name,
                    i.type_desc,
                    i.is_unique,
                    i.is_primary_key,
                    i.is_disabled,
                    ic.key_ordinal,
                    c.name AS column_name
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic
                    ON ic.object_id = i.object_id
                    AND ic.index_id = i.index_id
                INNER JOIN sys.columns c
                    ON c.object_id = ic.object_id
                    AND c.column_id = ic.column_id
                INNER JOIN sys.tables t
                    ON t.object_id = i.object_id
                WHERE
                    t.name = 'Cards'
                    AND c.name = 'ID'
                ORDER BY
                    i.name,
                    ic.key_ordinal;
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
     * 3) Duplicate Cards.ID
     */
    await timed(
        "3. DUPLICATE Cards.ID",
        async () => {
            const result = await pool.request().query(`
                SELECT TOP 20
                    ID,
                    COUNT_BIG(*) AS duplicate_count
                FROM Cards
                WHERE ID IS NOT NULL
                GROUP BY ID
                HAVING COUNT_BIG(*) > 1
                ORDER BY
                    COUNT_BIG(*) DESC;
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
     * 4) Cards total
     */
    await timed(
        "4. Cards total rows",
        async () => {
            const result = await pool.request().query(`
                SELECT
                    COUNT_BIG(*) AS cards_rows,
                    COUNT_BIG(ID) AS cards_nonnull_ids,
                    COUNT(DISTINCT ID) AS cards_distinct_ids
                FROM Cards;
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
     * 5) Items join baseline
     */
    await timed(
        "5. JOIN posTickets + posItems + Items",
        async () => {
            const result = await pool
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
                        COUNT_BIG(*) AS row_count
                    FROM posTickets t
                    INNER JOIN posItems pi
                        ON pi.TicketID = t.ID
                    LEFT JOIN Items i
                        ON i.ID = pi.ItemID
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
     * 6) Cards join ONLY
     */
    await timed(
        "6. JOIN posTickets + posItems + Cards",
        async () => {
            const result = await pool
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
                        COUNT_BIG(*) AS joined_rows
                    FROM posTickets t
                    INNER JOIN posItems pi
                        ON pi.TicketID = t.ID
                    LEFT JOIN Cards c
                        ON c.ID = t.CustomerID
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
}


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );

    console.log(
        "============================================================"
    );
    console.log(
        "CARDS JOIN DIAGNOSTIC"
    );
    console.log(
        `${FROM_DATE} -> 2026-09-17`
    );
    console.log(
        "============================================================"
    );


    const savedConnections =
        getAllSavedConnections();

    /*
     * Diagnostic only.
     */
    for (const branch of savedConnections) {
        branch.password = "123";
    }


    for (const branchId of TEST_BRANCH_IDS) {

        const branch =
            savedConnections.find(
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
        } catch (error) {
            console.error(
                `[BRANCH FAILED] ${branchId}`,
                error?.stack || error
            );
        }
    }


    try {
        await closeAllConnections();
    } catch {}


    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "DIAGNOSTIC FINISHED"
    );
    console.log(
        "============================================================"
    );

    app.quit();
}


main().catch(async error => {

    console.error(
        error?.stack || error
    );

    try {
        await closeAllConnections();
    } catch {}

    app.quit();
});