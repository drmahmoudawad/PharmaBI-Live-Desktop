import Database from "better-sqlite3";

const path = "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db";
const db = new Database(path, { readonly: true });

const tables = [
  "crm_customer_profiles",
  "crm_rfm_customer_scores",
  "crm_campaign_targets",
  "sales_history",
  "crm_contacts"
];

for (const table of tables) {
  console.log("\n==================================================");
  console.log("TABLE:", table);

  try {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
    console.log("COLUMNS:", cols.map(x => x.name).join(", "));

    const names = cols.map(x => x.name);

    const conditions = [];
    const params = [];

    if (names.includes("customer_id")) {
      conditions.push(`CAST(customer_id AS TEXT) = ?`);
      params.push("5615");
    }

    if (names.includes("customer_code")) {
      conditions.push(`CAST(customer_code AS TEXT) = ?`);
      params.push("5615");
    }

    if (names.includes("customer_name")) {
      conditions.push(`TRIM(customer_name) = ?`);
      params.push("ام مروان");
    }

    if (conditions.length) {
      const sql = `SELECT * FROM "${table}" WHERE ${conditions.join(" OR ")} LIMIT 10`;
      const rows = db.prepare(sql).all(...params);

      console.log("MATCH COUNT:", rows.length);

      if (rows.length) {
        for (const row of rows) {
          console.log(JSON.stringify(row, null, 2));
        }
      }
    }
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

db.close();
