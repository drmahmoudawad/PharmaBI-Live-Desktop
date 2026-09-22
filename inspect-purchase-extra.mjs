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
        SELECT TOP 50
            pi.ID AS InvoiceID,
            pi.inv_code,
            pi.inv_date,
            p.item_id,
            p.packs,
            p.units,
            p.bonus,
            p.sprice,
            p.trade_discount,
            p.ExtraDiscount,
            p.CostPrice,
            p.Returned
        FROM PurchaseInvoices pi
        INNER JOIN PurchaseItems p
            ON p.inv_id = pi.ID
        WHERE
            ISNULL(p.ExtraDiscount, 0) <> 0
            OR ISNULL(p.units, 0) <> 0
        ORDER BY
            pi.ID DESC,
            p.ID DESC;
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
    .finally(() => {
        setTimeout(() => app.quit(), 500);
    });
