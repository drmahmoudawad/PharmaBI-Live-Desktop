$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$salesService =
    Join-Path `
        $root `
        "electron\pharmfly\sales\salesService.js"

$localSalesDb =
    Join-Path `
        $root `
        "electron\localdb\localSalesDb.js"

$salesBackup =
    "$salesService.backup-before-local-fields-fix"

$localDbBackup =
    "$localSalesDb.backup-before-local-fields-fix"

Write-Host ""
Write-Host "===== FIX LOCAL SALES FIRST FIELDS =====" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# BACKUPS
# ============================================================

Copy-Item `
    $salesService `
    $salesBackup `
    -Force

Copy-Item `
    $localSalesDb `
    $localDbBackup `
    -Force

Write-Host "Sales backup created." -ForegroundColor Green
Write-Host "Local DB backup created." -ForegroundColor Green

# ============================================================
# SALES SERVICE
# ============================================================

$salesSource =
    Get-Content `
        $salesService `
        -Raw

$startMarker =
    "function normalizeLocalSaleRow("

$endMarker =
    "async function getSalesFromLocalFirstStrategy("

$start =
    $salesSource.IndexOf(
        $startMarker
    )

if ($start -lt 0) {
    throw "normalizeLocalSaleRow() not found."
}

$end =
    $salesSource.IndexOf(
        $endMarker,
        $start
    )

if ($end -lt 0) {
    throw "getSalesFromLocalFirstStrategy() anchor not found."
}

$newNormalizeBlock = @'
function normalizeLocalSaleRow(
    row
) {

    const normalized =
        normalizeSaleRow({

            ticket_id:
                row.ticket_id,

            line_id:
                row.line_id,

            item_id:
                row.item_id,

            item_name:
                row.item_name,

            customer_id:
                row.customer_id,

            customer_name:
                row.customer_name,

            ticket_ztime:
                row.date,

            sales_return:
                row.sales_return,

            transaction_type:
                row.transaction_type,

            ticket_total:
                row.ticket_total,

            packs:
                row.packs,

            units:
                row.units,

            line_parts:
                row.parts,

            item_parts:
                row.parts,

            bonus:
                row.bonus,

            line_sales_price:
                row.sales_price,

            line_discount:
                row.discount,

            line_extra_discount:
                row.extra_discount,

            last_purchase_cost:
                row.purchase_cost,

            last_purchase_date:
                row.purchase_date,

            last_purchase_invoice_id:
                row.purchase_invoice_id,

            last_purchase_invoice_code:
                row.purchase_invoice_code,

            last_purchase_vendor_id:
                row.purchase_vendor_id,

            last_purchase_parts:
                row.purchase_parts,

            line_cost:
                row.source_pos_item_cost,

            line_store_id:
                row.store_id,

            ticket_store_id:
                row.store_id,

            sales_rep_id:
                row.sales_rep_id,

            is_content:
                row.is_content
        });


    normalized.pinNumber =
        row.pin_number === null ||
        row.pin_number === undefined

            ? null

            : String(
                row.pin_number
            );

    return normalized;

}


'@

$salesSource =
    $salesSource.Substring(
        0,
        $start
    ) +
    $newNormalizeBlock +
    $salesSource.Substring(
        $end
    )

Set-Content `
    -Path $salesService `
    -Value $salesSource `
    -Encoding UTF8

Write-Host "salesService normalize adapter fixed." -ForegroundColor Green

# ============================================================
# LOCAL SQLITE QUERY
# ============================================================

$localSource =
    Get-Content `
        $localSalesDb `
        -Raw

if (
    $localSource.Contains(
        "store_id, sales_rep_id, pin_number"
    )
) {

    Write-Host "pin_number query field already exists." -ForegroundColor Yellow

}
elseif (
    $localSource.Contains(
        "store_id, sales_rep_id"
    )
) {

    $localSource =
        $localSource.Replace(
            "store_id, sales_rep_id",
            "store_id, sales_rep_id, pin_number"
        )

    Set-Content `
        -Path $localSalesDb `
        -Value $localSource `
        -Encoding UTF8

    Write-Host "pin_number added to SQLite sales query." -ForegroundColor Green

}
else {

    throw "Could not find 'store_id, sales_rep_id' in localSalesDb.js."

}

# ============================================================
# VERIFY
# ============================================================

Write-Host ""
Write-Host "===== VERIFY =====" -ForegroundColor Cyan

$salesVerify =
    Get-Content `
        $salesService `
        -Raw

$localVerify =
    Get-Content `
        $localSalesDb `
        -Raw

if (
    $salesVerify.Contains(
        "line_sales_price:"
    )
) {
    Write-Host "line_sales_price mapping: OK" -ForegroundColor Green
}
else {
    throw "line_sales_price mapping missing."
}

if (
    $salesVerify.Contains(
        "line_discount:"
    )
) {
    Write-Host "line_discount mapping: OK" -ForegroundColor Green
}
else {
    throw "line_discount mapping missing."
}

if (
    $salesVerify.Contains(
        "line_extra_discount:"
    )
) {
    Write-Host "line_extra_discount mapping: OK" -ForegroundColor Green
}
else {
    throw "line_extra_discount mapping missing."
}

if (
    $salesVerify.Contains(
        "line_parts:"
    )
) {
    Write-Host "line_parts mapping: OK" -ForegroundColor Green
}
else {
    throw "line_parts mapping missing."
}

if (
    $salesVerify.Contains(
        "normalized.pinNumber"
    )
) {
    Write-Host "pinNumber mapping: OK" -ForegroundColor Green
}
else {
    throw "pinNumber mapping missing."
}

if (
    $localVerify.Contains(
        "pin_number"
    )
) {
    Write-Host "SQLite pin_number field: OK" -ForegroundColor Green
}
else {
    throw "SQLite pin_number field missing."
}

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Write-Host ""
Write-Host "Sales backup:"
Write-Host $salesBackup
Write-Host ""
Write-Host "Local DB backup:"
Write-Host $localDbBackup