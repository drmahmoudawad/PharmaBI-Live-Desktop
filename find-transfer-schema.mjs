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

try {
    console.log("Connecting...");

    const pool =
        await sql.connect(
            config
        );

    console.log(
        "Connected."
    );

    const result =
        await pool.request().query(`
            SELECT
                t.name AS table_name,
                c.name AS column_name
            FROM sys.tables t
            INNER JOIN sys.columns c
                ON c.object_id = t.object_id
            WHERE
                LOWER(t.name) LIKE '%transfer%'
                OR LOWER(t.name) LIKE '%exchange%'
                OR LOWER(t.name) LIKE '%stock%'
                OR LOWER(t.name) LIKE '%branch%'
                OR LOWER(c.name) LIKE '%transfer%'
                OR LOWER(c.name) LIKE '%exchange%'
                OR LOWER(c.name) LIKE '%branch%'
                OR LOWER(c.name) LIKE '%frombranch%'
                OR LOWER(c.name) LIKE '%tobranch%'
                OR LOWER(c.name) LIKE '%sourcebranch%'
                OR LOWER(c.name) LIKE '%destbranch%'
            ORDER BY
                t.name,
                c.column_id;
        `);

    console.log("");
    console.log(
        "===== POSSIBLE TRANSFER / EXCHANGE TABLES ====="
    );
    console.log("");

    for (
        const row
        of result.recordset || []
    ) {
        console.log(
            `${row.table_name} | ${row.column_name}`
        );
    }

    console.log("");
    console.log("===== END =====");

    await pool.close();
}
catch (
    error
) {
    console.error(
        "ERROR:",
        error
    );

    process.exitCode = 1;
}
