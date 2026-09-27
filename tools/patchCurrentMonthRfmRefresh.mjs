import fs from "node:fs";

const filePath =
    "D:\\PharmaBI-Live-Desktop\\electron\\cache\\cacheWarmupService.js";

const source =
    fs.readFileSync(
        filePath,
        "utf8"
    );

const marker =
    "async function refreshCustomerRfmAfterSalesSync(";

if (
    !source.includes(
        marker
    )
) {

    const anchor =
        "export async function refreshCurrentMonthAllBranches(";

    const anchorIndex =
        source.indexOf(
            anchor
        );

    if (
        anchorIndex === -1
    ) {
        throw new Error(
            "refreshCurrentMonthAllBranches anchor not found."
        );
    }

    const helper = `
/*
 * =========================================================
 * AUTO CUSTOMER ANALYTICS AFTER CURRENT-MONTH SALES SYNC
 * =========================================================
 *
 * Runs after the current-month sales for a branch have
 * been successfully stored in local SQLite.
 *
 * RFM V2 updates:
 *   - crm_rfm_snapshots
 *   - crm_rfm_customer_scores
 *   - crm_customer_profiles
 */

async function refreshCustomerRfmAfterSalesSync(
    branchId
) {

    const analysisDate =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );

    try {

        const result =
            await getCustomerRfmV2({

                branchId,

                analysisDate,

                observationDays:
                    365,

                trendDays:
                    90,

                minTickets:
                    1,

                saveSnapshot:
                    true

            });

        const customerCount =
            Array.isArray(
                result?.customers
            )
                ? result.customers.length
                : (
                    Number(
                        result?.summary?.customers
                    ) || 0
                );

        console.log(

            \`[cacheWarmup] CUSTOMER RFM REFRESHED branch=\${branchId} analysisDate=\${analysisDate} snapshot=\${result?.snapshotId ?? "n/a"} customers=\${customerCount}\`

        );

        return {

            success:
                true,

            branchId,

            snapshotId:
                result?.snapshotId ?? null,

            customerCount

        };

    }
    catch (
        error
    ) {

        console.error(

            \`[cacheWarmup] CUSTOMER RFM REFRESH FAILED branch=\${branchId}:\`,

            error?.message ||
            error

        );

        return {

            success:
                false,

            branchId,

            error:
                error?.message ||
                String(
                    error
                )

        };

    }

}


`;

    const patchedWithHelper =
        source.slice(
            0,
            anchorIndex
        ) +
        helper +
        source.slice(
            anchorIndex
        );

    fs.writeFileSync(
        filePath,
        patchedWithHelper,
        "utf8"
    );

    console.log(
        "RFM AUTO-REFRESH HELPER ADDED."
    );

}
else {

    console.log(
        "RFM AUTO-REFRESH HELPER ALREADY EXISTS."
    );
}

let patched =
    fs.readFileSync(
        filePath,
        "utf8"
    );

const successMarker =
    `[cacheWarmup] CURRENT MONTH REFRESHED branch=`;

const successLogIndex =
    patched.indexOf(
        successMarker
    );

if (
    successLogIndex === -1
) {
    throw new Error(
        "CURRENT MONTH REFRESHED marker not found."
    );
}

const successReturnIndex =
    patched.indexOf(
        "return true;",
        successLogIndex
    );

if (
    successReturnIndex === -1
) {
    throw new Error(
        "CURRENT MONTH success return not found."
    );
}

patched =
    patched.slice(
        0,
        successReturnIndex
    ) +
    `return {
                                        success: true,
                                        branchId
                                    };` +
    patched.slice(
        successReturnIndex +
        "return true;".length
    );

const failureMarker =
    `[cacheWarmup] CURRENT MONTH REFRESH FAILED branch=`;

const failureLogIndex =
    patched.indexOf(
        failureMarker,
        successReturnIndex
    );

if (
    failureLogIndex === -1
) {
    throw new Error(
        "CURRENT MONTH REFRESH FAILED marker not found."
    );
}

const failureReturnIndex =
    patched.indexOf(
        "return false;",
        failureLogIndex
    );

if (
    failureReturnIndex === -1
) {
    throw new Error(
        "CURRENT MONTH failure return not found."
    );
}

patched =
    patched.slice(
        0,
        failureReturnIndex
    ) +
    `return {
                                        success: false,
                                        branchId
                                    };` +
    patched.slice(
        failureReturnIndex +
        "return false;".length
    );

const counterStartMarker =
`                for (
                    const success
                    of results
                ) {

                    if (success) {
                        refreshed += 1;
                    }
                    else {
                        failed += 1;
                    }

                }`;

const counterStart =
    patched.indexOf(
        counterStartMarker
    );

if (
    counterStart === -1
) {
    throw new Error(
        "CURRENT MONTH result counter block not found."
    );
}

const counterReplacement =
`                for (
                    const result
                    of results
                ) {

                    if (
                        result?.success
                    ) {

                        refreshed +=
                            1;

                        const customerRefresh =
                            await refreshCustomerRfmAfterSalesSync(
                                result.branchId
                            );

                        if (
                            !customerRefresh?.success
                        ) {

                            customerRefreshFailed +=
                                1;

                        }

                    }
                    else {

                        failed +=
                            1;

                    }

                }`;

patched =
    patched.slice(
        0,
        counterStart
    ) +
    counterReplacement +
    patched.slice(
        counterStart +
        counterStartMarker.length
    );

const failedDeclarationMarker =
`            let failed =
                0;`;

const failedDeclarationIndex =
    patched.indexOf(
        failedDeclarationMarker
    );

if (
    failedDeclarationIndex === -1
) {
    throw new Error(
        "CURRENT MONTH failed counter not found."
    );
}

const failedDeclarationReplacement =
`            let failed =
                0;

            let customerRefreshFailed =
                0;`;

patched =
    patched.slice(
        0,
        failedDeclarationIndex
    ) +
    failedDeclarationReplacement +
    patched.slice(
        failedDeclarationIndex +
        failedDeclarationMarker.length
    );

const completionSuccessMarker =
`                success:
                    failed === 0,`;

const completionSuccessIndex =
    patched.indexOf(
        completionSuccessMarker
    );

if (
    completionSuccessIndex === -1
) {
    throw new Error(
        "CURRENT MONTH completion success expression not found."
    );
}

patched =
    patched.slice(
        0,
        completionSuccessIndex
    ) +
`                success:
                    failed === 0 &&
                    customerRefreshFailed === 0,` +
    patched.slice(
        completionSuccessIndex +
        completionSuccessMarker.length
    );

const returnFailedMarker =
`                failed

            };`;

const returnFailedIndex =
    patched.indexOf(
        returnFailedMarker,
        completionSuccessIndex
    );

if (
    returnFailedIndex === -1
) {
    throw new Error(
        "CURRENT MONTH return block not found."
    );
}

patched =
    patched.slice(
        0,
        returnFailedIndex
    ) +
`                failed,

                customerRefreshFailed

            };` +
    patched.slice(
        returnFailedIndex +
        returnFailedMarker.length
    );

const logFailedMarker =
`                " failed=" +
                String(failed) +
                ")"
            );`;

const logFailedIndex =
    patched.indexOf(
        logFailedMarker,
        completionSuccessIndex
    );

if (
    logFailedIndex !== -1
) {

    const logReplacement =
`                " failed=" +
                String(failed) +
                " rfmFailed=" +
                String(customerRefreshFailed)
            );`;

    patched =
        patched.slice(
            0,
            logFailedIndex
        ) +
        logReplacement +
        patched.slice(
            logFailedIndex +
            logFailedMarker.length
        );

}

const stamp =
    new Date()
        .toISOString()
        .replace(
            /[:.]/g,
            "-"
        );

const backupPath =
    `${filePath}.backup-before-current-month-rfm-${stamp}`;

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
    "CURRENT MONTH SALES -> RFM AUTO-REFRESH PATCH APPLIED."
);

console.log(
    `BACKUP: ${backupPath}`
);
