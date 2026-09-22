import electron from "electron";
import sql from "mssql";

import {
    getAllSavedConnections
} from "./electron/settings/connectionStore.js";

const { app } = electron;

await app.whenReady();

const connections =
    await getAllSavedConnections();

console.log("");
console.log("FOUND CONNECTIONS:", connections.length);

for (const c of connections) {

    console.log("");
    console.log("====================================================");
    console.log(
        `PHARMABI BRANCH ID: ${c.branchId}`
    );
    console.log(
        `PHARMABI CURRENT NAME: ${c.branchName}`
    );
    console.log(
        `SERVER: ${c.server}:${c.port}`
    );
    console.log(
        `DATABASE: ${c.database}`
    );
    console.log("====================================================");

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
            connectionTimeout: 20000,
            requestTimeout: 60000
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
        console.log("CANDIDATE TABLE/COLUMNS:");

        for (const row of result.recordset) {
            console.log(
                `${row.TABLE_SCHEMA}.${row.TABLE_NAME}.${row.COLUMN_NAME} [${row.DATA_TYPE}]`
            );
        }

        /*
         * Check likely tables that could contain the
         * official PharmaFly branch/store name.
         */

        const tableResult =
            await pool.request().query(`
                SELECT
                    TABLE_SCHEMA,
                    TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE
                    TABLE_TYPE = 'BASE TABLE'
                    AND (
                        TABLE_NAME LIKE '%Branch%'
                        OR TABLE_NAME LIKE '%Store%'
                        OR TABLE_NAME LIKE '%Company%'
                    )
                ORDER BY
                    TABLE_NAME;
            `);

        console.log("");
        console.log("CANDIDATE TABLES:");

        for (const row of tableResult.recordset) {
            console.log(
                `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`
            );
        }

    }
    catch (error) {

        console.log(
            "ERROR:",
            error?.message || error
        );

    }
    finally {

        try {
            if (pool) {
                await pool.close();
            }
        }
        catch {}

    }
}

await app.quit();