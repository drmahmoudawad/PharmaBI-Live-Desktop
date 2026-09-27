import fs from "node:fs";

const filePath =
    "electron/main.js";

const backupPath =
    "electron/main.js.backup-before-warmup-sequencing-20260925";

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
 * REMOVE FIXED 6-SECOND DELAY CONSTANT
 * =========================================================
 */

const delayConstant =
`const WARMUP_START_DELAY_AFTER_CONNECT_MS =
    6000;


`;

if (
    source.includes(
        delayConstant
    )
) {
    source =
        source.replace(
            delayConstant,
            ""
        );
}


/*
 * =========================================================
 * REPLACE BACKGROUND WARMUP COORDINATION
 * =========================================================
 */

const startMarker =
`function startBackgroundWarmup() {`;

const endMarker =
`let crmPhoneSyncTimer =
    null;`;

const start =
    source.indexOf(
        startMarker
    );

if (
    start < 0
) {
    throw new Error(
        "startBackgroundWarmup start marker not found"
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
        "startBackgroundWarmup end marker not found"
    );
}

const replacement = [
    "async function startBackgroundWarmup() {",
    "",
    "    /*",
    "     * Phase 1:",
    "     * Refresh the current month first.",
    "     *",
    "     * Phase 2:",
    "     * Start historical warm-up only after Phase 1",
    "     * has finished.",
    "     *",
    "     * No fixed timer is used.",
    "     */",
    "",
    "    try {",
    "",
    "        const result =",
    "            await refreshCurrentMonthAllBranches({",
    "",
    "                maxRetries:",
    "                    2",
    "",
    "            });",
    "",
    "        console.log(",
    "            \"[Electron] Initial current-month refresh result:\",",
    "            result",
    "        );",
    "",
    "    }",
    "    catch (",
    "        error",
    "    ) {",
    "",
    "        console.error(",
    "            \"[Electron] Initial current-month refresh failed:\",",
    "            error",
    "        );",
    "",
    "    }",
    "",
    "    /*",
    "     * Historical warm-up starts only after the initial",
    "     * current-month refresh has completed or failed.",
    "     */",
    "",
    "    try {",
    "",
    "        const result =",
    "            startAllBranchesWarmup({",
    "",
    "                delayMs:",
    "                    750,",
    "",
    "                maxRetries:",
    "                    2",
    "",
    "            });",
    "",
    "        console.log(",
    "            \"[Electron] Full historical cache warm-up started:\",",
    "            result",
    "        );",
    "",
    "    }",
    "    catch (",
    "        error",
    "    ) {",
    "",
    "        console.error(",
    "            \"[Electron] Cache warm-up startup failed:\",",
    "            error",
    "        );",
    "",
    "    }",
    "",
    "    if (",
    "        !currentMonthRefreshTimer",
    "    ) {",
    "",
    "        currentMonthRefreshTimer =",
    "            setInterval(",
    "                async () => {",
    "",
    "                    try {",
    "",
    "                        const result =",
    "                            await refreshCurrentMonthAllBranches({",
    "",
    "                                maxRetries:",
    "                                    2",
    "",
    "                            });",
    "",
    "                        console.log(",
    "                            \"[Electron] 10-minute current-month refresh result:\",",
    "                            result",
    "                        );",
    "",
    "                    }",
    "                    catch (",
    "                        error",
    "                    ) {",
    "",
    "                        console.error(",
    "                            \"[Electron] 10-minute current-month refresh failed:\",",
    "                            error",
    "                        );",
    "",
    "                    }",
    "",
    "                },",
    "                10 *",
    "                60 *",
    "                1000",
    "            );",
    "",
    "        console.log(",
    "            \"[Electron] Current-month auto-refresh scheduled every 10 minutes.\"",
    "        );",
    "",
    "    }",
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
 * VALIDATION
 * =========================================================
 */

if (
    source.includes(
        "WARMUP_START_DELAY_AFTER_CONNECT_MS"
    )
) {
    throw new Error(
        "Fixed warm-up delay reference still exists"
    );
}

if (
    !source.includes(
        "await refreshCurrentMonthAllBranches("
    )
) {
    throw new Error(
        "Initial current-month refresh missing"
    );
}

if (
    !source.includes(
        "startAllBranchesWarmup({"
    )
) {
    throw new Error(
        "Historical warm-up start missing"
    );
}

if (
    !source.includes(
        "await refreshCurrentMonthAllBranches({"
    )
) {
    throw new Error(
        "Current-month refresh is not awaited"
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
    "MAIN WARMUP SEQUENCING FIX APPLIED."
);

console.log(
    "Initial current-month refresh is awaited."
);

console.log(
    "Historical warm-up starts after Phase 1."
);

console.log(
    "Fixed 6-second warm-up delay removed."
);

console.log(
    "10-minute refresh remains enabled."
);

console.log(
    "Backup: " + backupPath
);
