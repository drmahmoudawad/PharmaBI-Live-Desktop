const Database = require("better-sqlite3");

const dev =
    new Database(
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi-local.db",
        {
            readonly: true,
            fileMustExist: true
        }
    );

const live =
    new Database(
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
        {
            readonly: true,
            fileMustExist: true
        }
    );


function inspect(
    name,
    db
) {

    console.log("");
    console.log(`===== ${name} =====`);

    const tables =
        db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name IN (
                  'master_items',
                  'master_item_branch_map',
                  'master_item_aliases',
                  'master_item_review'
              )
            ORDER BY name
        `).all();

    console.table(tables);


    for (const table of [
        "master_items",
        "master_item_branch_map",
        "master_item_aliases",
        "master_item_review"
    ]) {

        const exists =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM sqlite_master
                WHERE type = 'table'
                  AND name = ?
            `).get(table).count;

        if (!exists) {
            console.log(`${table}: TABLE NOT FOUND`);
            continue;
        }

        const count =
            db.prepare(
                `SELECT COUNT(*) AS count FROM ${table}`
            ).get().count;

        console.log(
            `${table}: ${Number(count).toLocaleString("en-US")}`
        );

    }

}


inspect(
    "DEV",
    dev
);

inspect(
    "LIVE",
    live
);


dev.close();
live.close();