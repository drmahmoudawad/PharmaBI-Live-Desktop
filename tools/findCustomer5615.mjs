import Database from "better-sqlite3";

const dbs = [
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi-local.db",
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi.db",
  "C:\\Users\\SHIKO\\AppData\\Roaming\\PharmaBI-Production\\pharmabi.db",
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi\\pharmabi.db",
  "D:\\PharmaBI-Live-Desktop\\installer-seed\\pharmabi-local.db"
];

for (const path of dbs) {
  try {
    const db = new Database(path, { readonly: true });

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map(x => x.name);

    const relevant = tables.filter(name =>
      /sales|customer|crm|rfm/i.test(name)
    );

    console.log("\n==================================================");
    console.log("DB:", path);
    console.log("Relevant tables:", relevant.join(", ") || "NONE");

    for (const table of relevant) {
      try {
        const cols = db
          .prepare(`PRAGMA table_info("${table}")`)
          .all()
          .map(x => x.name);

        const customerCols = cols.filter(c =>
          /customer|phone|mobile|rfm|segment|stage|score/i.test(c)
        );

        if (!customerCols.length) continue;

        console.log("TABLE:", table);
        console.log("COLUMNS:", customerCols.join(", "));

        const hasCustomerCode = cols.includes("customer_code");

        if (hasCustomerCode) {
          const rows = db
            .prepare(
              `SELECT * FROM "${table}" WHERE CAST(customer_code AS TEXT) = '5615' LIMIT 5`
            )
            .all();

          if (rows.length) {
            console.log("5615 FOUND:", JSON.stringify(rows, null, 2));
          }
        }
      } catch (e) {
        console.log("TABLE ERROR:", table, "|", e.message);
      }
    }

    db.close();
  } catch (e) {
    console.log("\nDB ERROR:", path, "|", e.message);
  }
}
