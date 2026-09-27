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
   BACKEND: add phone to message_ack
   ============================================================ */

const ackMarker =
    service.indexOf(
        '"message_ack"'
    );

if (ackMarker < 0) {
    throw new Error(
        "message_ack event not found."
    );
}

const ackEnd =
    service.indexOf(
        "return {",
        ackMarker
    );

if (
    ackEnd < 0 ||
    ackEnd <= ackMarker
) {
    throw new Error(
        "message_ack region end not found."
    );
}

const ackRegion =
    service.slice(
        ackMarker,
        ackEnd
    );

if (
    !ackRegion.includes(
        "existing.recipient_phone"
    )
) {

    const customerPattern =
        /(\bcustomerId\s*:\s*existing\.customer_id\s*\|\|\s*null\s*,)(\s*)(campaignId\s*:)/s;

    if (!customerPattern.test(ackRegion)) {
        throw new Error(
            "ACK customerId/campaignId block not found."
        );
    }

    const newAckRegion =
        ackRegion.replace(
            customerPattern,
`$1$2
                phone:
                    existing.recipient_phone ||
                    null,

                $3`
        );

    service =
        service.slice(
            0,
            ackMarker
        ) +
        newAckRegion +
        service.slice(
            ackEnd
        );
}


/* ============================================================
   FRONTEND: sending our own message must never be unread
   ============================================================ */

const sendMarker =
    page.indexOf(
        "async function sendConversationMessage"
    );

const initMarker =
    page.indexOf(
        "async function initializeWhatsApp"
    );

if (
    sendMarker < 0 ||
    initMarker < 0 ||
    initMarker <= sendMarker
) {
    throw new Error(
        "sendConversationMessage region not found."
    );
}

let sendRegion =
    page.slice(
        sendMarker,
        initMarker
    );

if (
    !sendRegion.includes(
        "markConversationRead(\n                  conversationPhone"
    )
) {

    const draftReset =
        /(\bsetConversationDraft\s*\(\s*""\s*\)\s*;)/;

    if (!draftReset.test(sendRegion)) {
        throw new Error(
            "setConversationDraft reset not found."
        );
    }

    sendRegion =
        sendRegion.replace(
            draftReset,
`$1

              markConversationRead(
                  conversationPhone
              );`,
            1
        );

    page =
        page.slice(
            0,
            sendMarker
        ) +
        sendRegion +
        page.slice(
            initMarker
        );
}


/* ============================================================
   FRONTEND: ACK READ listener
   ============================================================ */

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {

    const inboundMarker =
        "/*\n     * ========================================================\n     * FINAL WHATSAPP INBOX BEHAVIOR";

    const inboundIndex =
        page.indexOf(
            inboundMarker
        );

    if (inboundIndex < 0) {
        throw new Error(
            "FINAL WHATSAPP INBOX BEHAVIOR marker not found."
        );
    }

    const ackEffect = `

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

                    /*
                     * The customer opened our outbound
                     * WhatsApp message.
                     */
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
            inboundIndex
        ) +
        ackEffect +
        page.slice(
            inboundIndex
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
        "Backend ACK phone was not added."
    );
}

if (
    !page.includes(
        "onMessageAck"
    ) ||
    !page.includes(
        "offMessageAck"
    )
) {
    throw new Error(
        "Frontend ACK listener was not added."
    );
}

if (
    !sendRegion.includes(
        "markConversationRead"
    )
) {
    throw new Error(
        "Outbound read-state clearing was not added."
    );
}


/* ============================================================
   BACKUPS + WRITE
   ============================================================ */

const stamp =
    new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

const serviceBackup =
    `${servicePath}.backup-before-whatsapp-read-receipt-${stamp}`;

const pageBackup =
    `${pagePath}.backup-before-whatsapp-read-receipt-${stamp}`;

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


/* ============================================================
   SYNTAX CHECK
   ============================================================ */

console.log("");
console.log("==============================================");
console.log("WHATSAPP READ RECEIPT FIX APPLIED");
console.log("==============================================");
console.log(`SERVICE BACKUP: ${serviceBackup}`);
console.log(`PAGE BACKUP:    ${pageBackup}`);
console.log("");
console.log("ACK now carries recipient phone.");
console.log("Frontend listens for READ ACK.");
console.log("Outbound messages clear local unread state.");
