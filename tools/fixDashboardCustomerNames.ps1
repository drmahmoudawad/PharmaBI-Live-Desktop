$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$target = Join-Path `
    $root `
    "electron\pharmfly\dashboardOverviewService.js"

$backup = "$target.backup-before-customer-name-fix-v5"

Write-Host ""
Write-Host "===== FIX DASHBOARD CUSTOMER NAMES V5 =====" -ForegroundColor Cyan
Write-Host "Target: $target"
Write-Host "Backup: $backup"
Write-Host ""

if (-not (Test-Path $target)) {
    throw "Target file not found."
}

Copy-Item `
    $target `
    $backup `
    -Force

$content = Get-Content `
    $target `
    -Raw

# ---------------------------------------------------------
# FIX 1
# Never use customerId as the stored customer name.
# ---------------------------------------------------------

$pattern1 = '(?m)^(\s*)customerName\s*:\s*customerName\s*\|\|\s*key,\s*$'

$matches1 = [regex]::Matches(
    $content,
    $pattern1
)

Write-Host "Fix 1 matches: $($matches1.Count)"

if ($matches1.Count -ne 1) {
    throw "Fix 1 expected 1 match, found $($matches1.Count)."
}

$content = [regex]::Replace(
    $content,
    $pattern1,
    '$1customerName: "",',
    1
)

# ---------------------------------------------------------
# FIX 2
# Always keep the real customer name when available.
# ---------------------------------------------------------

$pattern2 = '(?ms)^(\s*)if\s*\(\s*customerName\s*&&\s*!customer\.customerName\s*\)\s*\{\s*customer\.customerName\s*=\s*customerName;\s*\}'

$matches2 = [regex]::Matches(
    $content,
    $pattern2
)

Write-Host "Fix 2 matches: $($matches2.Count)"

if ($matches2.Count -ne 1) {
    throw "Fix 2 expected 1 match, found $($matches2.Count)."
}

$indent = $matches2[0].Groups[1].Value

$replacement2 =
    $indent + "if (customerName) {" +
    [Environment]::NewLine +
    $indent + "    customer.customerName = customerName;" +
    [Environment]::NewLine +
    $indent + "}"

$content = [regex]::Replace(
    $content,
    $pattern2,
    [System.Text.RegularExpressions.MatchEvaluator]{
        param($m)
        $replacement2
    },
    1
)

# ---------------------------------------------------------
# FIX 3
# There are TWO output locations:
#   1. branch dashboard
#   2. all-branches dashboard
#
# Both must use the real name first, then ID as fallback.
# ---------------------------------------------------------

$pattern3 = '(?m)^(\s*)customerName\s*:\s*item\.customerName\s*,\s*$'

$matches3 = [regex]::Matches(
    $content,
    $pattern3
)

Write-Host "Fix 3 matches: $($matches3.Count)"

if ($matches3.Count -lt 1) {
    throw "Fix 3 expected at least 1 match, found $($matches3.Count)."
}

$content = [regex]::Replace(
    $content,
    $pattern3,
    '$1customerName: item.customerName || item.customerId,'
)

# ---------------------------------------------------------
# SAVE
# ---------------------------------------------------------

Set-Content `
    $target `
    $content `
    -Encoding UTF8

Write-Host ""
Write-Host "dashboardOverviewService.js UPDATED" -ForegroundColor Green

# ---------------------------------------------------------
# VERIFY
# ---------------------------------------------------------

$verify = Get-Content `
    $target `
    -Raw

Write-Host ""
Write-Host "===== VERIFY =====" -ForegroundColor Cyan

if (-not $verify.Contains('customerName: "",')) {
    throw "Verify failed: initial customer name fix missing."
}

if (-not $verify.Contains('if (customerName) {')) {
    throw "Verify failed: real name replacement missing."
}

$fallbackCount = (
    [regex]::Matches(
        $verify,
        'customerName:\s*item\.customerName\s*\|\|\s*item\.customerId,'
    )
).Count

Write-Host "Initial name fix : OK" -ForegroundColor Green
Write-Host "Real name update : OK" -ForegroundColor Green
Write-Host "Output fallbacks : $fallbackCount" -ForegroundColor Green

if ($fallbackCount -lt 1) {
    throw "Verify failed: output fallback missing."
}

# ---------------------------------------------------------
# NODE CHECK
# ---------------------------------------------------------

Write-Host ""
Write-Host "===== NODE CHECK =====" -ForegroundColor Cyan

Push-Location $root

try {

    node --check ".\electron\pharmfly\dashboardOverviewService.js"

    if ($LASTEXITCODE -ne 0) {
        throw "node --check failed."
    }

    Write-Host "NODE CHECK: OK" -ForegroundColor Green

}
finally {

    Pop-Location

}

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Write-Host ""