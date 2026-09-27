const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");


/* ============================================================
   ACK EVENT LOG
   ============================================================ */

const ackListenerText =
`            async (
                message,
                ack
            ) => {

                try {`;

const ackListenerIndex =
    source.indexOf(
        ackListenerText
    );

if (ackListenerIndex < 0) {
    throw new Error(
        "ACK listener block not found."
    );
}

if (
    !source.includes(
        "[WA-ACK-DIAG]"
    )
) {

    const insertion =
`            async (
                message,
                ack
            ) => {

                console.log(
                    "[WA-ACK-DIAG] EVENT",
                    {
                        ack,
                        ackType:
                            typeof ack,
                        providerMessageId:
                            serializeMessageId(
                                message?.id
                            ),
                        messageId:
                            message?.id || null
                    }
                );

                try {`;

    source =
        source.replace(
            ackListenerText,
            insertion,
            1
        );

}


/* ============================================================
   EXISTING RECORD DIAGNOSTIC
   ============================================================ */

const existingAnchor =
`        if (
            !existing
        ) {

            return null;

        }`;

if (
    !source.includes(
        existingAnchor
    )
) {
    throw new Error(
        "existing ACK guard not found."
    );
}

if (
    !source.includes(
        "[WA-ACK-DIAG] NO DB MATCH"
    )
) {

    const replacement =
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

        }

        console.log(
            "[WA-ACK-DIAG] DB MATCH",
            {
                providerMessageId,
                statusFromAck,
                ack,
                messageRowId:
                    existing.id,
                phone:
                    existing.recipient_phone
            }
        );`;

    source =
        source.replace(
            existingAnchor,
            replacement,
            1
        );

}


/* ============================================================
   STATUS DIAGNOSTIC
   ============================================================ */

const statusAnchor =
`        const statusFromAck =
            getAckStatus(
                ack
            );`;

if (
    !source.includes(
        statusAnchor
    )
) {
    throw new Error(
        "getAckStatus block not found."
    );
}

if (
    !source.includes(
        "[WA-ACK-DIAG] STATUS"
    )
) {

    const replacement =
`        const statusFromAck =
            getAckStatus(
                ack
            );

        console.log(
            "[WA-ACK-DIAG] STATUS",
            {
                ack,
                statusFromAck,
                providerMessageId
            }
        );`;

    source =
        source.replace(
            statusAnchor,
            replacement,
            1
        );

}


/* ============================================================
   EMIT DIAGNOSTIC
   ============================================================ */

const emitAnchor =
`        emitEvent(
            "message_ack",
            {`;

if (
    !source.includes(
        emitAnchor
    )
) {
    throw new Error(
        "message_ack emit block not found."
    );
}

if (
    !source.includes(
        "[WA-ACK-DIAG] EMIT"
    )
) {

    source =
        source.replace(
            emitAnchor,
`        console.log(
            "[WA-ACK-DIAG] EMIT",
            {
                providerMessageId,
                phone:
                    existing.recipient_phone,
                status:
                    statusFromAck,
                ack
            }
        );

        emitEvent(
            "message_ack",
            {`,
            1
        );

}


/* ============================================================
   BACKUP + WRITE
   ============================================================ */

const backup =
    `${path}.backup-before-wa-ack-diagnostics-${Date.now()}`;

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
console.log("WA ACK DIAGNOSTICS ENABLED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
console.log("");
console.log("No WhatsApp logic was changed.");
console.log("Only diagnostic console logs were added.");
