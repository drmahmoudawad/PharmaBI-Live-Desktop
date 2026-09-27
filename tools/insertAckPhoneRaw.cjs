const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");

const ackStart =
    source.indexOf('"message_ack"');

if (ackStart < 0) {
    throw new Error("message_ack not found");
}

const campaignIndex =
    source.indexOf("campaignId:", ackStart);

if (campaignIndex < 0) {
    throw new Error("campaignId after message_ack not found");
}

const searchArea =
    source.slice(
        ackStart,
        campaignIndex
    );

if (
    searchArea.includes(
        "existing.recipient_phone"
    )
) {
    console.log("ACK PHONE ALREADY EXISTS");
    process.exit(0);
}

const insertion =
`phone:
                    existing.recipient_phone ||
                    null,

                `;

source =
    source.slice(
        0,
        campaignIndex
    ) +
    insertion +
    source.slice(
        campaignIndex
    );

const backup =
    `${path}.backup-before-ack-phone-${Date.now()}`;

fs.copyFileSync(
    path,
    backup
);

fs.writeFileSync(
    path,
    source,
    "utf8"
);

console.log("ACK PHONE ADDED");
console.log(`BACKUP: ${backup}`);
