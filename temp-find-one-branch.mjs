import electron from "electron";
import sql from "mssql";

import {
    getBranchConnection
} from "./electron/settings/connectionStore.js";

const { app } = electron;

await app.whenReady();

const c = await getBranchConnection(1);

if (!c) {
    console.log("BRANCH_1_NOT_FOUND");
    await app.quit();
    process.exit(1);
}

console.log("");
console.log("==========================================");
console.log("BRANCH ID:", c.branchId);
console.log("CURRENT NAME:", c.branchName);
console.log("SERVER:", c.server);
console.log("PORT:", c.port);
console.log("DATABASE:", c.database);
console.log("==========================================");

let pool = null;

try {

    pool = await sql.connect({
        server: c.server,
        port: Number(c.port || 1433),
        database: c.database,
        user: c.user,
        password: c.password,
        options: {
            encrypt: false,
            trustServerCertificate: true
        },
        connectionTimeout: 15000,
        requestTimeout: 30000
    });

    const result =
        await pool.request().query(`
            SELECT
                TABLE_SCHEMA,
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE
                COLUMN_NAME LIKE '%Branch%'
                OR COLUMN_NAME LIKE '%Store%'
                OR COLUMN_NAME LIKE '%Company%'
                OR COLUMN_NAME LIKE '%Name%'
            ORDER BY
                TABLE_NAME,
                ORDINAL_POSITION;
        `);

    console.log("");
    console.log("=== CANDIDATE COLUMNS ===");

    for (const row of result.recordset) {
        console.log(
            `${row.TABLE_SCHEMA}.${row.TABLE_NAME}.${row.COLUMN_NAME} [${row.DATA_TYPE}]`
        );
    }

}
catch (error) {

    console.log("");
    console.log("ERROR:", error?.message || error);

}
finally {

    try {
        if (pool) {
            await pool.close();
        }
    }
    catch {}

    await app.quit();
}