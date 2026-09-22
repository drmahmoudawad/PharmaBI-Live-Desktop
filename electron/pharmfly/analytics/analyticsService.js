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
        const id = row.salesRepId || 'غير محدد';
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
            itemName: row.itemName || 'غير معروف',
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
        for (const [periodType, key] of [['أسبوعي', week], ['شهري', month], ['سنوي', year]]) {
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
                COALESCE(CAST(pinv.vendor_id AS varchar(50)),'غير محدد') AS supplierId,
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
            title: 'تحليلات المبيعات',
            subtitle: 'أداء المجموعة ومقارنة الفروع',
            kpis: [
                k('إجمالي المبيعات', group.summary.sales, 'money'),
                k('عدد الفواتير', group.summary.invoices, 'number'),
                k('متوسط الفاتورة', group.summary.averageTicket, 'money'),
                k('الربح', group.summary.profit, 'money'),
                k('هامش الربح', group.summary.margin, 'percent')
            ],
            tables: [{
                title: 'مقارنة الفروع',
                columns: ['الفرع','المبيعات','الفواتير','متوسط الفاتورة','الربح','الهامش'],
                rows: (group.branches || []).map(b => [b.branchId,b.sales,b.invoices,b.averageTicket,b.profit,b.margin])
            }],
            diagnosis: diagnosis([
                group.branches?.[0] ? `أعلى فرع مبيعًا: الفرع ${group.branches[0].branchId}.` : null,
                group.failed?.length ? `هناك ${group.failed.length} فروع تعذر تحليلها.` : null
            ])
        };
    }

    if (moduleId === 'sales-trend') {
        const days = await getSalesByDay(ctx);
        const recent = days.slice(-90);
        const currentTotal = recent.reduce((sum, x) => sum + n(x.netSales), 0);
        return {
            title: 'اتجاه المبيعات',
            subtitle: 'Sales Trend يومي مع عدد الفواتير والربح',
            kpis: [
                k('مبيعات الفترة', currentTotal, 'money'),
                k('متوسط اليوم', recent.length ? currentTotal / recent.length : 0, 'money'),
                k('أيام مسجلة', recent.length, 'number')
            ],
            sections: [{ title: 'Sales Trend', kind: 'line', data: recent }],
            diagnosis: diagnosis([
                recent.length >= 2 ? `أعلى يوم مبيعات: ${[...recent].sort((a,b)=>n(b.netSales)-n(a.netSales))[0].date}.` : null
            ])
        };
    }

    if (moduleId === 'sales-day-hour') {
        const [days, hours] = await Promise.all([getSalesByDay(ctx), getSalesByHour(ctx)]);
        const peak = [...hours].sort((a,b)=>n(b.netSales)-n(a.netSales)).slice(0,5);
        const bestDays = [...days].sort((a,b)=>n(b.netSales)-n(a.netSales)).slice(0,7);
        return {
            title: 'اليوم / الساعة',
            subtitle: 'سلوك المبيعات حسب اليوم والساعة وساعات الذروة',
            kpis: [
                k('أفضل ساعة', peak[0]?.hour ?? 0, 'number'),
                k('مبيعات أفضل ساعة', peak[0]?.netSales ?? 0, 'money'),
                k('أفضل يوم', bestDays[0]?.date ?? '—', 'number')
            ],
            tables: [
                { title:'ساعات الذروة', columns:['الساعة','المبيعات','الفواتير','الربح'], rows:peak.map(x=>[x.hour,x.netSales,x.tickets,x.profit]) },
                { title:'أفضل الأيام', columns:['التاريخ','المبيعات','الفواتير','الربح'], rows:bestDays.map(x=>[x.date,x.netSales,x.tickets,x.profit]) }
            ],
            diagnosis: diagnosis([peak[0] ? `ساعة الذروة الحالية: ${peak[0].hour}:00.` : null])
        };
    }

    if (moduleId === 'sales-sellers') {
        const rows = await getSales(ctx);
        const sellers = sellerRows(rows);
        const total = sellers.reduce((sum, x) => sum + x.sales, 0);
        return {
            title:'مبيعات البائعين',
            subtitle:'Top Sellers ومساهمة كل موظف في مبيعات الفرع',
            kpis:[
                k('البائعون', sellers.length, 'number'),
                k('المبيعات', total, 'money'),
                k('أعلى مساهمة', sellers[0] ? (sellers[0].sales / Math.max(total,1))*100 : 0, 'percent')
            ],
            tables:[{title:'Top Sellers',columns:['البائع','المبيعات','الفواتير','متوسط الفاتورة','الوحدات','المساهمة'],rows:sellers.slice(0,30).map(x=>[x.sellerId,x.sales,x.tickets,x.averageInvoice,x.units,total?round(x.sales/total*100):0])}],
            diagnosis:diagnosis([sellers[0]?`أعلى بائع في الفترة: ${sellers[0].sellerId}.`:null])
        };
    }

    if (moduleId === 'sales-returns') {
        const summary = await getSalesSummary(ctx);
        return {
            title:'تحليلات المرتجعات',
            subtitle:'قيمة ونسبة المرتجعات وتأثيرها على صافي المبيعات',
            kpis:[
                k('Gross Sales',summary.grossSales,'money'),
                k('Returns',summary.returns,'money'),
                k('Return Rate',summary.returnRate,'percent'),
                k('Return Invoices',summary.returnTickets,'number')
            ],
            tables:[{title:'Return Impact',columns:['المؤشر','القيمة'],rows:[['Gross Sales',summary.grossSales],['Returns',summary.returns],['Net Sales',summary.netSales],['Return Rate %',summary.returnRate],['Return Invoices',summary.returnTickets]]}],
            diagnosis:diagnosis([summary.returnRate>5?`نسبة المرتجعات مرتفعة: ${round(summary.returnRate,1)}%.`:null,summary.returnTickets>0?`عدد فواتير المرتجع: ${summary.returnTickets}.`:null])
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
        title: 'نظرة عامة على المبيعات',
        subtitle: 'إجمالي المبيعات، الفواتير، متوسط الفاتورة، الدليفري والتشخيص',
        kpis: [
            k('إجمالي المبيعات', current.netSales, 'money', growth),
            k('عدد الفواتير', current.saleTickets, 'number', pct(current.saleTickets, prev?.saleTickets)),
            k('متوسط قيمة الفاتورة', current.averageTicket, 'money', pct(current.averageTicket, prev?.averageTicket)),
            k('المبيعات اليومية', current.netSales / days, 'money'),
            k('هامش الربح', current.grossMargin, 'percent'),
            k('مبيعات الدليفري', delivery.deliverySales, 'money'),
            k('طلبات الدليفري', delivery.deliveryTickets, 'number')
        ],
        tables:[
            {title:'مؤشرات المبيعات',columns:['المؤشر','القيمة'],rows:[['Gross Sales',current.grossSales],['Net Sales',current.netSales],['Cost',current.netCost],['Gross Profit',current.netProfit],['Margin %',current.grossMargin],['Average Basket',current.averageTicket]]},
            {title:'اليومي / الأسبوعي / الشهري / السنوي',columns:['الفترة','التاريخ','المبيعات','الفواتير','الربح'],rows:periodic.map(x=>[x.periodType,x.key,x.sales,x.tickets,x.profit])}
        ],
        diagnosis:diagnosis([
            growth !== null && growth < 0 ? `المبيعات انخفضت ${Math.abs(growth)}% عن الفترة السابقة.` : null,
            current.returnRate > 5 ? `نسبة المرتجعات مرتفعة (${round(current.returnRate,1)}%).` : null,
            delivery.deliveryTickets > 0 ? `الدليفري يمثل ${round(delivery.deliveryShare || 0,1)}% من صافي المبيعات.` : 'لا توجد مبيعات دليفري في الفترة.'
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
            title:'تحليلات المنتجات',
            subtitle:'أفضل المنتجات حسب المبيعات والكمية والمساهمة',
            kpis:[
                k('عدد المنتجات',top.totalProducts,'number'),
                k('Top 1 Sales',top.products?.[0]?.netSales||0,'money'),
                k('Top 1 Units',top.products?.[0]?.units||0,'number')
            ],
            tables:[{title:'أفضل المنتجات',columns:['المنتج','المبيعات','الوحدات','الربح','الهامش','الفواتير'],rows:(top.products||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.units,p.grossProfit,p.margin,p.tickets])}],
            diagnosis:diagnosis([top.products?.[0]?`المنتج الأول: ${top.products[0].itemName}.`:null])
        };
    }

    if (moduleId === 'product-profitability') {
        const profitability = await getProductProfitability({...ctx, limit:30});
        return {
            title:'ربحية المنتجات',
            subtitle:'Profitability حسب المنتج مع كشف الخسائر والهوامش السلبية',
            kpis:[
                k('المنتجات',profitability.summary?.rows||0,'number'),
                k('Net Sales',profitability.summary?.netSales||0,'money'),
                k('Cost',profitability.summary?.cost||0,'money'),
                k('Negative Margin',profitability.summary?.negativeMarginProducts||0,'number')
            ],
            tables:[{title:'ربحية المنتجات',columns:['المنتج','المبيعات','التكلفة','الربح','الهامش'],rows:(profitability.profitByProduct||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.cost,p.grossProfit,p.margin])}],
            diagnosis:diagnosis([profitability.summary?.negativeMarginProducts>0?`${profitability.summary.negativeMarginProducts} منتجات بهامش سلبي.`:null])
        };
    }

    const mix = await getProductMixAnalytics(ctx);
    return {
        title:'تحليل Product Mix / ABC',
        subtitle:'مزيج المنتجات والتركيز والمساهمة في المبيعات',
        kpis:[
            k('المنتجات',mix.current?.products||0,'number'),
            k('المبيعات',mix.current?.sales||0,'money'),
            k('الوحدات',mix.current?.units||0,'number'),
            k('Units/Invoice',mix.current?.unitsPerInvoice||0,'number')
        ],
        tables:[{title:'Product Mix',columns:['المؤشر','القيمة'],rows:[['Products',mix.current?.products],['Sales',mix.current?.sales],['Units',mix.current?.units],['Invoices',mix.current?.invoices],['Units/Invoice',mix.current?.unitsPerInvoice],['Concentration',mix.current?.concentration?.top10Share]]}],
        diagnosis:diagnosis([mix.diagnosis?.[0]?.message||null])
    };
}

async function moduleCustomers(ctx, moduleId) {
    if (moduleId === 'customer-rfm' || moduleId === 'customer-overview') {
        const rfm = await getCustomerRfm({ ...ctx, limit: 30 });
        return {
            title:'Customer Intelligence — RFM',
            subtitle:'Recency / Frequency / Monetary وتقسيم العملاء',
            kpis:[
                k('العملاء',rfm.summary?.customers||0,'number'),
                k('Avg Recency',rfm.summary?.averageRecencyDays||0,'number'),
                k('Avg Frequency',rfm.summary?.averageFrequency||0,'number'),
                k('Avg Monetary',rfm.summary?.averageMonetary||0,'money')
            ],
            tables:[
                {title:'Segments',columns:['Segment','Customers'],rows:Object.entries(rfm.summary?.segments||{}).map(([name,v])=>[name,v?.customers??v])},
                {title:'Top Customers',columns:['Customer','Recency','Frequency','Monetary','Segment'],rows:(rfm.customers||[]).slice(0,30).map(c=>[c.customerName||c.customerId,c.recencyDays,c.tickets,c.netSales,c.segment||c.segmentName])}
            ],
            diagnosis:[]
        };
    }
    if (moduleId === 'customer-retention') {
        const r = await getCustomerRetention(ctx);
        return {title:'Customer Retention',subtitle:'الاحتفاظ بالعملاء ومعدل الفقد',kpis:[k('Retention Rate',r.retention?.retentionRate||0,'percent'),k('Retained',r.retention?.retainedCustomers||0,'number'),k('Lost',r.retention?.lostCustomers||0,'number')],tables:[{title:'Retention',columns:['المؤشر','القيمة'],rows:[['Previous Customers',r.retention?.previousCustomers],['Retained',r.retention?.retainedCustomers],['Lost',r.retention?.lostCustomers],['Retention Rate',r.retention?.retentionRate]]}],diagnosis:[r.retention?.retentionRate<70?`معدل الاحتفاظ ${round(r.retention.retentionRate,1)}% ويحتاج تدخلًا.`:null]};
    }
    if (moduleId === 'customer-churn') {
        const [i,r] = await Promise.all([getCustomerInactivity({branchId:ctx.branchId,toDate:ctx.toDate,sampleLimit:30}),getCustomerRetention(ctx)]);
        return {title:'Churn / عدم النشاط',subtitle:'Lost وAt-Risk والعملاء غير النشطين',kpis:[k('Inactive',i.summary?.customers||0,'number'),k('Lost',r.retention?.lostCustomers||0,'number'),k('Retention',r.retention?.retentionRate||0,'percent')],tables:[{title:'Churn Signals',columns:['المؤشر','القيمة'],rows:[['Inactive',i.summary?.customers],['Lost',r.retention?.lostCustomers],['Retained',r.retention?.retainedCustomers]]}],diagnosis:[i.summary?.customers>0?`${i.summary.customers} عملاء غير نشطين حسب تعريف الخدمة.`:null]};
    }
    if (moduleId === 'customer-clv') {
        const c = await getCustomerClv({...ctx,limit:30});
        return {title:'Customer Lifetime Value — CLV',subtitle:'قيمة العميل العمرية وقيمة الطلب والتكرار',kpis:[k('Customers',c.summary?.customers||0,'number'),k('Avg CLV',c.summary?.averageCustomerValue||0,'money'),k('Avg Order',c.summary?.averageOrderValue||0,'money'),k('Avg Monthly Frequency',c.summary?.averageMonthlyFrequency||0,'number')],tables:[{title:'Top CLV Customers',columns:['Customer','CLV','Orders','Avg Order'],rows:(c.customers||[]).slice(0,30).map(x=>[x.customerName||x.customerId,x.customerValue||x.clv,x.orders,x.averageOrderValue])}],diagnosis:[]};
    }
    const c = await getCustomerCohort({...ctx,maxMonths:12});
    return {title:'Customer Cohort Analysis',subtitle:'تطور cohorts عبر الزمن',kpis:[k('Cohorts',c.summary?.cohorts||0,'number'),k('Customers',c.summary?.customers||0,'number'),k('Observed Sales',c.summary?.observedSales||0,'money')],tables:[{title:'Cohorts',columns:['Cohort','Customers','Observed Sales'],rows:(c.cohorts||[]).slice(0,20).map(x=>[x.cohortMonth,x.customers,x.observedSales])}],diagnosis:[]};
}

async function moduleStaff(ctx) {
    const rows = await getSales(ctx);
    const sellers = sellerRows(rows);
    const total = sellers.reduce((s,x)=>s+x.sales,0);
    return {
        title:'تحليلات الموظفين / البائعين', subtitle:'Top Sellers، الفواتير، متوسط الفاتورة والمساهمة',
        kpis:[k('عدد البائعين',sellers.length,'number'),k('إجمالي المبيعات',total,'money'),k('أعلى بائع',sellers[0]?.sales||0,'money')],
        tables:[{title:'Top Sellers',columns:['البائع','المبيعات','الفواتير','متوسط الفاتورة','الوحدات','المساهمة'],rows:sellers.slice(0,30).map(x=>[x.sellerId,x.sales,x.tickets,x.averageInvoice,x.units,total?round(x.sales/total*100):0])}],
        diagnosis:diagnosis([sellers[0]?`أعلى بائع في الفترة: ${sellers[0].sellerId}.`:null,sellers.at(-1)?`أقل مساهمة بين البائعين: ${sellers.at(-1).sellerId}.`:null])
    };
}

async function moduleProfitability(ctx) {
    const [summary, products] = await Promise.all([getSalesSummary(ctx),getProductProfitability({...ctx,limit:20})]);
    return {
        title:'تحليلات الربحية', subtitle:'Sales → Cost → Profit → Margin + تحليل المنتجات منخفضة الربحية',
        kpis:[k('Gross Sales',summary.grossSales,'money'),k('Net Sales',summary.netSales,'money'),k('Cost',summary.netCost,'money'),k('Gross Profit',summary.netProfit,'money'),k('Profit Margin',summary.grossMargin,'percent')],
        tables:[{title:'ربحية المنتجات',columns:['المنتج','المبيعات','التكلفة','الربح','الهامش'],rows:(products.profitByProduct||[]).slice(0,30).map(p=>[p.itemName,p.netSales,p.cost,p.grossProfit,p.margin])}],
        diagnosis:diagnosis([
            summary.netProfit < 0 ? 'الفرع يحقق خسارة صافية في الفترة.' : null,
            products.summary?.negativeMarginProducts > 0 ? `${products.summary.negativeMarginProducts} منتجات بهامش سلبي.` : null,
            summary.reconciliation?.ticketsWithDifference > 0 ? `${summary.reconciliation.ticketsWithDifference} فواتير بها فرق في المطابقة.` : null
        ])
    };
}

async function moduleBranches(ctx) {
    const group = await getGroupSalesOverview(ctx);
    return {
        title:'تحليلات الفروع', subtitle:'Branch Performance، ترتيب ومقارنة النمو والربحية',
        kpis:[k('الفروع',group.summary.branches,'number'),k('المبيعات',group.summary.sales,'money'),k('الربح',group.summary.profit,'money'),k('الهامش',group.summary.margin,'percent')],
        tables:[{title:'Branch Ranking',columns:['الترتيب','الفرع','المبيعات','الفواتير','الربح','الهامش'],rows:(group.branches||[]).map((b,i)=>[i+1,b.branchId,b.sales,b.invoices,b.profit,b.margin])}],
        diagnosis:diagnosis([(group.branches||[])[0]?`أعلى فرع مبيعًا: ${group.branches[0].branchId}.`:null])
    };
}

async function moduleInventory(ctx) {
    const [rows,snapshot] = await Promise.all([getSales(ctx),getInventorySnapshot({branchId:ctx.branchId,connection:ctx.connection})]);
    const movers=movementRows(rows);
    const slow=[...movers].sort((a,b)=>a.units-b.units).slice(0,15);
    return {
        title:'تحليلات المخزون', subtitle:'حركة الأصناف وسرعة الدوران ومخاطر الركود',
        kpis:[k('الأصناف المتحركة',movers.length,'number'),k('إجمالي الوحدات المباعة',movers.reduce((s,x)=>s+x.units,0),'number'),k('Positive Stock',snapshot.positiveStockItems,'number'),k('Negative Stock',snapshot.negativeStockItems,'number')],
        tables:[
            {title:'Fast Movers',columns:['الصنف','الوحدات','المبيعات','الفواتير'],rows:movers.slice(0,20).map(x=>[x.itemName,x.units,x.sales,x.tickets])},
            {title:'Slow / Dead Candidates',columns:['الصنف','الوحدات','المبيعات'],rows:slow.map(x=>[x.itemName,x.units,x.sales])}
        ],
        diagnosis:diagnosis([
            snapshot.negativeStockItems>0?`${snapshot.negativeStockItems} صنفًا بقيمة مخزون سالبة حسب عمود ${snapshot.column}.`:null,
            slow.length?`${slow.length} أصناف مرشحة للركود بناءً على حركة البيع.`:null
        ])
    };
}

async function moduleProcurement(ctx) {
    const p = await getProcurementRows(ctx);
    return {
        title:'تحليلات المشتريات', subtitle:'حجم الشراء، الفواتير والأصناف والموردين',
        kpis:[k('فواتير شراء',p.invoices,'number'),k('سطور شراء',p.lines,'number'),k('أصناف مشتراة',p.products,'number'),k('موردون',p.suppliers,'number'),k('قيمة المشتريات',p.amount,'money')],
        tables:[{title:'Purchase KPIs',columns:['المؤشر','القيمة'],rows:[['فواتير شراء',p.invoices],['سطور شراء',p.lines],['أصناف مشتراة',p.products],['موردون',p.suppliers],['قيمة المشتريات',p.amount],['أساس القيمة',p.amountBasis]]}],
        diagnosis:diagnosis([p.amount>0?'تم تسجيل نشاط شراء في الفترة.':null])
    };
}

async function moduleSuppliers(ctx) {
    const rows=await getSupplierRows(ctx);
    const total=rows.reduce((s,x)=>s+x.amount,0);
    return {
        title:'تحليلات الموردين', subtitle:'Supplier Performance، المساهمة والأسعار والاعتماد',
        kpis:[k('الموردون',rows.length,'number'),k('قيمة الشراء الأساسية',total,'money')],
        tables:[{title:'Supplier Performance',columns:['المورد','الفواتير','السطور','الأصناف','المبلغ','المساهمة'],rows:rows.map(x=>[x.supplierId,x.invoices,x.lines,x.products,x.amount,total?round(x.amount/total*100):0])}],
        diagnosis:diagnosis([rows[0]?`أكبر اعتماد شرائي حالي على المورد ${rows[0].supplierId}.`:null])
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
        title:'التنبؤ والتحليلات المستقبلية', subtitle:'Forecast مبني على الاتجاه التاريخي المتاح',
        kpis:[k('متوسط المبيعات اليومية',avg,'money',growth),k('توقع 7 أيام',forecast7,'money'),k('متوسط 14 يوم سابق',priorAvg,'money')],
        tables:[{title:'Recent Trend',columns:['التاريخ','المبيعات','الفواتير'],rows:recent.map(x=>[x.date,x.netSales,x.tickets])}],
        diagnosis:diagnosis([growth!==null?(growth>=0?`الاتجاه الأخير صاعد بنسبة ${round(growth,1)}% مقارنة بالـ14 يوم السابقة.`:`الاتجاه الأخير هابط بنسبة ${Math.abs(round(growth,1))}%.`):null])
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
        title:'جودة البيانات والتكلفة', subtitle:'Cost Quality، Missing/Zero/Suspicious + Reconciliation',
        kpis:[k('إجمالي السطور',rows.length,'number'),k('Zero Cost',zero,'number'),k('Missing Reference',missing,'number'),k('Suspicious Cost',suspicious,'number'),k('فواتير غير مطابقة',rec.reconciliation?.ticketsWithDifference||0,'number')],
        tables:[{title:'Data Quality',columns:['المؤشر','القيمة'],rows:[['Zero Cost',zero],['Missing Reference',missing],['Suspicious Cost',suspicious],['Invalid',0],['Reconciliation Differences',rec.reconciliation?.ticketsWithDifference||0],['Absolute Difference',rec.reconciliation?.absoluteDifference||0]]}],
        diagnosis:diagnosis([zero>0?`${zero} سطر بدون تكلفة أو بتكلفة صفر.`:null,suspicious>0?`${suspicious} سطر تكلفة مشتبه به.`:null,rec.reconciliation?.ticketsWithDifference>0?`يوجد ${rec.reconciliation.ticketsWithDifference} فواتير تحتاج مراجعة.`:null])
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
