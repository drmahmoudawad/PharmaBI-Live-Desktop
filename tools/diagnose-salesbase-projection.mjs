import { app } from "electron";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const BRANCH_ID = 2;

const FROM_DATE = "2026-09-01";
const TO_DATE_EXCLUSIVE = "2026-09-18";

const TESTS = [
    {
        code: "P1",
        name: "IDs فقط",
        select: `
            t.ID AS ticket_id,
            t.ztime AS ticket_ztime,
            t.CustomerID AS customer_id,
            pi.ID AS line_id,
            pi.ItemID AS item_id
        `
    },

    {
        code: "P2",
        name: "IDs + posItems numeric",
        select: `
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
        `
    },

    {
        code: "P3",
        name: "P2 + Cards.Name",
        select: `
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
        `
    },

    {
        code: "P4",
        name: "P2 + Items.name/Parts",
        select: `
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
        `
    },

    {
        code: "P5",
        name: "FULL REAL SalesBase",
        select: `
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
        `
    }
];


function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


async function runTest(
    pool,
    test
) {

    console.log("");
    console.log(
        `[START] ${test.code} - ${test.name}`
    );

    const tableName =
        `#DiagSalesBase_${test.code}`;


    const request =
        pool.request();

    request.input(
        "fromDate",
        `${FROM_DATE} 00:00:00`
    );

    request.input(
        "toDateExclusive",
        `${TO_DATE_EXCLUSIVE} 00:00:00`
    );


    let cancelled = false;

    const started =
        Date.now();


    const cancelTimer =
        setTimeout(
            () => {

                if (!cancelled) {

                    cancelled = true;

                    console.log(
                        `[CANCEL] ${test.code} exceeded 15000 ms`
                    );

                    try {
                        request.cancel();
                    }
                    catch {}
                }

            },
            15000
        );


    try {

        const result =
            await request.query(`
                SET NOCOUNT ON;

                SELECT
                    ${test.select}

                INTO ${tableName}

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

                SELECT
                    COUNT_BIG(*) AS row_count
                FROM ${tableName};

                DROP TABLE ${tableName};
            `);


        clearTimeout(
            cancelTimer
        );


        const elapsed =
            Date.now() - started;


        const recordsets =
            result?.recordsets || [];


        const lastSet =
            recordsets[
                recordsets.length - 1
            ] || [];


        const rows =
            lastSet?.[0]?.row_count ??
            0;


        console.log(
            `[RESULT] ${test.code} -> rows=${rows} | ${elapsed} ms`
        );


        return {
            ok: true,
            elapsed,
            rows
        };

    }
    catch (error) {

        clearTimeout(
            cancelTimer
        );


        const elapsed =
            Date.now() - started;


        console.log(
            `[FAILED] ${test.code} -> ${elapsed} ms`
        );

        console.log(
            `[ERROR] ${error?.message || error}`
        );


        return {
            ok: false,
            elapsed,
            error
        };
    }
}


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );


    const connections =
        getAllSavedConnections();


    // Diagnostic only.
    for (
        const branch of connections
    ) {
        branch.password = "123";
    }


    const branch =
        connections.find(
            item =>
                Number(item.branchId) === BRANCH_ID
        );


    if (!branch) {
        throw new Error(
            `Branch ${BRANCH_ID} not found.`
        );
    }


    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "BRANCH 2 - SALESBASE PROJECTION DIAGNOSTIC"
    );

    console.log(
        `SERVER=${branch.server}`
    );

    console.log(
        `DATABASE=${branch.database}`
    );

    console.log(
        `PORT=${branch.port}`
    );

    console.log(
        `${FROM_DATE} -> 2026-09-17`
    );

    console.log(
        "Each SELECT INTO is independently cancellable after 15 sec."
    );

    console.log(
        "============================================================"
    );


    const pool =
        await getBranchPool(
            BRANCH_ID,
            branch
        );


    console.log(
        "[CONNECTED]"
    );


    for (
        const test of TESTS
    ) {

        const result =
            await runTest(
                pool,
                test
            );


        if (
            !result.ok &&
            result.elapsed >= 14000
        ) {

            console.log(
                `[STOP] First problematic projection detected at ${test.code}.`
            );

            break;
        }
    }


    await closeAllConnections();

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