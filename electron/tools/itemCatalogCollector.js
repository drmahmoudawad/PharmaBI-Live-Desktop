import fs from "node:fs";
import path from "node:path";

import sql from "mssql";

import {
    getAllSavedConnections
} from "../settings/connectionStore.js";

import {
    getBranchPool
} from "../connection/connectionManager.js";


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


function escapeSqlIdentifier(
    value
) {

    return String(
        value
    ).replaceAll(
        "]",
        "]]"
    );

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


async function collectBranch(
    branch
) {

    const branchId =
        Number(
            branch.branchId
        );


    console.log("");
    console.log(
        `===== BRANCH ${branchId}: ${branch.branchName} =====`
    );


    console.log(
        `Server: ${branch.server}:${branch.port}`
    );

    console.log(
        `Database: ${branch.database}`
    );


    const pool =
        await getBranchPool(
            branchId,
            branch
        );


    const schema =
        await pool
            .request()
            .query(`

                SELECT

                    c.name AS column_name

                FROM sys.columns c

                INNER JOIN sys.tables t

                    ON t.object_id =
                       c.object_id

                WHERE

                    t.name =
                    'Items'

                ORDER BY

                    c.column_id

            `);


    const columns =
        schema.recordset.map(
            row =>
                row.column_name
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
            `ItemID column not found. Columns: ${columns.join(", ")}`
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
        `ItemID   : ${idColumn}`
    );

    console.log(
        `ItemCode : ${codeColumn || "(none)"}`
    );

    console.log(
        `Name     : ${nameColumn}`
    );

    console.log(
        `Barcode  : ${barcodeColumn || "(none)"}`
    );

    console.log(
        `Parts    : ${partsColumn || "(none)"}`
    );


    const itemIdSql =
        `[${escapeSqlIdentifier(idColumn)}]`;


    const itemCodeSql =
        codeColumn
            ? `[${escapeSqlIdentifier(codeColumn)}]`
            : "NULL";


    const nameSql =
        `[${escapeSqlIdentifier(nameColumn)}]`;


    const barcodeSql =
        barcodeColumn
            ? `[${escapeSqlIdentifier(barcodeColumn)}]`
            : "NULL";


    const partsSql =
        partsColumn
            ? `[${escapeSqlIdentifier(partsColumn)}]`
            : "NULL";


    const result =
        await pool
            .request()
            .query(`

                SELECT

                    ${itemIdSql}
                        AS [branch_item_id],

                    ${itemCodeSql}
                        AS [branch_item_code],

                    ${nameSql}
                        AS [branch_item_name],

                    ${barcodeSql}
                        AS [barcode],

                    ${partsSql}
                        AS [parts]

                FROM dbo.Items

                ORDER BY
                    ${itemIdSql}

            `);


    const rows =
        result.recordset.map(
            row => ({

                branch_id:
                    branchId,

                branch_name:
                    branch.branchName,

                branch_item_id:
                    row.branch_item_id,

                branch_item_code:
                    row.branch_item_code ??
                    row.branch_item_id,

                branch_item_name:
                    row.branch_item_name ??
                    "",

                normalized_name:
                    normalizeName(
                        row.branch_item_name
                    ),

                barcode:
                    row.barcode ??
                    "",

                parts:
                    row.parts ??
                    "",

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

        branchName:
            branch.branchName,

        status:
            "success",

        itemCount:
            rows.length,

        zeroItemCount:
            zeroItems,

        columns: {

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


export async function collectItemCatalog() {

    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive:
                true
        }
    );


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


    const branches =
        getAllSavedConnections();


    console.log("");
    console.log(
        `Saved branches: ${branches.length}`
    );


    const allRows = [];
    const report = [];


    for (
        const branch
        of branches
    ) {

        try {

            const result =
                await collectBranch(
                    branch
                );


            allRows.push(
                ...result.rows
            );


            report.push({

                branchId:
                    result.branchId,

                branchName:
                    result.branchName,

                status:
                    result.status,

                itemCount:
                    result.itemCount,

                zeroItemCount:
                    result.zeroItemCount,

                columns:
                    result.columns

            });

        }
        catch (
            error
        ) {

            console.error(
                `ERROR Branch ${branch.branchId} (${branch.branchName}):`,
                error.message
            );


            report.push({

                branchId:
                    branch.branchId,

                branchName:
                    branch.branchName,

                status:
                    "error",

                error:
                    error.message

            });

        }

    }


    const headers = [

        "branch_id",
        "branch_name",
        "branch_item_id",
        "branch_item_code",
        "branch_item_name",
        "normalized_name",
        "barcode",
        "parts",
        "is_zero_item"

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

        branchCount:
            branches.length,

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


    return summary;

}