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


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );


    const connections =
        getAllSavedConnections();


    // Diagnostic/maintenance only.
    // The known SQL password is used for this operation.
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
            "Branch 2 not found."
        );
    }


    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "APPLY CARDS.ID UNIQUE INDEX - BRANCH 2"
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


    /*
     * 1) Verify Cards.Id uniqueness.
     */
    const duplicateCheck =
        await pool
            .request()
            .query(`
                SELECT
                    COUNT_BIG(*) AS total_rows,
                    COUNT_BIG(Id) AS nonnull_ids,
                    COUNT(DISTINCT Id) AS distinct_ids
                FROM dbo.Cards;

                SELECT TOP 10
                    Id,
                    COUNT_BIG(*) AS duplicate_count
                FROM dbo.Cards
                WHERE Id IS NOT NULL
                GROUP BY Id
                HAVING COUNT_BIG(*) > 1;
            `);


    const stats =
        duplicateCheck?.recordsets?.[0]?.[0] || {};


    const duplicates =
        duplicateCheck?.recordsets?.[1] || [];


    console.log(
        `[CHECK] total_rows=${stats.total_rows}`
    );

    console.log(
        `[CHECK] nonnull_ids=${stats.nonnull_ids}`
    );

    console.log(
        `[CHECK] distinct_ids=${stats.distinct_ids}`
    );

    console.log(
        `[CHECK] duplicate_groups=${duplicates.length}`
    );


    if (
        duplicates.length > 0
    ) {
        throw new Error(
            "Cards.Id contains duplicates. Index NOT created."
        );
    }


    /*
     * 2) Check whether an index already exists.
     */
    const existing =
        await pool
            .request()
            .query(`
                SELECT
                    i.name,
                    i.type_desc,
                    i.is_unique,
                    i.is_primary_key,
                    i.is_unique_constraint
                FROM sys.indexes i
                INNER JOIN sys.tables t
                    ON t.object_id = i.object_id
                WHERE
                    t.name = 'Cards'
                    AND i.index_id > 0
                    AND EXISTS (
                        SELECT 1
                        FROM sys.index_columns ic
                        INNER JOIN sys.columns c
                            ON c.object_id = ic.object_id
                            AND c.column_id = ic.column_id
                        WHERE
                            ic.object_id = i.object_id
                            AND ic.index_id = i.index_id
                            AND c.name = 'Id'
                            AND ic.key_ordinal = 1
                    );
            `);


    if (
        existing.recordset.length > 0
    ) {

        console.log(
            "[CHECK] An index already exists on Cards.Id:"
        );

        console.log(
            JSON.stringify(
                existing.recordset,
                null,
                2
            )
        );

        console.log(
            "[DONE] No change was required."
        );

        await closeAllConnections();
        app.quit();

        return;
    }


    /*
     * 3) Create permanent unique index.
     */
    console.log(
        "[INDEX] Creating UX_Cards_Id..."
    );


    const started =
        Date.now();


    await pool
        .request()
        .query(`
            CREATE UNIQUE NONCLUSTERED INDEX
                UX_Cards_Id
            ON dbo.Cards (
                Id
            );
        `);


    console.log(
        `[INDEX] Created in ${Date.now() - started} ms`
    );


    /*
     * 4) Verify.
     */
    const verify =
        await pool
            .request()
            .query(`
                SELECT
                    i.name AS index_name,
                    i.type_desc,
                    i.is_unique,
                    i.is_primary_key,
                    i.is_unique_constraint
                FROM sys.indexes i
                INNER JOIN sys.tables t
                    ON t.object_id = i.object_id
                WHERE
                    t.name = 'Cards'
                    AND i.name = 'UX_Cards_Id';
            `);


    console.log(
        "[VERIFY]"
    );

    console.log(
        JSON.stringify(
            verify.recordset,
            null,
            2
        )
    );


    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "SUCCESS: Cards.Id unique index is now permanent on Branch 2."
    );
    console.log(
        "============================================================"
    );


    await closeAllConnections();
    app.quit();
}


main().catch(
    async error => {

        console.error(
            "[FAILED]",
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