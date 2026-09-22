export function buildSalesQuery({ preview = false } = {}) {
    const finalSelect = preview
        ? `
            SELECT TOP 5

                s.ticket_id,
                s.ticket_ztime,
                s.sales_return,
                s.customer_id,
                s.ticket_total,
                s.ticket_subtotal,
                s.ticket_discount,
                s.ticket_discount_on_items,
                s.ticket_discount_percent,
                s.ticket_sales_tax,
                s.ticket_sales_tax_value,
                s.paid_by_customer,
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
                latestPurchase.purchase_cost AS last_purchase_cost,
                latestPurchase.purchase_date AS last_purchase_date,
                latestPurchase.purchase_invoice_id AS last_purchase_invoice_id,
                latestPurchase.purchase_invoice_code AS last_purchase_invoice_code,
                latestPurchase.purchase_vendor_id AS last_purchase_vendor_id,
                s.item_parts AS last_purchase_parts

            FROM #SalesBase s

            OUTER APPLY (
                SELECT TOP 1
                    p.purchase_cost,
                    p.purchase_date,
                    p.purchase_invoice_id,
                    p.purchase_invoice_code,
                    p.purchase_vendor_id
                FROM #Purchases p
                WHERE p.item_id = s.item_id
                  AND p.purchase_date <= s.ticket_ztime
                ORDER BY
                    p.purchase_date DESC,
                    p.purchase_invoice_id DESC,
                    p.purchase_item_id DESC
            ) latestPurchase

            ORDER BY
                s.ticket_ztime ASC,
                s.ticket_id ASC,
                s.line_id ASC;
        `
        : `
            SELECT
                s.ticket_id,
                s.ticket_ztime,
                s.sales_return,
                s.customer_id,
                s.ticket_total,
                s.ticket_subtotal,
                s.ticket_discount,
                s.ticket_discount_on_items,
                s.ticket_discount_percent,
                s.ticket_sales_tax,
                s.ticket_sales_tax_value,
                s.paid_by_customer,
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
                latestPurchase.purchase_cost AS last_purchase_cost,
                latestPurchase.purchase_date AS last_purchase_date,
                latestPurchase.purchase_invoice_id AS last_purchase_invoice_id,
                latestPurchase.purchase_invoice_code AS last_purchase_invoice_code,
                latestPurchase.purchase_vendor_id AS last_purchase_vendor_id,
                s.item_parts AS last_purchase_parts

            FROM #SalesBase s

            OUTER APPLY (
                SELECT TOP 1
                    p.purchase_cost,
                    p.purchase_date,
                    p.purchase_invoice_id,
                    p.purchase_invoice_code,
                    p.purchase_vendor_id
                FROM #Purchases p
                WHERE p.item_id = s.item_id
                  AND p.purchase_date <= s.ticket_ztime
                ORDER BY
                    p.purchase_date DESC,
                    p.purchase_invoice_id DESC,
                    p.purchase_item_id DESC
            ) latestPurchase

            ORDER BY
                s.ticket_ztime ASC,
                s.ticket_id ASC,
                s.line_id ASC;
        `;

    return `
        SET NOCOUNT ON;

        IF OBJECT_ID('tempdb..#SalesBase') IS NOT NULL DROP TABLE #SalesBase;
        IF OBJECT_ID('tempdb..#NeededItems') IS NOT NULL DROP TABLE #NeededItems;
        IF OBJECT_ID('tempdb..#Purchases') IS NOT NULL DROP TABLE #Purchases;

        SELECT
            t.ID AS ticket_id,
            t.ztime AS ticket_ztime,
            t.SalesReturn AS sales_return,
            t.CustomerID AS customer_id,
            t.Total AS ticket_total,
            t.SubTotal AS ticket_subtotal,
            t.Discount AS ticket_discount,
            t.DiscountOnItems AS ticket_discount_on_items,
            t.DiscountPercent AS ticket_discount_percent,
            t.SalesTax AS ticket_sales_tax,
            t.SalesTaxValue AS ticket_sales_tax_value,
            t.PaidByCustomer AS paid_by_customer,
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
        INTO #SalesBase
        FROM posTickets t
        INNER JOIN posItems pi ON pi.TicketID = t.ID
        LEFT JOIN Items i ON i.ID = pi.ItemID
        WHERE
            t.ztime >= @fromDate
            AND t.ztime < @toDateExclusive;

        CREATE CLUSTERED INDEX IX_SalesBase_Item_Date_Line
            ON #SalesBase(item_id, ticket_ztime, line_id);

        SELECT DISTINCT item_id
        INTO #NeededItems
        FROM #SalesBase
        WHERE item_id IS NOT NULL;

        CREATE UNIQUE CLUSTERED INDEX IX_NeededItems_Item
            ON #NeededItems(item_id);

        SELECT
            pitem.item_id,
            pitem.CostPrice AS purchase_cost,
            COALESCE(pinv.ztime, pinv.inv_date) AS purchase_date,
            pinv.ID AS purchase_invoice_id,
            pinv.inv_code AS purchase_invoice_code,
            pinv.vendor_id AS purchase_vendor_id,
            pitem.ID AS purchase_item_id
        INTO #Purchases
        FROM PurchaseItems pitem
        INNER JOIN PurchaseInvoices pinv
            ON pinv.ID = pitem.inv_id
        INNER JOIN #NeededItems needed
            ON needed.item_id = pitem.item_id
        CROSS JOIN (
            SELECT MAX(ticket_ztime) AS max_sale_date
            FROM #SalesBase
        ) saleWindow
        WHERE
            COALESCE(pinv.ztime, pinv.inv_date) IS NOT NULL
            AND COALESCE(pinv.ztime, pinv.inv_date) <= saleWindow.max_sale_date;

        CREATE CLUSTERED INDEX IX_Purchases_Item_Date
            ON #Purchases(
                item_id,
                purchase_date,
                purchase_invoice_id,
                purchase_item_id
            );

        ${
            preview
                ? `
                    SELECT COUNT(*) AS total_rows
                    FROM #SalesBase;

                    ${finalSelect}
                `
                : finalSelect
        }
    `;
}
