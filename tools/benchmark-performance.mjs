import { app } from "electron";

await app.whenReady();

const {
    getAllSavedConnections
} = await import(
    "../electron/settings/connectionStore.js"
);

const {
    getSales
} = await import(
    "../electron/pharmfly/sales/salesService.js"
);

const {
    getSalesSellersFast
} = await import(
    "../electron/pharmfly/sales/sellerListService.js"
);

async function measure(name, fn) {

    const started = Date.now();

    console.log("");
    console.log("START " + name);

    try {

        const result =
            await Promise.race([
                fn(),

                new Promise((_, reject) => {
                    setTimeout(
                        () => reject(
                            new Error(
                                "TIMEOUT_20000MS"
                            )
                        ),
                        20000
                    );
                })
            ]);

        console.log(
            "DONE " +
            name +
            " | " +
            (Date.now() - started) +
            " ms"
        );

        return result;

    }
    catch (error) {

        console.log(
            "FAIL " +
            name +
            " | " +
            (Date.now() - started) +
            " ms | " +
            String(
                error?.message || error
            )
        );

        return null;
    }
}

console.log("");
console.log("======================================");
console.log("PHARMABI SPEED TEST");
console.log("======================================");

const connections =
    await measure(
        "LOAD CONNECTIONS",
        () =>
            getAllSavedConnections()
    );

if (
    !Array.isArray(connections) ||
    connections.length === 0
) {

    console.log(
        "No branch connections found."
    );

    app.exit(0);
}

const connection =
    connections.find(
        x =>
            Number(
                x?.branchId ??
                x?.id
            ) === 1
    ) ||
    connections[0];

const branchId =
    Number(
        connection?.branchId ??
        connection?.id
    );

console.log(
    "BRANCH " +
    branchId
);

const args = {
    branchId,
    fromDate: "2026-09-01",
    toDate: "2026-09-22",
    connection
};

const sellers =
    await measure(
        "SELLER LIST #1",
        () =>
            getSalesSellersFast(args)
    );

await measure(
    "SELLER LIST #2",
    () =>
        getSalesSellersFast(args)
);

const sales1 =
    await measure(
        "SALES #1",
        () =>
            getSales(args)
    );

if (Array.isArray(sales1)) {

    console.log(
        "SALES #1 ROWS " +
        sales1.length
    );
}

const sales2 =
    await measure(
        "SALES #2",
        () =>
            getSales(args)
    );

if (Array.isArray(sales2)) {

    console.log(
        "SALES #2 ROWS " +
        sales2.length
    );
}

console.log("");
console.log("======================================");
console.log("SPEED TEST COMPLETE");
console.log("======================================");

app.exit(0);
