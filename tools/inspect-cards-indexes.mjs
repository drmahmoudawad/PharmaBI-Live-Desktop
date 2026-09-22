import { app } from "electron";
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

    const connections = getAllSavedConnections();

    for (const branch of connections) {
        branch.password = "123";
    }

    const branch = connections.find(
        item => Number(item.branchId) === BRANCH_ID
    );

    if (!branch) {
        throw new Error("Branch 2 not found.");
    }

    const pool = await getBranchPool(
        BRANCH_ID,
        branch
    );

    const result = await pool.request().query(`
        SELECT
            i.name AS index_name,
            i.type_desc,
            i.is_unique,
            i.is_primary_key,
            i.is_unique_constraint,
            i.is_disabled,
            COL_NAME(ic.object_id, ic.column_id) AS column_name,
            ic.key_ordinal
        FROM sys.indexes i
        LEFT JOIN sys.index_columns ic
            ON ic.object_id = i.object_id
            AND ic.index_id = i.index_id
        INNER JOIN sys.tables t
            ON t.object_id = i.object_id
        WHERE
            t.name = 'Cards'
            AND i.index_id > 0
        ORDER BY
            i.index_id,
            ic.key_ordinal;
    `);

    console.log("");
    console.log("========== Branch 2 Cards indexes ==========");

    for (const row of result.recordset) {
        console.log(
            JSON.stringify(row)
        );
    }

    console.log("============================================");

    await closeAllConnections();
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
    process.exitCode = 1;
});