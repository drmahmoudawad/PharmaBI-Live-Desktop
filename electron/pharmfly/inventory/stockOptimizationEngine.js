export const STOCK_OPTIMIZATION_ENGINE_VERSION = "0.3.0-shadow";

const COMMON_GATES = Object.freeze({
    unitBasisVerified: "BASE_UNIT_NOT_VERIFIED",
    availableStockVerified: "STOCK_BALANCE_NOT_VERIFIED",
    storeScopeVerified: "STORE_SCOPE_NOT_VERIFIED",
    servicePolicyVerified: "COVERAGE_DAYS_REQUIRED"
});

function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function availableStock(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : null;
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function blockedAlternative(action, reasons) {
    return {
        action,
        status: "BLOCKED",
        quantityUnits: 0,
        unmetUnits: null,
        totalCost: null,
        capitalInvestment: null,
        reasons: unique(reasons)
    };
}

function branchTarget(branch, policy) {
    const demand = finiteNonNegative(branch.averageDailyDemandUnits);
    const coverageDays = finiteNonNegative(
        policy?.coverageDaysByBranch?.[branch.branchId]
    );

    if (demand === null || coverageDays === null || coverageDays <= 0) {
        return null;
    }

    return demand * coverageDays;
}

function buildTransferAlternative(branches, policy, routes) {
    const planningBranches = branches.filter(branch => branch.mappingVerified !== false);
    const targets = planningBranches.map(branch => ({
        branch,
        target: branchTarget(branch, policy),
        current: availableStock(branch.availableStockUnits),
        incoming: finiteNonNegative(branch.confirmedIncomingUnits) ?? 0
    }));

    if (targets.some(row => row.target === null || row.current === null)) {
        return blockedAlternative("TRANSFER", ["BRANCH_DEMAND_OR_POLICY_MISSING"]);
    }

    const donors = targets
        .map(row => ({
            branchId: row.branch.branchId,
            remaining: Math.max(0, row.current - row.target)
        }))
        .filter(row => row.remaining > 0);
    const recipients = targets
        .map(row => ({
            branchId: row.branch.branchId,
            remaining: Math.max(0, row.target - row.current - row.incoming),
            priority: Number(row.branch.servicePriority) || 0
        }))
        .filter(row => row.remaining > 0)
        .sort((a, b) => b.priority - a.priority || a.branchId - b.branchId);

    const movements = [];
    const candidateRoutes = Array.isArray(routes) && routes.length > 0
        ? routes
        : targets.flatMap(source => targets
            .filter(destination => destination.branch.branchId !== source.branch.branchId)
            .map(destination => ({
                approved: true,
                sourceBranchId: source.branch.branchId,
                destinationBranchId: destination.branch.branchId,
                routeVerified: false
            })));

    for (const recipient of recipients) {
        const destinationRoutes = candidateRoutes
            .filter(route =>
                route?.approved === true &&
                Number(route.destinationBranchId) === recipient.branchId &&
                Number(route.sourceBranchId) !== recipient.branchId
            )
            .sort((a, b) =>
                Number(a.sourceBranchId) - Number(b.sourceBranchId)
            );

        for (const route of destinationRoutes) {
            if (recipient.remaining <= 0) break;
            const donor = donors.find(row =>
                row.branchId === Number(route.sourceBranchId) && row.remaining > 0
            );
            if (!donor) continue;

            const quantity = Math.min(
                recipient.remaining,
                donor.remaining,
                finiteNonNegative(route.maxUnits) ?? Number.POSITIVE_INFINITY
            );
            if (quantity <= 0) continue;

            movements.push({
                sourceBranchId: donor.branchId,
                destinationBranchId: recipient.branchId,
                quantityUnits: quantity,
                leadTimeDays: finiteNonNegative(route.leadTimeDays),
                costPerUnit: null,
                totalCost: null,
                routeVerified: route.routeVerified === true,
                confirmedIncomingIncluded: false
            });
            donor.remaining -= quantity;
            recipient.remaining -= quantity;
        }
    }

    if (!movements.length) {
        return blockedAlternative("TRANSFER", ["NO_FEASIBLE_SURPLUS_OR_ROUTE"]);
    }

    const quantityUnits = movements.reduce((sum, row) => sum + row.quantityUnits, 0);
    const unmetUnits = recipients.reduce((sum, row) => sum + row.remaining, 0);
    return {
        action: "TRANSFER",
        status: "AVAILABLE_IN_SHADOW_MODE",
        quantityUnits,
        unmetUnits,
        totalCost: null,
        capitalInvestment: null,
        movements,
        reasons: unique([
            "USES_VERIFIED_SURPLUS_BEFORE_NEW_PURCHASE",
            ...(movements.some(row => !row.routeVerified) ? ["ROUTE_REQUIRES_MANUAL_REVIEW"] : []),
            "TRANSPORT_COST_IGNORED",
            "CONFIRMED_INCOMING_NOT_INCLUDED"
        ])
    };
}

function buildPurchaseAlternative(branches, policy) {
    const planningBranches = branches.filter(branch => branch.mappingVerified !== false);
    const recipientNeeds = planningBranches.map(branch => {
        const target = branchTarget(branch, policy);
        const current = availableStock(branch.availableStockUnits);
        const incoming = finiteNonNegative(branch.confirmedIncomingUnits) ?? 0;

        if (target === null || current === null) {
            return { branchId: branch.branchId, invalid: true };
        }

        return {
            branchId: Number(branch.branchId),
            remaining: Math.max(0, target - current - incoming),
            priority: Number(branch.servicePriority) || 0
        };
    }).sort((a, b) => b.priority - a.priority || a.branchId - b.branchId);

    if (recipientNeeds.some(row => row.invalid)) {
        return blockedAlternative("PURCHASE", ["BRANCH_DEMAND_OR_POLICY_MISSING"]);
    }

    const orders = recipientNeeds
        .filter(recipient => recipient.remaining > 0)
        .map(recipient => ({
            branchId: recipient.branchId,
            supplierId: null,
            quantityUnits: recipient.remaining,
            leadTimeDays: null,
            unitPurchaseCost: null,
            landedUnitCost: null,
            capitalInvestment: null,
            totalCost: null,
            confirmedIncomingIncluded: false
        }));
    if (!orders.length) {
        return blockedAlternative("PURCHASE", ["NO_SHORTAGE"]);
    }

    const quantityUnits = orders.reduce((sum, row) => sum + row.quantityUnits, 0);
    const unmetUnits = 0;

    return {
        action: "PURCHASE",
        status: "AVAILABLE_IN_SHADOW_MODE",
        quantityUnits,
        unmetUnits,
        totalCost: null,
        capitalInvestment: null,
        orders,
        reasons: ["UNPRICED_QUANTITY_ESTIMATE", "PURCHASE_COST_IGNORED", "CONFIRMED_INCOMING_NOT_INCLUDED"]
    };
}

export function evaluateStockAlternatives({
    masterItemId,
    branchBalances = [],
    readiness = {},
    policy = null,
    transferRoutes = []
} = {}) {
    const commonBlockers = Object.entries(COMMON_GATES)
        .filter(([gate]) => readiness[gate] !== true)
        .map(([, reason]) => reason);

    const branches = Array.isArray(branchBalances) ? branchBalances : [];
    const branchIds = branches.map(branch => Number(branch.branchId));
    if (new Set(branchIds).size !== branchIds.length ||
        branchIds.some(branchId => !Number.isInteger(branchId) || branchId < 1 || branchId > 5)) {
        commonBlockers.push("INVALID_BRANCH_INPUT");
    }
    const planningBranches = branches.filter(branch => branch.mappingVerified !== false);
    if (planningBranches.length === 0) commonBlockers.push("NO_APPROVED_MAPPING");
    const itemBlockers = unique([
        ...commonBlockers,
        ...planningBranches.flatMap(branch => Array.isArray(branch.blockers) ? branch.blockers : [])
    ]);

    const baseline = {
        action: "NO_ACTION",
        status: "BASELINE_ONLY",
        quantityUnits: 0,
        unmetUnits: null,
        totalCost: 0,
        capitalInvestment: 0,
        reasons: ["COMPARISON_BASELINE_NOT_AN_EXECUTION_COMMAND"]
    };

    if (itemBlockers.length) {
        return {
            masterItemId,
            mode: "SHADOW_ONLY",
            status: "BLOCKED",
            recommendation: null,
            blockers: itemBlockers,
            alternatives: [
                baseline,
                blockedAlternative("TRANSFER", itemBlockers),
                blockedAlternative("PURCHASE", itemBlockers)
            ],
            executionAllowed: false
        };
    }

    const targets = planningBranches.map(branch => ({
        branch,
        target: branchTarget(branch, policy),
        current: availableStock(branch.availableStockUnits),
        incoming: finiteNonNegative(branch.confirmedIncomingUnits) ?? 0
    }));

    if (targets.some(row => row.target === null || row.current === null)) {
        const reasons = ["BRANCH_DEMAND_OR_POLICY_MISSING"];
        return {
            masterItemId,
            mode: "SHADOW_ONLY",
            status: "BLOCKED",
            recommendation: null,
            blockers: reasons,
            alternatives: [baseline, blockedAlternative("TRANSFER", reasons), blockedAlternative("PURCHASE", reasons)],
            executionAllowed: false
        };
    }

    const totalNeed = targets.reduce(
        (sum, row) => sum + Math.max(0, row.target - row.current - row.incoming),
        0
    );

    if (totalNeed <= 0) {
        return {
            masterItemId,
            mode: "SHADOW_ONLY",
            status: "READY",
            recommendation: "NO_ACTION",
            blockers: [],
            alternatives: [{
                ...baseline,
                status: "SELECTED_SHADOW_BASELINE",
                unmetUnits: 0
            }, blockedAlternative("TRANSFER", ["NO_SHORTAGE"]), blockedAlternative("PURCHASE", ["NO_SHORTAGE"])],
            executionAllowed: false
        };
    }

    const transfer = buildTransferAlternative(planningBranches, policy, transferRoutes);
    const purchase = buildPurchaseAlternative(planningBranches, policy);
    const noAction = { ...baseline, unmetUnits: totalNeed };
    const feasible = [transfer, purchase].filter(row => row.status === "AVAILABLE_IN_SHADOW_MODE");

    if (!feasible.length) {
        return {
            masterItemId,
            mode: "SHADOW_ONLY",
            status: "NO_FEASIBLE_ALTERNATIVE",
            recommendation: null,
            blockers: unique([
                ...transfer.reasons,
                ...purchase.reasons
            ]),
            alternatives: [noAction, transfer, purchase],
            executionAllowed: false
        };
    }

    const ranked = [...feasible, noAction].sort((a, b) =>
        ({ TRANSFER: 0, PURCHASE: 1, NO_ACTION: 2 }[a.action] ?? 9) -
            ({ TRANSFER: 0, PURCHASE: 1, NO_ACTION: 2 }[b.action] ?? 9) ||
        a.unmetUnits - b.unmetUnits
    );
    const selected = ranked[0];

    return {
        masterItemId,
        mode: "SHADOW_ONLY",
        status: "READY",
        recommendation: selected.action,
        blockers: [],
        alternatives: [
            selected.action === "NO_ACTION"
                ? { ...noAction, status: "SELECTED_SHADOW_BASELINE" }
                : noAction,
            transfer,
            purchase
        ],
        executionAllowed: false
    };
}

export function classifyAbcFsn(items = [], policy = null) {
    const abcAThroughPct = Number(policy?.abcAThroughPct);
    const abcBThroughPct = Number(policy?.abcBThroughPct);
    const fastMinSellingDays = Number(policy?.fastMinSellingDays);
    const fastRecentDays = Number(policy?.fastRecentDays);
    const slowMinSellingDays = Number(policy?.slowMinSellingDays);
    const slowRecentDays = Number(policy?.slowRecentDays);
    const nonMovingAfterDays = Number(policy?.nonMovingAfterDays);

    const policyValid =
        Number.isFinite(abcAThroughPct) && abcAThroughPct > 0 &&
        Number.isFinite(abcBThroughPct) && abcBThroughPct > abcAThroughPct && abcBThroughPct <= 100 &&
        Number.isFinite(fastMinSellingDays) && fastMinSellingDays >= 0 &&
        Number.isFinite(fastRecentDays) && fastRecentDays >= 0 &&
        Number.isFinite(slowMinSellingDays) && slowMinSellingDays >= 0 &&
        Number.isFinite(slowRecentDays) && slowRecentDays >= fastRecentDays &&
        Number.isFinite(nonMovingAfterDays) && nonMovingAfterDays > slowRecentDays;

    const allItems = Array.isArray(items) ? items : [];
    const keyFor = item => String(item.classificationKey ?? item.masterItemId);

    if (!policyValid) {
        return new Map(allItems.map(item => [
            keyFor(item),
            { abc: null, fsn: null, status: "POLICY_REQUIRED" }
        ]));
    }

    const windowVerified = item =>
        !Object.hasOwn(item, "salesWindowVerified") ||
        item.salesWindowVerified === true;

    const returnsReviewed = item =>
        (Number(item.returnLines) || 0) <= 0 ||
        policy?.returnsPolicyVerified === true;

    const ranked = allItems
        .filter(windowVerified)
        .filter(returnsReviewed)
        .filter(item =>
            Number.isFinite(Number(item.verifiedSalesValue)) &&
            Number(item.verifiedSalesValue) > 0
        )
        .sort((a, b) =>
            Number(b.verifiedSalesValue) - Number(a.verifiedSalesValue) ||
            keyFor(a).localeCompare(keyFor(b))
        );

    const totalValue = ranked.reduce(
        (sum, item) => sum + Number(item.verifiedSalesValue),
        0
    );

    let cumulative = 0;
    const abcByItem = new Map();

    for (const item of ranked) {
        const key = keyFor(item);
        const value = Number(item.verifiedSalesValue);

        const cumulativePctBeforeItem = totalValue > 0
            ? (cumulative / totalValue) * 100
            : 100;

        const abc = cumulativePctBeforeItem < abcAThroughPct
            ? "A"
            : cumulativePctBeforeItem < abcBThroughPct
                ? "B"
                : "C";

        const cumulativePct = totalValue > 0
            ? ((cumulative + value) / totalValue) * 100
            : 100;

        cumulative += value;

        abcByItem.set(key, {
            abc,
            cumulativeSalesValuePct: cumulativePct
        });
    }

    const classes = new Map();

    for (const item of allItems) {
        const key = keyFor(item);

        if (!windowVerified(item)) {
            classes.set(key, {
                abc: null,
                fsn: null,
                status: "SALES_WINDOW_NOT_VERIFIED"
            });
            continue;
        }

        if (!returnsReviewed(item)) {
            classes.set(key, {
                abc: null,
                fsn: null,
                status: "RETURNS_POLICY_REVIEW"
            });
            continue;
        }

        let fsn = null;
        let fsnStatus = "FSN_POLICY_REVIEW";

        const hasLastSaleDay =
            item.daysSinceLastSale !== null &&
            item.daysSinceLastSale !== undefined &&
            Number.isFinite(Number(item.daysSinceLastSale)) &&
            Number(item.daysSinceLastSale) >= 0;

        if (hasLastSaleDay) {
            const activeDays = Number(item.verifiedSellingDays) || 0;
            const daysSinceLastSale = Number(item.daysSinceLastSale);

            if (
                activeDays > 0 &&
                activeDays >= fastMinSellingDays &&
                daysSinceLastSale <= fastRecentDays
            ) {
                fsn = "F";
            } else if (
                activeDays > 0 &&
                activeDays >= slowMinSellingDays &&
                daysSinceLastSale <= slowRecentDays
            ) {
                fsn = "S";
            } else if (daysSinceLastSale >= nonMovingAfterDays) {
                fsn = "N";
            }
        } else if (item.historyComplete === true) {
            const historyDays = Number(item.historyDays) || 0;

            if (historyDays >= nonMovingAfterDays) {
                fsn = "N";
            } else {
                fsnStatus = "INSUFFICIENT_HISTORY";
            }
        } else if (item.salesWindowVerified === true) {
            fsnStatus = "INSUFFICIENT_HISTORY";
        }

        const abcResult = abcByItem.get(key);

        classes.set(key, {
            abc: abcResult?.abc ?? "C",
            fsn,
            cumulativeSalesValuePct: abcResult?.cumulativeSalesValuePct ?? null,
            status: fsn ? "CLASSIFIED" : fsnStatus
        });
    }

    return classes;
}
