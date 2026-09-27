const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "sellerPerformanceService.js"
);

const backup =
    file + ".backup-before-shift-normalized-v3";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

/* =========================================================
   1. IMPORTS
========================================================= */

if (
    !text.includes(
        'from "./settings/employeeShiftStore.js"'
    )
) {
    const importRegex =
        /import\s*\{\s*getBranchPool\s*\}\s*from\s*["']\.\.\/connection\/connectionManager\.js["']\s*;?/s;

    const match =
        text.match(importRegex);

    if (!match) {
        throw new Error(
            "CONNECTION MANAGER IMPORT NOT FOUND"
        );
    }

    text =
        text.replace(
            importRegex,
            match[0] +
            `

import {
    getEmployeeShiftAssignments
} from "./settings/employeeShiftStore.js";

import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";`
        );

    console.log(
        "SHIFT IMPORTS ADDED"
    );
}

/* =========================================================
   2. HELPER FUNCTIONS
========================================================= */

if (
    !text.includes(
        "function getSellerShiftTrafficContext"
    )
) {
    const scoreMarker =
        /function\s+scoreMonth\s*\(/s;

    const helper =
`function getSellerShiftTrafficContext(
    branchId,
    employeeId
) {
    const numericBranchId =
        Number(branchId);

    const selectedEmployeeId =
        String(
            employeeId || ""
        ).trim();

    let shiftCode = null;

    try {
        const assignments =
            getEmployeeShiftAssignments(
                numericBranchId
            );

        const rows =
            Array.isArray(assignments)
                ? assignments
                : [];

        for (const row of rows) {
            const id =
                String(
                    row?.employee_id ??
                    row?.employeeId ??
                    ""
                ).trim();

            if (
                id ===
                selectedEmployeeId
            ) {
                shiftCode =
                    String(
                        row?.shift_code ??
                        row?.shiftCode ??
                        ""
                    )
                    .trim()
                    .toUpperCase() ||
                    null;

                break;
            }
        }
    }
    catch (error) {
        console.warn(
            "[sellerPerformanceService] shift assignment lookup failed:",
            error?.message || error
        );
    }

    let trafficIndex = 1;
    let trafficWeightPercent = 0;

    try {
        const db =
            getLocalSalesDatabase();

        const rows =
            db
                .prepare(
                    "SELECT shift_code, traffic_index, traffic_weight_percent " +
                    "FROM employee_shift_traffic_weights " +
                    "WHERE branch_id = ?"
                )
                .all(
                    numericBranchId
                );

        const match =
            (rows || []).find(
                row =>
                    String(
                        row?.shift_code || ""
                    )
                    .trim()
                    .toUpperCase() ===
                    shiftCode
            );

        const index =
            Number(
                match?.traffic_index
            );

        const percent =
            Number(
                match?.traffic_weight_percent
            );

        if (
            Number.isFinite(index) &&
            index > 0
        ) {
            trafficIndex =
                index;
        }

        if (
            Number.isFinite(percent)
        ) {
            trafficWeightPercent =
                percent;
        }
    }
    catch (error) {
        console.warn(
            "[sellerPerformanceService] shift traffic lookup failed:",
            error?.message || error
        );
    }

    return {
        shiftCode,
        trafficIndex,
        trafficWeightPercent
    };
}

function normalizeSellerMetricsForShift(
    metrics,
    trafficIndex
) {
    const index =
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
            ) / index,

        averageDailyInvoices:
            Number(
                metrics?.averageDailyInvoices || 0
            ) / index
    };
}

`;

    if (!scoreMarker.test(text)) {
        throw new Error(
            "SCORE MONTH FUNCTION NOT FOUND"
        );
    }

    text =
        text.replace(
            scoreMarker,
            helper + "$&"
        );

    console.log(
        "SHIFT NORMALIZATION HELPERS ADDED"
    );
}

/* =========================================================
   3. SELECTED SELLER SHIFT CONTEXT
========================================================= */

if (
    !text.includes(
        "const selectedShiftTrafficContext ="
    )
) {
    const branchRegex =
        /const\s+branchConnection\s*=\s*resolveConnection\s*\([\s\S]*?\);\s*/s;

    const match =
        text.match(branchRegex);

    if (!match) {
        throw new Error(
            "BRANCH CONNECTION BLOCK NOT FOUND"
        );
    }

    const addition =
`
    const selectedShiftTrafficContext =
        getSellerShiftTrafficContext(
            numericBranchId,
            selectedEmployeeId
        );

`;

    text =
        text.replace(
            branchRegex,
            match[0] +
            addition
        );

    console.log(
        "SELECTED SHIFT CONTEXT ADDED"
    );
}

/* =========================================================
   4. CACHE KEY
========================================================= */

const cacheRegex =
    /const\s+cacheKey\s*=\s*buildCacheKey\s*\(([\s\S]*?)\);\s*(?=const\s+cached\s*=)/s;

if (!cacheRegex.test(text)) {
    throw new Error(
        "CACHE KEY BLOCK NOT FOUND"
    );
}

text =
    text.replace(
        cacheRegex,
        (match, args) => {
            if (
                match.includes(
                    "selectedShiftTrafficContext"
                )
            ) {
                return match;
            }

            return (
                "const cacheKey =\n" +
                "        buildCacheKey(" +
                args +
                ") +\n" +
                "        \"|shift=\" +\n" +
                "        String(\n" +
                "            selectedShiftTrafficContext.shiftCode ||\n" +
                "            \"UNASSIGNED\"\n" +
                "        ) +\n" +
                "        \"|traffic=\" +\n" +
                "        String(\n" +
                "            selectedShiftTrafficContext.trafficIndex\n" +
                "        );\n\n"
            );
        }
    );

console.log(
    "SHIFT CONTEXT ADDED TO CACHE KEY"
);

/* =========================================================
   5. MAX METRICS
========================================================= */

const maxStart =
    text.indexOf(
        "const maxByMonth ="
    );

const selectedStart =
    text.indexOf(
        "const sellerMonthly ="
    );

if (
    maxStart === -1 ||
    selectedStart === -1 ||
    selectedStart <= maxStart
) {
    throw new Error(
        "MAX METRICS SECTION NOT FOUND"
    );
}

let maxSection =
    text.slice(
        maxStart,
        selectedStart
    );

/* Convert loop to entries so we know employeeId. */
const loopRegex =
    /for\s*\(\s*const employeeMonthly\s*of\s*employeesByMonth\.values\(\)\s*\)\s*\{/s;

if (
    loopRegex.test(
        maxSection
    )
) {
    maxSection =
        maxSection.replace(
            loopRegex,
`for (
            const [
                employeeId,
                employeeMonthly
            ]
            of employeesByMonth.entries()
        ) {`
        );
}

/* Add per-employee shift normalization. */
const metricsRegex =
    /const\s+metrics\s*=\s*getMonthlyMetrics\s*\(\s*bucket\s*,\s*days\s*\);/s;

if (
    !maxSection.includes(
        "normalizeSellerMetricsForShift"
    )
) {
    if (!metricsRegex.test(maxSection)) {
        throw new Error(
            "MAX METRICS CALCULATION NOT FOUND"
        );
    }

    maxSection =
        maxSection.replace(
            metricsRegex,
            `const metrics =
                getMonthlyMetrics(
                    bucket,
                    days
                );

            const shiftContext =
                getSellerShiftTrafficContext(
                    numericBranchId,
                    employeeId
                );

            const scoringMetrics =
                normalizeSellerMetricsForShift(
                    metrics,
                    shiftContext.trafficIndex
                );`
        );
}

maxSection =
    maxSection.replace(
        /metrics\.averageDailySales/g,
        "scoringMetrics.averageDailySales"
    );

maxSection =
    maxSection.replace(
        /metrics\.averageDailyInvoices/g,
        "scoringMetrics.averageDailyInvoices"
    );

text =
    text.slice(
        0,
        maxStart
    ) +
    maxSection +
    text.slice(
        selectedStart
    );

console.log(
    "MAX METRICS NORMALIZED BY EMPLOYEE SHIFT"
);

/* =========================================================
   6. SELECTED EMPLOYEE SCORE
========================================================= */

const selectedScoreRegex =
    /const\s+score\s*=\s*scoreMonth\s*\(\s*metrics\s*,\s*maxMetrics\s*\);/s;

if (
    !selectedScoreRegex.test(text)
) {
    throw new Error(
        "SELECTED SCORE BLOCK NOT FOUND"
    );
}

text =
    text.replace(
        selectedScoreRegex,
`const scoringMetrics =
                    normalizeSellerMetricsForShift(
                        metrics,
                        selectedShiftTrafficContext.trafficIndex
                    );

                const score =
                    scoreMonth(
                        scoringMetrics,
                        maxMetrics
                    );`
    );

console.log(
    "SELECTED EMPLOYEE SCORE NORMALIZED"
);

/* =========================================================
   7. MONTHLY OUTPUT
========================================================= */

const monthlyAnchor =
`                    ...metrics,

                    score,`;

if (
    text.includes(
        monthlyAnchor
    ) &&
    !text.includes(
        "trafficAdjustedDailySales:"
    )
) {
    text =
        text.replace(
            monthlyAnchor,
`                    ...metrics,

                    shiftCode:
                        selectedShiftTrafficContext.shiftCode,

                    shiftTrafficWeightPercent:
                        selectedShiftTrafficContext.trafficWeightPercent,

                    shiftTrafficIndex:
                        selectedShiftTrafficContext.trafficIndex,

                    trafficAdjustedDailySales:
                        scoringMetrics.averageDailySales,

                    trafficAdjustedDailyInvoices:
                        scoringMetrics.averageDailyInvoices,

                    score,`
        );

    console.log(
        "MONTHLY SHIFT METRICS ADDED"
    );
}

/* =========================================================
   8. OUTPUT METADATA
========================================================= */

const weightsRegex =
    /weights:\s*\{\s*averageDailySales:\s*40,\s*averageDailyInvoices:\s*30,\s*averageInvoice:\s*30\s*\}/s;

if (
    weightsRegex.test(text)
) {
    text =
        text.replace(
            weightsRegex,
`weights: {
            averageDailySales: 40,
            averageDailyInvoices: 30,
            averageInvoice: 30,

            shiftTrafficNormalization:
                true,

            selectedShift:
                selectedShiftTrafficContext.shiftCode,

            selectedShiftTrafficWeightPercent:
                selectedShiftTrafficContext.trafficWeightPercent,

            selectedShiftTrafficIndex:
                selectedShiftTrafficContext.trafficIndex
        }`
        );

    console.log(
        "OUTPUT SHIFT CONTEXT ADDED"
    );
}

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log("");
console.log(
    "SHIFT-NORMALIZED SELLER SCORING INSTALLED SUCCESSFULLY"
);
console.log(
    "Sales + invoices normalized by branch/shift traffic index."
);
console.log(
    "Average invoice remains unchanged."
);
console.log(
    "Backup:",
    backup
);
