import fs from "node:fs";
import { execFileSync } from "node:child_process";

const localDbPath =
    "./electron/localdb/localSalesDb.js";

const salesServicePath =
    "./electron/pharmfly/sales/salesService.js";

const originalLocalDb =
    fs.readFileSync(
        localDbPath,
        "utf8"
    );

const originalSalesService =
    fs.readFileSync(
        salesServicePath,
        "utf8"
    );

function replaceRegexOnce(
    text,
    pattern,
    replacement,
    label
) {

    const matches =
        [...text.matchAll(pattern)];

    if (
        matches.length !== 1
    ) {

        throw new Error(
            `${label}: expected 1 match, found ${matches.length}`
        );

    }

    return text.replace(
        pattern,
        replacement
    );
}

try {

    let localDb =
        originalLocalDb;

    let salesService =
        originalSalesService;

    /*
     * =====================================================
     * localSalesDb.js
     * =====================================================
     */

    if (
        !localDb.includes(
            "pin_number TEXT"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*sales_rep_id TEXT,\r?\n)(?=\s*created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,)/g,

                "$1\r\n            pin_number TEXT,\r\n",

                "local schema pin_number"
            );

    }

    /*
     * Existing database migration.
     */

    if (
        !localDb.includes(
            "function ensurePinNumberColumn()"
        )
    ) {

        const migrationFunction = [
            "function ensurePinNumberColumn() {",
            "",
            "    const db =",
            "        database;",
            "",
            "    const columns =",
            "        db.prepare(",
            '            "PRAGMA table_info(sales_history)"',
            "        ).all();",
            "",
            "    const hasPinNumber =",
            "        columns.some(",
            "            column =>",
            '                column.name === "pin_number"',
            "        );",
            "",
            "    if (!hasPinNumber) {",
            "",
            "        db.exec(",
            '            "ALTER TABLE sales_history ADD COLUMN pin_number TEXT"',
            "        );",
            "",
            "    }",
            "",
            "    db.exec(",
            '        "CREATE INDEX IF NOT EXISTS idx_sales_history_branch_pin_date ON sales_history (branch_id, pin_number, date)"',
            "    );",
            "",
            "}",
            "",
            ""
        ].join("\n");

        const statementsIndex =
            localDb.indexOf(
                "function getStatements() {"
            );

        if (
            statementsIndex < 0
        ) {

            throw new Error(
                "local getStatements marker not found"
            );

        }

        localDb =
            localDb.slice(
                0,
                statementsIndex
            ) +
            migrationFunction +
            localDb.slice(
                statementsIndex
            );

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*createSchema\(\);\r?\n)/g,

                "$1\r\n    ensurePinNumberColumn();\r\n",

                "local migration call"
            );

    }

    /*
     * INSERT column
     */

    if (
        !localDb.includes(
            "pin_number,\n                    updated_at"
        ) &&
        !localDb.includes(
            "pin_number,\r\n                    updated_at"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*sales_rep_id,\r?\n)(?=\s*updated_at\s*$)/gm,

                "$1                    pin_number,\r\n",

                "local insert column"
            );

    }

    /*
     * INSERT value
     */

    if (
        !localDb.includes(
            "@pin_number"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*@sales_rep_id,\r?\n\s*)CURRENT_TIMESTAMP/g,

                "$1@pin_number,\r\n                    CURRENT_TIMESTAMP",

                "local insert value"
            );

    }

    /*
     * UPSERT
     */

    if (
        !localDb.includes(
            "excluded.pin_number"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*sales_rep_id\s*=\s*\r?\n\s*excluded\.sales_rep_id,\r?\n)(?=\s*updated_at\s*=)/g,

                "$1\r\n                    pin_number =\r\n                        excluded.pin_number,\r\n",

                "local upsert pin"
            );

    }

    /*
     * getMonthRows
     */

    if (
        !localDb.includes(
            "pin_number AS pinNumber"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*sales_rep_id AS salesRepId,\r?\n)(?=\s*created_at AS createdAt,)/g,

                "$1                    pin_number AS pinNumber,\r\n",

                "local month row pin"
            );

    }

    /*
     * normalizeRow
     */

    if (
        !localDb.includes(
            "row?.pinNumber"
        )
    ) {

        localDb =
            replaceRegexOnce(
                localDb,

                /(\r?\n\s*sales_rep_id:\r?\n\s*toNullableString\(\r?\n\s*row\?\.salesRepId\r?\n\s*\)\r?\n)(?=\s*\};)/g,

                "$1\r\n        pin_number:\r\n            toNullableString(\r\n                row?.pinNumber\r\n            )\r\n",

                "local normalize pin"
            );

    }

    /*
     * =====================================================
     * salesService.js
     * =====================================================
     */

    if (
        !salesService.includes(
            "AS pin_number"
        )
    ) {

        salesService =
            replaceRegexOnce(
                salesService,

                /(\r?\n\s*t\.StoreID\s+AS ticket_store_id,\r?\n)(?=\s*t\.SalesRepID\s+AS sales_rep_id,)/g,

                "$1\r\n            t.PinNumber\r\n                AS pin_number,\r\n",

                "sales SQL pin"
            );

    }

    /*
     * normalizeSaleRow()
     */

    if (
        !salesService.includes(
            "row.pin_number"
        )
    ) {

        salesService =
            replaceRegexOnce(
                salesService,

                /(\r?\n\s*storeId:\r?\n\s*row\.line_store_id)/g,

                "\r\n        pinNumber:\r\n            row.pin_number === null ||\r\n            row.pin_number === undefined\r\n\r\n                ? null\r\n\r\n                : String(\r\n                    row.pin_number\r\n                ),\r\n\r\n\r\n        storeId:\r\n            row.line_store_id",

                "sales normalize pin"
            );

    }

    /*
     * Persist current-day liveRows into SQLite.
     */

    if (
        !salesService.includes(
            "CURRENT MONTH SQLITE UPDATED"
        )
    ) {

        const liveRowsPattern =
            /(\r?\n\s*const liveRows\s*=\s*await queryPharmaFlySales\(\{[\s\S]*?\r?\n\s*\}\);)/g;

        const liveRowsMatches =
            [...salesService.matchAll(
                liveRowsPattern
            )];

        if (
            liveRowsMatches.length !== 1
        ) {

            throw new Error(
                `sales liveRows block: expected 1 match, found ${liveRowsMatches.length}`
            );

        }

        const saveBlock = [
            "",
            "",
            "    if (",
            "        Array.isArray(liveRows) &&",
            "        liveRows.length > 0",
            "    ) {",
            "",
            "        try {",
            "",
            "            const localSave =",
            "                saveSalesRows({",
            "",
            "                    branchId:",
            "                        Number(",
            "                            branchId",
            "                        ),",
            "",
            "                    rows:",
            "                        liveRows",
            "",
            "                });",
            "",
            "            console.log(",
            '                "[salesService] CURRENT MONTH SQLITE UPDATED branch=" +',
            "                Number(branchId) +",
            '                " rows=" +',
            "                localSave.processed",
            "            );",
            "",
            "        }",
            "        catch (",
            "            error",
            "        ) {",
            "",
            "            console.error(",
            '                "[salesService] CURRENT MONTH SQLITE SAVE FAILED branch=" +',
            "                Number(branchId) +",
            '                ":",',
            "                error",
            "            );",
            "",
            "        }",
            "",
            "    }"
        ].join("\n");

        salesService =
            salesService.replace(
                liveRowsPattern,
                "$1" +
                saveBlock
            );

    }

    /*
     * =====================================================
     * VALIDATE BEFORE COMMITTING TO FILES
     * =====================================================
     */

    const tempLocalDb =
        ".\\electron\\localdb\\localSalesDb.__pincheck.js";

    const tempSalesService =
        ".\\electron\\pharmfly\\sales\\salesService.__pincheck.js";

    fs.writeFileSync(
        tempLocalDb,
        localDb,
        "utf8"
    );

    fs.writeFileSync(
        tempSalesService,
        salesService,
        "utf8"
    );

    try {

        execFileSync(
            process.execPath,
            [
                "--check",
                tempLocalDb
            ],
            {
                stdio: "inherit"
            }
        );

        execFileSync(
            process.execPath,
            [
                "--check",
                tempSalesService
            ],
            {
                stdio: "inherit"
            }
        );

    }
    finally {

        fs.rmSync(
            tempLocalDb,
            {
                force: true
            }
        );

        fs.rmSync(
            tempSalesService,
            {
                force: true
            }
        );

    }

    /*
     * Only now write the real files.
     */

    fs.writeFileSync(
        localDbPath,
        localDb,
        "utf8"
    );

    fs.writeFileSync(
        salesServicePath,
        salesService,
        "utf8"
    );

    console.log(
        ""
    );

    console.log(
        "SELLER PIN PERSISTENCE FIX APPLIED AND VALIDATED"
    );

}
catch (error) {

    fs.writeFileSync(
        localDbPath,
        originalLocalDb,
        "utf8"
    );

    fs.writeFileSync(
        salesServicePath,
        originalSalesService,
        "utf8"
    );

    console.error(
        ""
    );

    console.error(
        "NO FILES WERE LEFT MODIFIED BY THIS SCRIPT."
    );

    throw error;

}
