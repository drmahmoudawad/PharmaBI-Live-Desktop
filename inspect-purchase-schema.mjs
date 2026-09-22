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
    }
};

const pool = await sql.connect(config);

const result = await pool.request().query(`
    SELECT
        t.name AS table_name,
        c.column_id,
        c.name AS column_name,
        ty.name AS data_type
    FROM sys.tables t
    INNER JOIN sys.columns c
        ON c.object_id = t.object_id
    INNER JOIN sys.types ty
        ON ty.user_type_id = c.user_type_id
    WHERE t.name IN (
        'PurchaseItems',
        'PurchaseInvoices'
    )
    ORDER BY
        t.name,
        c.column_id;
`);

console.table(result.recordset);

await pool.close();
