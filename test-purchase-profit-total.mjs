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
            /* عدد الفواتير */
            SUM(CASE WHEN pi.SalesReturn = 1 THEN 1 ELSE 0 END) AS PurchaseInvoices,
            SUM(CASE WHEN pi.SalesReturn = 2 THEN 1 ELSE 0 END) AS ReturnInvoices,

            /* إجمالي قيمة فواتير الشراء */
            SUM(
                CASE
                    WHEN pi.SalesReturn = 1
                    THEN COALESCE(pi.total, 0)
                    ELSE 0
                END
            ) AS PurchaseTotal,

            /* إجمالي قيمة المرتجعات */
            SUM(
                CASE
                    WHEN pi.SalesReturn = 2
                    THEN ABS(COALESCE(pi.total, 0))
                    ELSE 0
                END
            ) AS ReturnTotal,

            /* صافي التكلفة الفعلية */
            SUM(COALESCE(pi.total, 0)) AS NetPurchaseCost,

            /* إجمالي الشراء قبل الخصم من مستوى الأصناف */
            SUM(
                CASE
                    WHEN pi.SalesReturn = 1
                    THEN
                        COALESCE(p.sprice, 0)
                        *
                        (
                            (
                                COALESCE(p.packs, 0) *
                                CASE
                                    WHEN COALESCE(i.Parts, 0) > 0
                                    THEN i.Parts
                                    ELSE 1
                                END
                            )
                            +
                            COALESCE(p.units, 0)
                        )
                        /
                        CASE
                            WHEN COALESCE(i.Parts, 0) > 0
                            THEN i.Parts
                            ELSE 1
                        END
                    ELSE 0
                END
            ) AS GrossPurchaseBeforeDiscount

        FROM PurchaseInvoices pi

        LEFT JOIN PurchaseItems p
            ON p.inv_id = pi.ID

        LEFT JOIN Items i
            ON i.ID = p.item_id;
    `);

    console.log("\n=== PURCHASE PROFIT TEST ===");
    console.table(
        result.recordset.map(row => ({
            PurchaseInvoices: Number(row.PurchaseInvoices || 0),
            ReturnInvoices: Number(row.ReturnInvoices || 0),
            PurchaseTotal: Number(row.PurchaseTotal || 0),
            ReturnTotal: Number(row.ReturnTotal || 0),
            NetPurchaseCost: Number(row.NetPurchaseCost || 0),
            GrossPurchaseBeforeDiscount: Number(row.GrossPurchaseBeforeDiscount || 0),
            PurchaseProfit:
                Number(row.GrossPurchaseBeforeDiscount || 0)
                -
                Number(row.NetPurchaseCost || 0)
        }))
    );

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
