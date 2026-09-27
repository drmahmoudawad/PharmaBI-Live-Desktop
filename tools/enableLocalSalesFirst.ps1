$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"
$salesService = Join-Path $root "electron\pharmfly\sales\salesService.js"

if (-not (Test-Path $salesService)) {
    throw "salesService.js not found: $salesService"
}

$backup = "$salesService.backup-before-local-first-fixed"

Copy-Item $salesService $backup -Force

$source = Get-Content $salesService -Raw

Write-Host ""
Write-Host "===== ENABLE LOCAL SALES FIRST =====" -ForegroundColor Cyan
Write-Host "Target: $salesService"
Write-Host "Backup: $backup"
Write-Host ""

# ------------------------------------------------------------
# 1) IMPORT LOCAL SQLITE READER
# ------------------------------------------------------------

$localImport = @'
import {
    getSalesRows as getLocalSalesRows
} from "../../localdb/localSalesDb.js";

'@

if ($source -notmatch 'getSalesRows\s+as\s+getLocalSalesRows') {
    $source = $localImport + $source
    Write-Host "LOCAL SQLITE IMPORT: ADDED" -ForegroundColor Green
}
else {
    Write-Host "LOCAL SQLITE IMPORT: ALREADY EXISTS" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 2) LOCAL-FIRST HELPER FUNCTIONS
# ------------------------------------------------------------

$helperMarker = "/* LOCAL-FIRST SALES STRATEGY */"

$helperBlock = @'
/* LOCAL-FIRST SALES STRATEGY */

function getTodayUtcDate() {
    return new Date().toISOString().slice(0, 10);
}

function getPreviousDate(dateString) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

function maxSalesDate(a, b) {
    return a > b ? a : b;
}

function minSalesDate(a, b) {
    return a < b ? a : b;
}

function normalizeLocalSaleRow(row) {
    return normalizeSaleRow({
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

        parts:
            row.parts,

        bonus:
            row.bonus,

        sales_price:
            row.sales_price,

        unit_price:
            row.unit_price,

        discount:
            row.discount,

        extra_discount:
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

        is_content:
            row.is_content,

        store_id:
            row.store_id,

        sales_rep_id:
            row.sales_rep_id
    });
}

async function getSalesFromLocalFirstStrategy({
    branchId,
    fromDate,
    toDate,
    connection,
    forceRefresh = false
}) {
    if (forceRefresh) {
        return null;
    }

    const today = getTodayUtcDate();

    const completedToDate =
        minSalesDate(
            toDate,
            today
        );

    const currentFromDate =
        maxSalesDate(
            fromDate,
            today
        );

    let covered = false;

    let localRows = [];

    let currentDayRows = [];

    /*
     * COMPLETED DAYS
     * Read directly from local SQLite.
     */
    if (fromDate < completedToDate) {
        covered = true;

        const startedAt =
            Date.now();

        const rows =
            await getLocalSalesRows({
                branchId,
                fromDate,
                toDate: completedToDate
            });

        localRows =
            Array.isArray(rows)
                ? rows.map(normalizeLocalSaleRow)
                : [];

        console.log(
            `[salesService] LOCAL SQLITE HIT branch=${branchId} ${fromDate} -> ${completedToDate} rows=${localRows.length} in ${Date.now() - startedAt} ms`
        );
    }

    /*
     * CURRENT UTC DAY
     * Keep SQL Server for live/fresh data.
     */
    if (currentFromDate < toDate) {
        covered = true;

        const startedAt =
            Date.now();

        currentDayRows =
            await queryPharmaFlySales({
                branchId,
                fromDate: currentFromDate,
                toDate,
                connection
            });

        console.log(
            `[salesService] CURRENT DAY SQL branch=${branchId} ${currentFromDate} -> ${toDate} rows=${currentDayRows.length} in ${Date.now() - startedAt} ms`
        );
    }

    if (!covered) {
        return null;
    }

    const combinedRows = [
        ...localRows,
        ...currentDayRows
    ];

    combinedRows.sort(
        (a, b) => {
            const dateCompare =
                String(a.date || "").localeCompare(
                    String(b.date || "")
                );

            if (dateCompare !== 0) {
                return dateCompare;
            }

            const ticketCompare =
                Number(a.ticketId || 0) -
                Number(b.ticketId || 0);

            if (ticketCompare !== 0) {
                return ticketCompare;
            }

            return (
                Number(a.lineId || 0) -
                Number(b.lineId || 0)
            );
        }
    );

    return combinedRows;
}

'@

if ($source -notmatch [regex]::Escape($helperMarker)) {
    $getSalesPos = $source.IndexOf("export async function getSales(")

    if ($getSalesPos -lt 0) {
        throw "getSales() function anchor not found."
    }

    $source =
        $source.Substring(
            0,
            $getSalesPos
        ) +
        $helperBlock +
        "`r`n" +
        $source.Substring($getSalesPos)

    Write-Host "LOCAL-FIRST HELPER: ADDED" -ForegroundColor Green
}
else {
    Write-Host "LOCAL-FIRST HELPER: ALREADY EXISTS" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 3) INSERT LOCAL-FIRST BLOCK BEFORE MONTHLY STRATEGY
# ------------------------------------------------------------

$localFirstMarker = "LOCAL-FIRST GET"

$localFirstBlock = @'
    /*
     * =====================================================
     * LOCAL-FIRST GET
     * =====================================================
     *
     * Completed dates:
     *     LOCAL SQLITE
     *
     * Current UTC date:
     *     SQL SERVER
     *
     * This block runs before MONTHLY STRATEGY so that
     * local SQLite is the primary source for history.
     */

    if (
        !forceRefresh
    ) {

        try {

            const localFirstRows =
                await getSalesFromLocalFirstStrategy({

                    branchId:
                        numericBranchId,

                    fromDate:
                        normalizedFromDate,

                    toDate:
                        normalizedToDate,

                    connection,

                    forceRefresh:
                        false

                });


            if (
                Array.isArray(
                    localFirstRows
                )
            ) {

                setCachedSales(

                    key,

                    localFirstRows

                );


                if (
                    !isFullCalendarMonth(

                        normalizedFromDate,

                        normalizedToDate

                    )
                ) {

                    savePersistentSalesRange({

                        key,

                        rows:
                            localFirstRows

                    });

                }


                console.log(

                    `[salesService] LOCAL-FIRST RESULT ${key} -> ${localFirstRows.length} rows`

                );


                return localFirstRows;

            }

        }
        catch (
            error
        ) {

            console.error(

                `[salesService] local-first strategy failed ${key}:`,

                error

            );

        }

    }

'@

if ($source -notmatch [regex]::Escape($localFirstMarker)) {

    $getSalesPos =
        $source.IndexOf(
            "export async function getSales("
        )

    if ($getSalesPos -lt 0) {
        throw "getSales() function anchor not found for LOCAL-FIRST insertion."
    }

    $monthlyPos =
        $source.IndexOf(
            "     * MONTHLY STRATEGY",
            $getSalesPos
        )

    if ($monthlyPos -lt 0) {
        throw "MONTHLY STRATEGY anchor not found inside getSales()."
    }

    $monthlyBlockStart =
        $source.LastIndexOf(
            "/*",
            $monthlyPos
        )

    if ($monthlyBlockStart -lt 0) {
        throw "MONTHLY STRATEGY comment block start not found."
    }

    $source =
        $source.Substring(
            0,
            $monthlyBlockStart
        ) +
        $localFirstBlock +
        "`r`n" +
        $source.Substring($monthlyBlockStart)

    Write-Host "LOCAL-FIRST GET BLOCK: ADDED" -ForegroundColor Green
}
else {
    Write-Host "LOCAL-FIRST GET BLOCK: ALREADY EXISTS" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 4) SAVE
# ------------------------------------------------------------

Set-Content `
    -Path $salesService `
    -Value $source `
    -Encoding UTF8

Write-Host ""
Write-Host "salesService.js UPDATED" -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# 5) VERIFY
# ------------------------------------------------------------

$verify =
    Get-Content $salesService -Raw

Write-Host "===== VERIFY =====" -ForegroundColor Cyan

if ($verify -match 'getSalesRows\s+as\s+getLocalSalesRows') {
    Write-Host "LOCAL SQLITE IMPORT: OK" -ForegroundColor Green
}
else {
    throw "LOCAL SQLITE IMPORT verification failed."
}

if ($verify -match 'LOCAL-FIRST SALES STRATEGY') {
    Write-Host "LOCAL-FIRST HELPER: OK" -ForegroundColor Green
}
else {
    throw "LOCAL-FIRST HELPER verification failed."
}

if ($verify -match 'LOCAL-FIRST GET') {
    Write-Host "LOCAL-FIRST GET BLOCK: OK" -ForegroundColor Green
}
else {
    throw "LOCAL-FIRST GET BLOCK verification failed."
}

Write-Host ""
Write-Host "Backup created:"
Write-Host $backup
Write-Host ""
Write-Host "DONE" -ForegroundColor Green