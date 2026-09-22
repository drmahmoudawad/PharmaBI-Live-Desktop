import fs from "node:fs";
import path from "node:path";

import {
    app,
    safeStorage
} from "electron";

import sql from "mssql";


const SETTINGS_FILE =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\connection-settings.json";

const OUTPUT_DIR =
    "D:\\PharmaBI-Live-Desktop\\tools";

const OUTPUT_CSV =
    path.join(
        OUTPUT_DIR,
        "item-catalog-all.csv"
    );

const OUTPUT_REPORT =
    path.join(
        OUTPUT_DIR,
        "item-catalog-report.json"
    );


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
        const candidate
        of candidates
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


function normalizeName(
    value
) {

    return String(
        value ?? ""
    )
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


function decryptPassword(
    entry
) {

    if (
        !entry?.password
    ) {

        return "";

    }


    if (
        entry.passwordEncrypted !== true
    ) {

        return String(
            entry.password
        );

    }


    if (
        !safeStorage.isEncryptionAvailable()
    ) {

        throw new Error(
            "Electron safeStorage is not available."
        );

    }


    return safeStorage.decryptString(
        Buffer.from(
            entry.password,
            "base64"
        )
    );

}


async function collectBranch(
    entry
) {

    const branchId =
        Number(
            entry?.branchId
        );

    const branchName =
        String(
            entry?.branchName ||
            `Branch ${branchId}`
        );


    const server =
        String(
            entry?.server ||
            ""
        ).trim();


    const port =
        Number(
            entry?.port ||
            1433
        );


    const database =
        String(
            entry?.database ||
            ""
        ).trim();


    const user =
        String(
            entry?.user ||
            ""
        ).trim();


    const password =
        decryptPassword(
            entry
        );


    console.log("");
    console.log(
        `===== BRANCH ${branchId}: ${branchName} =====`
    );


    console.log(
        `Connecting ${server}:${port}/${database} ...`
    );


    const pool =
        await new sql.ConnectionPool({

            server,

            port,

            database,

            user,

            password,

            options: {

                encrypt:
                    false,

                trustServerCertificate:
                    true

            },

            pool: {

                max:
                    3,

                min:
                    0,

                idleTimeoutMillis:
                    10000

            },

            connectionTimeout:
                15000,

            requestTimeout:
                120000

        }).connect();


    try {

        const schemaResult =
            await pool
                .request()
                .query(`

                    SELECT

                        c.name AS column_name,

                        ty.name AS data_type

                    FROM sys.columns c

                    INNER JOIN sys.tables t

                        ON t.object_id =
                           c.object_id

                    INNER JOIN sys.types ty

                        ON ty.user_type_id =
                           c.user_type_id

                    WHERE

                        t.name =
                        'Items'

                    ORDER BY

                        c.column_id;

                `);


        const columns =
            schemaResult.recordset.map(
                row => row.column_name
            );


        if (
            columns.length === 0
        ) {

            throw new Error(
                "dbo.Items not found."
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
                    "ItemNumber"
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
                `Item ID column not found. Columns: ${columns.join(", ")}`
            );

        }


        if (
            !nameColumn
        ) {

            throw new Error(
                `Item name column not found. Columns: ${columns.join(", ")}`
            );

        }


        console.log(
            `ItemID     : ${idColumn}`
        );

        console.log(
            `ItemCode   : ${codeColumn || "(none)"}`
        );

        console.log(
            `Name       : ${nameColumn}`
        );

        console.log(
            `Barcode    : ${barcodeColumn || "(none)"}`
        );

        console.log(
            `Parts      : ${partsColumn || "(none)"}`
        );


        const sqlName =
            `[${nameColumn.replaceAll("]", "]]")}]`;

        const sqlId =
            `[${idColumn.replaceAll("]", "]]")}]`;

        const sqlCode =
            codeColumn
                ? `[${codeColumn.replaceAll("]", "]]")}]`
                : "NULL";

        const sqlBarcode =
            barcodeColumn
                ? `[${barcodeColumn.replaceAll("]", "]]")}]`
                : "NULL";

        const sqlParts =
            partsColumn
                ? `[${partsColumn.replaceAll("]", "]]")}]`
                : "NULL";


        const query = `

            SELECT

                ${sqlId}
                    AS [branch_item_id],

                ${sqlCode}
                    AS [branch_item_code],

                ${sqlName}
                    AS [branch_item_name],

                ${sqlBarcode}
                    AS [barcode],

                ${sqlParts}
                    AS [parts]

            FROM dbo.Items

            ORDER BY
                ${sqlId};

        `;


        const result =
            await pool
                .request()
                .query(
                    query
                );


        const rows =
            result.recordset.map(
                row => ({

                    branch_id:
                        branchId,

                    branch_name:
                        branchName,

                    server,

                    port,

                    database,

                    branch_item_id:
                        row.branch_item_id,

                    branch_item_code:
                        row.branch_item_code ??
                        row.branch_item_id,

                    branch_item_name:
                        row.branch_item_name ?? "",

                    normalized_name:
                        normalizeName(
                            row.branch_item_name
                        ),

                    barcode:
                        row.barcode ?? "",

                    parts:
                        row.parts ?? "",

                    is_zero_item:
                        Number(
                            row.branch_item_id
                        ) === 0

                })
            );


        const zeroItems =
            rows.filter(
                row =>
                    row.is_zero_item
            ).length;


        console.log(
            `Items collected: ${rows.length.toLocaleString("en-US")}`
        );

        console.log(
            `ItemID 0 rows: ${zeroItems.toLocaleString("en-US")}`
        );


        return {

            branchId,

            branchName,

            server,

            port,

            database,

            status:
                "success",

            itemCount:
                rows.length,

            zeroItemCount:
                zeroItems,

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

            },

            rows

        };

    }
    finally {

        try {

            await pool.close();

        }
        catch {
            // Ignore close errors.
        }

    }

}


async function main() {

    await app.whenReady();


    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "PHARMABI MASTER ITEM CATALOG COLLECTION"
    );
    console.log(
        "=============================================="
    );


    if (
        !fs.existsSync(
            SETTINGS_FILE
        )
    ) {

        throw new Error(
            `Settings file not found: ${SETTINGS_FILE}`
        );

    }


    const settings =
        JSON.parse(
            fs.readFileSync(
                SETTINGS_FILE,
                "utf8"
            )
        );


    const entries =
        Object.values(
            settings?.branches || {}
        )
        .filter(
            entry =>
                Number.isInteger(
                    Number(
                        entry?.branchId
                    )
                )
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(a.branchId) -
                Number(b.branchId)
        );


    console.log("");
    console.log(
        `Saved branches: ${entries.length}`
    );


    const allRows = [];
    const report = [];


    for (
        const entry
        of entries
    ) {

        try {

            const result =
                await collectBranch(
                    entry
                );


            allRows.push(
                ...result.rows
            );


            report.push({

                branchId:
                    result.branchId,

                branchName:
                    result.branchName,

                server:
                    result.server,

                port:
                    result.port,

                database:
                    result.database,

                status:
                    result.status,

                itemCount:
                    result.itemCount,

                zeroItemCount:
                    result.zeroItemCount,

                detectedColumns:
                    result.detectedColumns

            });

        }
        catch (
            error
        ) {

            const branchId =
                Number(
                    entry?.branchId
                );

            const branchName =
                String(
                    entry?.branchName ||
                    `Branch ${branchId}`
                );


            console.error(
                `ERROR Branch ${branchId} (${branchName}): ${error.message}`
            );


            report.push({

                branchId,

                branchName,

                status:
                    "error",

                error:
                    error.message

            });

        }

    }


    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive:
                true
        }
    );


    const headers = [

        "branch_id",
        "branch_name",
        "server",
        "port",
        "database",
        "branch_item_id",
        "branch_item_code",
        "branch_item_name",
        "normalized_name",
        "barcode",
        "parts",
        "is_zero_item"

    ];


    const csv =
        [

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

        ].join("\r\n");


    fs.writeFileSync(
        OUTPUT_CSV,
        "\uFEFF" + csv,
        "utf8"
    );


    const summary = {

        generatedAt:
            new Date().toISOString(),

        source:
            SETTINGS_FILE,

        branchCount:
            entries.length,

        successfulBranches:
            report.filter(
                row =>
                    row.status ===
                    "success"
            ).length,

        failedBranches:
            report.filter(
                row =>
                    row.status ===
                    "error"
            ).length,

        totalRows:
            allRows.length,

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
    console.log(
        "=============================================="
    );
    console.log(
        "COLLECTION COMPLETE"
    );
    console.log(
        "=============================================="
    );
    console.log("");
    console.log(
        `CSV    : ${OUTPUT_CSV}`
    );
    console.log(
        `REPORT : ${OUTPUT_REPORT}`
    );
    console.log(
        `ROWS   : ${allRows.length.toLocaleString("en-US")}`
    );
    console.log("");


    app.quit();

}


main()
    .catch(
        error => {

            console.error("");
            console.error(
                "FATAL ERROR:"
            );
            console.error(
                error
            );
            console.error("");

            try {
                app.quit();
            }
            catch {
                // ignore
            }

            process.exit(1);

        }
    );