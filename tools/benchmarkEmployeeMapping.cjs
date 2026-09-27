const sql = require("mssql");
const fs = require("fs");

const configPath =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\connection-settings.json";

const settings = JSON.parse(fs.readFileSync(configPath, "utf8"));

const branches = [2, 4];

function addDay(dateText) {
    const d = new Date(`${dateText}T00:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

async function bench(branchId) {
    const branch =
        settings.find?.(
            x => Number(x.id ?? x.branch_id ?? x.branchId) === branchId
        ) ||
        settings.branches?.find?.(
            x => Number(x.id ?? x.id) === branchId
        );

    if (!branch) {
        throw new Error(`Branch ${branchId} not found in connection-settings.json`);
    }

    console.log(`\n========== BRANCH ${branchId} ==========`);

    const pool = await new sql.ConnectionPool({
        server: branch.server || branch.sql_server,
        port: Number(branch.port || branch.sql_port || 1433),
        database: branch.database || branch.sql_database,
        user: branch.user || branch.sql_username,
        password: branch.password || branch.sql_password,
        options: {
            encrypt: false,
            trustServerCertificate: true
        },
        requestTimeout: 120000,
        connectionTimeout: 30000
    }).connect();

    const fromDate = "2025-10-01";
    const toDate = "2026-09-24";
    const toExclusive = addDay(toDate);

    async function run(label, queryBuilder) {
        const start = Date.now();
        const result = await queryBuilder();
        const ms = Date.now() - start;
        console.log(`${label}: ${(ms / 1000).toFixed(3)} sec | rows=${result?.recordset?.length ?? 0}`);
        return result;
    }

    await run("1) metricsTicketResult", () =>
        pool.request()
            .input("metricsFromDate", `${fromDate} 00:00:00`)
            .input("metricsToDateExclusive", `${toExclusive} 00:00:00`)
            .query(`
                SET NOCOUNT ON;

                SELECT
                    t.ID AS ticket_id,
                    CONVERT(varchar(10), CAST(t.ztime AS date), 23) AS ticket_date,
                    t.CustomerID AS customer_id,
                    c.Name AS delivery_customer_name,
                    t.SalesReturn AS sales_return,
                    ISNULL(t.Total, 0) AS ticket_total
                FROM dbo.posTickets t
                LEFT JOIN dbo.Cards c
                    ON c.ID = t.CustomerID
                WHERE
                    t.ztime >= @metricsFromDate
                AND
                    t.ztime < @metricsToDateExclusive;
            `)
    );

    await run("2) ticketResult PinNumber", () =>
        pool.request()
            .input("fromDate", `${fromDate} 00:00:00`)
            .input("toDateExclusive", `${toExclusive} 00:00:00`)
            .query(`
                SET NOCOUNT ON;

                SELECT
                    t.ID AS ticket_id,
                    CONVERT(nvarchar(100), t.PinNumber) AS employee_id
                FROM dbo.posTickets t
                LEFT JOIN dbo.Cards c
                    ON c.ID = t.CustomerID
                WHERE
                    t.ztime >= @fromDate
                AND
                    t.ztime < @toDateExclusive
                AND
                    t.PinNumber IS NOT NULL
                AND
                    CONVERT(nvarchar(100), t.PinNumber) NOT IN (N'', N'0');
            `)
    );

    await run("3) Cards lookup", () =>
        pool.request().query(`
            SET NOCOUNT ON;

            SELECT
                CONVERT(nvarchar(100), c.ID) AS employee_id,
                LTRIM(RTRIM(CONVERT(nvarchar(400), c.Name))) AS employee_name
            FROM dbo.Cards c
            WHERE c.ID IN (
                SELECT DISTINCT TOP 1000 t.PinNumber
                FROM dbo.posTickets t
                WHERE
                    t.ztime >= '${fromDate} 00:00:00'
                AND t.ztime < '${toExclusive} 00:00:00'
                AND t.PinNumber IS NOT NULL
                AND t.PinNumber <> 0
            );
        `)
    );

    await run("4) Diagnostic Cards", () =>
        pool.request().query(`
            SET NOCOUNT ON;

            SELECT ID, Name, IsEmployee, IsSalesRep, SalesRepID
            FROM dbo.Cards
            WHERE SalesRepID IN (10,26,28)
            ORDER BY SalesRepID, ID;
        `)
    );

    await run("5) Diagnostic tickets", () =>
        pool.request().query(`
            SET NOCOUNT ON;

            SELECT TOP 30
                t.ID AS TicketID,
                t.SalesRepID,
                t.PinNumber,
                t.ztime
            FROM dbo.posTickets t
            WHERE t.SalesRepID IN (10,26,28)
            ORDER BY t.ztime DESC, t.ID DESC;
        `)
    );

    await pool.close();
}

(async () => {
    for (const branchId of branches) {
        await bench(branchId);
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
