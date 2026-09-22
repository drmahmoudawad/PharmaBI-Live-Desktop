const Database = require("better-sqlite3");
const fs = require("fs");

const DEV =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi-local.db";

const LIVE =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db";

const TABLES = [
    "master_items",
    "master_item_branch_map",
    "master_item_aliases",
    "master_item_review"
];


if (!fs.existsSync(DEV)) {
    throw new Error(`DEV DB not found: ${DEV}`);
}

if (!fs.existsSync(LIVE)) {
    throw new Error(`LIVE DB not found: ${LIVE}`);
}


const dev =
    new Database(
        DEV,
        {
            readonly: true,
            fileMustExist: true
        }
    );


const live =
    new Database(
        LIVE,
        {
            readonly: false,
            fileMustExist: true
        }
    );


try {

    live.pragma("foreign_keys = ON");
    live.pragma("busy_timeout = 120000");


    console.log("");
    console.log("==============================================");
    console.log("MASTER ITEM DEV -> LIVE TRANSFER");
    console.log("==============================================");
    console.log("");


    // -----------------------------------------------------
    // PRECHECK
    // -----------------------------------------------------

    for (const table of TABLES) {

        const devExists =
            dev.prepare(`
                SELECT COUNT(*) AS count
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
            `).get(table).count;


        if (!devExists) {
            throw new Error(
                `DEV table missing: ${table}`
            );
        }


        const liveExists =
            live.prepare(`
                SELECT COUNT(*) AS count
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
            `).get(table).count;


        if (liveExists) {
            throw new Error(
                `LIVE table already exists: ${table}. Transfer aborted.`
            );
        }

    }


    console.log("Precheck: OK");


    // -----------------------------------------------------
    // GET EXACT TABLE SCHEMA
    // -----------------------------------------------------

    const tableSchemas =
        TABLES.map(
            table => {

                const row =
                    dev.prepare(`
                        SELECT sql
                        FROM sqlite_master
                        WHERE type = 'table'
                          AND name = ?
                        LIMIT 1
                    `).get(table);


                if (
                    !row?.sql
                ) {

                    throw new Error(
                        `Could not read schema for ${table}`
                    );

                }


                return {
                    table,
                    sql: row.sql
                };

            }
        );


    // -----------------------------------------------------
    // GET INDEX SCHEMAS
    // -----------------------------------------------------

    const indexRows =
        dev.prepare(`
            SELECT
                name,
                sql
            FROM sqlite_master
            WHERE type = 'index'
              AND sql IS NOT NULL
              AND (
                    tbl_name IN (
                        'master_items',
                        'master_item_branch_map',
                        'master_item_aliases',
                        'master_item_review'
                    )
              )
            ORDER BY name
        `).all();


    // -----------------------------------------------------
    // CREATE TABLES IN FK-SAFE ORDER
    // -----------------------------------------------------

    const createTables =
        live.transaction(
            () => {

                for (
                    const item
                    of tableSchemas
                ) {

                    console.log(
                        `Creating table: ${item.table}`
                    );

                    live.exec(
                        item.sql
                    );

                }


                // -------------------------------------------------
                // COPY DATA
                // -------------------------------------------------

                for (
                    const table
                    of TABLES
                ) {

                    const count =
                        dev.prepare(
                            `SELECT COUNT(*) AS count FROM ${table}`
                        ).get().count;


                    console.log(
                        `Copying ${table}: ${Number(count).toLocaleString("en-US")} rows`
                    );


                    live.exec(`
                        INSERT INTO main.${table}
                        SELECT *
                        FROM dev.${table}
                    `);

                }


                // -------------------------------------------------
                // CREATE INDEXES
                // -------------------------------------------------

                for (
                    const index
                    of indexRows
                ) {

                    console.log(
                        `Creating index: ${index.name}`
                    );

                    live.exec(
                        index.sql
                    );

                }

            }
        );


    // -----------------------------------------------------
    // ATTACH DEV
    // -----------------------------------------------------

    live.prepare(
        "ATTACH DATABASE ? AS dev"
    ).run(
        DEV
    );


    try {

        createTables();

    }
    finally {

        live.exec(
            "DETACH DATABASE dev"
        );

    }


    // -----------------------------------------------------
    // VERIFY COUNTS
    // -----------------------------------------------------

    console.log("");
    console.log("VERIFYING...");


    const verification = {};


    for (
        const table
        of TABLES
    ) {

        const devCount =
            dev.prepare(
                `SELECT COUNT(*) AS count FROM ${table}`
            ).get().count;


        const liveCount =
            live.prepare(
                `SELECT COUNT(*) AS count FROM ${table}`
            ).get().count;


        verification[table] = {

            dev:
                Number(
                    devCount
                ),

            live:
                Number(
                    liveCount
                ),

            match:
                Number(devCount) ===
                Number(liveCount)

        };

    }


    console.log(
        JSON.stringify(
            verification,
            null,
            2
        )
    );


    const allMatch =
        Object.values(
            verification
        ).every(
            item =>
                item.match
        );


    if (!allMatch) {

        throw new Error(
            "COUNT VERIFICATION FAILED."
        );

    }


    // -----------------------------------------------------
    // VERIFY SAMPLE MASTER
    // -----------------------------------------------------

    const sample =
        live.prepare(`
            SELECT
                id,
                unified_code,
                canonical_name,
                normalized_name
            FROM master_items
            WHERE unified_code = ?
            LIMIT 1
        `).get(
            "PBI-0000041"
        );


    console.log("");
    console.log(
        "SAMPLE MASTER:"
    );
    console.log(
        sample
    );


    // -----------------------------------------------------
    // VERIFY SAMPLE MAPPINGS
    // -----------------------------------------------------

    const sampleMappings =
        live.prepare(`
            SELECT
                master_item_id,
                branch_id,
                branch_item_id,
                branch_item_code,
                branch_item_name
            FROM master_item_branch_map
            WHERE master_item_id = ?
            ORDER BY branch_id
        `).all(
            sample?.id || -1
        );


    console.log("");
    console.log(
        "SAMPLE MAPPINGS:"
    );
    console.table(
        sampleMappings
    );


    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "TRANSFER COMPLETE"
    );
    console.log(
        "=============================================="
    );
    console.log("");


}
catch (error) {

    console.error("");
    console.error(
        "TRANSFER FAILED:"
    );
    console.error(
        error.message
    );
    console.error("");
    
    process.exitCode = 1;

}
finally {

    try {
        dev.close();
    }
    catch {}

    try {
        live.close();
    }
    catch {}

}