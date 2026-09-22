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

    console.log("\n=== MISSING COST SUMMARY ===");

    const summary = await pool.request().query(`
        SELECT
            COUNT(*) AS MissingCostRows,

            SUM(CASE WHEN ISNULL(p.packs,0) > 0 THEN 1 ELSE 0 END) AS WithPacks,
            SUM(CASE WHEN ISNULL(p.units,0) > 0 THEN 1 ELSE 0 END) AS WithUnits,
            SUM(CASE WHEN ISNULL(p.bonus,0) > 0 THEN 1 ELSE 0 END) AS WithBonus,

            SUM(CASE WHEN ISNULL(pi.SalesReturn,0) = 1 THEN 1 ELSE 0 END) AS SalesReturn1,
            SUM(CASE WHEN ISNULL(pi.SalesReturn,0) = 2 THEN 1 ELSE 0 END) AS SalesReturn2,

            SUM(CASE WHEN pi.TotalTaxless IS NOT NULL THEN 1 ELSE 0 END) AS HasTaxless,
            SUM(CASE WHEN pi.total IS NOT NULL THEN 1 ELSE 0 END) AS HasTotal

        FROM PurchaseItems p
        INNER JOIN PurchaseInvoices pi
            ON pi.ID = p.inv_id

        WHERE p.CostPrice IS NULL;
    `);

    console.table(summary.recordset);

    console.log("\n=== MISSING COST SAMPLE ===");

    const sample = await pool.request().query(`
        SELECT TOP 80
            pi.ID AS InvoiceID,
            pi.inv_code,
            pi.inv_date,
            pi.InvoiceType,
            pi.SalesReturn,

            pi.total AS InvoiceTotal,
            pi.Discount AS InvoiceDiscount,
            pi.extradiscount AS InvoiceExtraDiscount,
            pi.extracharge AS InvoiceExtraCharge,
            pi.TotalTaxless,
            pi.VatValue,

            p.ID AS PurchaseItemID,
            p.item_id,
            p.packs,
            p.units,
            p.bonus,

            i.Parts,

            p.sprice,
            p.trade_discount,
            p.ExtraDiscount,
            p.CostPrice,
            p.RowValue

        FROM PurchaseItems p
        INNER JOIN PurchaseInvoices pi
            ON pi.ID = p.inv_id
        LEFT JOIN Items i
            ON i.ID = p.item_id

        WHERE p.CostPrice IS NULL

        ORDER BY
            pi.ID DESC,
            p.ID DESC;
    `);

    console.table(sample.recordset);

    console.log("\n=== MISSING COST BY QUANTITY TYPE ===");

    const groups = await pool.request().query(`
        SELECT
            CASE
                WHEN ISNULL(p.packs,0) > 0 AND ISNULL(p.units,0) > 0 THEN 'packs+units'
                WHEN ISNULL(p.packs,0) > 0 THEN 'packs only'
                WHEN ISNULL(p.units,0) > 0 THEN 'units only'
                WHEN ISNULL(p.bonus,0) > 0 THEN 'bonus only'
                ELSE 'zero quantity'
            END AS QuantityType,
            COUNT(*) AS Rows
        FROM PurchaseItems p
        WHERE p.CostPrice IS NULL
        GROUP BY
            CASE
                WHEN ISNULL(p.packs,0) > 0 AND ISNULL(p.units,0) > 0 THEN 'packs+units'
                WHEN ISNULL(p.packs,0) > 0 THEN 'packs only'
                WHEN ISNULL(p.units,0) > 0 THEN 'units only'
                WHEN ISNULL(p.bonus,0) > 0 THEN 'bonus only'
                ELSE 'zero quantity'
            END
        ORDER BY Rows DESC;
    `);

    console.table(groups.recordset);

    await pool.close();
}

app.whenReady()
    .then(main)
    .catch(error => {
        console.error("\n=== ERROR ===");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => setTimeout(() => app.quit(), 500));
