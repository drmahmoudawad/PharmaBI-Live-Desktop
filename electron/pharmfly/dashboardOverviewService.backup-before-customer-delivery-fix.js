import {
    getAllSavedConnections
} from "../settings/connectionStore.js";


import {
    getSales
} from "./sales/salesService.js";


import {
    getBranchPool
} from "../connection/connectionManager.js";


function number(
    value
) {

    const result =
        Number(value);


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
            number(value) +
            Number.EPSILON
        ) * factor
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


function daysInclusive(
    fromDate,
    toDate
) {

    const from =
        new Date(
            `${fromDate}T00:00:00Z`
        ).getTime();


    const to =
        new Date(
            `${toDate}T00:00:00Z`
        ).getTime();


    return Math.max(
        1,
        Math.floor(
            (
                to -
                from
            ) /
            86400000
        ) +
        1
    );

}


function addDay(
    dateText
) {

    const date =
        new Date(
            `${dateText}T00:00:00Z`
        );


    date.setUTCDate(
        date.getUTCDate() +
        1
    );


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


function newDailyBucket(
    date
) {

    return {

        date,

        sales:
            0,

        deliverySales:
            0,

        tickets:
            new Set(),

        customers:
            new Set(),

        deliveryTickets:
            new Set()

    };

}


/*
 * =========================================================
 * TICKET LEVEL AUTHORITATIVE DATA
 * =========================================================
 */

async function loadEmployeeNames(
    branchId,
    connection,
    fromDate,
    toDate
) {

    const pool =
        await getBranchPool(
            Number(branchId),
            connection
        );


    /*
     * Ticket-level facts come directly from posTickets.
     *
     * Customers:
     *   distinct CustomerID per day,
     *   excluding returns and guests.
     *
     * Delivery:
     *   DeliveryBoyId identifies a delivery order.
     *
     * Seller:
     *
     *   posTickets.PinNumber
     *          ↓
     *   Cards.ID
     *          ↓
     *   Cards.Name
     *
     * Users is deliberately NOT used.
     */

    const customerIdsByDay =
        new Map();


    const deliveryTicketsByDay =
        new Map();


    const deliveryTicketIds =
        new Set();


    const ticketResult =
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

                    t.ID
                        AS ticket_id,


                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    )
                        AS employee_id,


                    CONVERT(
                        varchar(10),
                        CAST(
                            t.ztime AS date
                        ),
                        23
                    )
                        AS ticket_date,


                    t.CustomerID
                        AS customer_id,


                    customer_data.customer_name
                        AS ticket_customer_name,


                    t.DeliveryBoyId
                        AS delivery_boy_id,


                    t.SalesReturn
                        AS sales_return


                FROM dbo.posTickets t


                OUTER APPLY (

                    SELECT TOP (1)

                        NULLIF(

                            LTRIM(
                                RTRIM(

                                    CONVERT(
                                        nvarchar(400),
                                        pi.CustomerName
                                    )

                                )
                            ),

                            N''
                        )
                            AS customer_name

                    FROM dbo.posItems pi

                    WHERE
                        pi.TicketID =
                        t.ID

                    ORDER BY
                        pi.ID DESC

                )
                    customer_data


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
                    );

            `);


    const employeeKeyByTicketId =
        new Map();


    const employeeKeys =
        new Set();


    for (
        const row
        of ticketResult?.recordset || []
    ) {

        const ticketId =
            row?.ticket_id === null ||
            row?.ticket_id === undefined

                ? ""

                : String(
                    row.ticket_id
                ).trim();


        const employeeId =
            row?.employee_id === null ||
            row?.employee_id === undefined

                ? ""

                : String(
                    row.employee_id
                ).trim();


        const dateText =
            String(
                row?.ticket_date ||
                ""
            ).slice(
                0,
                10
            );


        const salesReturn =
            Number(
                row?.sales_return
            ) ||
            0;


        const isReturn =
            salesReturn === 2;


        /*
         * =====================================================
         * CUSTOMER COUNT
         * =====================================================
         *
         * We use the authoritative ticket-level customer data.
         *
         * Real customer:
         *
         *   CustomerID > 0
         *
         * Fallback:
         *
         *   CustomerName
         *
         * Returns are excluded.
         */

        if (
            dateText &&
            !isReturn
        ) {

            const customerId =
                row?.customer_id === null ||
                row?.customer_id === undefined

                    ? ""

                    : String(
                        row.customer_id
                    ).trim();


            const ticketCustomerName =
                String(
                    row?.ticket_customer_name ||
                    ""
                ).trim();


            const customerKey =

                customerId &&
                customerId !== "0"

                    ?

                    `id:${customerId}`

                    :

                    ticketCustomerName

                        ?

                        `name:${ticketCustomerName}`

                        :

                        "";


            if (
                customerKey
            ) {

                if (
                    !customerIdsByDay.has(
                        dateText
                    )
                ) {

                    customerIdsByDay.set(

                        dateText,

                        new Set()

                    );

                }


                customerIdsByDay

                    .get(
                        dateText
                    )

                    .add(
                        customerKey
                    );

            }


            /*
             * =================================================
             * DELIVERY
             * =================================================
             */

            const deliveryBoyId =
                row?.delivery_boy_id === null ||
                row?.delivery_boy_id === undefined

                    ? ""

                    : String(
                        row.delivery_boy_id
                    ).trim();


            if (

                deliveryBoyId &&

                deliveryBoyId !== "0" &&

                ticketId

            ) {

                deliveryTicketIds.add(
                    ticketId
                );


                if (
                    !deliveryTicketsByDay.has(
                        dateText
                    )
                ) {

                    deliveryTicketsByDay.set(

                        dateText,

                        new Set()

                    );

                }


                deliveryTicketsByDay

                    .get(
                        dateText
                    )

                    .add(
                        ticketId
                    );

            }

        }


        /*
         * =====================================================
         * SELLER KEY
         * =====================================================
         */

        if (

            ticketId &&

            employeeId &&

            employeeId !== "0"

        ) {

            employeeKeyByTicketId.set(

                ticketId,

                employeeId

            );


            employeeKeys.add(
                employeeId
            );

        }

    }


    /*
     * =========================================================
     * RESOLVE SELLER NAMES FROM Cards
     * =========================================================
     */

    const names =
        new Map();


    if (
        employeeKeys.size === 0
    ) {

        console.warn(

            `[dashboardOverviewService] No PinNumber employee IDs found for branch=${branchId} range=${fromDate}|${toDate}`

        );


        return {

            names,

            employeeKeyByTicketId,

            customerIdsByDay,

            deliveryTicketsByDay,

            deliveryTicketIds

        };

    }


    const request =
        pool.request();


    const placeholders =

        Array.from(
            employeeKeys
        )

        .map(

            (
                employeeId,
                index
            ) => {

                const parameterName =
                    `employeePin${index}`;


                request.input(
                    parameterName,
                    employeeId
                );


                return `@${parameterName}`;

            }

        );


    const result =
        await request.query(`

            SET NOCOUNT ON;


            SELECT

                CONVERT(
                    nvarchar(100),
                    c.ID
                )
                    AS employee_id,


                LTRIM(
                    RTRIM(
                        CONVERT(
                            nvarchar(400),
                            c.Name
                        )
                    )
                )
                    AS employee_name


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
                ) IN (
                    ${placeholders.join(", ")}
                )

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


    for (
        const row
        of result?.recordset || []
    ) {

        const employeeId =
            String(
                row?.employee_id ||
                ""
            ).trim();


        const employeeName =
            String(
                row?.employee_name ||
                ""
            ).trim();


        if (
            employeeId &&
            employeeName
        ) {

            names.set(
                employeeId,
                employeeName
            );

        }

    }


    console.log(

        `[dashboardOverviewService] Employee mapping branch=${branchId}: tickets=${employeeKeyByTicketId.size} uniquePinNumbers=${employeeKeys.size} resolvedEmployeeNames=${names.size}`

    );


    const unresolved =

        Array.from(
            employeeKeys
        )

        .filter(
            employeeId =>
                !names.has(
                    employeeId
                )
        );


    if (
        unresolved.length > 0
    ) {

        console.warn(

            "[dashboardOverviewService] Employee IDs without Cards employee match:",

            unresolved.slice(
                0,
                30
            )

        );

    }


    return {

        names,

        employeeKeyByTicketId,

        customerIdsByDay,

        deliveryTicketsByDay,

        deliveryTicketIds

    };

}


/*
 * =========================================================
 * AGGREGATION
 * =========================================================
 */

function aggregateRows(
    rows,
    fromDate,
    toDate,
    employeeNames = new Map(),
    employeeKeyByTicketId = new Map(),
    customerIdsByDay = new Map(),
    deliveryTicketsByDay = new Map(),
    deliveryTicketIds = new Set()
) {

    const daily =
        new Map();


    const customers =
        new Map();


    const products =
        new Map();


    const employees =
        new Map();


    let totalSales =
        0;


    let deliverySales =
        0;


    const allTickets =
        new Set();


    const deliveryTickets =
        new Set();


    for (
        const row
        of Array.isArray(rows)
            ? rows
            : []
    ) {

        const dateText =
            String(
                row?.date ||
                ""
            ).slice(
                0,
                10
            );


        if (
            !dateText
        ) {

            continue;

        }


        const isReturn =
            row.transactionType ===
            "RETURN";


        const salesValue =
            isReturn

                ?

                -Math.abs(
                    number(
                        row.netLineValue
                    )
                )

                :

                number(
                    row.netLineValue
                );


        const ticketId =
            row.ticketId == null

                ? null

                : String(
                    row.ticketId
                );


        const customerId =
            row.customerId == null

                ? null

                : String(
                    row.customerId
                );


        const customerName =
            String(
                row.customerName ||
                ""
            ).trim();


        const isDelivery =

            ticketId &&

            deliveryTicketIds.has(
                ticketId
            );


        if (
            !daily.has(
                dateText
            )
        ) {

            daily.set(

                dateText,

                newDailyBucket(
                    dateText
                )

            );

        }


        const day =
            daily.get(
                dateText
            );


        day.sales +=
            salesValue;


        if (
            ticketId
        ) {

            day.tickets.add(
                ticketId
            );


            allTickets.add(
                ticketId
            );

        }


        if (
            isDelivery
        ) {

            day.deliverySales +=
                salesValue;


            deliverySales +=
                salesValue;

        }


        totalSales +=
            salesValue;


        /*
         * =====================================================
         * TOP CUSTOMERS
         * =====================================================
         *
         * Use customer ID when available.
         *
         * Never create a customer row for guest / cash tickets.
         */

        if (

            customerId &&

            customerId !== "0"

        ) {

            const key =
                customerId;


            if (
                !customers.has(
                    key
                )
            ) {

                customers.set(

                    key,

                    {

                        customerId:
                            key,

                        customerName:
                            customerName ||
                            key,

                        sales:
                            0,

                        invoices:
                            new Set()

                    }

                );

            }


            const customer =
                customers.get(
                    key
                );


            customer.sales +=
                salesValue;


            if (
                ticketId
            ) {

                customer.invoices.add(
                    ticketId
                );

            }


            if (

                customerName &&

                (
                    !customer.customerName ||
                    customer.customerName === key
                )

            ) {

                customer.customerName =
                    customerName;

            }

        }


        /*
         * =====================================================
         * TOP PRODUCTS
         * =====================================================
         */

        const itemId =
            row.itemId == null

                ? null

                : String(
                    row.itemId
                );


        if (
            itemId
        ) {

            if (
                !products.has(
                    itemId
                )
            ) {

                products.set(

                    itemId,

                    {

                        itemId,

                        itemName:
                            row.itemName ||
                            itemId,

                        sales:
                            0,

                        units:
                            0,

                        invoices:
                            new Set()

                    }

                );

            }


            const product =
                products.get(
                    itemId
                );


            product.sales +=
                salesValue;


            product.units +=

                isReturn

                    ?

                    -Math.abs(
                        number(
                            row.baseUnits
                        )
                    )

                    :

                    number(
                        row.baseUnits
                    );


            if (
                ticketId
            ) {

                product.invoices.add(
                    ticketId
                );

            }

        }


        /*
         * =====================================================
         * SELLER
         * =====================================================
         */

        const ticketEmployeeKey =

            ticketId &&

            employeeKeyByTicketId.has(
                ticketId
            )

                ?

                employeeKeyByTicketId.get(
                    ticketId
                )

                :

                null;


        /*
         * SalesRepID is deliberately NOT used
         * as a seller fallback.
         *
         * Real seller identity:
         *
         * PinNumber -> Cards.ID -> Cards.Name
         */

        const employeeId =

            ticketEmployeeKey ||

            "UNASSIGNED";


        if (
            !employees.has(
                employeeId
            )
        ) {

            employees.set(

                employeeId,

                {

                    employeeId,

                    employeeName:

                        employeeId ===
                        "UNASSIGNED"

                            ?

                            "غير محدد"

                            :

                            (

                                employeeNames.get(
                                    employeeId
                                ) ||

                                "غير محدد"

                            ),

                    sales:
                        0,

                    invoices:
                        new Set(),

                    customers:
                        new Set(),

                    units:
                        0

                }

            );

        }


        const employee =
            employees.get(
                employeeId
            );


        employee.sales +=
            salesValue;


        employee.units +=

            isReturn

                ?

                -Math.abs(
                    number(
                        row.baseUnits
                    )
                )

                :

                number(
                    row.baseUnits
                );


        if (
            ticketId
        ) {

            employee.invoices.add(
                ticketId
            );

        }


        if (

            !isReturn &&

            customerId &&

            customerId !== "0"

        ) {

            employee.customers.add(
                customerId
            );

        }

        else if (

            !isReturn &&

            customerName

        ) {

            employee.customers.add(
                `name:${customerName}`
            );

        }

    }


    const numberOfDays =
        daysInclusive(
            fromDate,
            toDate
        );


    /*
     * =========================================================
     * AUTHORITATIVE DAILY CUSTOMER COUNTS
     * =========================================================
     */

    for (
        const [
            dateText,
            customerIds
        ]
        of customerIdsByDay.entries()
    ) {

        if (
            !daily.has(
                dateText
            )
        ) {

            daily.set(

                dateText,

                newDailyBucket(
                    dateText
                )

            );

        }


        const day =
            daily.get(
                dateText
            );


        for (
            const customerId
            of customerIds
        ) {

            day.customers.add(
                customerId
            );

        }

    }


    /*
     * =========================================================
     * AUTHORITATIVE DAILY DELIVERY COUNTS
     * =========================================================
     */

    for (
        const [
            dateText,
            ticketIds
        ]
        of deliveryTicketsByDay.entries()
    ) {

        if (
            !daily.has(
                dateText
            )
        ) {

            daily.set(

                dateText,

                newDailyBucket(
                    dateText
                )

            );

        }


        const day =
            daily.get(
                dateText
            );


        for (
            const ticketId
            of ticketIds
        ) {

            day.deliveryTickets.add(
                ticketId
            );


            deliveryTickets.add(
                ticketId
            );

        }

    }


    const dailyRows =
        [];


    let cursor =
        fromDate;


    while (
        cursor <=
        toDate
    ) {

        const bucket =

            daily.get(
                cursor
            )

            ||

            newDailyBucket(
                cursor
            );


        dailyRows.push({

            date:
                cursor,

            sales:
                round(
                    bucket.sales
                ),

            tickets:
                bucket.tickets.size,

            customers:
                bucket.customers.size,

            deliverySales:
                round(
                    bucket.deliverySales
                ),

            deliveryTickets:
                bucket.deliveryTickets.size

        });


        cursor =
            addDay(
                cursor
            );

    }


    /*
     * =========================================================
     * TOP CUSTOMERS
     * =========================================================
     */

    const topCustomers =

        [
            ...customers.values()
        ]

        .map(
            item => ({

                customerId:
                    item.customerId,

                customerName:
                    item.customerName,

                sales:
                    round(
                        item.sales
                    ),

                invoices:
                    item.invoices.size,

                averageInvoice:
                    round(

                        item.invoices.size

                            ?

                            item.sales /
                            item.invoices.size

                            :

                            0

                    )

            })
        )

        .filter(
            item =>
                item.sales !== 0
        )

        .sort(
            (
                a,
                b
            ) =>
                b.sales -
                a.sales
        )

        .slice(
            0,
            10
        );


    /*
     * =========================================================
     * TOP PRODUCTS
     * =========================================================
     */

    const topProducts =

        [
            ...products.values()
        ]

        .map(
            item => ({

                itemId:
                    item.itemId,

                itemName:
                    item.itemName,

                sales:
                    round(
                        item.sales
                    ),

                units:
                    round(
                        item.units
                    ),

                invoices:
                    item.invoices.size

            })
        )

        .filter(
            item =>
                item.sales !== 0
        )

        .sort(
            (
                a,
                b
            ) =>
                b.sales -
                a.sales
        )

        .slice(
            0,
            10
        );


    /*
     * =========================================================
     * TOP EMPLOYEES
     * =========================================================
     */

    const topEmployees =

        [
            ...employees.values()
        ]

        .map(
            item => ({

                employeeId:
                    item.employeeId,

                employeeName:
                    item.employeeName,

                sales:
                    round(
                        item.sales
                    ),

                invoices:
                    item.invoices.size,

                customers:
                    item.customers.size,

                averageDailySales:
                    round(

                        item.sales /
                        numberOfDays

                    ),

                averageDailyInvoices:
                    round(

                        item.invoices.size /
                        numberOfDays

                    ),

                averageInvoice:
                    round(

                        item.invoices.size

                            ?

                            item.sales /
                            item.invoices.size

                            :

                            0

                    ),

                units:
                    round(
                        item.units
                    )

            })
        )

        .filter(
            item =>
                item.sales !== 0
        )

        .sort(
            (
                a,
                b
            ) =>
                b.sales -
                a.sales
        );


    /*
     * =========================================================
     * FINAL RESULT
     * =========================================================
     */

    return {

        totalSales:
            round(
                totalSales
            ),


        averageDailySales:
            round(

                totalSales /
                numberOfDays

            ),


        averageDailyCustomers:
            round(

                dailyRows.reduce(

                    (
                        sum,
                        row
                    ) =>
                        sum +
                        row.customers,

                    0

                ) /
                numberOfDays

            ),


        deliverySales:
            round(
                deliverySales
            ),


        averageDailyDeliverySales:
            round(

                deliverySales /
                numberOfDays

            ),


        deliveryTickets:
            deliveryTickets.size,


        averageDailyDeliveryTickets:
            round(

                deliveryTickets.size /
                numberOfDays

            ),


        averageDailyDeliveryInvoices:
            round(

                deliveryTickets.size /
                numberOfDays

            ),


        totalDeliveryTickets:
            deliveryTickets.size,


        deliveryInvoices:
            deliveryTickets.size,


        invoiceCount:
            allTickets.size,


        daily:
            dailyRows,


        topCustomers,


        topProducts,


        employees:
            topEmployees

    };

}


/*
 * =========================================================
 * LOAD BRANCH
 * =========================================================
 */

async function loadBranch(
    branch,
    fromDate,
    toDate
) {

    const rows =
        await getSales({

            branchId:
                branch.branchId,

            connection:
                branch,

            fromDate,

            toDate

        });


    const employeeContext =

        await loadEmployeeNames(

            branch.branchId,

            branch,

            fromDate,

            toDate

        );


    const result =
        aggregateRows(

            rows,

            fromDate,

            toDate,

            employeeContext.names,

            employeeContext.employeeKeyByTicketId,

            employeeContext.customerIdsByDay,

            employeeContext.deliveryTicketsByDay,

            employeeContext.deliveryTicketIds

        );


    return {

        ...result,

        branchId:
            Number(
                branch.branchId
            ),

        branchName:
            branch.branchName ||
            `Branch ${branch.branchId}`

    };

}


/*
 * =========================================================
 * PUBLIC API
 * =========================================================
 */

export async function getDashboardOverview({

    branchId,

    fromDate,

    toDate,

    connection = null

}) {

    const start =
        validateDate(
            fromDate,
            "fromDate"
        );


    const end =
        validateDate(
            toDate,
            "toDate"
        );


    if (
        start >
        end
    ) {

        throw new Error(
            "fromDate cannot be greater than toDate"
        );

    }


    /*
     * =====================================================
     * ALL BRANCHES
     * =====================================================
     */

    if (

        branchId ===
        "all"

        ||

        branchId ===
        null

        ||

        branchId ===
        undefined

    ) {

        const branches =
            getAllSavedConnections();


        const loaded =
            await Promise.all(

                branches.map(

                    branch =>
                        loadBranch(

                            branch,

                            start,

                            end

                        )

                )

            );


        const combinedRows =
            [];


        for (
            const branch
            of loaded
        ) {

            combinedRows.push(

                ...branch.daily.map(

                    row => ({

                        ...row,

                        branchId:
                            branch.branchId,

                        branchName:
                            branch.branchName

                    })

                )

            );

        }


        const dailyMap =
            new Map();


        for (
            const item
            of combinedRows
        ) {

            if (
                !dailyMap.has(
                    item.date
                )
            ) {

                dailyMap.set(

                    item.date,

                    {

                        date:
                            item.date,

                        sales:
                            0,

                        tickets:
                            0,

                        customers:
                            0,

                        deliverySales:
                            0,

                        deliveryTickets:
                            0

                    }

                );

            }


            const day =
                dailyMap.get(
                    item.date
                );


            day.sales +=
                number(
                    item.sales
                );


            day.tickets +=
                number(
                    item.tickets
                );


            day.customers +=
                number(
                    item.customers
                );


            day.deliverySales +=
                number(
                    item.deliverySales
                );


            day.deliveryTickets +=
                number(
                    item.deliveryTickets
                );

        }


        const customerMap =
            new Map();


        const productMap =
            new Map();


        const employeeMap =
            new Map();


        let totalSales =
            0;


        let deliverySales =
            0;


        let invoiceCount =
            0;


        let deliveryTickets =
            0;


        for (
            const branch
            of loaded
        ) {

            totalSales +=
                branch.totalSales;


            deliverySales +=
                branch.deliverySales;


            invoiceCount +=
                branch.invoiceCount;


            deliveryTickets +=
                branch.deliveryTickets;


            for (
                const item
                of branch.topCustomers
            ) {

                const key =
                    `${branch.branchId}:${item.customerId}`;


                customerMap.set(

                    key,

                    {

                        ...item,

                        customerName:
                            item.customerName,

                        branchId:
                            branch.branchId,

                        branchName:
                            branch.branchName

                    }

                );

            }


            for (
                const item
                of branch.topProducts
            ) {

                const key =
                    `${branch.branchId}:${item.itemId}`;


                productMap.set(

                    key,

                    {

                        ...item,

                        branchId:
                            branch.branchId,

                        branchName:
                            branch.branchName

                    }

                );

            }


            for (
                const item
                of branch.employees
            ) {

                const key =
                    `${branch.branchId}:${item.employeeId}`;


                employeeMap.set(

                    key,

                    {

                        ...item,

                        branchId:
                            branch.branchId,

                        branchName:
                            branch.branchName

                    }

                );

            }

        }


        const numberOfDays =
            daysInclusive(
                start,
                end
            );


        const daily =
            [];


        let cursor =
            start;


        while (
            cursor <=
            end
        ) {

            const item =

                dailyMap.get(
                    cursor
                )

                ||

                {

                    date:
                        cursor,

                    sales:
                        0,

                    tickets:
                        0,

                    customers:
                        0,

                    deliverySales:
                        0,

                    deliveryTickets:
                        0

                };


            daily.push({

                date:
                    cursor,

                sales:
                    round(
                        item.sales
                    ),

                tickets:
                    item.tickets,

                customers:
                    item.customers,

                deliverySales:
                    round(
                        item.deliverySales
                    ),

                deliveryTickets:
                    item.deliveryTickets

            });


            cursor =
                addDay(
                    cursor
                );

        }


        return {

            success:
                true,

            mode:
                "group",

            branchCount:
                loaded.length,

            fromDate:
                start,

            toDate:
                end,

            totalSales:
                round(
                    totalSales
                ),

            averageDailySales:
                round(

                    totalSales /
                    numberOfDays

                ),

            averageDailyCustomers:
                round(

                daily.reduce(

                    (
                        sum,
                        row
                    ) =>
                        sum +
                        row.customers,

                    0

                ) /
                numberOfDays

            ),

            deliverySales:
                round(
                    deliverySales
                ),

            averageDailyDeliverySales:
                round(

                    deliverySales /
                    numberOfDays

                ),

            deliveryTickets,

            averageDailyDeliveryTickets:
                round(

                    deliveryTickets /
                    numberOfDays

                ),

            averageDailyDeliveryInvoices:
                round(

                    deliveryTickets /
                    numberOfDays

                ),

            totalDeliveryTickets:
                deliveryTickets,

            deliveryInvoices:
                deliveryTickets,

            invoiceCount,

            daily,

            topCustomers:
                [
                    ...customerMap.values()
                ]

                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.sales -
                        a.sales
                )

                .slice(
                    0,
                    10
                ),

            topProducts:
                [
                    ...productMap.values()
                ]

                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.sales -
                        a.sales
                )

                .slice(
                    0,
                    10
                ),

            employees:
                [
                    ...employeeMap.values()
                ]

                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.sales -
                        a.sales
                )

        };

    }


    /*
     * =====================================================
     * SINGLE BRANCH
     * =====================================================
     */

    const branch = {

        ...(connection || {}),

        branchId:
            Number(
                branchId
            )

    };


    const result =
        await loadBranch(

            branch,

            start,

            end

        );


    return {

        success:
            true,

        mode:
            "branch",

        ...result

    };

}


export default {

    getDashboardOverview

};