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
        SELECT TOP 60
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

            p.ID AS PurchaseItemID,
            p.item_id,
            p.packs,
            p.units,
            p.bonus,

            p.sprice,
            p.trade_discount,
            p.ExtraDiscount,
            p.CostPrice,

            (
                COALESCE(p.sprice,0)
                * (1 - COALESCE(p.trade_discount,0) / 100.0)
                * (1 - COALESCE(p.ExtraDiscount,0) / 100.0)
            ) AS FormulaCost,

            (
                p.CostPrice -
                (
                    COALESCE(p.sprice,0)
                    * (1 - COALESCE(p.trade_discount,0) / 100.0)
                    * (1 - COALESCE(p.ExtraDiscount,0) / 100.0)
                )
            ) AS CostDifference

        FROM PurchaseItems p
        INNER JOIN PurchaseInvoices pi
            ON pi.ID = p.inv_id

        WHERE
            p.CostPrice IS NOT NULL
            AND ABS(
                p.CostPrice -
                (
                    COALESCE(p.sprice,0)
                    * (1 - COALESCE(p.trade_discount,0) / 100.0)
                    * (1 - COALESCE(p.ExtraDiscount,0) / 100.0)
                )
            ) > 0.01

        ORDER BY p.ID DESC;
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
