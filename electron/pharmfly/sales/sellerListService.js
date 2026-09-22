import {
    getBranchPool
} from "../../connection/connectionManager.js";


const CACHE_TTL_MS =
    60 * 1000;


const sellerListCache =
    new Map();


function number(
    value
) {

    const x =
        Number(
            value
        );

    return Number.isFinite(
        x
    )
        ? x
        : 0;

}


function round(
    value
) {

    return Number(
        number(
            value
        ).toFixed(
            2
        )
    );

}


function daysBetween(
    fromDate,
    toDate
) {

    const from =
        new Date(
            `${fromDate}T00:00:00Z`
        );

    const to =
        new Date(
            `${toDate}T00:00:00Z`
        );

    return Math.max(
        1,
        Math.round(
            (
                to -
                from
            ) /
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
        Number(
            branchId
        ),
        fromDate,
        toDate
    ].join(
        "|"
    );

}


function getCached(
    key
) {

    const entry =
        sellerListCache.get(
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
        CACHE_TTL_MS
    ) {

        sellerListCache.delete(
            key
        );

        return null;

    }

    return entry.data;

}


function setCached(
    key,
    data
) {

    sellerListCache.set(

        key,

        {
            createdAt:
                Date.now(),

            data

        }

    );

}


export async function getSalesSellersFast(
    {
        branchId,
        fromDate,
        toDate,
        connection = null
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


    const key =
        buildCacheKey(
            numericBranchId,
            fromDate,
            toDate
        );


    const cached =
        getCached(
            key
        );


    if (
        cached
    ) {

        console.log(
            `[sellerListService] CACHE HIT ${key}`
        );

        return cached;

    }


    const startedAt =
        Date.now();


    const pool =
        await getBranchPool(
            numericBranchId,
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
                `${toDate} 00:00:00`
            )

            .query(`

                SET NOCOUNT ON;


                SELECT

                    CONVERT(
                        nvarchar(100),
                        t.PinNumber
                    ) AS employee_id,


                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ) AS employee_name,


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
                    ) AS invoices,


                    COUNT(
                        DISTINCT

                        CASE

                            WHEN
                                t.SalesReturn <> 2
                                AND
                                t.CustomerID IS NOT NULL
                                AND
                                t.CustomerID <> 0

                            THEN
                                t.CustomerID

                            ELSE
                                NULL

                        END

                    ) AS customers,


                    SUM(

                        CASE

                            WHEN
                                t.SalesReturn = 2

                            THEN
                                -ABS(
                                    calculated.base_units
                                )

                            ELSE
                                calculated.base_units

                        END

                    ) AS units


                FROM posTickets t


                INNER JOIN posItems pi

                    ON
                        pi.TicketID =
                        t.ID


                INNER JOIN Items i

                    ON
                        i.ID =
                        pi.ItemID


                INNER JOIN Cards c

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
                                )
                                *
                                partsData.parts
                            )
                            +
                            ISNULL(
                                pi.Units,
                                0
                            )
                        ) AS base_units,


                        (
                            (
                                ISNULL(
                                    pi.Packs,
                                    0
                                )
                                *
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
                        ) AS net_line_value

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
                        nvarchar(100),
                        t.PinNumber
                    ),

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    )


                ORDER BY

                    sales DESC;

            `);


    const numberOfDays =
        daysBetween(
            fromDate,
            toDate
        );


    const sellers =
        (
            result?.recordset ||
            []
        )
        .map(
            row => {

                const sales =
                    number(
                        row?.sales
                    );

                const invoices =
                    number(
                        row?.invoices
                    );

                const customers =
                    number(
                        row?.customers
                    );

                const units =
                    number(
                        row?.units
                    );


                return {

                    employeeId:
                        String(
                            row?.employee_id ||
                            ""
                        ).trim(),

                    employeeName:
                        String(
                            row?.employee_name ||
                            "غير محدد"
                        ).trim(),

                    sales:
                        round(
                            sales
                        ),

                    invoices,

                    customers,

                    units:
                        round(
                            units
                        ),

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
                            invoices > 0
                                ? sales /
                                    invoices
                                : 0
                        )

                };

            }
        )
        .filter(
            seller =>
                seller.sales !== 0
        );


    const data = {

        success:
            true,

        branchId:
            numericBranchId,

        fromDate,

        toDate,

        sellers,

        employees:
            sellers,

        totals: {

            sales:
                round(
                    sellers.reduce(
                        (
                            sum,
                            seller
                        ) =>
                            sum +
                            seller.sales,

                        0
                    )
                ),

            invoices:
                sellers.reduce(
                    (
                        sum,
                        seller
                    ) =>
                        sum +
                        seller.invoices,

                    0
                ),

            customers:
                sellers.reduce(
                    (
                        sum,
                        seller
                    ) =>
                        sum +
                        seller.customers,

                    0
                ),

            units:
                round(
                    sellers.reduce(
                        (
                            sum,
                            seller
                        ) =>
                            sum +
                            seller.units,

                        0
                    )
                )

        }

    };


    setCached(
        key,
        data
    );


    console.log(
        `[sellerListService] SQL ${key} -> sellers=${sellers.length} in ${Date.now() - startedAt} ms`
    );


    return data;

}


export function clearSalesSellersCache() {

    sellerListCache.clear();

}


export default {

    getSalesSellersFast,

    clearSalesSellersCache

};