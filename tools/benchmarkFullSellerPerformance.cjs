const { app } = require("electron");

const TESTS = [
    {
        branchId: 1,
        employeeId: "5050"
    },
    {
        branchId: 2,
        employeeId: "5037"
    },
    {
        branchId: 4,
        employeeId: "5072"
    }
];

async function run() {

    await app.whenReady();

    const {
        getSellerPerformance
    } = await import(
        "../electron/pharmfly/sellerPerformanceService.js"
    );

    const {
        getBranchConnection
    } = await import(
        "../electron/settings/connectionStore.js"
    );

    for (
        const test
        of TESTS
    ) {

        console.log("");
        console.log(
            "=================================================="
        );
        console.log(
            `FULL SELLER PERFORMANCE BRANCH ${test.branchId} EMPLOYEE ${test.employeeId}`
        );
        console.log(
            "=================================================="
        );

        const connection =
            getBranchConnection(
                test.branchId
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
                "START getSellerPerformance"
            );

            const result =
                await getSellerPerformance({

                    branchId:
                        test.branchId,

                    employeeId:
                        test.employeeId,

                    fromDate:
                        "2025-10-01",

                    toDate:
                        "2026-09-24",

                    connection,

                    historyMonths:
                        12

                });

            const elapsed =
                Date.now() -
                started;

            console.log(
                `DONE getSellerPerformance in ${elapsed} ms`
            );

            console.log(
                "RESULT KEYS:",
                Object.keys(
                    result || {}
                )
            );

        }
        catch (
            error
        ) {

            console.error(
                "FAILED:",
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
