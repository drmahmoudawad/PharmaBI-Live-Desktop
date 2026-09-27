$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$servicePath = Join-Path `
    $root `
    "electron\pharmfly\customers\crm\whatsappService.js"

if (-not (Test-Path $servicePath)) {
    throw "whatsappService.js not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $servicePath `
    "$servicePath.backup-phase2-$stamp" `
    -Force

$service = Get-Content $servicePath -Raw

$startMarker = "    async function handleInboundMessage("
$endMarker   = "    async function handleMessageAck("

$startIndex = $service.IndexOf($startMarker)
$endIndex   = $service.IndexOf($endMarker)

if ($startIndex -lt 0) {
    throw "handleInboundMessage start marker not found."
}

if ($endIndex -lt 0) {
    throw "handleMessageAck marker not found."
}

if ($endIndex -le $startIndex) {
    throw "Invalid function boundaries."
}

$newFunction = @'
    async function handleInboundMessage(
        message
    ) {

        if (
            !message
        ) {

            return null;

        }


        const from =
            normalizePhone(
                message.from
                    ?.replace(
                        /@c\.us$/i,
                        ""
                    )
            );

        if (
            !from
        ) {

            return null;

        }


        const db =
            getDatabase();


        const providerMessageId =
            serializeMessageId(
                message.id
            );


        const body =
            sanitizeText(
                message.body
            );


        const messageType =
            getMessageType(
                message.type
            );


        /*
         * =====================================================
         * GLOBAL WHATSAPP ACCOUNT
         * =====================================================
         */

        const account =
            db.prepare(
                `
                SELECT
                    id
                FROM crm_whatsapp_accounts
                WHERE
                    provider = ?
                ORDER BY
                    id
                LIMIT 1
                `
            )
                .get(
                    PROVIDER
                );


        const whatsappAccountId =
            toPositiveInteger(
                account?.id
            );


        /*
         * =====================================================
         * RESOLVE CUSTOMER
         *
         * Priority:
         *
         * 1. Latest outbound message to this number.
         * 2. Unique CRM phone match.
         * 3. Otherwise NEW CUSTOMER.
         *
         * =====================================================
         */

        let branchId =
            null;

        let customerId =
            null;

        let customerName =
            null;

        let resolutionSource =
            null;


        const latestOutbound =
            db.prepare(
                `
                SELECT
                    branch_id,
                    customer_id
                FROM crm_whatsapp_messages
                WHERE
                    direction = 'OUTBOUND'
                    AND recipient_phone = ?
                    AND branch_id IS NOT NULL
                    AND customer_id IS NOT NULL
                ORDER BY
                    id DESC
                LIMIT 1
                `
            )
                .get(
                    from
                );


        if (
            latestOutbound?.branch_id &&
            latestOutbound?.customer_id !== null &&
            latestOutbound?.customer_id !== undefined
        ) {

            branchId =
                toPositiveInteger(
                    latestOutbound.branch_id
                );

            customerId =
                String(
                    latestOutbound.customer_id
                );

            resolutionSource =
                "LATEST_OUTBOUND";


            const outboundProfile =
                db.prepare(
                    `
                    SELECT
                        customer_name
                    FROM crm_customer_profiles
                    WHERE
                        branch_id = ?
                        AND customer_id = ?
                    LIMIT 1
                    `
                )
                    .get(
                        branchId,
                        customerId
                    );


            customerName =
                outboundProfile?.customer_name ||
                null;

        }


        if (
            !branchId ||
            !customerId
        ) {

            const phoneMatches =
                db.prepare(
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
                )
                    .all(
                        from
                    );


            if (
                phoneMatches.length === 1
            ) {

                branchId =
                    toPositiveInteger(
                        phoneMatches[0].branch_id
                    );

                customerId =
                    phoneMatches[0].customer_id !== null &&
                    phoneMatches[0].customer_id !== undefined
                        ? String(
                            phoneMatches[0].customer_id
                        )
                        : null;

                customerName =
                    phoneMatches[0].customer_name ||
                    null;

                resolutionSource =
                    "CRM_PHONE";

            }

        }


        /*
         * =====================================================
         * UNMATCHED / NEW CUSTOMER
         * =====================================================
         */

        if (
            !branchId ||
            !customerId
        ) {

            const status =
                "NEW";


            let unmatchedId =
                null;


            try {

                const result =
                    db.prepare(
                        `
                        INSERT OR IGNORE INTO
                            crm_whatsapp_unmatched_messages (
                                whatsapp_account_id,
                                phone,
                                message_type,
                                body_text,
                                provider_message_id,
                                message_timestamp,
                                status
                            )
                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `
                    )
                        .run(
                            whatsappAccountId,
                            from,
                            messageType,
                            body,
                            providerMessageId,
                            Number(
                                message.timestamp ||
                                0
                            ) || null,
                            status
                        );


                unmatchedId =
                    result.lastInsertRowid;


                if (
                    !unmatchedId &&
                    providerMessageId
                ) {

                    const existing =
                        db.prepare(
                            `
                            SELECT
                                id
                            FROM crm_whatsapp_unmatched_messages
                            WHERE
                                provider_message_id = ?
                            LIMIT 1
                            `
                        )
                            .get(
                                providerMessageId
                            );


                    unmatchedId =
                        existing?.id ||
                        null;

                }

            }
            catch (
                error
            ) {

                console.error(
                    "[WhatsApp] Failed to save unmatched inbound message:",
                    error
                );

                return null;

            }


            emitEvent(
                "message",
                {
                    direction:
                        "INBOUND",

                    messageId:
                        null,

                    unmatchedMessageId:
                        unmatchedId,

                    providerMessageId,

                    branchId:
                        null,

                    customerId:
                        null,

                    customerName:
                        "عميل جديد",

                    phone:
                        from,

                    body,

                    messageType,

                    status:
                        "NEW",

                    resolutionSource:
                        null,

                    timestamp:
                        formatDateFromUnixTimestamp(
                            message.timestamp
                        )
                }
            );


            return {
                messageId:
                    null,

                unmatchedMessageId:
                    unmatchedId,

                interactionId:
                    null,

                providerMessageId,

                matched:
                    false,

                status:
                    "NEW"
            };

        }


        /*
         * =====================================================
         * MATCHED CUSTOMER
         * =====================================================
         */

        let messageRow =
            null;


        try {

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
                        datetime('now')
                    )
                    `
                )
                    .run(
                        branchId,
                        customerId,
                        whatsappAccountId,
                        messageType,
                        body,
                        providerMessageId,
                        from
                    );


            messageRow =
                result.lastInsertRowid;

        }
        catch (
            error
        ) {

            console.error(
                "[WhatsApp] Matched inbound message DB insert failed:",
                error
            );

            return null;

        }


        let interactionId =
            null;


        try {

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
                        datetime('now'),
                        ?,
                        datetime('now')
                    )
                    `
                )
                    .run(
                        branchId,
                        customerId,
                        from,
                        providerMessageId,
                        body,
                        JSON.stringify(
                            {
                                whatsappMessageId:
                                    messageRow,

                                messageType,

                                from,

                                timestamp:
                                    message.timestamp ||
                                    null,

                                resolutionSource
                            }
                        )
                    );


            interactionId =
                result.lastInsertRowid;


            if (
                messageRow &&
                interactionId
            ) {

                db.prepare(
                    `
                    UPDATE crm_whatsapp_messages
                    SET
                        interaction_id = ?
                    WHERE id = ?
                    `
                )
                    .run(
                        interactionId,
                        messageRow
                    );

            }

        }
        catch (
            error
        ) {

            console.warn(
                "[WhatsApp] Inbound CRM interaction insert failed:",
                error?.message ||
                    error
            );

        }


        try {

            db.prepare(
                `
                UPDATE crm_customer_profiles
                SET
                    last_crm_campaign_id =
                        COALESCE(
                            last_crm_campaign_id,
                            NULL
                        )
                WHERE
                    branch_id = ?
                    AND customer_id = ?
                `
            )
                .run(
                    branchId,
                    customerId
                );

        }
        catch {
            // Optional profile update.
        }


        emitEvent(
            "message",
            {
                direction:
                    "INBOUND",

                messageId:
                    messageRow,

                providerMessageId,

                branchId,

                customerId,

                customerName:
                    customerName ||
                    from,

                phone:
                    from,

                body,

                messageType,

                status:
                    "received",

                matched:
                    true,

                resolutionSource,

                timestamp:
                    formatDateFromUnixTimestamp(
                        message.timestamp
                    )
            }
        );


        return {
            messageId:
                messageRow,

            interactionId,

            providerMessageId,

            matched:
                true,

            branchId,

            customerId
        };

    }


'@

$service =
    $service.Substring(
        0,
        $startIndex
    ) +
    $newFunction +
    $service.Substring(
        $endIndex
    )

Set-Content `
    -Path $servicePath `
    -Value $service `
    -Encoding UTF8

Write-Host ""
Write-Host "PHASE 2 COMPLETE" -ForegroundColor Green
Write-Host "Inbound resolution = Latest Outbound -> CRM Phone -> NEW CUSTOMER" -ForegroundColor Cyan
Write-Host "Matched inbound saves branch + customer + WhatsApp account." -ForegroundColor Cyan
Write-Host "Unknown inbound saves to crm_whatsapp_unmatched_messages." -ForegroundColor Cyan
Write-Host ""

node --check $servicePath