const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const sql = require("mssql");

const PROJECT = "D:\\PharmaBI-Live-Desktop";

const SQLITE_PATH =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\pharmabi.db";

const OUTPUT_CSV =
    path.join(
        PROJECT,
        "tools",
        "item-catalog-all.csv"
    );

const OUTPUT_REPORT =
    path.join(
        PROJECT,
        "tools",
        "item-catalog-report.json"
    );


function q(identifier) {

    return `[${String(identifier).replaceAll("]", "]]")}]`;

}


function findColumn(
    columns,
    candidates
) {

    const map =
        new Map(
            columns.map(
                column => [
                    String(column).toLowerCase(),
                    column
                ]
            )
        );

    for (
        const candidate of candidates
    ) {

        const found =
            map.get(
                String(candidate).toLowerCase()
            );

        if (found) {
            return found;
        }

    }

    return null;

}


function normalizeSimple(
    value
) {

    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


function csvEscape(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const text =
        String(value);

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\r") ||
        text.includes("\n")
    ) {

        return `"${text.replaceAll('"', '""')}"`;

    }

    return text;

}


async function main() {

    console.log("");
    console.log("==============================================");
    console.log("PHARMABI ITEM CATALOG COLLECTION");
    console.log("==============================================");
    console.log("");


    if (
        !fs.existsSync(
            SQLITE_PATH
        )
    ) {

        throw new Error(
            `SQLite database not found:\n${SQLITE_PATH}`
        );

    }


    const db =
        new Database(
            SQLITE_PATH,
            {
                readonly: true
            }
        );


    const branches =
        db.prepare(`
            SELECT
                id,
                branch_code,
                branch_name,
                sql_server,
                sql_port,
                sql_database,
                sql_username,
                sql_password
            FROM branches
            ORDER BY id
        `).all();


    db.close();


    if (
        branches.length === 0
    ) {

        throw new Error(
            "No branches found in SQLite."
        );

    }


    console.log(
        `Branches found: ${branches.length}`
    );


    const allRows = [];
    const report = [];


    for (
        const branch
        of branches
    ) {

        console.log("");
        console.log(
            `--- Branch ${branch.id}: ${branch.branch_name} ---`
        );


        let pool = null;


        try {

            const server =
                String(
                    branch.sql_server || ""
                ).trim();

            const port =
                Number(
                    branch.sql_port || 1433
                );

            const database =
                String(
                    branch.sql_database || ""
                ).trim();

            const user =
                String(
                    branch.sql_username || ""
                ).trim();

            const password =
                String(
                    branch.sql_password || ""
                );


            if (
                !server ||
                !database ||
                !user
            ) {

                throw new Error(
                    "Incomplete SQL connection information."
                );

            }


            pool =
                await sql.connect({

                    server,

                    port,

                    database,

                    user,

                    password,

                    options: {

                        encrypt: false,

                        trustServerCertificate:
                            true

                    },

                    connectionTimeout:
                        15000,

                    requestTimeout:
                        120000

                });


            console.log(
                `Connected: ${server}:${port}/${database}`
            );


            const schemaResult =
                await pool.request().query(`
                    SELECT
                        COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'dbo'
                      AND TABLE_NAME = 'Items'
                    ORDER BY ORDINAL_POSITION
                `);


            const columns =
                schemaResult.recordset.map(
                    row => row.COLUMN_NAME
                );


            if (
                columns.length === 0
            ) {

                throw new Error(
                    "dbo.Items does not exist or has no columns."
                );

            }


            const idColumn =
                findColumn(
                    columns,
                    [
                        "ItemID",
                        "ItemId",
                        "itemId",
                        "ID",
                        "Id"
                    ]
                );


            const codeColumn =
                findColumn(
                    columns,
                    [
                        "ItemCode",
                        "itemCode",
                        "Code",
                        "ItemNo",
                        "ItemNumber",
                        "BarcodeCode"
                    ]
                );


            const nameColumn =
                findColumn(
                    columns,
                    [
                        "Name",
                        "ItemName",
                        "name",
                        "Description",
                        "ItemDescription"
                    ]
                );


            const barcodeColumn =
                findColumn(
                    columns,
                    [
                        "Barcode",
                        "BarCode",
                        "barcode",
                        "EAN",
                        "UPC",
                        "ItemBarcode"
                    ]
                );


            const partsColumn =
                findColumn(
                    columns,
                    [
                        "Parts",
                        "parts"
                    ]
                );


            if (
                !idColumn
            ) {

                throw new Error(
                    `Could not identify item ID column. Columns: ${columns.join(", ")}`
                );

            }


            if (
                !nameColumn
            ) {

                throw new Error(
                    `Could not identify item name column. Columns: ${columns.join(", ")}`
                );

            }


            console.log(
                `Item ID column: ${idColumn}`
            );

            console.log(
                `Item code column: ${codeColumn || "(none -> ItemID will be used)"}`
            );

            console.log(
                `Item name column: ${nameColumn}`
            );

            console.log(
                `Barcode column: ${barcodeColumn || "(none)"}`
            );


            const codeExpression =
                codeColumn
                    ? `${q(codeColumn)}`
                    : `${q(idColumn)}`;


            const barcodeExpression =
                barcodeColumn
                    ? `${q(barcodeColumn)}`
                    : `NULL`;


            const partsExpression =
                partsColumn
                    ? `${q(partsColumn)}`
                    : `NULL`;


            const query = `
                SELECT
                    ${q(idColumn)} AS [branch_item_id],
                    ${codeExpression} AS [branch_item_code],
                    ${q(nameColumn)} AS [branch_item_name],
                    ${barcodeExpression} AS [barcode],
                    ${partsExpression} AS [parts]
                FROM dbo.Items
                ORDER BY ${q(idColumn)}
            `;


            const result =
                await pool.request().query(
                    query
                );


            console.log(
                `Items collected: ${result.recordset.length.toLocaleString("en-US")}`
            );


            for (
                const row
                of result.recordset
            ) {

                const rawName =
                    row.branch_item_name === null ||
                    row.branch_item_name === undefined
                        ? ""
                        : String(
                            row.branch_item_name
                        ).trim();


                const branchItemId =
                    row.branch_item_id;


                const branchItemCode =
                    row.branch_item_code === null ||
                    row.branch_item_code === undefined
                        ? branchItemId
                        : row.branch_item_code;


                allRows.push({

                    branch_id:
                        branch.id,

                    branch_code:
                        branch.branch_code,

                    branch_name:
                        branch.branch_name,

                    server,

                    database,

                    branch_item_id:
                        branchItemId,

                    branch_item_code:
                        branchItemCode,

                    branch_item_name:
                        rawName,

                    normalized_name:
                        normalizeSimple(
                            rawName
                        ),

                    barcode:
                        row.barcode ?? "",

                    parts:
                        row.parts ?? ""

                });

            }


            report.push({

                branchId:
                    branch.id,

                branchCode:
                    branch.branch_code,

                branchName:
                    branch.branch_name,

                server,

                database,

                status:
                    "success",

                itemCount:
                    result.recordset.length,

                detectedColumns: {

                    itemId:
                        idColumn,

                    itemCode:
                        codeColumn,

                    name:
                        nameColumn,

                    barcode:
                        barcodeColumn,

                    parts:
                        partsColumn

                }

            });

        }
        catch (error) {

            console.error(
                `ERROR: ${error.message}`
            );


            report.push({

                branchId:
                    branch.id,

                branchCode:
                    branch.branch_code,

                branchName:
                    branch.branch_name,

                status:
                    "error",

                error:
                    error.message

            });

        }
        finally {

            if (pool) {

                try {

                    await pool.close();

                }
                catch {
                    // ignore close errors
                }

            }

        }

    }


    const headers = [

        "branch_id",
        "branch_code",
        "branch_name",
        "server",
        "database",
        "branch_item_id",
        "branch_item_code",
        "branch_item_name",
        "normalized_name",
        "barcode",
        "parts"

    ];


    const csvLines = [

        headers.join(","),

        ...allRows.map(
            row =>
                headers
                    .map(
                        header =>
                            csvEscape(
                                row[header]
                            )
                    )
                    .join(",")
        )

    ];


    fs.writeFileSync(

        OUTPUT_CSV,

        "\uFEFF" +
        csvLines.join("\r\n"),

        "utf8"

    );


    const summary = {

        generatedAt:
            new Date().toISOString(),

        sqlitePath:
            SQLITE_PATH,

        branchesFound:
            branches.length,

        rowsCollected:
            allRows.length,

        successfulBranches:
            report.filter(
                row => row.status === "success"
            ).length,

        failedBranches:
            report.filter(
                row => row.status === "error"
            ).length,

        branches:
            report

    };


    fs.writeFileSync(

        OUTPUT_REPORT,

        JSON.stringify(
            summary,
            null,
            2
        ),

        "utf8"

    );


    console.log("");
    console.log("==============================================");
    console.log("DONE");
    console.log("==============================================");
    console.log("");
    console.log(
        `CSV: ${OUTPUT_CSV}`
    );
    console.log(
        `REPORT: ${OUTPUT_REPORT}`
    );
    console.log(
        `TOTAL ROWS: ${allRows.length.toLocaleString("en-US")}`
    );
    console.log("");

}


main()
    .catch(error => {

        console.error("");
        console.error(
            "FATAL ERROR:"
        );
        console.error(
            error.message
        );
        console.error("");

        process.exit(1);

    });