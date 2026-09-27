const fs = require("fs");

const path =
    "./src/components/WhatsAppPage.jsx";

let source =
    fs.readFileSync(path, "utf8");

let lines =
    source.split(/\r?\n/);

let sendStart = -1;
let sendEnd = -1;

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
        sendEnd = i;
        break;
    }

}

if (sendEnd < 0) {
    throw new Error(
        "sendConversationMessage end not found."
    );
}

let markReadExists = false;

for (
    let i = sendStart;
    i < sendEnd;
    i++
) {

    if (
        lines[i].includes(
            "markConversationRead"
        )
    ) {
        markReadExists = true;
        break;
    }

}

if (!markReadExists) {

    let draftStart = -1;

    for (
        let i = sendStart;
        i < sendEnd;
        i++
    ) {

        if (
            lines[i].trim() ===
            "setConversationDraft("
        ) {
            draftStart = i;
            break;
        }

    }

    if (draftStart < 0) {
        throw new Error(
            "setConversationDraft not found inside sendConversationMessage."
        );
    }

    let draftEnd = -1;

    for (
        let i = draftStart + 1;
        i < sendEnd;
        i++
    ) {

        if (
            lines[i].trim() ===
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

    lines.splice(
        draftEnd + 1,
        0,
        "",
        "              /* Sending a reply means the operator has read this conversation. */",
        "              markConversationRead(",
        "                  conversationPhone",
        "              );"
    );

    console.log(
        "Sidebar unread is now cleared when replying."
    );

}
else {

    console.log(
        "Sidebar unread-on-reply logic already exists."
    );

}

source =
    lines.join("\n");


/* Validation */
let verifyStart =
    source.indexOf(
        "async function sendConversationMessage"
    );

let verifyEnd =
    source.indexOf(
        "async function initializeWhatsApp",
        verifyStart
    );

const verifyRegion =
    source.slice(
        verifyStart,
        verifyEnd
    );

if (
    !verifyRegion.includes(
        "markConversationRead"
    )
) {
    throw new Error(
        "Validation failed: markConversationRead missing from send."
    );
}


/* Backup + write */
const backup =
    `${path}.backup-before-unread-on-reply-${Date.now()}`;

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
console.log("UNREAD-ON-REPLY FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
console.log("");
console.log("Reply clears sidebar unread.");
console.log("Outbound message remains SENT/DELIVERED until ACK.");
console.log("ACK READ still controls outbound READ status.");
