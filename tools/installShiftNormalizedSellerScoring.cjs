const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "sellerPerformanceService.js"
);

const backup =
    file + ".backup-before-shift-normalized-scoring";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

/* =========================================================
   1) IMPORT SHIFT ASSIGNMENTS + LOCAL DB
   ========================================================= */

if (
    !text.includes(
        'from "./settings/employeeShiftStore.js"'
    )
) {
    const anchor =
`import {
    getBranchPool
} from "../connection/connectionManager.js";`;

    if (!text.includes(anchor)) {
        throw new Error(
            "CONNECTION MANAGER IMPORT ANCHOR NOT FOUND"
        );
    }

    text =
        text.replace(
            anchor,
            anchor +
`
import {
    getEmployeeShiftAssignments
} from "./settings/employeeShiftStore.js";

import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";`
        );
}

/* =========================================================
   2) HELPER FUNCTIONS
   ========================================================= */

if (
    !text.includes(
        "function loadShiftPerformanceContext"
    )
) {
    const anchor =
`function round(
    value,
    digits = 2
) {`;

    const anchorPos =
        text.indexOf(anchor);

    if (anchorPos === -1) {
        throw new Error(
            "ROUND FUNCTION ANCHOR NOT FOUND"
        );
    }

    const helper = `
function loadShiftPerformanceContext(
    branchId,
    employeeId
) {
    const numericBranchId =
        Number(branchId);

    const selectedEmployeeId =
        String(
            employeeId || ""
        ).trim();

    const assignments =
        getEmployeeShiftAssignments(
            numericBranchId
        );

    const assignmentRows =
        Array.isArray(assignments)
            ? assignments
            : [];

    const assignmentMap =
        new Map();

    for (
        const row
        of assignmentRows
    ) {
        const id =
            String(
                row?.employee_id ??
                row?.employeeId ??
                ""
            ).trim();

        const shiftCode =
            String(
                row?.shift_code ??
                row?.shiftCode ??
                ""
            ).trim().toUpperCase();

        if (
            id &&
            shiftCode
        ) {
            assignmentMap.set(
                id,
                shiftCode
            );
        }
    }

    const db =
        getLocalSalesDatabase();

    const weightRows =
        db
            .prepare(
                "SELECT " +
                "shift_code, " +
                "traffic_index, " +
                "traffic_weight_percent " +
                "FROM employee_shift_traffic_weights " +
                "WHERE branch_id = ?"
            )
            .all(
                numericBranchId
            );

    const weightMap =
        new Map();

    for (
        const row
        of weightRows || []
    ) {
        const code =
            String(
                row?.shift_code || ""
            ).trim().toUpperCase();

        if (!code) {
            continue;
        }

        const index =
            Number(
                row?.traffic_index
            );

        const percent =
            Number(
                row?.traffic_weight_percent
            );

        weightMap.set(
            code,
            {
                trafficIndex:
                    Number.isFinite(index) &&
                    index > 0
                        ? index
                        : 1,

                trafficWeightPercent:
                    Number.isFinite(percent)
                        ? percent
                        : 0
            }
        );
    }

    function getEmployeeContext(
        id
    ) {
        const employeeKey =
            String(
                id || ""
            ).trim();

        const shiftCode =
            assignmentMap.get(
                employeeKey
            ) || null;

        const traffic =
            shiftCode
                ? (
                    weightMap.get(
                        shiftCode
                    ) || {
                        trafficIndex: 1,
                        trafficWeightPercent: 0
                    }
                )
                : {
                    trafficIndex: 1,
                    trafficWeightPercent: 0
                };

        return {
            shiftCode,
            trafficIndex:
                traffic.trafficIndex,
            trafficWeightPercent:
                traffic.trafficWeightPercent
        };
    }

    return {
        assignmentMap,
        weightMap,
        selected:
            getEmployeeContext(
                selectedEmployeeId
            ),
        getEmployeeContext
    };
}

function normalizeMetricsForShift(
    metrics,
    trafficIndex
) {
    const safeIndex =
        Number.isFinite(
            Number(trafficIndex)
        ) &&
        Number(trafficIndex) > 0
            ? Number(trafficIndex)
            : 1;

    return {
        ...metrics,

        averageDailySales:
            Number(
                metrics?.averageDailySales || 0
            ) / safeIndex,

        averageDailyInvoices:
            Number(
                metrics?.averageDailyInvoices || 0
            ) / safeIndex
    };
}

`;

    text =
        text.slice(
            0,
            anchorPos
        ) +
        helper +
        text.slice(anchorPos);
}

/* =========================================================
   3) LOAD SHIFT CONTEXT BEFORE CACHE KEY
   ========================================================= */

if (
    !text.includes(
        "const shiftPerformanceContext ="
    )
) {
    const anchor =
`    const cacheKey =
        buildCacheKey({`;

    if (!text.includes(anchor)) {
        throw new Error(
            "CACHE KEY ANCHOR NOT FOUND"
        );
    }

    const block = `
    const shiftPerformanceContext =
        loadShiftPerformanceContext(
            numericBranchId,
            selectedEmployeeId
        );

    const selectedShiftContext =
        shiftPerformanceContext.selected;

`;

    text =
        text.replace(
            anchor,
            block + anchor
        );
}

/* =========================================================
   4) ADD SHIFT CONTEXT TO CACHE KEY
   ========================================================= */

const cacheBlockRegex =
    /(const cacheKey\s*=\s*buildCacheKey\(\{\s*[\s\S]*?historyMonths:\s*months)(\s*\}\);)/s;

if (
    cacheBlockRegex.test(text) &&
    !text.includes(
        "shiftTrafficIndex:"
    )
) {
    text =
        text.replace(
            cacheBlockRegex,
            `$1,

            shiftCode:
                selectedShiftContext.shiftCode,

            shiftTrafficIndex:
                selectedShiftContext.trafficIndex$2`
        );
}

/* =========================================================
   5) NORMALIZE MAX METRICS BY EACH EMPLOYEE'S SHIFT
   ========================================================= */

const maxMetricsRegex =
    /const metrics =\s*getMonthlyMetrics\(\s*bucket,\s*days\s*\);\s*\n\s*\n\s*\n\s*maxDailySales/s;

if (
    maxMetricsRegex.test(text)
) {
    text =
        text.replace(
            maxMetricsRegex,
`const metrics =
                getMonthlyMetrics(
                    bucket,
                    days
                );

            const employeeId =
                String(
                    employeeMonthly?.employeeId ||
                    ""
                ).trim();

            const shiftContext =
                shiftPerformanceContext.getEmployeeContext(
                    employeeId
                );

            const scoringMetrics =
                normalizeMetricsForShift(
                    metrics,
                    shiftContext.trafficIndex
                );

            maxDailySales`
        );
}
else {
    /*
     * The employee ID may not be stored inside employeeMonthly.
     * Handle the actual Map iteration by replacing the loop.
     */
    const loopRegex =
        /for\s*\(\s*const employeeMonthly\s*of employeesByMonth\.values\(\)\s*\)\s*\{/s;

    if (!loopRegex.test(text)) {
        throw new Error(
            "MAX EMPLOYEE LOOP NOT FOUND"
        );
    }

    text =
        text.replace(
            loopRegex,
`for (
            const [
                employeeId,
                employeeMonthly
            ]
            of employeesByMonth.entries()
        ) {`
        );

    const metricBlockRegex =
        /const metrics\s*=\s*getMonthlyMetrics\(\s*bucket,\s*days\s*\);\s*\n\s*\n\s*\n\s*maxDailySales\s*=\s*Math\.max\(/s;

    if (!metricBlockRegex.test(text)) {
        throw new Error(
            "MAX METRIC CALCULATION BLOCK NOT FOUND"
        );
    }

    text =
        text.replace(
            metricBlockRegex,
`const metrics =
                getMonthlyMetrics(
                    bucket,
                    days
                );

            const shiftContext =
                shiftPerformanceContext.getEmployeeContext(
                    employeeId
                );

            const scoringMetrics =
                normalizeMetricsForShift(
                    metrics,
                    shiftContext.trafficIndex
                );

            maxDailySales =
                Math.max(`
        );

    text =
        text.replace(
            /maxDailySales\s*=\s*Math\.max\(\s*maxDailySales,\s*metrics\.averageDailySales\s*\)/s,
`maxDailySales =
                Math.max(
                    maxDailySales,
                    scoringMetrics.averageDailySales
                )`
        );

    text =
        text.replace(
            /maxDailyInvoices\s*=\s*Math\.max\(\s*maxDailyInvoices,\s*metrics\.averageDailyInvoices\s*\)/s,
`maxDailyInvoices =
                Math.max(
                    maxDailyInvoices,
                    scoringMetrics.averageDailyInvoices
                )`
        );
}

/*
 * Replace any remaining direct max comparison to raw metrics
 * in case the first branch matched.
 */
text =
    text.replace(
        /maxDailySales\s*=\s*Math\.max\(\s*maxDailySales,\s*metrics\.averageDailySales\s*\)/g,
`maxDailySales =
                Math.max(
                    maxDailySales,
                    scoringMetrics.averageDailySales
                )`
    );

text =
    text.replace(
        /maxDailyInvoices\s*=\s*Math\.max\(\s*maxDailyInvoices,\s*metrics\.averageDailyInvoices\s*\)/g,
`maxDailyInvoices =
                Math.max(
                    maxDailyInvoices,
                    scoringMetrics.averageDailyInvoices
                )`
    );

/* =========================================================
   6) NORMALIZE SELECTED EMPLOYEE BEFORE scoreMonth
   ========================================================= */

const selectedScoreRegex =
    /const score =\s*scoreMonth\(\s*metrics,\s*maxMetrics\s*\);/s;

if (!selectedScoreRegex.test(text)) {
    throw new Error(
        "SELECTED SCORE BLOCK NOT FOUND"
    );
}

text =
    text.replace(
        selectedScoreRegex,
`const scoringMetrics =
                    normalizeMetricsForShift(
                        metrics,
                        selectedShiftContext.trafficIndex
                    );

                const score =
                    scoreMonth(
                        scoringMetrics,
                        maxMetrics
                    );`
);

/* =========================================================
   7) OUTPUT SHIFT INFORMATION PER MONTH
   ========================================================= */

const monthlyReturnAnchor =
`                    ...metrics,

                    score,`;

if (
    text.includes(monthlyReturnAnchor) &&
    !text.includes(
        "shiftTrafficIndex:"
    )
) {
    text =
        text.replace(
            monthlyReturnAnchor,
`                    ...metrics,

                    shiftCode:
                        selectedShiftContext.shiftCode,

                    shiftTrafficWeightPercent:
                        selectedShiftContext.trafficWeightPercent,

                    shiftTrafficIndex:
                        selectedShiftContext.trafficIndex,

                    trafficAdjustedDailySales:
                        scoringMetrics.averageDailySales,

                    trafficAdjustedDailyInvoices:
                        scoringMetrics.averageDailyInvoices,

                    score,`
        );
}

/* =========================================================
   8) RETURN SHIFT CONTEXT
   ========================================================= */

const outputWeightsAnchor =
`        weights: {

            averageDailySales:
                40,

            averageDailyInvoices:
                30,

            averageInvoice:
                30

        },`;

if (
    text.includes(
        outputWeightsAnchor
    )
) {
    text =
        text.replace(
            outputWeightsAnchor,
`        weights: {

            averageDailySales:
                40,

            averageDailyInvoices:
                30,

            averageInvoice:
                30,

            shiftTrafficNormalization:
                true,

            selectedShift:
                selectedShiftContext.shiftCode,

            selectedShiftTrafficWeightPercent:
                selectedShiftContext.trafficWeightPercent,

            selectedShiftTrafficIndex:
                selectedShiftContext.trafficIndex

        },`
        );
}

/* =========================================================
   9) FINAL SAFETY
   ========================================================= */

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "SHIFT-NORMALIZED SELLER SCORING INSTALLED"
);

console.log(
    "Sales and invoices are normalized by branch+shift traffic index."
);

console.log(
    "Average invoice remains unchanged."
);

console.log(
    "Backup:",
    backup
);
