import {
    app
} from "electron";


import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";


import {
    getBranchPool
} from "../electron/connection/connectionManager.js";


const TARGET_BRANCHES = [
    3,
    4
];


function printSection(
    title
) {

    console.log("");
    console.log("");
    console.log("=====================================================");
    console.log(title);
    console.log("=====================================================");

}


async function inspectBranch(
    branch
) {

    console.log("");
    console.log(
        `######## BRANCH ${branch.branchId} ########`
    );
    console.log(
        `NAME: ${branch.branchName || ""}`
    );


    const pool =
        await getBranchPool(
            Number(branch.branchId),
            branch
        );


    /*
     * =====================================================
     * ALL posTickets COLUMNS
     * =====================================================
     */

    const columnsResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    c.column_id,
                    c.name AS column_name,
                    ty.name AS data_type,
                    c.max_length
                FROM sys.columns c
                INNER JOIN sys.tables t
                    ON t.object_id = c.object_id
                INNER JOIN sys.types ty
                    ON ty.user_type_id = c.user_type_id
                WHERE
                    t.name = 'posTickets'
                ORDER BY
                    c.column_id;

            `);


    const columns =
        Array.isArray(
            columnsResult?.recordset
        )
            ? columnsResult.recordset
            : [];


    printSection(
        `BRANCH ${branch.branchId} - ALL posTickets COLUMNS`
    );


    for (
        const column
        of columns
    ) {

        console.log(
            `${column.column_id}\t${column.column_name}\t${column.data_type}\t${column.max_length}`
        );

    }


    /*
     * =====================================================
     * POSSIBLE DELIVERY / ORDER FIELDS
     * =====================================================
     */

    const relevant =
        columns.filter(
            column => {

                const name =
                    String(
                        column.column_name || ""
                    ).toLowerCase();

                return (

                    name.includes("delivery") ||

                    name.includes("order") ||

                    name.includes("channel") ||

                    name.includes("type") ||

                    name.includes("source") ||

                    name.includes("status") ||

                    name.includes("customer") ||

                    name.includes("store")

                );

            }
        );


    printSection(
        `BRANCH ${branch.branchId} - POSSIBLE DELIVERY / ORDER FIELDS`
    );


    for (
        const column
        of relevant
    ) {

        console.log(
            `${column.column_id}\t${column.column_name}\t${column.data_type}`
        );

    }


    /*
     * =====================================================
     * ALL TABLES WITH DELIVERY / ORDER / CHANNEL
     * =====================================================
     */

    const tablesResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    s.name AS schema_name,
                    t.name AS table_name
                FROM sys.tables t
                INNER JOIN sys.schemas s
                    ON s.schema_id = t.schema_id
                WHERE
                    LOWER(t.name) LIKE '%delivery%'
                    OR LOWER(t.name) LIKE '%order%'
                    OR LOWER(t.name) LIKE '%channel%'
                    OR LOWER(t.name) LIKE '%customer%'
                ORDER BY
                    t.name;

            `);


    printSection(
        `BRANCH ${branch.branchId} - RELEVANT TABLES`
    );


    for (
        const table
        of tablesResult?.recordset || []
    ) {

        console.log(
            `${table.schema_name}.${table.table_name}`
        );

    }


    /*
     * =====================================================
     * POS TICKET FOREIGN KEYS
     * =====================================================
     */

    const fkResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    fk.name AS foreign_key_name,
                    OBJECT_SCHEMA_NAME(
                        fkc.parent_object_id
                    ) AS parent_schema,
                    OBJECT_NAME(
                        fkc.parent_object_id
                    ) AS parent_table,
                    pc.name AS parent_column,
                    OBJECT_SCHEMA_NAME(
                        fkc.referenced_object_id
                    ) AS referenced_schema,
                    OBJECT_NAME(
                        fkc.referenced_object_id
                    ) AS referenced_table,
                    rc.name AS referenced_column

                FROM sys.foreign_key_columns fkc

                INNER JOIN sys.foreign_keys fk
                    ON fk.object_id =
                       fkc.constraint_object_id

                INNER JOIN sys.columns pc
                    ON pc.object_id =
                       fkc.parent_object_id
                    AND pc.column_id =
                       fkc.parent_column_id

                INNER JOIN sys.columns rc
                    ON rc.object_id =
                       fkc.referenced_object_id
                    AND rc.column_id =
                       fkc.referenced_column_id

                WHERE
                    OBJECT_NAME(
                        fkc.parent_object_id
                    ) = 'posTickets'

                    OR

                    OBJECT_NAME(
                        fkc.referenced_object_id
                    ) = 'posTickets'

                ORDER BY
                    parent_table,
                    parent_column;

            `);


    printSection(
        `BRANCH ${branch.branchId} - posTickets FOREIGN KEYS`
    );


    for (
        const row
        of fkResult?.recordset || []
    ) {

        console.log(
            `${row.parent_table}.${row.parent_column} -> ${row.referenced_table}.${row.referenced_column}`
        );

    }


    /*
     * =====================================================
     * RECENT TICKETS - BASIC DATA
     * =====================================================
     */

    const sampleResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT TOP 50
                    ID,
                    ztime,
                    SalesReturn,
                    CustomerID,
                    Total,
                    StoreID,
                    SalesRepID
                FROM posTickets
                ORDER BY
                    ID DESC;

            `);


    printSection(
        `BRANCH ${branch.branchId} - RECENT TICKETS`
    );


    for (
        const row
        of sampleResult?.recordset || []
    ) {

        console.log(
            JSON.stringify(
                row
            )
        );

    }


    /*
     * =====================================================
     * CUSTOMER / SALES RETURN DISTRIBUTION
     * =====================================================
     */

    const distributionResult =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT
                    SalesReturn,
                    COUNT(*) AS ticket_count,
                    COUNT(
                        DISTINCT CustomerID
                    ) AS customer_count
                FROM posTickets
                GROUP BY
                    SalesReturn
                ORDER BY
                    SalesReturn;

            `);


    printSection(
        `BRANCH ${branch.branchId} - SALES RETURN DISTRIBUTION`
    );


    for (
        const row
        of distributionResult?.recordset || []
    ) {

        console.log(
            JSON.stringify(
                row
            )
        );

    }

}


async function main() {

    const branches =
        getAllSavedConnections();


    for (
        const branchId
        of TARGET_BRANCHES
    ) {

        const branch =
            branches.find(
                item =>
                    Number(
                        item.branchId
                    ) ===
                    Number(
                        branchId
                    )
            );


        if (!branch) {

            console.log(
                `BRANCH ${branchId}: CONNECTION NOT FOUND`
            );

            continue;

        }


        try {

            await inspectBranch(
                branch
            );

        }
        catch (
            error
        ) {

            console.error(
                `BRANCH ${branchId} FAILED:`,
                error?.message ||
                error
            );

        }

    }

}


await app.whenReady();


try {

    await main();

}
finally {

    app.quit();

}