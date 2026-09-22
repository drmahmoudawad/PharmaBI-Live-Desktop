import sql from "mssql";

const pool = await sql.connect({
    server: "26.203.10.111",
    port: 59123,
    database: "pfx1",
    user: "sa",
    password: "123",
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
});

const r = await pool.request().query(`
    SELECT TOP 20 *
    FROM dbo.posTickets
    WHERE
        ztime >= '2026-08-01'
    AND
        ztime < '2026-09-01'
    AND
        SalesRepID IS NOT NULL
    ORDER BY
        ID DESC;
`);

console.dir(
    r.recordset,
    {
        depth: null
    }
);

await pool.close();
