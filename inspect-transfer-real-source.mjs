import sql from "mssql";

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
    requestTimeout: 120000,
    connectionTimeout: 30000
};

const pool = await sql.connect(config);

const r1 = await pool.request().query(`
    SELECT
        'Transfers' AS table_name,
        COUNT(*) AS records
    FROM Transfers

    UNION ALL

    SELECT
        'TransferedItems',
        COUNT(*)
    FROM TransferedItems

    UNION ALL

    SELECT
        'Exchange',
        COUNT(*)
    FROM Exchange
`);

console.log("===== COUNTS =====");
console.table(r1.recordset);

const transfers = await pool.request().query(`
    SELECT TOP 20
        t.ID,
        t.zDate,
        t.FromId,
        t.ToId,
        t.xMemo
    FROM Transfers t
    ORDER BY
        t.zDate DESC,
        t.ID DESC
`);

console.log("===== TRANSFERS =====");
console.table(transfers.recordset);

const items = await pool.request().query(`
    SELECT TOP 30
        ti.ID,
        ti.TransferID,
        ti.ItemId,
        ti.Packs,
        ti.Units,
        ti.SalesPrice,
        ti.ExpiryDate,
        ti.LineMemo
    FROM TransferedItems ti
    ORDER BY
        ti.ID DESC
`);

console.log("===== TRANSFERED ITEMS =====");
console.table(items.recordset);

const exchange = await pool.request().query(`
    SELECT TOP 20
        e.ID,
        e.Name,
        e.AccountID,
        e.FinalDiscount,
        e.InDiscount,
        e.OutDiscount,
        e.Settled,
        e.TerminationType
    FROM Exchange e
    ORDER BY
        e.ID DESC
`);

console.log("===== EXCHANGE =====");
console.table(exchange.recordset);

await pool.close();
