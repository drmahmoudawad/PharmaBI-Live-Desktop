const RECONCILIATION_TOLERANCE = 0.05;

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function getReconciliationTolerance() {
    return RECONCILIATION_TOLERANCE;
}

export function buildTicketReconciliation(rows) {
    const tickets = new Map();

    for (const row of rows) {
        if (!tickets.has(row.ticketId)) {
            tickets.set(row.ticketId, {
                ticketId: row.ticketId,
                date: row.date,
                transactionType: row.transactionType,
                ticketTotal: toNumber(row.ticketTotal),
                lineGross: 0,
                lineDiscount: 0,
                lineExtraDiscount: 0,
                lineNet: 0,
                lineCost: 0,
                units: 0,
                lineCount: 0
            });
        }

        const ticket = tickets.get(row.ticketId);

        ticket.lineGross += toNumber(row.grossLineValue);
        ticket.lineDiscount += toNumber(row.discount);
        ticket.lineExtraDiscount += toNumber(row.extraDiscount);
        ticket.lineNet += toNumber(row.netLineValue);
        ticket.lineCost += toNumber(row.lineCost);
        ticket.units += toNumber(row.baseUnits);
        ticket.lineCount += 1;
    }

    return Array.from(tickets.values()).map(ticket => {
        const difference =
            ticket.ticketTotal - ticket.lineNet;

        return {
            ...ticket,
            reconciliationDifference: difference,
            absDifference: Math.abs(difference),
            isReconciled:
                Math.abs(difference) <= RECONCILIATION_TOLERANCE
        };
    });
}

export function buildReconciliationSummary(rows) {
    const reconciliation = buildTicketReconciliation(rows);

    const absoluteDifference = reconciliation.reduce(
        (total, ticket) =>
            total + Math.abs(ticket.reconciliationDifference),
        0
    );

    const ticketsWithDifference = reconciliation.filter(
        ticket => !ticket.isReconciled
    ).length;

    return {
        ticketCount: reconciliation.length,
        ticketsWithDifference,
        absoluteDifference,
        tolerance: RECONCILIATION_TOLERANCE
    };
}
