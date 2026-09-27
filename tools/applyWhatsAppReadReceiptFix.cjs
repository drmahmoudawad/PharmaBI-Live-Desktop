const fs = require("fs");

const servicePath =
    "./electron/pharmfly/customers/crm/whatsappService.js";

const pagePath =
    "./src/components/WhatsAppPage.jsx";

let service =
    fs.readFileSync(
        servicePath,
        "utf8"
    );

let page =
    fs.readFileSync(
        pagePath,
        "utf8"
    );

function count(text, regex) {
    return (text.match(regex) || []).length;
}

function backup(path) {
    const name =
        `${path}.backup-before-whatsapp-read-fix-${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}`;

    fs.copyFileSync(
        path,
        name
    );

    return name;
}

/*
 * ============================================================
 * BACKEND
 * ============================================================
 */

/*
 * 1) Include recipient_phone in ACK lookup.
 */
const ackSelectRegex =
    /SELECT\s+id,\s*branch_id,\s*customer_id,\s*campaign_id,\s*campaign_target_id,\s*interaction_id\s+FROM\s+crm_whatsapp_messages\s+WHERE\s+provider_message_id\s*=\s*\?\s+ORDER BY\s+id\s+DESC\s+LIMIT\s+1/s;

if (count(service, ackSelectRegex) !== 1) {
    throw new Error(
        "ACK SELECT block not found exactly once."
    );
}

service =
    service.replace(
        ackSelectRegex,
`SELECT
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
                LIMIT 1`
    );

/*
 * 2) Put the phone into the message_ack event.
 */
const ackPayloadRegex =
    /(emitEvent\(\s*"message_ack"[\s\S]*?customerId:\s*existing\.customer_id\s*\|\|\s*null,\s*)(campaignId:)/s;

if (count(service, ackPayloadRegex) !== 1) {
    throw new Error(
        "message_ack payload anchor not found exactly once."
    );
}

service =
    service.replace(
        ackPayloadRegex,
`$1
                phone:
                    existing.recipient_phone ||
                    null,

                $2`
    );

/*
 * ============================================================
 * FRONTEND
 * ============================================================
 */

/*
 * 3) Sending a reply clears the conversation unread state.
 */
const sendStart =
    page.indexOf(
        "async function sendConversationMessage"
    );

const sendEnd =
    page.indexOf(
        "async function initializeWhatsApp"
    );

if (
    sendStart < 0 ||
    sendEnd < 0 ||
    sendEnd <= sendStart
) {
    throw new Error(
        "sendConversationMessage region not found."
    );
}

const sendRegion =
    page.slice(
        sendStart,
        sendEnd
    );

if (
    !sendRegion.includes(
        "setConversationDraft("
    )
) {
    throw new Error(
        "sendConversationMessage draft reset not found."
    );
}

if (
    !sendRegion.includes(
        "markConversationRead(\n                  conversationPhone"
    )
) {
    const draftRegex =
        /(\s*setConversationDraft\(\s*""\s*\);)/;

    if (count(sendRegion, draftRegex) !== 1) {
        throw new Error(
            "sendConversationMessage draft reset anchor not found exactly once."
        );
    }

    const newSendRegion =
        sendRegion.replace(
            draftRegex,
`$1

              markConversationRead(
                  conversationPhone
              );`
        );

    page =
        page.slice(
            0,
            sendStart
        ) +
        newSendRegion +
        page.slice(
            sendEnd
        );
}

/*
 * ============================================================
 * 4) ACK listener
 * ============================================================
 */

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {

    const marker =
        "/*\n     * ========================================================\n     * FINAL WHATSAPP INBOX BEHAVIOR";

    const markerIndex =
        page.indexOf(
            marker
        );

    if (markerIndex < 0) {
        throw new Error(
            "Inbound behavior marker not found."
        );
    }

    const ackEffect = `

    /*
     * ========================================================
     * OUTBOUND MESSAGE READ RECEIPTS
     * ========================================================
     *
     * whatsapp-web.js reports:
     * - 1 = SERVER
     * - 2 = DEVICE
     * - 3 = READ
     * - 4 = PLAYED
     *
     * The backend converts these to status strings and sends
     * recipient phone + status through message_ack.
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


                    const status =
                        String(
                            payload.status ||
                            ""
                        ).trim().toLowerCase();


                    const phone =
                        String(
                            payload.phone ||
                            payload.recipient_phone ||
                            ""
                        ).trim();


                    if (
                        !phone ||
                        status !== "read"
                    ) {
                        return;
                    }


                    /*
                     * The customer has actually opened the
                     * outbound message on WhatsApp.
                     */
                    markConversationRead(
                        phone
                    );


                    /*
                     * Keep the sidebar row status synchronized.
                     */
                    setHistory(
                        current => {

                            const rows =
                                Array.isArray(
                                    current
                                )
                                    ? current
                                    : [];


                            return rows.map(
                                row => {

                                    const rowPhone =
                                        String(
                                            row?.recipient_phone ||
                                            row?.phone ||
                                            ""
                                        ).trim();


                                    if (
                                        rowPhone !==
                                        phone
                                    ) {
                                        return row;
                                    }


                                    return {
                                        ...row,
                                        status:
                                            "read",
                                        read_at:
                                            payload.readAt ||
                                            new Date().toISOString()
                                    };

                                }
                            );

                        }
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

/*
 * ============================================================
 * 5) Make inbound handler explicitly ignore outbound events.
 * ============================================================
 */

const inboundHandlerStart =
    page.indexOf(
        "const messageHandler"
    );

const inboundHandlerEnd =
    page.indexOf(
        "try {",
        inboundHandlerStart
    );

if (
    inboundHandlerStart < 0 ||
    inboundHandlerEnd < 0
) {
    throw new Error(
        "Inbound messageHandler region not found."
    );
}

const inboundRegion =
    page.slice(
        inboundHandlerStart,
        inboundHandlerEnd
    );

if (
    !inboundRegion.includes(
        "payload.direction"
    )
) {

    const phoneAnchorRegex =
        /(\s*const incomingPhone\s*=\s*String\([\s\S]*?\);\s*)/;

    if (
        count(
            inboundRegion,
            phoneAnchorRegex
        ) !== 1
    ) {
        throw new Error(
            "Inbound phone anchor not found exactly once."
        );
    }

    const newInboundRegion =
        inboundRegion.replace(
            phoneAnchorRegex,
`$1

                    const incomingDirection =
                        String(
                            payload.direction ||
                            "INBOUND"
                        ).trim().toUpperCase();


                    if (
                        incomingDirection ===
                        "OUTBOUND"
                    ) {
                        return;
                    }`
        );

    page =
        page.slice(
            0,
            inboundHandlerStart
        ) +
        newInboundRegion +
        page.slice(
            inboundHandlerEnd
        );
}

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

if (
    !service.includes(
        "recipient_phone"
    )
) {
    throw new Error(
        "Backend recipient_phone validation failed."
    );
}

if (
    !service.includes(
        'emitEvent(\n            "message_ack"'
    )
) {
    throw new Error(
        "Backend message_ack validation failed."
    );
}

if (
    !service.includes(
        "existing.recipient_phone"
    )
) {
    throw new Error(
        "Backend ACK phone payload validation failed."
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
        "Frontend ACK listener validation failed."
    );
}

if (
    !page.includes(
        'status !== "read"'
    )
) {
    throw new Error(
        "Frontend READ status validation failed."
    );
}

if (
    !page.includes(
        "markConversationRead(\n                        phone"
    )
) {
    throw new Error(
        "Frontend ACK mark-read validation failed."
    );
}

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {
    throw new Error(
        "ACK reader marker missing."
    );
}

/*
 * Write only after all validations pass.
 */
const serviceBackup =
    backup(
        servicePath
    );

const pageBackup =
    backup(
        pagePath
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
console.log("WHATSAPP READ RECEIPT FIX APPLIED");
console.log("==============================================");
console.log(`SERVICE BACKUP: ${serviceBackup}`);
console.log(`PAGE BACKUP:    ${pageBackup}`);
console.log("");
console.log("Backend ACK now includes recipient_phone.");
console.log("Frontend listens to message_ack.");
console.log("READ ACK clears sidebar unread state.");
console.log("Outbound messages are not treated as inbound.");
