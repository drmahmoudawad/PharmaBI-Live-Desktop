const fs = require("fs");

const servicePath = "./electron/pharmfly/customers/crm/whatsappService.js";
const ipcPath = "./electron/ipc/whatsapp.ipc.js";
const preloadPath = "./electron/preload.js";
const pagePath = "./src/components/WhatsAppPage.jsx";


function readLines(path) {
    return fs.readFileSync(path, "utf8").split(/\r?\n/);
}

function writeLines(path, lines) {
    fs.writeFileSync(path, lines.join("\n"), "utf8");
}

function backup(path) {
    const target =
        `${path}.backup-before-unread-count-sync-${Date.now()}`;

    fs.copyFileSync(path, target);

    return target;
}


/* ============================================================
   1) WHATSAPP SERVICE
   ============================================================ */

let service = readLines(servicePath);

if (
    !service.some(
        line =>
            line.includes(
                "async function resolveUnreadCountPhone"
            )
    )
) {

    let handleAck = -1;

    for (let i = 0; i < service.length; i++) {

        if (
            service[i].includes(
                "async function handleMessageAck"
            )
        ) {
            handleAck = i;
            break;
        }

    }

    if (handleAck < 0) {
        throw new Error(
            "handleMessageAck not found."
        );
    }

    const helper = [
        "",
        "    async function resolveUnreadCountPhone(",
        "        identity",
        "    ) {",
        "",
        "        const rawIdentity =",
        "            String(",
        "                identity ||",
        "                \"\"",
        "            ).trim();",
        "",
        "        if (!rawIdentity) {",
        "            return null;",
        "        }",
        "",
        "        const direct =",
        "            normalizePhone(",
        "                rawIdentity.replace(",
        "                    /@(c\\\\.us|s\\\\.whatsapp\\\\.net)$/i,",
        "                    \"\"",
        "                )",
        "            );",
        "",
        "        if (",
        "            /^20(10|11|12|15)\\\\d{8}$/.test(",
        "                direct",
        "            )",
        "        ) {",
        "            return direct;",
        "        }",
        "",
        "        try {",
        "",
        "            if (",
        "                client &&",
        "                typeof client.getContactLidAndPhone ===",
        "                    \"function\"",
        "            ) {",
        "",
        "                const mappings =",
        "                    await client.getContactLidAndPhone(",
        "                        [rawIdentity]",
        "                    );",
        "",
        "                for (",
        "                    const item of",
        "                        Array.isArray(mappings)",
        "                            ? mappings",
        "                            : []",
        "                ) {",
        "",
        "                    const candidate =",
        "                        normalizePhone(",
        "                            String(",
        "                                item?.pn ||",
        "                                \"\"",
        "                            )",
        "                                .replace(",
        "                                    /@(c\\\\.us|s\\\\.whatsapp\\\\.net|lid)$/i,",
        "                                    \"\"",
        "                                )",
        "                        );",
        "",
        "                    if (",
        "                        /^20(10|11|12|15)\\\\d{8}$/.test(",
        "                            candidate",
        "                        )",
        "                    ) {",
        "                        return candidate;",
        "                    }",
        "",
        "                }",
        "",
        "            }",
        "",
        "        }",
        "        catch (error) {",
        "",
        "            console.warn(",
        "                \"[WhatsApp] unread_count phone lookup failed:\",",
        "                error?.message ||",
        "                    error",
        "            );",
        "",
        "        }",
        "",
        "        return null;",
        "",
        "    }",
        ""
    ];

    service.splice(
        handleAck,
        0,
        ...helper
    );

}

if (
    !service.some(
        line =>
            line.includes(
                'client.on('
            ) &&
            service[
                service.indexOf(line) + 1
            ]?.includes(
                '"unread_count"'
            )
    )
) {

    let returnClient = -1;

    for (let i = 0; i < service.length; i++) {

        if (
            service[i].trim() ===
            "return client;"
        ) {
            returnClient = i;
            break;
        }

    }

    if (returnClient < 0) {
        throw new Error(
            "return client not found."
        );
    }

    const listener = [
        "",
        "        /*",
        "         * =====================================================",
        "         * CROSS-DEVICE UNREAD COUNT SYNC",
        "         * =====================================================",
        "         *",
        "         * When the business WhatsApp message is opened on",
        "         * the linked mobile, whatsapp-web.js updates the",
        "         * chat unread count. A value of zero means the chat",
        "         * was read outside PharmaBI.",
        "         */",
        "",
        "        client.on(",
        '            "unread_count",',
        "            async chat => {",
        "",
        "                try {",
        "",
        "                    const unreadCount =",
        "                        Number(",
        "                            chat?.unreadCount ||",
        "                            0",
        "                        );",
        "",
        "                    const identity =",
        "                        chat?.id?._serialized ||",
        "                        chat?.id?.user ||",
        "                        null;",
        "",
        "                    const phone =",
        "                        await resolveUnreadCountPhone(",
        "                            identity",
        "                        );",
        "",
        "                    console.log(",
        "                        \"[WA-UNREAD-SYNC]\",",
        "                        {",
        "                            identity,",
        "                            phone,",
        "                            unreadCount",
        "                        }",
        "                    );",
        "",
        "                    emitEvent(",
        '                        "unread_count",',
        "                        {",
        "                            phone,",
        "                            unreadCount,",
        "                            chatId:",
        "                                identity",
        "                        }",
        "                    );",
        "",
        "                }",
        "                catch (error) {",
        "",
        "                    console.warn(",
        "                        \"[WhatsApp] unread_count handler failed:\",",
        "                        error?.message ||",
        "                            error",
        "                    );",
        "",
        "                }",
        "",
        "            }",
        "        );",
        ""
    ];

    service.splice(
        returnClient,
        0,
        ...listener
    );

}


/* ============================================================
   2) IPC
   ============================================================ */

let ipc = readLines(ipcPath);

if (
    !ipc.some(
        line =>
            line.includes(
                '"unread_count"'
            )
    )
) {

    let messageCase = -1;

    for (let i = 0; i < ipc.length; i++) {

        if (
            ipc[i].trim() ===
            'case "message":'
        ) {
            messageCase = i;
            break;
        }

    }

    if (messageCase < 0) {
        throw new Error(
            'IPC case "message" not found.'
        );
    }

    const block = [
        '                  case "unread_count":',
        "",
        "                      sendToRenderer(",
        '                          "whatsapp:unread-count",',
        "                          payload",
        "                      );",
        "",
        "                      break;",
        ""
    ];

    ipc.splice(
        messageCase,
        0,
        ...block
    );

}


/* ============================================================
   3) PRELOAD
   ============================================================ */

let preload = readLines(preloadPath);

if (
    !preload.some(
        line =>
            line.includes(
                "onUnreadCount:"
            )
    )
) {

    let ack = -1;

    for (let i = 0; i < preload.length; i++) {

        if (
            preload[i].trim() ===
            "offMessageAck:"
        ) {
            ack = i;
            break;
        }

    }

    if (ack < 0) {
        throw new Error(
            "offMessageAck not found."
        );
    }

    const block = [
        "",
        "            onUnreadCount:",
        "                callback =>",
        "                    ipcRenderer.on(",
        '                        "whatsapp:unread-count",',
        "                        callback",
        "                    ),",
        "",
        "            offUnreadCount:",
        "                callback =>",
        "                    ipcRenderer.removeListener(",
        '                        "whatsapp:unread-count",',
        "                        callback",
        "                    ),"
    ];

    preload.splice(
        ack,
        0,
        ...block
    );

}


/* ============================================================
   4) REACT PAGE
   ============================================================ */

let page = readLines(pagePath);

if (
    !page.some(
        line =>
            line.includes(
                "pharmabi-wa-unread-count-sync"
            )
    )
) {

    let marker = -1;

    for (let i = 0; i < page.length; i++) {

        if (
            page[i].includes(
                "FINAL WHATSAPP INBOX BEHAVIOR"
            )
        ) {
            marker = i;
            break;
        }

    }

    if (marker < 0) {
        throw new Error(
            "FINAL WHATSAPP INBOX BEHAVIOR marker not found."
        );
    }

    let commentStart = marker;

    while (
        commentStart > 0 &&
        !page[commentStart].includes("/*")
    ) {
        commentStart--;
    }

    if (commentStart < 0) {
        throw new Error(
            "Inbound behavior comment start not found."
        );
    }

    const effect = [
        "",
        "    /*",
        "     * ========================================================",
        "     * CROSS-DEVICE READ SYNC",
        "     * ========================================================",
        "     */",
        "",
        "    /* pharmabi-wa-unread-count-sync */",
        "    useEffect(",
        "        () => {",
        "",
        "            const unreadHandler =",
        "                (",
        "                    first,",
        "                    second",
        "                ) => {",
        "",
        "                    const payload =",
        "                        getEventPayload(",
        "                            first,",
        "                            second",
        "                        );",
        "",
        "                    if (",
        "                        !payload ||",
        "                        typeof payload !==",
        "                            \"object\"",
        "                    ) {",
        "                        return;",
        "                    }",
        "",
        "                    const phone =",
        "                        String(",
        "                            payload.phone ||",
        "                            payload.recipient_phone ||",
        "                            \"\"",
        "                        ).trim();",
        "",
        "                    const unreadCount =",
        "                        Number(",
        "                            payload.unreadCount ||",
        "                            0",
        "                        );",
        "",
        "                    if (!phone) {",
        "                        return;",
        "                    }",
        "",
        "                    if (",
        "                        unreadCount === 0",
        "                    ) {",
        "",
        "                        console.log(",
        "                            \"[WA-UNREAD-SYNC] MARK READ\",",
        "                            phone",
        "                        );",
        "",
        "                        markConversationRead(",
        "                            phone",
        "                        );",
        "",
        "                    }",
        "                    else {",
        "",
        "                        markConversationUnread(",
        "                            phone",
        "                        );",
        "",
        "                    }",
        "",
        "                };",
        "",
        "            try {",
        "",
        "                window",
        "                    .pharmaBI",
        "                    ?.whatsapp",
        "                    ?.onUnreadCount?.(",
        "                        unreadHandler",
        "                    );",
        "",
        "            }",
        "            catch (error) {",
        "",
        "                console.warn(",
        "                    \"[WhatsApp] unread_count listener setup failed:\",",
        "                    error",
        "                );",
        "",
        "            }",
        "",
        "            return () => {",
        "",
        "                try {",
        "",
        "                    window",
        "                        .pharmaBI",
        "                        ?.whatsapp",
        "                        ?.offUnreadCount?.(",
        "                            unreadHandler",
        "                        );",
        "",
        "                }",
        "                catch {",
        "                    // Optional cleanup.",
        "                }",
        "",
        "            };",
        "",
        "        },",
        "        []",
        "    );",
        "",
        ""
    ];

    page.splice(
        commentStart,
        0,
        ...effect
    );

}


/* ============================================================
   5) VALIDATION
   ============================================================ */

if (
    !service.some(
        line =>
            line.includes(
                '"unread_count"'
            )
    )
) {
    throw new Error(
        "Service unread_count listener missing."
    );
}

if (
    !service.some(
        line =>
            line.includes(
                "resolveUnreadCountPhone"
            )
    )
) {
    throw new Error(
        "Unread phone resolver missing."
    );
}

if (
    !ipc.some(
        line =>
            line.includes(
                "whatsapp:unread-count"
            )
    )
) {
    throw new Error(
        "IPC unread-count channel missing."
    );
}

if (
    !preload.some(
        line =>
            line.includes(
                "onUnreadCount:"
            )
    )
) {
    throw new Error(
        "Preload onUnreadCount missing."
    );
}

if (
    !page.some(
        line =>
            line.includes(
                "pharmabi-wa-unread-count-sync"
            )
    )
) {
    throw new Error(
        "React unread-count listener missing."
    );
}


/* ============================================================
   6) BACKUPS + WRITE
   ============================================================ */

const backups = [
    backup(servicePath),
    backup(ipcPath),
    backup(preloadPath),
    backup(pagePath)
];

writeLines(
    servicePath,
    service
);

writeLines(
    ipcPath,
    ipc
);

writeLines(
    preloadPath,
    preload
);

writeLines(
    pagePath,
    page
);

console.log("");
console.log("==============================================");
console.log("CROSS-DEVICE UNREAD SYNC APPLIED");
console.log("==============================================");
console.log("");
console.log("WhatsApp unread_count -> IPC -> React");
console.log("unreadCount = 0 clears sidebar unread.");
console.log("Current conversation is never changed.");
console.log("");
console.log("BACKUPS:");
for (const item of backups) {
    console.log(item);
}
