import fs from "node:fs";

const filePath =
    "D:\\PharmaBI-Live-Desktop\\electron\\cache\\cacheWarmupService.js";

const source =
    fs.readFileSync(
        filePath,
        "utf8"
    );

const startMarker =
`                /*
                 * =================================================
                 * CUSTOMER ANALYTICS AUTO-REFRESH
                 * =================================================`;

const start =
    source.indexOf(
        startMarker
    );

if (
    start === -1
) {
    throw new Error(
        "AUTO CUSTOMER REFRESH block not found."
    );
}

const completeText =
    "[cacheWarmup] COMPLETE branch=";

const completeIndex =
    source.indexOf(
        completeText,
        start
    );

if (
    completeIndex === -1
) {
    throw new Error(
        "WARMUP COMPLETE log text not found."
    );
}

const consoleStart =
    source.lastIndexOf(
        "console.log(",
        completeIndex
    );

if (
    consoleStart <= start
) {
    throw new Error(
        "WARMUP COMPLETE console.log anchor not found."
    );
}

const replacement = `                /*
                 * =================================================
                 * CUSTOMER ANALYTICS AUTO-REFRESH
                 * =================================================
                 *
                 * Runs once after the complete branch warm-up
                 * succeeds.
                 *
                 * RFM V2 refreshes:
                 *   - crm_rfm_snapshots
                 *   - crm_rfm_customer_scores
                 *   - crm_customer_profiles
                 *
                 * Promise-based intentionally because this
                 * finalize callback is not an async function.
                 */

                if (
                    state.failedMonths === 0
                ) {

                    getCustomerRfmV2({

                        branchId,

                        analysisDate:
                            new Date()
                                .toISOString()
                                .slice(
                                    0,
                                    10
                                ),

                        observationDays:
                            365,

                        trendDays:
                            90,

                        minTickets:
                            1,

                        saveSnapshot:
                            true

                    })
                    .then(
                        refreshResult => {

                            const refreshedCustomers =
                                Array.isArray(
                                    refreshResult?.customers
                                )
                                    ? refreshResult.customers.length
                                    : (
                                        Number(
                                            refreshResult?.summary?.customers
                                        ) || 0
                                    );

                            const refreshedSnapshotId =
                                refreshResult?.snapshotId ??
                                null;

                            console.log(

                                \`[cacheWarmup] CUSTOMER ANALYTICS AUTO-REFRESH branch=\${branchId} snapshot=\${refreshedSnapshotId ?? "n/a"} customers=\${refreshedCustomers}\`

                            );

                        }
                    )
                    .catch(
                        analyticsError => {

                            console.error(

                                \`[cacheWarmup] CUSTOMER ANALYTICS AUTO-REFRESH FAILED branch=\${branchId}:\`,

                                analyticsError?.message ||
                                analyticsError

                            );

                        }
                    );

                }


`;

const patched =
    source.slice(
        0,
        start
    ) +
    replacement +
    source.slice(
        consoleStart
    );

const stamp =
    new Date()
        .toISOString()
        .replace(
            /[:.]/g,
            "-"
        );

const backupPath =
    `${filePath}.backup-before-auto-customer-refresh-repair-${stamp}`;

fs.copyFileSync(
    filePath,
    backupPath
);

fs.writeFileSync(
    filePath,
    patched,
    "utf8"
);

console.log(
    "AUTO CUSTOMER REFRESH BLOCK REPAIRED."
);

console.log(
    `BACKUP: ${backupPath}`
);
