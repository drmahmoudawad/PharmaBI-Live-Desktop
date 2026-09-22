import sql from "mssql";

const pool =
    await sql.connect({
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
        requestTimeout: 30000
    });

console.log("CONNECTED");


const tables =
    await pool
        .request()
        .query(`
            SELECT
                TABLE_SCHEMA,
                TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE
                TABLE_TYPE = 'BASE TABLE'
            AND
                (
                    TABLE_NAME LIKE '%User%'
                    OR TABLE_NAME LIKE '%Employee%'
                    OR TABLE_NAME LIKE '%Staff%'
                    OR TABLE_NAME LIKE '%Seller%'
                    OR TABLE_NAME LIKE '%SalesRep%'
                    OR TABLE_NAME LIKE '%Cash%'
                    OR TABLE_NAME LIKE '%Person%'
                )
            ORDER BY
                TABLE_NAME;
        `);

console.log(
    "EMPLOYEE-LIKE TABLES:"
);

console.table(
    tables.recordset
);


const columns =
    await pool
        .request()
        .query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE
                TABLE_SCHEMA = 'dbo'
            AND
                (
                    COLUMN_NAME LIKE '%Pin%'
                    OR COLUMN_NAME LIKE '%User%'
                    OR COLUMN_NAME LIKE '%Employee%'
                    OR COLUMN_NAME LIKE '%Seller%'
                    OR COLUMN_NAME LIKE '%SalesRep%'
                    OR COLUMN_NAME LIKE '%Staff%'
                    OR COLUMN_NAME LIKE '%Name%'
                )
            ORDER BY
                TABLE_NAME,
                ORDINAL_POSITION;
        `);

console.log(
    "EMPLOYEE-RELATED COLUMNS:"
);

console.table(
    columns.recordset
);


await pool.close();

console.log("DONE");
