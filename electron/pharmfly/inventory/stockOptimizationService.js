import Database from "better-sqlite3";
import { app } from "electron";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import path from "node:path";
import { addCalendarDays, getBusinessDateKey } from "../sales/businessDay.js";
import { isVerifiedSalesDayState } from "../sales/salesDayVerification.js";
import {
    classifyAbcFsn,
    evaluateStockAlternatives,
    STOCK_OPTIMIZATION_ENGINE_VERSION
} from "./stockOptimizationEngine.js";
import { getStockOptimizationAbcFsnPolicy } from "./stockOptimizationPolicyStore.js";

const require = createRequire(import.meta.url);
const APPROVED_LINKS = "('USER_CONFIRMED', 'USER_CREATED')";
const SALES_MONTH_COUNT = 3;

const BRANCHES = Object.freeze([
    { id: 1, name: "أسكوت" },
    { id: 2, name: "شارع 10" },
    { id: 3, name: "المنشية البحرية" },
    { id: 4, name: "سيدي بشر قبلي" },
    { id: 5, name: "أبو سليمان" }
]);

function cairoWallClock(now) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function shiftMonthStart(monthStart, amount) {
    const date = new Date(`${monthStart}T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    return date.toISOString().slice(0, 10);
}

function createThreeCompletedBusinessMonthWindow(now) {
    const currentBusinessDate = getBusinessDateKey(cairoWallClock(now));
    if (!currentBusinessDate) throw new Error("PHARMAFLY_BUSINESS_DATE_UNAVAILABLE");

    const currentBusinessMonth = `${currentBusinessDate.slice(0, 7)}-01`;
    const from = shiftMonthStart(currentBusinessMonth, -SALES_MONTH_COUNT);
    const toExclusive = currentBusinessMonth;
    const months = [];
    for (let offset = -SALES_MONTH_COUNT; offset < 0; offset += 1) {
        months.push(shiftMonthStart(currentBusinessMonth, offset).slice(0, 7));
    }

    const days = [];
    for (let date = from; date < toExclusive; date = addCalendarDays(date, 1)) {
        days.push(date);
    }

    const verificationDays = [...days, toExclusive];
    return {
        approved: true,
        dayBoundaryApproved: true,
        timeZone: "Africa/Cairo with PharmaFly 03:00 business-day boundary",
        from,
        toExclusive,
        fromTimestamp: `${from}T03:00:00.000Z`,
        toExclusiveTimestamp: `${toExclusive}T03:00:00.000Z`,
        verificationFrom: from,
        verificationToExclusive: addCalendarDays(toExclusive, 1),
        days,
        verificationDays,
        months
    };
}

function parseAgeHours(value, now) {
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return null;
    return (now.getTime() - time) / 3600000;
}

function finiteValueOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function isMeaningfulSourceTimestamp(value) {
    const time = Date.parse(String(value ?? ""));
    return Number.isFinite(time) && time > Date.parse("1900-01-01T00:00:00.000Z");
}

function hasAllColumns(db, table, required) {
    const names = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name));
    return required.every(name => names.has(name));
}

function tableNames(db) {
    return new Set(db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
    `).all().map(row => row.name));
}

function runReadonlySalesAggregate(databasePath, dates, window) {
    if (!dates.length) return Promise.resolve([]);

    const values = dates.map(() => "(?, ?)").join(",");
    const params = [
        ...dates.flatMap(row => [row.branchId, row.salesDate]),
        window.fromTimestamp,
        window.toExclusiveTimestamp
    ];
    const sql = `
        WITH verified_days(branch_id, sales_date) AS (VALUES ${values}),
        sales_window(from_timestamp, to_exclusive_timestamp) AS (VALUES (?, ?)),
        approved_map AS (
            SELECT
                MIN(m.master_item_id) AS master_item_id,
                m.branch_id,
                TRIM(CAST(m.branch_item_id AS TEXT)) AS item_id,
                MAX(CASE WHEN json_valid(i.payload_json)
                    THEN CAST(json_extract(i.payload_json, '$.Parts') AS REAL)
                    ELSE NULL END) AS current_parts
            FROM master_item_branch_map m
            LEFT JOIN unified_local_items i
                ON i.branch_id = m.branch_id
               AND TRIM(CAST(i.source_id AS TEXT)) = TRIM(CAST(m.branch_item_id AS TEXT))
            WHERE m.match_status IN ${APPROVED_LINKS}
              AND m.branch_id BETWEEN 1 AND 5
            GROUP BY m.branch_id, TRIM(CAST(m.branch_item_id AS TEXT))
            HAVING COUNT(DISTINCT m.master_item_id) = 1
        ),
        sales_rows AS (
            SELECT
                m.master_item_id,
                h.*,
                CASE WHEN m.current_parts > 0
                    THEN (COALESCE(h.packs, 0) * m.current_parts) + COALESCE(h.units, 0)
                    ELSE NULL END AS current_base_units
            FROM verified_days d
            INNER JOIN sales_history h
                ON h.branch_id = d.branch_id
               AND h.date >= d.sales_date || 'T00:00:00.000Z'
               AND h.date < date(d.sales_date, '+1 day') || 'T00:00:00.000Z'
            INNER JOIN sales_window w
                ON h.date >= w.from_timestamp
               AND h.date < w.to_exclusive_timestamp
            INNER JOIN approved_map m
                ON m.branch_id = h.branch_id
               AND m.item_id = TRIM(CAST(h.item_id AS TEXT))
        )
        SELECT
            h.master_item_id AS master_item_id,
            h.branch_id AS branch_id,
            strftime('%Y-%m', h.date, '-3 hours') AS business_month,
            SUM(CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'RETURN'
                  OR COALESCE(h.sales_return, 0) = 2
                THEN -ABS(COALESCE(h.current_base_units, 0))
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
                  AND COALESCE(h.current_base_units, 0) > 0
                THEN ABS(h.current_base_units)
                ELSE 0 END
            ) AS net_sales_base_units,
            SUM(CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
                 AND COALESCE(h.sales_return, 0) <> 2
                THEN COALESCE(h.net_line_value, 0) ELSE 0 END
            ) AS sale_value,
            COUNT(DISTINCT CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
                 AND (COALESCE(h.packs, 0) > 0 OR COALESCE(h.units, 0) > 0)
                 AND COALESCE(h.sales_return, 0) <> 2
                THEN date(h.date, '-3 hours') END
            ) AS selling_days,
            GROUP_CONCAT(DISTINCT CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
                 AND (COALESCE(h.packs, 0) > 0 OR COALESCE(h.units, 0) > 0)
                 AND COALESCE(h.sales_return, 0) <> 2
                THEN date(h.date, '-3 hours') END
            ) AS selling_day_keys,
            MAX(CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
                 AND (COALESCE(h.packs, 0) > 0 OR COALESCE(h.units, 0) > 0)
                 AND COALESCE(h.sales_return, 0) <> 2
                THEN date(h.date, '-3 hours') END
            ) AS last_sale_date,
            SUM(CASE
                WHEN UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'RETURN'
                  OR COALESCE(h.sales_return, 0) = 2
                THEN 1 ELSE 0 END
            ) AS return_lines
        FROM sales_rows h
        GROUP BY h.master_item_id, h.branch_id, business_month
    `;

    const workerCode = [
        'const { parentPort, workerData } = require("node:worker_threads");',
        'let db;',
        'try {',
        '  const Database = require(workerData.databaseModule);',
        '  db = new Database(workerData.databasePath, { readonly: true, fileMustExist: true, timeout: 1500 });',
        '  db.pragma("query_only = ON");',
        '  db.exec("BEGIN");',
        '  const rows = db.prepare(workerData.sql).all(workerData.params);',
        '  db.exec("ROLLBACK");',
        '  parentPort.postMessage({ ok: true, rows });',
        '} catch (error) {',
        '  try { if (db && db.inTransaction) db.exec("ROLLBACK"); } catch {}',
        '  parentPort.postMessage({ ok: false, error: String(error?.message || error) });',
        '} finally {',
        '  if (db) { try { db.close(); } catch {} }',
        '}'
    ].join("\n");

    return new Promise((resolve, reject) => {
        let settled = false;
        const worker = new Worker(workerCode, {
            eval: true,
            workerData: {
                databasePath,
                databaseModule: require.resolve("better-sqlite3"),
                sql,
                params
            }
        });

        worker.once("message", result => {
            settled = true;
            if (result?.ok) resolve(result.rows || []);
            else reject(new Error(result?.error || "SHADOW_SALES_QUERY_FAILED"));
        });
        worker.once("error", error => {
            if (settled) return;
            settled = true;
            reject(error);
        });
        worker.once("exit", code => {
            if (settled) return;
            settled = true;
            reject(new Error(`SHADOW_SALES_WORKER_EXIT_${code}`));
        });
    });
}

function addBlocker(list, code) {
    if (!list.includes(code)) list.push(code);
}

function emptyResult(now, warnings = []) {
    return {
        success: true,
        mode: "SHADOW_ONLY",
        executionAllowed: false,
        engineVersion: STOCK_OPTIMIZATION_ENGINE_VERSION,
        asOf: now.toISOString(),
        salesWindow: null,
        coverageDays: null,
        decisionReady: false,
        policyStatus: "COVERAGE_DAYS_REQUIRED",
        branchStatus: BRANCHES.map(branch => ({
            ...branch,
            inventoryStatus: "UNAVAILABLE",
            salesStatus: "UNAVAILABLE",
            inventoryFresh: false,
            salesWindowVerified: false,
            verifiedSalesDays: null,
            expectedSalesDays: null,
            blockers: ["LOCAL_SOURCE_UNAVAILABLE"]
        })),
        summary: {
            mappedMasterCount: 0,
            blockedMasterCount: 0,
            readyMasterCount: 0,
            transferAlternatives: 0,
            purchaseAlternatives: 0,
            baselineOnlyCount: 0,
            excludedUnmappedMasterCount: 0,
            salesWindowDays: null
        },
        blockerCounts: {},
        items: [],
        itemsTruncated: false,
        transfers: [],
        warnings
    };
}

export async function getStockOptimizationShadowReport(options = {}) {
    const now = new Date();
    const dates = createThreeCompletedBusinessMonthWindow(now);
    const rawCoverageDays = options?.coverageDays;
    const coverageDays = rawCoverageDays !== null && rawCoverageDays !== undefined &&
        String(rawCoverageDays).trim() !== "" && Number.isFinite(Number(rawCoverageDays)) && Number(rawCoverageDays) > 0
        ? Number(rawCoverageDays)
        : null;
    let abcFsnPolicy = null;
    let abcFsnPolicyError = null;

    try {
        const policyResult = getStockOptimizationAbcFsnPolicy();
        abcFsnPolicy = policyResult.policy;
    } catch (error) {
        abcFsnPolicyError = String(error?.message || error).slice(0, 200);
    }
    const databasePath = path.join(app.getPath("userData"), "pharmabi-local.db");
    let db;

    try {
        db = new Database(databasePath, {
            readonly: true,
            fileMustExist: true,
            timeout: 1500
        });
        db.pragma("query_only = ON");
        db.exec("BEGIN");

        const tables = tableNames(db);
        const requiredTables = [
            "unified_local_inventory",
            "unified_local_inventory_sync_state",
            "unified_local_sync_meta",
            "unified_local_items",
            "master_item_branch_map",
            "master_items",
            "sales_history",
            "sales_sync_state"
        ];
        const missingTables = requiredTables.filter(table => !tables.has(table));
        if (missingTables.length) {
            db.exec("ROLLBACK");
            db.close();
            db = null;
            return emptyResult(now, [
                "بيانات التشغيل المحلية غير مكتملة؛ لم تُنشأ أي توصيات.",
                `جداول مطلوبة غير موجودة: ${missingTables.join(", ")}`
            ]);
        }

        const inventoryStateColumns = new Set(
            db.prepare("PRAGMA table_info(unified_local_inventory_sync_state)").all().map(row => row.name)
        );
        const hasStoreScopeColumn = inventoryStateColumns.has("store_scope_id");
        const storeScopeSelection = hasStoreScopeColumn
            ? "store_scope_id"
            : "NULL AS store_scope_id";
        const inventoryStates = db.prepare(`
            SELECT branch_id, status, ${storeScopeSelection}, source_rows, local_rows,
                   last_sync_finished_at, error_message, updated_at
            FROM unified_local_inventory_sync_state
            WHERE branch_id BETWEEN 1 AND 5
        `).all();
        const inventoryByBranch = new Map(inventoryStates.map(row => [Number(row.branch_id), row]));
        const itemStates = db.prepare(`
            SELECT branch_id, status, source_rows, local_rows, last_sync_finished_at, error_message
            FROM unified_local_sync_meta
            WHERE domain = 'items'
              AND branch_id BETWEEN 1 AND 5
        `).all();
        const itemByBranch = new Map(itemStates.map(row => [Number(row.branch_id), row]));
        const salesStates = db.prepare(`
            SELECT branch_id, last_sync_status, last_sync_finished_at,
                   newest_date, error_message
            FROM sales_sync_state
            WHERE branch_id BETWEEN 1 AND 5
        `).all();
        const salesByBranch = new Map(salesStates.map(row => [Number(row.branch_id), row]));
        let dayStateByKey = new Map();
        if (dates.approved && dates.verificationFrom && dates.verificationToExclusive) {
            const dayColumns = [
                "branch_id", "sales_date", "status", "verification_version",
                "source_rows", "source_invoice_count", "local_invoice_count",
                "source_fingerprint", "local_fingerprint", "checkpoint_at"
            ];
            if (!hasAllColumns(db, "sales_day_sync_state", dayColumns)) {
                throw new Error("SALES_DAY_VERIFICATION_SCHEMA_UNAVAILABLE");
            }
            const dayStates = db.prepare(`
                SELECT
                    s.branch_id,
                    s.sales_date,
                    s.status,
                    s.verification_version,
                    s.source_rows,
                    (
                        SELECT COUNT(*)
                        FROM sales_history sh
                        WHERE sh.branch_id = s.branch_id
                          AND sh.date >= s.sales_date || 'T00:00:00.000Z'
                          AND sh.date < date(s.sales_date, '+1 day') || 'T00:00:00.000Z'
                    ) AS local_rows,
                    s.source_invoice_count,
                    s.local_invoice_count AS verified_local_invoice_count,
                    (
                        SELECT COUNT(DISTINCT sh.ticket_id)
                        FROM sales_history sh
                        WHERE sh.branch_id = s.branch_id
                          AND sh.date >= s.sales_date || 'T00:00:00.000Z'
                          AND sh.date < date(s.sales_date, '+1 day') || 'T00:00:00.000Z'
                    ) AS local_invoice_count,
                    s.source_fingerprint,
                    s.local_fingerprint,
                    s.checkpoint_at
                FROM sales_day_sync_state s
                WHERE s.branch_id BETWEEN 1 AND 5
                  AND s.sales_date >= ?
                  AND s.sales_date < ?
            `).all(dates.verificationFrom, dates.verificationToExclusive);
            dayStateByKey = new Map(dayStates.map(row => [
                `${Number(row.branch_id)}|${row.sales_date}`,
                row
            ]));
        }

        const branchStatus = BRANCHES.map(branch => {
            const inventory = inventoryByBranch.get(branch.id);
            const items = itemByBranch.get(branch.id);
            const sales = salesByBranch.get(branch.id);
            const inventoryAgeHours = parseAgeHours(inventory?.last_sync_finished_at, now);
            const salesAgeHours = parseAgeHours(sales?.last_sync_finished_at, now);
            const inventoryRowsMatch =
                inventory?.source_rows != null &&
                inventory?.local_rows != null &&
                Number(inventory.source_rows) === Number(inventory.local_rows);
            const inventorySyncComplete =
                inventory?.status === "LOCAL_SYNCED" &&
                !inventory?.error_message &&
                inventoryRowsMatch &&
                inventoryAgeHours !== null &&
                inventoryAgeHours >= 0;
            const inventoryFresh = inventorySyncComplete;
            const latestLocalPartsVerified =
                items?.status === "LOCAL_SYNCED" &&
                !items?.error_message &&
                items?.source_rows != null &&
                items?.local_rows != null &&
                Number(items.source_rows) === Number(items.local_rows);
            const salesSyncComplete =
                String(sales?.last_sync_status || "").toUpperCase() === "READY" &&
                !sales?.error_message &&
                salesAgeHours !== null &&
                salesAgeHours >= 0;
            let verifiedSalesDays = 0;
            let missingSalesDays = 0;
            let unverifiedSalesDays = 0;

            for (const salesDate of dates.verificationDays) {
                const state = dayStateByKey.get(`${branch.id}|${salesDate}`);
                if (!state) missingSalesDays += 1;
                else if (isVerifiedSalesDayState(state)) verifiedSalesDays += 1;
                else unverifiedSalesDays += 1;
            }

            const salesWindowVerified =
                salesSyncComplete &&
                dates.approved &&
                dates.dayBoundaryApproved &&
                Boolean(dates.timeZone) &&
                dates.days.length > 0 &&
                verifiedSalesDays === dates.verificationDays.length &&
                missingSalesDays === 0 &&
                unverifiedSalesDays === 0;
            const blockers = [];
            if (!inventorySyncComplete) addBlocker(blockers, "STALE_OR_INCOMPLETE_INVENTORY_SNAPSHOT");
            if (!salesSyncComplete) addBlocker(blockers, "SALES_SYNC_NOT_READY");
            if (!dates.approved) addBlocker(blockers, "SALES_WINDOW_POLICY_NOT_CONFIGURED");
            if (!dates.dayBoundaryApproved) addBlocker(blockers, "SALES_DAY_BOUNDARY_NOT_VERIFIED");
            if (dates.approved && missingSalesDays) addBlocker(blockers, "MISSING_VERIFIED_SALES_DAYS");
            if (dates.approved && unverifiedSalesDays) addBlocker(blockers, "UNVERIFIED_SALES_DAYS");

            return {
                ...branch,
                inventoryStatus: inventory?.status || "NOT_SYNCED",
                salesStatus: String(sales?.last_sync_status || "NOT_SYNCED").toUpperCase(),
                inventoryFresh,
                inventorySyncComplete,
                latestLocalPartsVerified,
                itemDataLastFinishedAt: items?.last_sync_finished_at || null,
                inventoryAgeHours: inventoryAgeHours === null ? null : Math.round(inventoryAgeHours * 10) / 10,
                inventoryRowsMatch,
                mainStoreId: inventory?.store_scope_id || null,
                storeScopeVerified: Number.isInteger(Number(inventory?.store_scope_id)) && Number(inventory.store_scope_id) > 0,
                sourceRows: Number(inventory?.source_rows) || 0,
                localRows: Number(inventory?.local_rows) || 0,
                inventoryLastFinishedAt: inventory?.last_sync_finished_at || null,
                salesLastFinishedAt: sales?.last_sync_finished_at || null,
                salesSyncComplete,
                salesWindowVerified,
                verifiedSalesDays,
                expectedSalesDays: dates.verificationDays.length,
                missingSalesDays,
                unverifiedSalesDays,
                blockers
            };
        });
        const branchStatusById = new Map(branchStatus.map(branch => [branch.id, branch]));

        const inventoryColumns = new Set(
            db.prepare("PRAGMA table_info(unified_local_inventory)").all().map(row => row.name)
        );
        const provenanceColumnsPresent =
            inventoryColumns.has("source_type") &&
            inventoryColumns.has("source_record_id") &&
            inventoryColumns.has("source_updated_at");
        const partsProvenancePresent = inventoryColumns.has("parts_source_updated_at");
        const sourceTypeSelection = inventoryColumns.has("source_type")
            ? "i.source_type AS source_type"
            : "NULL AS source_type";
        const sourceRecordSelection = inventoryColumns.has("source_record_id")
            ? "i.source_record_id AS source_record_id"
            : "NULL AS source_record_id";
        const partsSourceUpdatedAtSelection = partsProvenancePresent
            ? "i.parts_source_updated_at AS parts_source_updated_at"
            : "NULL AS parts_source_updated_at";
        const inventorySyncComplete = branchStatus.every(branch => branch.inventorySyncComplete);
        const inventorySnapshotReady = branchStatus.every(branch => branch.inventoryFresh);
        const verifiedSalesWindow = branchStatus.every(branch => branch.salesWindowVerified);
        const verifiedSalesBranches = branchStatus.filter(branch => branch.salesWindowVerified);

        const mappings = db.prepare(`
            SELECT
                m.master_item_id,
                mi.canonical_name,
                mi.unified_code,
                m.branch_id,
                TRIM(CAST(m.branch_item_id AS TEXT)) AS item_id,
                m.parts AS mapped_parts,
                m.match_status,
                i.store_id,
                i.source_itemcard_id,
                ${sourceTypeSelection},
                ${sourceRecordSelection},
                i.store_new_packs,
                i.store_new_units,
                i.parts AS snapshot_parts,
                ${partsSourceUpdatedAtSelection},
                i.on_hand_base_units,
                i.source_updated_at,
                i.synced_at,
                CASE WHEN json_valid(u.payload_json)
                    THEN CAST(json_extract(u.payload_json, '$.Parts') AS REAL)
                    ELSE NULL END AS source_parts,
                u.source_updated_at AS items_updated_at
            FROM master_item_branch_map m
            INNER JOIN master_items mi ON mi.id = m.master_item_id
            LEFT JOIN unified_local_inventory_sync_state scope
                ON scope.branch_id = m.branch_id
            LEFT JOIN unified_local_inventory i
                ON i.branch_id = m.branch_id
               AND TRIM(CAST(i.item_id AS TEXT)) = TRIM(CAST(m.branch_item_id AS TEXT))
               AND ${hasStoreScopeColumn
                    ? "TRIM(CAST(i.store_id AS TEXT)) = TRIM(CAST(scope.store_scope_id AS TEXT))"
                    : "0"}
            LEFT JOIN unified_local_items u
                ON u.branch_id = m.branch_id
               AND TRIM(CAST(u.source_id AS TEXT)) = TRIM(CAST(m.branch_item_id AS TEXT))
            WHERE m.branch_id BETWEEN 1 AND 5
              AND m.match_status IN ${APPROVED_LINKS}
              AND UPPER(COALESCE(mi.status, 'ACTIVE')) = 'ACTIVE'
            ORDER BY m.master_item_id, m.branch_id, m.branch_item_id, i.store_id
        `).all();
        const sourceProvenanceVerified = provenanceColumnsPresent && mappings
            .filter(row => row.store_id !== null && row.store_id !== undefined)
            .every(row => Boolean(row.source_type) && Boolean(row.source_record_id) && Boolean(row.source_updated_at));
        const scopedInventoryRows = mappings.filter(row => row.store_id !== null && row.store_id !== undefined);
        const unitBasisVerified = partsProvenancePresent && scopedInventoryRows.length > 0 &&
            scopedInventoryRows.every(row =>
                finiteValueOrNull(row.snapshot_parts) > 0 &&
                finiteValueOrNull(row.source_parts) > 0 &&
                finiteValueOrNull(row.snapshot_parts) === finiteValueOrNull(row.source_parts) &&
                Boolean(row.parts_source_updated_at) &&
                row.parts_source_updated_at === row.items_updated_at
            );
        const availableStockVerified = scopedInventoryRows.length > 0 &&
            scopedInventoryRows.every(row =>
                finiteValueOrNull(row.on_hand_base_units) !== null &&
                finiteValueOrNull(row.snapshot_parts) > 0
            );

        const localItemMasters = new Map();
        for (const row of mappings) {
            const key = `${Number(row.branch_id)}|${String(row.item_id || "")}`;
            if (!localItemMasters.has(key)) localItemMasters.set(key, new Set());
            localItemMasters.get(key).add(Number(row.master_item_id));
        }

        const grouped = new Map();
        const activeMasters = Number(db.prepare(`
            SELECT COUNT(*) AS count
            FROM master_items
            WHERE UPPER(COALESCE(status, 'ACTIVE')) = 'ACTIVE'
        `).get()?.count) || 0;

        for (const row of mappings) {
            const masterId = Number(row.master_item_id);
            if (!Number.isInteger(masterId)) continue;
            if (!grouped.has(masterId)) {
                grouped.set(masterId, {
                    masterItemId: masterId,
                    unifiedCode: row.unified_code || "",
                    itemName: row.canonical_name || "",
                    byBranch: new Map(),
                    seenRows: new Set(),
                    parts: new Set(),
                    sourceParts: new Set(),
                    unitBases: new Set(),
                    hasPartsGap: false,
                    hasPartsMismatch: false,
                    hasAmbiguousMapping: false,
                    negativeRows: 0,
                    missingInventoryItems: 0,
                    salesMetrics: new Map(),
                    sourceProvenanceVerified: provenanceColumnsPresent
                });
            }

            const master = grouped.get(masterId);
            const branchId = Number(row.branch_id);
            const itemId = String(row.item_id || "");
            const localItemMasterSet = localItemMasters.get(`${branchId}|${itemId}`);
            if (localItemMasterSet?.size > 1) master.hasAmbiguousMapping = true;
            if (!master.byBranch.has(branchId)) master.byBranch.set(branchId, new Map());
            const itemMap = master.byBranch.get(branchId);

            if (!itemMap.has(itemId)) {
                itemMap.set(itemId, {
                    itemId,
                    mappingStatus: row.match_status,
                    mappedParts: finiteValueOrNull(row.mapped_parts),
                    ambiguousMapping: Boolean(localItemMasterSet && localItemMasterSet.size > 1),
                    rows: []
                });
            }
            const localItem = itemMap.get(itemId);
            const rowKey = `${branchId}|${itemId}|${row.store_id ?? "__NO_ROW__"}`;
            if (master.seenRows.has(rowKey)) continue;
            master.seenRows.add(rowKey);

            if (row.store_id === null || row.store_id === undefined) {
                master.missingInventoryItems += 1;
                master.sourceProvenanceVerified = false;
                continue;
            }

            const snapshotParts = finiteValueOrNull(row.snapshot_parts);
            const sourceParts = finiteValueOrNull(row.source_parts);
            if (!Number.isFinite(snapshotParts) || snapshotParts <= 0 ||
                !Number.isFinite(sourceParts) || sourceParts <= 0 ||
                !isMeaningfulSourceTimestamp(row.parts_source_updated_at) ||
                !isMeaningfulSourceTimestamp(row.items_updated_at)) {
                master.hasPartsGap = true;
            } else {
                master.parts.add(snapshotParts);
                master.sourceParts.add(sourceParts);
                if (snapshotParts !== sourceParts || row.parts_source_updated_at !== row.items_updated_at) {
                    master.hasPartsMismatch = true;
                }
            }

            const rawOnHand = finiteValueOrNull(row.on_hand_base_units);
            const onHand = snapshotParts > 0 && sourceParts > 0 &&
                isMeaningfulSourceTimestamp(row.parts_source_updated_at) &&
                isMeaningfulSourceTimestamp(row.items_updated_at)
                ? rawOnHand
                : null;
            if (Number.isFinite(onHand) && onHand < 0) master.negativeRows += 1;
            master.sourceProvenanceVerified = master.sourceProvenanceVerified &&
                Boolean(row.source_type) && Boolean(row.source_record_id) && Boolean(row.source_updated_at);
            localItem.rows.push({
                itemId,
                storeId: String(row.store_id),
                packs: finiteValueOrNull(row.store_new_packs),
                units: finiteValueOrNull(row.store_new_units),
                snapshotOnHandRaw: Number.isFinite(onHand) ? onHand : null,
                parts: Number.isFinite(snapshotParts) ? snapshotParts : null,
                partsSourceUpdatedAt: row.parts_source_updated_at || null,
                sourceType: row.source_type || null,
                sourceRecordId: row.source_record_id || null,
                sourceUpdatedAt: row.source_updated_at || null,
                syncedAt: row.synced_at || null,
                sourceProvenanceVerified: provenanceColumnsPresent &&
                    Boolean(row.source_type) && Boolean(row.source_record_id) && Boolean(row.source_updated_at)
            });
        }

        let salesMetricsByKey = new Map();
        let salesAggregateSucceeded = false;
        let salesDetailStatus = "BLOCKED_BY_INCOMPLETE_VERIFIED_WINDOW";
        const verifiedDayRows = [];
        if (verifiedSalesBranches.length && dates?.days?.length) {
            for (const branch of verifiedSalesBranches) {
                for (const salesDate of dates.verificationDays) {
                    verifiedDayRows.push({ branchId: branch.id, salesDate });
                }
            }
            try {
                const rows = await runReadonlySalesAggregate(databasePath, verifiedDayRows, dates);
                for (const row of rows) {
                    const key = `${Number(row.master_item_id)}|${Number(row.branch_id)}`;
                    if (!salesMetricsByKey.has(key)) {
                        salesMetricsByKey.set(key, {
                            monthlySalesUnitsByMonth: Object.fromEntries(dates.months.map(month => [month, 0])),
                            monthlySalesValueByMonth: Object.fromEntries(dates.months.map(month => [month, 0])),
                            verifiedSalesUnits: 0,
                            verifiedSalesValue: 0,
                            verifiedSellingDays: 0,
                            sellingDayKeys: new Set(),
                            lastSaleDate: null,
                            returnLines: 0
                        });
                    }
                    const metrics = salesMetricsByKey.get(key);
                    const month = String(row.business_month || "");
                    const monthUnits = Number(row.net_sales_base_units) || 0;
                    const monthValue = Number(row.sale_value) || 0;
                    if (Object.hasOwn(metrics.monthlySalesUnitsByMonth, month)) {
                        metrics.monthlySalesUnitsByMonth[month] += monthUnits;
                        metrics.monthlySalesValueByMonth[month] += monthValue;
                    }
                    metrics.verifiedSalesUnits += monthUnits;
                    metrics.verifiedSalesValue += monthValue;
                    metrics.verifiedSellingDays += Number(row.selling_days) || 0;
                    for (const salesDay of String(row.selling_day_keys || "").split(",")) {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(salesDay)) {
                            metrics.sellingDayKeys.add(salesDay);
                        }
                    }
                    if (row.last_sale_date && (!metrics.lastSaleDate || row.last_sale_date > metrics.lastSaleDate)) {
                        metrics.lastSaleDate = row.last_sale_date;
                    }
                    metrics.returnLines += Number(row.return_lines) || 0;
                }
                salesAggregateSucceeded = true;
                salesDetailStatus = "VERIFIED_THREE_COMPLETED_BUSINESS_MONTHS";
            } catch {
                salesDetailStatus = "SALES_DETAIL_QUERY_BLOCKED";
            }
        }

        const readiness = {
            branchSnapshotsFresh: inventorySnapshotReady,
            verifiedSalesWindow,
            salesDayBoundaryVerified: dates.dayBoundaryApproved,
            inventorySourceVerified: sourceProvenanceVerified,
            unitBasisVerified,
            availableStockVerified,
            storeScopeVerified: branchStatus.every(branch => branch.storeScopeVerified),
            servicePolicyVerified: coverageDays !== null
        };
        const policy = coverageDays === null
            ? null
            : { coverageDaysByBranch: Object.fromEntries(BRANCHES.map(branch => [branch.id, coverageDays])) };
        const items = [];
        const blockerCounts = {};
        let transferAlternatives = 0;
        let purchaseAlternatives = 0;
        let readyMasterCount = 0;

        for (const master of grouped.values()) {
            const blockers = [];
            const mappedBranchStatuses = [...master.byBranch.keys()]
                .map(branchId => branchStatusById.get(branchId))
                .filter(Boolean);
            const itemInventorySyncComplete = mappedBranchStatuses.length > 0 &&
                mappedBranchStatuses.every(branch => branch.inventorySyncComplete);
            const itemInventorySnapshotReady = mappedBranchStatuses.length > 0 &&
                mappedBranchStatuses.every(branch => branch.inventoryFresh);
            const itemVerifiedSalesWindow = mappedBranchStatuses.length > 0 &&
                mappedBranchStatuses.every(branch => branch.salesWindowVerified);
            const itemInventoryRows = [...master.byBranch.values()]
                .flatMap(localItems => [...localItems.values()])
                .flatMap(localItem => localItem.rows);
            const itemHasMissingInventoryRows = [...master.byBranch.values()]
                .some(localItems => [...localItems.values()].some(localItem => localItem.rows.length === 0));
            const itemAvailableStockVerified =
                !itemHasMissingInventoryRows && itemInventoryRows.length > 0 &&
                itemInventoryRows.every(row => Number.isFinite(row.snapshotOnHandRaw));
            const itemPartsSyncVerified = mappedBranchStatuses.length > 0 &&
                mappedBranchStatuses.every(branch => branch.latestLocalPartsVerified);
            const itemUnitBasisVerified = !master.hasPartsGap && !master.hasPartsMismatch && itemPartsSyncVerified;
            for (const branch of BRANCHES) {
                const localItems = master.byBranch.get(branch.id);
                if (!localItems?.size) continue;
                for (const localItem of localItems.values()) {
                    if (!localItem.rows.length) addBlocker(blockers, "MISSING_INVENTORY_ROW");
                }
            }
            if (master.hasPartsGap) addBlocker(blockers, "PARTS_ORIGIN_UNVERIFIED");
            if (!itemPartsSyncVerified) addBlocker(blockers, "LATEST_LOCAL_PARTS_NOT_VERIFIED");
            if (master.hasAmbiguousMapping) addBlocker(blockers, "AMBIGUOUS_APPROVED_ITEM_MAPPING");
            if (master.hasPartsMismatch) {
                addBlocker(blockers, "PARTS_MISMATCH");
            }
            if (master.negativeRows) addBlocker(blockers, "NEGATIVE_BALANCE");
            if (!master.sourceProvenanceVerified) addBlocker(blockers, "INVENTORY_SOURCE_NOT_TRACEABLE");
            if (!itemUnitBasisVerified) addBlocker(blockers, "BASE_UNIT_NOT_VERIFIED");
            if (!itemAvailableStockVerified) addBlocker(blockers, "STOCK_BALANCE_NOT_VERIFIED");
            const itemStoreScopeVerified = mappedBranchStatuses.length > 0 &&
                mappedBranchStatuses.every(branch => branch.storeScopeVerified);
            if (!itemStoreScopeVerified) addBlocker(blockers, "STORE_SCOPE_NOT_VERIFIED");
            if (!itemInventorySyncComplete) addBlocker(blockers, "STALE_OR_INCOMPLETE_INVENTORY_SNAPSHOT");
            if (!itemVerifiedSalesWindow) addBlocker(blockers, "SALES_WINDOW_NOT_FULLY_VERIFIED");
            if (itemVerifiedSalesWindow && !salesAggregateSucceeded) addBlocker(blockers, "SALES_DETAIL_QUERY_BLOCKED");
            if (!readiness.servicePolicyVerified) addBlocker(blockers, "COVERAGE_DAYS_REQUIRED");

            const itemQuantityComparisonVerified = itemInventorySnapshotReady &&
                itemVerifiedSalesWindow &&
                master.sourceProvenanceVerified &&
                itemUnitBasisVerified &&
                itemAvailableStockVerified &&
                itemStoreScopeVerified &&
                coverageDays !== null &&
                !master.hasAmbiguousMapping;

            const branchBalances = BRANCHES.map(branch => {
                const localItems = master.byBranch.get(branch.id) || new Map();
                const rows = [...localItems.values()].flatMap(item => item.rows);
                const metrics = salesMetricsByKey.get(`${master.masterItemId}|${branch.id}`) || {};
                const salesMetricsVerified = localItems.size > 0 &&
                    !master.hasAmbiguousMapping &&
                    branchStatusById.get(branch.id)?.salesWindowVerified &&
                    salesAggregateSucceeded;
                const monthlySalesUnitsByMonth = salesMetricsVerified
                    ? (metrics.monthlySalesUnitsByMonth || Object.fromEntries(dates.months.map(month => [month, 0])))
                    : null;
                const monthlySalesValueByMonth = salesMetricsVerified
                    ? (metrics.monthlySalesValueByMonth || Object.fromEntries(dates.months.map(month => [month, 0])))
                    : null;
                const verifiedSalesUnits = salesMetricsVerified ? Number(metrics.verifiedSalesUnits) || 0 : null;
                const averageMonthlySalesUnits = verifiedSalesUnits === null
                    ? null
                    : verifiedSalesUnits / dates.months.length;
                const averageDailyDemandUnits = verifiedSalesUnits === null || !dates.days.length
                    ? null
                    : Math.max(0, verifiedSalesUnits) / dates.days.length;
                const targetStockUnits = salesMetricsVerified && coverageDays !== null
                    ? averageDailyDemandUnits * coverageDays
                    : null;
                const availableStockUnits = rows.length > 0 && rows.every(row => Number.isFinite(row.snapshotOnHandRaw))
                    ? rows.reduce((sum, row) => sum + row.snapshotOnHandRaw, 0)
                    : null;
                const quantityComparisonVerified = itemQuantityComparisonVerified &&
                    localItems.size > 0 && salesMetricsVerified &&
                    Number.isFinite(availableStockUnits) && Number.isFinite(targetStockUnits);
                const parts = rows.map(row => row.parts).filter(value => Number.isFinite(value) && value > 0);
                const hasMissingInventoryRow = [...localItems.values()].some(item => item.rows.length === 0);
                const onHandKnown = rows.length > 0 && !hasMissingInventoryRow &&
                    rows.every(row => Number.isFinite(row.snapshotOnHandRaw));
                const branchBlockers = [];
                if ([...localItems.values()].some(item => item.ambiguousMapping)) {
                    addBlocker(branchBlockers, "AMBIGUOUS_APPROVED_ITEM_MAPPING");
                }
                if ([...localItems.values()].some(item => item.rows.length === 0)) addBlocker(branchBlockers, "MISSING_INVENTORY_ROW");
                if (rows.some(row => Number(row.snapshotOnHandRaw) < 0)) addBlocker(branchBlockers, "NEGATIVE_BALANCE");

                return {
                    branchId: branch.id,
                    mappingVerified: localItems.size > 0,
                    mappingStatus: localItems.size > 0 ? "APPROVED_MAPPING" : "NO_APPROVED_MAPPING",
                    salesWindowVerified: Boolean(branchStatusById.get(branch.id)?.salesWindowVerified && salesAggregateSucceeded),
                    salesClassificationVerified: Boolean(salesMetricsVerified),
                    verifiedSalesDays: branchStatusById.get(branch.id)?.verifiedSalesDays ?? null,
                    expectedSalesDays: branchStatusById.get(branch.id)?.expectedSalesDays ?? null,
                    salesStatus: branchStatusById.get(branch.id)?.salesStatus || "UNAVAILABLE",
                    mainStoreId: branchStatusById.get(branch.id)?.mainStoreId || null,
                    latestLocalPartsVerified: Boolean(branchStatusById.get(branch.id)?.latestLocalPartsVerified),
                    itemDataLastFinishedAt: branchStatusById.get(branch.id)?.itemDataLastFinishedAt || null,
                    localItemIds: [...localItems.keys()],
                    storeCount: new Set(rows.map(row => row.storeId)).size,
                    snapshotOnHandRaw: onHandKnown
                        ? rows.reduce((sum, row) => sum + row.snapshotOnHandRaw, 0)
                        : null,
                    availableStockUnits,
                    monthlySalesUnitsByMonth,
                    monthlySalesValueByMonth,
                    verifiedSalesUnits,
                    averageMonthlySalesUnits,
                    averageDailyDemandUnits,
                    coverageDays: salesMetricsVerified ? coverageDays : null,
                    targetStockUnits,
                    salesQuantityBasis: salesMetricsVerified
                        ? "sales_history.packs*latest_local_Items.Parts+units"
                        : null,
                    quantityComparisonStatus: !localItems.size ? "NOT_MAPPED" :
                        quantityComparisonVerified ? "VERIFIED" : "BLOCKED",
                    potentialSurplusUnits: quantityComparisonVerified
                        ? Math.max(0, availableStockUnits - targetStockUnits)
                        : null,
                    potentialDeficitUnits: quantityComparisonVerified
                        ? Math.max(0, targetStockUnits - availableStockUnits)
                        : null,
                    verifiedSalesValue: salesMetricsVerified
                        ? Number(metrics.verifiedSalesValue) || 0
                        : null,
                    verifiedSellingDays: salesMetricsVerified
                        ? Number(metrics.verifiedSellingDays) || 0
                        : null,
                    lastSaleDate: salesMetricsVerified
                        ? metrics.lastSaleDate || null
                        : null,
                    returnLines: salesMetricsVerified
                        ? Number(metrics.returnLines) || 0
                        : null,
                    confirmedIncomingUnits: null,
                    parts: parts.length === 1 ? parts[0] : null,
                    partsValues: [...new Set(parts)].sort((a, b) => a - b),
                    sourceRows: rows.map(row => ({
                        itemId: row.itemId,
                        storeId: row.storeId,
                        packs: row.packs,
                        units: row.units,
                        parts: row.parts,
                        onHandBaseUnits: row.snapshotOnHandRaw,
                        sourceType: row.sourceType,
                        sourceRecordId: row.sourceRecordId,
                        sourceUpdatedAt: row.sourceUpdatedAt,
                        partsSourceUpdatedAt: row.partsSourceUpdatedAt
                    })),
                    blockers: branchBlockers
                };
            });

            const itemReadiness = {
                ...readiness,
                branchSnapshotsFresh: itemInventorySnapshotReady,
                verifiedSalesWindow: itemVerifiedSalesWindow,
                inventorySourceVerified: master.sourceProvenanceVerified,
                unitBasisVerified: itemUnitBasisVerified,
                availableStockVerified:
                    branchBalances.filter(branch => branch.mappingVerified)
                        .every(branch => Number.isFinite(branch.availableStockUnits)),
                storeScopeVerified: itemStoreScopeVerified
            };
            const plan = evaluateStockAlternatives({
                masterItemId: master.masterItemId,
                branchBalances,
                readiness: itemReadiness,
                policy,
                transferRoutes: []
            });
            const itemBlockers = [...new Set([...blockers, ...plan.blockers])];
            for (const reason of itemBlockers) {
                blockerCounts[reason] = (blockerCounts[reason] || 0) + 1;
            }
            if (plan.status === "READY") readyMasterCount += 1;
            if (plan.alternatives.some(row => row.action === "TRANSFER" && row.status === "AVAILABLE_IN_SHADOW_MODE")) transferAlternatives += 1;
            if (plan.alternatives.some(row => row.action === "PURCHASE" && row.status === "AVAILABLE_IN_SHADOW_MODE")) purchaseAlternatives += 1;

            items.push({
                masterItemId: master.masterItemId,
                unifiedCode: master.unifiedCode,
                itemName: master.itemName,
                mappedBranchCount: master.byBranch.size,
                localItemCount: [...master.byBranch.values()].reduce((sum, rows) => sum + rows.size, 0),
                negativeRows: master.negativeRows,
                missingInventoryItems: master.missingInventoryItems,
                partsValues: [...master.parts].sort((a, b) => a - b),
                decisionStatus: plan.status,
                recommendation: plan.recommendation,
                blockers: itemBlockers,
                alternatives: plan.alternatives,
                executionAllowed: false,
                branches: branchBalances
            });
        }

        const activeMappedMasterCount = grouped.size;
        const globalWarnings = [
            "Shadow Mode فقط: لا ينفذ المحرك تحويل مخزون أو أمر شراء، ولا يكتب إلى PharmaFly أو قاعدة SQLite.",
            "الرصيد من المخزن الرئيسي المحدد لكل فرع فقط، مع إظهار مصدر السجل الفائز وتوقيته.",
            "تحويل العبوات إلى وحدات يستخدم Parts من أحدث بيانات Items المكتملة المحملة محليًا؛ لا توجد قيمة افتراضية عند غيابها.",
            "الطلب هو صافي البيع بعد طرح المرتجعات خلال آخر 3 أشهر تشغيلية مكتملة؛ تُحوّل كميات البيع بـParts الحالي المحلي نفسه لمطابقتها مع الرصيد، وفق حد PharmaFly الساعة 03:00.",
            "الفروع غير المرتبطة بهذا الـMaster مستبعدة من رصيده وعجزه وفائضه؛ ويمكن جمع عدة أكواد معتمدة بعد تحويل كل كود باستخدام Parts الخاص به.",
            "تكلفة النقل والشراء مستبعدة من الحساب حسب الإعداد. تقديرات النقل تحتاج مراجعة المسار، وتقديرات الشراء لا تتضمن الوارد غير المؤكد.",
            "كل النتائج محاكاة كميات فقط؛ لا يصدر المحرك أمر نقل أو شراء."
        ];
        if (abcFsnPolicyError) {
            globalWarnings.push(
                "تعذر قراءة سياسة ABC/FSN، ولم يُفعّل التصنيف. تقرير المخزون مستمر."
            );
        }

        if (coverageDays === null) {
            globalWarnings.push("أدخل عدد أيام التغطية المطلوب لحساب كمية الهدف لكل فرع.");
        }
        if (salesDetailStatus === "SALES_DETAIL_QUERY_BLOCKED") {
            globalWarnings.push("تعذر تجميع المبيعات الموثقة؛ لم تُستخدم مبيعات غير متحققة.");
        }

        const lastCompletedBusinessDate = addCalendarDays(dates.toExclusive, -1);

        const daysSinceLastSaleFor = lastSaleDate => {
            if (!lastSaleDate) return null;

            const endTime = Date.parse(`${lastCompletedBusinessDate}T00:00:00.000Z`);
            const saleTime = Date.parse(`${lastSaleDate}T00:00:00.000Z`);

            if (!Number.isFinite(endTime) || !Number.isFinite(saleTime) || saleTime > endTime) {
                return null;
            }

            return Math.floor((endTime - saleTime) / 86400000);
        };

        // Branch-level ABC / FSN.
        for (const branch of BRANCHES) {
            const branchInputs = [];
            const branchBalanceByMaster = new Map();

            for (const item of items) {
                const branchBalance = item.branches.find(
                    row => Number(row.branchId) === Number(branch.id)
                );

                if (!branchBalance?.mappingVerified) {
                    if (branchBalance) {
                        branchBalance.classification = {
                            abc: null,
                            fsn: null,
                            status: "NOT_MAPPED"
                        };
                    }
                    continue;
                }

                if (!branchBalance.salesClassificationVerified) {
                    branchBalance.classification = {
                        abc: null,
                        fsn: null,
                        status: "SALES_WINDOW_NOT_VERIFIED"
                    };
                    continue;
                }

                const key = String(item.masterItemId);
                branchBalanceByMaster.set(key, branchBalance);

                branchInputs.push({
                    classificationKey: key,
                    masterItemId: item.masterItemId,
                    verifiedSalesValue: branchBalance.verifiedSalesValue,
                    verifiedSellingDays: branchBalance.verifiedSellingDays,
                    daysSinceLastSale: daysSinceLastSaleFor(branchBalance.lastSaleDate),
                    historyComplete: !branchBalance.lastSaleDate,
                    historyDays: dates.days.length,
                    salesWindowVerified: true,
                    returnLines: branchBalance.returnLines
                });
            }

            const branchClasses = classifyAbcFsn(branchInputs, abcFsnPolicy);

            for (const [key, classification] of branchClasses) {
                const branchBalance = branchBalanceByMaster.get(key);
                if (branchBalance) {
                    branchBalance.classification = classification;
                }
            }
        }

        // Aggregate classification: combine distinct active dates across mapped branches.
        const aggregateInputs = [];
        const aggregateItemByMaster = new Map();

        for (const item of items) {
            const mappedBranches = item.branches.filter(branch => branch.mappingVerified);

            if (!mappedBranches.length) {
                item.classification = {
                    abc: null,
                    fsn: null,
                    status: "NOT_MAPPED"
                };
                continue;
            }

            const aggregateVerified = mappedBranches.every(
                branch => branch.salesClassificationVerified
            );

            if (!aggregateVerified) {
                item.classification = {
                    abc: null,
                    fsn: null,
                    status: "SALES_WINDOW_NOT_VERIFIED"
                };
                continue;
            }

            const sellingDayKeys = new Set();

            for (const branch of mappedBranches) {
                const metrics = salesMetricsByKey.get(
                    `${item.masterItemId}|${branch.branchId}`
                );

                for (const salesDay of metrics?.sellingDayKeys || []) {
                    sellingDayKeys.add(salesDay);
                }
            }

            const latestLastSaleDate = mappedBranches.reduce(
                (latest, branch) =>
                    branch.lastSaleDate && (!latest || branch.lastSaleDate > latest)
                        ? branch.lastSaleDate
                        : latest,
                null
            );

            const key = String(item.masterItemId);
            aggregateItemByMaster.set(key, item);

            aggregateInputs.push({
                classificationKey: key,
                masterItemId: item.masterItemId,
                verifiedSalesValue: mappedBranches.reduce(
                    (sum, branch) => sum + (Number(branch.verifiedSalesValue) || 0),
                    0
                ),
                verifiedSellingDays: sellingDayKeys.size,
                daysSinceLastSale: daysSinceLastSaleFor(latestLastSaleDate),
                historyComplete: !latestLastSaleDate,
                historyDays: dates.days.length,
                salesWindowVerified: true,
                returnLines: mappedBranches.reduce(
                    (sum, branch) => sum + (Number(branch.returnLines) || 0),
                    0
                )
            });
        }

        const aggregateClasses = classifyAbcFsn(aggregateInputs, abcFsnPolicy);

        for (const [key, classification] of aggregateClasses) {
            const item = aggregateItemByMaster.get(key);
            if (item) {
                item.classification = classification;
            }
        }
        db.exec("ROLLBACK");
        db.close();
        db = null;

        items.sort((a, b) =>
            b.blockers.length - a.blockers.length ||
            a.itemName.localeCompare(b.itemName, "ar") ||
            a.masterItemId - b.masterItemId
        );
        const itemsLimit = 1000;

        return {
            success: true,
            mode: "SHADOW_ONLY",
            executionAllowed: false,
            engineVersion: STOCK_OPTIMIZATION_ENGINE_VERSION,
            asOf: now.toISOString(),
            salesWindow: {
                from: dates?.from || null,
                toExclusive: dates?.toExclusive || null,
                months: dates?.months || [],
                monthCount: dates?.months?.length ?? null,
                expectedDays: dates?.days?.length ?? null,
                verifiedCalendarDays: dates?.verificationDays?.length ?? null,
                timeZone: dates?.timeZone || null,
                dayBoundary: "03:00",
                detailStatus: salesDetailStatus
            },
            coverageDays,
            decisionReady: readyMasterCount > 0,
            policyStatus: coverageDays === null ? "COVERAGE_DAYS_REQUIRED" : "COVERAGE_DAYS_CONFIGURED",
            branchStatus,
            summary: {
                activeMasterCount: activeMasters,
                mappedMasterCount: activeMappedMasterCount,
                excludedUnmappedMasterCount: Math.max(0, activeMasters - activeMappedMasterCount),
                blockedMasterCount: items.filter(row => row.decisionStatus !== "READY").length,
                readyMasterCount,
                transferAlternatives,
                purchaseAlternatives,
                baselineOnlyCount: items.filter(row => row.recommendation === "NO_ACTION").length,
                salesWindowDays: dates?.days?.length ?? null
            },
            blockerCounts,
            abcFsnPolicy,
            abcFsnStatus: abcFsnPolicy ? "POLICY_CONFIGURED" : "POLICY_READ_ERROR",
            abcFsnPolicyError: abcFsnPolicyError ? "POLICY_READ_ERROR" : null,
            items: items.slice(0, itemsLimit),
            itemsTruncated: items.length > itemsLimit,
            transfers: [],
            warnings: globalWarnings
        };
    } catch (error) {
        try {
            if (db?.inTransaction) db.exec("ROLLBACK");
        } catch {
            // The report is read-only; close safely if a rollback is unavailable.
        }
        db?.close();
        const report = emptyResult(now, [
            "تعذر إعداد تقرير Shadow Mode من قاعدة التشغيل المحلية؛ لم تُنشأ توصيات.",
            String(error?.message || error).slice(0, 300)
        ]);
        report.success = false;
        return report;
    }
}
