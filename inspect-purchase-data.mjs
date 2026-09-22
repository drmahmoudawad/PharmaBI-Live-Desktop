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

    console.log("\n=== COUNTS ===");

    const counts = await pool.request().query(`
        SELECT
            (SELECT COUNT(*) FROM PurchaseInvoices) AS PurchaseInvoicesCount,
            (SELECT COUNT(*) FROM PurchaseItems) AS PurchaseItemsCount;
    `);

    console.table(counts.recordset);

    console.log("\n=== LATEST PURCHASE ITEMS ===");

    const items = await pool.request().query(`
        SELECT TOP 50
            pi.ID AS InvoiceID,
            pi.inv_code,
            pi.inv_date,
            pi.vendor_id,

            pi.total,
            pi.Discount,
            pi.extradiscount,
            pi.extracharge,
            pi.TotalTaxless,
            pi.VatValue,
            pi.SalesReturn,

            p.ID AS PurchaseItemID,
            p.item_id,
            p.packs,
            p.units,
            p.bonus,
            p.CostPrice,
            p.trade_discount,
            p.ExtraDiscount,
            p.RowValue,
            p.sprice,
            p.Returned

        FROM PurchaseInvoices pi
        INNER JOIN PurchaseItems p
            ON p.inv_id = pi.ID

        ORDER BY
            COALESCE(pi.ztime, pi.inv_date) DESC,
            pi.ID DESC,
            p.ID DESC;
    `);

    console.table(items.recordset);

    console.log("\n=== LATEST INVOICES / RECONCILIATION ===");

    const invoices = await pool.request().query(`
        SELECT TOP 20
            pi.ID AS InvoiceID,
            pi.inv_code,
            pi.inv_date,
            pi.vendor_id,

            pi.total,
            pi.Discount,
            pi.extradiscount,
            pi.extracharge,
            pi.TotalTaxless,
            pi.VatValue,
            pi.SalesReturn,

            COUNT(p.ID) AS Lines,

            COALESCE(SUM(p.RowValue), 0) AS SumRowValue,

            COALESCE(
                SUM(
                    COALESCE(p.CostPrice, 0) *
                    COALESCE(p.packs, 0)
                ),
                0
            ) AS SumCostPacks

        FROM PurchaseInvoices pi
        INNER JOIN PurchaseItems p
            ON p.inv_id = pi.ID

        GROUP BY
            pi.ID,
            pi.inv_code,
            pi.inv_date,
            pi.vendor_id,
            pi.total,
            pi.Discount,
            pi.extradiscount,
            pi.extracharge,
            pi.TotalTaxless,
            pi.VatValue,
            pi.SalesReturn

        ORDER BY
            pi.inv_date DESC,
            pi.ID DESC;
    `);

    console.table(invoices.recordset);

    await pool.close();
}

app.whenReady()
    .then(main)
    .catch(error => {
        console.error("\n=== ERROR ===");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        setTimeout(() => app.quit(), 500);
    });