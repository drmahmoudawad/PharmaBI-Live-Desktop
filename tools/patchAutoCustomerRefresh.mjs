import fs from "node:fs";
import path from "node:path";

const filePath =
    path.resolve(
        "electron/cache/cacheWarmupService.js"
    );

const source =
    fs.readFileSync(
        filePath,
        "utf8"
    );

const stamp =
    new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

const backupPath =
    `${filePath}.backup-before-auto-customer-refresh-${stamp}`;

const importLine =
    'import { getCustomerRfmV2 } from "../pharmfly/customers/customerRfmV2Service.js";';

const marker =
    "[cacheWarmup] CUSTOMER ANALYTICS AUTO-REFRESH";

if (
    source.includes(
        marker
    )
) {
    console.log(
        "AUTO CUSTOMER REFRESH ALREADY INSTALLED."
    );
    process.exit(0);
}

const localDbImportEnd =
    source.indexOf(
        'from "../localdb/localSalesDb.js";'
    );

if (
    localDbImportEnd === -1
) {
    throw new Error(
        "localSalesDb import anchor not found."
    );
}

const importInsertAt =
    localDbImportEnd +
    'from "../localdb/localSalesDb.js";'
        .length;

let patched =
    source.slice(
        0,
        importInsertAt
    ) +
    "\n\n\n" +
    importLine +
    source.slice(
        importInsertAt
    );

const completeMarker =
    "[cacheWarmup] COMPLETE branch=${branchId}";

const markerIndex =
    patched.indexOf(
        completeMarker
    );

if (
    markerIndex === -1
) {
    throw new Error(
        "WARMUP COMPLETE log anchor not found."
    );
}

const consoleStart =
    patched.lastIndexOf(
        "console.log(",
        markerIndex
    );

if (
    consoleStart === -1
) {
    throw new Error(
        "WARMUP COMPLETE console.log anchor not found."
    );
}

const refreshBlock = `                /*
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
                 * This keeps customer analytics synchronized
                 * with the sales data without recalculating RFM
                 * inside every monthly batch.
                 */
                if (
                    state.failedMonths === 0
                ) {

                    try {

                        const refreshAnalysisDate =
                            new Date()
                                .toISOString()
                                .slice(
                                    0,
                                    10
                                );

                        const refreshResult =
                            await getCustomerRfmV2({

                                branchId,

                                analysisDate:
                                    refreshAnalysisDate,

                                observationDays:
                                    365,

                                trendDays:
                                    90,

                                minTickets:
                                    1,

                                saveSnapshot:
                                    true

                            });

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

                            \`${marker} branch=\${branchId} snapshot=\${refreshedSnapshotId ?? "n/a"} customers=\${refreshedCustomers}\`

                        );

                    }
                    catch (
                        analyticsError
                    ) {

                        console.error(

                            \`${marker} FAILED branch=\${branchId}:\`,

                            analyticsError?.message ||
                            analyticsError

                        );

                    }

                }


`;

patched =
    patched.slice(
        0,
        consoleStart
    ) +
    refreshBlock +
    patched.slice(
        consoleStart
    );

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
    "PATCH INSTALLED SUCCESSFULLY."
);

console.log(
    `FILE: ${filePath}`
);

console.log(
    `BACKUP: ${backupPath}`
);
