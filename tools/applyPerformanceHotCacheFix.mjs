import fs from "node:fs";

const salesPath =
    "electron/pharmfly/sales/salesService.js";

const sellerPerformancePath =
    "electron/pharmfly/sellerPerformanceService.js";

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function write(file, text) {
    fs.writeFileSync(file, text, "utf8");
}

function count(text, value) {
    return text.split(value).length - 1;
}

/* =========================================================
 * SALES HOT CACHE
 * ========================================================= */

let sales = read(salesPath);

if (!sales.includes("CURRENT_MONTH_HOT_CACHE_TTL_MS")) {

    const versionMarker =
        'const SALES_CACHE_VERSION = "sales-v11";';

    if (count(sales, versionMarker) !== 1) {
        throw new Error(
            "SALES_CACHE_VERSION marker not found exactly once."
        );
    }

    sales = sales.replace(
        versionMarker,
        versionMarker +
        `

const CURRENT_MONTH_HOT_CACHE_TTL_MS =
    15 * 1000;

const currentMonthHotSalesCache =
    new Map();
`
    );

    const originalDeclaration =
        "export async function getSales(";

    if (count(sales, originalDeclaration) !== 1) {
        throw new Error(
            "getSales declaration not found exactly once."
        );
    }

    sales = sales.replace(
        originalDeclaration,
        "async function getSalesCore("
    );

    const previewMarker =
        "\n\nexport async function getSalesPreview(";

    if (count(sales, previewMarker) !== 1) {
        throw new Error(
            "getSalesPreview marker not found exactly once."
        );
    }

    const hotCacheWrapper = `

export async function getSales(
    {
        branchId,
        fromDate,
        toDate,
        connection = null,
        forceRefresh = false
    }
) {

    const numericBranchId =
        normalizeBranchId(
            branchId
        );

    const dateRange =
        createDateRange(
            fromDate,
            toDate
        );

    const normalizedFromDate =
        dateRange.fromDate;

    const normalizedToDate =
        dateRange.toDate;

    const isCurrentMonthRange =
        rangeTouchesCurrentMonth(
            normalizedFromDate,
            normalizedToDate
        );

    if (
        !forceRefresh &&
        isCurrentMonthRange
    ) {

        const key =
            buildSalesCacheKey({
                branchId:
                    numericBranchId,
                fromDate:
                    normalizedFromDate,
                toDate:
                    normalizedToDate
            });

        const entry =
            currentMonthHotSalesCache.get(
                key
            );

        if (
            entry &&
            Array.isArray(entry.rows) &&
            Date.now() - entry.createdAt <=
                CURRENT_MONTH_HOT_CACHE_TTL_MS
        ) {

            console.log(
                "[salesService] CURRENT MONTH HOT CACHE HIT " +
                key
            );

            return entry.rows;
        }

        const rows =
            await getSalesCore({
                branchId:
                    numericBranchId,
                fromDate:
                    normalizedFromDate,
                toDate:
                    normalizedToDate,
                connection,
                forceRefresh:
                    false
            });

        if (Array.isArray(rows)) {

            currentMonthHotSalesCache.set(
                key,
                {
                    createdAt:
                        Date.now(),
                    rows
                }
            );

            console.log(
                "[salesService] CURRENT MONTH HOT CACHE SET " +
                key +
                " -> " +
                rows.length +
                " rows"
            );
        }

        return rows;
    }

    const rows =
        await getSalesCore({
            branchId:
                numericBranchId,
            fromDate:
                normalizedFromDate,
            toDate:
                normalizedToDate,
            connection,
            forceRefresh
        });

    return rows;
}
`;

    sales =
        sales.replace(
            previewMarker,
            hotCacheWrapper +
            previewMarker
        );

    write(
        salesPath,
        sales
    );

    console.log(
        "[PATCH] Sales hot cache added."
    );

}
else {

    console.log(
        "[PATCH] Sales hot cache already exists. Skipped."
    );

}

/* =========================================================
 * SELLER PERFORMANCE SHARED AGGREGATION CACHE
 * ========================================================= */

let sellerPerformance =
    read(
        sellerPerformancePath
    );

if (
    !sellerPerformance.includes(
        "SELLER_AGGREGATION_CACHE_TTL_MS"
    )
) {

    const cacheMarker =
        "const sellerPerformanceCache =";

    if (count(sellerPerformance, cacheMarker) !== 1) {
        throw new Error(
            "sellerPerformanceCache marker not found exactly once."
        );
    }

    sellerPerformance =
        sellerPerformance.replace(
            cacheMarker,
            `const SELLER_AGGREGATION_CACHE_TTL_MS =
    5 * 60 * 1000;

const sellerAggregationCache =
    new Map();

const sellerAggregationInFlight =
    new Map();

${cacheMarker}`
        );

    const originalLoader =
        "async function loadSellerMonthlyAggregation(";

    if (count(sellerPerformance, originalLoader) !== 1) {
        throw new Error(
            "loadSellerMonthlyAggregation declaration not found exactly once."
        );
    }

    sellerPerformance =
        sellerPerformance.replace(
            originalLoader,
            "async function loadSellerMonthlyAggregationCore("
        );

    const nameLoaderMarker =
        "\nasync function loadSellerName(";

    if (count(sellerPerformance, nameLoaderMarker) !== 1) {
        throw new Error(
            "loadSellerName marker not found exactly once."
        );
    }

    const aggregationWrapper = `

async function loadSellerMonthlyAggregation(
    {
        branchId,
        connection,
        fromDate,
        toDate
    }
) {

    const key =
        [
            Number(branchId),
            String(fromDate),
            String(toDate)
        ].join("|");

    const now =
        Date.now();

    const cached =
        sellerAggregationCache.get(
            key
        );

    if (
        cached &&
        now - cached.createdAt <=
            SELLER_AGGREGATION_CACHE_TTL_MS
    ) {

        console.log(
            "[sellerPerformanceService] AGGREGATION CACHE HIT " +
            key
        );

        return cached.data;
    }

    const existing =
        sellerAggregationInFlight.get(
            key
        );

    if (existing) {

        console.log(
            "[sellerPerformanceService] AGGREGATION IN-FLIGHT JOIN " +
            key
        );

        return existing;
    }

    const request =
        loadSellerMonthlyAggregationCore({
            branchId,
            connection,
            fromDate,
            toDate
        });

    sellerAggregationInFlight.set(
        key,
        request
    );

    try {

        const data =
            await request;

        sellerAggregationCache.set(
            key,
            {
                createdAt:
                    Date.now(),
                data
            }
        );

        console.log(
            "[sellerPerformanceService] AGGREGATION CACHE SET " +
            key
        );

        return data;

    }
    finally {

        sellerAggregationInFlight.delete(
            key
        );
    }
}
`;

    sellerPerformance =
        sellerPerformance.replace(
            nameLoaderMarker,
            aggregationWrapper +
            nameLoaderMarker
        );

    write(
        sellerPerformancePath,
        sellerPerformance
    );

    console.log(
        "[PATCH] Seller aggregation cache added."
    );

}
else {

    console.log(
        "[PATCH] Seller aggregation cache already exists. Skipped."
    );

}

console.log("");
console.log(
    "Performance patch completed successfully."
);
