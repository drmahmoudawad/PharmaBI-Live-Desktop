$ErrorActionPreference = "Stop"

$path =
    "D:\PharmaBI-Live-Desktop\electron\pharmfly\customers\crm\whatsappService.js"


if (-not (Test-Path $path)) {
    throw "whatsappService.js not found."
}


$stamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-before-account-param-fix2-$stamp" `
    -Force


$utf8 =
    [System.Text.UTF8Encoding]::new(
        $false,
        $true
    )

$text =
    [System.IO.File]::ReadAllText(
        $path,
        $utf8
    )


# ============================================================
# REMOVE THE EXTRA normalizedBranchId PARAMETER
# FROM ensureWhatsAppAccount UPDATE
# ============================================================

$pattern =
    '(?s)(\.run\(\s*)normalizedBranchId\s*,\s*(name\s*,\s*displayPhoneNumber\s*\|\|\s*null\s*,\s*status\s*\|\|\s*null\s*,\s*status\s*\|\|\s*null\s*,\s*existing\.id\s*)\)'

$replacement =
    '$1$2)'


$regex =
    [regex]::new(
        $pattern
    )


$match =
    $regex.Match(
        $text
    )


if (-not $match.Success) {

    throw "Could not locate the extra normalizedBranchId parameter."

}


$text =
    $regex.Replace(
        $text,
        $replacement,
        1
    )


# ============================================================
# WRITE UTF-8
# ============================================================

[System.IO.File]::WriteAllText(
    $path,
    $text,
    $utf8
)


# ============================================================
# VERIFY
# ============================================================

$verify =
    [System.IO.File]::ReadAllText(
        $path,
        $utf8
    )


$remainingPattern =
    '(?s)\.run\(\s*normalizedBranchId\s*,\s*name\s*,\s*displayPhoneNumber\s*\|\|\s*null\s*,\s*status\s*\|\|\s*null\s*,\s*status\s*\|\|\s*null\s*,\s*existing\.id'

if (
    $verify -match $remainingPattern
) {

    throw "Verification failed: extra normalizedBranchId still exists."

}


if (
    $verify -match "طھظ|ط§ط|ظٹظ|ظ…ط|ظˆط"
) {

    throw "Arabic encoding corruption detected."

}


Write-Host ""
Write-Host "WHATSAPP ACCOUNT PARAMETER FIXED" -ForegroundColor Green
Write-Host "Extra normalizedBranchId removed." -ForegroundColor Cyan
Write-Host "Arabic encoding preserved." -ForegroundColor Green
Write-Host ""


npm run build:renderer