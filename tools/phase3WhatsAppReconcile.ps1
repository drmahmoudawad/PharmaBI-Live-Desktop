$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$path = Join-Path `
    $root `
    "electron\ipc\connection.ipc.js"

if (-not (Test-Path $path)) {
    throw "connection.ipc.js not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-phase3-$stamp" `
    -Force

$text = Get-Content $path -Raw

$functionMarker =
    "export async function syncCrmPhonesForBranch("

$responseMarker =
    "    const response = {"

$functionStart =
    $text.IndexOf(
        $functionMarker
    )

if (
    $functionStart -lt 0
) {
    throw "syncCrmPhonesForBranch not found."
}

$responseIndex =
    $text.IndexOf(
        $responseMarker,
        $functionStart
    )

if (
    $responseIndex -lt 0
) {
    throw "Response marker inside syncCrmPhonesForBranch not found."
}

$reconcileBlock = @'

    /*
     * =========================================================
     * WHATSAPP RECONCILIATION
     *
     * After PharmaFly phone synchronization:
     *
     * NEW WhatsApp message
     *        ↓
     * exact normalized phone
     *        ↓
     * exactly one CRM customer globally
     *        ↓
     * copy historical message into CRM WhatsApp history
     *        ↓
     * create CRM interaction
     *        ↓
     * mark unmatched row RESOLVED
     *
     * Never guess when the same phone belongs to multiple
     * CRM customers.
     * =========================================================
     */

    let whatsappReconciled =
        0;

    let whatsappAmbiguous =
        0;

    let whatsappSkipped =
        0;


    try {

        crmDb.prepare(
            `
            CREATE TABLE IF NOT EXISTS
                crm_whatsapp_unmatched_messages (

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

                )
            `
        ).run();


        const unmatchedRows =
            crmDb.prepare(
                `
                SELECT
                    id,
                    whatsapp_account_id,
                    phone,
                    message_type,
                    body_text,
                    provider_message_id,
                    message_timestamp,
                    created_at
                FROM crm_whatsapp_unmatched_messages
                WHERE
                    status = 'NEW'
                    AND phone IS NOT NULL
                    AND TRIM(phone) <> ''
                ORDER BY
                    id
                `
            )
                .all();


        const findCustomer =
            crmDb.prepare(
                `
                SELECT
                    branch_id,
                    customer_id,
                    customer_name
                FROM crm_customer_profiles
                WHERE
                    whatsapp_phone_normalized = ?
                ORDER BY
                    branch_id,
                    customer_id
                `
            );


        const findExistingMessage =
            crmDb.prepare(
                `
                SELECT
                    id,
                    branch_id,
                    customer_id
                FROM crm_whatsapp_messages
                WHERE
                    provider_message_id = ?
                LIMIT 1
                `
            );


        const insertMessage =
            crmDb.prepare(
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
                    inbound_reply,
                    created_at
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    NULL,
                    NULL,
                    ?,
                    'INBOUND',
                    ?,
                    NULL,
                    'ar',
                    ?,
                    ?,
                    ?,
                    'received',
                    1,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        ?
                    )
                )
                `
            );


        const insertInteraction =
            crmDb.prepare(
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
                    ?,
                    ?,
                    NULL,
                    NULL,
                    'WHATSAPP',
                    'INBOUND',
                    'MESSAGE',
                    'RECEIVED',
                    ?,
                    ?,
                    NULL,
                    ?,
                    NULL,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        ?
                    ),
                    ?,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        CURRENT_TIMESTAMP
                    )
                )
                `
            );


        const updateMessageInteraction =
            crmDb.prepare(
                `
                UPDATE crm_whatsapp_messages
                SET
                    interaction_id = ?
                WHERE
                    id = ?
                `
            );


        const resolveUnmatched =
            crmDb.prepare(
                `
                UPDATE crm_whatsapp_unmatched_messages
                SET
                    status = 'RESOLVED',
                    resolved_branch_id = ?,
                    resolved_customer_id = ?,
                    resolved_at = CURRENT_TIMESTAMP
                WHERE
                    id = ?
                `
            );


        const transaction =
            crmDb.transaction(
                () => {

                    for (
                        const row
                        of unmatchedRows
                    ) {

                        const phone =
                            String(
                                row.phone ||
                                ""
                            ).trim();


                        if (
                            !phone
                        ) {

                            whatsappSkipped++;

                            continue;

                        }


                        const matches =
                            findCustomer.all(
                                phone
                            );


                        if (
                            matches.length !== 1
                        ) {

                            if (
                                matches.length > 1
                            ) {

                                whatsappAmbiguous++;

                            }
                            else {

                                whatsappSkipped++;

                            }

                            continue;

                        }


                        const customer =
                            matches[0];


                        const resolvedBranchId =
                            Number(
                                customer.branch_id
                            );


                        const resolvedCustomerId =
                            String(
                                customer.customer_id
                            );


                        if (
                            !Number.isInteger(
                                resolvedBranchId
                            ) ||
                            resolvedBranchId <= 0 ||
                            !resolvedCustomerId
                        ) {

                            whatsappSkipped++;

                            continue;

                        }


                        let messageId =
                            null;


                        if (
                            row.provider_message_id
                        ) {

                            const existing =
                                findExistingMessage.get(
                                    row.provider_message_id
                                );


                            if (
                                existing?.id
                            ) {

                                messageId =
                                    existing.id;

                            }

                        }


                        if (
                            !messageId
                        ) {

                            const messageResult =
                                insertMessage.run(
                                    resolvedBranchId,
                                    resolvedCustomerId,
                                    row.whatsapp_account_id || null,
                                    row.message_type || "chat",
                                    row.body_text || "",
                                    row.provider_message_id || null,
                                    phone,
                                    Number(
                                        row.message_timestamp ||
                                        0
                                    ) || null,
                                    row.created_at || null
                                );


                            messageId =
                                messageResult.lastInsertRowid;

                        }


                        let interactionId =
                            null;


                        const metadata =
                            JSON.stringify(
                                {
                                    whatsappReconciled:
                                        true,

                                    unmatchedMessageId:
                                        row.id,

                                    providerMessageId:
                                        row.provider_message_id ||
                                        null,

                                    messageType:
                                        row.message_type ||
                                        "chat",

                                    phone,

                                    branchId:
                                        resolvedBranchId,

                                    customerId:
                                        resolvedCustomerId,

                                    customerName:
                                        customer.customer_name ||
                                        null
                                }
                            );


                        const interactionResult =
                            insertInteraction.run(
                                resolvedBranchId,
                                resolvedCustomerId,
                                phone,
                                row.provider_message_id || null,
                                row.body_text || "",
                                Number(
                                    row.message_timestamp ||
                                    0
                                ) || null,
                                row.created_at || null,
                                metadata,
                                Number(
                                    row.message_timestamp ||
                                    0
                                ) || null
                            );


                        interactionId =
                            interactionResult.lastInsertRowid;


                        if (
                            messageId &&
                            interactionId
                        ) {

                            updateMessageInteraction.run(
                                interactionId,
                                messageId
                            );

                        }


                        resolveUnmatched.run(
                            resolvedBranchId,
                            resolvedCustomerId,
                            row.id
                        );


                        whatsappReconciled++;

                    }

                }
            );


        transaction();

    }
    catch (
        error
    ) {

        console.warn(
            "[CRM Phone AutoSync] WhatsApp reconciliation failed:",
            error?.message ||
                error
        );

    }

'@

$text =
    $text.Substring(
        0,
        $responseIndex
    ) +
    $reconcileBlock +
    "`r`n" +
    $text.Substring(
        $responseIndex
    )

# Add reconciliation statistics to returned response.
$text =
    $text.Replace(
        @'
        matchedProfiles,
        updatedProfiles
    };
'@,
        @'
        matchedProfiles,
        updatedProfiles,
        whatsappReconciled,
        whatsappAmbiguous,
        whatsappSkipped
    };
'@
    )

Set-Content `
    -Path $path `
    -Value $text `
    -Encoding UTF8

Write-Host ""
Write-Host "PHASE 3 COMPLETE" -ForegroundColor Green
Write-Host "CRM phone sync -> WhatsApp reconciliation ENABLED" -ForegroundColor Cyan
Write-Host "NEW message -> exact phone -> unique CRM customer -> RESOLVED" -ForegroundColor Cyan
Write-Host "Ambiguous phones are NOT auto-linked." -ForegroundColor Yellow
Write-Host ""

node --check $path