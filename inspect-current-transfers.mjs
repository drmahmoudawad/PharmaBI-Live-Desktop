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

const transfers = await pool.request().query(`
    SELECT TOP 20
        bt.ID,
        bt.zTime,
        bt.FromBranchID,
        bt.ToBranchID,
        bt.FromStoreID,
        bt.ToStoreID,
        bt.NumberOfItems,
        bt.TransferGuid,
        b1.BranchName AS FromBranchName,
        b2.BranchName AS ToBranchName
    FROM BranchTransfers bt
    LEFT JOIN Branches b1
        ON b1.ID = bt.FromBranchID
    LEFT JOIN Branches b2
        ON b2.ID = bt.ToBranchID
    ORDER BY
        bt.zTime DESC,
        bt.ID DESC;
`);

console.log("===== BranchTransfers =====");
console.table(transfers.recordset);

const items = await pool.request().query(`
    SELECT TOP 30
        bti.ID,
        bti.BranchTransferID,
        bti.ItemID,
        bti.SalesPrice,
        bti.Packs,
        bti.Units,
        bti.LastPurchaseCost,
        bti.AverageCost
    FROM BranchTransferItems bti
    ORDER BY
        bti.ID DESC;
`);

console.log("===== BranchTransferItems =====");
console.table(items.recordset);

await pool.close();
