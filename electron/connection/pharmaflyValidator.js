const REQUIRED_TABLES = [

    "posTickets",

    "posItems",

    "Items",

    "Cards",

    "PurchaseInvoices",

    "PurchaseItems"

];


function escapeSqlString(
    value
) {

    return String(
        value
    ).replace(
        /'/g,
        "''"
    );

}


function buildTableList() {

    return REQUIRED_TABLES
        .map(
            table =>
                `'${escapeSqlString(table)}'`
        )
        .join(
            ", "
        );

}


export async function validatePharmaFlyConnection(
    pool
) {

    if (!pool) {

        throw new Error(
            "SQL connection pool is required"
        );

    }


    /*
     * =========================================================
     * DATABASE CHECK
     * =========================================================
     */

    const metadataResult =
        await pool
            .request()
            .query(`

                SELECT

                    DB_NAME()
                        AS database_name,

                    CAST(
                        SERVERPROPERTY(
                            'ServerName'
                        )
                        AS NVARCHAR(255)
                    )
                        AS server_name,

                    CAST(
                        SERVERPROPERTY(
                            'ProductVersion'
                        )
                        AS NVARCHAR(255)
                    )
                        AS sql_version

            `);


    /*
     * =========================================================
     * REQUIRED PHARMAFLY TABLES
     *
     * Do not use @table0 / @table1 here.
     * Table names are fixed application constants.
     * =========================================================
     */

    const tablesResult =
        await pool
            .request()
            .query(`

                SELECT

                    TABLE_SCHEMA
                        AS table_schema,

                    TABLE_NAME
                        AS table_name

                FROM INFORMATION_SCHEMA.TABLES

                WHERE

                    TABLE_TYPE =
                        'BASE TABLE'

                AND

                    TABLE_NAME IN (
                        ${buildTableList()}
                    )

            `);


    const foundTables =
        new Set(

            (
                tablesResult.recordset ||
                []
            ).map(
                row =>
                    String(
                        row.table_name
                    )
            )

        );


    const missingTables =
        REQUIRED_TABLES.filter(
            table =>
                !foundTables.has(
                    table
                )
        );


    const metadata =
        metadataResult.recordset?.[0] ||
        {};


    /*
     * =========================================================
     * SCHEMA FAILURE
     * =========================================================
     */

    if (
        missingTables.length > 0
    ) {

        const error =
            new Error(

                `Connected to SQL Server, but required PharmaFly tables are missing: ${missingTables.join(
                    ", "
                )}`

            );


        error.code =
            "PHARMAFLY_SCHEMA_MISMATCH";


        error.details = {

            databaseName:
                metadata.database_name ||
                null,

            serverName:
                metadata.server_name ||
                null,

            sqlVersion:
                metadata.sql_version ||
                null,

            requiredTables:
                REQUIRED_TABLES,

            foundTables:
                Array.from(
                    foundTables
                ),

            missingTables

        };


        throw error;

    }


    /*
     * =========================================================
     * SUCCESS
     * =========================================================
     */

    return {

        databaseName:
            metadata.database_name ||
            null,

        serverName:
            metadata.server_name ||
            null,

        sqlVersion:
            metadata.sql_version ||
            null,

        requiredTables:
            [
                ...REQUIRED_TABLES
            ],

        foundTables:
            [
                ...REQUIRED_TABLES
            ],

        missingTables:
            [],

        schemaValid:
            true

    };

}


export default {

    validatePharmaFlyConnection

};