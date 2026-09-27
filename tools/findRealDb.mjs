import fs from "fs";
import Database from "better-sqlite3";

const roots = [
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live",
  "C:\\Users\\SHIKO\\Documents\\PharmaBI Data",
  "C:\\Users\\SHIKO\\Documents\\PharmaBI Production Data"
];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;

  for (const name of fs.readdirSync(root)) {
    const p = `${root}\\${name}`;

    let stat;
    try {
      stat = fs.statSync(p);
    } catch {
      continue;
    }

    if (!stat.isFile() || !name.toLowerCase().endsWith(".db")) continue;

    try {
      const db = new Database(p, { readonly: true });

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('branch_sales','branch_customers') ORDER BY name"
        )
        .all()
        .map((row) => row.name);

      if (tables.length > 0) {
        console.log("DB:", p);
        console.log("TABLES:", tables.join(", "));
        console.log("---");
      }

      db.close();
    } catch (error) {
      console.log("SKIP:", p, "|", error.message);
    }
  }
}
