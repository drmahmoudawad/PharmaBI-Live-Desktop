import {
    getSales
} from "../sales/salesService.js";


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


    if (
        from >
        to
    ) {

        throw new Error(
            "fromDate cannot be greater than toDate"
        );

    }


    const days =
        Math.floor(
            (
                to.getTime() -
                from.getTime()
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        ) + 1;


    const previousTo =
        new Date(
            from.getTime() -
            (
                24 *
                60 *
                60 *
                1000
            )
        );


    const previousFrom =
        new Date(
            previousTo.getTime() -
            (
                (
                    days -
                    1
                ) *
                24 *
                60 *
                60 *
                1000
            )
        );


    return {

        fromDate:
            previousFrom.toISOString().slice(
                0,
                10
            ),

        toDate:
            previousTo.toISOString().slice(
                0,
                10
            )

    };

}


function buildCustomerSet(
    rows
) {

    const customers =
        new Set();


    for (
        const row
        of rows
    ) {

        const rawId =
            row?.customerId;


        if (
            rawId === null ||
            rawId === undefined ||
            rawId === ""
        ) {

            continue;

        }


        const id =
            Number(
                rawId
            );


        if (
            Number.isInteger(
                id
            ) &&
            id > 0
        ) {

            customers.add(
                String(
                    id
                )
            );

        }

    }


    return customers;

}


function calculateRetentionRate(
    retained,
    previous
) {

    if (
        previous <= 0
    ) {

        return null;

    }


    return Math.round(

        (
            (
                retained /
                previous
            ) *
            100
        ) +
        Number.EPSILON

    ) / 100 * 100;

}


function calculateLossRate(
    lost,
    previous
) {

    if (
        previous <= 0
    ) {

        return null;

    }


    return Math.round(

        (
            (
                lost /
                previous
            ) *
            100
        ) +
        Number.EPSILON

    ) / 100 * 100;

}


/*
 * =========================================================
 * CUSTOMER RETENTION CORE
 * =========================================================
 *
 * Rules:
 *
 * Previous Customers
 *      =
 * Retained + Lost
 *
 * Current Customers
 *      =
 * Retained + New
 *
 * This service intentionally does NOT calculate
 * historical inactivity / churn yet.
 *
 * =========================================================
 */

export async function getCustomerRetention(
    {
        branchId,
        connection,
        fromDate,
        toDate
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


    const previousPeriod =
        buildPreviousPeriod(
            currentFromDate,
            currentToDate
        );


    /*
     * =====================================================
     * CURRENT PERIOD
     * =====================================================
     */

    const currentRows =
        await getSales({

            branchId:
                numericBranchId,

            fromDate:
                currentFromDate,

            toDate:
                currentToDate

        });


    /*
     * =====================================================
     * PREVIOUS COMPARABLE PERIOD
     * =====================================================
     */

    const previousRows =
        await getSales({

            branchId:
                numericBranchId,

            fromDate:
                previousPeriod.fromDate,

            toDate:
                previousPeriod.toDate

        });


    /*
     * =====================================================
     * CUSTOMER SETS
     * =====================================================
     */

    const currentCustomers =
        buildCustomerSet(
            currentRows
        );


    const previousCustomers =
        buildCustomerSet(
            previousRows
        );


    /*
     * =====================================================
     * RETAINED
     * =====================================================
     */

    let retainedCustomers =
        0;


    for (
        const customerId
        of previousCustomers
    ) {

        if (
            currentCustomers.has(
                customerId
            )
        ) {

            retainedCustomers +=
                1;

        }

    }


    /*
     * =====================================================
     * NEW
     * =====================================================
     */

    let newCustomers =
        0;


    for (
        const customerId
        of currentCustomers
    ) {

        if (
            !previousCustomers.has(
                customerId
            )
        ) {

            newCustomers +=
                1;

        }

    }


    /*
     * =====================================================
     * LOST
     * =====================================================
     */

    let lostCustomers =
        0;


    for (
        const customerId
        of previousCustomers
    ) {

        if (
            !currentCustomers.has(
                customerId
            )
        ) {

            lostCustomers +=
                1;

        }

    }


    /*
     * =====================================================
     * QUALITY CHECKS
     * =====================================================
     */

    const previousReconciles =
        retainedCustomers +
        lostCustomers ===
        previousCustomers.size;


    const currentReconciles =
        retainedCustomers +
        newCustomers ===
        currentCustomers.size;


    if (
        !previousReconciles
    ) {

        throw new Error(
            "Retention calculation failed: previous customer reconciliation mismatch."
        );

    }


    if (
        !currentReconciles
    ) {

        throw new Error(
            "Retention calculation failed: current customer reconciliation mismatch."
        );

    }


    /*
     * =====================================================
     * RESULT
     * =====================================================
     */

    return {

        success:
            true,

        branchId:
            numericBranchId,

        selectedPeriod: {

            fromDate:
                currentFromDate,

            toDate:
                currentToDate,

            comparisonFromDate:
                previousPeriod.fromDate,

            comparisonToDate:
                previousPeriod.toDate

        },

        current: {

            customers:
                currentCustomers.size

        },

        previous: {

            customers:
                previousCustomers.size

        },

        retention: {

            previousCustomers:
                previousCustomers.size,

            retainedCustomers,

            lostCustomers,

            retentionRate:
                calculateRetentionRate(

                    retainedCustomers,

                    previousCustomers.size

                ),

            retentionLossRate:
                calculateLossRate(

                    lostCustomers,

                    previousCustomers.size

                )

        },

        lifecycle: {

            newCustomers,

            returningCustomers:
                retainedCustomers,

            lostCustomers

        },

        movement: {

            customerChange:
                currentCustomers.size -
                previousCustomers.size

        },

        quality: {

            previousReconciles,

            currentReconciles,

            valid:
                previousReconciles &&
                currentReconciles

        },

        inactivity: {

            available:
                false,

            reason:
                "Inactive / churn analysis is implemented separately."

        }

    };

}


export default {

    getCustomerRetention

};