import { app } from "electron";
import sql from "mssql";
import crypto from "node:crypto";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const BRANCH_ID = 2;

const FROM_DATE = "2026-09-01";
const TO_DATE = "2026-09-17";

const FROM_DATE_SQL = `${FROM_DATE} 00:00:00`;
const TO_DATE_EXCLUSIVE_SQL = "2026-09-18 00:00:00";

const suffix =
    crypto.randomBytes(5).toString("hex");

const SALES_BASE =
    `##DiagSalesBase_${suffix}`;

const NEEDED_ITEMS =
    `##DiagNeededItems_${suffix}`;

const PURCHASES =
    `##DiagPurchases_${suffix}`;

const PREVIOUS_PURCHASES =
    `##DiagPreviousPurchases_${suffix}`;


function log(message) {
    console.log(message);
}


async function timed(
    label,
    fn
) {
    const started = Date.now();

    log("");
    log(`[START] ${label}`);

    try {
        const result = await fn();

        const elapsed =
            Date.now() - started;

        log(
            `[DONE] ${label} -> ${elapsed} ms`
        );

        return result;
    }
    catch (error) {

        const elapsed =
            Date.now() - started;

        log(
            `[FAILED] ${label} -> ${elapsed} ms`
        );

        log(
            `[ERROR] ${error?.message || error}`
        );

        throw error;
    }
}


async function dropGlobalTempTables(pool) {

    try {
        await pool.request().query(`
            IF OBJECT_ID('tempdb..${PREVIOUS_PURCHASES}') IS NOT NULL
                DROP TABLE ${PREVIOUS_PURCHASES};

            IF OBJECT_ID('tempdb..${PURCHASES}') IS NOT NULL
                DROP TABLE ${PURCHASES};

            IF OBJECT_ID('tempdb..${NEEDED_ITEMS}') IS NOT NULL
                DROP TABLE ${NEEDED_ITEMS};

            IF OBJECT_ID('tempdb..${SALES_BASE}') IS NOT NULL
                DROP TABLE ${SALES_BASE};
        `);
    }
    catch (error) {
        console.log(
            `[CLEANUP] ${error?.message || error}`
        );
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
    for (const branch of connections) {
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


    log("");
    log(
        "============================================================"
    );
    log(
        "PHARMABI REAL SALES QUERY STAGE DIAGNOSTIC V2"
    );
    log(
        `Branch=${BRANCH_ID}`
    );
    log(
        `Server=${branch.server}`
    );
    log(
        `Database=${branch.database}`
    );
    log(
        `Port=${branch.port}`
    );
    log(
        `Range=${FROM_DATE} -> ${TO_DATE}`
    );
    log(
        "Using global temp tables so every stage uses the same data."
    );
    log(
        "============================================================"
    );


    const pool =
        await getBranchPool(
            BRANCH_ID,
            branch
        );


    log(
        "[CONNECTED]"
    );


    try {

        await dropGlobalTempTables(
            pool
        );


        /*
         * =========================================================
         * STAGE 1
         * EXACT #SalesBase
         * =========================================================
         */

        await timed(
            "1. SALES BASE + INDEX",
            async () => {

                await pool
                    .request()

                    .input(
                        "fromDate",
                        FROM_DATE_SQL
                    )

                    .input(
                        "toDateExclusive",
                        TO_DATE_EXCLUSIVE_SQL
                    )

                    .query(`
                        SET NOCOUNT ON;

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

                        INTO ${SALES_BASE}

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

                        CREATE NONCLUSTERED INDEX
                            IX_${suffix}_SalesBase_Item_Date_Line

                        ON ${SALES_BASE} (
                            item_id,
                            ticket_ztime,
                            line_id
                        );
                    `);
            }
        );


        /*
         * =========================================================
         * STAGE 2
         * EXACT #NeededItems
         * =========================================================
         */

        await timed(
            "2. NEEDED ITEMS + INDEX",
            async () => {

                await pool
                    .request()
                    .query(`
                        SET NOCOUNT ON;

                        SELECT DISTINCT
                            item_id

                        INTO ${NEEDED_ITEMS}

                        FROM ${SALES_BASE}

                        WHERE
                            item_id IS NOT NULL;

                        CREATE UNIQUE CLUSTERED INDEX
                            IX_${suffix}_NeededItems_Item

                        ON ${NEEDED_ITEMS} (
                            item_id
                        );
                    `);
            }
        );


        /*
         * =========================================================
         * STAGE 3
         * EXACT #Purchases
         * =========================================================
         */

        await timed(
            "3. PURCHASES + INDEX",
            async () => {

                await pool
                    .request()

                    .input(
                        "fromDate",
                        FROM_DATE_SQL
                    )

                    .input(
                        "toDateExclusive",
                        TO_DATE_EXCLUSIVE_SQL
                    )

                    .query(`
                        SET NOCOUNT ON;

                        SELECT
                            pitem.item_id AS item_id,

                            pitem.CostPrice AS purchase_cost,

                            COALESCE(
                                pinv.ztime,
                                pinv.inv_date
                            ) AS purchase_date,

                            pinv.ID AS purchase_invoice_id,

                            pinv.inv_code
                                AS purchase_invoice_code,

                            pinv.vendor_id
                                AS purchase_vendor_id,

                            pitem.ID
                                AS purchase_item_id

                        INTO ${PURCHASES}

                        FROM PurchaseItems pitem

                        INNER JOIN PurchaseInvoices pinv
                            ON pinv.ID = pitem.inv_id

                        INNER JOIN ${NEEDED_ITEMS} needed
                            ON needed.item_id = pitem.item_id

                        WHERE
                            COALESCE(
                                pinv.ztime,
                                pinv.inv_date
                            ) >= @fromDate

                            AND COALESCE(
                                pinv.ztime,
                                pinv.inv_date
                            ) < @toDateExclusive;


                        CREATE CLUSTERED INDEX
                            IX_${suffix}_Purchases_Item_Date

                        ON ${PURCHASES} (
                            item_id,
                            purchase_date,
                            purchase_invoice_id,
                            purchase_item_id
                        );
                    `);
            }
        );


        /*
         * =========================================================
         * STAGE 4
         * EXACT #PreviousPurchases
         * =========================================================
         */

        await timed(
            "4. PREVIOUS PURCHASES + INDEX",
            async () => {

                await pool
                    .request()

                    .input(
                        "fromDate",
                        FROM_DATE_SQL
                    )

                    .query(`
                        SET NOCOUNT ON;

                        SELECT
                            needed.item_id,

                            previousPurchase.purchase_cost,

                            previousPurchase.purchase_date,

                            previousPurchase.purchase_invoice_id,

                            previousPurchase.purchase_invoice_code,

                            previousPurchase.purchase_vendor_id,

                            previousPurchase.purchase_item_id

                        INTO ${PREVIOUS_PURCHASES}

                        FROM ${NEEDED_ITEMS} needed

                        OUTER APPLY (

                            SELECT TOP 1

                                pitem.CostPrice
                                    AS purchase_cost,

                                COALESCE(
                                    pinv.ztime,
                                    pinv.inv_date
                                )
                                    AS purchase_date,

                                pinv.ID
                                    AS purchase_invoice_id,

                                pinv.inv_code
                                    AS purchase_invoice_code,

                                pinv.vendor_id
                                    AS purchase_vendor_id,

                                pitem.ID
                                    AS purchase_item_id

                            FROM PurchaseItems pitem

                            INNER JOIN PurchaseInvoices pinv
                                ON pinv.ID = pitem.inv_id

                            WHERE
                                pitem.item_id =
                                    needed.item_id

                                AND COALESCE(
                                    pinv.ztime,
                                    pinv.inv_date
                                ) < @fromDate

                            ORDER BY

                                COALESCE(
                                    pinv.ztime,
                                    pinv.inv_date
                                ) DESC,

                                pinv.ID DESC,

                                pitem.ID DESC

                        ) previousPurchase;


                        CREATE UNIQUE CLUSTERED INDEX
                            IX_${suffix}_PreviousPurchases_Item

                        ON ${PREVIOUS_PURCHASES} (
                            item_id
                        );
                    `);
            }
        );


        /*
         * =========================================================
         * STAGE 5
         * EXACT FINAL SELECT
         * =========================================================
         */

        await timed(
            "5. FINAL SELECT",
            async () => {

                const result =
                    await pool
                        .request()
                        .query(`
                            SET NOCOUNT ON;

                            SELECT

                                s.ticket_id,
                                s.ticket_ztime,
                                s.sales_return,
                                s.customer_id,
                                s.customer_name,
                                s.ticket_total,
                                s.ticket_store_id,
                                s.sales_rep_id,

                                s.line_id,
                                s.item_id,
                                s.item_name,
                                s.item_parts,

                                s.packs,
                                s.units,
                                s.line_parts,
                                s.bonus,
                                s.line_sales_price,
                                s.line_cost,
                                s.line_discount,
                                s.line_extra_discount,
                                s.is_content,
                                s.line_store_id,

                                latestPurchase.purchase_cost
                                    AS last_purchase_cost,

                                latestPurchase.purchase_date
                                    AS last_purchase_date,

                                latestPurchase.purchase_invoice_id
                                    AS last_purchase_invoice_id,

                                latestPurchase.purchase_invoice_code
                                    AS last_purchase_invoice_code,

                                latestPurchase.purchase_vendor_id
                                    AS last_purchase_vendor_id,

                                s.item_parts
                                    AS last_purchase_parts

                            FROM ${SALES_BASE} s

                            OUTER APPLY (

                                SELECT TOP 1

                                    p.purchase_cost,
                                    p.purchase_date,
                                    p.purchase_invoice_id,
                                    p.purchase_invoice_code,
                                    p.purchase_vendor_id,
                                    p.purchase_item_id

                                FROM (

                                    SELECT

                                        purchase_cost,
                                        purchase_date,
                                        purchase_invoice_id,
                                        purchase_invoice_code,
                                        purchase_vendor_id,
                                        purchase_item_id

                                    FROM ${PURCHASES}

                                    WHERE
                                        item_id =
                                            s.item_id

                                        AND purchase_date <=
                                            s.ticket_ztime


                                    UNION ALL


                                    SELECT

                                        purchase_cost,
                                        purchase_date,
                                        purchase_invoice_id,
                                        purchase_invoice_code,
                                        purchase_vendor_id,
                                        purchase_item_id

                                    FROM ${PREVIOUS_PURCHASES}

                                    WHERE
                                        item_id =
                                            s.item_id

                                        AND NOT EXISTS (

                                            SELECT 1

                                            FROM ${PURCHASES} currentPurchase

                                            WHERE
                                                currentPurchase.item_id =
                                                    s.item_id

                                                AND currentPurchase.purchase_date <=
                                                    s.ticket_ztime
                                        )

                                ) p

                                ORDER BY

                                    p.purchase_date DESC,

                                    p.purchase_invoice_id DESC,

                                    p.purchase_item_id DESC

                            ) latestPurchase;
                        `);


                log(
                    `[RESULT] Final rows=${result.recordset.length}`
                );
            }
        );


        log("");
        log(
            "============================================================"
        );

        log(
            "ALL STAGES COMPLETED"
        );

        log(
            "============================================================"
        );


    }
    catch (error) {

        console.error(
            "[DIAGNOSTIC FAILED]",
            error?.stack || error
        );

    }
    finally {

        await dropGlobalTempTables(
            pool
        );

        try {
            await closeAllConnections();
        }
        catch {}

        app.quit();
    }
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