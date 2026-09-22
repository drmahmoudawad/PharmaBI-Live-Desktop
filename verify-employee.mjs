import sql from "mssql";

const config = {
    server: "26.203.10.111",
    port: 1433,
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
    await sql.connect(
        config
    );


console.log("CONNECTED");


/* =======================================================
   1. POS TICKETS COLUMNS
   ======================================================= */

const ticketColumnsResult =
    await pool
        .request()
        .query(
            [
                "SELECT COLUMN_NAME, DATA_TYPE",
                "FROM INFORMATION_SCHEMA.COLUMNS",
                "WHERE TABLE_SCHEMA = 'dbo'",
                "AND TABLE_NAME = 'posTickets'",
                "ORDER BY ORDINAL_POSITION"
            ].join("\n")
        );


const ticketColumns =
    ticketColumnsResult.recordset
        .map(
            row =>
                String(
                    row.COLUMN_NAME
                ).trim()
        );


console.log(
    "posTickets columns:"
);

console.table(
    ticketColumnsResult.recordset
);


/* =======================================================
   2. CARDS COLUMNS
   ======================================================= */

const cardsColumnsResult =
    await pool
        .request()
        .query(
            [
                "SELECT COLUMN_NAME, DATA_TYPE",
                "FROM INFORMATION_SCHEMA.COLUMNS",
                "WHERE TABLE_SCHEMA = 'dbo'",
                "AND TABLE_NAME = 'Cards'",
                "ORDER BY ORDINAL_POSITION"
            ].join("\n")
        );


console.log(
    "Cards columns:"
);

console.table(
    cardsColumnsResult.recordset
);


/* =======================================================
   3. USERS COLUMNS
   ======================================================= */

const usersColumnsResult =
    await pool
        .request()
        .query(
            [
                "SELECT COLUMN_NAME, DATA_TYPE",
                "FROM INFORMATION_SCHEMA.COLUMNS",
                "WHERE TABLE_SCHEMA = 'dbo'",
                "AND TABLE_NAME = 'Users'",
                "ORDER BY ORDINAL_POSITION"
            ].join("\n")
        );


console.log(
    "Users columns:"
);

console.table(
    usersColumnsResult.recordset
);


/* =======================================================
   4. DETERMINE AVAILABLE EMPLOYEE FIELDS
   ======================================================= */

const hasPinNumber =
    ticketColumns
        .some(
            column =>
                column.toLowerCase() ===
                "pinnumber"
        );


const pinColumn =
    hasPinNumber
        ? "t.[PinNumber]"
        : "NULL";


console.log(
    "Ticket PinNumber exists:",
    hasPinNumber
);


/* =======================================================
   5. TEST EMPLOYEE 7520
   ======================================================= */

const employeeResult =
    await pool
        .request()
        .query(
            [
                "SELECT TOP 50",

                "    t.ID AS ticket_id,",

                `    ${pinColumn} AS ticket_pin_number,`,

                "    t.SalesRepID AS ticket_sales_rep_id,",

                "    pinCard.ID AS pin_card_id,",

                "    pinCard.Name AS pin_card_name,",

                "    pinCard.PinNumber AS pin_card_pin,",

                "    idCard.ID AS id_card_id,",

                "    idCard.Name AS id_card_name,",

                "    idCard.PinNumber AS id_card_pin",

                "FROM dbo.posTickets t",

                "LEFT JOIN dbo.Cards pinCard",

                "    ON CONVERT(nvarchar(100), pinCard.PinNumber)",

                "       = CONVERT(nvarchar(100), " +
                (hasPinNumber
                    ? "t.[PinNumber]"
                    : "NULL") +
                ")",

                "LEFT JOIN dbo.Cards idCard",

                "    ON idCard.ID = t.SalesRepID",

                "WHERE",

                "    t.ztime >= '2026-08-01'",

                "AND",

                "    t.ztime < '2026-09-01'",

                "AND",

                "    (",

                "        " +
                (
                    hasPinNumber
                        ? "CONVERT(nvarchar(100), t.[PinNumber]) = '7520'"
                        : "1 = 0"
                ),

                "        OR",

                "        CONVERT(nvarchar(100), t.SalesRepID) = '7520'",

                "    )",

                "ORDER BY",

                "    t.ID DESC"
            ].join("\n")
        );


console.log(
    "EMPLOYEE 7520 TEST:"
);

console.table(
    employeeResult.recordset
);


/* =======================================================
   6. FIND ALL POSSIBLE EMPLOYEE RECORDS
   ======================================================= */

const employeeSearchResult =
    await pool
        .request()
        .query(
            [
                "SELECT TOP 100",

                "    t.ID AS ticket_id,",

                `    ${pinColumn} AS ticket_pin_number,`,

                "    t.SalesRepID AS ticket_sales_rep_id,",

                "    pinCard.Name AS pin_card_name,",

                "    pinCard.PinNumber AS pin_card_pin,",

                "    idCard.Name AS id_card_name",

                "FROM dbo.posTickets t",

                "LEFT JOIN dbo.Cards pinCard",

                "    ON CONVERT(nvarchar(100), pinCard.PinNumber)",

                "       = CONVERT(nvarchar(100), " +
                (hasPinNumber
                    ? "t.[PinNumber]"
                    : "NULL") +
                ")",

                "LEFT JOIN dbo.Cards idCard",

                "    ON idCard.ID = t.SalesRepID",

                "WHERE",

                "    t.ztime >= '2026-08-01'",

                "AND",

                "    t.ztime < '2026-09-01'",

                "AND",

                "    t.SalesRepID IS NOT NULL",

                "ORDER BY",

                "    t.ID DESC"
            ].join("\n")
        );


console.log(
    "EMPLOYEE SAMPLE:"
);

console.table(
    employeeSearchResult.recordset.slice(
        0,
        30
    )
);


await pool.close();

console.log(
    "DONE"
);
