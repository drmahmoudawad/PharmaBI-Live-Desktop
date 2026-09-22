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


function percentageChange(
    current,
    previous
) {

    const currentValue =
        toNumber(
            current
        );


    const previousValue =
        toNumber(
            previous
        );


    if (
        previousValue === 0
    ) {

        return currentValue === 0
            ? 0
            : null;

    }


    return round2(
        (
            (
                currentValue -
                previousValue
            ) /
            Math.abs(
                previousValue
            )
        ) * 100
    );

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


    const parts =
        text.split("-").map(
            Number
        );


    const date =
        new Date(
            Date.UTC(
                parts[0],
                parts[1] - 1,
                parts[2]
            )
        );


    if (
        date.getUTCFullYear() !==
            parts[0] ||

        date.getUTCMonth() !==
            parts[1] - 1 ||

        date.getUTCDate() !==
            parts[2]
    ) {

        throw new Error(
            `Invalid ${fieldName}: ${text}`
        );

    }


    return text;

}


function shiftYear(
    dateText
) {

    const value =
        validateDate(
            dateText,
            "date"
        );


    const parts =
        value.split("-").map(
            Number
        );


    /*
     * IMPORTANT:
     *
     * Previous version accidentally returned
     * the same year.
     *
     * We need:
     *
     * 2026-08-01
     *      ↓
     * 2025-08-01
     */

    const targetYear =
        parts[0] - 1;


    return [

        targetYear,

        String(
            parts[1]
        ).padStart(
            2,
            "0"
        ),

        String(
            parts[2]
        ).padStart(
            2,
            "0"
        )

    ].join(
        "-"
    );

}


function validateDateRange(
    fromDate,
    toDate
) {

    const from =
        validateDate(
            fromDate,
            "fromDate"
        );


    const to =
        validateDate(
            toDate,
            "toDate"
        );


    const fromDateObject =
        new Date(
            `${from}T00:00:00.000Z`
        );


    const toDateObject =
        new Date(
            `${to}T00:00:00.000Z`
        );


    if (
        fromDateObject >
        toDateObject
    ) {

        throw new Error(
            "fromDate cannot be greater than toDate"
        );

    }


    return {

        fromDate:
            from,

        toDate:
            to

    };

}


function aggregateProducts(
    rows
) {

    const products =
        new Map();


    let totalSales =
        0;


    let totalUnits =
        0;


    const invoices =
        new Set();


    for (
        const row
        of rows
    ) {

        const itemId =
            row.itemId === null ||
            row.itemId === undefined ||
            row.itemId === ""

                ? null

                : String(
                    row.itemId
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


        const isReturn =
            row.transactionType ===
            "RETURN";


        const signedSales =
            isReturn

                ? -value

                : value;


        const signedUnits =
            isReturn

                ? -units

                : units;


        if (
            row.ticketId !== null &&
            row.ticketId !== undefined
        ) {

            invoices.add(
                String(
                    row.ticketId
                )
            );

        }


        totalSales +=
            signedSales;


        totalUnits +=
            signedUnits;


        if (
            !itemId
        ) {

            continue;

        }


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
            signedSales;


        product.units +=
            signedUnits;


        if (
            row.ticketId !== null &&
            row.ticketId !== undefined
        ) {

            product.invoices.add(
                String(
                    row.ticketId
                )
            );

        }

    }


    const allProducts =
        Array.from(
            products.values()
        )
        .map(
            product => ({

                itemId:
                    product.itemId,

                itemName:
                    product.itemName,

                sales:
                    round2(
                        product.sales
                    ),

                units:
                    round2(
                        product.units
                    ),

                invoices:
                    product.invoices.size

            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.sales -
                a.sales
        );


    const positiveSales =
        allProducts.reduce(
            (
                total,
                product
            ) =>
                total +
                Math.max(
                    0,
                    product.sales
                ),
            0
        );


    const top5Sales =
        allProducts
            .slice(
                0,
                5
            )
            .reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    Math.max(
                        0,
                        product.sales
                    ),
                0
            );


    const top10Sales =
        allProducts
            .slice(
                0,
                10
            )
            .reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    Math.max(
                        0,
                        product.sales
                    ),
                0
            );


    return {

        sales:
            round2(
                totalSales
            ),

        units:
            round2(
                totalUnits
            ),

        invoices:
            invoices.size,

        products:
            allProducts.length,

        unitsPerInvoice:
            invoices.size > 0

                ? round2(
                    totalUnits /
                    invoices.size
                )

                : 0,

        topProducts:
            allProducts.slice(
                0,
                10
            ),

        allProducts,

        concentration: {

            top5Sales:
                round2(
                    top5Sales
                ),

            top10Sales:
                round2(
                    top10Sales
                ),

            top5SharePct:
                positiveSales > 0

                    ? round2(
                        (
                            top5Sales /
                            positiveSales
                        ) * 100
                    )

                    : 0,

            top10SharePct:
                positiveSales > 0

                    ? round2(
                        (
                            top10Sales /
                            positiveSales
                        ) * 100
                    )

                    : 0

        }

    };

}


function buildContributors(
    current,
    previous
) {

    const currentMap =
        new Map();


    const previousMap =
        new Map();


    for (
        const product
        of current.allProducts
    ) {

        currentMap.set(
            product.itemId,
            product
        );

    }


    for (
        const product
        of previous.allProducts
    ) {

        previousMap.set(
            product.itemId,
            product
        );

    }


    const ids =
        new Set([

            ...currentMap.keys(),

            ...previousMap.keys()

        ]);


    const totalSalesChange =
        current.sales -
        previous.sales;


    const changes =
        [];


    for (
        const itemId
        of ids
    ) {

        const currentProduct =
            currentMap.get(
                itemId
            );


        const previousProduct =
            previousMap.get(
                itemId
            );


        const currentSales =
            toNumber(
                currentProduct?.sales
            );


        const previousSales =
            toNumber(
                previousProduct?.sales
            );


        const currentUnits =
            toNumber(
                currentProduct?.units
            );


        const previousUnits =
            toNumber(
                previousProduct?.units
            );


        const currentInvoices =
            toNumber(
                currentProduct?.invoices
            );


        const previousInvoices =
            toNumber(
                previousProduct?.invoices
            );


        const change =
            currentSales -
            previousSales;


        let direction =
            "FLAT";


        if (
            change > 0
        ) {

            direction =
                "POSITIVE";

        }
        else if (
            change < 0
        ) {

            direction =
                "NEGATIVE";

        }


        let status =
            "STABLE";


        if (
            previousSales === 0 &&
            currentSales > 0
        ) {

            status =
                "NEW";

        }
        else if (
            currentSales === 0 &&
            previousSales > 0
        ) {

            status =
                "LOST";

        }
        else if (
            change > 0
        ) {

            status =
                "GROWING";

        }
        else if (
            change < 0
        ) {

            status =
                "DECLINING";

        }


        const contributionSharePct =
            totalSalesChange !== 0

                ? round2(
                    (
                        change /
                        totalSalesChange
                    ) * 100
                )

                : 0;


        changes.push({

            itemId,

            itemName:
                currentProduct?.itemName ||
                previousProduct?.itemName ||
                "غير معروف",

            currentSales:
                round2(
                    currentSales
                ),

            previousSales:
                round2(
                    previousSales
                ),

            change:
                round2(
                    change
                ),

            changePct:
                percentageChange(
                    currentSales,
                    previousSales
                ),

            contributionSharePct,

            direction,

            status,

            currentUnits:
                round2(
                    currentUnits
                ),

            previousUnits:
                round2(
                    previousUnits
                ),

            unitsChange:
                round2(
                    currentUnits -
                    previousUnits
                ),

            currentInvoices,

            previousInvoices,

            invoiceChange:
                currentInvoices -
                previousInvoices

        });

    }


    const positive =
        changes
            .filter(
                product =>
                    product.change > 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.change -
                    a.change
            )
            .slice(
                0,
                10
            );


    const negative =
        changes
            .filter(
                product =>
                    product.change < 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.change -
                    b.change
            )
            .slice(
                0,
                10
            );


    const biggestMovers =
        [
            ...changes
        ]
        .sort(
            (
                a,
                b
            ) =>
                Math.abs(
                    b.change
                ) -
                Math.abs(
                    a.change
                )
        )
        .slice(
            0,
            10
        );


    const positiveContribution =
        changes
            .filter(
                product =>
                    product.change > 0
            )
            .reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    product.change,
                0
            );


    const negativeContribution =
        changes
            .filter(
                product =>
                    product.change < 0
            )
            .reduce(
                (
                    total,
                    product
                ) =>
                    total +
                    product.change,
                0
            );


    return {

        totalSalesChange:
            round2(
                totalSalesChange
            ),

        positiveContribution:
            round2(
                positiveContribution
            ),

        negativeContribution:
            round2(
                negativeContribution
            ),

        positive,

        negative,

        biggestMovers

    };

}


function buildDiagnosis(
    current,
    previous,
    contributors
) {

    const salesPct =
        percentageChange(
            current.sales,
            previous.sales
        );


    const unitsPct =
        percentageChange(
            current.units,
            previous.units
        );


    const productsPct =
        percentageChange(
            current.products,
            previous.products
        );


    const unitsPerInvoicePct =
        percentageChange(
            current.unitsPerInvoice,
            previous.unitsPerInvoice
        );


    let primary =
        null;


    if (
        contributors.totalSalesChange > 0 &&
        unitsPerInvoicePct !== null &&
        unitsPerInvoicePct >= 5
    ) {

        primary = {

            type:
                "BASKET_DENSITY",

            direction:
                "POSITIVE",

            severity:
                unitsPerInvoicePct >= 10
                    ? "MEDIUM"
                    : "LOW",

            message:
                "نمو Product Mix مدعوم بزيادة كثافة المنتجات داخل الفاتورة.",

            recommendation:
                "حافظ على المنتجات التي ترفع كثافة السلة."

        };

    }
    else if (
        contributors.totalSalesChange > 0 &&
        unitsPct !== null &&
        unitsPct >= 5
    ) {

        primary = {

            type:
                "VOLUME_GROWTH",

            direction:
                "POSITIVE",

            severity:
                unitsPct >= 15
                    ? "MEDIUM"
                    : "LOW",

            message:
                "نمو Product Mix مدعوم بزيادة حجم الوحدات المباعة.",

            recommendation:
                "حافظ على توافر المنتجات الصاعدة."

        };

    }
    else if (
        contributors.totalSalesChange < 0 &&
        unitsPct !== null &&
        unitsPct <= -5
    ) {

        primary = {

            type:
                "VOLUME_DECLINE",

            direction:
                "NEGATIVE",

            severity:
                Math.abs(
                    unitsPct
                ) >= 15
                    ? "HIGH"
                    : "MEDIUM",

            message:
                "انخفاض Product Mix مرتبط بانخفاض حجم الوحدات.",

            recommendation:
                "ابدأ بأكبر المنتجات السلبية وافحص التوافر والطلب."

        };

    }
    else if (
        productsPct !== null &&
        productsPct <= -15
    ) {

        primary = {

            type:
                "PRODUCT_RANGE_CONTRACTION",

            direction:
                "NEGATIVE",

            severity:
                "MEDIUM",

            message:
                "عدد المنتجات النشطة انخفض بشكل ملحوظ.",

            recommendation:
                "راجع الأصناف التي توقفت عن الحركة."

        };

    }


    return {

        primary,

        metrics: {

            salesPct,

            unitsPct,

            productsPct,

            unitsPerInvoicePct

        }

    };

}


export async function getProductMixAnalytics(
    {
        branchId,
        connection,
        fromDate,
        toDate
    }
) {

    const range =
        validateDateRange(
            fromDate,
            toDate
        );


    /*
     * Current period:
     *
     * 2026-08-01 → 2026-08-03
     *
     * Previous year:
     *
     * 2025-08-01 → 2025-08-03
     */

    const previousFromDate =
        shiftYear(
            range.fromDate
        );


    const previousToDate =
        shiftYear(
            range.toDate
        );


    const currentRows =
        await getSales({

            branchId,

            connection,

            fromDate:
                range.fromDate,

            toDate:
                range.toDate

        });


    const previousRows =
        await getSales({

            branchId,

            connection,

            fromDate:
                previousFromDate,

            toDate:
                previousToDate

        });


    const current =
        aggregateProducts(
            currentRows
        );


    const previous =
        aggregateProducts(
            previousRows
        );


    const contributors =
        buildContributors(
            current,
            previous
        );


    const diagnosis =
        buildDiagnosis(
            current,
            previous,
            contributors
        );


    return {

        success:
            true,

        branchId:
            Number(
                branchId
            ),

        selectedPeriod: {

            fromDate:
                range.fromDate,

            toDate:
                range.toDate,

            comparisonFromDate:
                previousFromDate,

            comparisonToDate:
                previousToDate

        },

        current: {

            sales:
                current.sales,

            units:
                current.units,

            products:
                current.products,

            invoices:
                current.invoices,

            unitsPerInvoice:
                current.unitsPerInvoice,

            topProducts:
                current.topProducts,

            concentration:
                current.concentration

        },

        samePeriodLastYear: {

            sales:
                previous.sales,

            units:
                previous.units,

            products:
                previous.products,

            invoices:
                previous.invoices,

            unitsPerInvoice:
                previous.unitsPerInvoice,

            topProducts:
                previous.topProducts,

            concentration:
                previous.concentration

        },

        yoy: {

            salesPct:
                percentageChange(
                    current.sales,
                    previous.sales
                ),

            unitsPct:
                percentageChange(
                    current.units,
                    previous.units
                ),

            productsPct:
                percentageChange(
                    current.products,
                    previous.products
                ),

            invoicesPct:
                percentageChange(
                    current.invoices,
                    previous.invoices
                ),

            unitsPerInvoicePct:
                percentageChange(
                    current.unitsPerInvoice,
                    previous.unitsPerInvoice
                )

        },

        contributors,

        diagnosis

    };

}


export default {

    getProductMixAnalytics

};