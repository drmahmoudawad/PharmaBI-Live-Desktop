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
   1) BACKEND - add recipient_phone to ACK SELECT
   ============================================================ */

let serviceLines =
    service.split(/\r?\n/);

let handleAckLine = -1;

for (
    let i = 0;
    i < serviceLines.length;
    i++
) {
    if (
        serviceLines[i].includes(
            "async function handleMessageAck"
        )
    ) {
        handleAckLine = i;
        break;
    }
}

if (handleAckLine < 0) {
    throw new Error(
        "handleMessageAck not found."
    );
}

let fromLine = -1;

for (
    let i = handleAckLine;
    i < serviceLines.length;
    i++
) {
    if (
        serviceLines[i].includes(
            "FROM crm_whatsapp_messages"
        )
    ) {
        fromLine = i;
        break;
    }
}

if (fromLine < 0) {
    throw new Error(
        "ACK FROM crm_whatsapp_messages not found."
    );
}

let interactionLine = -1;

for (
    let i = handleAckLine;
    i < fromLine;
    i++
) {
    if (
        serviceLines[i].trim() ===
        "interaction_id"
    ) {
        interactionLine = i;
        break;
    }
}

if (interactionLine < 0) {
    throw new Error(
        "ACK interaction_id field not found."
    );
}

let phoneAlreadySelected = false;

for (
    let i = handleAckLine;
    i < fromLine;
    i++
) {
    if (
        serviceLines[i].trim() ===
        "recipient_phone"
    ) {
        phoneAlreadySelected = true;
        break;
    }
}

if (!phoneAlreadySelected) {

    serviceLines.splice(
        interactionLine + 1,
        0,
        "                    recipient_phone,"
    );

    console.log(
        "ACK SELECT: recipient_phone ADDED"
    );

}
else {

    console.log(
        "ACK SELECT: recipient_phone ALREADY EXISTS"
    );

}

service =
    serviceLines.join("\n");


/* ============================================================
   2) FRONTEND - clear unread after our outbound send
   ============================================================ */

let pageLines =
    page.split(/\r?\n/);

let sendLine = -1;

for (
    let i = 0;
    i < pageLines.length;
    i++
) {
    if (
        pageLines[i].includes(
            "async function sendConversationMessage"
        )
    ) {
        sendLine = i;
        break;
    }
}

if (sendLine < 0) {
    throw new Error(
        "sendConversationMessage not found."
    );
}

let initializeLine = -1;

for (
    let i = sendLine + 1;
    i < pageLines.length;
    i++
) {
    if (
        pageLines[i].includes(
            "async function initializeWhatsApp"
        )
    ) {
        initializeLine = i;
        break;
    }
}

if (initializeLine < 0) {
    throw new Error(
        "initializeWhatsApp not found."
    );
}

let draftLine = -1;

for (
    let i = sendLine;
    i < initializeLine;
    i++
) {
    if (
        pageLines[i].trim() ===
        "setConversationDraft("
    ) {
        draftLine = i;
        break;
    }
}

if (draftLine < 0) {
    throw new Error(
        "setConversationDraft in sendConversationMessage not found."
    );
}

let draftEnd = -1;

for (
    let i = draftLine + 1;
    i < initializeLine;
    i++
) {
    if (
        pageLines[i].trim() ===
        ");"
    ) {
        draftEnd = i;
        break;
    }
}

if (draftEnd < 0) {
    throw new Error(
        "setConversationDraft end not found."
    );
}

let alreadyClearsUnread = false;

for (
    let i = draftEnd + 1;
    i < Math.min(
        draftEnd + 12,
        initializeLine
    );
    i++
) {
    if (
        pageLines[i].includes(
            "markConversationRead"
        )
    ) {
        alreadyClearsUnread = true;
        break;
    }
}

if (!alreadyClearsUnread) {

    pageLines.splice(
        draftEnd + 1,
        0,
        "",
        "              markConversationRead(",
        "                  conversationPhone",
        "              );"
    );

    console.log(
        "OUTBOUND SEND: unread CLEAR ADDED"
    );

}
else {

    console.log(
        "OUTBOUND SEND: unread CLEAR ALREADY EXISTS"
    );

}

page =
    pageLines.join("\n");


/* ============================================================
   3) FRONTEND - listen for real WhatsApp READ ACK
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

                    /*
                     * The customer opened the outbound
                     * WhatsApp message on the phone.
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
            commentStart
        ) +
        ackEffect +
        page.slice(
            commentStart
        );

    console.log(
        "FRONTEND ACK LISTENER: ADDED"
    );

}
else {

    console.log(
        "FRONTEND ACK LISTENER: ALREADY EXISTS"
    );

}


/* ============================================================
   4) VALIDATE backend
   ============================================================ */

serviceLines =
    service.split(/\r?\n/);

let verifyAckStart = -1;

for (
    let i = 0;
    i < serviceLines.length;
    i++
) {
    if (
        serviceLines[i].includes(
            "async function handleMessageAck"
        )
    ) {
        verifyAckStart = i;
        break;
    }
}

if (verifyAckStart < 0) {
    throw new Error(
        "Validation: handleMessageAck missing."
    );
}

let verifyFrom = -1;

for (
    let i = verifyAckStart;
    i < serviceLines.length;
    i++
) {
    if (
        serviceLines[i].includes(
            "FROM crm_whatsapp_messages"
        )
    ) {
        verifyFrom = i;
        break;
    }
}

if (verifyFrom < 0) {
    throw new Error(
        "Validation: ACK FROM missing."
    );
}

let verifyPhoneSelect = false;

for (
    let i = verifyAckStart;
    i < verifyFrom;
    i++
) {
    if (
        serviceLines[i].trim() ===
        "recipient_phone,"
    ) {
        verifyPhoneSelect = true;
        break;
    }
}

if (!verifyPhoneSelect) {
    throw new Error(
        "Validation: recipient_phone not in ACK SELECT."
    );
}

if (
    !service.includes(
        "existing.recipient_phone"
    )
) {
    throw new Error(
        "Validation: ACK payload phone missing."
    );
}


/* ============================================================
   5) VALIDATE frontend
   ============================================================ */

if (
    !page.includes(
        "onMessageAck"
    )
) {
    throw new Error(
        "Validation: onMessageAck missing."
    );
}

if (
    !page.includes(
        "offMessageAck"
    )
) {
    throw new Error(
        "Validation: offMessageAck missing."
    );
}

if (
    !page.includes(
        "pharmabi-wa-message-ack-reader"
    )
) {
    throw new Error(
        "Validation: ACK marker missing."
    );
}


/* ============================================================
   6) BACKUP + WRITE
   ============================================================ */

const stamp =
    Date.now();

const serviceBackup =
    `${servicePath}.backup-before-read-receipt-line-safe-${stamp}`;

const pageBackup =
    `${pagePath}.backup-before-read-receipt-line-safe-${stamp}`;

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
console.log("WHATSAPP READ RECEIPT FIX SUCCESSFULLY APPLIED");
console.log("==============================================");
console.log(`SERVICE BACKUP: ${serviceBackup}`);
console.log(`PAGE BACKUP:    ${pageBackup}`);
console.log("");
console.log("1. ACK SELECT includes recipient_phone");
console.log("2. ACK payload includes phone");
console.log("3. Renderer listens to message_ack");
console.log("4. READ ACK clears sidebar unread");
console.log("5. Sending outbound clears local unread");
