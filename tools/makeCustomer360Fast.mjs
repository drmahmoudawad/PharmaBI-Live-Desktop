import fs from "fs";

const uiFile =
    "D:/PharmaBI-Live-Desktop/src/components/CustomerAnalyticsModulePanel.jsx";

const ipcFile =
    "D:/PharmaBI-Live-Desktop/electron/ipc/customers.ipc.js";

const serviceFile =
    "D:/PharmaBI-Live-Desktop/electron/pharmfly/customers/customer360Service.js";

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function write(file, source) {
    fs.writeFileSync(file, source, "utf8");
}

function backup(file, suffix) {
    const backupFile = `${file}.${suffix}`;
    if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(file, backupFile);
    }
    return backupFile;
}

function mustReplace(
    source,
    pattern,
    replacement,
    label
) {
    if (!pattern.test(source)) {
        throw new Error(
            `Pattern not found: ${label}`
        );
    }

    return source.replace(
        pattern,
        replacement
    );
}

console.log(
    "=== CUSTOMER 360 FAST OPTIMIZATION ==="
);

/*
 * ---------------------------------------------------------
 * BACKUPS
 * ---------------------------------------------------------
 */

backup(
    uiFile,
    "backup-before-customer360-fast-20260925"
);

backup(
    ipcFile,
    "backup-before-customer360-fast-20260925"
);

backup(
    serviceFile,
    "backup-before-customer360-fast-20260925"
);

/*
 * ---------------------------------------------------------
 * SERVICE
 * ---------------------------------------------------------
 */

let service =
    read(serviceFile);

/*
 * Add quick-mode cache near the top.
 */

if (
    !service.includes(
        "QUICK_CUSTOMER_360_CACHE_TTL_MS"
    )
) {
    const anchor =
        "function toNumber(";

    if (!service.includes(anchor)) {
        throw new Error(
            "Service anchor function toNumber() not found."
        );
    }

    service =
        service.replace(
            anchor,
            `const QUICK_CUSTOMER_360_CACHE_TTL_MS = 30 * 1000;

const quickCustomer360Cache = new Map();

${anchor}`
        );
}

/*
 * Extend getCustomer360 arguments.
 */

service =
    mustReplace(
        service,
        /export async function getCustomer360\(\s*\{\s*branchId,\s*customerId,\s*fromDate,\s*toDate\s*\}\s*\)/,
        `export async function getCustomer360(
    {
        branchId,
        customerId,
        fromDate,
        toDate,
        quick = false
    }
)`,
        "getCustomer360 signature"
    );

/*
 * Operational CRM schema is not needed for quick customer view.
 */

service =
    mustReplace(
        service,
        /initializeCrmSchema\(\);\s*initializeCrmOperationalSchema\(\);/,
        `initializeCrmSchema();

    if (!quick) {
        initializeCrmOperationalSchema();
    }`,
        "CRM schema initialization"
    );

/*
 * Insert quick return immediately after recentInvoices.
 */

const recentInvoicesPattern =
    /(\s*const recentInvoices\s*=\s*getRecentInvoices\(\s*db,\s*numericBranchId,\s*normalizedCustomerId,\s*300\s*\);\s*)/;

if (
    !recentInvoicesPattern.test(service)
) {
    throw new Error(
        "recentInvoices block not found."
    );
}

const quickBlock = `

    if (quick) {

        const quickCacheKey =
            [
                numericBranchId,
                normalizedCustomerId,
                range.fromDate,
                range.toDate
            ].join("|");

        const cached =
            quickCustomer360Cache.get(
                quickCacheKey
            );

        if (
            cached &&
            Date.now() - cached.createdAt <
                QUICK_CUSTOMER_360_CACHE_TTL_MS
        ) {
            console.log(
                "[Customer360 Quick] MEMORY CACHE HIT",
                quickCacheKey
            );

            return cached.data;
        }

        const quickResult = {
            success: true,

            branchId:
                numericBranchId,

            customerId:
                normalizedCustomerId,

            period: {
                fromDate:
                    range.fromDate,

                toDate:
                    range.toDate
            },

            profile: {
                ...(profile || {}),

                whatsappOptIn:
                    Boolean(
                        Number(
                            profile?.whatsapp_opt_in
                        )
                    )
            },

            behavior:
                behaviorSummary,

            currentRfm: {
                r:
                    profile?.r_score ??
                    null,

                f:
                    profile?.f_score ??
                    null,

                m:
                    profile?.m_score ??
                    null,

                rfmScore:
                    profile?.rfm_score ??
                    null,

                rfmTotal:
                    profile?.rfm_total ??
                    null,

                segmentCode:
                    profile?.segment_code ??
                    null,

                lifecycleStage:
                    profile?.lifecycle_stage ??
                    null,

                behaviorScore:
                    Number(
                        profile?.behavior_score
                    ) || 0,

                customerValueScore:
                    Number(
                        profile?.customer_value_score
                    ) || 0,

                crmPriorityScore:
                    Number(
                        profile?.crm_priority_score
                    ) || 0,

                crmPriorityLevel:
                    profile?.crm_priority_level ??
                    null,

                recommendedAction:
                    profile?.recommended_action ??
                    null,

                purchaseTrend:
                    profile?.purchase_trend ??
                    null,

                purchaseTrendScore:
                    Number(
                        profile?.purchase_trend_score
                    ) || 0
            },

            sales: {
                periodSummary: {
                    saleTickets:
                        Number(
                            salesSummary.sale_tickets
                        ) || 0,

                    returnTickets:
                        Number(
                            salesSummary.return_tickets
                        ) || 0,

                    grossSales:
                        round2(
                            salesSummary.gross_sales
                        ),

                    returns:
                        round2(
                            salesSummary.returns
                        ),

                    netSales:
                        round2(
                            salesSummary.net_sales
                        ),

                    netCost:
                        round2(
                            salesSummary.net_cost
                        ),

                    grossProfit:
                        round2(
                            salesSummary.gross_profit
                        ),

                    firstPurchaseDate:
                        salesSummary.first_purchase_date ??
                        null,

                    lastPurchaseDate:
                        salesSummary.last_purchase_date ??
                        null
                },

                recentInvoices
            },

            crm: {
                campaigns: [],

                interactions: [],

                followups: [],

                whatsappMessages: [],

                purchaseAttributions: []
            }
        };

        quickCustomer360Cache.set(
            quickCacheKey,
            {
                data:
                    quickResult,

                createdAt:
                    Date.now()
            }
        );

        console.log(
            "[Customer360 Quick] LOADED",
            quickCacheKey
        );

        return quickResult;
    }
`;

service =
    service.replace(
        recentInvoicesPattern,
        `$1${quickBlock}`
    );

write(
    serviceFile,
    service
);

/*
 * ---------------------------------------------------------
 * IPC
 * ---------------------------------------------------------
 */

let ipc =
    read(ipcFile);

ipc =
    mustReplace(
        ipc,
        /toDate:\s*payload\?\.toDate\s*\n\s*\}\s*\)\s*;\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)\s*;/,
        `toDate:
                    payload?.toDate,

                quick:
                    payload?.quick === true
            });

        }

    );`,
        "Customer 360 IPC payload"
    );

write(
    ipcFile,
    ipc
);

/*
 * ---------------------------------------------------------
 * UI
 * ---------------------------------------------------------
 */

let ui =
    read(uiFile);

ui =
    mustReplace(
        ui,
        /branchId,\s*customerId,\s*fromDate:\s*safeFromDate,\s*toDate:\s*safeToDate\s*\}\)/,
        `branchId,

                    customerId,

                    fromDate:
                        safeFromDate,

                    toDate:
                        safeToDate,

                    quick:
                        true
                })`,
        "Customer 360 UI request"
    );

write(
    uiFile,
    ui
);

console.log("");
console.log(
    "Customer 360 FAST optimization applied successfully."
);

console.log(
    `UI backup: ${uiFile}.backup-before-customer360-fast-20260925`
);

console.log(
    `IPC backup: ${ipcFile}.backup-before-customer360-fast-20260925`
);

console.log(
    `Service backup: ${serviceFile}.backup-before-customer360-fast-20260925`
);