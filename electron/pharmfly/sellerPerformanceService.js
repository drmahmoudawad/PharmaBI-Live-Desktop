import {
    getAllSavedConnections
} from "../settings/connectionStore.js";


import {
    getBranchPool
} from "../connection/connectionManager.js";


const HISTORY_MONTHS_DEFAULT = 12;

const SELLER_PERFORMANCE_CACHE_TTL_MS =
    60 *
    1000;


const sellerPerformanceCache =
    new Map();


function number(
    value
) {

    const result =
        Number(
            value
        );

    return Number.isFinite(
        result
    )
        ? result
        : 0;

}


function round(
    value,
    decimals = 2
) {

    const factor =
        10 ** decimals;

    return Math.round(
        (
            number(
                value
            ) +
            Number.EPSILON
        ) *
        factor
    ) / factor;

}


function validateDate(
    value,
    fieldName
) {

    const text =
        String(
            value ||
            ""
        ).trim();


    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {

        throw new Error(
            `Invalid ${fieldName}. Expected YYYY-MM-DD`
        );

    }


    const date =
        new Date(
            `${text}T00:00:00Z`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw new Error(
            `Invalid ${fieldName}: ${text}`
        );

    }


    return text;

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


function lastDayOfMonth(
    year,
    monthIndex
) {

    return new Date(
        Date.UTC(
            year,
            monthIndex + 1,
            0
        )
    );

}


function toDateText(
    date
) {

    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


function monthKey(
    date
) {

    return date
        .toISOString()
        .slice(
            0,
            7
        );

}


function daysCoveredInMonth(
    month,
    toDate
) {

    const [
        year,
        monthNumber
    ] =
        String(
            month
        )
        .split(
            "-"
        )
        .map(
            Number
        );


    const start =
        firstDayOfMonth(
            year,
            monthNumber - 1
        );


    const monthEnd =
        lastDayOfMonth(
            year,
            monthNumber - 1
        );


    const reportEnd =
        new Date(
            `${toDate}T00:00:00Z`
        );


    const effectiveEnd =
        Math.min(
            monthEnd.getTime(),
            reportEnd.getTime()
        );


    return Math.max(
        1,
        Math.floor(
            (
                effectiveEnd -
                start.getTime()
            ) /
            86400000
        ) +
        1
    );

}


function buildHistoryRange(
    toDate,
    historyMonths
) {

    const end =
        new Date(
            `${toDate}T00:00:00Z`
        );


    const start =
        firstDayOfMonth(
            end.getUTCFullYear(),
            end.getUTCMonth() -
                (
                    historyMonths -
                    1
                )
        );


    return {
        fromDate:
            toDateText(
                start
            ),

        toDate
    };

}


function buildMonthsList(
    endDate,
    historyMonths
) {

    const end =
        new Date(
            `${endDate}T00:00:00Z`
        );


    const start =
        firstDayOfMonth(
            end.getUTCFullYear(),
            end.getUTCMonth() -
                (
                    historyMonths -
                    1
                )
        );


    const months =
        [];


    let cursor =
        start;


    while (
        cursor <=
        end
    ) {

        months.push(
            monthKey(
                cursor
            )
        );


        cursor =
            firstDayOfMonth(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth() + 1
            );

    }


    return months;

}


function createMonthBucket(
    month
) {

    return {

        month,

        sales:
            0,

        invoices:
            0

    };

}


function getMonthlyMetrics(
    bucket,
    days
) {

    const sales =
        number(
            bucket?.sales
        );


    const invoices =
        number(
            bucket?.invoices
        );


    return {

        sales:
            round(
                sales
            ),

        invoices:
            invoices,

        averageDailySales:
            round(
                sales /
                Math.max(
                    1,
                    days
                )
            ),

        averageDailyInvoices:
            round(
                invoices /
                Math.max(
                    1,
                    days
                )
            ),

        averageInvoice:
            round(
                invoices
                    ? sales / invoices
                    : 0
            )

    };

}


function scoreMonth(
    metrics,
    maxMetrics
) {

    const salesPart =
        maxMetrics.averageDailySales > 0
            ? (
                metrics.averageDailySales /
                maxMetrics.averageDailySales
            ) *
            40
            : 0;


    const invoicesPart =
        maxMetrics.averageDailyInvoices > 0
            ? (
                metrics.averageDailyInvoices /
                maxMetrics.averageDailyInvoices
            ) *
            30
            : 0;


    const invoicePart =
        maxMetrics.averageInvoice > 0
            ? (
                metrics.averageInvoice /
                maxMetrics.averageInvoice
            ) *
            30
            : 0;


    return round(
        Math.max(
            0,
            Math.min(
                100,
                salesPart +
                invoicesPart +
                invoicePart
            )
        )
    );

}


function scoreLabel(
    score
) {

    if (
        score >= 90
    ) {

        return "ممتاز";

    }


    if (
        score >= 75
    ) {

        return "جيد جداً";

    }


    if (
        score >= 60
    ) {

        return "جيد";

    }


    return "يحتاج متابعة";

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
                Number(
                    branchId
                )

        };

    }


    const branches =
        getAllSavedConnections();


    const found =
        branches.find(
            item =>
                Number(
                    item?.branchId
                ) ===
                Number(
                    branchId
                )
        );


    if (
        !found
    ) {

        throw new Error(
            `Branch ${branchId} connection was not found.`
        );

    }


    return found;

}


function buildCacheKey(
    {
        branchId,
        employeeId,
        fromDate,
        toDate,
        historyMonths
    }
) {

    return [

        Number(
            branchId
        ),

        String(
            employeeId
        ),

        String(
            fromDate
        ),

        String(
            toDate
        ),

        Number(
            historyMonths
        )

    ].join(
        "|"
    );

}


function getCachedSellerPerformance(
    key
) {

    const entry =
        sellerPerformanceCache.get(
            key
        );


    if (
        !entry
    ) {

        return null;

    }


    if (
        Date.now() -
        entry.createdAt >
        SELLER_PERFORMANCE_CACHE_TTL_MS
    ) {

        sellerPerformanceCache.delete(
            key
        );

        return null;

    }


    return entry.data;

}


function setCachedSellerPerformance(
    key,
    data
) {

    sellerPerformanceCache.set(

        key,

        {

            data,

            createdAt:
                Date.now()

        }

    );


    while (
        sellerPerformanceCache.size >
        100
    ) {

        const oldestKey =
            sellerPerformanceCache
                .keys()
                .next()
                .value;


        if (
            oldestKey ===
            undefined
        ) {

            break;

        }


        sellerPerformanceCache.delete(
            oldestKey
        );

    }

}


/*
 * =========================================================
 * FAST SQL AGGREGATION
 * =========================================================
 *
 * IMPORTANT:
 *
 * The old implementation loaded all detailed sales rows for
 * 12 months, then mapped every ticket to a PinNumber in Node.
 *
 * This implementation performs the aggregation in SQL:
 *
 *     month + employee -> sales + invoices
 *
 * using the same line-value formula used by salesService.
 *
 * No purchase-history lookup is needed for seller evaluation.
 *
 */
async function loadSellerMonthlyAggregation(
    {
        branchId,
        connection,
        fromDate,
        toDate
    }
) {

    const pool =
        await getBranchPool(
            Number(
                branchId
            ),
            connection
        );


    const startedAt =
        Date.now();


    const result =
        await pool
            .request()

            .input(
                "fromDate",
                `${fromDate} 00:00:00`
            )

            .input(
                "toDateExclusive",
                `${toDate} 00:00:00`
            )

            .query(`

                SET NOCOUNT ON;


                SELECT

                    CONVERT(
                        varchar(7),
                        t.ztime,
                        23
                    ) AS month_key,


                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) AS employee_id,


                    SUM(

                        CASE

                            WHEN
                                t.SalesReturn = 2

                            THEN

                                -ABS(
                                    calculated.net_line_value
                                )

                            ELSE

                                calculated.net_line_value

                        END

                    ) AS sales,


                    COUNT(
                        DISTINCT
                        t.ID
                    ) AS invoices


                FROM dbo.posTickets t


                INNER JOIN dbo.posItems pi

                    ON
                        pi.TicketID =
                        t.ID


                INNER JOIN dbo.Items i

                    ON
                        i.ID =
                        pi.ItemID


                INNER JOIN dbo.Cards c

                    ON
                        c.ID =
                        t.PinNumber

                    AND
                        ISNULL(
                            c.IsEmployee,
                            0
                        ) = 1


                CROSS APPLY (

                    SELECT

                        CASE

                            WHEN
                                ISNULL(
                                    pi.iParts,
                                    0
                                ) > 0

                            THEN
                                pi.iParts


                            WHEN
                                ISNULL(
                                    i.Parts,
                                    0
                                ) > 0

                            THEN
                                i.Parts


                            ELSE
                                1

                        END AS parts

                ) partsData


                CROSS APPLY (

                    SELECT

                        (

                            (

                                ISNULL(
                                    pi.Packs,
                                    0
                                ) *
                                partsData.parts

                            )
                            +
                            ISNULL(
                                pi.Units,
                                0
                            )

                        )
                        *
                        (

                            ISNULL(
                                pi.SalesPrice,
                                0
                            )
                            /
                            NULLIF(
                                partsData.parts,
                                0
                            )

                        )
                        -
                        ISNULL(
                            pi.Discount,
                            0
                        )
                        -
                        ISNULL(
                            pi.ExtraDiscount,
                            0
                        )

                        AS net_line_value

                ) calculated


                WHERE

                    t.ztime >=
                    @fromDate

                AND

                    t.ztime <
                    @toDateExclusive

                AND

                    t.PinNumber IS NOT NULL

                AND

                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) NOT IN (
                        N'',
                        N'0'
                    )


                GROUP BY

                    CONVERT(
                        varchar(7),
                        t.ztime,
                        23
                    ),

                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    )


                ORDER BY

                    month_key,

                    employee_id;

            `);


    const elapsed =
        Date.now() -
        startedAt;


    console.log(

        `[sellerPerformanceService] AGG SQL branch=${branchId} ${fromDate}|${toDate} -> ${result?.recordset?.length || 0} rows in ${elapsed} ms`

    );


    return Array.isArray(
        result?.recordset
    )
        ? result.recordset
        : [];

}


async function loadSellerName(
    {
        branchId,
        connection,
        employeeId
    }
) {

    const pool =
        await getBranchPool(
            Number(
                branchId
            ),
            connection
        );


    const result =
        await pool
            .request()

            .input(
                "employeeId",
                employeeId
            )

            .query(`

                SET NOCOUNT ON;


                SELECT TOP 1

                    CONVERT(
                        nvarchar(100),
                        c.ID
                    ) AS employee_id,


                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ) AS employee_name


                FROM dbo.Cards c


                WHERE

                    ISNULL(
                        c.IsEmployee,
                        0
                    ) = 1

                AND

                    CONVERT(
                        nvarchar(100),
                        c.ID
                    ) =
                    @employeeId

                AND

                    NULLIF(
                        LTRIM(
                            RTRIM(
                                CONVERT(
                                    nvarchar(400),
                                    c.Name
                                )
                            )
                        ),
                        ''
                    ) IS NOT NULL;

            `);


    const row =
        result?.recordset?.[0];


    const name =
        String(
            row?.employee_name ||
            ""
        ).trim();


    return (
        name ||
        `موظف (${employeeId})`
    );

}


export async function getSellerPerformance(
    {
        branchId,
        employeeId,
        fromDate,
        toDate,
        connection = null,
        historyMonths =
            HISTORY_MONTHS_DEFAULT
    }
) {

    const numericBranchId =
        Number(
            branchId
        );


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


    const selectedEmployeeId =
        String(
            employeeId ??
            ""
        ).trim();


    if (
        !selectedEmployeeId ||
        selectedEmployeeId ===
            "UNASSIGNED"
    ) {

        throw new Error(
            "Invalid seller employeeId"
        );

    }


    const end =
        validateDate(
            toDate,
            "toDate"
        );


    const months =
        Number.isInteger(
            Number(
                historyMonths
            )
        )
            ? Math.max(
                1,
                Math.min(
                    24,
                    Number(
                        historyMonths
                    )
                )
            )
            : HISTORY_MONTHS_DEFAULT;


    const historyRange =
        buildHistoryRange(
            end,
            months
        );


    const branchConnection =
        resolveConnection(
            numericBranchId,
            connection
        );


    const cacheKey =
        buildCacheKey({

            branchId:
                numericBranchId,

            employeeId:
                selectedEmployeeId,

            fromDate:
                historyRange.fromDate,

            toDate:
                historyRange.toDate,

            historyMonths:
                months

        });


    const cached =
        getCachedSellerPerformance(
            cacheKey
        );


    if (
        cached
    ) {

        console.log(

            `[sellerPerformanceService] CACHE HIT ${cacheKey}`

        );


        return cached;

    }


    const [
        aggregationRows,
        sellerName
    ] =
        await Promise.all([

            loadSellerMonthlyAggregation({

                branchId:
                    numericBranchId,

                connection:
                    branchConnection,

                fromDate:
                    historyRange.fromDate,

                toDate:
                    historyRange.toDate

            }),

            loadSellerName({

                branchId:
                    numericBranchId,

                connection:
                    branchConnection,

                employeeId:
                    selectedEmployeeId

            })

        ]);


    /*
     * =====================================================
     * NORMALIZE SQL AGGREGATION
     * =====================================================
     */

    const employeesByMonth =
        new Map();


    for (
        const row
        of aggregationRows
    ) {

        const month =
            String(
                row?.month_key ||
                ""
            ).trim();


        const employeeKey =
            String(
                row?.employee_id ||
                ""
            ).trim();


        if (
            !month ||
            !employeeKey
        ) {

            continue;

        }


        if (
            !employeesByMonth.has(
                employeeKey
            )
        ) {

            employeesByMonth.set(

                employeeKey,

                new Map()

            );

        }


        const monthly =
            employeesByMonth.get(
                employeeKey
            );


        monthly.set(

            month,

            {

                month,

                sales:
                    number(
                        row?.sales
                    ),

                invoices:
                    number(
                        row?.invoices
                    )

            }

        );

    }


    /*
     * =====================================================
     * MONTH LIST
     * =====================================================
     */

    const monthsList =
        buildMonthsList(
            end,
            months
        );


    /*
     * =====================================================
     * MAX METRICS BY MONTH
     * =====================================================
     *
     * Same scoring concept as before:
     * compare the seller against the maximum observed
     * employee metric for that month.
     */

    const maxByMonth =
        new Map();


    for (
        const month
        of monthsList
    ) {

        let maxDailySales =
            0;

        let maxDailyInvoices =
            0;

        let maxInvoice =
            0;


        for (
            const employeeMonthly
            of employeesByMonth.values()
        ) {

            const bucket =
                employeeMonthly.get(
                    month
                ) ||
                createMonthBucket(
                    month
                );


            const days =
                daysCoveredInMonth(
                    month,
                    end
                );


            const metrics =
                getMonthlyMetrics(
                    bucket,
                    days
                );


            maxDailySales =
                Math.max(
                    maxDailySales,
                    metrics.averageDailySales
                );


            maxDailyInvoices =
                Math.max(
                    maxDailyInvoices,
                    metrics.averageDailyInvoices
                );


            maxInvoice =
                Math.max(
                    maxInvoice,
                    metrics.averageInvoice
                );

        }


        maxByMonth.set(

            month,

            {

                averageDailySales:
                    maxDailySales,

                averageDailyInvoices:
                    maxDailyInvoices,

                averageInvoice:
                    maxInvoice

            }

        );

    }


    /*
     * =====================================================
     * SELECTED SELLER
     * =====================================================
     */

    const sellerMonthly =
        employeesByMonth.get(
            selectedEmployeeId
        ) ||
        new Map();


    const monthly =
        monthsList.map(

            month => {

                const days =
                    daysCoveredInMonth(
                        month,
                        end
                    );


                const bucket =
                    sellerMonthly.get(
                        month
                    ) ||
                    createMonthBucket(
                        month
                    );


                const metrics =
                    getMonthlyMetrics(
                        bucket,
                        days
                    );


                const maxMetrics =
                    maxByMonth.get(
                        month
                    ) ||
                    {

                        averageDailySales:
                            0,

                        averageDailyInvoices:
                            0,

                        averageInvoice:
                            0

                    };


                const score =
                    scoreMonth(
                        metrics,
                        maxMetrics
                    );


                return {

                    month,

                    days,

                    ...metrics,

                    score,

                    scoreLabel:
                        scoreLabel(
                            score
                        )

                };

            }

        );


    const activeMonths =
        monthly.filter(

            item =>
                item.invoices > 0 ||
                item.sales !== 0

        );


    const latest =
        activeMonths[
            activeMonths.length - 1
        ] ||
        null;


    const averageScore =
        activeMonths.length
            ? round(

                activeMonths.reduce(

                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.score,

                    0

                ) /
                activeMonths.length

            )
            : 0;


    const result = {

        success:
            true,

        branchId:
            numericBranchId,

        branchName:
            branchConnection.branchName ||
            `Branch ${numericBranchId}`,

        employeeId:
            selectedEmployeeId,

        employeeName:
            sellerName,

        fromDate:
            historyRange.fromDate,

        toDate:
            historyRange.toDate,

        historyMonths:
            months,

        weights: {

            averageDailySales:
                40,

            averageDailyInvoices:
                30,

            averageInvoice:
                30

        },

        latest,

        averageScore,

        monthly

    };


    setCachedSellerPerformance(
        cacheKey,
        result
    );


    return result;

}


export default {

    getSellerPerformance

};