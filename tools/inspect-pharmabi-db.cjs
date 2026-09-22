const Database = require("better-sqlite3");

const dbPath =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi.db";

const db =
    new Database(
        dbPath,
        {
            readonly: true
        }
    );

console.log("");
console.log("===== SQLITE TABLES =====");

console.table(
    db.prepare(`
        SELECT
            name,
            type
        FROM sqlite_master
        WHERE type IN ('table','view')
        ORDER BY name
    `).all()
);

const tables =
    db.prepare(`
        SELECT
            name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

for (
    const table
    of tables
) {

    const safeName =
        String(table.name)
            .replace(/]/g, "]]");

    const columns =
        db.prepare(
            `PRAGMA table_info([${safeName}])`
        ).all();

    console.log("");
    console.log(`===== ${table.name} =====`);

    console.table(
        columns.map(
            column => ({
                cid: column.cid,
                name: column.name,
                type: column.type,
                notnull: column.notnull,
                pk: column.pk
            })
        )
    );
}

db.close();

console.log("");
console.log("===== DONE =====");