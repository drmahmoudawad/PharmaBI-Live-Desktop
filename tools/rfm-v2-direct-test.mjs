import { app } from "electron";

console.log("");
console.log("========================================");
console.log("        RFM V2 DIRECT TEST");
console.log("========================================");
console.log("");

await app.whenReady();

app.setPath(
    "userData",
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
);

console.log(
    "[TEST] userData =",
    app.getPath("userData")
);

try {

    const {
        getCustomerRfmV2
    } = await import(
        "../electron/pharmfly/customers/customerRfmV2Service.js"
    );

    console.log(
        "[TEST] RFM V2 loaded"
    );

    const startedAt = Date.now();

    const result =
        await getCustomerRfmV2({

            branchId:
                1,

            analysisDate:
                "2026-09-24",

            observationDays:
                365,

            trendDays:
                90,

            minTickets:
                1,

            saveSnapshot:
                false

        });

    console.log(
        `[TEST] completed in ${Date.now() - startedAt} ms`
    );

    console.log("");
    console.log("===== SUMMARY =====");

    console.log(
        JSON.stringify(
            result.summary,
            null,
            2
        )
    );

    console.log("");
    console.log("===== TOP 10 =====");

    console.log(
        JSON.stringify(
            result.customers.slice(0, 10),
            null,
            2
        )
    );

    console.log("");
    console.log("===== SUCCESS =====");
    console.log("");

}
catch (error) {

    console.error("");
    console.error("===== FAILED =====");
    console.error(
        error?.stack ||
        error?.message ||
        error
    );
    console.error("");

    process.exitCode = 1;

}
finally {

    app.quit();

}
