import {
    getSales
} from "../sales/salesService.js";


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
        ) * 100
    ) / 100;

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


function monthKey(
    date
) {

    return [

        date.getUTCFullYear(),

        String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        )

    ].join(
        "-"
    );

}


function monthIndex(
    key
) {

    const parts =
        key
            .split(
                "-"
            )
            .map(
                Number
            );


    return (
        parts[0] * 12
    ) + (
        parts[1] - 1
    );

}


function monthDistance(
    cohortMonth,
    activityMonth
) {

    return (

        monthIndex(
            activityMonth
        ) -

        monthIndex(
            cohortMonth
        )

    );

}


function buildObservationStart(
    endDate,
    months
) {

    const date =
        new Date(
            `${endDate}T00:00:00.000Z`
        );


    const start =
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth() -
                    (
                        months -
                        1
                    ),
                1
            )
        );


    return [

        start.getUTCFullYear(),

        String(
            start.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        "01"

    ].join(
        "-"
    );

}


function buildMonthRanges(
    startDate,
    endDate
) {

    const start =
        new Date(
            `${startDate}T00:00:00.000Z`
        );


    const end =
        new Date(
            `${endDate}T00:00:00.000Z`
        );


    const ranges =
        [];


    let cursor =
        new Date(
            Date.UTC(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                1
            )
        );


    const endMonthIndex =
        (
            end.getUTCFullYear() *
            12
        ) +
        end.getUTCMonth();


    while (
        (
            cursor.getUTCFullYear() *
            12
        ) +
        cursor.getUTCMonth()
        <=
        endMonthIndex
    ) {

        const year =
            cursor.getUTCFullYear();


        const month =
            cursor.getUTCMonth();


        const monthStart =
            new Date(
                Date.UTC(
                    year,
                    month,
                    1
                )
            );


        const nextMonth =
            new Date(
                Date.UTC(
                    year,
                    month + 1,
                    1
                )
            );


        const monthEnd =
            new Date(
                nextMonth.getTime() -
                1
            );


        const effectiveEnd =
            monthEnd > end
                ? end
                : monthEnd;


        ranges.push({

            fromDate:
                monthStart
                    .toISOString()
                    .slice(
                        0,
                        10
                    ),

            toDate:
                effectiveEnd
                    .toISOString()
                    .slice(
                        0,
                        10
                    )

        });


        cursor =
            nextMonth;

    }


    return ranges;

}


/*
 * =========================================================
 * CUSTOMER HISTORY
 * =========================================================
 *
 * For every customer we keep:
 *
 * firstPurchaseMonth
 * months with activity
 * revenue by activity month
 *
 * =========================================================
 */

function buildCustomerHistory(
    customers,
    rows
) {

    for (
        const row
        of rows
    ) {

        if (
            row.customerId === null ||
            row.customerId === undefined ||
            row.customerId === ""
        ) {

            continue;

        }


        const numericCustomerId =
            Number(
                row.customerId
            );


        if (
            !Number.isInteger(
                numericCustomerId
            ) ||
            numericCustomerId <= 0
        ) {

            continue;

        }


        if (
            row.transactionType !==
            "SALE"
        ) {

            continue;

        }


        if (
            !row.date
        ) {

            continue;

        }


        const date =
            new Date(
                row.date
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            continue;

        }


        const customerId =
            String(
                numericCustomerId
            );


        const activityMonth =
            monthKey(
                date
            );


        const saleValue =
            Math.max(
                0,
                toNumber(
                    row.netLineValue
                )
            );


        if (
            !customers.has(
                customerId
            )
        ) {

            customers.set(

                customerId,

                {

                    customerId,

                    customerName:
                        row.customerName ||
                        "غير معروف",

                    firstPurchaseDate:
                        date,

                    firstPurchaseMonth:
                        activityMonth,

                    months:
                        new Set(),

                    revenueByMonth:
                        new Map(),

                    totalNetSales:
                        0

                }

            );

        }


        const customer =
            customers.get(
                customerId
            );


        if (
            date.getTime() <
            customer.firstPurchaseDate.getTime()
        ) {

            customer.firstPurchaseDate =
                date;


            customer.firstPurchaseMonth =
                activityMonth;

        }


        customer.months.add(
            activityMonth
        );


        customer.revenueByMonth.set(

            activityMonth,

            (
                customer.revenueByMonth.get(
                    activityMonth
                ) ||
                0
            ) +
            saleValue

        );


        customer.totalNetSales +=
            saleValue;

    }

}


/*
 * =========================================================
 * COHORT BUILD
 * =========================================================
 */

function buildCohorts(
    customers,
    observationEnd
) {

    const cohorts =
        new Map();


    for (
        const customer
        of customers.values()
    ) {

        const cohortMonth =
            customer.firstPurchaseMonth;


        const cohortDate =
            new Date(
                `${cohortMonth}-01T00:00:00.000Z`
            );


        if (
            Number.isNaN(
                cohortDate.getTime()
            )
        ) {

            continue;

        }


        if (
            cohortDate >
            observationEnd
        ) {

            continue;

        }


        if (
            !cohorts.has(
                cohortMonth
            )
        ) {

            cohorts.set(

                cohortMonth,

                {

                    cohortMonth,

                    customers:
                        new Set(),

                    totalSales:
                        0,

                    activeByMonth:
                        new Map(),

                    revenueByMonth:
                        new Map()

                }

            );

        }


        const cohort =
            cohorts.get(
                cohortMonth
            );


        cohort.customers.add(
            customer.customerId
        );


        cohort.totalSales +=
            customer.totalNetSales;


        for (
            const activityMonth
            of customer.months
        ) {

            const distance =
                monthDistance(
                    cohortMonth,
                    activityMonth
                );


            if (
                distance < 0
            ) {

                continue;

            }


            const activeCustomers =
                cohort.activeByMonth.get(
                    distance
                ) ||
                new Set();


            activeCustomers.add(
                customer.customerId
            );


            cohort.activeByMonth.set(
                distance,
                activeCustomers
            );


            const monthlyRevenue =
                toNumber(
                    customer.revenueByMonth.get(
                        activityMonth
                    )
                );


            cohort.revenueByMonth.set(

                distance,

                (
                    cohort.revenueByMonth.get(
                        distance
                    ) ||
                    0
                ) +
                monthlyRevenue

            );

        }

    }


    return cohorts;

}


/*
 * =========================================================
 * COHORT ROWS
 * =========================================================
 */

function buildCohortRows(
    cohorts,
    maxMonths
) {

    return Array.from(
        cohorts.values()
    )
    .sort(
        (
            a,
            b
        ) =>
            a.cohortMonth.localeCompare(
                b.cohortMonth
            )
    )
    .map(
        cohort => {

            const cohortSize =
                cohort.customers.size;


            const retention = {};


            const revenue = {};


            const revenuePerCustomer = {};


            for (
                let month =
                    0;

                month <
                maxMonths;

                month +=
                    1
            ) {

                const activeCustomers =
                    cohort.activeByMonth.get(
                        month
                    );


                const activeCount =
                    activeCustomers
                        ?.size ||
                    0;


                const monthlyRevenue =
                    toNumber(
                        cohort.revenueByMonth.get(
                            month
                        )
                    );


                /*
                 * If a month has no activity, do not
                 * manufacture a 0% retention entry.
                 */

                if (
                    activeCustomers
                ) {

                    retention[
                        String(
                            month
                        )
                    ] = {

                        customers:
                            activeCount,

                        retentionRate:

                            cohortSize > 0

                                ? round2(
                                    (
                                        activeCount /
                                        cohortSize
                                    ) * 100
                                )

                                : 0

                    };

                }


                if (
                    monthlyRevenue !== 0 ||
                    activeCount > 0
                ) {

                    revenue[
                        String(
                            month
                        )
                    ] = {

                        sales:
                            round2(
                                monthlyRevenue
                            ),

                        activeCustomers:
                            activeCount

                    };


                    revenuePerCustomer[
                        String(
                            month
                        )
                    ] = {

                        sales:
                            round2(
                                monthlyRevenue
                            ),

                        activeCustomers:
                            activeCount,

                        salesPerActiveCustomer:

                            activeCount > 0

                                ? round2(
                                    monthlyRevenue /
                                    activeCount
                                )

                                : 0

                    };

                }

            }


            return {

                cohortMonth:
                    cohort.cohortMonth,

                customers:
                    cohortSize,

                initialMonthSales:
                    round2(
                        cohort.revenueByMonth.get(
                            0
                        )
                    ),

                observedSales:
                    round2(
                        cohort.totalSales
                    ),

                retention,

                revenue,

                revenuePerCustomer

            };

        }
    );

}


/*
 * =========================================================
 * MAIN
 * =========================================================
 */

export async function getCustomerCohort(
    {
        branchId,
        fromDate,
        toDate,
        maxMonths = 12,
        observationMonths = 24
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


    /*
     * The dashboard fromDate is kept for API compatibility.
     *
     * Cohort uses its own historical observation window.
     */

    void fromDate;


    const endDate =
        validateDate(
            toDate,
            "toDate"
        );


    const requestedObservationMonths =
        Number(
            observationMonths
        );


    const normalizedObservationMonths =
        Number.isFinite(
            requestedObservationMonths
        ) &&
        requestedObservationMonths > 0

            ? Math.min(
                Math.floor(
                    requestedObservationMonths
                ),
                36
            )

            : 24;


    const requestedMaxMonths =
        Number(
            maxMonths
        );


    const normalizedMaxMonths =
        Number.isFinite(
            requestedMaxMonths
        ) &&
        requestedMaxMonths > 0

            ? Math.min(
                Math.floor(
                    requestedMaxMonths
                ),
                24
            )

            : 12;


    const observationStartDate =
        buildObservationStart(
            endDate,
            normalizedObservationMonths
        );


    const observationEndDate =
        new Date(
            `${endDate}T23:59:59.999Z`
        );


    const monthRanges =
        buildMonthRanges(
            observationStartDate,
            endDate
        );


    const customers =
        new Map();


    let totalRowsRead =
        0;


    /*
     * =====================================================
     * MONTH-BY-MONTH
     * =====================================================
     */

    for (
        const range
        of monthRanges
    ) {

        const rows =
            await getSales({

                branchId:
                    numericBranchId,

                fromDate:
                    range.fromDate,

                toDate:
                    range.toDate

            });


        totalRowsRead +=
            rows.length;


        buildCustomerHistory(
            customers,
            rows
        );


        console.log(

            `[customerCohort] ${range.fromDate} -> ${range.toDate} rows=${rows.length}`

        );

    }


    const cohorts =
        buildCohorts(
            customers,
            observationEndDate
        );


    const cohortRows =
        buildCohortRows(
            cohorts,
            normalizedMaxMonths
        );


    const totalCustomers =
        cohortRows.reduce(
            (
                total,
                cohort
            ) =>
                total +
                cohort.customers,
            0
        );


    const totalObservedSales =
        cohortRows.reduce(
            (
                total,
                cohort
            ) =>
                total +
                cohort.observedSales,
            0
        );


    const totalInitialSales =
        cohortRows.reduce(
            (
                total,
                cohort
            ) =>
                total +
                cohort.initialMonthSales,
            0
        );


    const latestCohort =
        cohortRows[
            cohortRows.length - 1
        ] ||
        null;


    return {

        success:
            true,

        branchId:
            numericBranchId,

        selectedPeriod: {

            analysisEndDate:
                endDate,

            observationStartDate,

            observationMonths:
                normalizedObservationMonths,

            maxRetentionMonths:
                normalizedMaxMonths

        },

        summary: {

            cohorts:
                cohortRows.length,

            customers:
                totalCustomers,

            observedSales:
                round2(
                    totalObservedSales
                ),

            initialCohortSales:
                round2(
                    totalInitialSales
                ),

            latestCohort:
                latestCohort
                    ?.cohortMonth ||
                null,

            rowsRead:
                totalRowsRead,

            monthsRead:
                monthRanges.length

        },

        cohorts:
            cohortRows

    };

}


export default {

    getCustomerCohort

};