import {
    getAllSavedConnections
} from "../settings/connectionStore.js";

import {
    getBranchPool
} from "../connection/connectionManager.js";


const CACHE_TTL_MS =
    5 * 60 * 1000;

const cache =
    new Map();

const inFlight =
    new Map();


function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}


function round(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(
        (number(value) + Number.EPSILON) * factor
    ) / factor;
}


function validateDate(value, name) {
    const text = String(value || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(
            `Invalid ${name}. Expected YYYY-MM-DD`
        );
    }

    return text;
}


function daysInclusive(fromDate, toDate) {
    const from =
        new Date(`${fromDate}T00:00:00Z`);

    const to =
        new Date(`${toDate}T00:00:00Z`);

    return Math.max(
        1,
        Math.floor(
            (to.getTime() - from.getTime()) / 86400000
        ) + 1
    );
}


async function withTimeout(
    promise,
    timeoutMs,
    label
) {

    let timer = null;

    const timeout =
        new Promise((_, reject) => {

            timer = setTimeout(() => {

                reject(
                    new Error(
                        `${label} timed out after ${timeoutMs}ms`
                    )
                );

            }, timeoutMs);

        });

    try {

        return await Promise.race([
            promise,
            timeout
        ]);

    }
    finally {

        if (timer) {
            clearTimeout(timer);
        }

    }

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
            branchId: Number(branchId)
        };

    }

    const found =
        getAllSavedConnections().find(
            item =>
                Number(item?.branchId) ===
                Number(branchId)
        );

    if (!found) {
        throw new Error(
            `Branch ${branchId} connection was not found.`
        );
    }

    return found;
}


async function loadBranch(
    branch,
    fromDate,
    toDate
) {

    const branchId =
        Number(branch.branchId);

    const key =
        `${branchId}|${fromDate}|${toDate}`;


    const cached =
        cache.get(key);

    if (
        cached &&
        Date.now() - cached.createdAt <= CACHE_TTL_MS
    ) {

        return cached.data;

    }


    console.log(`[seller-overview] LOADBRANCH PENDING CHECK branch=${branchId} key=${key}`);
    const pending =
        inFlight.get(key);

    if (pending) {
        console.log(`[seller-overview] PENDING RETURN branch=${branchId} key=${key}`);
        return pending;
    }


    const request =
        (async () => {

            console.log(
                `[seller-overview] Branch ${branchId} STAGE 1 START: getBranchPool`
            );
            const pool =
                await getBranchPool(
                    branchId,
                    branch
                );

            console.log(
                `[seller-overview] Branch ${branchId} STAGE 1 DONE: getBranchPool`
            );

            console.log(
                `[seller-overview] Branch ${branchId} STAGE 2 START: SQL ${fromDate}|${toDate}`
            );


            const result =
                await pool
                    .request()

                    .input(
                        "fromDate",
                        `${fromDate} 00:00:00`
                    )

                    .input(
                        "toDate",
                        `${toDate} 00:00:00`
                    )

                    .query(`
                        SET NOCOUNT ON;

                        SELECT
                            CONVERT(
                                nvarchar(100),
                                t.PinNumber
                            ) AS employeeId,

                            LTRIM(
                                RTRIM(
                                    CONVERT(
                                        nvarchar(400),
                                        sellerCard.Name
                                    )
                                )
                            ) AS employeeName,

                            SUM(
                                CASE
                                    WHEN t.SalesReturn = 2
                                    THEN -ABS(calculated.netLineValue)
                                    ELSE calculated.netLineValue
                                END
                            ) AS sales,

                            COUNT(
                                DISTINCT t.ID
                            ) AS invoices,

                            COUNT(
                                DISTINCT CASE
                                    WHEN
                                        t.SalesReturn <> 2
                                        AND t.CustomerID IS NOT NULL
                                        AND t.CustomerID <> 0
                                    THEN t.CustomerID
                                END
                            ) AS customers,

                            SUM(
                                CASE
                                    WHEN t.SalesReturn = 2
                                    THEN -ABS(calculated.baseUnits)
                                    ELSE calculated.baseUnits
                                END
                            ) AS units

                        FROM dbo.posTickets t

                        INNER JOIN dbo.posItems pi
                            ON pi.TicketID = t.ID

                        INNER JOIN dbo.Items i
                            ON i.ID = pi.ItemID

                        INNER JOIN dbo.Cards sellerCard
                            ON sellerCard.ID = t.PinNumber
                            AND ISNULL(
                                sellerCard.IsEmployee,
                                0
                            ) = 1

                        CROSS APPLY (
                            SELECT
                                CASE
                                    WHEN ISNULL(pi.iParts, 0) > 0
                                    THEN pi.iParts

                                    WHEN ISNULL(i.Parts, 0) > 0
                                    THEN i.Parts

                                    ELSE 1
                                END AS parts
                        ) partsData

                        CROSS APPLY (
                            SELECT
                                (
                                    ISNULL(pi.Packs, 0)
                                    *
                                    partsData.parts
                                )
                                +
                                ISNULL(pi.Units, 0)
                                AS baseUnits,

                                (
                                    (
                                        ISNULL(pi.Packs, 0)
                                        *
                                        partsData.parts
                                    )
                                    +
                                    ISNULL(pi.Units, 0)
                                )
                                *
                                (
                                    ISNULL(pi.SalesPrice, 0)
                                    /
                                    NULLIF(
                                        partsData.parts,
                                        0
                                    )
                                )
                                -
                                ISNULL(pi.Discount, 0)
                                -
                                ISNULL(pi.ExtraDiscount, 0)
                                AS netLineValue
                        ) calculated

                        WHERE
                            t.ztime >= @fromDate

                        AND
                            t.ztime < DATEADD(
                                day,
                                1,
                                @toDate
                            )

                        AND
                            t.PinNumber IS NOT NULL

                        GROUP BY
                            CONVERT(
                                nvarchar(100),
                                t.PinNumber
                            ),

                            LTRIM(
                                RTRIM(
                                    CONVERT(
                                        nvarchar(400),
                                        sellerCard.Name
                                    )
                                )
                            )

                        HAVING
                            SUM(
                                CASE
                                    WHEN t.SalesReturn = 2
                                    THEN -ABS(calculated.netLineValue)
                                    ELSE calculated.netLineValue
                                END
                            ) <> 0

                        ORDER BY
                            sales DESC

                        OPTION (RECOMPILE);
                    `);


            console.log(
                `[seller-overview] Branch ${branchId} STAGE 2 DONE: SQL rows=${result?.recordset?.length || 0}`
            );

            const numberOfDays =
                daysInclusive(
                    fromDate,
                    toDate
                );


            const employees =
                (result?.recordset || [])
                    .map(row => {

                        const sales =
                            number(row.sales);

                        const invoices =
                            number(row.invoices);

                        const customers =
                            number(row.customers);

                        const units =
                            number(row.units);

                        const employeeId =
                            String(
                                row.employeeId || ""
                            ).trim();

                        const employeeName =
                            String(
                                row.employeeName || ""
                            ).trim();

                        return {

                            employeeId,

                            employeeName:
                                employeeName ||
                                employeeId,

                            sales:
                                round(sales),

                            invoices,

                            customers,

                            units:
                                round(units),

                            averageDailySales:
                                round(
                                    sales /
                                    numberOfDays
                                ),

                            averageDailyInvoices:
                                round(
                                    invoices /
                                    numberOfDays
                                ),

                            averageInvoice:
                                round(
                                    invoices
                                        ? sales / invoices
                                        : 0
                                )

                        };

                    })
                    .filter(
                        row =>
                            row.employeeId &&
                            row.sales !== 0
                    );


            cache.set(
                key,
                {
                    createdAt:
                        Date.now(),
                    data:
                        employees
                }
            );


            return employees;

        })();


    inFlight.set(
        key,
        request
    );


    try {
        return await request;
    }
    finally {
        inFlight.delete(key);
    }
}


export async function getSellerOverview({
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

    if (start > end) {
        throw new Error(
            "fromDate cannot be greater than toDate"
        );
    }


    const isAll =
        branchId === "all" ||
        branchId === null ||
        branchId === undefined;


    if (isAll) {

        const branches =
            getAllSavedConnections();

        const results =
            await Promise.all(
                branches.map(
                    async branch => {

                        const branchId =
                            Number(branch?.branchId);

                        try {

                            return await withTimeout(
                                loadBranch(
                                    branch,
                                    start,
                                    end
                                ),
                                15000,
                                `Branch ${branchId}`
                            );

                        }
                        catch (error) {

                            console.warn(
                                `[seller-overview] skipping branch ${branchId}:`,
                                error?.message ||
                                error
                            );

                            return [];

                        }

                    }
                )
            );

        const employees =
            results.flat();

        employees.sort(
            (a, b) =>
                number(b.sales) -
                number(a.sales)
        );

        return {
            success: true,
            mode: "group",
            fromDate: start,
            toDate: end,
            employees
        };

    }


    const branch =
        resolveConnection(
            Number(branchId),
            connection
        );


    let employees;

    try {

        employees =
            await withTimeout(
                loadBranch(
                    branch,
                    start,
                    end
                ),
                15000,
                `Branch ${Number(branchId)}`
            );

    }
    catch (error) {

        const key =
            `${Number(branchId)}|${start}|${end}`;

        const pending =
            inFlight.get(key);

        if (pending) {
            inFlight.delete(key);
        }

        console.warn(
            `[seller-overview] cleared inFlight after timeout branch=${Number(branchId)} key=${key}`
        );

        throw error;

    }


    return {
        success: true,
        mode: "branch",
        branchId: Number(branchId),
        branchName:
            branch.branchName ||
            `Branch ${branchId}`,
        fromDate: start,
        toDate: end,
        employees
    };
}


export default {
    getSellerOverview
};



