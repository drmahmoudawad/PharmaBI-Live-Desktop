import { getAllSavedConnections } from "../../settings/connectionStore.js";
import { getBranchPool } from "../../connection/connectionManager.js";

const HISTORY_MONTHS_DEFAULT = 12;
const INVOICE_LIMIT_DEFAULT = 300;

function number(value) {
    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}

function round(value, decimals = 2) {
    const factor = 10 ** decimals;

    return Math.round(
        (number(value) + Number.EPSILON) * factor
    ) / factor;
}

function validateDate(
    value,
    fieldName
) {
    const text =
        String(value || "").trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {
        throw new Error(
            `Invalid ${fieldName}. Expected YYYY-MM-DD`
        );
    }

    const date =
        new Date(`${text}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime())
    ) {
        throw new Error(
            `Invalid ${fieldName}: ${text}`
        );
    }

    return text;
}

function addDay(dateText) {
    const date =
        new Date(`${dateText}T00:00:00Z`);

    date.setUTCDate(
        date.getUTCDate() + 1
    );

    return date
        .toISOString()
        .slice(0, 10);
}

function firstDayOfMonth(
    year,
    monthIndex
) {
    return new Date(
        Date.UTC(
            year,
            monthIndex,
            1
        )
    );
}

function monthKey(date) {
    return date
        .toISOString()
        .slice(0, 7);
}

function buildHistoryRange(
    toDate,
    historyMonths
) {
    const end =
        new Date(`${toDate}T00:00:00Z`);

    const start =
        firstDayOfMonth(
            end.getUTCFullYear(),
            end.getUTCMonth() -
                (historyMonths - 1)
        );

    return {
        fromDate:
            start
                .toISOString()
                .slice(0, 10),

        toDate
    };
}

function monthsBetween(
    fromDate,
    toDate
) {
    const start =
        new Date(`${fromDate}T00:00:00Z`);

    const end =
        new Date(`${toDate}T00:00:00Z`);

    const result = [];

    let cursor =
        firstDayOfMonth(
            start.getUTCFullYear(),
            start.getUTCMonth()
        );

    while (
        cursor <= end
    ) {
        result.push(
            monthKey(cursor)
        );

        cursor =
            firstDayOfMonth(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth() + 1
            );
    }

    return result;
}

function percentileRank(
    value,
    values
) {
    const clean =
        values
            .map(number)
            .filter(
                Number.isFinite
            )
            .sort(
                (a, b) => a - b
            );

    if (!clean.length) {
        return 50;
    }

    if (clean.length === 1) {
        return clean[0] > 0
            ? 100
            : 0;
    }

    const numericValue =
        number(value);

    let countBelowOrEqual = 0;

    for (
        const item
        of clean
    ) {
        if (
            item <= numericValue
        ) {
            countBelowOrEqual += 1;
        }
        else {
            break;
        }
    }

    return round(
        (
            countBelowOrEqual /
            clean.length
        ) * 100
    );
}

function recencyScore(
    daysSinceLastPurchase
) {
    const days =
        Math.max(
            0,
            number(daysSinceLastPurchase)
        );

    if (days <= 7) {
        return 100;
    }

    if (days <= 14) {
        return 90;
    }

    if (days <= 30) {
        return 75;
    }

    if (days <= 60) {
        return 55;
    }

    if (days <= 90) {
        return 35;
    }

    if (days <= 120) {
        return 20;
    }

    return 5;
}

function customerScoreLabel(
    score
) {
    if (score >= 90) {
        return "VIP";
    }

    if (score >= 75) {
        return "عميل قوي";
    }

    if (score >= 60) {
        return "عميل جيد";
    }

    if (score >= 40) {
        return "يحتاج تنشيط";
    }

    if (score >= 20) {
        return "معرض للفقد";
    }

    return "مفقود";
}

function customerAction(
    label
) {
    switch (label) {

        case "VIP":
            return "الحفاظ على العميل + عروض شخصية";

        case "عميل قوي":
            return "الحفاظ على العميل وزيادة التكرار";

        case "عميل جيد":
            return "تنمية العميل وزيادة قيمة السلة";

        case "يحتاج تنشيط":
            return "تنشيط العميل ودفعه لإعادة الشراء";

        case "معرض للفقد":
            return "حملة استرجاع للعميل";

        default:
            return "إعادة تنشيط العميل ومراجعته بشكل مباشر";
    }
}

function scoreReason({
    recencyScoreValue,
    frequencyScore,
    monetaryScore,
    consistencyScore,
    trendScoreValue,
    label
}) {
    const factors = [
        {
            name: "الحداثة",
            value: recencyScoreValue
        },
        {
            name: "التكرار",
            value: frequencyScore
        },
        {
            name: "القيمة",
            value: monetaryScore
        },
        {
            name: "الانتظام",
            value: consistencyScore
        },
        {
            name: "الاتجاه",
            value: trendScoreValue
        }
    ].sort(
        (a, b) =>
            a.value - b.value
    );

    const weakest =
        factors[0];

    if (!weakest) {
        return `تصنيف العميل: ${label}.`;
    }

    return (
        `تصنيف العميل: ${label}. ` +
        `العامل الأضعف حالياً هو ${weakest.name}، ` +
        `لذلك تم احتساب القرار التشغيلي بناءً على ذلك.`
    );
}

function resolveConnection(
    branchId,
    connection
) {
    if (
        connection &&
        typeof connection === "object" &&
        connection.server
    ) {
        return {
            ...connection,
            branchId:
                Number(branchId)
        };
    }

    const branches =
        getAllSavedConnections();

    const found =
        branches.find(
            item =>
                Number(
                    item?.branchId ??
                    item?.id
                ) ===
                Number(branchId)
        );

    if (!found) {
        throw new Error(
            `Branch ${branchId} connection was not found.`
        );
    }

    return found;
}

/*
 * =========================================================
 * CUSTOMER IDENTITY
 * =========================================================
 */

async function loadCustomerIdentity({
    pool,
    customerId
}) {
    const result =
        await pool
            .request()
            .input(
                "customerId",
                String(customerId)
            )
            .query(`
                SET NOCOUNT ON;

                SELECT TOP (1)

                    CONVERT(
                        nvarchar(100),
                        c.Id
                    ) AS customer_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ) AS customer_name

                FROM dbo.Cards c

                WHERE
                    CONVERT(
                        nvarchar(100),
                        c.Id
                    ) = @customerId

                AND
                    ISNULL(
                        c.IsCustomer,
                        0
                    ) = 1;
            `);

    const row =
        result?.recordset?.[0];

    return {
        customerId:
            String(
                row?.customer_id ??
                customerId
            ).trim(),

        customerName:
            String(
                row?.customer_name ??
                ""
            ).trim()
    };
}

/*
 * =========================================================
 * CUSTOMER MONTHLY DATA
 * =========================================================
 */

async function loadCustomerMonthlyData({
    pool,
    customerId,
    fromDate,
    toDate
}) {
    const result =
        await pool
            .request()
            .input(
                "customerId",
                String(customerId)
            )
            .input(
                "fromDate",
                `${fromDate} 00:00:00`
            )
            .input(
                "toDateExclusive",
                `${addDay(toDate)} 00:00:00`
            )
            .query(`
                SET NOCOUNT ON;

                SELECT

                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ) AS customer_id,

                    CONVERT(
                        char(7),
                        t.ztime,
                        23
                    ) AS month_key,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN t.ID
                        END
                    ) AS invoice_count,

                    SUM(
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) = 2
                            THEN
                                -ABS(
                                    ISNULL(
                                        t.Total,
                                        0
                                    )
                                )

                            ELSE
                                ISNULL(
                                    t.Total,
                                    0
                                )
                        END
                    ) AS sales_value,

                    MIN(
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN t.ztime
                        END
                    ) AS first_purchase,

                    MAX(
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN t.ztime
                        END
                    ) AS last_purchase

                FROM dbo.posTickets t

                WHERE
                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ) = @customerId

                AND
                    t.ztime >= @fromDate

                AND
                    t.ztime < @toDateExclusive

                GROUP BY

                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ),

                    CONVERT(
                        char(7),
                        t.ztime,
                        23
                    )

                ORDER BY
                    month_key;
            `);

    return (
        result?.recordset ||
        []
    );
}

/*
 * =========================================================
 * CUSTOMER BENCHMARK
 * =========================================================
 */

async function loadCustomerBenchmarkData({
    pool,
    fromDate,
    toDate
}) {
    const result =
        await pool
            .request()
            .input(
                "fromDate",
                `${fromDate} 00:00:00`
            )
            .input(
                "toDateExclusive",
                `${addDay(toDate)} 00:00:00`
            )
            .query(`
                SET NOCOUNT ON;

                SELECT

                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ) AS customer_id,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN t.ID
                        END
                    ) AS invoice_count,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN
                                CONVERT(
                                    char(7),
                                    t.ztime,
                                    23
                                )
                        END
                    ) AS active_months,

                    SUM(
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) = 2
                            THEN
                                -ABS(
                                    ISNULL(
                                        t.Total,
                                        0
                                    )
                                )

                            ELSE
                                ISNULL(
                                    t.Total,
                                    0
                                )
                        END
                    ) AS sales_value,

                    MAX(
                        CASE
                            WHEN ISNULL(
                                t.SalesReturn,
                                0
                            ) <> 2
                            THEN t.ztime
                        END
                    ) AS last_purchase

                FROM dbo.posTickets t

                WHERE
                    t.CustomerID IS NOT NULL

                AND
                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ) NOT IN (
                        N'',
                        N'0'
                    )

                AND
                    t.ztime >= @fromDate

                AND
                    t.ztime < @toDateExclusive

                GROUP BY
                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    );
            `);

    return (
        result?.recordset ||
        []
    );
}

/*
 * =========================================================
 * MONTHLY ROWS
 * =========================================================
 */

function buildMonthlyRows(
    rows,
    monthsList
) {
    const byMonth =
        new Map();

    for (
        const row
        of rows
    ) {
        const month =
            String(
                row?.month_key ??
                ""
            ).slice(0, 7);

        if (!month) {
            continue;
        }

        const invoiceCount =
            number(
                row?.invoice_count
            );

        const sales =
            round(
                row?.sales_value
            );

        byMonth.set(
            month,
            {
                month,

                sales,

                invoices:
                    invoiceCount,

                averageInvoice:
                    invoiceCount
                        ? round(
                            sales /
                            invoiceCount
                        )
                        : 0,

                firstPurchase:
                    row?.first_purchase ??
                    null,

                lastPurchase:
                    row?.last_purchase ??
                    null
            }
        );
    }

    return monthsList.map(
        month =>
            byMonth.get(
                month
            ) || {
                month,
                sales: 0,
                invoices: 0,
                averageInvoice: 0,
                firstPurchase: null,
                lastPurchase: null
            }
    );
}

/*
 * =========================================================
 * RECENCY
 * =========================================================
 */

function daysSinceLastPurchase(
    toDate,
    lastPurchase
) {
    if (!lastPurchase) {
        return 9999;
    }

    const purchaseDate =
        new Date(
            lastPurchase
        );

    const end =
        new Date(
            `${toDate}T23:59:59Z`
        );

    if (
        Number.isNaN(
            purchaseDate.getTime()
        )
    ) {
        return 9999;
    }

    return Math.max(
        0,
        Math.floor(
            (
                end.getTime() -
                purchaseDate.getTime()
            ) /
            86400000
        )
    );
}

/*
 * =========================================================
 * BUILD CUSTOMER SCORE
 * =========================================================
 */

function buildCustomerProfile({
    customerId,
    customerName,
    monthly,
    benchmarkRows,
    toDate,
    historyMonths
}) {
    const eligibleMonths =
        Math.max(
            1,
            monthly.length
        );

    const activeMonths =
        monthly.filter(
            row =>
                number(
                    row.invoices
                ) > 0
        ).length;

    const totalSales =
        monthly.reduce(
            (sum, row) =>
                sum +
                number(row.sales),
            0
        );

    const totalInvoices =
        monthly.reduce(
            (sum, row) =>
                sum +
                number(row.invoices),
            0
        );

    const firstPurchases =
        monthly
            .map(
                row =>
                    row.firstPurchase
            )
            .filter(Boolean);

    const lastPurchases =
        monthly
            .map(
                row =>
                    row.lastPurchase
            )
            .filter(Boolean);

    const firstPurchase =
        firstPurchases.length
            ? firstPurchases.sort(
                (a, b) =>
                    new Date(a).getTime() -
                    new Date(b).getTime()
            )[0]
            : null;

    const lastPurchase =
        lastPurchases.length
            ? lastPurchases.sort(
                (a, b) =>
                    new Date(b).getTime() -
                    new Date(a).getTime()
            )[0]
            : null;

    const daysSince =
        daysSinceLastPurchase(
            toDate,
            lastPurchase
        );

    const frequencyRate =
        totalInvoices /
        eligibleMonths;

    const monetaryValues =
        benchmarkRows.map(
            row =>
                number(
                    row.sales_value
                )
        );

    const frequencyValues =
        benchmarkRows.map(
            row =>
                number(
                    row.invoice_count
                ) /
                eligibleMonths
        );

    const recencyScoreValue =
        recencyScore(
            daysSince
        );

    const frequencyScore =
        percentileRank(
            frequencyRate,
            frequencyValues
        );

    const monetaryScore =
        percentileRank(
            totalSales,
            monetaryValues
        );

    const consistencyScore =
        round(
            (
                activeMonths /
                eligibleMonths
            ) *
            100
        );

    const recentMonths =
        monthly.slice(-3);

    const previousMonths =
        monthly.slice(-6, -3);

    const recentSales =
        recentMonths.reduce(
            (sum, row) =>
                sum +
                number(row.sales),
            0
        );

    const previousSales =
        previousMonths.reduce(
            (sum, row) =>
                sum +
                number(row.sales),
            0
        );

    let trendChange = 0;

    if (
        previousSales !== 0
    ) {
        trendChange =
            (
                recentSales -
                previousSales
            ) /
            Math.abs(
                previousSales
            );
    }
    else if (
        recentSales > 0
    ) {
        trendChange = 1;
    }

    const trendScoreValue =
        round(
            Math.max(
                0,
                Math.min(
                    100,
                    50 +
                    trendChange *
                    50
                )
            )
        );

    const score =
        round(
            recencyScoreValue *
                0.30 +

            frequencyScore *
                0.25 +

            monetaryScore *
                0.25 +

            consistencyScore *
                0.10 +

            trendScoreValue *
                0.10
        );

    const label =
        customerScoreLabel(
            score
        );

    const action =
        customerAction(
            label
        );

    return {
        success: true,

        customerId,

        customerName:
            customerName ||
            customerId,

        historyMonths,

        fromDate:
            monthly[0]?.month
                ? `${monthly[0].month}-01`
                : null,

        toDate,

        score,

        healthScore:
            score,

        customerScore:
            score,

        scoreLabel:
            label,

        label,

        healthLabel:
            label,

        recommendedAction:
            action,

        action,

        reason:
            scoreReason({
                recencyScoreValue,
                frequencyScore,
                monetaryScore,
                consistencyScore,
                trendScoreValue,
                label
            }),

        metrics: {
            totalSales:
                round(
                    totalSales
                ),

            invoices:
                totalInvoices,

            invoiceCount:
                totalInvoices,

            averageInvoice:
                totalInvoices
                    ? round(
                        totalSales /
                        totalInvoices
                    )
                    : 0,

            avgInvoice:
                totalInvoices
                    ? round(
                        totalSales /
                        totalInvoices
                    )
                    : 0,

            activeMonths,

            daysSinceLastPurchase:
                daysSince,

            firstPurchase,

            lastPurchase,

            monetary:
                round(
                    totalSales
                ),

            frequency:
                totalInvoices,

            recencyDays:
                daysSince,

            consistency:
                consistencyScore,

            trend:
                trendChange
        },

        factors: [
            {
                key: "recency",
                value: daysSince,
                score:
                    recencyScoreValue,
                weight: 30
            },

            {
                key: "frequency",
                value: frequencyRate,
                score:
                    frequencyScore,
                weight: 25
            },

            {
                key: "monetary",
                value: totalSales,
                score:
                    monetaryScore,
                weight: 25
            },

            {
                key: "consistency",
                value: activeMonths,
                score:
                    consistencyScore,
                weight: 10
            },

            {
                key: "trend",
                value: trendChange,
                score:
                    trendScoreValue,
                weight: 10
            }
        ],

        monthly
    };
}

/*
 * =========================================================
 * CUSTOMER INVOICE LIST
 * =========================================================
 *
 * IMPORTANT:
 *
 * Seller:
 *     posTickets.PinNumber
 *         ->
 *     Cards.ID
 *         ->
 *     Cards.Name
 *
 * NOT SalesRepID.
 *
 * =========================================================
 */

async function loadCustomerInvoices({
    pool,
    customerId,
    toDate,
    invoiceLimit
}) {
    const normalizedLimit =
        Math.max(
            1,
            Math.min(
                1000,
                Number(invoiceLimit) ||
                    INVOICE_LIMIT_DEFAULT
            )
        );

    const result =
        await pool
            .request()
            .input(
                "customerId",
                String(customerId)
            )
            .input(
                "toDateExclusive",
                `${addDay(toDate)} 00:00:00`
            )
            .input(
                "invoiceLimit",
                normalizedLimit
            )
            .query(`
                SET NOCOUNT ON;

                SELECT TOP (@invoiceLimit)

                    t.ID
                        AS ticket_id,

                    COALESCE(
                        NULLIF(
                            LTRIM(
                                RTRIM(
                                    CONVERT(
                                        nvarchar(200),
                                        t.InvoiceCode
                                    )
                                )
                            ),
                            N''
                        ),
                        CONVERT(
                            nvarchar(100),
                            t.ID
                        )
                    )
                        AS invoice_code,

                    t.InvoiceDate
                        AS invoice_date,

                    t.ztime
                        AS sale_time,

                    t.CustomerID
                        AS customer_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                customerCard.Name
                            )
                        )
                    )
                        AS customer_name,

                    t.PinNumber
                        AS seller_pin,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                sellerCard.Name
                            )
                        )
                    )
                        AS seller_name,

                    t.StoreID
                        AS store_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                store.Name
                            )
                        )
                    )
                        AS store_name,

                    t.SalesReturn
                        AS sales_return,

                    CASE
                        WHEN ISNULL(
                            t.SalesReturn,
                            0
                        ) = 2
                        THEN N'RETURN'
                        ELSE N'SALE'
                    END
                        AS transaction_type,

                    ISNULL(
                        t.Total,
                        0
                    )
                        AS invoice_total,

                    ISNULL(
                        t.SubTotal,
                        0
                    )
                        AS invoice_subtotal,

                    ISNULL(
                        t.Discount,
                        0
                    )
                        AS invoice_discount,

                    ISNULL(
                        t.DiscountOnItems,
                        0
                    )
                        AS invoice_discount_on_items,

                    ISNULL(
                        t.DiscountPercent,
                        0
                    )
                        AS invoice_discount_percent,

                    ISNULL(
                        t.SalesTax,
                        0
                    )
                        AS sales_tax,

                    ISNULL(
                        t.SalesTaxValue,
                        0
                    )
                        AS sales_tax_value,

                    ISNULL(
                        t.PaidByCustomer,
                        0
                    )
                        AS paid_by_customer,

                    ISNULL(
                        t.xPaid,
                        0
                    )
                        AS x_paid,

                    ISNULL(
                        t.NewBalance,
                        0
                    )
                        AS new_balance

                FROM dbo.posTickets t

                LEFT JOIN dbo.Cards customerCard
                    ON customerCard.Id =
                       t.CustomerID

                LEFT JOIN dbo.Cards sellerCard
                    ON sellerCard.Id =
                       t.PinNumber

                    AND ISNULL(
                        sellerCard.IsEmployee,
                        0
                    ) = 1

                LEFT JOIN dbo.Stores store
                    ON store.ID =
                       t.StoreID

                WHERE
                    CONVERT(
                        nvarchar(100),
                        t.CustomerID
                    ) = @customerId

                AND
                    t.ztime <
                    @toDateExclusive

                ORDER BY
                    t.ztime DESC,
                    t.ID DESC;
            `);

    return (
        result?.recordset ||
        []
    )
        .map(
            row => ({
                ticketId:
                    String(
                        row?.ticket_id ??
                        ""
                    ).trim(),

                invoiceCode:
                    String(
                        row?.invoice_code ??
                        row?.ticket_id ??
                        ""
                    ).trim(),

                invoiceNumber:
                    String(
                        row?.invoice_code ??
                        row?.ticket_id ??
                        ""
                    ).trim(),

                invoiceDate:
                    row?.invoice_date ??
                    null,

                date:
                    row?.invoice_date ??
                    row?.sale_time ??
                    null,

                ztime:
                    row?.sale_time ??
                    null,

                customerId:
                    row?.customer_id == null
                        ? null
                        : String(
                            row.customer_id
                        ).trim(),

                customerName:
                    String(
                        row?.customer_name ??
                        ""
                    ).trim(),

                sellerPin:
                    row?.seller_pin == null
                        ? null
                        : String(
                            row.seller_pin
                        ).trim(),

                sellerName:
                    String(
                        row?.seller_name ??
                        ""
                    ).trim(),

                storeId:
                    row?.store_id == null
                        ? null
                        : String(
                            row.store_id
                        ).trim(),

                storeName:
                    String(
                        row?.store_name ??
                        ""
                    ).trim(),

                salesReturn:
                    number(
                        row?.sales_return
                    ),

                transactionType:
                    String(
                        row?.transaction_type ??
                        "SALE"
                    ),

                type:
                    String(
                        row?.transaction_type ??
                        "SALE"
                    ),

                total:
                    round(
                        row?.invoice_total
                    ),

                invoiceTotal:
                    round(
                        row?.invoice_total
                    ),

                subtotal:
                    round(
                        row?.invoice_subtotal
                    ),

                discount:
                    round(
                        row?.invoice_discount
                    ),

                discountOnItems:
                    round(
                        row?.invoice_discount_on_items
                    ),

                discountPercent:
                    round(
                        row?.invoice_discount_percent
                    ),

                salesTax:
                    round(
                        row?.sales_tax
                    ),

                salesTaxValue:
                    round(
                        row?.sales_tax_value
                    ),

                paidByCustomer:
                    round(
                        row?.paid_by_customer
                    ),

                xPaid:
                    round(
                        row?.x_paid
                    ),

                newBalance:
                    round(
                        row?.new_balance
                    )
            })
        );
}

/*
 * =========================================================
 * SINGLE INVOICE DETAILS
 * =========================================================
 */

async function loadCustomerInvoiceDetails({
    pool,
    ticketId
}) {
    const headerResult =
        await pool
            .request()
            .input(
                "ticketId",
                String(ticketId)
            )
            .query(`
                SET NOCOUNT ON;

                SELECT TOP (1)

                    t.ID
                        AS ticket_id,

                    COALESCE(
                        NULLIF(
                            LTRIM(
                                RTRIM(
                                    CONVERT(
                                        nvarchar(200),
                                        t.InvoiceCode
                                    )
                                )
                            ),
                            N''
                        ),
                        CONVERT(
                            nvarchar(100),
                            t.ID
                        )
                    )
                        AS invoice_code,

                    t.InvoiceDate
                        AS invoice_date,

                    t.ztime
                        AS sale_time,

                    t.CustomerID
                        AS customer_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                customerCard.Name
                            )
                        )
                    )
                        AS customer_name,

                    t.PinNumber
                        AS seller_pin,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                sellerCard.Name
                            )
                        )
                    )
                        AS seller_name,

                    t.StoreID
                        AS store_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                store.Name
                            )
                        )
                    )
                        AS store_name,

                    t.SalesReturn
                        AS sales_return,

                    CASE
                        WHEN ISNULL(
                            t.SalesReturn,
                            0
                        ) = 2
                        THEN N'RETURN'
                        ELSE N'SALE'
                    END
                        AS transaction_type,

                    ISNULL(
                        t.Total,
                        0
                    )
                        AS invoice_total,

                    ISNULL(
                        t.SubTotal,
                        0
                    )
                        AS invoice_subtotal,

                    ISNULL(
                        t.Discount,
                        0
                    )
                        AS invoice_discount,

                    ISNULL(
                        t.DiscountOnItems,
                        0
                    )
                        AS invoice_discount_on_items,

                    ISNULL(
                        t.DiscountPercent,
                        0
                    )
                        AS invoice_discount_percent,

                    ISNULL(
                        t.SalesTax,
                        0
                    )
                        AS sales_tax,

                    ISNULL(
                        t.SalesTaxValue,
                        0
                    )
                        AS sales_tax_value,

                    ISNULL(
                        t.PaidByCustomer,
                        0
                    )
                        AS paid_by_customer,

                    ISNULL(
                        t.xPaid,
                        0
                    )
                        AS x_paid,

                    ISNULL(
                        t.NewBalance,
                        0
                    )
                        AS new_balance

                FROM dbo.posTickets t

                LEFT JOIN dbo.Cards customerCard
                    ON customerCard.Id =
                       t.CustomerID

                LEFT JOIN dbo.Cards sellerCard
                    ON sellerCard.Id =
                       t.PinNumber

                    AND ISNULL(
                        sellerCard.IsEmployee,
                        0
                    ) = 1

                LEFT JOIN dbo.Stores store
                    ON store.ID =
                       t.StoreID

                WHERE
                    CONVERT(
                        nvarchar(100),
                        t.ID
                    ) = @ticketId;
            `);

    const header =
        headerResult?.recordset?.[0];

    if (!header) {
        throw new Error(
            `Invoice ${ticketId} was not found.`
        );
    }

    const linesResult =
        await pool
            .request()
            .input(
                "ticketId",
                String(ticketId)
            )
            .query(`
                SET NOCOUNT ON;

                SELECT

                    p.ID
                        AS line_id,

                    p.ItemID
                        AS item_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(500),
                                i.name
                            )
                        )
                    )
                        AS item_name,

                    p.Packs
                        AS packs,

                    p.Units
                        AS units,

                    p.iParts
                        AS item_parts,

                    i.Parts
                        AS master_parts,

                    p.Bonus
                        AS bonus,

                    p.SalesPrice
                        AS sales_price,

                    p.Cost
                        AS cost_price,

                    p.Discount
                        AS item_discount,

                    p.ExtraDiscount
                        AS extra_discount,

                    p.Tax
                        AS tax_value,

                    p.SalesTaxPerPiece
                        AS sales_tax_per_piece,

                    p.IsContent
                        AS is_content,

                    p.StoreID
                        AS store_id,

                    p.ExpDate
                        AS expiry_date

                FROM dbo.posItems p

                LEFT JOIN dbo.Items i
                    ON i.ID =
                       p.ItemID

                WHERE
                    CONVERT(
                        nvarchar(100),
                        p.TicketID
                    ) = @ticketId

                ORDER BY
                    p.ID ASC;
            `);

    const lines =
        (
            linesResult?.recordset ||
            []
        )
            .map(
                row => {

                    const packs =
                        number(
                            row?.packs
                        );

                    const units =
                        number(
                            row?.units
                        );

                    const iParts =
                        number(
                            row?.item_parts
                        );

                    const masterParts =
                        number(
                            row?.master_parts
                        );

                    const packageParts =
                        iParts > 0
                            ? iParts
                            : masterParts;

                    const baseUnits =
                        packs *
                        packageParts +
                        units;

                    const salesPrice =
                        number(
                            row?.sales_price
                        );

                    const unitPrice =
                        packageParts > 0
                            ? salesPrice /
                              packageParts
                            : salesPrice;

                    const grossValue =
                        baseUnits *
                        unitPrice;

                    const discount =
                        number(
                            row?.item_discount
                        );

                    const extraDiscount =
                        number(
                            row?.extra_discount
                        );

                    const netValue =
                        grossValue -
                        discount -
                        extraDiscount;

                    return {
                        lineId:
                            String(
                                row?.line_id ??
                                ""
                            ).trim(),

                        itemId:
                            row?.item_id == null
                                ? null
                                : String(
                                    row.item_id
                                ).trim(),

                        itemName:
                            String(
                                row?.item_name ??
                                ""
                            ).trim(),

                        /*
                         * RAW PHARMAFLY QUANTITY
                         *
                         * Packs =
                         *     full packages.
                         *
                         * Units =
                         *     partial/package parts sold.
                         *
                         * iParts =
                         *     parts inside one package.
                         */

                        packs,

                        units,

                        iParts,

                        itemParts:
                            masterParts,

                        parts:
                            packageParts,

                        bonus:
                            number(
                                row?.bonus
                            ),

                        salesPrice:
                            round(
                                salesPrice
                            ),

                        unitPrice:
                            round(
                                unitPrice
                            ),

                        costPrice:
                            round(
                                row?.cost_price
                            ),

                        discount:
                            round(
                                discount
                            ),

                        extraDiscount:
                            round(
                                extraDiscount
                            ),

                        tax:
                            round(
                                row?.tax_value
                            ),

                        salesTaxPerPiece:
                            round(
                                row?.sales_tax_per_piece
                            ),

                        isContent:
                            Boolean(
                                row?.is_content
                            ),

                        storeId:
                            row?.store_id == null
                                ? null
                                : String(
                                    row.store_id
                                ).trim(),

                        expiryDate:
                            row?.expiry_date ??
                            null,

                        baseUnits:
                            round(
                                baseUnits
                            ),

                        grossValue:
                            round(
                                grossValue
                            ),

                        netValue:
                            round(
                                netValue
                            )
                    };
                }
            );

    const total =
        round(
            header?.invoice_total
        );

    const subtotal =
        round(
            header?.invoice_subtotal
        );

    const discount =
        round(
            header?.invoice_discount
        );

    const discountOnItems =
        round(
            header?.invoice_discount_on_items
        );

    const salesTaxValue =
        round(
            header?.sales_tax_value
        );

    const lineNet =
        round(
            lines.reduce(
                (sum, row) =>
                    sum +
                    number(
                        row.netValue
                    ),
                0
            )
        );

    return {
        success: true,

        header: {
            ticketId:
                String(
                    header?.ticket_id ??
                    ""
                ).trim(),

            invoiceCode:
                String(
                    header?.invoice_code ??
                    header?.ticket_id ??
                    ""
                ).trim(),

            invoiceNumber:
                String(
                    header?.invoice_code ??
                    header?.ticket_id ??
                    ""
                ).trim(),

            invoiceDate:
                header?.invoice_date ??
                null,

            date:
                header?.invoice_date ??
                header?.sale_time ??
                null,

            ztime:
                header?.sale_time ??
                null,

            customerId:
                header?.customer_id == null
                    ? null
                    : String(
                        header.customer_id
                    ).trim(),

            customerName:
                String(
                    header?.customer_name ??
                    ""
                ).trim(),

            sellerPin:
                header?.seller_pin == null
                    ? null
                    : String(
                        header.seller_pin
                    ).trim(),

            sellerName:
                String(
                    header?.seller_name ??
                    ""
                ).trim(),

            storeId:
                header?.store_id == null
                    ? null
                    : String(
                        header.store_id
                    ).trim(),

            storeName:
                String(
                    header?.store_name ??
                    ""
                ).trim(),

            salesReturn:
                number(
                    header?.sales_return
                ),

            transactionType:
                String(
                    header?.transaction_type ??
                    "SALE"
                ),

            type:
                String(
                    header?.transaction_type ??
                    "SALE"
                ),

            total,

            invoiceTotal:
                total,

            subtotal,

            discount,

            discountOnItems,

            discountPercent:
                round(
                    header?.invoice_discount_percent
                ),

            salesTax:
                round(
                    header?.sales_tax
                ),

            salesTaxValue,

            paidByCustomer:
                round(
                    header?.paid_by_customer
                ),

            xPaid:
                round(
                    header?.x_paid
                ),

            newBalance:
                round(
                    header?.new_balance
                )
        },

        lines,

        totals: {
            total,
            subtotal,
            discount,
            discountOnItems,
            salesTaxValue,
            netValue:
                lineNet,
            netTotal:
                lineNet
        }
    };
}

/*
 * =========================================================
 * CUSTOMER PERFORMANCE
 * =========================================================
 */

export async function getCustomerPerformance({
    branchId,
    customerId,
    toDate,
    connection = null,
    historyMonths =
        HISTORY_MONTHS_DEFAULT,
    invoiceLimit =
        INVOICE_LIMIT_DEFAULT
}) {
    const numericBranchId =
        Number(branchId);

    if (
        !Number.isInteger(
            numericBranchId
        ) ||
        numericBranchId <= 0
    ) {
        throw new Error(
            "Invalid branchId"
        );
    }

    const normalizedCustomerId =
        String(
            customerId ?? ""
        ).trim();

    if (
        !normalizedCustomerId ||
        normalizedCustomerId === "0"
    ) {
        throw new Error(
            "Invalid customerId"
        );
    }

    const endDate =
        validateDate(
            toDate,
            "toDate"
        );

    const months =
        Number.isInteger(
            Number(historyMonths)
        )
            ? Math.max(
                1,
                Math.min(
                    24,
                    Number(historyMonths)
                )
            )
            : HISTORY_MONTHS_DEFAULT;

    const historyRange =
        buildHistoryRange(
            endDate,
            months
        );

    const branchConnection =
        resolveConnection(
            numericBranchId,
            connection
        );

    const pool =
        await getBranchPool(
            numericBranchId,
            branchConnection
        );

    const [
        identity,
        customerRows,
        benchmarkRows,
        invoices
    ] =
        await Promise.all([

            loadCustomerIdentity({
                pool,
                customerId:
                    normalizedCustomerId
            }),

            loadCustomerMonthlyData({
                pool,
                customerId:
                    normalizedCustomerId,
                fromDate:
                    historyRange.fromDate,
                toDate:
                    historyRange.toDate
            }),

            loadCustomerBenchmarkData({
                pool,
                fromDate:
                    historyRange.fromDate,
                toDate:
                    historyRange.toDate
            }),

            loadCustomerInvoices({
                pool,
                customerId:
                    normalizedCustomerId,
                toDate:
                    endDate,
                invoiceLimit
            })

        ]);

    const monthsList =
        monthsBetween(
            historyRange.fromDate,
            historyRange.toDate
        );

    const monthly =
        buildMonthlyRows(
            customerRows,
            monthsList
        );

    const profile =
        buildCustomerProfile({
            customerId:
                normalizedCustomerId,

            customerName:
                identity.customerName,

            monthly,

            benchmarkRows,

            toDate:
                endDate,

            historyMonths:
                months
        });

    return {
        ...profile,

        branchId:
            numericBranchId,

        branchName:
            branchConnection.branchName ||
            `Branch ${numericBranchId}`,

        invoices,

        invoiceRows:
            invoices,

        totalInvoicesAvailable:
            invoices.length
    };
}

/*
 * =========================================================
 * CUSTOMER INVOICE DETAILS
 * =========================================================
 */

export async function getCustomerInvoiceDetails({
    branchId,
    ticketId,
    connection = null
}) {
    const numericBranchId =
        Number(branchId);

    if (
        !Number.isInteger(
            numericBranchId
        ) ||
        numericBranchId <= 0
    ) {
        throw new Error(
            "Invalid branchId"
        );
    }

    const normalizedTicketId =
        String(
            ticketId ?? ""
        ).trim();

    if (!normalizedTicketId) {
        throw new Error(
            "Invalid ticketId"
        );
    }

    const branchConnection =
        resolveConnection(
            numericBranchId,
            connection
        );

    const pool =
        await getBranchPool(
            numericBranchId,
            branchConnection
        );

    const details =
        await loadCustomerInvoiceDetails({
            pool,
            ticketId:
                normalizedTicketId
        });

    return {
        ...details,

        branchId:
            numericBranchId,

        branchName:
            branchConnection.branchName ||
            `Branch ${numericBranchId}`
    };
}

export default {
    getCustomerPerformance,
    getCustomerInvoiceDetails
};