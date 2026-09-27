import fs from "node:fs";

const filePath =
    "electron/cache/cacheWarmupService.js";

const backupPath =
    "electron/cache/cacheWarmupService.js.backup-before-current-month-parallel-20260925";

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


/*
 * =========================================================
 * PROMISE GUARD
 * =========================================================
 */

const oldGuard =
`let currentMonthRefreshRunning =
    false;`;

const newGuard =
`let currentMonthRefreshPromise =
    null;`;

if (
    !source.includes(
        oldGuard
    ) &&
    !source.includes(
        newGuard
    )
) {
    throw new Error(
        "CURRENT MONTH REFRESH GUARD NOT FOUND"
    );
}

source =
    source.replace(
        oldGuard,
        newGuard
    );


/*
 * =========================================================
 * REPLACE CURRENT-MONTH REFRESH
 * =========================================================
 */

const startMarker =
`export async function refreshCurrentMonthAllBranches(`;

const endMarker =
`export function startAllBranchesWarmup(`;

const start =
    source.indexOf(
        startMarker
    );

if (
    start < 0
) {
    throw new Error(
        "CURRENT MONTH REFRESH START NOT FOUND"
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
        "CURRENT MONTH REFRESH END NOT FOUND"
    );
}

const replacement = [
    "export async function refreshCurrentMonthAllBranches(",
    "    {",
    "        maxRetries = DEFAULT_MAX_RETRIES",
    "    } = {}",
    ") {",
    "",
    "    if (",
    "        currentMonthRefreshPromise",
    "    ) {",
    "",
    "        console.log(",
    "            \"[cacheWarmup] CURRENT MONTH REFRESH ALREADY RUNNING -> JOIN\"",
    "        );",
    "",
    "        return currentMonthRefreshPromise;",
    "",
    "    }",
    "",
    "    currentMonthRefreshPromise =",
    "        (async () => {",
    "",
    "            const month =",
    "                getCurrentUtcMonth();",
    "",
    "            const connections =",
    "                getActiveSavedConnections();",
    "",
    "            console.log(",
    "                \"[cacheWarmup] CURRENT MONTH AUTO-REFRESH START month=\" +",
    "                String(month) +",
    "                \" branches=\" +",
    "                String(connections.length) +",
    "                \" concurrency=\" +",
    "                String(",
    "                    Math.min(",
    "                        WARMUP_BRANCH_CONCURRENCY,",
    "                        connections.length",
    "                    )",
    "                )",
    "            );",
    "",
    "            let refreshed =",
    "                0;",
    "",
    "            let failed =",
    "                0;",
    "",
    "            for (",
    "                let offset = 0;",
    "                offset < connections.length;",
    "                offset += WARMUP_BRANCH_CONCURRENCY",
    "            ) {",
    "",
    "                const batch =",
    "                    connections.slice(",
    "                        offset,",
    "                        offset +",
    "                            WARMUP_BRANCH_CONCURRENCY",
    "                    );",
    "",
    "                const results =",
    "                    await Promise.all(",
    "                        batch.map(",
    "                            async branch => {",
    "",
    "                                const branchId =",
    "                                    normalizeBranchId(",
    "                                        branch?.branchId",
    "                                    );",
    "",
    "                                const state = {",
    "                                    localRows: 0",
    "                                };",
    "",
    "                                try {",
    "",
    "                                    const result =",
    "                                        await warmMonthOnce({",
    "",
    "                                            branchId,",
    "                                            month,",
    "                                            connection: branch,",
    "                                            maxRetries,",
    "                                            state,",
    "                                            forceRefresh: true",
    "",
    "                                        });",
    "",
    "                                    console.log(",
    "                                        \"[cacheWarmup] CURRENT MONTH REFRESHED branch=\" +",
    "                                        String(branchId) +",
    "                                        \" month=\" +",
    "                                        String(month) +",
    "                                        \" rows=\" +",
    "                                        String(result?.rowCount || 0)",
    "                                    );",
    "",
    "                                    return true;",
    "",
    "                                }",
    "                                catch (",
    "                                    error",
    "                                ) {",
    "",
    "                                    console.error(",
    "                                        \"[cacheWarmup] CURRENT MONTH REFRESH FAILED branch=\" +",
    "                                        String(branchId) +",
    "                                        \" month=\" +",
    "                                        String(month) + \":\",",
    "                                        error",
    "                                    );",
    "",
    "                                    return false;",
    "",
    "                                }",
    "",
    "                            }",
    "                        )",
    "                    );",
    "",
    "                for (",
    "                    const success",
    "                    of results",
    "                ) {",
    "",
    "                    if (success) {",
    "                        refreshed += 1;",
    "                    }",
    "                    else {",
    "                        failed += 1;",
    "                    }",
    "",
    "                }",
    "",
    "                await yieldToEventLoop();",
    "",
    "            }",
    "",
    "            console.log(",
    "                \"[cacheWarmup] CURRENT MONTH AUTO-REFRESH COMPLETE month=\" +",
    "                String(month) +",
    "                \" refreshed=\" +",
    "                String(refreshed) +",
    "                \" failed=\" +",
    "                String(failed)",
    "            );",
    "",
    "            return {",
    "",
    "                success:",
    "                    failed === 0,",
    "",
    "                month,",
    "",
    "                refreshed,",
    "",
    "                failed",
    "",
    "            };",
    "",
    "        })().finally(",
    "            () => {",
    "",
    "                currentMonthRefreshPromise =",
    "                    null;",
    "",
    "            }",
    "        );",
    "",
    "    return currentMonthRefreshPromise;",
    "",
    "}",
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


/*
 * =========================================================
 * VERIFY
 * =========================================================
 */

if (
    !source.includes(
        "currentMonthRefreshPromise"
    )
) {
    throw new Error(
        "Promise guard missing"
    );
}

if (
    !source.includes(
        "CURRENT MONTH AUTO-REFRESH START"
    )
) {
    throw new Error(
        "Current refresh function missing"
    );
}

if (
    !source.includes(
        "Math.min(\n                        WARMUP_BRANCH_CONCURRENCY"
    )
) {
    throw new Error(
        "Concurrency logic missing"
    );
}

if (
    !source.includes(
        "await Promise.all("
    )
) {
    throw new Error(
        "Parallel refresh logic missing"
    );
}

fs.writeFileSync(
    filePath,
    source.replace(
        /\n+$/g,
        "\n"
    ),
    "utf8"
);

console.log(
    "CURRENT MONTH PARALLEL REFRESH FIX APPLIED."
);

console.log(
    "Concurrency: maximum 3 branches"
);

console.log(
    "Promise guard: enabled"
);

console.log(
    "Backup: " + backupPath
);
