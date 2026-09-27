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

const endMarker =
`                console.log(

                    \`[cacheWarmup] COMPLETE branch=\${branchId}`;

const end =
    source.indexOf(
        endMarker,
        start
    );

if (
    end === -1
) {
    throw new Error(
        "AUTO CUSTOMER REFRESH end anchor not found."
    );
}

const replacement = `                /*
                 * =================================================
                 * CUSTOMER ANALYTICS AUTO-REFRESH
                 * =================================================
                 *
                 * Runs once after the entire branch warm-up
                 * succeeds. RFM V2 persists:
                 *
                 *   1) crm_rfm_snapshots
                 *   2) crm_rfm_customer_scores
                 *   3) crm_customer_profiles
                 *
                 * This function is not async, so the refresh
                 * is intentionally handled through a Promise chain.
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
        end
    );

fs.writeFileSync(
    filePath,
    patched,
    "utf8"
);

console.log(
    "AUTO CUSTOMER REFRESH SYNTAX FIX APPLIED."
);
