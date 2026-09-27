const Database = require("better-sqlite3");
const dbPath = process.env.APPDATA + "\\pharmabi-live\\pharmabi-local.db";

const db = new Database(dbPath, {
    readonly: true
});

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
`).all();

for (const row of tables) {
    if (!/employee|staff|user|seller|worker|sales/i.test(row.name)) {
        continue;
    }

    console.log("\n==============================");
    console.log("TABLE:", row.name);
    console.log("==============================");

    const safeName =
        row.name.replace(/"/g, '""');

    const columns =
        db.prepare(
            `PRAGMA table_info("${safeName}")`
        ).all();

    console.log("COLUMNS:");
    for (const column of columns) {
        console.log(
            column.cid +
            " | " +
            column.name +
            " | " +
            column.type
        );
    }

    try {
        const sample =
            db.prepare(
                `SELECT * FROM "${safeName}" LIMIT 5`
            ).all();

        console.log("SAMPLE:");
        console.log(
            JSON.stringify(
                sample,
                null,
                2
            )
        );
    }
    catch (e) {
        console.log(
            "SAMPLE ERROR:",
            e.message
        );
    }
}

db.close();
