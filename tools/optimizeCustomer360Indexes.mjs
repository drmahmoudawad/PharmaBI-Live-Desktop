import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const roots = [
    "C:/Users/SHIKO/AppData/Roaming/pharmabi-dev",
    "C:/Users/SHIKO/AppData/Roaming/pharmabi-live",
    "C:/Users/SHIKO/Documents/PharmaBI Data",
    "C:/Users/SHIKO/Documents/PharmaBI Production Data",
    "D:/PharmaBI-Live-Desktop"
];

function collectDbFiles(root) {
    const result = [];

    if (!fs.existsSync(root)) {
        return result;
    }

    function walk(current, depth = 0) {
        if (depth > 4) {
            return;
        }

        let entries = [];

        try {
            entries = fs.readdirSync(
                current,
                {
                    withFileTypes: true
                }
            );
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath =
                path.join(
                    current,
                    entry.name
                );

            if (entry.isDirectory()) {
                walk(
                    fullPath,
                    depth + 1
                );
                continue;
            }

            if (
                entry.isFile() &&
                entry.name.toLowerCase().endsWith(".db")
            ) {
                result.push(fullPath);
            }
        }
    }

    walk(root);

    return result;
}

function getTables(db) {
    return db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all().map(
        row => String(row.name)
    );
}

function getColumns(db, tableName) {
    return db.prepare(
        `PRAGMA table_info("${tableName.replace(/"/g, '""')}")`
    ).all().map(
        row => String(row.name).toLowerCase()
    );
}

function hasAll(columns, required) {
    return required.every(
        column =>
            columns.includes(
                String(column).toLowerCase()
            )
    );
}

function createIndex(
    db,
    tableName,
    indexName,
    columns
) {
    const sql = `
        CREATE INDEX IF NOT EXISTS
            "${indexName}"
        ON "${tableName}"
        (
            ${columns.map(
                column => `"${column}"`
            ).join(", ")}
        )
    `;

    db.exec(sql);

    console.log(
        `INDEX READY  ${tableName} -> ${indexName}`
    );
}

console.log(
    "=== CUSTOMER 360 INDEX OPTIMIZATION ==="
);

const allFiles = [
    ...new Set(
        roots.flatMap(
            collectDbFiles
        )
    )
];

console.log(
    `DB files discovered: ${allFiles.length}`
);

let optimizedDatabases = 0;

for (const file of allFiles) {

    let db = null;

    try {
        db = new Database(
            file,
            {
                readonly: false,
                fileMustExist: true
            }
        );

        const tables =
            getTables(db);

        const hasSalesHistory =
            tables.includes(
                "sales_history"
            );

        const hasCustomerProfile =
            tables.includes(
                "crm_customer_profiles"
            );

        if (
            !hasSalesHistory &&
            !hasCustomerProfile
        ) {
            db.close();
            continue;
        }

        console.log("");
        console.log(
            `DATABASE: ${file}`
        );

        if (hasSalesHistory) {

            const columns =
                getColumns(
                    db,
                    "sales_history"
                );

            if (
                hasAll(
                    columns,
                    [
                        "branch_id",
                        "customer_id",
                        "ticket_id"
                    ]
                )
            ) {
                createIndex(
                    db,
                    "sales_history",
                    "idx_sales_history_branch_customer_ticket",
                    [
                        "branch_id",
                        "customer_id",
                        "ticket_id"
                    ]
                );
            }

            if (
                hasAll(
                    columns,
                    [
                        "branch_id",
                        "customer_id",
                        "date"
                    ]
                )
            ) {
                createIndex(
                    db,
                    "sales_history",
                    "idx_sales_history_branch_customer_date",
                    [
                        "branch_id",
                        "customer_id",
                        "date"
                    ]
                );
            }

            if (
                hasAll(
                    columns,
                    [
                        "branch_id",
                        "customer_id",
                        "transaction_type",
                        "ticket_id"
                    ]
                )
            ) {
                createIndex(
                    db,
                    "sales_history",
                    "idx_sales_history_branch_customer_type_ticket",
                    [
                        "branch_id",
                        "customer_id",
                        "transaction_type",
                        "ticket_id"
                    ]
                );
            }
        }

        if (hasCustomerProfile) {

            const columns =
                getColumns(
                    db,
                    "crm_customer_profiles"
                );

            if (
                hasAll(
                    columns,
                    [
                        "branch_id",
                        "customer_id"
                    ]
                )
            ) {
                createIndex(
                    db,
                    "crm_customer_profiles",
                    "idx_crm_customer_profiles_branch_customer",
                    [
                        "branch_id",
                        "customer_id"
                    ]
                );
            }
        }

        db.pragma("ANALYZE");

        optimizedDatabases += 1;

        db.close();

    } catch (error) {

        if (db) {
            try {
                db.close();
            } catch {
                // ignore
            }
        }

        console.log(
            `SKIPPED: ${file}`
        );

        console.log(
            String(
                error?.message ||
                error
            )
        );
    }
}

console.log("");
console.log(
    `Optimization complete. Databases optimized: ${optimizedDatabases}`
);