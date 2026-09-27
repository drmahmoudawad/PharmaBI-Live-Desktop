import fs from "node:fs";

const projectRoot =
    "D:/PharmaBI-Live-Desktop";

const uiFile =
    `${projectRoot}/src/components/CustomerAnalyticsModulePanel.jsx`;

const uiBackup =
    `${uiFile}.backup-before-rfm-overview-split-20260925`;

const source =
    fs.readFileSync(
        uiFile,
        "utf8"
    );

const startPattern =
    /\/\*\s*\r?\n\s*\*\s*RFM \+ Customer Overview[\s\S]*?(?=\/\*\s*\r?\n\s*\*\s*Retention)/m;

const match =
    source.match(
        startPattern
    );

if (!match) {

    throw new Error(
        "Customer Overview/RFM section was not found."
    );

}

if (
    fs.existsSync(
        uiBackup
    ) === false
) {

    fs.copyFileSync(
        uiFile,
        uiBackup
    );

}

const newBlock = `
                    /*
                     * RFM + Customer Overview
                     *
                     * IMPORTANT:
                     * Customer Overview must NOT run
                     * the heavy RFM V2 calculation.
                     *
                     * Customer Overview:
                     *     -> analytics.module
                     *
                     * RFM:
                     *     -> RFM V2
                     */

                    if (
                        moduleId ===
                            "customer-rfm" ||
                        moduleId ===
                            "customer-overview"
                    ) {

                        if (
                            moduleId ===
                                "customer-rfm" &&
                            typeof customersApi?.rfmV2 ===
                                "function"
                        ) {

                            result =
                                await customersApi.rfmV2({

                                    branchId,

                                    fromDate:
                                        safeFromDate,

                                    toDate:
                                        safeToDate

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                                "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate:
                                        safeFromDate,

                                    toDate:
                                        safeToDate

                                });

                        }

                    }


`;

const updated =
    source.replace(
        startPattern,
        newBlock
    );

if (
    updated ===
    source
) {

    throw new Error(
        "No change was made to CustomerAnalyticsModulePanel.jsx."
    );

}

fs.writeFileSync(
    uiFile,
    updated,
    "utf8"
);

console.log(
    "Customer UI: UPDATED"
);

console.log(
    `Backup: ${uiBackup}`
);

console.log(
    "Customer Overview no longer calls RFM V2."
);