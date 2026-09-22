import {
    buildReconciliationSummary,
    buildTicketReconciliation
} from "./salesReconciliation.js";

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function buildSalesSummary(rows, {
    branchId,
    fromDate,
    toDate
} = {}) {
    let grossSales = 0;
    let returns = 0;
    let grossCost = 0;
    let returnCost = 0;
    let grossUnits = 0;
    let returnedUnits = 0;

    const saleTickets = new Set();
    const returnTickets = new Set();

    for (const row of rows) {
        if (row.transactionType === "RETURN") {
            returns += Math.abs(toNumber(row.netLineValue));
            returnCost += Math.abs(toNumber(row.lineCost));
            returnedUnits += Math.abs(toNumber(row.baseUnits));
            returnTickets.add(row.ticketId);
        } else {
            grossSales += toNumber(row.netLineValue);
            grossCost += toNumber(row.lineCost);
            grossUnits += toNumber(row.baseUnits);
            saleTickets.add(row.ticketId);
        }
    }

    const netSales = grossSales - returns;
    const netCost = grossCost - returnCost;
    const netUnits = grossUnits - returnedUnits;

    const reconciliation =
        buildTicketReconciliation(rows);

    const reconciliationSummary =
        buildReconciliationSummary(rows);

    return {
        branchId: Number(branchId),
        fromDate,
        toDate,
        rows: rows.length,
        saleLines: rows.filter(
            row => row.transactionType === "SALE"
        ).length,
        returnLines: rows.filter(
            row => row.transactionType === "RETURN"
        ).length,
        saleTickets: saleTickets.size,
        returnTickets: returnTickets.size,
        grossSales,
        returns,
        netSales,
        grossCost,
        returnCost,
        netCost,
        grossProfit: grossSales - grossCost,
        netProfit: netSales - netCost,
        grossMargin:
            netSales !== 0
                ? ((netSales - netCost) / netSales) * 100
                : 0,
        grossUnits,
        returnedUnits,
        netUnits,
        averageTicket:
            saleTickets.size > 0
                ? grossSales / saleTickets.size
                : 0,
        returnRate:
            grossSales > 0
                ? (returns / grossSales) * 100
                : 0,
        reconciliation: reconciliationSummary,
        unreconciledTickets:
            reconciliation
                .filter(ticket => !ticket.isReconciled)
                .sort(
                    (a, b) =>
                        b.absDifference - a.absDifference
                )
                .slice(0, 20)
    };
}

export function getRoundedSalesSummary(summary) {
    const round = value =>
        Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

    return {
        ...summary,
        grossSales: round(summary.grossSales),
        returns: round(summary.returns),
        netSales: round(summary.netSales),
        grossCost: round(summary.grossCost),
        returnCost: round(summary.returnCost),
        netCost: round(summary.netCost),
        grossProfit: round(summary.grossProfit),
        netProfit: round(summary.netProfit),
        grossMargin: round(summary.grossMargin),
        grossUnits: round(summary.grossUnits),
        returnedUnits: round(summary.returnedUnits),
        netUnits: round(summary.netUnits),
        averageTicket: round(summary.averageTicket),
        returnRate: round(summary.returnRate),
        reconciliation: {
            ...summary.reconciliation,
            absoluteDifference:
                round(summary.reconciliation.absoluteDifference)
        }
    };
}
