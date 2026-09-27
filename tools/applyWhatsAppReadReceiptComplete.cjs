const fs = require("fs");

const servicePath =
    "./electron/pharmfly/customers/crm/whatsappService.js";

const pagePath =
    "./src/components/WhatsAppPage.jsx";

let service =
    fs.readFileSync(servicePath, "utf8");

let page =
    fs.readFileSync(pagePath, "utf8");


/* ============================================================
   BACKEND: add recipient_phone to ACK SELECT
   ============================================================ */

if (
    !service.includes(
        "existing.recipient_phone"
    )
) {
    throw new Error(
        "ACK payload phone is missing."
    );
}

if (
    !service.includes(
        "recipient_phone"
    )
) {

    const ackEventIndex =
        service.indexOf(
            '"message_ack"'
        );

    if (ackEventIndex < 0) {
        throw new Error(
            "message_ack event not found."
        );
    }

    const selectStart =
        service.lastIndexOf(
            "SELECT",
            ackEventIndex
        );

    if (selectStart < 0) {
        throw new Error(
            "ACK SELECT statement not found."
        );
    }

    const fromIndex =
        service.indexOf(
            "FROM crm_whatsapp_messages",
            selectStart
        );

    if (fromIndex < 0) {
        throw new Error(
            "ACK crm_whatsapp_messages FROM not found."
        );
    }

    const interactionIndex =
        service.lastIndexOf(
            "interaction_id",
            fromIndex
        );

    if (
        interactionIndex < selectStart
    ) {
        throw new Error(
            "ACK interaction_id field not found."
        );
    }

    const afterInteraction =
        service.indexOf(
            ",",
            interactionIndex
        );

    if (
        afterInteraction < 0 ||
        afterInteraction > fromIndex
    ) {
        throw new Error(
            "ACK interaction_id comma not found."
        );
    }

    const insertion =
        `
                    recipient_phone,`;

    service =
        service.slice(
            0,
            afterInteraction + 1
        ) +
        insertion +
        service.slice(
            afterInteraction + 1
        );
}


/* ============================================================
   FRONTEND: clear unread after sending outbound message
   ============================================================ */

const sendStart =
    page.indexOf(
        "async function sendConversationMessage"
    );

const initStart =
    page.indexOf(
        "async function initializeWhatsApp"
    );

if (
    sendStart < 0 ||
    initStart < 0 ||
    initStart <= sendStart
) {
    throw new Error(
        "sendConversationMessage region not found."
    );
}

const sendRegion =
    page.slice(
        sendStart,
        initStart
    );

if (
    !sendRegion.includes(
        "markConversationRead"
    )
) {

    const draftIndex =
        sendRegion.indexOf(
            'setConversationDraft(\n                  ""\n              );'
        );

    if (draftIndex < 0) {
        throw new Error(
            "Outbound draft reset not found."
        );
    }

    const draftEnd =
        draftIndex +
        'setConversationDraft(\n                  ""\n              );'
            .length;

    const outboundRead =
`
              
              markConversationRead(
                  conversationPhone
              );`;

    const newSendRegion =
        sendRegion.slice(
            0,
            draftEnd
        ) +
        outboundRead +
        sendRegion.slice(
            draftEnd
        );

    page =
        page.slice(
            0,
            sendStart
        ) +
        newSendRegion +
        page.slice(
            initStart
        );
}


/* ============================================================
   FRONTEND: REAL READ ACK
   ============================================================ */

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {

    const behaviorText =
        "FINAL WHATSAPP INBOX BEHAVIOR";

    const behaviorIndex =
        page.indexOf(
            behaviorText
        );

    if (behaviorIndex < 0) {
        throw new Error(
            "FINAL WHATSAPP INBOX BEHAVIOR not found."
        );
    }

    const commentStart =
        page.lastIndexOf(
            "/*",
            behaviorIndex
        );

    if (commentStart < 0) {
        throw new Error(
            "Inbound effect comment start not found."
        );
    }

    const ackEffect = `
    /*
     * ========================================================
     * WHATSAPP OUTBOUND READ RECEIPT
     * ========================================================
     */

    /* pharmabi-wa-message-ack-reader */
    useEffect(
        () => {

            const ackHandler =
                (
                    first,
                    second
                ) => {

                    const payload =
                        getEventPayload(
                            first,
                            second
                        );

                    if (
                        !payload ||
                        typeof payload !== "object"
                    ) {
                        return;
                    }

                    const phone =
                        String(
                            payload.phone ||
                            payload.recipient_phone ||
                            ""
                        ).trim();

                    const status =
                        String(
                            payload.status ||
                            ""
                        ).trim().toLowerCase();

                    if (
                        !phone ||
                        status !== "read"
                    ) {
                        return;
                    }

                    markConversationRead(
                        phone
                    );

                };

            try {

                window
                    .pharmaBI
                    ?.whatsapp
                    ?.onMessageAck?.(
                        ackHandler
                    );

            }
            catch (
                error
            ) {

                console.warn(
                    "[WhatsApp] ACK listener setup failed:",
                    error
                );

            }

            return () => {

                try {

                    window
                        .pharmaBI
                        ?.whatsapp
                        ?.offMessageAck?.(
                            ackHandler
                        );

                }
                catch {
                    // Optional cleanup.
                }

            };

        },
        []
    );


`;

    page =
        page.slice(
            0,
            commentStart
        ) +
        ackEffect +
        page.slice(
            commentStart
        );
}


/* ============================================================
   VALIDATION
   ============================================================ */

const ackSelectStart =
    service.lastIndexOf(
        "SELECT",
        service.indexOf(
            '"message_ack"'
        )
    );

const ackFrom =
    service.indexOf(
        "FROM crm_whatsapp_messages",
        ackSelectStart
    );

const ackSelectRegion =
    service.slice(
        ackSelectStart,
        ackFrom
    );

if (
    !ackSelectRegion.includes(
        "recipient_phone"
    )
) {
    throw new Error(
        "recipient_phone was not added to ACK SELECT."
    );
}

if (
    !service.includes(
        "existing.recipient_phone"
    )
) {
    throw new Error(
        "ACK payload phone missing."
    );
}

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {
    throw new Error(
        "ACK listener missing."
    );
}

if (
    !page.includes(
        "onMessageAck"
    )
) {
    throw new Error(
        "onMessageAck missing."
    );
}

if (
    !page.includes(
        "offMessageAck"
    )
) {
    throw new Error(
        "offMessageAck missing."
    );
}


/* ============================================================
   BACKUPS + WRITE
   ============================================================ */

const stamp =
    Date.now();

const serviceBackup =
    `${servicePath}.backup-before-read-receipt-complete-${stamp}`;

const pageBackup =
    `${pagePath}.backup-before-read-receipt-complete-${stamp}`;

fs.copyFileSync(
    servicePath,
    serviceBackup
);

fs.copyFileSync(
    pagePath,
    pageBackup
);

fs.writeFileSync(
    servicePath,
    service,
    "utf8"
);

fs.writeFileSync(
    pagePath,
    page,
    "utf8"
);

console.log("");
console.log("==============================================");
console.log("WHATSAPP READ RECEIPT COMPLETE FIX APPLIED");
console.log("==============================================");
console.log(`SERVICE BACKUP: ${serviceBackup}`);
console.log(`PAGE BACKUP:    ${pageBackup}`);
console.log("");
console.log("ACK SELECT includes recipient_phone.");
console.log("ACK payload includes phone.");
console.log("Renderer listens to onMessageAck.");
console.log("READ ACK clears sidebar unread.");
console.log("Outbound send clears local unread.");
