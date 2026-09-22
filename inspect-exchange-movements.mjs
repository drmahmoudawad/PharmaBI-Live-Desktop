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

const summary = await pool.request().query(`
    SELECT
        MIN(px.zTime) AS minDate,
        MAX(px.zTime) AS maxDate,
        COUNT(*) AS totalRows,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 1
                THEN 1 ELSE 0
            END
        ) AS salesRows,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 2
                THEN 1 ELSE 0
            END
        ) AS returnRows,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 1
                THEN ISNULL(px.Total,0)
                ELSE 0
            END
        ) AS salesTotal,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 2
                THEN ABS(ISNULL(px.Total,0))
                ELSE 0
            END
        ) AS returnTotal
    FROM posTicketsX px
    WHERE px.ExchangeID IS NOT NULL;
`);

console.log("===== EXCHANGE MOVEMENT SUMMARY =====");
console.table(summary.recordset);

const byBranch = await pool.request().query(`
    SELECT
        px.ExchangeID,
        e.Name AS branchName,
        COUNT(*) AS rowsCount,
        MIN(px.zTime) AS firstDate,
        MAX(px.zTime) AS lastDate,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 1
                THEN ISNULL(px.Total,0)
                ELSE 0
            END
        ) AS outgoingTotal,
        SUM(
            CASE
                WHEN ISNULL(px.SalesReturn,1) = 2
                THEN ABS(ISNULL(px.Total,0))
                ELSE 0
            END
        ) AS returnTotal
    FROM posTicketsX px
    LEFT JOIN Exchange e
        ON e.ID = px.ExchangeID
    WHERE px.ExchangeID IS NOT NULL
    GROUP BY
        px.ExchangeID,
        e.Name
    ORDER BY
        MAX(px.zTime) DESC;
`);

console.log("===== BY BRANCH =====");
console.table(byBranch.recordset);

const recent = await pool.request().query(`
    SELECT TOP 30
        px.ID,
        px.zTime,
        px.ExchangeID,
        e.Name AS branchName,
        px.SalesReturn,
        px.TicketType,
        px.Total,
        px.PinNumber,
        px.xMemo
    FROM posTicketsX px
    LEFT JOIN Exchange e
        ON e.ID = px.ExchangeID
    WHERE px.ExchangeID IS NOT NULL
    ORDER BY
        px.zTime DESC,
        px.ID DESC;
`);

console.log("===== RECENT =====");
console.table(recent.recordset);

await pool.close();
