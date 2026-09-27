import { getBranchPool } from '../../connection/connectionManager.js';
import { getSales } from '../sales/salesService.js';
import { getSalesSummary } from '../sales/salesService.js';
import { getSalesByDay } from '../sales/salesService.js';
import { getSalesByHour } from '../sales/salesService.js';
import { getSalesPerformance } from '../sales/salesPerformanceService.js';
import { getDeliverySummary } from '../sales/deliveryAnalyticsService.js';
import { getTopProducts } from '../products/topProductsService.js';
import { getProductProfitability } from '../products/productProfitabilityService.js';
import { getProductMixAnalytics } from '../products/productMixService.js';
import { getCustomerRfm } from '../customers/customerRfmService.js';
import { getCustomerIntelligence } from '../customers/customerIntelligenceService.js';
import { getCustomerRetention } from '../customers/customerRetentionService.js';
import { getCustomerInactivity } from '../customers/customerInactivityService.js';
import { getCustomerClv } from '../customers/customerClvService.js';
import { getCustomerCohort } from '../customers/customerCohortService.js';
import { getGroupSalesOverview } from '../group/groupAnalyticsService.js';

function n(value) {
    const x = Number(value);
    return Number.isFinite(x) ? x : 0;
}

function round(value, digits = 2) {
    const m = 10 ** digits;
    return Math.round((n(value) + Number.EPSILON) * m) / m;
}

function validateDate(value, name) {
    const text = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(`Invalid ${name}. Expected YYYY-MM-DD`);
    }
    const date = new Date(`${text}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${name}`);
    }
    return text;
}

function validateBranchId(branchId) {
    const id = Number(branchId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid branchId');
    return id;
}

function pct(current, previous) {
    const c = n(current);
    const p = n(previous);
    if (p === 0) return c === 0 ? 0 : null;
    return round(((c - p) / Math.abs(p)) * 100, 2);
}

function periodDays(fromDate, toDate) {
    const a = new Date(`${fromDate}T00:00:00.000Z`).getTime();
    const b = new Date(`${toDate}T00:00:00.000Z`).getTime();
    return Math.max(1, Math.floor((b - a) / 86400000) + 1);
}

function previousSameLength(fromDate, toDate) {
    const days = periodDays(fromDate, toDate);
    const end = new Date(`${fromDate}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end.getTime());
    start.setUTCDate(start.getUTCDate() - days + 1);
    return {
        fromDate: start.toISOString().slice(0, 10),
        toDate: end.toISOString().slice(0, 10)
    };
}

function k(label, value, formatter = 'number', change = null) {
    return { label, value: n(value), formatter, change };
}

function diagnosis(items) {
    return items.filter(Boolean).slice(0, 5);
}

function sellerRows(rows) {
    const map = new Map();
    for (const row of rows) {
        if (row.transactionType !== 'SALE') continue;
        const id = row.salesRepId || 'ط؛ظٹط± ظ…ط­ط¯ط¯';
        const current = map.get(id) || {
            sellerId: String(id), sales: 0, tickets: new Set(), units: 0
        };
        current.sales += n(row.netLineValue);
        current.units += n(row.baseUnits);
        if (row.ticketId) current.tickets.add(String(row.ticketId));
        map.set(id, current);
    }
    return [...map.values()]
        .map(x => ({
            sellerId: x.sellerId,
            sales: round(x.sales),
            tickets: x.tickets.size,
            averageInvoice: x.tickets.size ? round(x.sales / x.tickets.size) : 0,
            units: round(x.units)
        }))
        .sort((a, b) => b.sales - a.sales);
}

function movementRows(rows) {
    const map = new Map();
    for (const row of rows) {
        const id = row.itemId;
        if (id == null) continue;
        const key = String(id);
        const current = map.get(key) || {
            itemId: key,
            itemName: row.itemName || 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ',
            units: 0,
            sales: 0,
            tickets: new Set()
        };
        const sign = row.transactionType === 'RETURN' ? -1 : 1;
        current.units += sign * n(row.baseUnits);
        current.sales += sign * n(row.netLineValue);
        if (row.ticketId) current.tickets.add(String(row.ticketId));
        map.set(key, current);
    }
    return [...map.values()]
        .map(x => ({
            ...x,
            units: round(x.units),
            sales: round(x.sales),
            tickets: x.tickets.size
        }))
        .sort((a, b) => b.units - a.units);
}

function rollupDaily(days) {
    const result = new Map();
    for (const day of days) {
        const d = new Date(`${day.date}T00:00:00.000Z`);
        const isoWeekDay = d.getUTCDay() || 7;
        const weekStart = new Date(d.getTime());
        weekStart.setUTCDate(d.getUTCDate() - isoWeekDay + 1);
        const week = weekStart.toISOString().slice(0, 10);
        const month = day.date.slice(0, 7);
        const year = day.date.slice(0, 4);
        for (const [periodType, key] of [['ط£ط³ط¨ظˆط¹ظٹ', week], ['ط´ظ‡ط±ظٹ', month], ['ط³ظ†ظˆظٹ', year]]) {
            const mapKey = `${periodType}|${key}`;
            const current = result.get(mapKey) || { periodType, key, sales: 0, tickets: 0, profit: 0 };
            current.sales += n(day.netSales);
            current.tickets += n(day.tickets);
            current.profit += n(day.profit);
            result.set(mapKey, current);
        }
    }
    return [...result.values()].map(x => ({ ...x, sales: round(x.sales), tickets: x.tickets, profit: round(x.profit) }));
}

async function getProcurementRows({ branchId, fromDate, toDate, connection }) {
    const pool = await getBranchPool(validateBranchId(branchId), connection);
    const rangeEnd = new Date(`${toDate}T00:00:00.000Z`);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
    const toExclusive = rangeEnd.toISOString().slice(0, 10);

    const meta = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PurchaseInvoices'
          AND COLUMN_NAME IN ('Total','total','NetTotal','net_total','GrandTotal','grand_total');
    `);

    const totalColumn = meta.recordset?.[0]?.COLUMN_NAME || null;
    const safeTotalColumn = totalColumn ? totalColumn.replace(/[^A-Za-z0-9_]/g, '') : null;
    const amountSql = safeTotalColumn
        ? `COALESCE(SUM(DISTINCT CASE WHEN ${safeTotalColumn} IS NULL THEN 0 ELSE ${safeTotalColumn} END),0)`
        : `COALESCE(SUM(COALESCE(pi.CostPrice,0)),0)`;

    const result = await pool.request()
        .input('fromDate', `${fromDate} 00:00:00`)
        .input('toDateExclusive', `${toExclusive} 00:00:00`)
        .query(`
            SET NOCOUNT ON;
            SELECT
                COUNT(DISTINCT pi.inv_id) AS invoices,
                COUNT_BIG(*) AS lines,
                COUNT(DISTINCT pi.item_id) AS products,
                COUNT(DISTINCT pinv.vendor_id) AS suppliers,
                ${amountSql} AS amount
            FROM PurchaseItems pi
            INNER JOIN PurchaseInvoices pinv ON pinv.ID = pi.inv_id
            WHERE COALESCE(pinv.ztime,pinv.inv_date) >= @fromDate
              AND COALESCE(pinv.ztime,pinv.inv_date) < @toDateExclusive;
        `);

    const row = result.recordset?.[0] || {};
    return {
        invoices: n(row.invoices),
        lines: n(row.lines),
        products: n(row.products),
        suppliers: n(row.suppliers),
        amount: round(row.amount),
        amountBasis: safeTotalColumn ? `PurchaseInvoices.${safeTotalColumn}` : 'PurchaseItems.CostPrice (fallback)'
    };
}

async function getSupplierRows({ branchId, fromDate, toDate, connection }) {
    const pool = await getBranchPool(validateBranchId(branchId), connection);
    const rangeEnd = new Date(`${toDate}T00:00:00.000Z`);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);
    const toExclusive = rangeEnd.toISOString().slice(0, 10);

    const meta = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PurchaseInvoices'
          AND COLUMN_NAME IN ('Total','total','NetTotal','net_total','GrandTotal','grand_total');
    `);
    const totalColumn = meta.recordset?.[0]?.COLUMN_NAME || null;
    const safeTotalColumn = totalColumn ? totalColumn.replace(/[^A-Za-z0-9_]/g, '') : null;
    const amountSql = safeTotalColumn
        ? `MAX(COALESCE(pinv.[${safeTotalColumn}],0))`
        : `SUM(COALESCE(pi.CostPrice,0))`;

    const result = await pool.request()
        .input('fromDate', `${fromDate} 00:00:00`)
        .input('toDateExclusive', `${toExclusive} 00:00:00`)
        .query(`
            SET NOCOUNT ON;
            SELECT TOP 30
                COALESCE(CAST(pinv.vendor_id AS varchar(50)),'ط؛ظٹط± ظ…ط­ط¯ط¯') AS supplierId,
                COUNT(DISTINCT pinv.ID) AS invoices,
                COUNT(*) AS lines,
                COUNT(DISTINCT pi.item_id) AS products,
                COALESCE(SUM(${amountSql}),0) AS amount
            FROM PurchaseItems pi
            INNER JOIN PurchaseInvoices pinv ON pinv.ID = pi.inv_id
            WHERE COALESCE(pinv.ztime,pinv.inv_date) >= @fromDate
              AND COALESCE(pinv.ztime,pinv.inv_date) < @toDateExclusive
            GROUP BY pinv.vendor_id
            ORDER BY amount DESC;
        `);

    return (result.recordset || []).map(r => ({
        supplierId: String(r.supplierId),
        invoices: n(r.invoices),
        lines: n(r.lines),
        products: n(r.products),
        amount: round(r.amount)
    }));
}

async function getInventorySnapshot({ branchId, connection }) {
    const pool = await getBranchPool(validateBranchId(branchId), connection);
    const columns = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='Items'
          AND COLUMN_NAME IN ('CurrentUnits','currentUnits','OnHand','Stock','CurrentStock','InStock','Available','AvailableUnits');
    `);
    const names = (columns.recordset || []).map(x => x.COLUMN_NAME);
    const stockColumn = names[0] || null;
    if (!stockColumn) {
        return { available: false, column: null, items: 0, positiveStockItems: 0, negativeStockItems: 0, totalStock: 0 };
    }
    const safeColumn = stockColumn.replace(/[^A-Za-z0-9_]/g, '');
    const result = await pool.request().query(`
        SELECT
            COUNT(*) AS items,
            SUM(CASE WHEN COALESCE([${safeColumn}],0) > 0 THEN 1 ELSE 0 END) AS positiveStockItems,
            SUM(CASE WHEN COALESCE([${safeColumn}],0) < 0 THEN 1 ELSE 0 END) AS negativeStockItems,
            COALESCE(SUM(COALESCE([${safeColumn}],0)),0) AS totalStock
        FROM Items;
    `);
    const row = result.recordset?.[0] || {};
    return {
        available: true,
        column: stockColumn,
        items: n(row.items),
        positiveStockItems: n(row.positiveStockItems),
        negativeStockItems: n(row.negativeStockItems),
        totalStock: round(row.totalStock)
    };
}

async function moduleSales(ctx, moduleId, allBranches = false) {
    if (allBranches || moduleId === 'branch-comparison' || moduleId === 'branch-ranking') {
        const group = await getGroupSalesOverview(ctx);
        return {
            title: 'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',
            subtitle: 'ط£ط¯ط§ط، ط§ظ„ظ…ط¬ظ…ظˆط¹ط© ظˆظ…ظ‚ط§ط±ظ†ط© ط§ظ„ظپط±ظˆط¹',
            kpis: [
                k('ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ', group.summary.sales, 'money'),
                k('ط¹ط¯ط¯ ط§ظ„ظپظˆط§طھظٹط±', group.summary.invoices, 'number'),
                k('ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط©', group.summary.averageTicket, 'money'),
                k('ط§ظ„ط±ط¨ط­', group.summary.profit, 'money'),
                k('ظ‡ط§ظ…ط´ ط§ظ„ط±ط¨ط­', group.summary.margin, 'percent')
            ],
            tables: [{
                title: 'ظ…ظ‚ط§ط±ظ†ط© ط§ظ„ظپط±ظˆط¹',
                columns: ['ط§ظ„ظپط±ط¹','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط©','ط§ظ„ط±ط¨ط­','ط§ظ„ظ‡ط§ظ…ط´'],
                rows: (group.branches || []).map(b => [b.branchId,b.sales,b.invoices,b.averageTicket,b.profit,b.margin])
            }],
            diagnosis: diagnosis([
                group.branches?.[0] ? `ط£ط¹ظ„ظ‰ ظپط±ط¹ ظ…ط¨ظٹط¹ظ‹ط§: ط§ظ„ظپط±ط¹ ${group.branches[0].branchId}.` : null,
                group.failed?.length ? `ظ‡ظ†ط§ظƒ ${group.failed.length} ظپط±ظˆط¹ طھط¹ط°ط± طھط­ظ„ظٹظ„ظ‡ط§.` : null
            ])
        };
    }

    if (moduleId === 'sales-trend') {
        const days = await getSalesByDay(ctx);
        const recent = days.slice(-90);
        const currentTotal = recent.reduce((sum, x) => sum + n(x.netSales), 0);
        return {
            title: 'ط§طھط¬ط§ظ‡ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',
            subtitle: 'Sales Trend ظٹظˆظ…ظٹ ظ…ط¹ ط¹ط¯ط¯ ط§ظ„ظپظˆط§طھظٹط± ظˆط§ظ„ط±ط¨ط­',
            kpis: [
                k('ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظپطھط±ط©', currentTotal, 'money'),
                k('ظ…طھظˆط³ط· ط§ظ„ظٹظˆظ…', recent.length ? currentTotal / recent.length : 0, 'money'),
                k('ط£ظٹط§ظ… ظ…ط³ط¬ظ„ط©', recent.length, 'number')
            ],
            sections: [{ title: 'Sales Trend', kind: 'line', data: recent }],
            diagnosis: diagnosis([
                recent.length >= 2 ? `ط£ط¹ظ„ظ‰ ظٹظˆظ… ظ…ط¨ظٹط¹ط§طھ: ${[...recent].sort((a,b)=>n(b.netSales)-n(a.netSales))[0].date}.` : null
            ])
        };
    }

    if (moduleId === 'sales-day-hour') {
        const [days, hours] = await Promise.all([getSalesByDay(ctx), getSalesByHour(ctx)]);
        const peak = [...hours].sort((a,b)=>n(b.netSales)-n(a.netSales)).slice(0,5);
        const bestDays = [...days].sort((a,b)=>n(b.netSales)-n(a.netSales)).slice(0,7);
        return {
            title: 'ط§ظ„ظٹظˆظ… / ط§ظ„ط³ط§ط¹ط©',
            subtitle: 'ط³ظ„ظˆظƒ ط§ظ„ظ…ط¨ظٹط¹ط§طھ ط­ط³ط¨ ط§ظ„ظٹظˆظ… ظˆط§ظ„ط³ط§ط¹ط© ظˆط³ط§ط¹ط§طھ ط§ظ„ط°ط±ظˆط©',
            kpis: [
                k('ط£ظپط¶ظ„ ط³ط§ط¹ط©', peak[0]?.hour ?? 0, 'number'),
                k('ظ…ط¨ظٹط¹ط§طھ ط£ظپط¶ظ„ ط³ط§ط¹ط©', peak[0]?.netSales ?? 0, 'money'),
                k('ط£ظپط¶ظ„ ظٹظˆظ…', bestDays[0]?.date ?? 'â€”', 'number')
            ],
            tables: [
                { title:'ط³ط§ط¹ط§طھ ط§ظ„ط°ط±ظˆط©', columns:['ط§ظ„ط³ط§ط¹ط©','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ط§ظ„ط±ط¨ط­'], rows:peak.map(x=>[x.hour,x.netSales,x.tickets,x.profit]) },
                { title:'ط£ظپط¶ظ„ ط§ظ„ط£ظٹط§ظ…', columns:['ط§ظ„طھط§ط±ظٹط®','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ط§ظ„ط±ط¨ط­'], rows:bestDays.map(x=>[x.date,x.netSales,x.tickets,x.profit]) }
            ],
            diagnosis: diagnosis([peak[0] ? `ط³ط§ط¹ط© ط§ظ„ط°ط±ظˆط© ط§ظ„ط­ط§ظ„ظٹط©: ${peak[0].hour}:00.` : null])
        };
    }

    if (moduleId === 'sales-sellers') {
        const rows = await getSales(ctx);
        const sellers = sellerRows(rows);
        const total = sellers.reduce((sum, x) => sum + x.sales, 0);
        return {
            title:'ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط¨ط§ط¦ط¹ظٹظ†',
            subtitle:'Top Sellers ظˆظ…ط³ط§ظ‡ظ…ط© ظƒظ„ ظ…ظˆط¸ظپ ظپظٹ ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظپط±ط¹',
            kpis:[
                k('ط§ظ„ط¨ط§ط¦ط¹ظˆظ†', sellers.length, 'number'),
                k('ط§ظ„ظ…ط¨ظٹط¹ط§طھ', total, 'money'),
                k('ط£ط¹ظ„ظ‰ ظ…ط³ط§ظ‡ظ…ط©', sellers[0] ? (sellers[0].sales / Math.max(total,1))*100 : 0, 'percent')
            ],
            tables:[{title:'Top Sellers',columns:['ط§ظ„ط¨ط§ط¦ط¹','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط©','ط§ظ„ظˆط­ط¯ط§طھ','ط§ظ„ظ…ط³ط§ظ‡ظ…ط©'],rows:sellers.slice(0,30).map(x=>[x.sellerId,x.sales,x.tickets,x.averageInvoice,x.units,total?round(x.sales/total*100):0])}],
            diagnosis:diagnosis([sellers[0]?`ط£ط¹ظ„ظ‰ ط¨ط§ط¦ط¹ ظپظٹ ط§ظ„ظپطھط±ط©: ${sellers[0].sellerId}.`:null])
        };
    }

    if (moduleId === 'sales-returns') {
        const summary = await getSalesSummary(ctx);
        return {
            title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ط±طھط¬ط¹ط§طھ',
            subtitle:'ظ‚ظٹظ…ط© ظˆظ†ط³ط¨ط© ط§ظ„ظ…ط±طھط¬ط¹ط§طھ ظˆطھط£ط«ظٹط±ظ‡ط§ ط¹ظ„ظ‰ طµط§ظپظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',
            kpis:[
                k('Gross Sales',summary.grossSales,'money'),
                k('Returns',summary.returns,'money'),
                k('Return Rate',summary.returnRate,'percent'),
                k('Return Invoices',summary.returnTickets,'number')
            ],
            tables:[{title:'Return Impact',columns:['ط§ظ„ظ…ط¤ط´ط±','ط§ظ„ظ‚ظٹظ…ط©'],rows:[['Gross Sales',summary.grossSales],['Returns',summary.returns],['Net Sales',summary.netSales],['Return Rate %',summary.returnRate],['Return Invoices',summary.returnTickets]]}],
            diagnosis:diagnosis([summary.returnRate>5?`ظ†ط³ط¨ط© ط§ظ„ظ…ط±طھط¬ط¹ط§طھ ظ…ط±طھظپط¹ط©: ${round(summary.returnRate,1)}%.`:null,summary.returnTickets>0?`ط¹ط¯ط¯ ظپظˆط§طھظٹط± ط§ظ„ظ…ط±طھط¬ط¹: ${summary.returnTickets}.`:null])
        };
    }

    const [current, delivery] = await Promise.all([
        getSalesSummary(ctx),
        getDeliverySummary(ctx)
    ]);
    const previous = previousSameLength(ctx.fromDate, ctx.toDate);
    let prev = null;
    try { prev = await getSalesSummary({ ...ctx, ...previous }); } catch {}
    const days = periodDays(ctx.fromDate, ctx.toDate);
    const growth = pct(current.netSales, prev?.netSales);
    const dailyRows = await getSalesByDay(ctx);
    const periodic = rollupDaily(dailyRows).slice(-36);
    return {
        title: 'ظ†ط¸ط±ط© ط¹ط§ظ…ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',
        subtitle: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھطŒ ط§ظ„ظپظˆط§طھظٹط±طŒ ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط©طŒ ط§ظ„ط¯ظ„ظٹظپط±ظٹ ظˆط§ظ„طھط´ط®ظٹطµ',
        kpis: [
            k('ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ', current.netSales, 'money', growth),
            k('ط¹ط¯ط¯ ط§ظ„ظپظˆط§طھظٹط±', current.saleTickets, 'number', pct(current.saleTickets, prev?.saleTickets)),
            k('ظ…طھظˆط³ط· ظ‚ظٹظ…ط© ط§ظ„ظپط§طھظˆط±ط©', current.averageTicket, 'money', pct(current.averageTicket, prev?.averageTicket)),
            k('ط§ظ„ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظٹظˆظ…ظٹط©', current.netSales / days, 'money'),
            k('ظ‡ط§ظ…ط´ ط§ظ„ط±ط¨ط­', current.grossMargin, 'percent'),
            k('ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط¯ظ„ظٹظپط±ظٹ', delivery.deliverySales, 'money'),
            k('ط·ظ„ط¨ط§طھ ط§ظ„ط¯ظ„ظٹظپط±ظٹ', delivery.deliveryTickets, 'number')
        ],
        tables:[
            {title:'ظ…ط¤ط´ط±ط§طھ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',columns:['ط§ظ„ظ…ط¤ط´ط±','ط§ظ„ظ‚ظٹظ…ط©'],rows:[['Gross Sales',current.grossSales],['Net Sales',current.netSales],['Cost',current.netCost],['Gross Profit',current.netProfit],['Margin %',current.grossMargin],['Average Basket',current.averageTicket]]},
            {title:'ط§ظ„ظٹظˆظ…ظٹ / ط§ظ„ط£ط³ط¨ظˆط¹ظٹ / ط§ظ„ط´ظ‡ط±ظٹ / ط§ظ„ط³ظ†ظˆظٹ',columns:['ط§ظ„ظپطھط±ط©','ط§ظ„طھط§ط±ظٹط®','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ط§ظ„ط±ط¨ط­'],rows:periodic.map(x=>[x.periodType,x.key,x.sales,x.tickets,x.profit])}
        ],
        diagnosis:diagnosis([
            growth !== null && growth < 0 ? `ط§ظ„ظ…ط¨ظٹط¹ط§طھ ط§ظ†ط®ظپط¶طھ ${Math.abs(growth)}% ط¹ظ† ط§ظ„ظپطھط±ط© ط§ظ„ط³ط§ط¨ظ‚ط©.` : null,
            current.returnRate > 5 ? `ظ†ط³ط¨ط© ط§ظ„ظ…ط±طھط¬ط¹ط§طھ ظ…ط±طھظپط¹ط© (${round(current.returnRate,1)}%).` : null,
            delivery.deliveryTickets > 0 ? `ط§ظ„ط¯ظ„ظٹظپط±ظٹ ظٹظ…ط«ظ„ ${round(delivery.deliveryShare || 0,1)}% ظ…ظ† طµط§ظپظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ.` : 'ظ„ط§ طھظˆط¬ط¯ ظ…ط¨ظٹط¹ط§طھ ط¯ظ„ظٹظپط±ظٹ ظپظٹ ط§ظ„ظپطھط±ط©.'
        ])
    };
}

async function moduleProducts(ctx, moduleId) {
    if (moduleId === 'product-stock') {
        return moduleInventory(ctx);
    }

    if (moduleId === 'product-top' || moduleId === 'product-overview') {
        const top = await getTopProducts({ ...ctx, limit: 30 });
        return {
            title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ',
            subtitle:'ط£ظپط¶ظ„ ط§ظ„ظ…ظ†طھط¬ط§طھ ط­ط³ط¨ ط§ظ„ظ…ط¨ظٹط¹ط§طھ ظˆط§ظ„ظƒظ…ظٹط© ظˆط§ظ„ظ…ط³ط§ظ‡ظ…ط©',
            kpis:[
                k('ط¹ط¯ط¯ ط§ظ„ظ…ظ†طھط¬ط§طھ',top.totalProducts,'number'),
                k('Top 1 Sales',top.products?.[0]?.netSales||0,'money'),
                k('Top 1 Units',top.products?.[0]?.units||0,'number')
            ],
            tables:[{title:'ط£ظپط¶ظ„ ط§ظ„ظ…ظ†طھط¬ط§طھ',columns:['ط§ظ„ظ…ظ†طھط¬','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظˆط­ط¯ط§طھ','ط§ظ„ط±ط¨ط­','ط§ظ„ظ‡ط§ظ…ط´','ط§ظ„ظپظˆط§طھظٹط±'],rows:(top.products||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.units,p.grossProfit,p.margin,p.tickets])}],
            diagnosis:diagnosis([top.products?.[0]?`ط§ظ„ظ…ظ†طھط¬ ط§ظ„ط£ظˆظ„: ${top.products[0].itemName}.`:null])
        };
    }

    if (moduleId === 'product-profitability') {
        const profitability = await getProductProfitability({...ctx, limit:30});
        return {
            title:'ط±ط¨ط­ظٹط© ط§ظ„ظ…ظ†طھط¬ط§طھ',
            subtitle:'Profitability ط­ط³ط¨ ط§ظ„ظ…ظ†طھط¬ ظ…ط¹ ظƒط´ظپ ط§ظ„ط®ط³ط§ط¦ط± ظˆط§ظ„ظ‡ظˆط§ظ…ط´ ط§ظ„ط³ظ„ط¨ظٹط©',
            kpis:[
                k('ط§ظ„ظ…ظ†طھط¬ط§طھ',profitability.summary?.rows||0,'number'),
                k('Net Sales',profitability.summary?.netSales||0,'money'),
                k('Cost',profitability.summary?.cost||0,'money'),
                k('Negative Margin',profitability.summary?.negativeMarginProducts||0,'number')
            ],
            tables:[{title:'ط±ط¨ط­ظٹط© ط§ظ„ظ…ظ†طھط¬ط§طھ',columns:['ط§ظ„ظ…ظ†طھط¬','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„طھظƒظ„ظپط©','ط§ظ„ط±ط¨ط­','ط§ظ„ظ‡ط§ظ…ط´'],rows:(profitability.profitByProduct||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.cost,p.grossProfit,p.margin])}],
            diagnosis:diagnosis([profitability.summary?.negativeMarginProducts>0?`${profitability.summary.negativeMarginProducts} ظ…ظ†طھط¬ط§طھ ط¨ظ‡ط§ظ…ط´ ط³ظ„ط¨ظٹ.`:null])
        };
    }

    const mix = await getProductMixAnalytics(ctx);
    return {
        title:'طھط­ظ„ظٹظ„ Product Mix / ABC',
        subtitle:'ظ…ط²ظٹط¬ ط§ظ„ظ…ظ†طھط¬ط§طھ ظˆط§ظ„طھط±ظƒظٹط² ظˆط§ظ„ظ…ط³ط§ظ‡ظ…ط© ظپظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',
        kpis:[
            k('ط§ظ„ظ…ظ†طھط¬ط§طھ',mix.current?.products||0,'number'),
            k('ط§ظ„ظ…ط¨ظٹط¹ط§طھ',mix.current?.sales||0,'money'),
            k('ط§ظ„ظˆط­ط¯ط§طھ',mix.current?.units||0,'number'),
            k('Units/Invoice',mix.current?.unitsPerInvoice||0,'number')
        ],
        tables:[{title:'Product Mix',columns:['ط§ظ„ظ…ط¤ط´ط±','ط§ظ„ظ‚ظٹظ…ط©'],rows:[['Products',mix.current?.products],['Sales',mix.current?.sales],['Units',mix.current?.units],['Invoices',mix.current?.invoices],['Units/Invoice',mix.current?.unitsPerInvoice],['Concentration',mix.current?.concentration?.top10Share]]}],
        diagnosis:diagnosis([mix.diagnosis?.[0]?.message||null])
    };
}

async function moduleCustomers(ctx, moduleId) {

    if (
        moduleId === 'customer-rfm' ||
        moduleId === 'customer-overview'
    ) {

        const rfm =
            await getCustomerRfm({
                ...ctx,
                limit: 30
            });


        return {

            title:
                'Customer Intelligence — RFM',

            subtitle:
                'Recency / Frequency / Monetary وتقسيم العملاء',


            summary:
                rfm.summary || {

                    customers:
                        0,

                    averageRecencyDays:
                        0,

                    averageFrequency:
                        0,

                    averageMonetary:
                        0,

                    segments:
                        []

                },


            customers:
                rfm.customers || [],


            statistics:
                rfm.statistics || [],


            topSales:
                rfm.topSales || [],


            topFrequency:
                rfm.topFrequency || [],


            lostCustomers:
                rfm.lostCustomers || [],


            riskCustomers:
                rfm.riskCustomers || [],


            kpis: [

                k(
                    'العملاء',
                    rfm.summary?.customers || 0,
                    'number'
                ),

                k(
                    'Avg Recency',
                    rfm.summary?.averageRecencyDays || 0,
                    'number'
                ),

                k(
                    'Avg Frequency',
                    rfm.summary?.averageFrequency || 0,
                    'number'
                ),

                k(
                    'Avg Monetary',
                    rfm.summary?.averageMonetary || 0,
                    'money'
                )

            ],


            tables: [

                {
                    title:
                        'Segments',

                    columns: [
                        'Segment',
                        'Customers'
                    ],

                    rows:
                        Object.entries(
                            rfm.summary?.segments || {}
                        ).map(
                            ([name, value]) => [

                                name,

                                value?.customers ??
                                value ??
                                0

                            ]
                        )
                },


                {
                    title:
                        'Top Customers',

                    columns: [
                        'Customer',
                        'Recency',
                        'Frequency',
                        'Monetary',
                        'Segment'
                    ],

                    rows:
                        (rfm.customers || [])
                            .slice(0, 30)
                            .map(
                                customer => [

                                    customer.customerName ||
                                    customer.customerId ||
                                    '-',

                                    customer.recencyDays ??
                                    '-',

                                    customer.tickets ??
                                    0,

                                    customer.netSales ??
                                    0,

                                    customer.segment ||
                                    customer.segmentName ||
                                    '-'

                                ]
                            )
                }

            ],


            diagnosis:
                []

        };

    }


    if (
        moduleId ===
        'customer-retention'
    ) {

        const r =
            await getCustomerRetention(
                ctx
            );

        return {

            title:
                'Customer Retention',

            subtitle:
                'الاحتفاظ بالعملاء ومعدل الفقد',

            summary:
                r.retention || {},

            kpis: [

                k(
                    'Retention Rate',
                    r.retention?.retentionRate || 0,
                    'percent'
                ),

                k(
                    'Retained',
                    r.retention?.retainedCustomers || 0,
                    'number'
                ),

                k(
                    'Lost',
                    r.retention?.lostCustomers || 0,
                    'number'
                )

            ],

            tables: [

                {
                    title:
                        'Retention',

                    columns: [
                        'المؤشر',
                        'القيمة'
                    ],

                    rows: [

                        [
                            'Previous Customers',
                            r.retention?.previousCustomers
                        ],

                        [
                            'Retained',
                            r.retention?.retainedCustomers
                        ],

                        [
                            'Lost',
                            r.retention?.lostCustomers
                        ],

                        [
                            'Retention Rate',
                            r.retention?.retentionRate
                        ]

                    ]

                }

            ],

            diagnosis: [

                r.retention?.retentionRate < 70
                    ? معدل الاحتفاظ % ويحتاج تدخلًا.
                    : null

            ]

        };

    }


    if (
        moduleId ===
        'customer-churn'
    ) {

        const [
            inactivity,
            retention
        ] = await Promise.all([

            getCustomerInactivity({

                branchId:
                    ctx.branchId,

                toDate:
                    ctx.toDate,

                sampleLimit:
                    30

            }),

            getCustomerRetention(
                ctx
            )

        ]);


        return {

            title:
                'Churn / عدم النشاط',

            subtitle:
                'Lost وAt-Risk والعملاء غير النشطين',

            summary: {

                customers:
                    inactivity.summary?.customers || 0,

                lostCustomers:
                    retention.retention?.lostCustomers || 0,

                retentionRate:
                    retention.retention?.retentionRate || 0

            },

            kpis: [

                k(
                    'Inactive',
                    inactivity.summary?.customers || 0,
                    'number'
                ),

                k(
                    'Lost',
                    retention.retention?.lostCustomers || 0,
                    'number'
                ),

                k(
                    'Retention',
                    retention.retention?.retentionRate || 0,
                    'percent'
                )

            ],

            tables: [

                {
                    title:
                        'Churn Signals',

                    columns: [
                        'المؤشر',
                        'القيمة'
                    ],

                    rows: [

                        [
                            'Inactive',
                            inactivity.summary?.customers
                        ],

                        [
                            'Lost',
                            retention.retention?.lostCustomers
                        ],

                        [
                            'Retained',
                            retention.retention?.retainedCustomers
                        ]

                    ]

                }

            ],

            diagnosis: [

                inactivity.summary?.customers > 0
                    ? ${inactivity.summary.customers} عميل غير نشطين حسب تعريف الخدمة.
                    : null

            ]

        };

    }


    if (
        moduleId ===
        'customer-clv'
    ) {

        const c =
            await getCustomerClv({
                ...ctx,
                limit: 30
            });


        return {

            title:
                'Customer Lifetime Value — CLV',

            subtitle:
                'قيمة العميل العمرية وقيمة الطلب والتكرار',

            summary:
                c.summary || {},

            customers:
                c.customers || [],

            kpis: [

                k(
                    'Customers',
                    c.summary?.customers || 0,
                    'number'
                ),

                k(
                    'Avg CLV',
                    c.summary?.averageCustomerValue || 0,
                    'money'
                ),

                k(
                    'Avg Order',
                    c.summary?.averageOrderValue || 0,
                    'money'
                ),

                k(
                    'Avg Monthly Frequency',
                    c.summary?.averageMonthlyFrequency || 0,
                    'number'
                )

            ],

            tables: [

                {
                    title:
                        'Top CLV Customers',

                    columns: [
                        'Customer',
                        'CLV',
                        'Orders',
                        'Avg Order'
                    ],

                    rows:
                        (c.customers || [])
                            .slice(0, 30)
                            .map(
                                customer => [

                                    customer.customerName ||
                                    customer.customerId ||
                                    '-',

                                    customer.customerValue ??
                                    customer.clv ??
                                    0,

                                    customer.orders ||
                                    0,

                                    customer.averageOrderValue ||
                                    0

                                ]
                            )

                }

            ],

            diagnosis:
                []

        };

    }


    const cohort =
        await getCustomerCohort({
            ...ctx,
            maxMonths: 12
        });


    return {

        title:
            'Customer Cohort Analysis',

        subtitle:
            'تطور cohorts عبر الزمن',

        summary:
            cohort.summary || {},

        kpis: [

            k(
                'Cohorts',
                cohort.summary?.cohorts || 0,
                'number'
            ),

            k(
                'Customers',
                cohort.summary?.customers || 0,
                'number'
            ),

            k(
                'Observed Sales',
                cohort.summary?.observedSales || 0,
                'money'
            )

        ],

        tables: [

            {
                title:
                    'Cohorts',

                columns: [
                    'Cohort',
                    'Customers',
                    'Observed Sales'
                ],

                rows:
                    (cohort.cohorts || [])
                        .slice(0, 20)
                        .map(
                            item => [

                                item.cohortMonth,

                                item.customers,

                                item.observedSales

                            ]
                        )

            }

        ],

        diagnosis:
            []

    };

}


async function moduleStaff(ctx) {
    const rows = await getSales(ctx);
    const sellers = sellerRows(rows);
    const total = sellers.reduce((s,x)=>s+x.sales,0);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ظˆط¸ظپظٹظ† / ط§ظ„ط¨ط§ط¦ط¹ظٹظ†', subtitle:'Top SellersطŒ ط§ظ„ظپظˆط§طھظٹط±طŒ ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط© ظˆط§ظ„ظ…ط³ط§ظ‡ظ…ط©',
        kpis:[k('ط¹ط¯ط¯ ط§ظ„ط¨ط§ط¦ط¹ظٹظ†',sellers.length,'number'),k('ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ',total,'money'),k('ط£ط¹ظ„ظ‰ ط¨ط§ط¦ط¹',sellers[0]?.sales||0,'money')],
        tables:[{title:'Top Sellers',columns:['ط§ظ„ط¨ط§ط¦ط¹','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ظ…طھظˆط³ط· ط§ظ„ظپط§طھظˆط±ط©','ط§ظ„ظˆط­ط¯ط§طھ','ط§ظ„ظ…ط³ط§ظ‡ظ…ط©'],rows:sellers.slice(0,30).map(x=>[x.sellerId,x.sales,x.tickets,x.averageInvoice,x.units,total?round(x.sales/total*100):0])}],
        diagnosis:diagnosis([sellers[0]?`ط£ط¹ظ„ظ‰ ط¨ط§ط¦ط¹ ظپظٹ ط§ظ„ظپطھط±ط©: ${sellers[0].sellerId}.`:null,sellers.at(-1)?`ط£ظ‚ظ„ ظ…ط³ط§ظ‡ظ…ط© ط¨ظٹظ† ط§ظ„ط¨ط§ط¦ط¹ظٹظ†: ${sellers.at(-1).sellerId}.`:null])
    };
}

async function moduleProfitability(ctx) {
    const [summary, products] = await Promise.all([getSalesSummary(ctx),getProductProfitability({...ctx,limit:20})]);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ط±ط¨ط­ظٹط©', subtitle:'Sales â†’ Cost â†’ Profit â†’ Margin + طھط­ظ„ظٹظ„ ط§ظ„ظ…ظ†طھط¬ط§طھ ظ…ظ†ط®ظپط¶ط© ط§ظ„ط±ط¨ط­ظٹط©',
        kpis:[k('Gross Sales',summary.grossSales,'money'),k('Net Sales',summary.netSales,'money'),k('Cost',summary.netCost,'money'),k('Gross Profit',summary.netProfit,'money'),k('Profit Margin',summary.grossMargin,'percent')],
        tables:[{title:'ط±ط¨ط­ظٹط© ط§ظ„ظ…ظ†طھط¬ط§طھ',columns:['ط§ظ„ظ…ظ†طھط¬','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„طھظƒظ„ظپط©','ط§ظ„ط±ط¨ط­','ط§ظ„ظ‡ط§ظ…ط´'],rows:(products.profitByProduct||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.cost,p.grossProfit,p.margin])}],
        diagnosis:diagnosis([
            summary.netProfit < 0 ? 'ط§ظ„ظپط±ط¹ ظٹط­ظ‚ظ‚ ط®ط³ط§ط±ط© طµط§ظپظٹط© ظپظٹ ط§ظ„ظپطھط±ط©.' : null,
            products.summary?.negativeMarginProducts > 0 ? `${products.summary.negativeMarginProducts} ظ…ظ†طھط¬ط§طھ ط¨ظ‡ط§ظ…ط´ ط³ظ„ط¨ظٹ.` : null,
            summary.reconciliation?.ticketsWithDifference > 0 ? `${summary.reconciliation.ticketsWithDifference} ظپظˆط§طھظٹط± ط¨ظ‡ط§ ظپط±ظ‚ ظپظٹ ط§ظ„ظ…ط·ط§ط¨ظ‚ط©.` : null
        ])
    };
}

async function moduleBranches(ctx) {
    const group = await getGroupSalesOverview(ctx);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظپط±ظˆط¹', subtitle:'Branch PerformanceطŒ طھط±طھظٹط¨ ظˆظ…ظ‚ط§ط±ظ†ط© ط§ظ„ظ†ظ…ظˆ ظˆط§ظ„ط±ط¨ط­ظٹط©',
        kpis:[k('ط§ظ„ظپط±ظˆط¹',group.summary.branches,'number'),k('ط§ظ„ظ…ط¨ظٹط¹ط§طھ',group.summary.sales,'money'),k('ط§ظ„ط±ط¨ط­',group.summary.profit,'money'),k('ط§ظ„ظ‡ط§ظ…ط´',group.summary.margin,'percent')],
        tables:[{title:'Branch Ranking',columns:['ط§ظ„طھط±طھظٹط¨','ط§ظ„ظپط±ط¹','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±','ط§ظ„ط±ط¨ط­','ط§ظ„ظ‡ط§ظ…ط´'],rows:(group.branches||[]).map((b,i)=>[i+1,b.branchId,b.sales,b.invoices,b.profit,b.margin])}],
        diagnosis:diagnosis([(group.branches||[])[0]?`ط£ط¹ظ„ظ‰ ظپط±ط¹ ظ…ط¨ظٹط¹ظ‹ط§: ${group.branches[0].branchId}.`:null])
    };
}

async function moduleInventory(ctx) {
    const [rows,snapshot] = await Promise.all([getSales(ctx),getInventorySnapshot({branchId:ctx.branchId,connection:ctx.connection})]);
    const movers=movementRows(rows);
    const slow=[...movers].sort((a,b)=>a.units-b.units).slice(0,15);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ط®ط²ظˆظ†', subtitle:'ط­ط±ظƒط© ط§ظ„ط£طµظ†ط§ظپ ظˆط³ط±ط¹ط© ط§ظ„ط¯ظˆط±ط§ظ† ظˆظ…ط®ط§ط·ط± ط§ظ„ط±ظƒظˆط¯',
        kpis:[k('ط§ظ„ط£طµظ†ط§ظپ ط§ظ„ظ…طھط­ط±ظƒط©',movers.length,'number'),k('ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ط¨ط§ط¹ط©',movers.reduce((s,x)=>s+x.units,0),'number'),k('Positive Stock',snapshot.positiveStockItems,'number'),k('Negative Stock',snapshot.negativeStockItems,'number')],
        tables:[
            {title:'Fast Movers',columns:['ط§ظ„طµظ†ظپ','ط§ظ„ظˆط­ط¯ط§طھ','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±'],rows:movers.slice(0,20).map(x=>[x.itemName,x.units,x.sales,x.tickets])},
            {title:'Slow / Dead Candidates',columns:['ط§ظ„طµظ†ظپ','ط§ظ„ظˆط­ط¯ط§طھ','ط§ظ„ظ…ط¨ظٹط¹ط§طھ'],rows:slow.map(x=>[x.itemName,x.units,x.sales])}
        ],
        diagnosis:diagnosis([
            snapshot.negativeStockItems>0?`${snapshot.negativeStockItems} طµظ†ظپظ‹ط§ ط¨ظ‚ظٹظ…ط© ظ…ط®ط²ظˆظ† ط³ط§ظ„ط¨ط© ط­ط³ط¨ ط¹ظ…ظˆط¯ ${snapshot.column}.`:null,
            slow.length?`${slow.length} ط£طµظ†ط§ظپ ظ…ط±ط´ط­ط© ظ„ظ„ط±ظƒظˆط¯ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط­ط±ظƒط© ط§ظ„ط¨ظٹط¹.`:null
        ])
    };
}

async function moduleProcurement(ctx) {
    const p = await getProcurementRows(ctx);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ط´طھط±ظٹط§طھ', subtitle:'ط­ط¬ظ… ط§ظ„ط´ط±ط§ط،طŒ ط§ظ„ظپظˆط§طھظٹط± ظˆط§ظ„ط£طµظ†ط§ظپ ظˆط§ظ„ظ…ظˆط±ط¯ظٹظ†',
        kpis:[k('ظپظˆط§طھظٹط± ط´ط±ط§ط،',p.invoices,'number'),k('ط³ط·ظˆط± ط´ط±ط§ط،',p.lines,'number'),k('ط£طµظ†ط§ظپ ظ…ط´طھط±ط§ط©',p.products,'number'),k('ظ…ظˆط±ط¯ظˆظ†',p.suppliers,'number'),k('ظ‚ظٹظ…ط© ط§ظ„ظ…ط´طھط±ظٹط§طھ',p.amount,'money')],
        tables:[{title:'Purchase KPIs',columns:['ط§ظ„ظ…ط¤ط´ط±','ط§ظ„ظ‚ظٹظ…ط©'],rows:[['ظپظˆط§طھظٹط± ط´ط±ط§ط،',p.invoices],['ط³ط·ظˆط± ط´ط±ط§ط،',p.lines],['ط£طµظ†ط§ظپ ظ…ط´طھط±ط§ط©',p.products],['ظ…ظˆط±ط¯ظˆظ†',p.suppliers],['ظ‚ظٹظ…ط© ط§ظ„ظ…ط´طھط±ظٹط§طھ',p.amount],['ط£ط³ط§ط³ ط§ظ„ظ‚ظٹظ…ط©',p.amountBasis]]}],
        diagnosis:diagnosis([p.amount>0?'طھظ… طھط³ط¬ظٹظ„ ظ†ط´ط§ط· ط´ط±ط§ط، ظپظٹ ط§ظ„ظپطھط±ط©.':null])
    };
}

async function moduleSuppliers(ctx) {
    const rows=await getSupplierRows(ctx);
    const total=rows.reduce((s,x)=>s+x.amount,0);
    return {
        title:'طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ظˆط±ط¯ظٹظ†', subtitle:'Supplier PerformanceطŒ ط§ظ„ظ…ط³ط§ظ‡ظ…ط© ظˆط§ظ„ط£ط³ط¹ط§ط± ظˆط§ظ„ط§ط¹طھظ…ط§ط¯',
        kpis:[k('ط§ظ„ظ…ظˆط±ط¯ظˆظ†',rows.length,'number'),k('ظ‚ظٹظ…ط© ط§ظ„ط´ط±ط§ط، ط§ظ„ط£ط³ط§ط³ظٹط©',total,'money')],
        tables:[{title:'Supplier Performance',columns:['ط§ظ„ظ…ظˆط±ط¯','ط§ظ„ظپظˆط§طھظٹط±','ط§ظ„ط³ط·ظˆط±','ط§ظ„ط£طµظ†ط§ظپ','ط§ظ„ظ…ط¨ظ„ط؛','ط§ظ„ظ…ط³ط§ظ‡ظ…ط©'],rows:rows.map(x=>[x.supplierId,x.invoices,x.lines,x.products,x.amount,total?round(x.amount/total*100):0])}],
        diagnosis:diagnosis([rows[0]?`ط£ظƒط¨ط± ط§ط¹طھظ…ط§ط¯ ط´ط±ط§ط¦ظٹ ط­ط§ظ„ظٹ ط¹ظ„ظ‰ ط§ظ„ظ…ظˆط±ط¯ ${rows[0].supplierId}.`:null])
    };
}

async function moduleForecast(ctx) {
    const days=await getSalesByDay(ctx);
    const recent=days.slice(-14);
    const avg=recent.length?recent.reduce((s,x)=>s+n(x.netSales),0)/recent.length:0;
    const prior=days.slice(-28,-14);
    const priorAvg=prior.length?prior.reduce((s,x)=>s+n(x.netSales),0)/prior.length:0;
    const growth=pct(avg,priorAvg);
    const forecast7=avg*7;
    return {
        title:'ط§ظ„طھظ†ط¨ط¤ ظˆط§ظ„طھط­ظ„ظٹظ„ط§طھ ط§ظ„ظ…ط³طھظ‚ط¨ظ„ظٹط©', subtitle:'Forecast ظ…ط¨ظ†ظٹ ط¹ظ„ظ‰ ط§ظ„ط§طھط¬ط§ظ‡ ط§ظ„طھط§ط±ظٹط®ظٹ ط§ظ„ظ…طھط§ط­',
        kpis:[k('ظ…طھظˆط³ط· ط§ظ„ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظٹظˆظ…ظٹط©',avg,'money',growth),k('طھظˆظ‚ط¹ 7 ط£ظٹط§ظ…',forecast7,'money'),k('ظ…طھظˆط³ط· 14 ظٹظˆظ… ط³ط§ط¨ظ‚',priorAvg,'money')],
        tables:[{title:'Recent Trend',columns:['ط§ظ„طھط§ط±ظٹط®','ط§ظ„ظ…ط¨ظٹط¹ط§طھ','ط§ظ„ظپظˆط§طھظٹط±'],rows:recent.map(x=>[x.date,x.netSales,x.tickets])}],
        diagnosis:diagnosis([growth!==null?(growth>=0?`ط§ظ„ط§طھط¬ط§ظ‡ ط§ظ„ط£ط®ظٹط± طµط§ط¹ط¯ ط¨ظ†ط³ط¨ط© ${round(growth,1)}% ظ…ظ‚ط§ط±ظ†ط© ط¨ط§ظ„ظ€14 ظٹظˆظ… ط§ظ„ط³ط§ط¨ظ‚ط©.`:`ط§ظ„ط§طھط¬ط§ظ‡ ط§ظ„ط£ط®ظٹط± ظ‡ط§ط¨ط· ط¨ظ†ط³ط¨ط© ${Math.abs(round(growth,1))}%.`):null])
    };
}

async function moduleQuality(ctx) {
    const rows=await getSales(ctx);
    let zero=0, missing=0, suspicious=0;
    for(const r of rows){
        if(n(r.lineCost)===0) zero++;
        if(r.itemId==null) missing++;
        const sales=Math.abs(n(r.netLineValue));
        const cost=Math.abs(n(r.lineCost));
        if(sales>0 && cost>0 && cost>sales*3) suspicious++;
    }
    const rec=await getSalesSummary(ctx);
    return {
        title:'ط¬ظˆط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظˆط§ظ„طھظƒظ„ظپط©', subtitle:'Cost QualityطŒ Missing/Zero/Suspicious + Reconciliation',
        kpis:[k('ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ط·ظˆط±',rows.length,'number'),k('Zero Cost',zero,'number'),k('Missing Reference',missing,'number'),k('Suspicious Cost',suspicious,'number'),k('ظپظˆط§طھظٹط± ط؛ظٹط± ظ…ط·ط§ط¨ظ‚ط©',rec.reconciliation?.ticketsWithDifference||0,'number')],
        tables:[{title:'Data Quality',columns:['ط§ظ„ظ…ط¤ط´ط±','ط§ظ„ظ‚ظٹظ…ط©'],rows:[['Zero Cost',zero],['Missing Reference',missing],['Suspicious Cost',suspicious],['Invalid',0],['Reconciliation Differences',rec.reconciliation?.ticketsWithDifference||0],['Absolute Difference',rec.reconciliation?.absoluteDifference||0]]}],
        diagnosis:diagnosis([zero>0?`${zero} ط³ط·ط± ط¨ط¯ظˆظ† طھظƒظ„ظپط© ط£ظˆ ط¨طھظƒظ„ظپط© طµظپط±.`:null,suspicious>0?`${suspicious} ط³ط·ط± طھظƒظ„ظپط© ظ…ط´طھط¨ظ‡ ط¨ظ‡.`:null,rec.reconciliation?.ticketsWithDifference>0?`ظٹظˆط¬ط¯ ${rec.reconciliation.ticketsWithDifference} ظپظˆط§طھظٹط± طھط­طھط§ط¬ ظ…ط±ط§ط¬ط¹ط©.`:null])
    };
}

export async function getAnalyticsModule({ moduleId, branchId, fromDate, toDate, connection = null, selectedBranchId = null }) {
    const normalizedFrom = validateDate(fromDate,'fromDate');
    const normalizedTo = validateDate(toDate,'toDate');
    const ctx={branchId:branchId === 'all' ? 'all' : Number(branchId),fromDate:normalizedFrom,toDate:normalizedTo,connection};
    const allBranches = selectedBranchId === 'all' || branchId === 'all';
    switch(moduleId){
        case 'sales-overview':
        case 'sales-trend':
        case 'sales-day-hour':
        case 'sales-sellers':
        case 'sales-returns': return moduleSales(ctx, moduleId, allBranches);
        case 'product-overview':
        case 'product-top':
        case 'product-profitability':
        case 'product-abc':
        case 'product-stock': return moduleProducts(ctx, moduleId);
        case 'customer-overview':
        case 'customer-rfm':
        case 'customer-retention':
        case 'customer-churn':
        case 'customer-clv':
        case 'customer-cohort': return moduleCustomers(ctx, moduleId);
        case 'staff-overview':
        case 'staff-sales':
        case 'staff-productivity': return moduleStaff(ctx);
        case 'profit-overview':
        case 'profit-branch':
        case 'profit-product':
        case 'profit-anomalies': return moduleProfitability(ctx);
        case 'branch-overview':
        case 'branch-comparison':
        case 'branch-ranking': return moduleBranches(ctx);
        case 'inventory-overview':
        case 'inventory-risk':
        case 'inventory-reorder': return moduleInventory(ctx);
        case 'purchase-overview':
        case 'purchase-opportunities': return moduleProcurement(ctx);
        case 'supplier-performance': return moduleSuppliers(ctx);
        case 'forecast-sales':
        case 'forecast-demand':
        case 'forecast-inventory': return moduleForecast(ctx);
        case 'quality-overview':
        case 'quality-cost':
        case 'quality-reconciliation': return moduleQuality(ctx);
        default: throw new Error(`Unsupported analytics module: ${moduleId}`);
    }
}

export default { getAnalyticsModule };

