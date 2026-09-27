const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");

const functionStart =
    source.indexOf(
        "async function handleMessageAck"
    );

if (functionStart < 0) {
    throw new Error(
        "handleMessageAck not found."
    );
}

const functionEnd =
    source.indexOf(
        "\n    /*\n     * =========================================================\n     * SAVE OUTBOUND QUEUED",
        functionStart
    );

if (
    functionEnd < 0 ||
    functionEnd <= functionStart
) {
    throw new Error(
        "handleMessageAck end not found."
    );
}

let region =
    source.slice(
        functionStart,
        functionEnd
    );


/* ============================================================
   1) Make existing mutable
   ============================================================ */

if (
    region.includes(
        "const existing ="
    )
) {

    region =
        region.replace(
            "const existing =",
            "let existing =",
            1
        );

}


/* ============================================================
   2) Replace the immediate NO DB MATCH return with retry
   ============================================================ */

const oldBlock =
`        if (
            !existing
        ) {

            console.warn(
                "[WA-ACK-DIAG] NO DB MATCH",
                {
                    providerMessageId,
                    statusFromAck,
                    ack
                }
            );

            return null;

        }`;

if (
    !region.includes(
        oldBlock
    )
) {
    throw new Error(
        "Expected NO DB MATCH block not found."
    );
}

const newBlock =
`        if (
            !existing
        ) {

            /*
             * WhatsApp can emit ACK 1/2/3 immediately after
             * sendMessage(), sometimes before sendMessage()
             * finishes writing provider_message_id to SQLite.
             *
             * Retry briefly instead of losing the ACK.
             */

            const retryDelays =
                [
                    100,
                    250,
                    500,
                    1000
                ];

            for (
                const delay of retryDelays
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            delay
                        )
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
                        WHERE provider_message_id = ?
                        ORDER BY id DESC
                        LIMIT 1
                        \`
                    )
                        .get(
                            providerMessageId
                        );

                if (
                    existing
                ) {
                    break;
                }

            }

        }


        if (
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

region =
    region.replace(
        oldBlock,
        newBlock,
        1
    );


/* ============================================================
   3) Validation
   ============================================================ */

if (
    !region.includes(
        "const retryDelays"
    )
) {
    throw new Error(
        "ACK retry logic missing."
    );
}

if (
    !region.includes(
        "existing ="
    )
) {
    throw new Error(
        "Mutable existing validation failed."
    );
}

if (
    !region.includes(
        "NO DB MATCH AFTER RETRIES"
    )
) {
    throw new Error(
        "Retry failure diagnostic missing."
    );
}


/* ============================================================
   4) Rebuild file
   ============================================================ */

source =
    source.slice(
        0,
        functionStart
    ) +
    region +
    source.slice(
        functionEnd
    );


/* ============================================================
   5) Backup + write
   ============================================================ */

const backup =
    `${path}.backup-before-ack-race-fix-${Date.now()}`;

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
console.log("WHATSAPP ACK RACE FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
console.log("");
console.log("ACK 1/2/3 will retry DB lookup.");
console.log("provider_message_id race is now handled.");
