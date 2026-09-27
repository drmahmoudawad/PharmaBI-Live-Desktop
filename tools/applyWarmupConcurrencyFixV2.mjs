import fs from "node:fs";

const filePath = "electron/cache/cacheWarmupService.js";
const backupPath =
    "electron/cache/cacheWarmupService.js.backup-before-bounded-singleflight-20260925";

let source =
    fs.readFileSync(filePath, "utf8")
        .replace(/\r\n/g, "\n");

if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
}

function fail(message) {
    throw new Error(message);
}

function replaceFunction(startMarker, endMarker, replacement, label) {

    const start = source.indexOf(startMarker);

    if (start < 0) {
        fail(label + ": start marker not found");
    }

    const end = source.indexOf(
        endMarker,
        start + startMarker.length
    );

    if (end < 0) {
        fail(label + ": end marker not found");
    }

    source =
        source.slice(0, start) +
        replacement +
        source.slice(end);
}


/*
 * =========================================================
 * SHARED BRANCH + MONTH SINGLE-FLIGHT
 * =========================================================
 */

const engineAnchor =
`let roundRobinEngine =
    null;`;

if (!source.includes("const activeMonthWork =")) {

    const registry = [
        "let roundRobinEngine =",
        "    null;",
        "",
        "/*",
        " * =========================================================",
        " * SHARED MONTH SINGLE-FLIGHT",
        " * =========================================================",
        " */",
        "",
        "const WARMUP_BRANCH_CONCURRENCY =",
        "    3;",
        "",
        "const activeMonthWork =",
        "    new Map();",
        "",
        "function getCurrentUtcMonth() {",
        "",
        "    const now =",
        "        new Date();",
        "",
        "    return [",
        "        now.getUTCFullYear(),",
        "        String(now.getUTCMonth() + 1).padStart(2, \"0\")",
        "    ].join(\"-\");",
        "",
        "}",
        "",
        "function monthWorkKey({ branchId, month }) {",
        "",
        "    return String(",
        "        normalizeBranchId(branchId)",
        "    ) + \"|\" + String(month);",
        "",
        "}",
        "",
        "function runMonthOnce({ branchId, month }, task) {",
        "",
        "    const key =",
        "        monthWorkKey({ branchId, month });",
        "",
        "    const existing =",
        "        activeMonthWork.get(key);",
        "",
        "    if (existing) {",
        "",
        "        console.log(",
        "            \"[cacheWarmup] SINGLE-FLIGHT JOIN branch=\" +",
        "            String(branchId) +",
        "            \" month=\" +",
        "            String(month)",
        "        );",
        "",
        "        return existing.promise;",
        "",
        "    }",
        "",
        "    const promise =",
        "        Promise.resolve()",
        "            .then(() => task())",
        "            .finally(() => {",
        "",
        "                if (",
        "                    activeMonthWork.get(key) ===",
        "                    promise",
        "                ) {",
        "",
        "                    activeMonthWork.delete(key);",
        "",
        "                }",
        "",
        "            });",
        "",
        "    activeMonthWork.set(",
        "        key,",
        "        { promise }",
        "    );",
        "",
        "    return promise;",
        "",
        "}",
        "",
        "function warmMonthOnce(args) {",
        "",
        "    return runMonthOnce(",
        "        {",
        "            branchId: args.branchId,",
        "            month: args.month",
        "        },",
        "        () => warmMonth(args)",
        "    );",
        "",
        "}",
        "",
        ""
    ].join("\n");

    if (!source.includes(engineAnchor)) {
        fail("ENGINE ANCHOR: not found");
    }

    source =
        source.replace(
            engineAnchor,
            registry
        );
}


/*
 * =========================================================
 * PROCESS BRANCH MONTH
 * =========================================================
 */

const processReplacement = [
    "async function processPlanMonth(",
    "    {",
    "        plan,",
    "        month,",
    "        delayMs,",
    "        maxRetries,",
    "        forceRefresh = false",
    "    }",
    ") {",
    "",
    "    const {",
    "        branchId,",
    "        branch,",
    "        state",
    "    } = plan;",
    "",
    "    state.currentMonth =",
    "        month;",
    "",
    "    if (",
    "        !forceRefresh &&",
    "        month === getCurrentUtcMonth()",
    "    ) {",
    "",
    "        state.skippedMonths +=",
    "            1;",
    "",
    "        state.currentMonth =",
    "            null;",
    "",
    "        console.log(",
    "            \"[cacheWarmup] CURRENT MONTH EXCLUDED FROM HISTORICAL WARM-UP branch=\" +",
    "            String(branchId) +",
    "            \" month=\" +",
    "            String(month)",
    "        );",
    "",
    "        return;",
    "",
    "    }",
    "",
    "    await sleep(",
    "        delayMs",
    "    );",
    "",
    "    await yieldToEventLoop();",
    "",
    "    try {",
    "",
    "        const result =",
    "            await warmMonthOnce({",
    "",
    "                branchId,",
    "                month,",
    "                connection: branch,",
    "                maxRetries,",
    "                state,",
    "                forceRefresh",
    "",
    "            });",
    "",
    "        if (",
    "            result.status === \"LOCAL_HIT\" ||",
    "            result.status === \"CACHE_HIT\"",
    "        ) {",
    "",
    "            state.skippedMonths +=",
    "                1;",
    "",
    "        }",
    "        else {",
    "",
    "            state.completedMonths +=",
    "                1;",
    "",
    "        }",
    "",
    "        state.totalHistoricalRows +=",
    "            Number(result.rowCount) || 0;",
    "",
    "    }",
    "    catch (",
    "        error",
    "    ) {",
    "",
    "        state.failedMonths +=",
    "            1;",
    "",
    "        state.error =",
    "            error?.message || String(error);",
    "",
    "        console.error(",
    "            \"[cacheWarmup] ROUND FAILED branch=\" +",
    "            String(branchId) +",
    "            \" month=\" +",
    "            String(month) + \":\",",
    "            error",
    "        );",
    "",
    "        updateSalesSyncState({",
    "            branchId,",
    "            status: \"ERROR\",",
    "            rows: state.localRows,",
    "            errorMessage: state.error",
    "        });",
    "",
    "    }",
    "",
    "    await yieldToEventLoop();",
    "",
    "    await sleep(",
    "        YIELD_DELAY_MS",
    "    );",
    "",
    "}",
    "",
    ""
].join("\n");

replaceFunction(
    "async function processPlanMonth(",
    "/*\n * =========================================================\n * FINALIZE BRANCH",
    processReplacement,
    "PROCESS BRANCH MONTH"
);


/*
 * =========================================================
 * BOUNDED WORKER POOL
 * =========================================================
 */

const engineReplacement = [
    "async function runRoundRobinEngine(engine) {",
    "",
    "    const queue = [];",
    "    const queuedBranchIds = new Set();",
    "",
    "    function enqueue(plan) {",
    "",
    "        if (!plan) {",
    "            return;",
    "        }",
    "",
    "        if (",
    "            plan.nextMonthIndex >=",
    "            plan.monthsList.length",
    "        ) {",
    "            return;",
    "        }",
    "",
    "        if (",
    "            queuedBranchIds.has(plan.branchId)",
    "        ) {",
    "            return;",
    "        }",
    "",
    "        queuedBranchIds.add(",
    "            plan.branchId",
    "        );",
    "",
    "        queue.push(",
    "            plan",
    "        );",
    "",
    "    }",
    "",
    "    function drainPendingBranches() {",
    "",
    "        if (",
    "            engine.pendingBranches.length ===",
    "            0",
    "        ) {",
    "            return;",
    "        }",
    "",
    "        const pending =",
    "            engine.pendingBranches.splice(",
    "                0,",
    "                engine.pendingBranches.length",
    "            );",
    "",
    "        for (",
    "            const plan",
    "            of pending",
    "        ) {",
    "",
    "            if (",
    "                engine.branchPlans.has(",
    "                    plan.branchId",
    "                )",
    "            ) {",
    "                continue;",
    "            }",
    "",
    "            plan.addedDynamically =",
    "                true;",
    "",
    "            plan.nextMonthIndex =",
    "                0;",
    "",
    "            engine.branchPlans.set(",
    "                plan.branchId,",
    "                plan",
    "            );",
    "",
    "            console.log(",
    "                \"[cacheWarmup] QUEUE REFRESH ADDED branch=\" +",
    "                String(plan.branchId) +",
    "                \" newest=\" +",
    "                String(plan.monthsList[0] || \"N/A\") +",
    "                \" months=\" +",
    "                String(plan.monthsList.length)",
    "            );",
    "",
    "            enqueue(",
    "                plan",
    "            );",
    "",
    "        }",
    "",
    "    }",
    "",
    "    for (",
    "        const plan",
    "        of engine.branchPlans.values()",
    "    ) {",
    "",
    "        enqueue(",
    "            plan",
    "        );",
    "",
    "    }",
    "",
    "    async function worker(",
    "        workerId",
    "    ) {",
    "",
    "        while (",
    "            true",
    "        ) {",
    "",
    "            drainPendingBranches();",
    "",
    "            const plan =",
    "                queue.shift();",
    "",
    "            if (!plan) {",
    "",
    "                const remaining =",
    "                    engine.pendingBranches.length > 0 ||",
    "                    Array.from(",
    "                        engine.branchPlans.values()",
    "                    ).some(",
    "                        current =>",
    "                            current.nextMonthIndex <",
    "                            current.monthsList.length",
    "                    );",
    "",
    "                if (!remaining) {",
    "                    return;",
    "                }",
    "",
    "                await yieldToEventLoop();",
    "                continue;",
    "",
    "            }",
    "",
    "            queuedBranchIds.delete(",
    "                plan.branchId",
    "            );",
    "",
    "            if (",
    "                plan.nextMonthIndex >=",
    "                plan.monthsList.length",
    "            ) {",
    "                continue;",
    "            }",
    "",
    "            const month =",
    "                plan.monthsList[",
    "                    plan.nextMonthIndex",
    "                ];",
    "",
    "            console.log(",
    "                \"[cacheWarmup] WORKER=\" +",
    "                String(workerId) +",
    "                \" branch=\" +",
    "                String(plan.branchId) +",
    "                \" month=\" +",
    "                String(month)",
    "            );",
    "",
    "            try {",
    "",
    "                await processPlanMonth({",
    "                    plan,",
    "                    month,",
    "                    delayMs: engine.delayMs,",
    "                    maxRetries: engine.maxRetries",
    "                });",
    "",
    "            }",
    "            catch (",
    "                error",
    "            ) {",
    "",
    "                console.error(",
    "                    \"[cacheWarmup] UNEXPECTED WORKER FAILURE branch=\" +",
    "                    String(plan.branchId) +",
    "                    \" month=\" +",
    "                    String(month) + \":\",",
    "                    error",
    "                );",
    "",
    "            }",
    "",
    "            plan.nextMonthIndex +=",
    "                1;",
    "",
    "            if (",
    "                plan.nextMonthIndex <",
    "                plan.monthsList.length",
    "            ) {",
    "",
    "                enqueue(",
    "                    plan",
    "                );",
    "",
    "            }",
    "",
    "            await yieldToEventLoop();",
    "",
    "        }",
    "",
    "    }",
    "",
    "    const workerCount =",
    "        Math.min(",
    "            WARMUP_BRANCH_CONCURRENCY,",
    "            Math.max(",
    "                1,",
    "                engine.branchPlans.size",
    "            )",
    "        );",
    "",
    "    console.log(",
    "        \"[cacheWarmup] BOUNDED WORKERS count=\" +",
    "        String(workerCount)",
    "    );",
    "",
    "    await Promise.all(",
    "        Array.from(",
    "            {",
    "                length: workerCount",
    "            },",
    "            (_, index) =>",
    "                worker(",
    "                    index + 1",
    "                )",
    "        )",
    "    );",
    "",
    "    for (",
    "        const plan",
    "        of engine.branchPlans.values()",
    "    ) {",
    "",
    "        if (",
    "            plan.nextMonthIndex >=",
    "            plan.monthsList.length",
    "        ) {",
    "",
    "            finalizePlan(",
    "                plan",
    "            );",
    "",
    "        }",
    "",
    "    }",
    "",
    "    engine.running =",
    "        false;",
    "",
    "    roundRobinEngine =",
    "        null;",
    "",
    "    console.log(",
    "        \"[cacheWarmup] BOUNDED PARALLEL FULL HISTORY WARM-UP COMPLETE.\"",
    "    );",
    "",
    "}",
    "",
    ""
].join("\n");

replaceFunction(
    "async function runRoundRobinEngine(",
    "/*\n * =========================================================\n * START ALL BRANCHES",
    engineReplacement,
    "ROUND-ROBIN ENGINE"
);


/*
 * =========================================================
 * ALL DIRECT MONTH LOADS -> SINGLE-FLIGHT
 * =========================================================
 */

source =
    source.replace(
        /await warmMonth\(\{/g,
        "await warmMonthOnce({"
    );


/*
 * =========================================================
 * VALIDATION
 * =========================================================
 */

if (!source.includes("const WARMUP_BRANCH_CONCURRENCY")) {
    fail("Concurrency constant missing");
}

if (!source.includes("const activeMonthWork")) {
    fail("Single-flight registry missing");
}

if (!source.includes("function runMonthOnce(")) {
    fail("runMonthOnce missing");
}

if (!source.includes("function warmMonthOnce(")) {
    fail("warmMonthOnce missing");
}

if (!source.includes(
    "CURRENT MONTH EXCLUDED FROM HISTORICAL WARM-UP"
)) {
    fail("Current-month ownership guard missing");
}

const directCalls =
    (
        source.match(
            /await warmMonth\(\{/g
        ) || []
    ).length;

if (directCalls !== 0) {
    fail(
        "Direct warmMonth call sites remain: " +
        String(directCalls)
    );
}

fs.writeFileSync(
    filePath,
    source,
    "utf8"
);

console.log(
    "CACHE WARMUP CONCURRENCY FIX APPLIED."
);

console.log(
    "Branch concurrency: 3"
);

console.log(
    "Months within each branch: sequential"
);

console.log(
    "Shared single-flight: branchId + month"
);

console.log(
    "Historical warm-up excludes current month"
);

console.log(
    "Backup: " + backupPath
);
