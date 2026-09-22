import {
    getAllSavedConnections
} from "../../settings/connectionStore.js";


import {
    getSalesSummary
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


function normalizeDate(
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


function buildBranchResult(
    branch,
    summary
) {

    return {

        branchId:
            Number(
                branch.branchId
            ),

        success:
            true,

        sales:
            round2(
                summary.netSales
            ),

        cost:
            round2(
                summary.netCost
            ),

        profit:
            round2(
                summary.netProfit
            ),

        margin:
            round2(
                summary.grossMargin
            ),

        invoices:
            Number(
                summary.saleTickets
            ) || 0,

        returnInvoices:
            Number(
                summary.returnTickets
            ) || 0,

        units:
            round2(
                summary.netUnits
            ),

        returns:
            round2(
                summary.returns
            ),

        returnRate:
            round2(
                summary.returnRate
            ),

        averageTicket:
            round2(
                summary.averageTicket
            )

    };

}


export async function getGroupSalesOverview(
    {
        fromDate,
        toDate
    }
) {

    const normalizedFromDate =
        normalizeDate(
            fromDate,
            "fromDate"
        );


    const normalizedToDate =
        normalizeDate(
            toDate,
            "toDate"
        );


    const branches =
        getAllSavedConnections();


    if (
        !Array.isArray(
            branches
        ) ||
        branches.length === 0
    ) {

        return {

            success:
                true,

            fromDate:
                normalizedFromDate,

            toDate:
                normalizedToDate,

            branches: [],

            summary: {

                branches:
                    0,

                connectedBranches:
                    0,

                failedBranches:
                    0,

                sales:
                    0,

                cost:
                    0,

                profit:
                    0,

                margin:
                    0,

                invoices:
                    0,

                units:
                    0,

                returns:
                    0,

                returnRate:
                    0,

                averageTicket:
                    0

            }

        };

    }


    const results =
        [];


    for (
        const branch
        of branches
    ) {

        try {

            const summary =
                await getSalesSummary({

                    branchId:
                        branch.branchId,

                    fromDate:
                        normalizedFromDate,

                    toDate:
                        normalizedToDate,

                    connection:
                        branch

                });


            results.push(

                {

                    ...buildBranchResult(
                        branch,
                        summary
                    ),

                    error:
                        null

                }

            );

        }
        catch (
            error
        ) {

            console.error(

                `[groupAnalytics] Branch ${branch.branchId} failed:`,

                error

            );


            results.push({

                branchId:
                    Number(
                        branch.branchId
                    ),

                success:
                    false,

                sales:
                    0,

                cost:
                    0,

                profit:
                    0,

                margin:
                    0,

                invoices:
                    0,

                returnInvoices:
                    0,

                units:
                    0,

                returns:
                    0,

                returnRate:
                    0,

                averageTicket:
                    0,

                error:
                    error?.message ||
                    "Branch analysis failed."

            });

        }

    }


    const successfulBranches =
        results.filter(
            item =>
                item.success
        );


    const failedBranches =
        results.filter(
            item =>
                !item.success
        );


    const totalSales =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.sales,
            0
        );


    const totalCost =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.cost,
            0
        );


    const totalProfit =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.profit,
            0
        );


    const totalInvoices =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.invoices,
            0
        );


    const totalUnits =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.units,
            0
        );


    const totalReturns =
        successfulBranches.reduce(
            (
                total,
                item
            ) =>
                total +
                item.returns,
            0
        );


    const margin =
        totalSales !== 0

            ? (
                totalProfit /
                totalSales
            ) * 100

            : 0;


    const returnRate =
        totalSales !== 0

            ? (
                totalReturns /
                totalSales
            ) * 100

            : 0;


    const averageTicket =
        totalInvoices > 0

            ? totalSales /
              totalInvoices

            : 0;


    const rankedBranches =
        [...successfulBranches]
            .sort(
                (
                    a,
                    b
                ) =>
                    b.sales -
                    a.sales
            )
            .map(
                (
                    item,
                    index
                ) => ({

                    ...item,

                    rank:
                        index + 1

                })
            );


    return {

        success:
            true,

        fromDate:
            normalizedFromDate,

        toDate:
            normalizedToDate,

        branches:
            rankedBranches,

        failed:
            failedBranches,

        summary: {

            branches:
                results.length,

            connectedBranches:
                successfulBranches.length,

            failedBranches:
                failedBranches.length,

            sales:
                round2(
                    totalSales
                ),

            cost:
                round2(
                    totalCost
                ),

            profit:
                round2(
                    totalProfit
                ),

            margin:
                round2(
                    margin
                ),

            invoices:
                totalInvoices,

            units:
                round2(
                    totalUnits
                ),

            returns:
                round2(
                    totalReturns
                ),

            returnRate:
                round2(
                    returnRate
                ),

            averageTicket:
                round2(
                    averageTicket
                )

        }

    };

}


export default {

    getGroupSalesOverview

};