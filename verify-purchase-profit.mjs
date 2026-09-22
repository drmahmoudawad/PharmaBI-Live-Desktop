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

    console.log("\n=== DISCOUNT FORMULA VALIDATION ===");

    const validation = await pool.request().query(`
        SELECT
            COUNT(*) AS CheckedRows,
            SUM(
                CASE
                    WHEN p.CostPrice IS NOT NULL
                     AND ABS(
                        p.CostPrice -
                        (
                            COALESCE(p.sprice,0)
                            * (1 - COALESCE(p.trade_discount,0) / 100.0)
                            * (1 - COALESCE(p.ExtraDiscount,0) / 100.0)
                        )
                     ) <= 0.01
                    THEN 1 ELSE 0
                END
            ) AS MatchingRows,
            SUM(
                CASE
                    WHEN p.CostPrice IS NOT NULL
                     AND ABS(
                        p.CostPrice -
                        (
                            COALESCE(p.sprice,0)
                            * (1 - COALESCE(p.trade_discount,0) / 100.0)
                            * (1 - COALESCE(p.ExtraDiscount,0) / 100.0)
                        )
                     ) > 0.01
                    THEN 1 ELSE 0
                END
            ) AS NonMatchingRows
        FROM PurchaseItems p
        WHERE p.CostPrice IS NOT NULL;
    `);

    console.table(validation.recordset);

    console.log("\n=== UNITS / PACKS / PARTS ===");

    const units = await pool.request().query(`
        SELECT TOP 50
            p.inv_id AS InvoiceID,
            p.item_id,
            p.packs,
            p.units,
            p.bonus,
            i.Parts,
            p.sprice,
            p.trade_discount,
            p.ExtraDiscount,
            p.CostPrice,
            p.Returned
        FROM PurchaseItems p
        LEFT JOIN Items i
            ON i.ID = p.item_id
        WHERE ISNULL(p.units,0) > 0
        ORDER BY p.ID DESC;
    `);

    console.table(units.recordset);

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
