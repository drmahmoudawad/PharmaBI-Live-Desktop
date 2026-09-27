const { app } = require("electron");

const TEST_BRANCHES = [1, 2, 4];

const FROM_DATE = "2025-10-01";
const TO_DATE = "2026-09-24";

async function run() {

    await app.whenReady();

    const {
        getDashboardOverview
    } = await import(
        "../electron/pharmfly/dashboardOverviewService.js"
    );

    const {
        getBranchConnection
    } = await import(
        "../electron/settings/connectionStore.js"
    );

    for (
        const branchId
        of TEST_BRANCHES
    ) {

        console.log("");
        console.log(
            "=================================================="
        );
        console.log(
            `EXACT SELLERS PAGE REQUEST BRANCH ${branchId}`
        );
        console.log(
            "=================================================="
        );

        const connection =
            getBranchConnection(
                branchId
            );

        if (!connection) {

            console.log(
                "NO CONNECTION"
            );

            continue;

        }

        const started =
            Date.now();

        try {

            console.log(
                `[BRANCH ${branchId}] START getDashboardOverview`
            );

            const result =
                await getDashboardOverview({

                    branchId,

                    fromDate:
                        FROM_DATE,

                    toDate:
                        TO_DATE,

                    connection

                });

            const elapsed =
                Date.now() -
                started;

            console.log(
                `[BRANCH ${branchId}] DONE getDashboardOverview in ${elapsed} ms`
            );

            console.log(
                `[BRANCH ${branchId}] employees = ${
                    Array.isArray(
                        result?.employees
                    )
                        ? result.employees.length
                        : 0
                }`
            );

            console.log(
                `[BRANCH ${branchId}] daily = ${
                    Array.isArray(
                        result?.daily
                    )
                        ? result.daily.length
                        : 0
                }`
            );

            console.table(
                (
                    result?.employees ||
                    []
                ).slice(
                    0,
                    10
                )
            );

        }
        catch (
            error
        ) {

            console.error(
                `[BRANCH ${branchId}] FAILED:`,
                error?.message ||
                error
            );

        }

    }

    await app.quit();

}

run().catch(
    error => {

        console.error(
            "FATAL:",
            error
        );

        app.quit();

    }
);
