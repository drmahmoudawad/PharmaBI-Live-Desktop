import {
    getSales
} from "../sales/salesService.js";


import {
    getBranchPool
} from "../../connection/connectionManager.js";


import {
    getBranchConnection
} from "../../settings/connectionStore.js";


/*
 * =========================================================
 * CUSTOMER LOOKUP CACHE
 * =========================================================
 *
 * Customer names are intentionally loaded separately from
 * the Sales query.
 *
 * The sales cache keeps customerId.
 *
 * Cards is queried only for the customer IDs actually needed
 * by Customer Intelligence.
 * =========================================================
 */

const CUSTOMER_LOOKUP_CACHE_TTL_MS =
    24 *
    60 *
    60 *
    1000;


const CUSTOMER_LOOKUP_CHUNK_SIZE =
    500;


const customerLookupCache =
    new Map();


/*
 * =========================================================
 * BASIC HELPERS
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
        ) * 100
    ) / 100;

}


function parseDate(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    const date =
        new Date(
            value
        );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

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


function normalizeCustomerId(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const id =
        String(
            value
        ).trim();


    if (
        !id
    ) {

        return null;

    }


    const numeric =
        Number(
            id
        );


    if (
        !Number.isFinite(
            numeric
        ) ||
        numeric <= 0
    ) {

        return null;

    }


    return id;

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
            24 *
            60 *
            60 *
            1000

        );


    const previousFrom =
        new Date(

            previousTo.getTime() -
            (
                days -
                1
            ) *
            24 *
            60 *
            60 *
            1000

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


/*
 * =========================================================
 * CUSTOMER LOOKUP
 * =========================================================
 */

function buildCustomerLookupKey(
    branchId,
    customerId
) {

    return [

        Number(
            branchId
        ),

        String(
            customerId
        )

    ].join(
        "|"
    );

}


function getCachedCustomerName(
    branchId,
    customerId
) {

    const key =
        buildCustomerLookupKey(
            branchId,
            customerId
        );


    const entry =
        customerLookupCache.get(
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
        CUSTOMER_LOOKUP_CACHE_TTL_MS
    ) {

        customerLookupCache.delete(
            key
        );


        return null;

    }


    return entry.name || null;

}


function setCachedCustomerName(
    branchId,
    customerId,
    name
) {

    const key =
        buildCustomerLookupKey(
            branchId,
            customerId
        );


    customerLookupCache.set(

        key,

        {

            name:
                name || null,

            createdAt:
                Date.now()

        }

    );

}


function getUniqueCustomerIds(
    rows
) {

    const ids =
        new Set();


    if (
        !Array.isArray(
            rows
        )
    ) {

        return [];

    }


    for (
        const row
        of rows
    ) {

        const customerId =
            normalizeCustomerId(
                row?.customerId
            );


        if (
            customerId
        ) {

            ids.add(
                customerId
            );

        }

    }


    return Array.from(
        ids
    );

}


async function queryCustomerChunk(
    pool,
    customerIds
) {

    if (
        !customerIds.length
    ) {

        return new Map();

    }


    const request =
        pool.request();


    const parameters =
        customerIds.map(

            (
                customerId,
                index
            ) => {

                const parameterName =
                    `customerId${index}`;


                request.input(

                    parameterName,

                    customerId

                );


                return `@${parameterName}`;

            }

        );


    const result =
        await request.query(`

            SET NOCOUNT ON;

            SELECT

                Id
                    AS customer_id,

                Name
                    AS customer_name

            FROM Cards

            WHERE

                Id IN (

                    ${parameters.join(",")}

                );

        `);


    const map =
        new Map();


    const rows =
        Array.isArray(
            result?.recordset
        )
            ? result.recordset
            : [];


    for (
        const row
        of rows
    ) {

        const customerId =
            normalizeCustomerId(
                row?.customer_id
            );


        if (
            !customerId
        ) {

            continue;

        }


        map.set(

            customerId,

            String(
                row?.customer_name ||
                ""
            ).trim()

        );

    }


    return map;

}


async function lookupCustomerNames(
    {
        branchId,
        customerIds,
        connection = null
    }
) {

    const ids =
        Array.from(

            new Set(

                (Array.isArray(
                    customerIds
                )
                    ? customerIds
                    : []
                )
                .map(
                    normalizeCustomerId
                )
                .filter(
                    Boolean
                )

            )

        );


    if (
        ids.length ===
        0
    ) {

        return new Map();

    }


    const result =
        new Map();


    const missingIds =
        [];


    for (
        const customerId
        of ids
    ) {

        const cachedName =
            getCachedCustomerName(
                branchId,
                customerId
            );


        if (
            cachedName !== null
        ) {

            result.set(

                customerId,

                cachedName

            );

        }
        else {

            missingIds.push(
                customerId
            );

        }

    }


    if (
        missingIds.length ===
        0
    ) {

        return result;

    }


    const numericBranchId =
        Number(
            branchId
        );


    const savedConnection =
        connection ||
        getBranchConnection(
            numericBranchId
        );


    if (
        !savedConnection
    ) {

        throw new Error(

            `No saved PharmaFly connection for branch ${numericBranchId}`

        );

    }


    const pool =
        await getBranchPool(

            numericBranchId,

            savedConnection

        );


    for (
        let start = 0;
        start < missingIds.length;
        start += CUSTOMER_LOOKUP_CHUNK_SIZE
    ) {

        const chunk =
            missingIds.slice(

                start,

                start +
                CUSTOMER_LOOKUP_CHUNK_SIZE

            );


        const chunkMap =
            await queryCustomerChunk(

                pool,

                chunk

            );


        for (
            const customerId
            of chunk
        ) {

            const name =
                chunkMap.get(
                    customerId
                ) ||
                "";


            setCachedCustomerName(

                numericBranchId,

                customerId,

                name

            );


            result.set(

                customerId,

                name

            );

        }

    }


    console.log(

        `[customerIntelligence] CUSTOMER LOOKUP branch=${numericBranchId} requested=${ids.length} fetched=${missingIds.length}`

    );


    return result;

}


function enrichRowsWithCustomerNames(
    rows,
    customerNames
) {

    if (
        !Array.isArray(
            rows
        )
    ) {

        return [];

    }


    return rows.map(

        row => {

            const customerId =
                normalizeCustomerId(
                    row?.customerId
                );


            if (
                !customerId
            ) {

                return row;

            }


            const name =
                customerNames.get(
                    customerId
                );


            return {

                ...row,

                customerName:
                    name ||
                    row.customerName ||
                    "غير معروف"

            };

        }

    );

}


/*
 * =========================================================
 * CUSTOMER AGGREGATION
 * =========================================================
 */

function createCustomerBucket(
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

        tickets:
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

                createCustomerBucket(
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


        const units =
            Math.abs(

                toNumber(
                    row.baseUnits
                )

            );


        const date =
            parseDate(
                row.date
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
                units;


            if (
                row.ticketId !== null &&
                row.ticketId !== undefined
            ) {

                customer.tickets.add(

                    String(
                        row.ticketId
                    )

                );

            }


            if (
                date
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


        customer.netSales =
            customer.grossSales -
            customer.returns;

    }


    return customers;

}


function summarizeCustomers(
    customerMap
) {

    const customers =
        Array.from(
            customerMap.values()
        );


    const totalSales =
        customers.reduce(

            (
                total,
                customer
            ) =>
                total +
                customer.netSales,

            0

        );


    const totalTickets =
        customers.reduce(

            (
                total,
                customer
            ) =>
                total +
                customer.tickets.size,

            0

        );


    const totalUnits =
        customers.reduce(

            (
                total,
                customer
            ) =>
                total +
                customer.units,

            0

        );


    return {

        customersCount:
            customers.length,

        netSales:
            round2(
                totalSales
            ),

        tickets:
            totalTickets,

        units:
            round2(
                totalUnits
            ),

        averageCustomerValue:

            customers.length > 0

                ? round2(

                    totalSales /
                    customers.length

                )

                : 0,

        averageFrequency:

            customers.length > 0

                ? round2(

                    totalTickets /
                    customers.length

                )

                : 0

    };

}


/*
 * =========================================================
 * CUSTOMER INTELLIGENCE
 * =========================================================
 */

export async function getCustomerIntelligence(
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
     * LOAD SALES
     * =====================================================
     *
     * No Cards JOIN exists inside salesService now.
     *
     * This reads Sales Cache / Monthly Cache first.
     * =====================================================
     */

    const currentRows =
        await getSales({

            branchId:
                numericBranchId,

            connection,

            fromDate:
                currentFromDate,

            toDate:
                currentToDate

        });


    const previousRows =
        await getSales({

            branchId:
                numericBranchId,

            connection,

            fromDate:
                previousPeriod.fromDate,

            toDate:
                previousPeriod.toDate

        });


    /*
     * =====================================================
     * CUSTOMER LOOKUP
     * =====================================================
     *
     * Collect IDs from both periods and ask Cards only for
     * those IDs.
     * =====================================================
     */

    const currentCustomerIds =
        getUniqueCustomerIds(
            currentRows
        );


    const previousCustomerIds =
        getUniqueCustomerIds(
            previousRows
        );


    const customerIds =
        Array.from(

            new Set([

                ...currentCustomerIds,

                ...previousCustomerIds

            ])

        );


    const customerNames =
        await lookupCustomerNames({

            branchId:
                numericBranchId,

            customerIds,

            connection

        });


    const enrichedCurrentRows =
        enrichRowsWithCustomerNames(

            currentRows,

            customerNames

        );


    const enrichedPreviousRows =
        enrichRowsWithCustomerNames(

            previousRows,

            customerNames

        );


    /*
     * =====================================================
     * AGGREGATION
     * =====================================================
     */

    const currentCustomers =
        aggregateCustomers(

            enrichedCurrentRows

        );


    const previousCustomers =
        aggregateCustomers(

            enrichedPreviousRows

        );


    const currentSummary =
        summarizeCustomers(

            currentCustomers

        );


    const previousSummary =
        summarizeCustomers(

            previousCustomers

        );


    /*
     * =====================================================
     * NEW / RETURNING
     * =====================================================
     *
     * "New" means:
     *
     * active now
     * AND
     * not active in previous comparison period.
     *
     * It does not mean first-ever customer.
     * =====================================================
     */

    const newCustomers =
        [];


    const returningCustomers =
        [];


    for (
        const [
            customerId,
            customer
        ]
        of currentCustomers
    ) {

        if (
            previousCustomers.has(
                customerId
            )
        ) {

            returningCustomers.push(
                customer
            );

        }
        else {

            newCustomers.push(
                customer
            );

        }

    }


    /*
     * =====================================================
     * LOST CUSTOMERS
     * =====================================================
     */

    const lostCustomers =
        [];


    for (
        const [
            customerId,
            customer
        ]
        of previousCustomers
    ) {

        if (
            !currentCustomers.has(
                customerId
            )
        ) {

            lostCustomers.push(
                customer
            );

        }

    }


    function customerValue(
        items
    ) {

        return round2(

            items.reduce(

                (
                    total,
                    customer
                ) =>
                    total +
                    customer.netSales,

                0

            )

        );

    }


    function customerTickets(
        items
    ) {

        return items.reduce(

            (
                total,
                customer
            ) =>
                total +
                customer.tickets.size,

            0

        );

    }


    function customerUnits(
        items
    ) {

        return round2(

            items.reduce(

                (
                    total,
                    customer
                ) =>
                    total +
                    customer.units,

                0

            )

        );

    }


    const newSales =
        customerValue(
            newCustomers
        );


    const returningSales =
        customerValue(
            returningCustomers
        );


    const lostSales =
        customerValue(
            lostCustomers
        );


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
                currentSummary.customersCount,

            netSales:
                currentSummary.netSales,

            tickets:
                currentSummary.tickets,

            units:
                currentSummary.units,

            averageCustomerValue:
                currentSummary.averageCustomerValue,

            averageFrequency:
                currentSummary.averageFrequency

        },

        comparison: {

            customers:
                previousSummary.customersCount,

            netSales:
                previousSummary.netSales,

            tickets:
                previousSummary.tickets,

            units:
                previousSummary.units,

            averageCustomerValue:
                previousSummary.averageCustomerValue,

            averageFrequency:
                previousSummary.averageFrequency

        },

        changes: {

            customers:

                currentSummary.customersCount -
                previousSummary.customersCount,

            netSales:

                round2(

                    currentSummary.netSales -
                    previousSummary.netSales

                ),

            tickets:

                currentSummary.tickets -
                previousSummary.tickets,

            units:

                round2(

                    currentSummary.units -
                    previousSummary.units

                ),

            averageCustomerValue:

                round2(

                    currentSummary.averageCustomerValue -
                    previousSummary.averageCustomerValue

                ),

            averageFrequency:

                round2(

                    currentSummary.averageFrequency -
                    previousSummary.averageFrequency

                )

        },

        customerLifecycle: {

            new: {

                customers:
                    newCustomers.length,

                netSales:
                    newSales,

                tickets:
                    customerTickets(
                        newCustomers
                    ),

                units:
                    customerUnits(
                        newCustomers
                    )

            },

            returning: {

                customers:
                    returningCustomers.length,

                netSales:
                    returningSales,

                tickets:
                    customerTickets(
                        returningCustomers
                    ),

                units:
                    customerUnits(
                        returningCustomers
                    )

            },

            lost: {

                customers:
                    lostCustomers.length,

                previousNetSales:
                    lostSales,

                tickets:
                    customerTickets(
                        lostCustomers
                    ),

                units:
                    customerUnits(
                        lostCustomers
                    )

            }

        },

        frequency: {

            currentAverageTicketsPerCustomer:
                currentSummary.averageFrequency,

            previousAverageTicketsPerCustomer:
                previousSummary.averageFrequency,

            change:

                round2(

                    currentSummary.averageFrequency -
                    previousSummary.averageFrequency

                )

        },

        customerValue: {

            currentAverageNetSalesPerCustomer:
                currentSummary.averageCustomerValue,

            previousAverageNetSalesPerCustomer:
                previousSummary.averageCustomerValue,

            change:

                round2(

                    currentSummary.averageCustomerValue -
                    previousSummary.averageCustomerValue

                )

        }

    };

}


/*
 * =========================================================
 * EXPORTS
 * =========================================================
 */

export default {

    getCustomerIntelligence

};