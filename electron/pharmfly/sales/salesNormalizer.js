function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function normalizeDate(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

export function createDateRange(fromDate, toDate) {
    const from = String(fromDate || "").trim();
    const to = String(toDate || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
        throw new Error("Invalid fromDate. Expected YYYY-MM-DD");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new Error("Invalid toDate. Expected YYYY-MM-DD");
    }

    const fromDateObject = new Date(`${from}T00:00:00Z`);
    const toDateObject = new Date(`${to}T00:00:00Z`);

    if (Number.isNaN(fromDateObject.getTime())) {
        throw new Error("Invalid fromDate");
    }

    if (Number.isNaN(toDateObject.getTime())) {
        throw new Error("Invalid toDate");
    }

    if (fromDateObject > toDateObject) {
        throw new Error("fromDate cannot be greater than toDate");
    }

    toDateObject.setUTCDate(toDateObject.getUTCDate() + 1);

    return {
        fromDateSql: `${from} 00:00:00`,
        toDateExclusiveSql: `${toDateObject.toISOString().slice(0, 10)} 00:00:00`,
        fromDate: from,
        toDate: to
    };
}

export function normalizeSaleRow(row) {
    const salesReturn = toNumber(row.sales_return);
    const isReturn = salesReturn === 2;

    const packs = toNumber(row.packs);
    const units = toNumber(row.units);
    const lineParts = toNumber(row.line_parts);
    const itemParts = toNumber(row.item_parts);

    const parts =
        lineParts > 0
            ? lineParts
            : itemParts > 0
                ? itemParts
                : 1;

    const salesPrice = toNumber(row.line_sales_price);
    const unitPrice = parts > 0 ? salesPrice / parts : salesPrice;
    const baseUnits = (packs * parts) + units;
    const grossLineValue = baseUnits * unitPrice;

    const discount = toNumber(row.line_discount);
    const extraDiscount = toNumber(row.line_extra_discount);
    const netLineValue = grossLineValue - discount - extraDiscount;

    const lastPurchaseCost = toNumber(row.last_purchase_cost);
    const purchaseParts = toNumber(row.last_purchase_parts) > 0
        ? toNumber(row.last_purchase_parts)
        : parts;

    const purchaseUnitCost = lastPurchaseCost > 0
        ? lastPurchaseCost / purchaseParts
        : 0;

    const lineCost = baseUnits * purchaseUnitCost;

    return {
        ticketId: String(row.ticket_id),
        lineId: String(row.line_id),
        itemId: row.item_id === null || row.item_id === undefined
            ? null
            : String(row.item_id),
        itemName: row.item_name || null,
        customerId: row.customer_id === null || row.customer_id === undefined
            ? null
            : String(row.customer_id),
        customerName: null,
        date: normalizeDate(row.ticket_ztime),
        salesReturn,
        transactionType: isReturn ? "RETURN" : "SALE",
        ticketTotal: toNumber(row.ticket_total),
        ticketSubtotal: toNumber(row.ticket_subtotal),
        ticketDiscount: toNumber(row.ticket_discount),
        ticketDiscountOnItems: toNumber(row.ticket_discount_on_items),
        ticketDiscountPercent: toNumber(row.ticket_discount_percent),
        ticketSalesTax: toNumber(row.ticket_sales_tax),
        ticketSalesTaxValue: toNumber(row.ticket_sales_tax_value),
        paidByCustomer: toNumber(row.paid_by_customer),
        ticketStoreId: row.ticket_store_id ?? null,
        salesRepId: row.sales_rep_id === null || row.sales_rep_id === undefined
            ? null
            : String(row.sales_rep_id),
        packs,
        units,
        parts,
        baseUnits,
        bonus: toNumber(row.bonus),
        salesPrice,
        unitPrice,
        grossLineValue,
        discount,
        extraDiscount,
        netLineValue,
        costPrice: lastPurchaseCost,
        unitCost: purchaseUnitCost,
        lineCost,
        purchaseCost: lastPurchaseCost,
        purchaseUnitCost,
        purchaseDate: normalizeDate(row.last_purchase_date),
        purchaseInvoiceId: row.last_purchase_invoice_id == null
            ? null
            : String(row.last_purchase_invoice_id),
        purchaseInvoiceCode: row.last_purchase_invoice_code || null,
        purchaseVendorId: row.last_purchase_vendor_id == null
            ? null
            : String(row.last_purchase_vendor_id),
        purchaseParts,
        sourcePosItemCost: toNumber(row.line_cost),
        isContent: Boolean(row.is_content),
        storeId: row.line_store_id ?? row.ticket_store_id ?? null
    };
}
