import sql from "mssql";

const branches = [
    {
        branchId: 2,
        server: "26.155.196.94",
        port: 59123,
        database: "pfx"
    },
    {
        branchId: 3,
        server: "26.41.217.48",
        port: 59123,
        database: "new"
    },
    {
        branchId: 4,
        server: "26.77.207.34",
        port: 59123,
        database: "pfx"
    },
    {
        branchId: 5,
        server: "26.114.246.160",
        port: 59123,
        database: "pfx"
    }
];

const password =
    "123";


for (
    const branch
    of branches
) {

    console.log("");
    console.log(
        `========== BRANCH ${branch.branchId} ==========`
    );

    let pool = null;

    try {

        pool =
            await sql.connect({
                server:
                    branch.server,

                port:
                    branch.port,

                database:
                    branch.database,

                user:
                    "sa",

                password,

                options: {
                    encrypt:
                        false,

                    trustServerCertificate:
                        true
                },

                requestTimeout:
                    120000,

                connectionTimeout:
                    30000
            });


        const counts =
            await pool.request().query(`
                SELECT
                    'BranchTransfers' AS table_name,
                    COUNT(*) AS record_count,
                    MIN(zTime) AS min_date,
                    MAX(zTime) AS max_date
                FROM BranchTransfers

                UNION ALL

                SELECT
                    'Transfers',
                    COUNT(*),
                    MIN(zDate),
                    MAX(zDate)
                FROM Transfers

                UNION ALL

                SELECT
                    'BranchTransfersBarracuda',
                    COUNT(*),
                    MIN(TransferDate),
                    MAX(TransferDate)
                FROM BranchTransfersBarracuda;
            `);


        console.table(
            counts.recordset
        );


        const branchTransfers =
            await pool.request().query(`
                SELECT TOP 10
                    ID,
                    zTime,
                    FromBranchID,
                    ToBranchID,
                    FromStoreID,
                    ToStoreID,
                    NumberOfItems,
                    TransferGuid
                FROM BranchTransfers
                ORDER BY
                    zTime DESC,
                    ID DESC;
            `);


        console.log(
            "BranchTransfers:"
        );

        console.table(
            branchTransfers.recordset
        );


        const barracuda =
            await pool.request().query(`
                SELECT TOP 10
                    Id,
                    TransferNumber,
                    TransferDate,
                    FromBranchId,
                    StoreId,
                    ToBranchId,
                    ToStoreId,
                    Total
                FROM BranchTransfersBarracuda
                ORDER BY
                    TransferDate DESC,
                    Id DESC;
            `);


        console.log(
            "BranchTransfersBarracuda:"
        );

        console.table(
            barracuda.recordset
        );


        const transfers =
            await pool.request().query(`
                SELECT TOP 10
                    ID,
                    zDate,
                    FromId,
                    ToId,
                    xMemo
                FROM Transfers
                ORDER BY
                    zDate DESC,
                    ID DESC;
            `);


        console.log(
            "Transfers:"
        );

        console.table(
            transfers.recordset
        );


    }
    catch (
        error
    ) {

        console.error(
            `BRANCH ${branch.branchId} ERROR:`,
            error.message
        );

    }
    finally {

        if (pool) {

            try {
                await pool.close();
            }
            catch {}

        }

    }

}