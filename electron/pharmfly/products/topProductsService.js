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


function normalizeLimit(
    value
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        ) ||
        number <= 0
    ) {

        return 20;

    }


    return Math.min(
        Math.floor(
            number
        ),
        100
    );

}


export async function getTopProducts(
    {
        branchId,
        connection,
        fromDate,
        toDate,
        limit = 20
    }
) {

    const rows =
        await getSales({

            branchId,

            connection,

            fromDate,

            toDate

        });


    const products =
        new Map();


    for (
        const row
        of rows
    ) {

        if (
            row.itemId === null ||
            row.itemId === undefined ||
            row.itemId === ""
        ) {

            continue;

        }


        const itemId =
            String(
                row.itemId
            );


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
                        "غير معروف",

                    grossSales:
                        0,

                    discounts:
                        0,

                    returns:
                        0,

                    netSales:
                        0,

                    cost:
                        0,

                    grossProfit:
                        0,

                    units:
                        0,

                    saleLines:
                        0,

                    returnLines:
                        0,

                    tickets:
                        new Set()

                }

            );

        }


        const product =
            products.get(
                itemId
            );


        const value =
            Math.abs(
                toNumber(
                    row.netLineValue
                )
            );


        const cost =
            Math.abs(
                toNumber(
                    row.lineCost
                )
            );


        const units =
            Math.abs(
                toNumber(
                    row.baseUnits
                )
            );


        if (
            row.transactionType ===
            "RETURN"
        ) {

            product.returns +=
                value;


            product.cost -=
                cost;


            product.units -=
                units;


            product.returnLines +=
                1;

        }
        else {

            product.grossSales +=
                toNumber(
                    row.grossLineValue
                );


            product.discounts +=
                toNumber(
                    row.discount
                ) +
                toNumber(
                    row.extraDiscount
                );


            product.cost +=
                cost;


            product.units +=
                units;


            product.saleLines +=
                1;

        }


        if (
            row.ticketId !== null &&
            row.ticketId !== undefined
        ) {

            product.tickets.add(
                String(
                    row.ticketId
                )
            );

        }


        product.netSales =
            product.grossSales -
            product.discounts -
            product.returns;


        product.grossProfit =
            product.netSales -
            product.cost;

    }


    const productsList =
        Array.from(
            products.values()
        )
        .map(
            product => ({

                itemId:
                    product.itemId,

                itemName:
                    product.itemName,

                grossSales:
                    round2(
                        product.grossSales
                    ),

                discounts:
                    round2(
                        product.discounts
                    ),

                returns:
                    round2(
                        product.returns
                    ),

                netSales:
                    round2(
                        product.netSales
                    ),

                cost:
                    round2(
                        product.cost
                    ),

                grossProfit:
                    round2(
                        product.grossProfit
                    ),

                margin:
                    product.netSales !== 0

                        ? round2(
                            (
                                product.grossProfit /
                                product.netSales
                            ) * 100
                        )

                        : 0,

                units:
                    round2(
                        product.units
                    ),

                saleLines:
                    product.saleLines,

                returnLines:
                    product.returnLines,

                tickets:
                    product.tickets.size

            })
        )
        .sort(
            (
                a,
                b
            ) => {

                if (
                    b.netSales !==
                    a.netSales
                ) {

                    return (
                        b.netSales -
                        a.netSales
                    );

                }


                return (
                    b.grossProfit -
                    a.grossProfit
                );

            }
        );


    const normalizedLimit =
        normalizeLimit(
            limit
        );


    return {

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        limit:
            normalizedLimit,

        totalProducts:
            productsList.length,

        products:
            productsList.slice(
                0,
                normalizedLimit
            )

    };

}


export default {

    getTopProducts

};