import {
    getAllSavedConnections
} from "../settings/connectionStore.js";

import {
    getSales
} from "./sales/salesService.js";

import {
    getBranchPool
} from "../connection/connectionManager.js";


const employeeCache =
    new Map();


const CACHE_TTL_MS =
    10 * 60 * 1000;


function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
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
        ) *
        factor
    ) / factor;

}


function normalizeDate(value) {

    const text =
        String(value || "")
            .trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        throw new Error(
            `Invalid date: ${text}`
        );

    }

    return text;

}


function addDay(dateText) {

    const date =
        new Date(
            `${dateText}T00:00:00Z`
        );

    date.setUTCDate(
        date.getUTCDate() + 1
    );

    return date
        .toISOString()
        .slice(0, 10);

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
            (to - from) /
            86400000
        ) + 1
    );

}


function buildCacheKey(
    branchId,
    fromDate,
    toDate
) {

    return [
        Number(branchId),
        fromDate,
        toDate
    ].join("|");

}


async function loadEmployeeMap(
    branchId,
    connection,
    fromDate,
    toDate
) {

    const key =
        buildCacheKey(
            branchId,
            fromDate,
            toDate
        );

    const cached =
        employeeCache.get(key);

    if (
        cached &&
        (
            Date.now() -
            cached.createdAt
        ) < CACHE_TTL_MS
    ) {

        return cached.data;

    }


    const pool =
        await getBranchPool(
            Number(branchId),
            connection
        );


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

                    t.ID AS ticket_id,

                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) AS employee_id,

                    NULLIF(
                        LTRIM(
                            RTRIM(
                                CONVERT(
                                    nvarchar(400),
                                    c.Name
                                )
                            )
                        ),
                        N''
                    ) AS employee_name

                FROM dbo.posTickets t

                LEFT JOIN dbo.Cards c
                    ON c.ID = t.PinNumber
                    AND ISNULL(
                        c.IsEmployee,
                        0
                    ) = 1

                WHERE

                    t.ztime >= @fromDate

                AND

                    t.ztime < @toDateExclusive

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


    const ticketEmployeeKeyById =
        new Map();

    const employeeNames =
        new Map();


    for (
        const row
        of result?.recordset || []
    ) {

        const ticketId =
            row?.ticket_id == null
                ? ""
                : String(
                    row.ticket_id
                ).trim();

        const employeeId =
            row?.employee_id == null
                ? ""
                : String(
                    row.employee_id
                ).trim();

        const employeeName =
            row?.employee_name == null
                ? ""
                : String(
                    row.employee_name
                ).trim();


        if (
            ticketId &&
            employeeId &&
            employeeId !== "0"
        ) {

            ticketEmployeeKeyById.set(
                ticketId,
                employeeId
            );

        }


        if (
            employeeId &&
            employeeId !== "0" &&
            employeeName
        ) {

            employeeNames.set(
                employeeId,
                employeeName
            );

        }

    }


    const data = {
        ticketEmployeeKeyById,
        employeeNames
    };


    employeeCache.set(
        key,
        {
            createdAt: Date.now(),
            data
        }
    );


    console.log(
        `[sellerOverviewFast] branch=${branchId} tickets=${ticketEmployeeKeyById.size} employees=${employeeNames.size}`
    );


    return data;

}


function aggregateSellerRows(
    rows,
    employeeContext,
    fromDate,
    toDate
) {

    const employees =
        new Map();


    const numberOfDays =
        daysInclusive(
            fromDate,
            toDate
        );


    for (
        const row
        of Array.isArray(rows)
            ? rows
            : []
    ) {

        const ticketId =
            row?.ticketId == null
                ? ""
                : String(
                    row.ticketId
                ).trim();


        const employeeId =
            ticketId &&
            employeeContext
                .ticketEmployeeKeyById
                .has(ticketId)

                ? employeeContext
                    .ticketEmployeeKeyById
                    .get(ticketId)

                : "UNASSIGNED";


        const employeeName =
            employeeContext
                .employeeNames
                .get(employeeId) ||
            employeeId;


        if (
            !employees.has(
                employeeId
            )
        ) {

            employees.set(
                employeeId,
                {
                    employeeId,
                    employeeName,
                    sales: 0,
                    invoices: new Set(),
                    customers: new Set(),
                    units: 0
                }
            );

        }


        const employee =
            employees.get(
                employeeId
            );


        const isReturn =
            row?.transactionType ===
            "RETURN";


        const salesValue =
            isReturn
                ? -Math.abs(
                    number(
                        row?.netLineValue
                    )
                )
                : number(
                    row?.netLineValue
                );


        employee.sales +=
            salesValue;


        if (ticketId) {

            employee.invoices.add(
                ticketId
            );

        }


        const customerId =
            row?.customerId == null
                ? ""
                : String(
                    row.customerId
                ).trim();


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
            String(
                row?.customerName || ""
            ).trim()
        ) {

            employee.customers.add(
                `name:${String(
                    row.customerName
                ).trim()}`
            );

        }


        employee.units +=
            isReturn
                ? -Math.abs(
                    number(
                        row?.baseUnits
                    )
                )
                : number(
                    row?.baseUnits
                );

    }


    return [
        ...employees.values()
    ]
    .filter(
        employee =>
            employee.sales !== 0
    )
    .map(
        employee => {

            const invoiceCount =
                employee.invoices.size;

            const sales =
                round(
                    employee.sales
                );

            const customers =
                employee.customers.size;

            const units =
                round(
                    employee.units
                );


            return {

                employeeId:
                    employee.employeeId,

                employeeName:
                    employee.employeeName,

                sales,

                invoices:
                    invoiceCount,

                customers,

                units,

                averageDailySales:
                    round(
                        sales /
                        numberOfDays
                    ),

                averageDailyInvoices:
                    round(
                        invoiceCount /
                        numberOfDays
                    ),

                averageInvoice:
                    round(
                        invoiceCount
                            ? sales /
                              invoiceCount
                            : 0
                    )

            };

        }
    )
    .sort(
        (
            a,
            b
        ) =>
            b.sales -
            a.sales
    );

}


const branchInFlight =
    new Map();


async function loadBranch(
    branch,
    fromDate,
    toDate
) {

    const branchId =
        Number(
            branch?.branchId
        );


    const key =
        buildCacheKey(
            branchId,
            fromDate,
            toDate
        );


    const pending =
        branchInFlight.get(key);

    if (pending) {

        return pending;

    }


    const request =
        (async () => {

            const startedAt =
                Date.now();


            const rows =
                await getSales({

                    branchId,

                    connection:
                        branch,

                    fromDate,

                    toDate,

                    forceRefresh:
                        false

                });


            console.log(
                `[sellerOverviewFast] sales branch=${branchId} rows=${rows?.length || 0} ms=${Date.now() - startedAt}`
            );


            const employeeContext =
                await loadEmployeeMap(
                    branchId,
                    branch,
                    fromDate,
                    toDate
                );


            const employees =
                aggregateSellerRows(
                    rows,
                    employeeContext,
                    fromDate,
                    toDate
                );


            return {

                success:
                    true,

                mode:
                    "branch",

                branchId,

                branchName:
                    branch?.branchName ||
                    `Branch ${branchId}`,

                fromDate,

                toDate,

                employees

            };

        })();


    branchInFlight.set(
        key,
        request
    );


    try {

        return await request;

    }
    finally {

        branchInFlight.delete(
            key
        );

    }

}


export async function getSellerOverviewFast({

    branchId,

    fromDate,

    toDate,

    connection = null

}) {

    const start =
        normalizeDate(
            fromDate
        );

    const end =
        normalizeDate(
            toDate
        );


    if (
        start > end
    ) {

        throw new Error(
            "fromDate cannot be greater than toDate"
        );

    }


    if (
        branchId === "all" ||
        branchId === null ||
        branchId === undefined
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


        const employees =
            [];


        for (
            const branch
            of loaded
        ) {

            for (
                const employee
                of branch.employees
            ) {

                employees.push({

                    ...employee,

                    branchId:
                        branch.branchId,

                    branchName:
                        branch.branchName

                });

            }

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

            employees

        };

    }


    return loadBranch(
        {
            ...(connection || {}),
            branchId:
                Number(branchId)
        },
        start,
        end
    );

}


export default {
    getSellerOverviewFast
};
