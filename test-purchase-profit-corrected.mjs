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

    /*
     * =====================================================
     * 1) PURCHASE INVOICE TOTALS
     *    كل فاتورة تتحسب مرة واحدة فقط
     * =====================================================
     */

    const invoiceResult = await pool.request().query(`
        SELECT
            COUNT(*) AS TotalInvoices,

            SUM(
                CASE
                    WHEN SalesReturn = 1
                    THEN COALESCE(total, 0)
                    ELSE 0
                END
            ) AS PurchaseTotal,

            SUM(
                CASE
                    WHEN SalesReturn = 2
                    THEN ABS(COALESCE(total, 0))
                    ELSE 0
                END
            ) AS ReturnTotal,

            SUM(
                CASE
                    WHEN SalesReturn = 1
                    THEN COALESCE(TotalTaxless, total, 0)
                    ELSE 0
                END
            ) AS PurchaseTaxlessTotal,

            SUM(
                CASE
                    WHEN SalesReturn = 2
                    THEN ABS(COALESCE(TotalTaxless, total, 0))
                    ELSE 0
                END
            ) AS ReturnTaxlessTotal

        FROM PurchaseInvoices;
    `);

    /*
     * =====================================================
     * 2) GROSS PURCHASE VALUE
     *    sprice × الكمية
     *
     *    الكمية بالباك:
     *    packs + units / Parts
     * =====================================================
     */

    const itemResult = await pool.request().query(`
        SELECT

            SUM(
                CASE
                    WHEN pi.SalesReturn = 1
                    AND p.item_id <> 0
                    THEN
                        COALESCE(p.sprice, 0)
                        *
                        (
                            COALESCE(p.packs, 0)
                            +
                            (
                                COALESCE(p.units, 0)
                                /
                                CASE
                                    WHEN COALESCE(i.Parts, 0) > 0
                                    THEN i.Parts
                                    ELSE 1
                                END
                            )
                        )
                    ELSE 0
                END
            ) AS GrossPurchase,

            SUM(
                CASE
                    WHEN pi.SalesReturn = 2
                    AND p.item_id <> 0
                    THEN
                        COALESCE(p.sprice, 0)
                        *
                        (
                            COALESCE(p.packs, 0)
                            +
                            (
                                COALESCE(p.units, 0)
                                /
                                CASE
                                    WHEN COALESCE(i.Parts, 0) > 0
                                    THEN i.Parts
                                    ELSE 1
                                END
                            )
                        )
                    ELSE 0
                END
            ) AS GrossReturns,

            COUNT(*) AS PurchaseItemRows

        FROM PurchaseItems p
        INNER JOIN PurchaseInvoices pi
            ON pi.ID = p.inv_id
        LEFT JOIN Items i
            ON i.ID = p.item_id;
    `);

    const inv = invoiceResult.recordset[0] || {};
    const itm = itemResult.recordset[0] || {};

    const purchaseTotal = Number(inv.PurchaseTotal || 0);
    const returnTotal = Number(inv.ReturnTotal || 0);

    const purchaseTaxless = Number(inv.PurchaseTaxlessTotal || 0);
    const returnTaxless = Number(inv.ReturnTaxlessTotal || 0);

    const grossPurchase = Number(itm.GrossPurchase || 0);
    const grossReturns = Number(itm.GrossReturns || 0);

    const netPurchaseCost =
        purchaseTotal - returnTotal;

    const netTaxlessCost =
        purchaseTaxless - returnTaxless;

    const netGrossPurchase =
        grossPurchase - grossReturns;

    const purchaseProfit =
        netGrossPurchase - netPurchaseCost;

    const purchaseProfitTaxless =
        netGrossPurchase - netTaxlessCost;

    console.log("\n=== CORRECTED PURCHASE PROFIT TEST ===");

    console.table([{
        TotalInvoices: Number(inv.TotalInvoices || 0),

        PurchaseTotal: purchaseTotal,
        ReturnTotal: returnTotal,
        NetPurchaseCost: netPurchaseCost,

        PurchaseTaxlessTotal: purchaseTaxless,
        ReturnTaxlessTotal: returnTaxless,
        NetTaxlessCost: netTaxlessCost,

        GrossPurchaseBeforeDiscount: grossPurchase,
        GrossReturnsBeforeDiscount: grossReturns,
        NetGrossPurchaseBeforeDiscount: netGrossPurchase,

        PurchaseProfit: purchaseProfit,
        PurchaseProfitTaxless: purchaseProfitTaxless,

        PurchaseItemRows: Number(itm.PurchaseItemRows || 0)
    }]);

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
