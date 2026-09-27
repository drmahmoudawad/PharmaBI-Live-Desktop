$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$servicePath = Join-Path $root "electron\pharmfly\customers\crm\whatsappService.js"
$schemaPath  = Join-Path $root "electron\pharmfly\customers\crm\crmOperationalSchema.js"

if (-not (Test-Path $servicePath)) {
    throw "whatsappService.js not found."
}

if (-not (Test-Path $schemaPath)) {
    throw "crmOperationalSchema.js not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $servicePath `
    "$servicePath.backup-phase1-$stamp" `
    -Force

Copy-Item `
    $schemaPath `
    "$schemaPath.backup-phase1-$stamp" `
    -Force

$service = Get-Content $servicePath -Raw
$schema  = Get-Content $schemaPath -Raw

# ============================================================
# 1. MAKE WHATSAPP ACCOUNT GLOBAL
# ============================================================

$accountPattern = '(?s)branch_id\s*=\s*COALESCE\(\s*\?\s*,\s*branch_id\s*\)'

$updatedService = [regex]::Replace(
    $service,
    $accountPattern,
    "branch_id = NULL",
    1
)

if ($updatedService -eq $service) {

    Write-Host ""
    Write-Host "No COALESCE branch assignment found." -ForegroundColor Yellow
    Write-Host "Checking whether this service already uses a global account..." -ForegroundColor Yellow

    if ($service -match 'branch_id\s*=\s*NULL') {

        Write-Host "Global account assignment already present." -ForegroundColor Green

    }
    else {

        throw "Could not locate WhatsApp account branch assignment."

    }

}
else {

    $service = $updatedService

    Write-Host "WhatsApp account branch assignment changed to GLOBAL." -ForegroundColor Green

}

# ============================================================
# 2. ADD UNMATCHED WHATSAPP TABLE TO OPERATIONAL SCHEMA
# ============================================================

if (-not $schema.Contains("crm_whatsapp_unmatched_messages")) {

    $marker = "CREATE TABLE IF NOT EXISTS crm_whatsapp_events"

    $markerIndex = $schema.IndexOf($marker)

    if ($markerIndex -lt 0) {
        throw "Could not locate crm_whatsapp_events schema marker."
    }

    $tableSql = @'
CREATE TABLE IF NOT EXISTS crm_whatsapp_unmatched_messages (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    whatsapp_account_id INTEGER,

    phone TEXT NOT NULL,

    message_type TEXT,

    body_text TEXT,

    provider_message_id TEXT UNIQUE,

    message_timestamp INTEGER,

    status TEXT NOT NULL DEFAULT 'NEW',

    resolved_branch_id INTEGER,

    resolved_customer_id TEXT,

    resolved_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS
    idx_crm_whatsapp_unmatched_phone
ON crm_whatsapp_unmatched_messages (
    phone
);

CREATE INDEX IF NOT EXISTS
    idx_crm_whatsapp_unmatched_status
ON crm_whatsapp_unmatched_messages (
    status
);

'@

    $schema =
        $schema.Substring(
            0,
            $markerIndex
        ) +
        $tableSql +
        $schema.Substring(
            $markerIndex
        )

    Write-Host "Unmatched WhatsApp table added." -ForegroundColor Green

}
else {

    Write-Host "Unmatched WhatsApp table already exists." -ForegroundColor Green

}

# ============================================================
# 3. SAVE
# ============================================================

Set-Content `
    -Path $servicePath `
    -Value $service `
    -Encoding UTF8

Set-Content `
    -Path $schemaPath `
    -Value $schema `
    -Encoding UTF8

# ============================================================
# 4. VERIFY
# ============================================================

$serviceCheck = Get-Content $servicePath -Raw
$schemaCheck  = Get-Content $schemaPath -Raw

if (
    $serviceCheck -notmatch 'branch_id\s*=\s*NULL'
) {
    throw "Verification failed: global WhatsApp account assignment."
}

if (
    $schemaCheck -notmatch 'crm_whatsapp_unmatched_messages'
) {
    throw "Verification failed: unmatched WhatsApp table."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PHASE 1 COMPLETE" -ForegroundColor Green
Write-Host "WhatsApp account = GLOBAL" -ForegroundColor Green
Write-Host "Unmatched message storage = READY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""