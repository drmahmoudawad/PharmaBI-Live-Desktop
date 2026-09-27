import fs from "node:fs";

const filePath =
    "electron/cache/cacheWarmupService.js";

const backupPath =
    "electron/cache/cacheWarmupService.js.backup-before-parallel-discovery-20260925";

let source =
    fs.readFileSync(
        filePath,
        "utf8"
    ).replace(
        /\r\n/g,
        "\n"
    );

if (
    !fs.existsSync(backupPath)
) {
    fs.copyFileSync(
        filePath,
        backupPath
    );
}

const startMarker =
`        /*
         * Discover all initial branches before the worker
         * starts processing months.
         */`;

const endMarker =
`        if (
            engine.branchPlans.size ===
            0`;

const start =
    source.indexOf(
        startMarker
    );

if (
    start < 0
) {
    throw new Error(
        "DISCOVERY START MARKER NOT FOUND"
    );
}

const end =
    source.indexOf(
        endMarker,
        start
    );

if (
    end < 0
) {
    throw new Error(
        "DISCOVERY END MARKER NOT FOUND"
    );
}

const replacement = [
    "        /*",
    "         * Discover initial branches with bounded parallelism.",
    "         * Maximum 3 branch discoveries at once.",
    "         * A slow/failing branch must not block other branches.",
    "         */",
    "",
    "        for (",
    "            let offset = 0;",
    "            offset < connections.length;",
    "            offset += WARMUP_BRANCH_CONCURRENCY",
    "        ) {",
    "",
    "            const batch =",
    "                connections.slice(",
    "                    offset,",
    "                    offset +",
    "                        WARMUP_BRANCH_CONCURRENCY",
    "                );",
    "",
    "            console.log(",
    "                \"[cacheWarmup] DISCOVERY BATCH start=\" +",
    "                String(offset) +",
    "                \" size=\" +",
    "                String(batch.length)",
    "            );",
    "",
    "            await Promise.all(",
    "                batch.map(",
    "                    async branch => {",
    "",
    "                        const branchId =",
    "                            normalizeBranchId(",
    "                                branch.branchId",
    "                            );",
    "",
    "                        try {",
    "",
    "                            const plan =",
    "                                await buildBranchPlan({",
    "",
    "                                    branchId,",
    "",
    "                                    connection:",
    "                                        branch,",
    "",
    "                                    months:",
    "                                        requestedMonthLimit,",
    "",
    "                                    resetState:",
    "                                        true",
    "",
    "                                });",
    "",
    "                            if (",
    "                                plan",
    "                            ) {",
    "",
    "                                engine.branchPlans.set(",
    "                                    branchId,",
    "                                    plan",
    "                                );",
    "",
    "                                console.log(",
    "                                    \"[cacheWarmup] PLAN branch=\" +",
    "                                    String(branchId) +",
    "                                    \" mode=\" +",
    "                                    String(",
    "                                        requestedMonthLimit === null",
    "                                            ? \"FULL_HISTORY\"",
    "                                            : \"LIMITED\"",
    "                                    ) +",
    "                                    \" months=\" +",
    "                                    String(",
    "                                        plan.monthsList.length",
    "                                    ) +",
    "                                    \" newest=\" +",
    "                                    String(",
    "                                        plan.monthsList[0] || \"N/A\"",
    "                                    ) +",
    "                                    \" oldest=\" +",
    "                                    String(",
    "                                        plan.monthsList[",
    "                                            plan.monthsList.length - 1",
    "                                        ] || \"N/A\"",
    "                                    ) +",
    "                                    \" tickets=\" +",
    "                                    String(",
    "                                        plan.historyRange.ticketCount",
    "                                    )",
    "                                );",
    "",
    "                            }",
    "",
    "                        }",
    "                        catch (",
    "                            error",
    "                        ) {",
    "",
    "                            const state =",
    "                                getState(",
    "                                    branchId",
    "                                );",
    "",
    "                            state.running =",
    "                                false;",
    "",
    "                            state.failedMonths =",
    "                                1;",
    "",
    "                            state.error =",
    "                                error?.message ||",
    "                                String(error);",
    "",
    "                            state.finishedAt =",
    "                                new Date().toISOString();",
    "",
    "                            console.error(",
    "                                \"[cacheWarmup] HISTORY DISCOVERY FAILED branch=\" +",
    "                                String(branchId) + \":\",",
    "                                error",
    "                            );",
    "",
    "                            updateSalesSyncState({",
    "",
    "                                branchId,",
    "",
    "                                status:",
    "                                    \"ERROR\",",
    "",
    "                                rows:",
    "                                    0,",
    "",
    "                                errorMessage:",
    "                                    state.error",
    "",
    "                            });",
    "",
    "                        }",
    "",
    "                    }",
    "                )",
    "            );",
    "",
    "            await yieldToEventLoop();",
    "",
    "        }",
    "",
    ""
].join("\n");

source =
    source.slice(
        0,
        start
    ) +
    replacement +
    source.slice(
        end
    );

fs.writeFileSync(
    filePath,
    source,
    "utf8"
);

console.log(
    "PARALLEL DISCOVERY FIX APPLIED."
);

console.log(
    "Discovery concurrency: 3 branches"
);

console.log(
    "Each branch discovery remains internally sequential."
);

console.log(
    "Backup: " + backupPath
);
