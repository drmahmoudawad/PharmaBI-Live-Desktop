$ErrorActionPreference = "Stop"

$root =
    "D:\PharmaBI-Live-Desktop"

$path =
    Join-Path `
        $root `
        "electron\pharmfly\customers\crm\whatsappService.js"


if (-not (Test-Path $path)) {
    throw "whatsappService.js not found."
}


# ============================================================
# BACKUP
# ============================================================

$stamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-sql-param-fix-$stamp" `
    -Force


# ============================================================
# READ UTF-8
# ============================================================

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
# 1. REPLACE createOutboundLog
# ============================================================

$logPattern =
    '(?s)function createOutboundLog\(\s*db,\s*\{.*?\n\s*\}\s*\)\s*\{.*?\n\s*\}\s*\n\s*\n\s*/\*\s*\n\s*\* =========================================================\s*\n\s*\* CREATE OUTBOUND INTERACTION'

$logReplacement = @'
function createOutboundLog(
    db,
    {
        branchId = null,
        customerId = null,
        campaignId = null,
        campaignTargetId = null,
        accountId = null,
        phone,
        messageType = "TEXT",
        templateName = null,
        templateLanguage = "ar",
        bodyText,
        interactionId = null
    } = {}
) {

    const result =
        db.prepare(
            `
            INSERT INTO crm_whatsapp_messages (
                branch_id,
                customer_id,
                campaign_id,
                campaign_target_id,
                interaction_id,
                whatsapp_account_id,
                direction,
                message_type,
                template_name,
                template_language,
                body_text,
                provider_message_id,
                recipient_phone,
                status,
                queued_at,
                created_at
            )
            VALUES (
                $branchId,
                $customerId,
                $campaignId,
                $campaignTargetId,
                $interactionId,
                $accountId,
                'OUTBOUND',
                $messageType,
                $templateName,
                $templateLanguage,
                $bodyText,
                NULL,
                $phone,
                'queued',
                datetime('now'),
                datetime('now')
            )
            `
        )
        .run({
            $branchId:
                branchId,

            $customerId:
                customerId ||
                `PHONE:${phone}`,

            $campaignId:
                campaignId,

            $campaignTargetId:
                campaignTargetId,

            $interactionId:
                interactionId,

            $accountId:
                accountId,

            $messageType:
                messageType,

            $templateName:
                templateName,

            $templateLanguage:
                templateLanguage,

            $bodyText:
                bodyText,

            $phone:
                phone
        });

    return result.lastInsertRowid;

}


/*
 * =========================================================
 * CREATE OUTBOUND INTERACTION
'@

$logRegex =
    [regex]::new(
        $logPattern
    )

if (-not $logRegex.IsMatch($text)) {
    throw "Could not locate createOutboundLog."
}

$text =
    $logRegex.Replace(
        $text,
        $logReplacement,
        1
    )

Write-Host "createOutboundLog fixed." -ForegroundColor Green


# ============================================================
# 2. REPLACE createOutboundInteraction
# ============================================================

$interactionPattern =
    '(?s)function createOutboundInteraction\(\s*db,\s*\{.*?\n\s*\}\s*\)\s*\{.*?\n\s*\}\s*\n\s*\n\s*/\*\s*\n\s*\* =========================================================\s*\n\s*\* SEND ONE'

$interactionReplacement = @'
function createOutboundInteraction(
    db,
    {
        branchId = null,
        customerId = null,
        campaignId = null,
        campaignTargetId = null,
        phone,
        bodyText,
        messageType = "TEXT"
    } = {}
) {

    const result =
        db.prepare(
            `
            INSERT INTO crm_interactions (
                branch_id,
                customer_id,
                campaign_id,
                campaign_target_id,
                channel,
                direction,
                interaction_type,
                outcome,
                phone,
                message_id,
                subject,
                content,
                employee_id,
                occurred_at,
                metadata_json,
                created_at
            )
            VALUES (
                $branchId,
                $customerId,
                $campaignId,
                $campaignTargetId,
                'WHATSAPP',
                'OUTBOUND',
                'MESSAGE',
                'QUEUED',
                $phone,
                NULL,
                NULL,
                $bodyText,
                NULL,
                datetime('now'),
                $metadataJson,
                datetime('now')
            )
            `
        )
        .run({
            $branchId:
                branchId,

            $customerId:
                customerId ||
                `PHONE:${phone}`,

            $campaignId:
                campaignId,

            $campaignTargetId:
                campaignTargetId,

            $phone:
                phone,

            $bodyText:
                bodyText,

            $metadataJson:
                JSON.stringify({
                    messageType
                })
        });

    return result.lastInsertRowid;

}


/*
 * =========================================================
 * SEND ONE
'@

$interactionRegex =
    [regex]::new(
        $interactionPattern
    )

if (-not $interactionRegex.IsMatch($text)) {
    throw "Could not locate createOutboundInteraction."
}

$text =
    $interactionRegex.Replace(
        $text,
        $interactionReplacement,
        1
    )

Write-Host "createOutboundInteraction fixed." -ForegroundColor Green


# ============================================================
# 3. FIX MATCHED INBOUND INTERACTION PARAMETER COUNT
# ============================================================

$inboundPattern =
    '(?s)(INSERT INTO crm_interactions\s*\(\s*branch_id,\s*customer_id,\s*channel,\s*direction,\s*interaction_type,\s*outcome,\s*phone,\s*message_id,\s*subject,\s*content,\s*employee_id,\s*occurred_at,\s*metadata_json,\s*created_at\s*\).*?\.run\(\s*branchId,\s*customerId,\s*from,\s*)providerMessageId,\s*body,\s*JSON\.stringify'

$inboundRegex =
    [regex]::new(
        $inboundPattern
    )

if ($inboundRegex.IsMatch($text)) {

    $text =
        $inboundRegex.Replace(
            $text,
            '$1body, JSON.stringify',
            1
        )

    Write-Host "Matched inbound interaction parameter count fixed." -ForegroundColor Green

}
else {

    Write-Host "Matched inbound interaction pattern not found; leaving it unchanged." -ForegroundColor Yellow

}


# ============================================================
# 4. WRITE UTF-8
# ============================================================

[System.IO.File]::WriteAllText(
    $path,
    $text,
    $utf8
)


# ============================================================
# 5. VERIFY
# ============================================================

$verify =
    [System.IO.File]::ReadAllText(
        $path,
        $utf8
    )


if (
    $verify -match "طھظ|ط§ط|ظٹظ|ظ…ط|ظˆط"
) {

    throw "Arabic encoding corruption detected."

}


if (
    $verify -notmatch "function createOutboundLog"
) {

    throw "createOutboundLog verification failed."

}


if (
    $verify -notmatch "function createOutboundInteraction"
) {

    throw "createOutboundInteraction verification failed."

}


if (
    $verify -notmatch '\$branchId'
) {

    throw "Named SQLite parameters were not written."

}


Write-Host ""
Write-Host "WHATSAPP SQL PARAMETER FIX COMPLETE" -ForegroundColor Green
Write-Host "Outbound log = FIXED" -ForegroundColor Cyan
Write-Host "Outbound interaction = FIXED" -ForegroundColor Cyan
Write-Host "Inbound interaction = FIXED" -ForegroundColor Cyan
Write-Host "Arabic encoding = OK" -ForegroundColor Green
Write-Host ""


# ============================================================
# BUILD
# ============================================================

npm run build:renderer