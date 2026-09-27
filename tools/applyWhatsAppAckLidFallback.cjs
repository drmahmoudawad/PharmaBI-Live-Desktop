const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");


/* ============================================================
   ADD ACK LID -> PHONE RESOLVER
   ============================================================ */

if (
    !source.includes(
        "async function resolveAckPhone"
    )
) {

    const marker =
        "async function handleMessageAck";

    const markerIndex =
        source.indexOf(marker);

    if (markerIndex < 0) {
        throw new Error(
            "handleMessageAck not found."
        );
    }

    const helper =
`
    async function resolveAckPhone(
        message
    ) {

        const identities = [
            message?.id?.remote,
            message?.from,
            message?.to
        ]
            .filter(Boolean)
            .map(
                value =>
                    String(value).trim()
            )
            .filter(Boolean);


        if (
            identities.length === 0
        ) {
            return null;
        }


        try {

            if (
                client &&
                typeof client.getContactLidAndPhone ===
                    "function"
            ) {

                const mappings =
                    await client.getContactLidAndPhone(
                        identities
                    );


                for (
                    const item of
                        Array.isArray(mappings)
                            ? mappings
                            : []
                ) {

                    const rawPhone =
                        String(
                            item?.pn ||
                            ""
                        )
                            .replace(
                                /@(c\\.us|s\\.whatsapp\\.net|lid)$/i,
                                ""
                            )
                            .trim();


                    const normalized =
                        normalizePhone(
                            rawPhone
                        );


                    if (
                        /^20(10|11|12|15)\\d{8}$/.test(
                            normalized
                        )
                    ) {

                        return normalized;

                    }

                }

            }

        }
        catch (
            error
        ) {

            console.warn(
                "[WhatsApp] ACK LID-to-phone lookup failed:",
                error?.message ||
                    error
            );

        }


        return null;

    }


`;

    source =
        source.slice(
            0,
            markerIndex
        ) +
        helper +
        source.slice(
            markerIndex
        );

}


/* ============================================================
   FALLBACK INSIDE handleMessageAck
   ============================================================ */

const noMatchMarker =
`        if (
            !existing
        ) {

            console.warn(
                "[WA-ACK-DIAG] NO DB MATCH AFTER RETRIES",
                {
                    providerMessageId,
                    statusFromAck,
                    ack
                }
            );

            return null;

        }`;

if (
    !source.includes(
        noMatchMarker
    )
) {
    throw new Error(
        "Final ACK no-match block not found."
    );
}


const fallbackBlock =
`        if (
            !existing
        ) {

            /*
             * sendMessage() may return null in this WhatsApp
             * runtime. The ACK still contains the real provider
             * message id and the remote LID.
             *
             * Resolve the LID -> phone, then bind this provider
             * id to the latest outbound row that has no provider
             * id yet.
             */

            const ackPhone =
                await resolveAckPhone(
                    message
                );


            if (
                ackPhone
            ) {

                console.log(
                    "[WA-ACK-DIAG] FALLBACK PHONE",
                    {
                        providerMessageId,
                        ack,
                        statusFromAck,
                        ackPhone
                    }
                );


                existing =
                    db.prepare(
                        \`
                        SELECT
                            id,
                            branch_id,
                            customer_id,
                            campaign_id,
                            campaign_target_id,
                            interaction_id,
                            recipient_phone
                        FROM crm_whatsapp_messages
                        WHERE
                            direction = 'OUTBOUND'
                            AND
                            recipient_phone = ?
                            AND
                            (
                                provider_message_id IS NULL
                                OR
                                provider_message_id = ''
                            )
                        ORDER BY
                            id DESC
                        LIMIT 1
                        \`
                    )
                        .get(
                            ackPhone
                        );


                if (
                    existing
                ) {

                    db.prepare(
                        \`
                        UPDATE crm_whatsapp_messages
                        SET
                            provider_message_id = ?,
                            status = ?
                        WHERE id = ?
                        \`
                    )
                        .run(
                            providerMessageId,
                            statusFromAck,
                            existing.id
                        );


                    console.log(
                        "[WA-ACK-DIAG] FALLBACK BOUND",
                        {
                            providerMessageId,
                            ack,
                            statusFromAck,
                            messageRowId:
                                existing.id,
                            phone:
                                existing.recipient_phone
                        }
                    );

                }

            }

        }


        if (
            !existing
        ) {

            console.warn(
                "[WA-ACK-DIAG] NO DB MATCH AFTER FALLBACK",
                {
                    providerMessageId,
                    statusFromAck,
                    ack
                }
            );

            return null;

        }`;


source =
    source.replace(
        noMatchMarker,
        fallbackBlock,
        1
    );


/* ============================================================
   VALIDATION
   ============================================================ */

if (
    !source.includes(
        "async function resolveAckPhone"
    )
) {
    throw new Error(
        "ACK phone resolver missing."
    );
}

if (
    !source.includes(
        "[WA-ACK-DIAG] FALLBACK PHONE"
    )
) {
    throw new Error(
        "ACK fallback missing."
    );
}

if (
    !source.includes(
        "NO DB MATCH AFTER FALLBACK"
    )
) {
    throw new Error(
        "Final fallback diagnostic missing."
    );
}

if (
    !source.includes(
        "direction = 'OUTBOUND'"
    )
) {
    throw new Error(
        "Outbound fallback query missing."
    );
}


/* ============================================================
   BACKUP + WRITE
   ============================================================ */

const backup =
    `${path}.backup-before-ack-lid-fallback-${Date.now()}`;

fs.copyFileSync(
    path,
    backup
);

fs.writeFileSync(
    path,
    source,
    "utf8"
);

console.log("");
console.log("==============================================");
console.log("WHATSAPP ACK LID FALLBACK APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
console.log("");
console.log("ACK can now bind provider ID using LID -> phone.");
console.log("Subsequent ACK 2/3 will update the same DB row.");
