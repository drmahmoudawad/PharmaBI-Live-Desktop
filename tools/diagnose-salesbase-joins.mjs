import { app } from "electron";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const TEST_BRANCH_IDS = [
    2,
    5
];

const FROM_DATE = "2026-09-01";
const TO_DATE_EXCLUSIVE = "2026-09-18";

const TESTS = [
    {
        code: "A",
        name: "posTickets + posItems",
        sql: `
            SELECT
                t.ID AS ticket_id,
                t.ztime AS ticket_ztime,
                t.SalesReturn AS sales_return,
                t.CustomerID AS customer_id,
                t.Total AS ticket_total,
                t.StoreID AS ticket_store_id,
                t.SalesRepID AS sales_rep_id,

                pi.ID AS line_id,
                pi.ItemID AS item_id,
                pi.Packs AS packs,
                pi.Units AS units,
                pi.iParts AS line_parts,
                pi.Bonus AS bonus,
                pi.SalesPrice AS line_sales_price,
                pi.Cost AS line_cost,
                pi.Discount AS line_discount,
                pi.ExtraDiscount AS line_extra_discount,
                pi.IsContent AS is_content,
                pi.StoreID AS line_store_id

            INTO #TestSalesBase

            FROM posTickets t

            INNER JOIN posItems pi
                ON pi.TicketID = t.ID

            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;

            SELECT COUNT_BIG(*) AS row_count
            FROM #TestSalesBase;

            DROP TABLE #TestSalesBase;
        `
    },

    {
        code: "B",
        name: "A + Cards",
        sql: `
            SELECT
                t.ID AS ticket_id,
                t.ztime AS ticket_ztime,
                t.SalesReturn AS sales_return,
                t.CustomerID AS customer_id,
                c.Name AS customer_name,
                t.Total AS ticket_total,
                t.StoreID AS ticket_store_id,
                t.SalesRepID AS sales_rep_id,

                pi.ID AS line_id,
                pi.ItemID AS item_id,
                pi.Packs AS packs,
                pi.Units AS units,
                pi.iParts AS line_parts,
                pi.Bonus AS bonus,
                pi.SalesPrice AS line_sales_price,
                pi.Cost AS line_cost,
                pi.Discount AS line_discount,
                pi.ExtraDiscount AS line_extra_discount,
                pi.IsContent AS is_content,
                pi.StoreID AS line_store_id

            INTO #TestSalesBase

            FROM posTickets t

            INNER JOIN posItems pi
                ON pi.TicketID = t.ID

            LEFT JOIN Cards c
                ON c.ID = t.CustomerID

            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;

            SELECT COUNT_BIG(*) AS row_count
            FROM #TestSalesBase;

            DROP TABLE #TestSalesBase;
        `
    },

    {
        code: "C",
        name: "A + Items",
        sql: `
            SELECT
                t.ID AS ticket_id,
                t.ztime AS ticket_ztime,
                t.SalesReturn AS sales_return,
                t.CustomerID AS customer_id,
                t.Total AS ticket_total,
                t.StoreID AS ticket_store_id,
                t.SalesRepID AS sales_rep_id,

                pi.ID AS line_id,
                pi.ItemID AS item_id,
                i.name AS item_name,
                i.Parts AS item_parts,
                pi.Packs AS packs,
                pi.Units AS units,
                pi.iParts AS line_parts,
                pi.Bonus AS bonus,
                pi.SalesPrice AS line_sales_price,
                pi.Cost AS line_cost,
                pi.Discount AS line_discount,
                pi.ExtraDiscount AS line_extra_discount,
                pi.IsContent AS is_content,
                pi.StoreID AS line_store_id

            INTO #TestSalesBase

            FROM posTickets t

            INNER JOIN posItems pi
                ON pi.TicketID = t.ID

            LEFT JOIN Items i
                ON i.ID = pi.ItemID

            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;

            SELECT COUNT_BIG(*) AS row_count
            FROM #TestSalesBase;

            DROP TABLE #TestSalesBase;
        `
    },

    {
        code: "D",
        name: "A + Cards + Items (REAL SalesBase)",
        sql: `
            SELECT
                t.ID AS ticket_id,
                t.ztime AS ticket_ztime,
                t.SalesReturn AS sales_return,
                t.CustomerID AS customer_id,
                c.Name AS customer_name,
                t.Total AS ticket_total,
                t.StoreID AS ticket_store_id,
                t.SalesRepID AS sales_rep_id,

                pi.ID AS line_id,
                pi.ItemID AS item_id,
                i.name AS item_name,
                i.Parts AS item_parts,
                pi.Packs AS packs,
                pi.Units AS units,
                pi.iParts AS line_parts,
                pi.Bonus AS bonus,
                pi.SalesPrice AS line_sales_price,
                pi.Cost AS line_cost,
                pi.Discount AS line_discount,
                pi.ExtraDiscount AS line_extra_discount,
                pi.IsContent AS is_content,
                pi.StoreID AS line_store_id

            INTO #TestSalesBase

            FROM posTickets t

            INNER JOIN posItems pi
                ON pi.TicketID = t.ID

            LEFT JOIN Cards c
                ON c.ID = t.CustomerID

            LEFT JOIN Items i
                ON i.ID = pi.ItemID

            WHERE
                t.ztime >= @fromDate
                AND t.ztime < @toDateExclusive;

            SELECT COUNT_BIG(*) AS row_count
            FROM #TestSalesBase;

            DROP TABLE #TestSalesBase;
        `
    }
];


function log(message) {
    console.log(message);
}


async function runTest(
    pool,
    test,
    branchId
) {

    const started =
        Date.now();

    log(
        `[START] Branch ${branchId} | Test ${test.code} | ${test.name}`
    );

    try {

        const result =
            await pool
                .request()
                .input(
                    "fromDate",
                    `${FROM_DATE} 00:00:00`
                )
                .input(
                    "toDateExclusive",
                    `${TO_DATE_EXCLUSIVE} 00:00:00`
                )
                .query(`
                    SET NOCOUNT ON;

                    ${test.sql}
                `);

        const elapsed =
            Date.now() - started;

        const rows =
            Number(
                result?.recordsets?.[
                    result.recordsets.length - 1
                ]?.[0]?.row_count
            ) || 0;

        log(
            `[RESULT] Branch ${branchId} | Test ${test.code} | rows=${rows} | ${elapsed} ms`
        );

        return {
            ok: true,
            elapsed,
            rows
        };

    }
    catch (error) {

        const elapsed =
            Date.now() - started;

        log(
            `[FAILED] Branch ${branchId} | Test ${test.code} | ${elapsed} ms`
        );

        log(
            `[ERROR] ${error?.message || error}`
        );

        return {
            ok: false,
            elapsed,
            error
        };
    }
}


async function runBranch(
    branch
) {

    const branchId =
        Number(
            branch.branchId
        );

    log("");
    log(
        "============================================================"
    );
    log(
        `BRANCH ${branchId} - ${branch.branchName || ""}`
    );
    log(
        `SERVER=${branch.server}`
    );
    log(
        `DATABASE=${branch.database}`
    );
    log(
        `PORT=${branch.port}`
    );
    log(
        `RANGE=${FROM_DATE} -> 2026-09-17`
    );
    log(
        "============================================================"
    );

    const pool =
        await getBranchPool(
            branchId,
            branch
        );

    log(
        `[CONNECTED] Branch ${branchId}`
    );

    for (
        const test
        of TESTS
    ) {

        const result =
            await runTest(
                pool,
                test,
                branchId
            );

        if (
            !result.ok
        ) {

            log(
                `[STOP] Branch ${branchId} stopped after Test ${test.code} failure.`
            );

            break;
        }
    }
}


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );

    log(
        "============================================================"
    );

    log(
        "PHARMABI SALESBASE JOIN DIAGNOSTIC"
    );

    log(
        `Range: ${FROM_DATE} -> 2026-09-17`
    );

    log(
        "No dashboard."
    );

    log(
        "No warm-up."
    );

    log(
        "Each test is an independent SQL batch."
    );

    log(
        "============================================================"
    );


    const savedConnections =
        getAllSavedConnections();


    /*
     * The standalone Electron diagnostic process cannot decrypt
     * the stored safeStorage password, so use the known password
     * only inside this diagnostic process.
     */
    for (
        const branch
        of savedConnections
    ) {

        branch.password = "123";
    }


    log(
        `[CONNECTION STORE] Saved branches=${savedConnections.length}`
    );


    for (
        const branchId
        of TEST_BRANCH_IDS
    ) {

        const branch =
            savedConnections.find(
                item =>
                    Number(
                        item.branchId
                    ) === branchId
            );

        if (
            !branch
        ) {

            log(
                `[SKIP] Branch ${branchId} was not found.`
            );

            continue;
        }


        try {

            await runBranch(
                branch
            );

        }
        catch (error) {

            console.error(
                `[BRANCH FAILED] Branch ${branchId}`,
                error?.stack || error
            );
        }
    }


    try {
        await closeAllConnections();
    }
    catch {}


    log("");
    log(
        "============================================================"
    );
    log(
        "DIAGNOSTIC FINISHED"
    );
    log(
        "============================================================"
    );


    app.quit();
}


main().catch(
    async error => {

        console.error(
            error?.stack || error
        );

        try {
            await closeAllConnections();
        }
        catch {}

        app.quit();

        process.exitCode = 1;
    }
);