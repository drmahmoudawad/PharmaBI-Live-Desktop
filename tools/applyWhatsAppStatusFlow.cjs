const fs = require("fs");

const path =
    "./src/components/WhatsAppPage.jsx";

let source =
    fs.readFileSync(path, "utf8");

let lines =
    source.split(/\r?\n/);


/* ============================================================
   1) REMOVE IMMEDIATE "READ" AFTER OUTBOUND SEND
   ============================================================ */

let sendStart = -1;
let initStart = -1;

for (let i = 0; i < lines.length; i++) {

    if (
        lines[i].includes(
            "async function sendConversationMessage"
        )
    ) {
        sendStart = i;
        break;
    }

}

if (sendStart < 0) {
    throw new Error(
        "sendConversationMessage not found."
    );
}

for (
    let i = sendStart + 1;
    i < lines.length;
    i++
) {

    if (
        lines[i].includes(
            "async function initializeWhatsApp"
        )
    ) {
        initStart = i;
        break;
    }

}

if (initStart < 0) {
    throw new Error(
        "initializeWhatsApp not found."
    );
}

let markReadLine = -1;

for (
    let i = sendStart;
    i < initStart;
    i++
) {

    if (
        lines[i].trim() ===
        "markConversationRead("
    ) {

        markReadLine = i;
        break;

    }

}

if (markReadLine >= 0) {

    let endLine = -1;

    for (
        let i = markReadLine + 1;
        i < Math.min(
            markReadLine + 6,
            initStart
        );
        i++
    ) {

        if (
            lines[i].trim() ===
            ");"
        ) {
            endLine = i;
            break;
        }

    }

    if (endLine < 0) {
        throw new Error(
            "Outbound markConversationRead end not found."
        );
    }

    lines.splice(
        markReadLine,
        endLine - markReadLine + 1
    );

    console.log(
        "Removed immediate READ state after sending."
    );

}
else {

    console.log(
        "Immediate outbound READ state already absent."
    );

}


/* ============================================================
   2) SIDEBAR STATUS VARIABLES
   ============================================================ */

let unreadLine = -1;

for (let i = 0; i < lines.length; i++) {

    if (
        lines[i].trim() ===
        "const unread ="
    ) {

        unreadLine = i;
        break;

    }

}

if (unreadLine < 0) {
    throw new Error(
        "Sidebar unread declaration not found."
    );
}


/*
 * Find end of unread declaration.
 */
let unreadEnd = -1;

for (
    let i = unreadLine + 1;
    i < Math.min(
        unreadLine + 10,
        lines.length
    );
    i++
) {

    if (
        lines[i].trim() ===
        ");"
    ) {
        unreadEnd = i;
        break;
    }

}

if (unreadEnd < 0) {
    throw new Error(
        "Sidebar unread declaration end not found."
    );
}


/*
 * Avoid duplicate insertion.
 */
let hasSidebarStatusVars = false;

for (
    let i = unreadLine;
    i < Math.min(
        unreadLine + 20,
        lines.length
    );
    i++
) {

    if (
        lines[i].includes(
            "rowDirection"
        )
    ) {
        hasSidebarStatusVars = true;
        break;
    }

}

if (!hasSidebarStatusVars) {

    const statusLines = [
        "",
        "                                                    const rowDirection =",
        "                                                        String(",
        "                                                            row?.direction ||",
        "                                                            \"\"",
        "                                                        ).trim().toUpperCase();",
        "",
        "                                                    const rowStatus =",
        "                                                        String(",
        "                                                            row?.status ||",
        "                                                            \"\"",
        "                                                        ).trim().toLowerCase();",
        "",
        "                                                    const outboundPendingRead =",
        "                                                        rowDirection ===",
        "                                                            \"OUTBOUND\" &&",
        "                                                        rowStatus !==",
        "                                                            \"read\";",
        "",
        "                                                    const rowReadLabel =",
        "                                                        unread",
        "                                                            ? \"● غير مقروءة\"",
        "                                                            : outboundPendingRead",
        "                                                                ? \"✓ مرسلة\"",
        "                                                                : \"✓ مقروءة\";",
        "",
        "                                                    const rowReadColor =",
        "                                                        unread",
        "                                                            ? \"#facc15\"",
        "                                                            : outboundPendingRead",
        "                                                                ? \"#94a3b8\"",
        "                                                                : \"#22c55e\";",
        ""
    ];

    lines.splice(
        unreadEnd + 1,
        0,
        ...statusLines
    );

    console.log(
        "Sidebar send/read status variables added."
    );

}


/* ============================================================
   3) REPLACE SIDEBAR LABEL/COLOR
   ============================================================ */

source =
    lines.join("\n");

if (
    source.includes(
        'unread\n                                                                                ? "● غير مقروءة"'
    )
) {

    source =
        source.replace(
            /unread\s*\n\s*\?\s*"● غير مقروءة"\s*\n\s*:\s*"✓ مقروءة"/,
            "rowReadLabel"
        );

}

source =
    source.replace(
        /unread\s*\n\s*\?\s*"#facc15"\s*\n\s*:\s*"#22c55e"/,
        "rowReadColor"
    );


/* ============================================================
   4) UPDATE SIDEBAR WHEN REAL READ ACK ARRIVES
   ============================================================ */

if (
    !source.includes(
        "status: \"read\""
    )
) {

    const ackMark =
        `                    markConversationRead(
                        phone
                    );`;

    if (
        !source.includes(
            ackMark
        )
    ) {
        throw new Error(
            "ACK markConversationRead block not found."
        );
    }

    const replacement =
`${ackMark}

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

                                    if (
                                        String(
                                            row?.direction ||
                                            ""
                                        ).trim().toUpperCase() !==
                                        "OUTBOUND"
                                    ) {
                                        return row;
                                    }

                                    return {
                                        ...row,
                                        status:
                                            "read"
                                    };

                                }
                            );

                        }
                    );`;

    source =
        source.replace(
            ackMark,
            replacement
        );

    console.log(
        "READ ACK now updates sidebar status."
    );

}


/* ============================================================
   5) SUPPORT DELIVERED STATUS IN SIDEBAR
   ============================================================ */

source =
    source.replace(
        `const rowReadLabel =
                                                        unread
                                                            ? "● غير مقروءة"
                                                            : outboundPendingRead
                                                                ? "✓ مرسلة"
                                                                : "✓ مقروءة";`,
        `const rowReadLabel =
                                                        unread
                                                            ? "● غير مقروءة"
                                                            : rowDirection ===
                                                                "OUTBOUND" &&
                                                              rowStatus ===
                                                                "delivered"
                                                                ? "✓✓ تم التسليم"
                                                                : outboundPendingRead
                                                                    ? "✓ مرسلة"
                                                                    : "✓ مقروءة";`
    );

source =
    source.replace(
        `const rowReadColor =
                                                        unread
                                                            ? "#facc15"
                                                            : outboundPendingRead
                                                                ? "#94a3b8"
                                                                : "#22c55e";`,
        `const rowReadColor =
                                                        unread
                                                            ? "#facc15"
                                                            : rowDirection ===
                                                                "OUTBOUND" &&
                                                              rowStatus ===
                                                                "delivered"
                                                                ? "#38bdf8"
                                                                : outboundPendingRead
                                                                    ? "#94a3b8"
                                                                    : "#22c55e";`
    );


/* ============================================================
   6) VALIDATION
   ============================================================ */

if (
    source.includes(
        "markConversationRead(\n                  conversationPhone"
    )
) {
    throw new Error(
        "Immediate outbound READ was not removed."
    );
}

if (
    !source.includes(
        "outboundPendingRead"
    )
) {
    throw new Error(
        "Outbound pending-read logic missing."
    );
}

if (
    !source.includes(
        "✓ مرسلة"
    )
) {
    throw new Error(
        "Sent status missing."
    );
}

if (
    !source.includes(
        "✓✓ تم التسليم"
    )
) {
    throw new Error(
        "Delivered status missing."
    );
}

if (
    !source.includes(
        "status:\n                                            \"read\""
    )
) {
    throw new Error(
        "ACK history read update missing."
    );
}


/* ============================================================
   7) BACKUP + WRITE
   ============================================================ */

const backup =
    `${path}.backup-before-whatsapp-status-flow-${Date.now()}`;

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
console.log("WHATSAPP STATUS FLOW FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
console.log("");
console.log("Outbound: SENT -> DELIVERED -> READ");
console.log("Inbound: UNREAD -> READ");
