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

const result = await pool.request().query(`
    SELECT
        t.SalesRepID,

        c1.ID AS card_id_by_sales_rep_id,
        c1.Name AS card_name_by_sales_rep_id,
        c1.IsEmployee AS card_is_employee,
        c1.IsSalesRep AS card_is_sales_rep,
        c1.SalesRepID AS card_sales_rep_id,
        c1.PinNumber AS card_pin,

        u.ID AS user_id,
        u.login AS user_login

    FROM dbo.posTickets t

    LEFT JOIN dbo.Cards c1
        ON c1.SalesRepID = t.SalesRepID

    LEFT JOIN dbo.Users u
        ON u.ID = t.SalesRepID

    WHERE
        t.ztime >= '2026-08-01'
    AND
        t.ztime < '2026-09-01'
    AND
        t.SalesRepID IN (10,15,28)

    GROUP BY
        t.SalesRepID,
        c1.ID,
        c1.Name,
        c1.IsEmployee,
        c1.IsSalesRep,
        c1.SalesRepID,
        c1.PinNumber,
        u.ID,
        u.login

    ORDER BY
        t.SalesRepID;
`);

console.table(result.recordset);

await pool.close();
