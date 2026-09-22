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

    connectionTimeout: 30000,
    requestTimeout: 30000
};

const pool =
    await sql.connect(config);

console.log("CONNECTED");


const result =
    await pool
        .request()
        .query(`
            SELECT TOP 50

                t.ID
                    AS ticket_id,

                t.PinNumber
                    AS ticket_pin_number,

                t.SalesRepID
                    AS ticket_sales_rep_id,

                pinCard.ID
                    AS pin_card_id,

                pinCard.Name
                    AS pin_card_name,

                pinCard.PinNumber
                    AS pin_card_pin,

                idCard.ID
                    AS id_card_id,

                idCard.Name
                    AS id_card_name,

                idCard.PinNumber
                    AS id_card_pin

            FROM dbo.posTickets t

            LEFT JOIN dbo.Cards pinCard

                ON CONVERT(
                    nvarchar(100),
                    pinCard.PinNumber
                )
                =
                CONVERT(
                    nvarchar(100),
                    t.PinNumber
                )

            LEFT JOIN dbo.Cards idCard

                ON idCard.ID =
                   t.SalesRepID

            WHERE

                t.ztime >= '2026-08-01'

            AND

                t.ztime < '2026-09-01'

            AND

                (
                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) = '7520'

                    OR

                    CONVERT(
                        nvarchar(100),
                        t.SalesRepID
                    ) = '7520'
                )

            ORDER BY

                t.ID DESC;
        `);

console.table(
    result.recordset
);

await pool.close();

console.log("DONE");
