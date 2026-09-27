const fs = require("node:fs");
const cp = require("node:child_process");

const localDbPath =
    "./electron/localdb/localSalesDb.js";

const salesServicePath =
    "./electron/pharmfly/sales/salesService.js";

const originalLocal =
    fs.readFileSync(
        localDbPath,
        "utf8"
    );

const originalSales =
    fs.readFileSync(
        salesServicePath,
        "utf8"
    );

function normalize(text) {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
}

function replaceOnce(
    text,
    oldText,
    newText,
    label
) {

    const first =
        text.indexOf(
            oldText
        );

    if (
        first < 0
    ) {

        throw new Error(
            `${label}: target not found`
        );

    }

    const second =
        text.indexOf(
            oldText,
            first + oldText.length
        );

    if (
        second >= 0
    ) {

        throw new Error(
            `${label}: target found more than once`
        );

    }

    return (
        text.slice(
            0,
            first
        ) +
        newText +
        text.slice(
            first + oldText.length
        )
    );

}

try {

    let local =
        normalize(
            originalLocal
        );

    let sales =
        normalize(
            originalSales
        );

    /*
     * =========================================================
     * localSalesDb.js
     * =========================================================
     */

    if (
        !local.includes(
            "pin_number TEXT"
        )
    ) {

        local =
            replaceOnce(

                local,

`            store_id TEXT,

            sales_rep_id TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,`,

`            store_id TEXT,

            sales_rep_id TEXT,

            pin_number TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,`,

                "local schema"
            );

    }

    if (
        !local.includes(
            "function ensurePinNumberColumn()"
        )
    ) {

        const helper = `function ensurePinNumberColumn() {

    const db =
        database;

    const columns =
        db.prepare(
            "PRAGMA table_info(sales_history)"
        ).all();

    const hasPinNumber =
        columns.some(
            column =>
                column.name === "pin_number"
        );

    if (!hasPinNumber) {

        db.exec(
            "ALTER TABLE sales_history ADD COLUMN pin_number TEXT"
        );

    }

    db.exec(
        "CREATE INDEX IF NOT EXISTS idx_sales_history_branch_pin_date ON sales_history (branch_id, pin_number, date)"
    );

}


`;

        local =
            replaceOnce(

                local,

`function getStatements() {`,

                helper +
                `function getStatements() {`,

                "local migration helper"
            );

    }

    if (
        !local.includes(
            "ensurePinNumberColumn();"
        )
    ) {

        local =
            replaceOnce(

                local,

`    createSchema();


    console.log(`,

`    createSchema();

    ensurePinNumberColumn();


    console.log(`,

                "local migration call"
            );

    }

    if (
        !local.includes(
            "                    pin_number,\n                    updated_at"
        )
    ) {

        local =
            replaceOnce(

                local,

`                    store_id,
                    sales_rep_id,
                    updated_at`,

`                    store_id,
                    sales_rep_id,
                    pin_number,
                    updated_at`,

                "local insert columns"
            );

    }

    if (
        !local.includes(
            "@pin_number"
        )
    ) {

        local =
            replaceOnce(

                local,

`                    @store_id,
                    @sales_rep_id,
                    CURRENT_TIMESTAMP`,

`                    @store_id,
                    @sales_rep_id,
                    @pin_number,
                    CURRENT_TIMESTAMP`,

                "local insert values"
            );

    }

    if (
        !local.includes(
            "excluded.pin_number"
        )
    ) {

        local =
            replaceOnce(

                local,

`                    sales_rep_id =
                        excluded.sales_rep_id,

                    updated_at =
                        CURRENT_TIMESTAMP`,

`                    sales_rep_id =
                        excluded.sales_rep_id,

                    pin_number =
                        excluded.pin_number,

                    updated_at =
                        CURRENT_TIMESTAMP`,

                "local upsert"
            );

    }

    if (
        !local.includes(
            "pin_number AS pinNumber"
        )
    ) {

        local =
            replaceOnce(

                local,

`                    store_id AS storeId,
                    sales_rep_id AS salesRepId,
                    created_at AS createdAt,`,

`                    store_id AS storeId,
                    sales_rep_id AS salesRepId,
                    pin_number AS pinNumber,
                    created_at AS createdAt,`,

                "local month rows"
            );

    }

    if (
        !local.includes(
            "row?.pinNumber"
        )
    ) {

        local =
            replaceOnce(

                local,

`        sales_rep_id:
            toNullableString(
                row?.salesRepId
            )

    };`,

`        sales_rep_id:
            toNullableString(
                row?.salesRepId
            ),

        pin_number:
            toNullableString(
                row?.pinNumber
            )

    };`,

                "local normalize"
            );

    }

    /*
     * =========================================================
     * salesService.js
     * =========================================================
     */

    if (
        !sales.includes(
            "AS pin_number"
        )
    ) {

        sales =
            replaceOnce(

                sales,

`            t.StoreID
                AS ticket_store_id,

            t.SalesRepID
                AS sales_rep_id,`,

`            t.StoreID
                AS ticket_store_id,

            t.PinNumber
                AS pin_number,

            t.SalesRepID
                AS sales_rep_id,`,

                "sales base pin"
            );

    }

    if (
        !sales.includes(
            "            s.pin_number,"
        )
    ) {

        sales =
            replaceOnce(

                sales,

`            s.ticket_store_id,

            s.sales_rep_id,

            s.line_id,`,

`            s.ticket_store_id,

            s.sales_rep_id,

            s.pin_number,

            s.line_id,`,

                "sales final pin"
            );

    }

    if (
        !sales.includes(
            "row.pin_number"
        )
    ) {

        sales =
            replaceOnce(

                sales,

`        ticketTotal:
            toNumber(
                row.ticket_total
            ),


        packs,`,

`        ticketTotal:
            toNumber(
                row.ticket_total
            ),


        pinNumber:
            row.pin_number === null ||
            row.pin_number === undefined

                ? null

                : String(
                    row.pin_number
                ),


        packs,`,

                "sales normalize pin"
            );

    }

    if (
        !sales.includes(
            "CURRENT MONTH SQLITE UPDATED"
        )
    ) {

        sales =
            replaceOnce(

                sales,

`    const liveRows =
        await queryPharmaFlySales({

            branchId,

            fromDate:
                refreshFromDate,

            toDate:
                addOneDayISO(
                    toDate
                ),

            connection

        });


    /*
     * Keep cached history before refreshFromDate.`,

`    const liveRows =
        await queryPharmaFlySales({

            branchId,

            fromDate:
                refreshFromDate,

            toDate:
                addOneDayISO(
                    toDate
                ),

            connection

        });


    if (
        Array.isArray(
            liveRows
        ) &&
        liveRows.length > 0
    ) {

        try {

            const localSave =
                saveSalesRows({

                    branchId:
                        Number(
                            branchId
                        ),

                    rows:
                        liveRows

                });

            console.log(
                "[salesService] CURRENT MONTH SQLITE UPDATED branch=" +
                Number(branchId) +
                " rows=" +
                localSave.processed
            );

        }
        catch (
            error
        ) {

            console.error(
                "[salesService] CURRENT MONTH SQLITE SAVE FAILED branch=" +
                Number(branchId) +
                ":",
                error
            );

        }

    }


    /*
     * Keep cached history before refreshFromDate.`,

                "sales incremental save"
            );

    }

    /*
     * =========================================================
     * VALIDATE BEFORE WRITING
     * =========================================================
     */

    const localTemp =
        localDbPath +
        ".tmp-check.js";

    const salesTemp =
        salesServicePath +
        ".tmp-check.js";

    fs.writeFileSync(
        localTemp,
        local,
        "utf8"
    );

    fs.writeFileSync(
        salesTemp,
        sales,
        "utf8"
    );

    try {

        cp.execFileSync(
            process.execPath,
            [
                "--check",
                localTemp
            ],
            {
                stdio: "inherit"
            }
        );

        cp.execFileSync(
            process.execPath,
            [
                "--check",
                salesTemp
            ],
            {
                stdio: "inherit"
            }
        );

    }
    finally {

        fs.rmSync(
            localTemp,
            {
                force: true
            }
        );

        fs.rmSync(
            salesTemp,
            {
                force: true
            }
        );

    }

    /*
     * =========================================================
     * WRITE
     * =========================================================
     */

    fs.writeFileSync(
        localDbPath,
        local,
        "utf8"
    );

    fs.writeFileSync(
        salesServicePath,
        sales,
        "utf8"
    );

    console.log(
        ""
    );

    console.log(
        "PIN NUMBER PERSISTENCE FIX APPLIED AND VALIDATED"
    );

}
catch (
    error
) {

    fs.writeFileSync(
        localDbPath,
        originalLocal,
        "utf8"
    );

    fs.writeFileSync(
        salesServicePath,
        originalSales,
        "utf8"
    );

    console.error(
        ""
    );

    console.error(
        "NO FILE CHANGES LEFT BEHIND."
    );

    throw error;

}
