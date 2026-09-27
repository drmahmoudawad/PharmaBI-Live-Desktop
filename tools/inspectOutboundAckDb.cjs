const Database = require("better-sqlite3");

const dbPath =
    "C:/Users/SHIKO/AppData/Roaming/pharmabi-live/pharmabi-local.db";

const db =
    new Database(dbPath, {
        readonly: true
    });

console.log("");
console.log("===== LATEST OUTBOUND MESSAGES =====");

const rows =
    db.prepare(`
        SELECT
            id,
            direction,
            recipient_phone,
            status,
            provider_message_id,
            created_at,
            sent_at,
            delivered_at,
            read_at
        FROM crm_whatsapp_messages
        WHERE direction = 'OUTBOUND'
        ORDER BY id DESC
        LIMIT 20
    `).all();

for (const row of rows) {
    console.log(row);
}

console.log("");
console.log("===== LATEST PROVIDER IDS =====");

const ids =
    db.prepare(`
        SELECT
            id,
            provider_message_id,
            recipient_phone,
            status
        FROM crm_whatsapp_messages
        WHERE provider_message_id IS NOT NULL
          AND provider_message_id <> ''
        ORDER BY id DESC
        LIMIT 20
    `).all();

for (const row of ids) {
    console.log(row);
}

db.close();
