import {
    getSales
} from "./salesService.js";


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


function round2(
    value
) {

    return Math.round(

        (
            toNumber(
                value
            ) +
            Number.EPSILON
        ) *
        100

    ) / 100;

}


function round4(
    value
) {

    return Math.round(

        (
            toNumber(
                value
            ) +
            Number.EPSILON
        ) *
        10000

    ) / 10000;

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
            `${text}T00:00:00.000Z`
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


function buildPreviousPeriod(
    fromDate,
    toDate
) {

    const from =
        new Date(
            `${fromDate}T00:00:00.000Z`
        );


    const to =
        new Date(
            `${toDate}T00:00:00.000Z`
        );


    const millisecondsPerDay =
        24 *
        60 *
        60 *
        1000;


    const days =
        Math.floor(

            (
                to.getTime() -
                from.getTime()
            ) /
            millisecondsPerDay

        ) + 1;


    const previousTo =
        new Date(

            from.getTime() -
            millisecondsPerDay

        );


    const previousFrom =
        new Date(

            previousTo.getTime() -
            (
                days -
                1
            ) *
            millisecondsPerDay

        );


    return {

        fromDate:
            previousFrom
                .toISOString()
                .slice(
                    0,
                    10
                ),

        toDate:
            previousTo
                .toISOString()
                .slice(
                    0,
                    10
                )

    };

}


function calculateGrowth(
    current,
    previous
) {

    const currentValue =
        toNumber(
            current
        );


    const previousValue =
        toNumber(
            previous
        );


    const change =
        currentValue -
        previousValue;


    const percent =
        previousValue !== 0

            ? (
                change /
                Math.abs(
                    previousValue
                )
            ) *
            100

            : (
                currentValue === 0
                    ? 0
                    : null
            );


    return {

        current:
            round2(
                currentValue
            ),

        previous:
            round2(
                previousValue
            ),

        change:
            round2(
                change
            ),

        percent:
            percent === null
                ? null
                : round2(
                    percent
                )

    };

}


function calculateRatio(
    numerator,
    denominator
) {

    const top =
        toNumber(
            numerator
        );


    const bottom =
        toNumber(
            denominator
        );


    return bottom !== 0

        ? round4(
            top /
            bottom
        )

        : 0;

}


/*
 * =========================================================
 * AGGREGATE SALES
 * =========================================================
 */

function aggregateSales(
    rows
) {

    const safeRows =
        Array.isArray(
            rows
        )
            ? rows
            : [];


    let netSales =
        0;


    let grossSales =
        0;


    let returns =
        0;


    let netCost =
        0;


    let units =
        0;


    let returnedUnits =
        0;


    let saleLines =
        0;


    let returnLines =
        0;


    const saleTickets =
        new Set();


    const returnTickets =
        new Set();


    const customers =
        new Set();


    for (
        const row
        of safeRows
    ) {

        const rowValue =
            toNumber(
                row.netLineValue
            );


        const rowCost =
            toNumber(
                row.lineCost
            );


        const rowUnits =
            toNumber(
                row.baseUnits
            );


        const ticketId =
            row.ticketId === null ||
            row.ticketId === undefined
                ? null
                : String(
                    row.ticketId
                );


        const customerId =
            row.customerId === null ||
            row.customerId === undefined
                ? null
                : String(
                    row.customerId
                );


        if (
            customerId &&
            customerId !== "0"
        ) {

            customers.add(
                customerId
            );

        }


        if (
            row.transactionType ===
            "RETURN"
        ) {

            returns +=
                Math.abs(
                    rowValue
                );


            netCost -=
                Math.abs(
                    rowCost
                );


            returnedUnits +=
                Math.abs(
                    rowUnits
                );


            returnLines +=
                1;


            if (
                ticketId
            ) {

                returnTickets.add(
                    ticketId
                );

            }

        }
        else {

            grossSales +=
                rowValue;


            netSales +=
                rowValue;


            netCost +=
                rowCost;


            units +=
                rowUnits;


            saleLines +=
                1;


            if (
                ticketId
            ) {

                saleTickets.add(
                    ticketId
                );

            }

        }

    }


    /*
     * ---------------------------------------------------------
     * Net sales
     * ---------------------------------------------------------
     *
     * RETURN rows are represented separately.
     *
     * Therefore:
     *
     *     netSales = sales - returns
     *
     * ---------------------------------------------------------
     */

    const actualNetSales =
        netSales -
        returns;


    const grossProfit =
        grossSales -
        (
            netCost > 0
                ? netCost
                : 0
        );


    /*
     * The cost is already net of returns because return cost
     * was subtracted above.
     */

    const netProfit =
        actualNetSales -
        netCost;


    return {

        rows:
            safeRows.length,

        saleLines,

        returnLines,

        saleTickets:
            saleTickets.size,

        returnTickets:
            returnTickets.size,

        customers:
            customers.size,

        grossSales:
            round2(
                grossSales
            ),

        returns:
            round2(
                returns
            ),

        netSales:
            round2(
                actualNetSales
            ),

        netCost:
            round2(
                netCost
            ),

        grossProfit:
            round2(
                grossProfit
            ),

        netProfit:
            round2(
                netProfit
            ),

        margin:
            actualNetSales !== 0

                ? round2(

                    (
                        netProfit /
                        actualNetSales
                    ) *
                    100

                )

                : 0,

        units:
            round2(
                units
            ),

        returnedUnits:
            round2(
                returnedUnits
            ),

        netUnits:
            round2(

                units -
                returnedUnits

            ),

        averageTicket:
            saleTickets.size > 0

                ? round2(

                    grossSales /
                    saleTickets.size

                )

                : 0,

        unitsPerTicket:
            saleTickets.size > 0

                ? round4(

                    units /
                    saleTickets.size

                )

                : 0

    };

}


/*
 * =========================================================
 * PERFORMANCE FLAGS
 * =========================================================
 */

function buildPerformanceFlags(
    {
        salesGrowth,
        ticketGrowth,
        averageTicketGrowth,
        customerGrowth,
        profitGrowth,
        marginChange
    }
) {

    const flags =
        [];


    const salesPercent =
        salesGrowth.percent;


    const ticketPercent =
        ticketGrowth.percent;


    const averageTicketPercent =
        averageTicketGrowth.percent;


    const customerPercent =
        customerGrowth.percent;


    const profitPercent =
        profitGrowth.percent;


    /*
     * Strong positive sales growth.
     */

    if (
        salesPercent !== null &&
        salesPercent >= 10
    ) {

        flags.push({

            code:
                "STRONG_SALES_GROWTH",

            severity:
                "positive",

            message:
                "المبيعات تنمو بقوة مقارنة بالفترة السابقة."

        });

    }


    /*
     * Strong sales decline.
     */

    if (
        salesPercent !== null &&
        salesPercent <= -10
    ) {

        flags.push({

            code:
                "STRONG_SALES_DECLINE",

            severity:
                "critical",

            message:
                "المبيعات تتراجع بقوة مقارنة بالفترة السابقة."

        });

    }


    /*
     * Sales stable/up while tickets decline.
     *
     * This is often a high-value signal because average
     * ticket size is compensating for lower traffic.
     */

    if (
        salesPercent !== null &&
        ticketPercent !== null &&
        salesPercent > 0 &&
        ticketPercent < 0
    ) {

        flags.push({

            code:
                "HIGHER_TICKET_OFFSETTING_TRAFFIC_DECLINE",

            severity:
                "warning",

            message:
                "المبيعات تتحسن رغم انخفاض عدد الفواتير، مدفوعة بارتفاع متوسط الفاتورة."

        });

    }


    /*
     * Tickets up but sales down.
     */

    if (
        ticketPercent !== null &&
        salesPercent !== null &&
        ticketPercent > 0 &&
        salesPercent < 0
    ) {

        flags.push({

            code:
                "TRAFFIC_UP_VALUE_DOWN",

            severity:
                "critical",

            message:
                "عدد الفواتير يرتفع بينما المبيعات تنخفض؛ متوسط قيمة الفاتورة تحت ضغط."

        });

    }


    /*
     * Customer base decline.
     */

    if (
        customerPercent !== null &&
        customerPercent <= -10
    ) {

        flags.push({

            code:
                "CUSTOMER_BASE_DECLINE",

            severity:
                "critical",

            message:
                "عدد العملاء النشطين يتراجع بشكل ملحوظ."

        });

    }


    /*
     * Profit declining faster than sales.
     */

    if (
        profitPercent !== null &&
        salesPercent !== null &&
        profitPercent < salesPercent - 10
    ) {

        flags.push({

            code:
                "PROFIT_GROWTH_LAG",

            severity:
                "warning",

            message:
                "الربحية تنمو أبطأ من المبيعات."

        });

    }


    /*
     * Margin deterioration.
     */

    if (
        toNumber(
            marginChange
        ) <= -2
    ) {

        flags.push({

            code:
                "MARGIN_DETERIORATION",

            severity:
                "warning",

            message:
                "هامش الربح انخفض بأكثر من نقطتين مئويتين."

        });

    }


    /*
     * Average ticket growth.
     */

    if (
        averageTicketPercent !== null &&
        averageTicketPercent >= 10
    ) {

        flags.push({

            code:
                "AVERAGE_TICKET_GROWTH",

            severity:
                "positive",

            message:
                "متوسط قيمة الفاتورة يرتفع بقوة."

        });

    }


    return flags;

}


/*
 * =========================================================
 * MAIN SERVICE
 * =========================================================
 */

export async function getSalesPerformance(
    {
        branchId,
        connection = null,
        fromDate,
        toDate
    }
) {

    const currentFromDate =
        validateDate(
            fromDate,
            "fromDate"
        );


    const currentToDate =
        validateDate(
            toDate,
            "toDate"
        );


    if (
        currentFromDate >
        currentToDate
    ) {

        throw new Error(
            "fromDate cannot be greater than toDate"
        );

    }


    const previousPeriod =
        buildPreviousPeriod(

            currentFromDate,

            currentToDate

        );


    /*
     * =====================================================
     * LOAD PERIODS
     * =====================================================
     */

    const currentRows =
        await getSales({

            branchId,

            connection,

            fromDate:
                currentFromDate,

            toDate:
                currentToDate

        });


    const previousRows =
        await getSales({

            branchId,

            connection,

            fromDate:
                previousPeriod.fromDate,

            toDate:
                previousPeriod.toDate

        });


    /*
     * =====================================================
     * AGGREGATE
     * =====================================================
     */

    const current =
        aggregateSales(
            currentRows
        );


    const previous =
        aggregateSales(
            previousRows
        );


    /*
     * =====================================================
     * GROWTH
     * =====================================================
     */

    const salesGrowth =
        calculateGrowth(

            current.netSales,

            previous.netSales

        );


    const ticketGrowth =
        calculateGrowth(

            current.saleTickets,

            previous.saleTickets

        );


    const averageTicketGrowth =
        calculateGrowth(

            current.averageTicket,

            previous.averageTicket

        );


    const customerGrowth =
        calculateGrowth(

            current.customers,

            previous.customers

        );


    const unitsGrowth =
        calculateGrowth(

            current.netUnits,

            previous.netUnits

        );


    const profitGrowth =
        calculateGrowth(

            current.netProfit,

            previous.netProfit

        );


    const marginChange =
        round2(

            current.margin -
            previous.margin

        );


    /*
     * =====================================================
     * ADDITIONAL PERFORMANCE METRICS
     * =====================================================
     */

    const salesPerCustomer =
        current.customers > 0

            ? round2(

                current.netSales /
                current.customers

            )

            : 0;


    const previousSalesPerCustomer =
        previous.customers > 0

            ? round2(

                previous.netSales /
                previous.customers

            )

            : 0;


    const salesPerCustomerGrowth =
        calculateGrowth(

            salesPerCustomer,

            previousSalesPerCustomer

        );


    const returnRate =
        current.grossSales > 0

            ? round2(

                (
                    current.returns /
                    current.grossSales
                ) *
                100

            )

            : 0;


    const previousReturnRate =
        previous.grossSales > 0

            ? round2(

                (
                    previous.returns /
                    previous.grossSales
                ) *
                100

            )

            : 0;


    const returnRateChange =
        round2(

            returnRate -
            previousReturnRate

        );


    const profitPerTicket =
        current.saleTickets > 0

            ? round2(

                current.netProfit /
                current.saleTickets

            )

            : 0;


    const previousProfitPerTicket =
        previous.saleTickets > 0

            ? round2(

                previous.netProfit /
                previous.saleTickets

            )

            : 0;


    const profitPerTicketGrowth =
        calculateGrowth(

            profitPerTicket,

            previousProfitPerTicket

        );


    const unitsPerCustomer =
        current.customers > 0

            ? round4(

                current.netUnits /
                current.customers

            )

            : 0;


    const previousUnitsPerCustomer =
        previous.customers > 0

            ? round4(

                previous.netUnits /
                previous.customers

            )

            : 0;


    const unitsPerCustomerGrowth =
        calculateGrowth(

            unitsPerCustomer,

            previousUnitsPerCustomer

        );


    /*
     * =====================================================
     * PERFORMANCE FLAGS
     * =====================================================
     */

    const flags =
        buildPerformanceFlags({

            salesGrowth,

            ticketGrowth,

            averageTicketGrowth,

            customerGrowth,

            profitGrowth,

            marginChange

        });


    /*
     * =====================================================
     * RESULT
     * =====================================================
     */

    return {

        success:
            true,

        branchId:
            Number(
                branchId
            ),


        selectedPeriod: {

            fromDate:
                currentFromDate,

            toDate:
                currentToDate

        },


        comparisonPeriod: {

            fromDate:
                previousPeriod.fromDate,

            toDate:
                previousPeriod.toDate

        },


        current: {

            rows:
                current.rows,

            saleLines:
                current.saleLines,

            returnLines:
                current.returnLines,

            saleTickets:
                current.saleTickets,

            returnTickets:
                current.returnTickets,

            customers:
                current.customers,

            grossSales:
                current.grossSales,

            returns:
                current.returns,

            netSales:
                current.netSales,

            netCost:
                current.netCost,

            netProfit:
                current.netProfit,

            margin:
                current.margin,

            units:
                current.units,

            returnedUnits:
                current.returnedUnits,

            netUnits:
                current.netUnits,

            averageTicket:
                current.averageTicket,

            unitsPerTicket:
                current.unitsPerTicket,

            salesPerCustomer,

            profitPerTicket,

            unitsPerCustomer,

            returnRate

        },


        comparison: {

            rows:
                previous.rows,

            saleLines:
                previous.saleLines,

            returnLines:
                previous.returnLines,

            saleTickets:
                previous.saleTickets,

            returnTickets:
                previous.returnTickets,

            customers:
                previous.customers,

            grossSales:
                previous.grossSales,

            returns:
                previous.returns,

            netSales:
                previous.netSales,

            netCost:
                previous.netCost,

            netProfit:
                previous.netProfit,

            margin:
                previous.margin,

            units:
                previous.units,

            returnedUnits:
                previous.returnedUnits,

            netUnits:
                previous.netUnits,

            averageTicket:
                previous.averageTicket,

            unitsPerTicket:
                previous.unitsPerTicket,

            salesPerCustomer:
                previousSalesPerCustomer,

            profitPerTicket:
                previousProfitPerTicket,

            unitsPerCustomer:
                previousUnitsPerCustomer,

            returnRate:
                previousReturnRate

        },


        growth: {

            sales:
                salesGrowth,

            tickets:
                ticketGrowth,

            averageTicket:
                averageTicketGrowth,

            customers:
                customerGrowth,

            units:
                unitsGrowth,

            profit:
                profitGrowth,

            salesPerCustomer:
                salesPerCustomerGrowth,

            profitPerTicket:
                profitPerTicketGrowth,

            unitsPerCustomer:
                unitsPerCustomerGrowth,

            margin: {

                current:
                    current.margin,

                previous:
                    previous.margin,

                change:
                    marginChange

            },

            returnRate: {

                current:
                    returnRate,

                previous:
                    previousReturnRate,

                change:
                    returnRateChange

            }

        },


        ratios: {

            ticketToCustomer:
                calculateRatio(

                    current.saleTickets,

                    current.customers

                ),

            salesToTicket:
                calculateRatio(

                    current.netSales,

                    current.saleTickets

                ),

            profitToTicket:
                calculateRatio(

                    current.netProfit,

                    current.saleTickets

                ),

            unitsToTicket:
                calculateRatio(

                    current.netUnits,

                    current.saleTickets

                ),

            salesToCustomer:
                calculateRatio(

                    current.netSales,

                    current.customers

                )

        },


        performance: {

            status:

                current.netSales >
                    previous.netSales

                    ? "GROWING"

                    : current.netSales <
                        previous.netSales

                        ? "DECLINING"

                        : "STABLE",


            flags

        }

    };

}


export default {

    getSalesPerformance

};