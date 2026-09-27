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
   BACKEND
   ============================================================ */

const oldAck =
`        emitEvent(
            "message_ack",
            {
                messageId:
                    existing.id,

                providerMessageId,

                branchId:
                    existing.branch_id ||
                    null,

                customerId:
                    existing.customer_id ||
                    null,

                campaignId:
                    existing.campaign_id ||
                    null,

                campaignTargetId:
                    existing.campaign_target_id ||
                    null,

                ack:
                    Number(
                        ack
                    ),

                status:
                    statusFromAck
            }
        );`;

const newAck =
`        emitEvent(
            "message_ack",
            {
                messageId:
                    existing.id,

                providerMessageId,

                branchId:
                    existing.branch_id ||
                    null,

                customerId:
                    existing.customer_id ||
                    null,

                phone:
                    existing.recipient_phone ||
                    null,

                campaignId:
                    existing.campaign_id ||
                    null,

                campaignTargetId:
                    existing.campaign_target_id ||
                    null,

                ack:
                    Number(
                        ack
                    ),

                status:
                    statusFromAck
            }
        );`;

if (
    !service.includes(
        "phone:\n                    existing.recipient_phone"
    )
) {

    if (!service.includes(oldAck)) {
        throw new Error(
            "Exact message_ack payload block not found."
        );
    }

    service =
        service.replace(
            oldAck,
            newAck
        );
}


/* ============================================================
   FRONTEND: OUTBOUND MUST NOT BECOME UNREAD
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

let sendRegion =
    page.slice(
        sendStart,
        initStart
    );

if (
    !sendRegion.includes(
        "markConversationRead"
    )
) {

    const draftReset =
`              setConversationDraft(
                  ""
              );`;

    if (!sendRegion.includes(draftReset)) {
        throw new Error(
            "Exact outbound draft reset block not found."
        );
    }

    const newDraftReset =
`${draftReset}

              markConversationRead(
                  conversationPhone
              );`;

    sendRegion =
        sendRegion.replace(
            draftReset,
            newDraftReset
        );

    page =
        page.slice(
            0,
            sendStart
        ) +
        sendRegion +
        page.slice(
            initStart
        );
}


/* ============================================================
   FRONTEND: INBOUND ONLY
   ============================================================ */

const inboundStart =
    page.indexOf(
        "const messageHandler"
    );

const inboundTry =
    page.indexOf(
        "            try {",
        inboundStart
    );

if (
    inboundStart < 0 ||
    inboundTry < 0
) {
    throw new Error(
        "Inbound messageHandler not found."
    );
}

let inboundRegion =
    page.slice(
        inboundStart,
        inboundTry
    );

if (
    !inboundRegion.includes(
        "incomingDirection"
    )
) {

    const phoneEnd =
        inboundRegion.indexOf(
            '                    if (!incomingPhone)'
        );

    if (phoneEnd < 0) {
        throw new Error(
            "Inbound phone validation anchor not found."
        );
    }

    const incomingPhoneBlock =
        inboundRegion.slice(
            inboundRegion.lastIndexOf(
                "                    const incomingPhone",
                phoneEnd
            ),
            phoneEnd
        );

    const directionBlock =
`
                    const incomingDirection =
                        String(
                            payload.direction ||
                            "INBOUND"
                        ).trim().toUpperCase();

                    if (
                        incomingDirection !==
                        "INBOUND"
                    ) {
                        return;
                    }

`;

    inboundRegion =
        inboundRegion.replace(
            incomingPhoneBlock,
            incomingPhoneBlock +
            directionBlock
        );

    page =
        page.slice(
            0,
            inboundStart
        ) +
        inboundRegion +
        page.slice(
            inboundTry
        );
}


/* ============================================================
   FRONTEND: REAL WHATSAPP READ ACK
   ============================================================ */

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {

    const marker =
`    /*
     * ========================================================
     * FINAL WHATSAPP INBOX BEHAVIOR`;

    const markerIndex =
        page.indexOf(marker);

    if (markerIndex < 0) {
        throw new Error(
            "Final WhatsApp inbox marker not found."
        );
    }

    const ackEffect =
`
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
            markerIndex
        ) +
        ackEffect +
        page.slice(
            markerIndex
        );
}


/* ============================================================
   VALIDATION
   ============================================================ */

if (
    !service.includes(
        "existing.recipient_phone"
    )
) {
    throw new Error(
        "Backend ACK phone validation failed."
    );
}

if (
    !page.includes(
        "markConversationRead"
    )
) {
    throw new Error(
        "Frontend markConversationRead missing."
    );
}

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {
    throw new Error(
        "ACK listener validation failed."
    );
}

if (
    !page.includes(
        "onMessageAck"
    )
) {
    throw new Error(
        "onMessageAck validation failed."
    );
}

if (
    !page.includes(
        "incomingDirection"
    )
) {
    throw new Error(
        "Inbound direction validation failed."
    );
}


/* ============================================================
   BACKUP + WRITE
   ============================================================ */

const stamp =
    new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

const serviceBackup =
    `${servicePath}.backup-before-read-receipt-direct-${stamp}`;

const pageBackup =
    `${pagePath}.backup-before-read-receipt-direct-${stamp}`;

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
console.log("WHATSAPP READ RECEIPT DIRECT FIX APPLIED");
console.log("==============================================");
console.log(`SERVICE BACKUP: ${serviceBackup}`);
console.log(`PAGE BACKUP:    ${pageBackup}`);
console.log("");
console.log("ACK includes recipient phone.");
console.log("Frontend listens for READ ACK.");
console.log("Outbound messages are never treated as inbound.");
console.log("Sending a message clears local unread state.");
