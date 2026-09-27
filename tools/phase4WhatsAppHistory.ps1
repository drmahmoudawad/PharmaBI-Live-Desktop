$ErrorActionPreference = "Stop"

$root = "D:\PharmaBI-Live-Desktop"

$path = Join-Path `
    $root `
    "electron\pharmfly\customers\crm\whatsappService.js"

if (-not (Test-Path $path)) {
    throw "whatsappService.js not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item `
    $path `
    "$path.backup-phase4-$stamp" `
    -Force

$text = Get-Content $path -Raw

$startMarker =
    "    async function getHistory("

$endMarker =
    "    /*`r`n     * =========================================================`r`n     * STATUS"

$startIndex =
    $text.IndexOf(
        $startMarker
    )

if (
    $startIndex -lt 0
) {
    throw "getHistory start marker not found."
}

$endIndex =
    $text.IndexOf(
        $endMarker,
        $startIndex
    )

if (
    $endIndex -lt 0
) {

    $endMarker =
        "    /*`n     * =========================================================`n     * STATUS"

    $endIndex =
        $text.IndexOf(
            $endMarker,
            $startIndex
        )

}

if (
    $endIndex -lt 0
) {
    throw "getHistory end marker not found."
}


$newFunction = @'
    async function getHistory(
        filters = {}
    ) {

        const db =
            getDatabase();


        const {
            branchId = null,
            customerId = null,
            campaignId = null,
            status = null,
            direction = null,
            phone = null,
            limit = 100,
            offset = 0
        } = filters;


        const normalizedBranchId =
            toPositiveInteger(
                branchId
            );


        const normalizedCustomerId =
            customerId !== null &&
            customerId !== undefined &&
            String(
                customerId
            ).trim() !== ""
                ? String(
                    customerId
                )
                : null;


        const normalizedCampaignId =
            toPositiveInteger(
                campaignId
            );


        const normalizedStatus =
            status
                ? String(
                    status
                ).toLowerCase()
                : null;


        const normalizedDirection =
            direction
                ? String(
                    direction
                ).toUpperCase()
                : null;


        const normalizedPhone =
            normalizePhone(
                phone
            );


        const safeLimit =
            Math.min(
                500,
                Math.max(
                    1,
                    Number(
                        limit
                    ) || 100
                )
            );


        const safeOffset =
            Math.max(
                0,
                Number(
                    offset
                ) || 0
            );


        /*
         * =====================================================
         * MATCHED HISTORY
         * =====================================================
         */

        const matchedWhere =
            [
                "1 = 1"
            ];

        const matchedParams =
            [];


        if (
            normalizedBranchId
        ) {

            matchedWhere.push(
                "branch_id = ?"
            );

            matchedParams.push(
                normalizedBranchId
            );

        }


        if (
            normalizedCustomerId
        ) {

            matchedWhere.push(
                "customer_id = ?"
            );

            matchedParams.push(
                normalizedCustomerId
            );

        }


        if (
            normalizedCampaignId
        ) {

            matchedWhere.push(
                "campaign_id = ?"
            );

            matchedParams.push(
                normalizedCampaignId
            );

        }


        if (
            normalizedStatus
        ) {

            matchedWhere.push(
                "LOWER(status) = ?"
            );

            matchedParams.push(
                normalizedStatus
            );

        }


        if (
            normalizedDirection
        ) {

            matchedWhere.push(
                "direction = ?"
            );

            matchedParams.push(
                normalizedDirection
            );

        }


        if (
            normalizedPhone
        ) {

            matchedWhere.push(
                "recipient_phone = ?"
            );

            matchedParams.push(
                normalizedPhone
            );

        }


        /*
         * =====================================================
         * NEW CUSTOMER HISTORY
         *
         * Only unresolved rows are returned here.
         *
         * RESOLVED rows already have a normal linked copy in
         * crm_whatsapp_messages, so returning them too would
         * duplicate the conversation.
         * =====================================================
         */

        const unmatchedWhere =
            [
                "status <> 'RESOLVED'"
            ];

        const unmatchedParams =
            [];


        if (
            normalizedBranchId
        ) {

            unmatchedWhere.push(
                `
                (
                    resolved_branch_id = ?
                    OR
                    resolved_branch_id IS NULL
                )
                `
            );

            unmatchedParams.push(
                normalizedBranchId
            );

        }


        if (
            normalizedCustomerId
        ) {

            /*
             * An unresolved message has no customer yet,
             * therefore it cannot match a customer filter.
             */
            unmatchedWhere.push(
                "1 = 0"
            );

        }


        if (
            normalizedCampaignId
        ) {

            /*
             * Unmatched messages are not campaign-attributed.
             */
            unmatchedWhere.push(
                "1 = 0"
            );

        }


        if (
            normalizedStatus
        ) {

            unmatchedWhere.push(
                "LOWER(status) = ?"
            );

            unmatchedParams.push(
                normalizedStatus
            );

        }


        if (
            normalizedDirection &&
            normalizedDirection !== "INBOUND"
        ) {

            unmatchedWhere.push(
                "1 = 0"
            );

        }


        if (
            normalizedPhone
        ) {

            unmatchedWhere.push(
                "phone = ?"
            );

            unmatchedParams.push(
                normalizedPhone
            );

        }


        const matchedSql =
            `
            SELECT
                id,
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
                created_at,

                NULL AS unmatched_message_id,

                0 AS is_unmatched,

                NULL AS unmatched_status,

                NULL AS resolution_source

            FROM crm_whatsapp_messages

            WHERE
                ${matchedWhere.join(
                    " AND "
                )}
            `;


        const unmatchedSql =
            `
            SELECT
                NULL AS id,
                resolved_branch_id AS branch_id,
                resolved_customer_id AS customer_id,
                NULL AS campaign_id,
                NULL AS campaign_target_id,
                NULL AS interaction_id,
                whatsapp_account_id,
                'INBOUND' AS direction,
                message_type,
                NULL AS template_name,
                'ar' AS template_language,
                body_text,
                provider_message_id,
                phone AS recipient_phone,
                'received' AS status,
                1 AS inbound_reply,
                created_at,

                id AS unmatched_message_id,

                1 AS is_unmatched,

                status AS unmatched_status,

                NULL AS resolution_source

            FROM crm_whatsapp_unmatched_messages

            WHERE
                ${unmatchedWhere.join(
                    " AND "
                )}
            `;


        const sql =
            `
            SELECT
                history.*,

                CASE
                    WHEN history.is_unmatched = 1
                        THEN 'ط¹ظ…ظٹظ„ ط¬ط¯ظٹط¯'
                    ELSE COALESCE(
                        (
                            SELECT
                                customer_name
                            FROM crm_customer_profiles p
                            WHERE
                                p.branch_id =
                                    history.branch_id
                                AND
                                p.customer_id =
                                    history.customer_id
                            LIMIT 1
                        ),
                        history.recipient_phone
                    )
                END AS customer_name

            FROM (
                ${matchedSql}

                UNION ALL

                ${unmatchedSql}

            ) history

            ORDER BY
                history.created_at DESC,
                COALESCE(
                    history.id,
                    history.unmatched_message_id
                ) DESC

            LIMIT ${safeLimit}

            OFFSET ${safeOffset}
            `;


        const rows =
            db.prepare(
                sql
            )
                .all(
                    ...matchedParams,
                    ...unmatchedParams
                );


        return rows;

    }


'@


$text =
    $text.Substring(
        0,
        $startIndex
    ) +
    $newFunction +
    $text.Substring(
        $endIndex
    )


Set-Content `
    -Path $path `
    -Value $text `
    -Encoding UTF8


Write-Host ""
Write-Host "PHASE 4 COMPLETE" -ForegroundColor Green
Write-Host "History = matched + NEW customer messages" -ForegroundColor Cyan
Write-Host "RESOLVED unmatched rows are hidden from UNION to prevent duplicates." -ForegroundColor Cyan
Write-Host "NEW messages display as: NEW CUSTOMER" -ForegroundColor Cyan
Write-Host ""

node --check $path
