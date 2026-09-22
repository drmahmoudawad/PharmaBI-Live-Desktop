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


const result =
    await pool
        .request()
        .query(`
            SELECT

                c.ID,

                c.Name,

                c.ShortName,

                c.NameOnCheck,

                c.IsEmployee,

                c.IsSalesRep,

                c.SalesRepID,

                c.PinNumber

            FROM dbo.Cards c

            WHERE

                ISNULL(
                    c.IsEmployee,
                    0
                ) = 1

                OR

                ISNULL(
                    c.IsSalesRep,
                    0
                ) = 1

            ORDER BY

                c.Name;
        `);


console.log(
    "EMPLOYEE / SALES REP CARDS:"
);

console.table(
    result.recordset
);


/*
 * =====================================================
 * TEST 7520 DIRECTLY
 * =====================================================
 */

const result7520 =
    await pool
        .request()
        .query(`
            SELECT

                c.ID,

                c.Name,

                c.ShortName,

                c.NameOnCheck,

                c.IsEmployee,

                c.IsSalesRep,

                c.SalesRepID,

                c.PinNumber

            FROM dbo.Cards c

            WHERE

                CONVERT(
                    nvarchar(100),
                    c.PinNumber
                ) = '7520'

                OR

                CONVERT(
                    nvarchar(100),
                    c.SalesRepID
                ) = '7520'

                OR

                CONVERT(
                    nvarchar(100),
                    c.ID
                ) = '7520';
        `);


console.log(
    "DIRECT 7520 MATCH:"
);

console.table(
    result7520.recordset
);


await pool.close();

console.log("DONE");
