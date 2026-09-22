import {
    getSales
} from "./salesService.js";

import {
    buildSalesSummary,
    getRoundedSalesSummary
} from "./salesSummary.js";

export async function getSalesSummary({
    branchId,
    connection,
    fromDate,
    toDate
}) {
    const rows = await getSales({
        branchId,
        connection,
        fromDate,
        toDate
    });

    const summary = buildSalesSummary(rows, {
        branchId,
        fromDate,
        toDate
    });

    return getRoundedSalesSummary(summary);
}
