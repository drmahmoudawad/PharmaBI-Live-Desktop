import fs from "node:fs";

const filePath =
    "electron/cache/cacheWarmupService.js";

const backupPath =
    "electron/cache/cacheWarmupService.js.backup-before-bounded-singleflight-20260925";


if (
    !fs.existsSync(filePath)
) {
    throw new Error(
        `File not found: ${filePath}`
    );
}


let source =
    fs.readFileSync(
        filePath,
        "utf8"
    )
    .replace(
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


function requireContains(
    text,
    value,
    label
) {

    if (
        !text.includes(value)
    ) {
        throw new Error(
            `${label}: marker not found`
        );
    }

}


function replaceBetween(
    text,
    startMarker,
    endMarker,
    replacement,
    label
) {

    const start =
        text.indexOf(
            startMarker
        );

    if (
        start < 0
    ) {
        throw new Error(
            `${label}: start marker not found`
        );
    }

    const end =
        text.indexOf(
            endMarker,
            start +
                startMarker.length
        );

    if (
        end < 0
    ) {
        throw new Error(
            `${label}: end marker not found`
        );
    }

    return (
        text.slice(
            0,
            start
        ) +
        replacement +
        text.slice(
            end
        )
    );

}


/*
 * =========================================================
 * 1. ADD SHARED BRANCH/MONTH SINGLE-FLIGHT
 * =========================================================
 */

const engineAnchor =
`let roundRobinEngine =
    null;`;


if (
    !source.includes(
        "const activeMonthWork"
    )
) {

    const registryLines = [

        `let roundRobinEngine =`,
        `    null;`,
        ``,
        ``,
        `/*`,
        ` * =========================================================`,
        ` * SHARED MONTH SINGLE-FLIGHT`,
        ` * =========================================================`,
        ` */`,
        ``,
        `const WARMUP_BRANCH_CONCURRENCY =`,
        `    3;`,
        ``,
        `const activeMonthWork =`,
        `    new Map();`,
        ``,
        ``,
        `function getCurrentUtcMonth() {`,
        ``,
        `    const now =`,
        `        new Date();`,
        ``,
        `    return [`,
        `        now.getUTCFullYear(),`,
        `        String(`,
        `            now.getUTCMonth() + 1`,
        `        ).padStart(`,
        `            2,`,
        `            "0"`,
        `        )`,
        `    ].join(`,
        `        "-"`,
        `    );`,
        ``,
        `}`,
        ``,
        ``,
        `function monthWorkKey(`,
        `    {`,
        `        branchId,`,
        `        month`,
        `    }`,
        `) {`,
        ``,
        `    return String(`,
        `        normalizeBranchId(`,
        `            branchId`,
        `        )`,
        `    ) + "|" + String(month);`,
        ``,
        `}`,
        ``,
        ``,
        `function runMonthOnce(`,
        `    {`,
        `        branchId,`,
        `        month`,
        `    },`,
        `    task`,
        `) {`,
        ``,
        `    const key =`,
        `        monthWorkKey({`,
        `            branchId,`,
        `            month`,
        `        });`,
        ``,
        `    const existing =`,
        `        activeMonthWork.get(`,
        `            key`,
        `        );`,
        ``,
        `    if (`,
        `        existing`,
        `    ) {`,
        ``,
        `        console.log(`,
        `            "[cacheWarmup] SINGLE-FLIGHT JOIN branch=" +`,
        `            String(branchId) +`,
        `            " month=" +`,
        `            String(month)`,
        `        );`,
        ``,
        `        return existing;`,
        ``,
        `    }`,
        ``,
        `    const promise =`,
        `        Promise.resolve()`,
        `            .then(`,
        `                () => task()`,
        `            )`,
        `            .finally(`,
        `                () => {`,
        ``,
        `                    if (`,
        `                        activeMonthWork.get(`,
        `                            key`,
        `                        ) ===`,
        `                        promise`,
        `                    ) {`,
        ``,
        `                        activeMonthWork.delete(`,
        `                            key`,
        `                        );`,
        ``,
        `                    }`,
        ``,
        `                }`,
        `            );`,
        ``,
        `    activeMonthWork.set(`,
        `        key,`,
        `        promise`,
        `    );`,
        ``,
        `    return promise;`,
        ``,
        `}`,
        ``,
        ``,
        `function warmMonthOnce(`,
        `    args`,
        `) {`,
        ``,
        `    return runMonthOnce(`,
        `        {`,
        `            branchId:`,
        `                args.branchId,`,
        ``,
        `            month:`,
        `                args.month`,
        `        },`,
        `        () =>`,
        `            warmMonth(`,
        `                args`,
        `            )`,
        `    );`,
        ``,
        `}`,

    ].join("\n");


    source =
        source.replace(
            engineAnchor,
            registryLines
        );

}


/*
 * =========================================================
 * 2. ADD CURRENT-MONTH OWNERSHIP TO HISTORICAL WARM-UP
 * =========================================================
 */

const processStart =
    source.indexOf(
        "async function processPlanMonth("
    );

if (
    processStart < 0
) {
    throw new Error(
        "PROCESS BRANCH MONTH: function not found"
    );
}

const processEnd =
    source.indexOf(
        "/*\n * =========================================================\n * FINALIZE BRANCH",
        processStart
    );

if (
    processEnd < 0
) {
    throw new Error(
        "PROCESS BRANCH MONTH: end marker not found"
    );
}

let processBlock =
    source.slice(
        processStart,
        processEnd
    );


if (
    !processBlock.includes(
        "CURRENT MONTH EXCLUDED FROM HISTORICAL WARM-UP"
    )
) {

    const stateMarker =
`    state.currentMonth =
        month;`;


    requireContains(
        processBlock,
        stateMarker,
        "PROCESS BRANCH MONTH state marker"
    );


    const ownershipBlock = [

        `    state.currentMonth =`,
        `        month;`,
        ``,
        `    /*`,
        `     * Current month belongs exclusively to`,
        `     * refreshCurrentMonthAllBranches().`,
        `     * Historical warm-up must not load it.`,
        `     */`,
        ``,
        `    if (`,
        `        !forceRefresh &&`,
        `        month ===`,
        `            getCurrentUtcMonth()`,
        `    ) {`,
        ``,
        `        state.skippedMonths +=`,
        `            1;`,
        ``,
        `        state.currentMonth =`,
        `            null;`,
        ``,
        `        console.log(`,
        `            "[cacheWarmup] CURRENT MONTH EXCLUDED FROM HISTORICAL WARM-UP branch=" +`,
        `            String(branchId) +`,
        `            " month=" +`,
        `            String(month)`,
        `        );`,
        ``,
        `        return;`,
        ``,
        `    }`,

    ].join("\n");


    processBlock =
        processBlock.replace(
            stateMarker,
            ownershipBlock
        );


    source =
        source.slice(
            0,
            processStart
        ) +
        processBlock +
        source.slice(
            processEnd
        );

}


/*
 * =========================================================
 * 3. USE SINGLE-FLIGHT AT ALL MONTH LOAD CALL SITES
 * =========================================================
 */

const warmCallsBefore =
    (
        source.match(
            /await warmMonth\(\{/g
        ) ||
        []
    ).length;


if (
    warmCallsBefore !== 3
) {
    throw new Error(
        `Expected 3 warmMonth call sites before conversion, found ${warmCallsBefore}`
    );
}


source =
    source.replace(
        /await warmMonth\(\{/g,
        "await warmMonthOnce({"
    );


/*
 * =========================================================
 * 4. REPLACE SERIAL ROUND LOOP WITH BOUNDED PARALLEL BATCHES
 * =========================================================
 */

const oldRoundLoop = [

    `        /*`,
    `         * -------------------------------------------------`,
    `         * Process all currently queued branches.`,
    `         * -------------------------------------------------`,
    `         */`,
    ``,
    `        for (`,
    `            const entry`,
    `            of roundPlans`,
    `        ) {`,
    ``,
    `            const {`,
    `                plan,`,
    `                month`,
    `            } =`,
    `                entry;`,
    ``,
    `            /*`,
    `             * A newly added branch joins immediately from its`,
    `             * newest month.`,
    `             *`,
    `             * Existing branches continue from their current`,
    `             * historical position.`,
    `             */`,
    ``,
    `            await processPlanMonth({`,
    ``,
    `                plan,`,
    ``,
    `                month,`,
    ``,
    `                delayMs:`,
    `                    engine.delayMs,`,
    ``,
    `                maxRetries:`,
    `                    engine.maxRetries`,
    ``,
    `            });`,
    ``,
    `            plan.nextMonthIndex +=`,
    `                1;`,
    ``,
    `        }`,

].join("\n");


requireContains(
    source,
    oldRoundLoop,
    "OLD SERIAL ROUND LOOP"
);


const newRoundLoop = [

    `        /*`,
    `         * -------------------------------------------------`,
    `         * Process branches in bounded parallel batches.`,
    `         *`,
    `         * Maximum 3 branches at the same time.`,
    `         * Each branch processes only ONE month at a time.`,
    `         * -------------------------------------------------`,
    `         */`,
    ``,
    `        for (`,
    `            let offset = 0;`,
    `            offset < roundPlans.length;`,
    `            offset += WARMUP_BRANCH_CONCURRENCY`,
    `        ) {`,
    ``,
    `            const batch =`,
    `                roundPlans.slice(`,
    `                    offset,`,
    `                    offset +`,
    `                        WARMUP_BRANCH_CONCURRENCY`,
    `                );`,
    ``,
    `            console.log(`,
    `                "[cacheWarmup] BATCH round=" +`,
    `                String(roundIndex + 1) +`,
    `                " start=" +`,
    `                String(offset) +`,
    `                " size=" +`,
    `                String(batch.length)`,
    `            );`,
    ``,
    `            await Promise.all(`,
    `                batch.map(`,
    `                    async (`,
    `                        {`,
    `                            plan,`,
    `                            month`,
    `                        }`,
    `                    ) => {`,
    ``,
    `                        try {`,
    ``,
    `                            await processPlanMonth({`,
    ``,
    `                                plan,`,
    ``,
    `                                month,`,
    ``,
    `                                delayMs:`,
    `                                    engine.delayMs,`,
    ``,
    `                                maxRetries:`,
    `                                    engine.maxRetries`,
    ``,
    `                            });`,
    ``,
    `                        }`,
    `                        catch (`,
    `                            error`,
    `                        ) {`,
    ``,
    `                            console.error(`,
    `                                "[cacheWarmup] UNEXPECTED BATCH FAILURE branch=" +`,
    `                                String(plan.branchId) +`,
    `                                " month=" +`,
    `                                String(month),`,
    `                                error`,
    `                            );`,
    ``,
    `                        }`,
    ``,
    `                        plan.nextMonthIndex +=`,
    `                            1;`,
    ``,
    `                    }`,
    `                )`,
    `            );`,
    ``,
    `        }`,

].join("\n");


source =
    source.replace(
        oldRoundLoop,
        newRoundLoop
    );


/*
 * =========================================================
 * 5. VALIDATION
 * =========================================================
 */

if (
    !source.includes(
        "const WARMUP_BRANCH_CONCURRENCY ="
    )
) {
    throw new Error(
        "Concurrency constant missing"
    );
}


if (
    !source.includes(
        "const activeMonthWork ="
    )
) {
    throw new Error(
        "Single-flight registry missing"
    );
}


if (
    !source.includes(
        "function runMonthOnce("
    )
) {
    throw new Error(
        "runMonthOnce missing"
    );
}


if (
    !source.includes(
        "function warmMonthOnce("
    )
) {
    throw new Error(
        "warmMonthOnce missing"
    );
}


if (
    source.includes(
        "for (\n            const entry\n            of roundPlans\n        )"
    )
) {
    throw new Error(
        "Old serial round loop still exists"
    );
}


const warmCallsAfter =
    (
        source.match(
            /await warmMonth\(\{/g
        ) ||
        []
    ).length;


if (
    warmCallsAfter !== 0
) {
    throw new Error(
        `Direct warmMonth call sites still remain: ${warmCallsAfter}`
    );
}


const singleFlightCalls =
    (
        source.match(
            /await warmMonthOnce\(\{/g
        ) ||
        []
    ).length;


if (
    singleFlightCalls !== 3
) {
    throw new Error(
        `Expected 3 warmMonthOnce call sites, found ${singleFlightCalls}`
    );
}


/*
 * =========================================================
 * 6. WRITE
 * =========================================================
 */

fs.writeFileSync(
    filePath,
    source,
    "utf8"
);


console.log(
    "CACHE WARMUP CONCURRENCY FIX APPLIED."
);

console.log(
    `Backup: ${backupPath}`
);

console.log(
    "Branch concurrency: 3"
);

console.log(
    "Months within each branch: sequential"

);

console.log(
    "Month single-flight: branchId + month"
);

console.log(
    "Historical warm-up excludes current month."
);
