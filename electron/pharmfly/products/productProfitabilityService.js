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


function calculateMargin(
    sales,
    profit
) {

    const netSales =
        toNumber(
            sales
        );


    if (
        netSales === 0
    ) {

        return 0;

    }


    return round2(
        (
            toNumber(
                profit
            ) /
            netSales
        ) * 100
    );

}


function createProduct(
    row
) {

    return {

        itemId:
            row.itemId,

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

        saleUnits:
            0,

        returnedUnits:
            0,

        saleLines:
            0,

        returnLines:
            0,

        tickets:
            new Set(),

        missingCostLines:
            0,

        zeroCostLines:
            0

    };

}


function applySaleRow(
    product,
    row
) {

    const gross =
        Math.abs(
            toNumber(
                row.grossLineValue
            )
        );


    const discount =
        Math.abs(
            toNumber(
                row.discount
            )
        );


    const extraDiscount =
        Math.abs(
            toNumber(
                row.extraDiscount
            )
        );


    const net =
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
        row.ticketId !== null &&
        row.ticketId !== undefined
    ) {

        product.tickets.add(
            String(
                row.ticketId
            )
        );

    }


    if (
        row.transactionType ===
        "RETURN"
    ) {

        product.returns +=
            net;


        product.returnedUnits +=
            units;


        product.returnLines +=
            1;


        /*
         * Return cost reverses the sold cost.
         */

        product.cost -=
            cost;

    }
    else {

        product.grossSales +=
            gross;


        product.discounts +=
            discount +
            extraDiscount;


        product.saleUnits +=
            units;


        product.saleLines +=
            1;


        product.cost +=
            cost;

    }


    /*
     * A missing purchase cost is different from
     * an existing purchase cost that produces zero
     * calculated line cost.
     */

    if (
        !row.purchaseDate ||
        toNumber(
            row.purchaseCost
        ) <= 0
    ) {

        product.missingCostLines +=
            1;

    }
    else if (
        cost === 0
    ) {

        product.zeroCostLines +=
            1;

    }


    product.netSales =
        product.grossSales -
        product.discounts -
        product.returns;


    product.grossProfit =
        product.netSales -
        product.cost;

}


function finalizeProduct(
    product
) {

    return {

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
            calculateMargin(
                product.netSales,
                product.grossProfit
            ),

        saleUnits:
            round2(
                product.saleUnits
            ),

        returnedUnits:
            round2(
                product.returnedUnits
            ),

        netUnits:
            round2(
                product.saleUnits -
                product.returnedUnits
            ),

        saleLines:
            product.saleLines,

        returnLines:
            product.returnLines,

        tickets:
            product.tickets.size,

        missingCostLines:
            product.missingCostLines,

        zeroCostLines:
            product.zeroCostLines,

        isNegativeMargin:
            product.grossProfit <
            -0.01,

        isZeroMargin:
            Math.abs(
                product.grossProfit
            ) <=
            0.01,

        hasMissingCost:
            product.missingCostLines >
            0

    };

}


export async function getProductProfitability(
    {
        branchId,
        connection,
        fromDate,
        toDate,
        limit = 20,
        negativeMarginLimit = 100
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


    let grossSales =
        0;


    let discounts =
        0;


    let returns =
        0;


    let saleUnits =
        0;


    let returnedUnits =
        0;


    let saleLines =
        0;


    let returnLines =
        0;


    let missingCostLines =
        0;


    const saleTickets =
        new Set();


    const returnTickets =
        new Set();


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
                createProduct(
                    row
                )
            );

        }


        const product =
            products.get(
                itemId
            );


        applySaleRow(
            product,
            row
        );


        if (
            row.transactionType ===
            "RETURN"
        ) {

            returns +=
                Math.abs(
                    toNumber(
                        row.netLineValue
                    )
                );


            returnedUnits +=
                Math.abs(
                    toNumber(
                        row.baseUnits
                    )
                );


            returnLines +=
                1;


            returnTickets.add(
                row.ticketId
            );

        }
        else {

            grossSales +=
                Math.abs(
                    toNumber(
                        row.grossLineValue
                    )
                );


            discounts +=
                Math.abs(
                    toNumber(
                        row.discount
                    )
                ) +
                Math.abs(
                    toNumber(
                        row.extraDiscount
                    )
                );


            saleUnits +=
                Math.abs(
                    toNumber(
                        row.baseUnits
                    )
                );


            saleLines +=
                1;


            saleTickets.add(
                row.ticketId
            );

        }


        if (
            !row.purchaseDate ||
            toNumber(
                row.purchaseCost
            ) <= 0
        ) {

            missingCostLines +=
                1;

        }

    }


    const allProducts =
        Array.from(
            products.values()
        )
        .map(
            finalizeProduct
        );


    const netSales =
        grossSales -
        discounts -
        returns;


    const cost =
        allProducts.reduce(
            (
                total,
                product
            ) =>
                total +
                product.cost,
            0
        );


    const grossProfit =
        netSales -
        cost;


    const margin =
        calculateMargin(
            netSales,
            grossProfit
        );


    const normalizedLimit =
        Number.isFinite(
            Number(
                limit
            )
        ) &&
        Number(
            limit
        ) > 0

            ? Math.min(
                Math.floor(
                    Number(
                        limit
                    )
                ),
                100
            )

            : 20;


    const normalizedNegativeLimit =
        Number.isFinite(
            Number(
                negativeMarginLimit
            )
        ) &&
        Number(
            negativeMarginLimit
        ) > 0

            ? Math.min(
                Math.floor(
                    Number(
                        negativeMarginLimit
                    )
                ),
                500
            )

            : 100;


    const profitByProduct =
        [
            ...allProducts
        ]
        .sort(
            (
                a,
                b
            ) => {

                if (
                    b.grossProfit !==
                    a.grossProfit
                ) {

                    return (
                        b.grossProfit -
                        a.grossProfit
                    );

                }


                return (
                    b.netSales -
                    a.netSales
                );

            }
        )
        .slice(
            0,
            normalizedLimit
        );


    const lossItems =
        [
            ...allProducts
        ]
        .filter(
            product =>
                product.grossProfit <
                -0.01
        )
        .sort(
            (
                a,
                b
            ) =>
                a.grossProfit -
                b.grossProfit
        )
        .slice(
            0,
            normalizedNegativeLimit
        );


    const zeroMarginItems =
        [
            ...allProducts
        ]
        .filter(
            product =>
                Math.abs(
                    product.grossProfit
                ) <=
                0.01
        )
        .sort(
            (
                a,
                b
            ) =>
                b.netSales -
                a.netSales
        )
        .slice(
            0,
            normalizedNegativeLimit
        );


    const highestMarginProducts =
        [
            ...allProducts
        ]
        .filter(
            product =>
                product.netSales >
                0
        )
        .sort(
            (
                a,
                b
            ) =>
                b.margin -
                a.margin
        )
        .slice(
            0,
            normalizedLimit
        );


    const lowestMarginProducts =
        [
            ...allProducts
        ]
        .filter(
            product =>
                product.netSales >
                0
        )
        .sort(
            (
                a,
                b
            ) =>
                a.margin -
                b.margin
        )
        .slice(
            0,
            normalizedLimit
        );


    const productsWithMissingCost =
        [
            ...allProducts
        ]
        .filter(
            product =>
                product.hasMissingCost
        )
        .sort(
            (
                a,
                b
            ) =>
                b.netSales -
                a.netSales
        )
        .slice(
            0,
            normalizedLimit
        );


    return {

        success:
            true,

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        summary: {

            rows:
                rows.length,

            saleLines,

            returnLines,

            saleTickets:
                saleTickets.size,

            returnTickets:
                returnTickets.size,

            productCount:
                allProducts.length,

            grossSales:
                round2(
                    grossSales
                ),

            discounts:
                round2(
                    discounts
                ),

            returns:
                round2(
                    returns
                ),

            netSales:
                round2(
                    netSales
                ),

            cost:
                round2(
                    cost
                ),

            grossProfit:
                round2(
                    grossProfit
                ),

            margin,

            saleUnits:
                round2(
                    saleUnits
                ),

            returnedUnits:
                round2(
                    returnedUnits
                ),

            netUnits:
                round2(
                    saleUnits -
                    returnedUnits
                ),

            negativeMarginProducts:
                allProducts.filter(
                    product =>
                        product.grossProfit <
                        -0.01
                ).length,

            zeroMarginProducts:
                allProducts.filter(
                    product =>
                        Math.abs(
                            product.grossProfit
                        ) <=
                        0.01
                ).length,

            missingCostLines,

            missingCostRate:
                rows.length > 0

                    ? round2(
                        (
                            missingCostLines /
                            rows.length
                        ) * 100
                    )

                    : 0

        },

        profitByProduct,

        lossItems,

        zeroMarginItems,

        highestMarginProducts,

        lowestMarginProducts,

        productsWithMissingCost

    };

}


export default {

    getProductProfitability

};