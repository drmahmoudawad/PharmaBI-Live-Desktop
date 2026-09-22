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


function subtractDays(
    dateText,
    days
) {

    const date =
        new Date(
            `${dateText}T00:00:00.000Z`
        );


    date.setUTCDate(
        date.getUTCDate() -
        Number(
            days
        )
    );


    return date.toISOString().slice(
        0,
        10
    );

}


function createCustomer(
    row
) {

    return {

        customerId:
            String(
                row.customerId
            ),

        customerName:
            row.customerName ||
            "غير معروف",

        netSales:
            0,

        grossSales:
            0,

        returns:
            0,

        orders:
            new Set(),

        units:
            0,

        firstPurchaseDate:
            null,

        lastPurchaseDate:
            null

    };

}


function aggregateCustomers(
    rows
) {

    const customers =
        new Map();


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


        if (
            Number(
                row.customerId
            ) <= 0
        ) {

            continue;

        }


        if (
            row.transactionType !==
                "SALE" &&
            row.transactionType !==
                "RETURN"
        ) {

            continue;

        }


        const customerId =
            String(
                row.customerId
            );


        if (
            !customers.has(
                customerId
            )
        ) {

            customers.set(
                customerId,
                createCustomer(
                    row
                )
            );

        }


        const customer =
            customers.get(
                customerId
            );


        const value =
            Math.abs(
                toNumber(
                    row.netLineValue
                )
            );


        if (
            row.transactionType ===
            "RETURN"
        ) {

            customer.returns +=
                value;

        }
        else {

            customer.grossSales +=
                value;


            customer.units +=
                Math.abs(
                    toNumber(
                        row.baseUnits
                    )
                );


            if (
                row.ticketId !== null &&
                row.ticketId !== undefined
            ) {

                customer.orders.add(
                    String(
                        row.ticketId
                    )
                );

            }


            if (
                row.date
            ) {

                const date =
                    new Date(
                        row.date
                    );


                if (
                    !Number.isNaN(
                        date.getTime()
                    )
                ) {

                    if (
                        !customer.firstPurchaseDate ||
                        date.getTime() <
                        customer.firstPurchaseDate.getTime()
                    ) {

                        customer.firstPurchaseDate =
                            date;

                    }


                    if (
                        !customer.lastPurchaseDate ||
                        date.getTime() >
                        customer.lastPurchaseDate.getTime()
                    ) {

                        customer.lastPurchaseDate =
                            date;

                    }

                }

            }

        }


        customer.netSales =
            customer.grossSales -
            customer.returns;

    }


    return customers;

}


function calculateMonths(
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


    const days =
        Math.max(
            1,
            Math.floor(
                (
                    to.getTime() -
                    from.getTime()
                ) /
                (
                    24 *
                    60 *
                    60 *
                    1000
                )
            ) + 1
        );


    return days / 30.4375;

}


function buildCustomerRows(
    customers,
    monthsObserved
) {

    return Array.from(
        customers.values()
    )
    .map(
        customer => {

            const orders =
                customer.orders.size;


            const netSales =
                customer.netSales;


            const averageOrderValue =
                orders > 0
                    ? netSales / orders
                    : 0;


            const monthlyFrequency =
                monthsObserved > 0
                    ? orders /
                      monthsObserved
                    : 0;


            const annualizedValue =
                averageOrderValue *
                monthlyFrequency *
                12;


            return {

                customerId:
                    customer.customerId,

                customerName:
                    customer.customerName,

                observedNetSales:
                    round2(
                        netSales
                    ),

                grossSales:
                    round2(
                        customer.grossSales
                    ),

                returns:
                    round2(
                        customer.returns
                    ),

                orders,

                units:
                    round2(
                        customer.units
                    ),

                averageOrderValue:
                    round2(
                        averageOrderValue
                    ),

                monthlyFrequency:
                    round2(
                        monthlyFrequency
                    ),

                annualizedValue:
                    round2(
                        annualizedValue
                    ),

                firstPurchaseDate:
                    customer.firstPurchaseDate
                        ? customer.firstPurchaseDate.toISOString()
                        : null,

                lastPurchaseDate:
                    customer.lastPurchaseDate
                        ? customer.lastPurchaseDate.toISOString()
                        : null

            };

        }
    )
    .sort(
        (
            a,
            b
        ) =>
            b.observedNetSales -
            a.observedNetSales
    );

}


export async function getCustomerClv(
    {
        branchId,
        fromDate,
        toDate,
        observationDays = 365,
        limit = 100
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


    const endDate =
        validateDate(
            toDate,
            "toDate"
        );


    const requestedObservationDays =
        Number(
            observationDays
        );


    const normalizedObservationDays =
        Number.isFinite(
            requestedObservationDays
        ) &&
        requestedObservationDays > 0
            ? Math.min(
                Math.floor(
                    requestedObservationDays
                ),
                730
            )
            : 365;


    /*
     * The CLV observation window ends at toDate.
     *
     * This keeps the calculation bounded instead of pulling
     * the entire historical database into Node.js.
     */

    const startDate =
        subtractDays(
            endDate,
            normalizedObservationDays - 1
        );


    const rows =
        await getSales({

            branchId:
                numericBranchId,

            fromDate:
                startDate,

            toDate:
                endDate

        });


    const customers =
        aggregateCustomers(
            rows
        );


    const monthsObserved =
        calculateMonths(
            startDate,
            endDate
        );


    const customerRows =
        buildCustomerRows(
            customers,
            monthsObserved
        );


    const requestedLimit =
        Number(
            limit
        );


    const normalizedLimit =
        Number.isFinite(
            requestedLimit
        ) &&
        requestedLimit > 0

            ? Math.min(
                Math.floor(
                    requestedLimit
                ),
                500
            )

            : 100;


    const totalCustomers =
        customerRows.length;


    const totalObservedNetSales =
        customerRows.reduce(
            (
                total,
                customer
            ) =>
                total +
                customer.observedNetSales,
            0
        );


    const totalOrders =
        customerRows.reduce(
            (
                total,
                customer
            ) =>
                total +
                customer.orders,
            0
        );


    const averageCustomerValue =
        totalCustomers > 0
            ? totalObservedNetSales /
              totalCustomers
            : 0;


    const averageOrderValue =
        totalOrders > 0
            ? totalObservedNetSales /
              totalOrders
            : 0;


    const averageMonthlyFrequency =
        totalCustomers > 0 &&
        monthsObserved > 0
            ? totalOrders /
              totalCustomers /
              monthsObserved
            : 0;


    const topCustomers =
        customerRows.slice(
            0,
            normalizedLimit
        );


    return {

        success:
            true,

        branchId:
            numericBranchId,

        selectedPeriod: {

            fromDate:
                startDate,

            toDate:
                endDate,

            observationDays:
                normalizedObservationDays,

            monthsObserved:
                round2(
                    monthsObserved
                )

        },

        summary: {

            customers:
                totalCustomers,

            observedNetSales:
                round2(
                    totalObservedNetSales
                ),

            orders:
                totalOrders,

            averageCustomerValue:
                round2(
                    averageCustomerValue
                ),

            averageOrderValue:
                round2(
                    averageOrderValue
                ),

            averageMonthlyFrequency:
                round2(
                    averageMonthlyFrequency
                )

        },

        customers:
            topCustomers

    };

}


export default {

    getCustomerClv

};