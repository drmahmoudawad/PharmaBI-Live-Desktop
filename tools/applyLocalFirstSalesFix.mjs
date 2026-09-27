import fs from "node:fs";

const localDbPath =
    "electron/localdb/localSalesDb.js";

const salesPath =
    "electron/pharmfly/sales/salesService.js";

function read(filePath) {
    return fs.readFileSync(
        filePath,
        "utf8"
    );
}

function write(
    filePath,
    content
) {
    fs.writeFileSync(
        filePath,
        content,
        "utf8"
    );
}

function count(
    text,
    value
) {
    return text.split(value).length - 1;
}

/* =========================================================
 * LOCAL SALES DB
 * ========================================================= */

let localDb =
    read(localDbPath);

/*
 * Add monthly read statement.
 */

if (
    !localDb.includes(
        "getMonthRows:"
    )
) {

    const statementMarker =
        "        getMonthStats:";

    if (
        count(
            localDb,
            statementMarker
        ) !== 1
    ) {
        throw new Error(
            "getMonthStats marker not found exactly once."
        );
    }

    const statement = `        getMonthRows:
            db.prepare(\`
                SELECT
                    branch_id AS branchId,
                    ticket_id AS ticketId,
                    line_id AS lineId,
                    item_id AS itemId,
                    item_name AS itemName,
                    customer_id AS customerId,
                    customer_name AS customerName,
                    date,
                    sales_return AS salesReturn,
                    transaction_type AS transactionType,
                    ticket_total AS ticketTotal,
                    packs,
                    units,
                    parts,
                    base_units AS baseUnits,
                    bonus,
                    sales_price AS salesPrice,
                    unit_price AS unitPrice,
                    gross_line_value AS grossLineValue,
                    discount,
                    extra_discount AS extraDiscount,
                    net_line_value AS netLineValue,
                    cost_price AS costPrice,
                    unit_cost AS unitCost,
                    line_cost AS lineCost,
                    purchase_cost AS purchaseCost,
                    purchase_unit_cost AS purchaseUnitCost,
                    purchase_date AS purchaseDate,
                    purchase_invoice_id AS purchaseInvoiceId,
                    purchase_invoice_code AS purchaseInvoiceCode,
                    purchase_vendor_id AS purchaseVendorId,
                    purchase_parts AS purchaseParts,
                    source_pos_item_cost AS sourcePosItemCost,
                    is_content AS isContent,
                    store_id AS storeId,
                    sales_rep_id AS salesRepId,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM sales_history
                WHERE
                    branch_id = ?
                AND
                    date >= ?
                AND
                    date < ?
                ORDER BY
                    date ASC,
                    ticket_id ASC,
                    line_id ASC
            \`),

`;

    localDb =
        localDb.replace(
            statementMarker,
            statement +
            statementMarker
        );
}

/*
 * Add getSalesMonthRows().
 */

if (
    !localDb.includes(
        "export function getSalesMonthRows("
    )
) {

    const functionMarker =
        "export function getSalesDateRange(";

    if (
        count(
            localDb,
            functionMarker
        ) !== 1
    ) {
        throw new Error(
            "getSalesDateRange marker not found exactly once."
        );
    }

    const readerFunction = `export function getSalesMonthRows(
    {
        branchId,
        month
    }
) {

    const id =
        Number(
            branchId
        );

    const normalizedMonth =
        String(
            month ||
            ""
        ).trim();

    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {
        throw new Error(
            "Invalid branchId"
        );
    }

    if (
        !/^\\d{4}-\\d{2}$/.test(
            normalizedMonth
        )
    ) {
        throw new Error(
            "Invalid month. Expected YYYY-MM"
        );
    }

    const parts =
        normalizedMonth.split("-");

    const year =
        Number(
            parts[0]
        );

    const monthNumber =
        Number(
            parts[1]
        );

    if (
        !Number.isInteger(
            year
        ) ||
        !Number.isInteger(
            monthNumber
        ) ||
        monthNumber < 1 ||
        monthNumber > 12
    ) {
        throw new Error(
            "Invalid month"
        );
    }

    const fromDate =
        normalizedMonth +
        "-01";

    const nextMonth =
        new Date(
            Date.UTC(
                year,
                monthNumber,
                1
            )
        );

    const toDate =
        nextMonth
            .toISOString()
            .slice(
                0,
                10
            );

    const rows =
        getStatements()
            .getMonthRows
            .all(
                id,
                fromDate,
                toDate
            );

    return Array.isArray(
        rows
    )
        ? rows
        : [];
}


`;

    localDb =
        localDb.replace(
            functionMarker,
            readerFunction +
            functionMarker
        );
}

write(
    localDbPath,
    localDb
);

console.log(
    "[PATCH] localSalesDb ready."
);

/* =========================================================
 * SALES SERVICE IMPORTS
 * ========================================================= */

let sales =
    read(salesPath);

const monthlyImportMarker =
    '} from "../../cache/monthlySalesCacheService.js";';

if (
    !sales.includes(
        "getSalesMonthRows"
    )
) {

    if (
        count(
            sales,
            monthlyImportMarker
        ) !== 1
    ) {
        throw new Error(
            "Monthly cache import marker not found exactly once."
        );
    }

    sales =
        sales.replace(
            monthlyImportMarker,
            monthlyImportMarker +
            `

import {
    getSalesMonthRows,
    getSalesDateRange,
    saveSalesRows
} from "../../localdb/localSalesDb.js";`
        );
}

/* =========================================================
 * BACKGROUND REFRESH STATE
 * ========================================================= */

if (
    !sales.includes(
        "LOCAL_FIRST_REFRESH_IN_FLIGHT"
    )
) {

    const hotCacheMarker =
        "const currentMonthHotSalesCache =";

    if (
        count(
            sales,
            hotCacheMarker
        ) !== 1
    ) {
        throw new Error(
            "currentMonthHotSalesCache marker not found exactly once."
        );
    }

    sales =
        sales.replace(
            hotCacheMarker,
            `const LOCAL_FIRST_REFRESH_IN_FLIGHT =
    new Map();

${hotCacheMarker}`
        );
}

/* =========================================================
 * BACKGROUND CURRENT-DAY REFRESH
 * ========================================================= */

if (
    !sales.includes(
        "async function refreshLocalCurrentMonthInBackground"
    )
) {

    const getSalesMarker =
        "export async function getSales(";

    if (
        count(
            sales,
            getSalesMarker
        ) !== 1
    ) {
        throw new Error(
            "getSales declaration not found exactly once."
        );
    }

    const backgroundFunction = `async function refreshLocalCurrentMonthInBackground(
    {
        branchId,
        month,
        requestedFromDate,
        requestedToDate,
        connection
    }
) {

    const refreshKey =
        [
            Number(
                branchId
            ),
            month
        ].join("|");

    if (
        LOCAL_FIRST_REFRESH_IN_FLIGHT.has(
            refreshKey
        )
    ) {

        console.log(
            "[salesService] LOCAL-FIRST REFRESH JOIN " +
            refreshKey
        );

        return;
    }

    const request =
        (async () => {

            try {

                const range =
                    getSalesDateRange(
                        branchId
                    );

                const newestDate =
                    String(
                        range?.newest_date ||
                        ""
                    ).slice(
                        0,
                        10
                    );

                if (
                    !newestDate
                ) {
                    return;
                }

                /*
                 * Refresh only the newest local day.
                 * Never reload the complete month here.
                 */

                const refreshToDate =
                    addOneDayISO(
                        newestDate
                    );

                console.log(
                    "[salesService] LOCAL-FIRST BACKGROUND START " +
                    Number(
                        branchId
                    ) +
                    "|" +
                    newestDate +
                    "|" +
                    refreshToDate
                );

                const rows =
                    await queryPharmaFlySales({
                        branchId:
                            Number(
                                branchId
                            ),

                        fromDate:
                            newestDate,

                        toDate:
                            refreshToDate,

                        connection
                    });

                if (
                    Array.isArray(
                        rows
                    ) &&
                    rows.length > 0
                ) {

                    saveSalesRows({
                        branchId:
                            Number(
                                branchId
                            ),

                        rows
                    });

                }

                const monthRows =
                    getSalesMonthRows({
                        branchId:
                            Number(
                                branchId
                            ),

                        month
                    });

                const requestedRows =
                    filterRowsByDate(
                        monthRows,
                        requestedFromDate,
                        requestedToDate
                    );

                const requestedKey =
                    buildSalesCacheKey({
                        branchId:
                            Number(
                                branchId
                            ),

                        fromDate:
                            requestedFromDate,

                        toDate:
                            requestedToDate
                    });

                setCachedSales(
                    requestedKey,
                    requestedRows
                );

                currentMonthHotSalesCache.set(
                    requestedKey,
                    {
                        createdAt:
                            Date.now(),

                        rows:
                            requestedRows
                    }
                );

                console.log(
                    "[salesService] LOCAL-FIRST BACKGROUND DONE " +
                    requestedKey +
                    " -> " +
                    requestedRows.length +
                    " rows"
                );

            }
            catch (
                error
            ) {

                console.error(
                    "[salesService] LOCAL-FIRST BACKGROUND FAILED:",
                    error
                );

            }
            finally {

                LOCAL_FIRST_REFRESH_IN_FLIGHT.delete(
                    refreshKey
                );

            }

        })();

    LOCAL_FIRST_REFRESH_IN_FLIGHT.set(
        refreshKey,
        request
    );

}
`;

    sales =
        sales.replace(
            getSalesMarker,
            backgroundFunction +
            "\n" +
            getSalesMarker
        );
}

/* =========================================================
 * INSERT LOCAL-FIRST INTO EXISTING getSales WRAPPER
 * ========================================================= */

const localFirstMarker =
    "    /*\n" +
    "     * =====================================================\n" +
    "     * NORMAL EXISTING CORE\n";

if (
    !sales.includes(
        localFirstMarker
    )
) {

    const coreCallMarker =
        "    const rows =\n" +
        "        await getSalesCore({";

    if (
        count(
            sales,
            coreCallMarker
        ) !== 1
    ) {
        throw new Error(
            "getSalesCore call marker not found exactly once."
        );
    }

    const localFirstBlock = `    /*
     * =====================================================
     * LOCAL SQLITE FIRST
     * =====================================================
     *
     * A locally stored month is immediately available.
     * SQL is used only for a lightweight background refresh
     * of the newest local day for the current month.
     */

    const isSingleMonth =
        normalizedFromDate.slice(
            0,
            7
        ) ===
        normalizedToDate.slice(
            0,
            7
        );

    if (
        !forceRefresh &&
        isSingleMonth
    ) {

        const month =
            normalizedFromDate.slice(
                0,
                7
            );

        try {

            const localRows =
                getSalesMonthRows({
                    branchId:
                        numericBranchId,

                    month
                });

            if (
                Array.isArray(
                    localRows
                ) &&
                localRows.length > 0
            ) {

                const requestedRows =
                    filterRowsByDate(
                        localRows,
                        normalizedFromDate,
                        normalizedToDate
                    );

                setCachedSales(
                    key,
                    requestedRows
                );

                if (
                    isCurrentMonth
                ) {

                    currentMonthHotSalesCache.set(
                        key,
                        {
                            createdAt:
                                Date.now(),

                            rows:
                                requestedRows
                        }
                    );

                    void
                    refreshLocalCurrentMonthInBackground({
                        branchId:
                            numericBranchId,

                        month,

                        requestedFromDate:
                            normalizedFromDate,

                        requestedToDate:
                            normalizedToDate,

                        connection
                    });

                }

                console.log(
                    "[salesService] LOCAL SQLITE DIRECT HIT " +
                    key +
                    " -> " +
                    requestedRows.length +
                    " rows"
                );

                return requestedRows;
            }

        }
        catch (
            error
        ) {

            console.error(
                "[salesService] LOCAL SQLITE DIRECT READ FAILED " +
                key +
                ":",
                error
            );

        }
    }

`;

    sales =
        sales.replace(
            coreCallMarker,
            localFirstBlock +
            coreCallMarker
        );
}

write(
    salesPath,
    sales
);

console.log(
    "[PATCH] salesService local-first enabled."
);

console.log("");
console.log(
    "Local-first sales optimization completed."
);