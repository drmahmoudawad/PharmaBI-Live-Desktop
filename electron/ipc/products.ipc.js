import { ipcMain } from "../ipcAuthorization.js";


import {
    getTopProducts
} from "../pharmfly/products/topProductsService.js";


import {
    getProductProfitability
} from "../pharmfly/products/productProfitabilityService.js";


import {
    getProductMixAnalytics
} from "../pharmfly/products/productMixService.js";
import {
    getStockOptimizationShadowReport
} from "../pharmfly/inventory/stockOptimizationService.js";
import {
    getStockOptimizationAbcFsnPolicy,
    saveStockOptimizationAbcFsnPolicy
} from "../pharmfly/inventory/stockOptimizationPolicyStore.js";

import path from "node:path";
import Database from "better-sqlite3";
import { app } from "electron";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";

const srRequire = createRequire(import.meta.url);


function srQueryInWorker(databasePath, sql, params) {
    const workerCode = [
        'const { parentPort, workerData } = require("node:worker_threads");',
        'let db;',
        'try {',
        '  const Database = require(workerData.databaseModule);',
        '  db = new Database(workerData.databasePath, { readonly: true, fileMustExist: true, timeout: 10000 });',
        '  const rows = db.prepare(workerData.sql).all(workerData.params);',
        '  parentPort.postMessage({ ok: true, rows });',
        '} catch (error) {',
        '  parentPort.postMessage({ ok: false, error: String(error?.stack || error?.message || error) });',
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
                sql,
                params,
                databaseModule: srRequire.resolve("better-sqlite3")
            }
        });

        worker.once("message", result => {
            settled = true;
            if (result?.ok) {
                resolve(result.rows);
            } else {
                reject(new Error(result?.error || "SQLITE_WORKER_QUERY_FAILED"));
            }
        });

        worker.once("error", error => {
            if (settled) return;
            settled = true;
            reject(error);
        });

        worker.once("exit", code => {
            if (settled) return;
            settled = true;
            reject(new Error("SQLite query worker exited without a result. Code=" + code));
        });
    });
}

const SR_BRANCHES = [
    { id: 1, name: "أسكوت" },
    { id: 2, name: "شارع 10" },
    { id: 3, name: "المنشية البحرية" },
    { id: 4, name: "سيدي بشر قبلي" },
    { id: 5, name: "أبو سليمان" }
];

const SR_APPROVED_STATUSES = "('USER_CONFIRMED', 'USER_CREATED')";
const SR_FRESHNESS_HOURS = 36;

function srNumber(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function srDateOnly(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function srAddDays(date, amount) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + amount);
    return result;
}

function srMakePeriods(now) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const cutoff90 = srAddDays(todayStart, -89);
    const cutoff60 = srAddDays(todayStart, -59);

    const monthLabel = date => new Intl.DateTimeFormat("ar-EG", {
        month: "long",
        year: "numeric"
    }).format(date);

    return {
        today: srDateOnly(todayStart),
        tomorrow: srDateOnly(srAddDays(todayStart, 1)),
        queryStart: srDateOnly(cutoff90 < previousMonthStart ? cutoff90 : previousMonthStart),
        cutoff90: srDateOnly(cutoff90),
        cutoff60: srDateOnly(cutoff60),
        previousMonthStart: srDateOnly(previousMonthStart),
        lastMonthStart: srDateOnly(lastMonthStart),
        currentMonthStart: srDateOnly(currentMonthStart),
        previousMonthLabel: monthLabel(previousMonthStart),
        lastMonthLabel: monthLabel(lastMonthStart)
    };
}

function srPairKey(masterId, branchId) {
    return `${Number(masterId)}|${Number(branchId)}`;
}

function srEmptyReport(periods, warnings = []) {
    return {
        success: true,
        ready: false,
        asOfDate: periods.today,
        windows: periods,
        branchStatus: SR_BRANCHES.map(branch => ({
            ...branch,
            status: "NOT_SYNCED",
            statusLabel: "لم تتم مزامنة الرصيد",
            lastCheckedAt: null,
            isFresh: false,
            approvedMappings: 0,
            localRows: 0,
            errorMessage: null
        })),
        summary: {
            dead90Candidates: 0,
            slowMovingCandidates: 0,
            overstockCandidates: 0,
            transferSuggestions: 0,
            proposedPacks: 0
        },
        items: [],
        transfers: [],
        warnings
    };
}

async function srGetStockRedistributionReport() {
    const now = new Date();
    const periods = srMakePeriods(now);
    const databasePath = path.join(app.getPath("userData"), "pharmabi-local.db");
    let db;

    try {
        db = new Database(databasePath, {
            readonly: true,
            fileMustExist: true,
            timeout: 10000
        });

        const tableNames = new Set(db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name IN (
                  'unified_local_inventory',
                  'unified_local_inventory_sync_state',
                  'master_item_branch_map',
                  'master_items',
                  'sales_history',
                  'sales_sync_state'
              )
        `).all().map(row => row.name));

        const missing = [
            "unified_local_inventory",
            "unified_local_inventory_sync_state",
            "master_item_branch_map",
            "master_items",
            "sales_history",
            "sales_sync_state"
        ].filter(name => !tableNames.has(name));

        if (missing.length) {
            return {
                ...srEmptyReport(periods, [
                    "كاش رصيد المخزون لم يكتمل بعد. شغّل تحديث البيانات المعتاد لإتمام مزامنة الرصيد المحلي.",
                    "الجداول غير المتاحة: " + missing.join("، ")
                ]),
                ready: false
            };
        }

        const inventoryStates = db.prepare(`
            SELECT *
            FROM unified_local_inventory_sync_state
        `).all();

        const inventoryStateByBranch = new Map(
            inventoryStates.map(row => [Number(row.branch_id), row])
        );

        const salesStates = db.prepare(`
            SELECT branch_id, last_sync_status, last_sync_finished_at, newest_date, error_message
            FROM sales_sync_state
        `).all();

        const salesStateByBranch = new Map(
            salesStates.map(row => [Number(row.branch_id), row])
        );

        const mappingCounts = new Map(
            db.prepare(`
                SELECT branch_id, COUNT(*) AS approved_count
                FROM master_item_branch_map
                WHERE match_status IN ${SR_APPROVED_STATUSES}
                GROUP BY branch_id
            `).all().map(row => [Number(row.branch_id), srNumber(row.approved_count)])
        );

        const freshnessLimit = SR_FRESHNESS_HOURS * 60 * 60 * 1000;

        const branchStatus = SR_BRANCHES.map(branch => {
            const invState = inventoryStateByBranch.get(branch.id);
            const salesState = salesStateByBranch.get(branch.id);

            const inventoryCheckedAt =
                invState?.last_sync_finished_at || invState?.updated_at || null;

            const inventoryCheckedMs = inventoryCheckedAt
                ? Date.parse(inventoryCheckedAt)
                : NaN;

            const inventoryAge = Number.isFinite(inventoryCheckedMs)
                ? now.getTime() - inventoryCheckedMs
                : Infinity;

            const inventoryFresh =
                invState?.status === "LOCAL_SYNCED" &&
                inventoryAge >= -5 * 60 * 1000 &&
                inventoryAge <= freshnessLimit;

            const salesCheckedAt = salesState?.last_sync_finished_at || null;
            const salesCheckedMs = salesCheckedAt ? Date.parse(salesCheckedAt) : NaN;
            const salesAge = Number.isFinite(salesCheckedMs)
                ? now.getTime() - salesCheckedMs
                : Infinity;

            const salesStatus = String(salesState?.last_sync_status || "").toUpperCase();
            const salesStatusBad = /ERROR|FAILED|FAIL|RUNNING|SYNCING|STALE/.test(salesStatus);

            const salesFresh =
                Boolean(salesCheckedAt) &&
                !salesStatusBad &&
                salesAge >= -5 * 60 * 1000 &&
                salesAge <= freshnessLimit;

            let statusLabel = "لم تتم مزامنة الرصيد";
            if (invState?.status === "ERROR") statusLabel = "فشل تحديث الرصيد";
            else if (invState?.status === "SYNCING") statusLabel = "مزامنة الرصيد جارية";
            else if (!inventoryFresh) statusLabel = "رصيد المخزون قديم";
            else if (!salesFresh) statusLabel = "المبيعات تحتاج تحديثًا";
            else statusLabel = "الرصيد والمبيعات حديثان";

            return {
                ...branch,
                status: invState?.status || "NOT_SYNCED",
                statusLabel,
                lastCheckedAt: inventoryCheckedAt,
                salesLastCheckedAt: salesCheckedAt,
                salesNewestDate: salesState?.newest_date || null,
                inventoryFresh,
                salesFresh,
                isFresh: inventoryFresh && salesFresh,
                localRows: srNumber(invState?.local_rows),
                approvedMappings: mappingCounts.get(branch.id) || 0,
                errorMessage: invState?.error_message || salesState?.error_message || null
            };
        });

        if (inventoryStates.length === 0) {
            return {
                ...srEmptyReport(periods, [
                    "لم تتم مزامنة رصيد المخزون المحلي بعد. شغّل تحديث البيانات المعتاد في البرنامج.",
                    "لن تدخل الأصناف غير المرتبطة يدويًا أو ذات حالة المراجعة المعلقة في التقرير."
                ]),
                branchStatus
            };
        }

        const warnings = [];
        const staleBranches = branchStatus.filter(branch => !branch.isFresh);

        if (staleBranches.length) {
            warnings.push(
                `لن تُقترح حركة من أو إلى الفروع التي لم يُتحقق من رصيدها ومبيعاتها حديثًا: ${staleBranches.map(branch => branch.name).join("، ")}.`
            );
        }

        warnings.push(
            "الربط المستخدم يدوي ومعتمد فقط: USER_CONFIRMED وUSER_CREATED. التقرير لا ينفّذ أي حركة مخزنية."
        );

        const mappingRows = db.prepare(`
            SELECT
                m.master_item_id,
                m.branch_id,
                CAST(m.branch_item_id AS TEXT) AS branch_item_id,
                m.branch_item_name,
                mi.unified_code,
                mi.canonical_name
            FROM master_item_branch_map m
            INNER JOIN master_items mi ON mi.id = m.master_item_id
            WHERE m.match_status IN ${SR_APPROVED_STATUSES}
        `).all();

        const masterInfo = new Map();
        const mappedBranchesByMaster = new Map();

        for (const row of mappingRows) {
            const masterId = srNumber(row.master_item_id);
            const branchId = srNumber(row.branch_id);

            if (!masterInfo.has(masterId)) {
                masterInfo.set(masterId, {
                    masterItemId: masterId,
                    unifiedCode: row.unified_code || "",
                    canonicalName: row.canonical_name || row.branch_item_name || "صنف بدون اسم"
                });
            }

            if (!mappedBranchesByMaster.has(masterId)) {
                mappedBranchesByMaster.set(masterId, new Set());
            }

            mappedBranchesByMaster.get(masterId).add(branchId);
        }

        const inventoryRows = db.prepare(`
            SELECT
                i.branch_id,
                CAST(i.item_id AS TEXT) AS item_id,
                i.store_id,
                COALESCE(i.on_hand_base_units, 0) AS stock_units,
                COALESCE(i.store_new_packs, 0) AS stock_packs,
                COALESCE(i.store_new_units, 0) AS stock_loose_units,
                COALESCE(i.parts, 1) AS stock_parts,
                i.item_name,
                i.is_active,
                i.is_archived,
                i.show_in_stock,
                i.service_item,
                i.freezed_item,
                m.master_item_id,
                m.branch_item_name
            FROM unified_local_inventory i
            INNER JOIN master_item_branch_map m
                ON m.branch_id = i.branch_id
               AND TRIM(CAST(m.branch_item_id AS TEXT)) = TRIM(CAST(i.item_id AS TEXT))
               AND m.match_status IN ${SR_APPROVED_STATUSES}
            INNER JOIN master_items mi ON mi.id = m.master_item_id
        `).all();

        const stockByMasterBranch = new Map();

        for (const row of inventoryRows) {
            if (row.is_active !== null && row.is_active !== undefined && Number(row.is_active) === 0) continue;
            if (Number(row.is_archived) === 1) continue;
            if (row.show_in_stock !== null && row.show_in_stock !== undefined && Number(row.show_in_stock) === 0) continue;
            if (Number(row.service_item) === 1 || Number(row.freezed_item) === 1) continue;

            const masterId = srNumber(row.master_item_id);
            const branchId = srNumber(row.branch_id);
            const rowKey = srPairKey(masterId, branchId);

            const current = stockByMasterBranch.get(rowKey) || {
                masterItemId: masterId,
                branchId,
                stockUnits: 0,
                stockPacks: 0,
                stockLooseUnits: 0,
                stockParts: srNumber(row.stock_parts) > 0 ? srNumber(row.stock_parts) : 1,
                itemNames: []
            };

            current.stockUnits += srNumber(row.stock_units);
            current.stockPacks += srNumber(row.stock_packs);
            current.stockLooseUnits += srNumber(row.stock_loose_units);

            const name = row.item_name || row.branch_item_name;
            if (name && current.itemNames.length < 3 && !current.itemNames.includes(name)) {
                current.itemNames.push(name);
            }

            stockByMasterBranch.set(rowKey, current);
        }

        const salesRows = await srQueryInWorker(
            databasePath,
            `
            SELECT
                m.master_item_id,
                h.branch_id,
                SUM(CASE
                    WHEN h.date >= @previousMonthStart AND h.date < @lastMonthStart
                    THEN (COALESCE(h.base_units, 0) * 1.0 / CASE WHEN COALESCE(h.parts, 0) > 0 THEN h.parts ELSE 1 END) ELSE 0
                END) AS previous_month_packs,
                SUM(CASE
                    WHEN h.date >= @lastMonthStart AND h.date < @currentMonthStart
                    THEN (COALESCE(h.base_units, 0) * 1.0 / CASE WHEN COALESCE(h.parts, 0) > 0 THEN h.parts ELSE 1 END) ELSE 0
                END) AS last_month_packs,
                SUM(CASE
                    WHEN h.date >= @cutoff90
                    THEN (COALESCE(h.base_units, 0) * 1.0 / CASE WHEN COALESCE(h.parts, 0) > 0 THEN h.parts ELSE 1 END) ELSE 0
                END) AS packs_90d,
                SUM(CASE
                    WHEN h.date >= @cutoff60
                    THEN (COALESCE(h.base_units, 0) * 1.0 / CASE WHEN COALESCE(h.parts, 0) > 0 THEN h.parts ELSE 1 END) ELSE 0
                END) AS packs_60d,
                MAX(CASE
                    WHEN h.date >= @cutoff90 THEN SUBSTR(h.date, 1, 10)
                    ELSE NULL
                END) AS last_sale_date_90d
            FROM sales_history h
            INNER JOIN master_item_branch_map m
                ON m.branch_id = h.branch_id
               AND m.branch_item_id = h.item_id
               AND m.match_status IN ${SR_APPROVED_STATUSES}
            WHERE h.date >= @queryStart
              AND h.date < @tomorrow
              AND UPPER(TRIM(COALESCE(h.transaction_type, ''))) = 'SALE'
              AND COALESCE(h.base_units, 0) > 0
            GROUP BY m.master_item_id, h.branch_id
        `,
            {
            queryStart: periods.queryStart,
            tomorrow: periods.tomorrow,
            cutoff90: periods.cutoff90,
            cutoff60: periods.cutoff60,
            previousMonthStart: periods.previousMonthStart,
            lastMonthStart: periods.lastMonthStart,
            currentMonthStart: periods.currentMonthStart
            }
        );

        if (salesRows.length === 0) {
            return {
                success: true,
                ready: true,
                asOfDate: periods.today,
                windows: periods,
                freshnessHours: SR_FRESHNESS_HOURS,
                branchStatus,
                summary: {
                    dead90Candidates: 0,
                    slowMovingCandidates: 0,
                    overstockCandidates: 0,
                    transferSuggestions: 0,
                    proposedPacks: 0
                },
                items: [],
                transfers: [],
                warnings: [
                    ...warnings,
                    "لم توجد مبيعات مرتبطة بربط يدوي معتمد خلال فترة التحليل. أوقفنا تصنيف الأصناف كراكد بدلًا من افتراض أن عدم ظهور المبيعات يعني عدم وجودها."
                ]
            };
        }

        const salesByMasterBranch = new Map();

        for (const row of salesRows) {
            salesByMasterBranch.set(srPairKey(row.master_item_id, row.branch_id), {
                previousMonthPacks: Math.max(0, srNumber(row.previous_month_packs)),
                lastMonthPacks: Math.max(0, srNumber(row.last_month_packs)),
                packs90: Math.max(0, srNumber(row.packs_90d)),
                packs60: Math.max(0, srNumber(row.packs_60d)),
                lastSaleDate: row.last_sale_date_90d
                    ? String(row.last_sale_date_90d).slice(0, 10)
                    : null
            });
        }

        const branchById = new Map(SR_BRANCHES.map(branch => [branch.id, branch]));
        const currentDateMs = Date.parse(`${periods.today}T00:00:00`);
        const cutoff60Ms = Date.parse(`${periods.cutoff60}T00:00:00`);
        const cutoff90Ms = Date.parse(`${periods.cutoff90}T00:00:00`);
        const candidates = [];
        const transfers = [];
        const seenMasterBranch = new Set();
        const sharedDestinationNeedByItemBranch = new Map();
        const remainingDestinationNeedByItemBranch = new Map();

        for (const mapping of mappingRows) {
            const masterItemId = srNumber(mapping.master_item_id);
            const sourceBranchId = srNumber(mapping.branch_id);
            const rowKey = srPairKey(masterItemId, sourceBranchId);

            if (seenMasterBranch.has(rowKey)) continue;
            seenMasterBranch.add(rowKey);

            const stockInfo = stockByMasterBranch.get(rowKey);
            const currentStock = Math.max(0, Math.floor(srNumber(stockInfo?.stockPacks)));
            if (currentStock <= 0) continue;

            const sales = salesByMasterBranch.get(rowKey) || {
                previousMonthPacks: 0,
                lastMonthPacks: 0,
                packs90: 0,
                packs60: 0,
                lastSaleDate: null
            };

            const categories = [];

            if (sales.packs90 <= 0) {
                categories.push("DEAD_90");
            } else {
                if (sales.lastSaleDate) {
                    const lastSaleMs = Date.parse(`${sales.lastSaleDate}T00:00:00`);

                    if (
                        Number.isFinite(lastSaleMs) &&
                        lastSaleMs >= cutoff90Ms &&
                        lastSaleMs < cutoff60Ms
                    ) {
                        categories.push("SLOW_60_89");
                    }
                }

                const hasMovementInTwoMonths =
                    sales.previousMonthPacks > 0 || sales.lastMonthPacks > 0;

                if (
                    hasMovementInTwoMonths &&
                    currentStock > sales.previousMonthPacks &&
                    currentStock > sales.lastMonthPacks
                ) {
                    categories.push("OVERSTOCK_TWO_MONTHS");
                }
            }

            if (!categories.length) continue;

            const info = masterInfo.get(masterItemId) || {};
            const sourceBranch = branchById.get(sourceBranchId);
            const sourceStatus = branchStatus.find(branch => branch.id === sourceBranchId);
            const lastSaleMs = sales.lastSaleDate
                ? Date.parse(`${sales.lastSaleDate}T00:00:00`)
                : NaN;

            const daysSinceLastSale = Number.isFinite(lastSaleMs)
                ? Math.max(0, Math.floor((currentDateMs - lastSaleMs) / 86400000))
                : null;

            const sourcePeak = Math.max(
                sales.previousMonthPacks,
                sales.lastMonthPacks
            );

            const potentialTransfer = Math.max(0, Math.floor(categories.includes("DEAD_90")
                ? Math.floor(currentStock)
                : Math.max(0, Math.floor(currentStock - Math.ceil(sourcePeak)))));

            const candidate = {
                id: rowKey,
                masterItemId,
                unifiedCode: info.unifiedCode || "",
                itemName: info.canonicalName || stockInfo?.itemNames?.[0] || mapping.branch_item_name || "صنف بدون اسم",
                sourceBranchId,
                sourceBranchName: sourceBranch?.name || `فرع ${sourceBranchId}`,
                currentStockPacks: Math.round(srNumber(stockInfo?.stockPacks) * 100) / 100,
                currentStockLooseUnits: Math.round(srNumber(stockInfo?.stockLooseUnits) * 100) / 100,
                stockParts: srNumber(stockInfo?.stockParts) > 0 ? srNumber(stockInfo.stockParts) : 1,
                previousMonthPacks: Math.round(sales.previousMonthPacks * 100) / 100,
                lastMonthPacks: Math.round(sales.lastMonthPacks * 100) / 100,
                packs90: Math.round(sales.packs90 * 100) / 100,
                lastSaleDate: sales.lastSaleDate,
                daysSinceLastSale,
                categories,
                sourceSnapshotFresh: Boolean(sourceStatus?.isFresh),
                transferablePacks: sourceStatus?.isFresh ? potentialTransfer : null,
                recommendedPacks: 0,
                recipients: []
            };

            const targetCandidates = [];

            if (sourceStatus?.isFresh && potentialTransfer > 0) {
                const targetBranches = mappedBranchesByMaster.get(masterItemId) || new Set();

                for (const targetBranchId of targetBranches) {
                    if (targetBranchId === sourceBranchId) continue;

                    const targetStatus = branchStatus.find(branch => branch.id === targetBranchId);
                    if (!targetStatus?.isFresh) continue;

                    const targetSales = salesByMasterBranch.get(
                        srPairKey(masterItemId, targetBranchId)
                    ) || {
                        previousMonthPacks: 0,
                        lastMonthPacks: 0,
                        packs60: 0
                    };

                    if (targetSales.packs60 <= 0) continue;

                    const targetStockInfo = stockByMasterBranch.get(
                        srPairKey(masterItemId, targetBranchId)
                    );

                    const targetStockPacks = Math.max(
                        0,
                        srNumber(targetStockInfo?.stockPacks)
                    );

                    const targetStockLooseUnits = Math.max(
                        0,
                        srNumber(targetStockInfo?.stockLooseUnits)
                    );

                    const targetStockParts = srNumber(targetStockInfo?.stockParts) > 0
                        ? srNumber(targetStockInfo.stockParts)
                        : 1;

                    const targetStockPackEquivalent =
                        targetStockPacks + (targetStockLooseUnits / targetStockParts);

                    const fullMonthAverage =
                        (targetSales.previousMonthPacks + targetSales.lastMonthPacks) / 2;

                    // الاستهلاك الشهري المرجعي هو متوسط آخر شهرين مكتملين فقط.
                    const averageMonthDemand = Math.max(0, fullMonthAverage);

                    // النقل بالعبوات الكاملة؛ لا يتجاوز الرصيد بعد النقل متوسط استهلاك شهر.
                    const calculatedTargetNeed = Math.max(
                        0,
                        Math.floor(averageMonthDemand - targetStockPackEquivalent + 1e-9)
                    );

                    const destinationNeedKey = srPairKey(masterItemId, targetBranchId);

                    if (!sharedDestinationNeedByItemBranch.has(destinationNeedKey)) {
                        sharedDestinationNeedByItemBranch.set(
                            destinationNeedKey,
                            calculatedTargetNeed
                        );
                        remainingDestinationNeedByItemBranch.set(
                            destinationNeedKey,
                            calculatedTargetNeed
                        );
                    }

                    const destinationNeedPacks = Math.max(
                        0,
                        Math.floor(
                            srNumber(sharedDestinationNeedByItemBranch.get(destinationNeedKey))
                        )
                    );

                    const targetNeed = Math.max(
                        0,
                        Math.floor(
                            srNumber(remainingDestinationNeedByItemBranch.get(destinationNeedKey))
                        )
                    );

                    if (targetNeed <= 0) continue;

                    targetCandidates.push({
                        branchId: targetBranchId,
                        branchName: targetStatus.name,
                        stockPacks: Math.round(srNumber(targetStockInfo?.stockPacks) * 100) / 100,
                        stockLooseUnits: Math.round(srNumber(targetStockInfo?.stockLooseUnits) * 100) / 100,
                        stockParts: srNumber(targetStockInfo?.stockParts) > 0 ? srNumber(targetStockInfo.stockParts) : 1,
                        sales60Packs: Math.round(targetSales.packs60 * 100) / 100,
                        targetNeed,
                        destinationNeedPacks,
                        previousMonthPacks: targetSales.previousMonthPacks,
                        lastMonthPacks: targetSales.lastMonthPacks
                    });
                }
            }

            targetCandidates.sort((a, b) =>
                b.sales60Packs - a.sales60Packs ||
                b.targetNeed - a.targetNeed ||
                a.branchId - b.branchId
            );

            let remaining = sourceStatus?.isFresh ? potentialTransfer : 0;

            for (const target of targetCandidates) {
                if (remaining <= 0) break;

                const destinationNeedKey = srPairKey(masterItemId, target.branchId);

                const destinationRemainingPacks = Math.max(
                    0,
                    Math.floor(
                        srNumber(
                            remainingDestinationNeedByItemBranch.get(destinationNeedKey)
                        )
                    )
                );

                const quantity = Math.floor(
                    Math.min(remaining, target.targetNeed, destinationRemainingPacks)
                );

                if (quantity <= 0) continue;

                transfers.push({
                    id: `${masterItemId}|${sourceBranchId}|${target.branchId}`,
                    masterItemId,
                    unifiedCode: candidate.unifiedCode,
                    itemName: candidate.itemName,
                    categories: candidate.categories,
                    categoryLabels: candidate.categories.map(category => ({
                        DEAD_90: "راكد: لا مبيعات خلال 90 يومًا",
                        SLOW_60_89: "حركة ضعيفة: آخر بيع منذ 60–89 يومًا",
                        OVERSTOCK_TWO_MONTHS: "المخزون أكبر من مبيعات كل شهر من آخر شهرين مكتملين"
                    }[category] || category)),
                    sourceBranchId,
                    sourceBranchName: candidate.sourceBranchName,
                    sourceStockPacks: candidate.currentStockPacks,
                    sourceTransferablePacks: candidate.transferablePacks,
                    sourcePreviousMonthPacks: candidate.previousMonthPacks,
                    sourceLastMonthPacks: candidate.lastMonthPacks,
                    destinationBranchId: target.branchId,
                    destinationBranchName: target.branchName,
                    destinationStockPacks: target.stockPacks,
                    destinationNeedPacks: target.destinationNeedPacks,
                    destinationPreviousMonthPacks: target.previousMonthPacks,
                    destinationLastMonthPacks: target.lastMonthPacks,
                    destinationSales60Packs: target.sales60Packs,
                    recommendedPacks: quantity,
                    reason: categories.includes("DEAD_90")
                        ? "لا توجد مبيعات خلال آخر 90 يومًا في المصدر، والوجهة لديها حركة حديثة ومخزون أقل من احتياجها التقديري."
                        : "مخزون المصدر أعلى من مبيعات كل شهر من آخر شهرين مكتملين، والوجهة لديها حركة حديثة ومخزون أقل من احتياجها التقديري."
                });

                candidate.recommendedPacks += quantity;
                candidate.recipients.push({
                    branchId: target.branchId,
                    branchName: target.branchName,
                    packs: quantity
                });

                remainingDestinationNeedByItemBranch.set(
                    destinationNeedKey,
                    Math.max(0, destinationRemainingPacks - quantity)
                );

                remaining -= quantity;
            }

            const approvedOtherBranchIds = Array.from(
                mappedBranchesByMaster.get(masterItemId) || []
            ).filter(branchId => branchId !== sourceBranchId);

            const hasStaleApprovedDestination = approvedOtherBranchIds.some(
                targetBranchId => {
                    const targetStatus = branchStatus.find(
                        branch => branch.id === targetBranchId
                    );
                    return !targetStatus?.isFresh;
                }
            );

            let transferStatus = "NO_DESTINATION_NEED";
            let transferStatusLabel = "لا يوجد فرع مستقبِل محتاج";
            let transferStatusReason =
                "الفروع المرتبطة لا يظهر لديها حاليًا احتياج مخزون موجب وفق المبيعات والمخزون المتاحين.";
            let possibleTransferPacks = 0;

            if (!sourceStatus?.isFresh) {
                transferStatus = "DATA_STALE";
                transferStatusLabel = "البيانات غير حديثة";
                transferStatusReason =
                    "بيانات رصيد المصدر أو مبيعاته غير حديثة؛ حدّث الكاش قبل تحديد كمية النقل.";
                possibleTransferPacks = null;
            } else if (
                candidate.recommendedPacks > 0 &&
                candidate.recipients.length > 0
            ) {
                transferStatus = "ELIGIBLE";
                transferStatusLabel = "مرشح للنقل";
                transferStatusReason =
                    "يوجد فرع مطابق يدويًا لديه مبيعات حديثة واحتياج مخزون موجب.";
                possibleTransferPacks = candidate.recommendedPacks;
            } else if (approvedOtherBranchIds.length === 0) {
                transferStatus = "NO_APPROVED_MAPPING";
                transferStatusLabel = "لا يوجد ربط معتمد بفرع آخر";
                transferStatusReason =
                    "لا يوجد ربط يدوي معتمد للصنف في فرع آخر؛ لم تُستخدم أي اقتراحات مطابقة آلية.";
                possibleTransferPacks = null;
            } else if (hasStaleApprovedDestination) {
                transferStatus = "DATA_STALE";
                transferStatusLabel = "البيانات غير حديثة";
                transferStatusReason =
                    "بيانات رصيد أو مبيعات فرع مرتبط واحد أو أكثر غير حديثة؛ لا يمكن تأكيد احتياج الاستقبال.";
                possibleTransferPacks = null;
            } else if (potentialTransfer <= 0) {
                transferStatus = "NO_SOURCE_QUANTITY";
                transferStatusLabel = "لا توجد كمية فائضة قابلة للنقل";
                transferStatusReason =
                    "لا توجد كمية فائضة قابلة للنقل من المصدر وفق قاعدة الاحتياطي الحالية.";
                possibleTransferPacks = 0;
            }

            candidate.transferStatus = transferStatus;
            candidate.transferStatusLabel = transferStatusLabel;
            candidate.transferStatusReason = transferStatusReason;
            candidate.possibleTransferPacks = possibleTransferPacks;

            candidates.push(candidate);
        }

        candidates.sort((a, b) => {
            const deadA = a.categories.includes("DEAD_90") ? 0 : 1;
            const deadB = b.categories.includes("DEAD_90") ? 0 : 1;

            return deadA - deadB ||
                b.currentStockPacks - a.currentStockPacks ||
                a.itemName.localeCompare(b.itemName, "ar");
        });

        transfers.sort((a, b) =>
            b.recommendedPacks - a.recommendedPacks ||
            a.itemName.localeCompare(b.itemName, "ar")
        );

        const proposedPacks = transfers.reduce(
            (sum, transfer) => sum + srNumber(transfer.recommendedPacks),
            0
        );

        const summary = {
            dead90Candidates: candidates.filter(row => row.categories.includes("DEAD_90")).length,
            slowMovingCandidates: candidates.filter(row => row.categories.includes("SLOW_60_89")).length,
            overstockCandidates: candidates.filter(row => row.categories.includes("OVERSTOCK_TWO_MONTHS")).length,
            transferSuggestions: transfers.length,
            proposedPacks: Math.round(proposedPacks * 100) / 100
        };

        if (!inventoryRows.length) {
            warnings.unshift(
                "لم يظهر مخزون مربوط يدويًا في الكاش. تأكد من اكتمال مزامنة أرصدة ItemCards ومراجعة روابط الأصناف."
            );
        }

        if (!transfers.length) {
            warnings.push(
                "لا توجد اقتراحات نقل مستوفية للشروط حاليًا. قد يكون السبب حداثة بيانات الفروع أو عدم وجود ربط يدوي معتمد أو عدم وجود طلب حديث في الوجهة."
            );
        }

        return {
            success: true,
            ready: true,
            asOfDate: periods.today,
            windows: periods,
            freshnessHours: SR_FRESHNESS_HOURS,
            branchStatus,
            summary,
            items: candidates.slice(0, 1500),
            transfers: transfers.slice(0, 1500),
            warnings
        };
    } catch (error) {
        return {
            ...srEmptyReport(periods, [
                "تعذر إعداد تقرير المخزون المحلي: " + String(error?.message || error)
            ]),
            success: false
        };
    } finally {
        db?.close();
    }
}

let registered =
    false;


export function registerProductsIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    ipcMain.handle(

        "products:top",

        async (
            _event,
            payload
        ) => {

            return getTopProducts({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                limit:
                    payload?.limit

            });

        }

    );


    ipcMain.handle(

        "products:profitability",

        async (
            _event,
            payload
        ) => {

            return getProductProfitability({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                limit:
                    payload?.limit,

                negativeMarginLimit:
                    payload?.negativeMarginLimit

            });

        }

    );


    ipcMain.handle(

        "products:mix",

        async (
            _event,
            payload
        ) => {

            return getProductMixAnalytics({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate

            });

        }

    );

    ipcMain.handle(
        "products:stock-redistribution",
        async (_event, options = {}) => {
            if (options?.action === "get-abc-fsn-policy") {
                return getStockOptimizationAbcFsnPolicy();
            }

            if (options?.action === "save-abc-fsn-policy") {
                return saveStockOptimizationAbcFsnPolicy(options.policy);
            }

            return getStockOptimizationShadowReport(options);
        }
    );
}
