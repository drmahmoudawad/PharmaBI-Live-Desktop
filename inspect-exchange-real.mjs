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

const exchangeColumns = await pool.request().query(`
    SELECT
        c.name AS column_name,
        ty.name AS data_type,
        c.max_length,
        c.is_nullable
    FROM sys.columns c
    INNER JOIN sys.types ty
        ON ty.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID('Exchange')
    ORDER BY c.column_id;
`);

console.log("===== Exchange columns =====");
console.table(exchangeColumns.recordset);

const ticketsXColumns = await pool.request().query(`
    SELECT
        c.name AS column_name,
        ty.name AS data_type,
        c.max_length,
        c.is_nullable
    FROM sys.columns c
    INNER JOIN sys.types ty
        ON ty.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID('posTicketsX')
    ORDER BY c.column_id;
`);

console.log("===== posTicketsX columns =====");
console.table(ticketsXColumns.recordset);

const exchangeRows = await pool.request().query(`
    SELECT TOP 20 *
    FROM Exchange
    ORDER BY ID DESC;
`);

console.log("===== Exchange sample =====");
console.table(exchangeRows.recordset);

const ticketXRows = await pool.request().query(`
    SELECT TOP 30 *
    FROM posTicketsX
    ORDER BY 1 DESC;
`);

console.log("===== posTicketsX sample =====");
console.table(ticketXRows.recordset);

const fk = await pool.request().query(`
    SELECT
        OBJECT_NAME(fkc.parent_object_id) AS child_table,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS child_column,
        OBJECT_NAME(fkc.referenced_object_id) AS parent_table,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS parent_column
    FROM sys.foreign_key_columns fkc
    WHERE
        OBJECT_NAME(fkc.parent_object_id) IN ('posTicketsX','Exchange')
        OR
        OBJECT_NAME(fkc.referenced_object_id) IN ('posTicketsX','Exchange')
    ORDER BY
        child_table,
        child_column;
`);

console.log("===== Exchange foreign keys =====");
console.table(fk.recordset);

await pool.close();
