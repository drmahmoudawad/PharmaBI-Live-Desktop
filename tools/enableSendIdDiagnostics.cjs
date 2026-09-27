const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");


const anchor =
`            const providerMessageId =
                serializeMessageId(
                    sent?.id
                );`;

if (!source.includes(anchor)) {
    throw new Error(
        "providerMessageId send block not found."
    );
}


const replacement =
`            const providerMessageId =
                serializeMessageId(
                    sent?.id
                );

            console.log(
                "[WA-SEND-DIAG] AFTER SEND",
                {
                    logId,
                    sentId:
                        sent?.id || null,
                    serialized:
                        providerMessageId,
                    sentObject:
                        sent || null
                }
            );`;


source =
    source.replace(
        anchor,
        replacement,
        1
    );


const updateAnchor =
`                .run(
                    providerMessageId,
                    logId
                );`;

if (!source.includes(updateAnchor)) {
    throw new Error(
        "Outbound UPDATE run block not found."
    );
}


const updateReplacement =
`                .run(
                    providerMessageId,
                    logId
                );

            console.log(
                "[WA-SEND-DIAG] AFTER DB UPDATE",
                db.prepare(
                    \`
                    SELECT
                        id,
                        status,
                        provider_message_id,
                        recipient_phone,
                        sent_at
                    FROM crm_whatsapp_messages
                    WHERE id = ?
                    \`
                ).get(
                    logId
                )
            );`;


source =
    source.replace(
        updateAnchor,
        updateReplacement,
        1
    );


const backup =
    `${path}.backup-before-send-id-diagnostics-${Date.now()}`;

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
console.log("SEND ID DIAGNOSTICS ENABLED");
console.log(`BACKUP: ${backup}`);
