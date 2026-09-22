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


function validateDate(
    value
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
            "Invalid toDate. Expected YYYY-MM-DD"
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
            `Invalid toDate: ${text}`
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


function buildCustomerLastPurchase(
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


        /*
         * Returns do not count as a purchase.
         */

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
                row.customerId
            );


        const existing =
            customers.get(
                customerId
            );


        if (
            !existing ||
            date.getTime() >
            existing.date.getTime()
        ) {

            customers.set(

                customerId,

                {

                    customerId,

                    customerName:
                        row.customerName ||
                        "غير معروف",

                    date

                }

            );

        }

    }


    return customers;

}


function buildBuckets(
    customers,
    analysisDate
) {

    const buckets = {

        active: [],

        inactive30: [],

        inactive60: [],

        inactive90: []

    };


    const threshold30 =
        analysisDate.getTime() -
        (
            30 *
            24 *
            60 *
            60 *
            1000
        );


    const threshold60 =
        analysisDate.getTime() -
        (
            60 *
            24 *
            60 *
            60 *
            1000
        );


    const threshold90 =
        analysisDate.getTime() -
        (
            90 *
            24 *
            60 *
            60 *
            1000
        );


    for (
        const customer
        of customers.values()
    ) {

        const timestamp =
            customer.date.getTime();


        const item = {

            customerId:
                customer.customerId,

            customerName:
                customer.customerName,

            lastPurchaseDate:
                customer.date.toISOString(),

            daysSinceLastPurchase:
                Math.max(
                    0,
                    Math.floor(
                        (
                            analysisDate.getTime() -
                            timestamp
                        ) /
                        (
                            24 *
                            60 *
                            60 *
                            1000
                        )
                    )
                )

        };


        if (
            timestamp >=
            threshold30
        ) {

            buckets.active.push(
                item
            );

        }
        else {

            buckets.inactive30.push(
                item
            );


            if (
                timestamp <
                threshold60
            ) {

                buckets.inactive60.push(
                    item
                );

            }


            if (
                timestamp <
                threshold90
            ) {

                buckets.inactive90.push(
                    item
                );

            }

        }

    }


    const sorter =
        (
            a,
            b
        ) =>
            b.daysSinceLastPurchase -
            a.daysSinceLastPurchase;


    buckets.inactive30.sort(
        sorter
    );


    buckets.inactive60.sort(
        sorter
    );


    buckets.inactive90.sort(
        sorter
    );


    buckets.active.sort(
        (
            a,
            b
        ) =>
            a.daysSinceLastPurchase -
            b.daysSinceLastPurchase
    );


    return buckets;

}


export async function getCustomerInactivity(
    {
        branchId,
        connection,
        toDate,
        sampleLimit = 100
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


    const analysisDateText =
        validateDate(
            toDate
        );


    const analysisDate =
        new Date(
            `${analysisDateText}T23:59:59.999Z`
        );


    /*
     * We need only the last 90 days plus one boundary day.
     *
     * Customers whose last purchase is older than 90 days
     * are included through the 90-day boundary.
     */

    const fromDate =
        subtractDays(
            analysisDateText,
            91
        );


    const rows =
        await getSales({

            branchId:
                numericBranchId,

            connection,

            fromDate,

            toDate:
                analysisDateText

        });


    const customerLastPurchase =
        buildCustomerLastPurchase(
            rows
        );


    const buckets =
        buildBuckets(
            customerLastPurchase,
            analysisDate
        );


    const requestedLimit =
        Number(
            sampleLimit
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


    const totalKnownCustomers =
        customerLastPurchase.size;


    const active30 =
        buckets.active.length;


    const inactive30 =
        buckets.inactive30.length;


    const inactive60 =
        buckets.inactive60.length;


    const inactive90 =
        buckets.inactive90.length;


    return {

        success:
            true,

        branchId:
            numericBranchId,

        analysisDate:
            `${analysisDateText}T23:59:59.999Z`,

        lookback: {

            fromDate,

            toDate:
                analysisDateText,

            days:
                91

        },

        summary: {

            knownCustomers:
                totalKnownCustomers,

            activeWithin30Days:
                active30,

            inactive30DaysOrMore:
                inactive30,

            inactive60DaysOrMore:
                inactive60,

            inactive90DaysOrMore:
                inactive90,

            activeRate30Days:
                totalKnownCustomers > 0

                    ? Number(
                        (
                            (
                                active30 /
                                totalKnownCustomers
                            ) *
                            100
                        ).toFixed(
                            2
                        )
                    )

                    : 0,

            inactivityRate30Days:
                totalKnownCustomers > 0

                    ? Number(
                        (
                            (
                                inactive30 /
                                totalKnownCustomers
                            ) *
                            100
                        ).toFixed(
                            2
                        )
                    )

                    : 0,

            inactivityRate60Days:
                totalKnownCustomers > 0

                    ? Number(
                        (
                            (
                                inactive60 /
                                totalKnownCustomers
                            ) *
                            100
                        ).toFixed(
                            2
                        )
                    )

                    : 0,

            inactivityRate90Days:
                totalKnownCustomers > 0

                    ? Number(
                        (
                            (
                                inactive90 /
                                totalKnownCustomers
                            ) *
                            100
                        ).toFixed(
                            2
                        )
                    )

                    : 0

        },

        samples: {

            inactive30:
                buckets.inactive30.slice(
                    0,
                    normalizedLimit
                ),

            inactive60:
                buckets.inactive60.slice(
                    0,
                    normalizedLimit
                ),

            inactive90:
                buckets.inactive90.slice(
                    0,
                    normalizedLimit
                )

        }

    };

}


export default {

    getCustomerInactivity

};