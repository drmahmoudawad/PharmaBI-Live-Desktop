import sql from "mssql";
import { app } from "electron";

const config = {
    server: "26.203.10.111",
    port: 59123,
    database: "pfx1",
    user: "sa",
    password: "123",
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    connectionTimeout: 30000,
    requestTimeout: 120000
};

async function main() {
    const pool = await sql.connect(config);

    const result = await pool.request().query(`
        SELECT
            COUNT(*) AS TotalRows,
            SUM(CASE WHEN p.item_id = 0 THEN 1 ELSE 0 END) AS ItemIdZero,
            SUM(CASE WHEN i.ID IS NULL THEN 1 ELSE 0 END) AS MissingItem,
            SUM(CASE WHEN ISNULL(i.Parts,0) <= 0 THEN 1 ELSE 0 END) AS InvalidParts,
            SUM(CASE WHEN p.CostPrice IS NULL THEN 1 ELSE 0 END) AS MissingCost,
            SUM(CASE WHEN p.sprice IS NULL THEN 1 ELSE 0 END) AS MissingSPrice
        FROM PurchaseItems p
        LEFT JOIN Items i
            ON i.ID = p.item_id;
    `);

    console.table(result.recordset);

    await pool.close();
}

app.whenReady()
    .then(main)
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => setTimeout(() => app.quit(), 500));
