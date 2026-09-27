const fs = require("fs");

const path =
    "./electron/pharmfly/customers/crm/whatsappService.js";

let source =
    fs.readFileSync(path, "utf8");

const eventStart =
    source.indexOf(
        '"message_ack"'
    );

if (eventStart < 0) {
    throw new Error(
        "message_ack not found."
    );
}

const eventEnd =
    source.indexOf(
        ');\n\n\n        return {',
        eventStart
    );

if (eventEnd < 0) {

    const altEnd =
        source.indexOf(
            ');\r\n\r\n\r\n        return {',
            eventStart
        );

    if (altEnd < 0) {
        throw new Error(
            "message_ack event end not found."
        );
    }

    const region =
        source.slice(
            eventStart,
            altEnd
        );

    if (
        region.includes(
            "existing.recipient_phone"
        )
    ) {
        console.log(
            "ACK already contains recipient phone."
        );
        process.exit(0);
    }

    const campaignIndex =
        region.indexOf(
            "campaignId:"
        );

    if (campaignIndex < 0) {
        throw new Error(
            "campaignId inside message_ack not found."
        );
    }

    const absoluteIndex =
        eventStart +
        campaignIndex;

    const insertion =
`phone:
                    existing.recipient_phone ||
                    null,

                `;

    source =
        source.slice(
            0,
            absoluteIndex
        ) +
        insertion +
        source.slice(
            absoluteIndex
        );

}
else {

    const region =
        source.slice(
            eventStart,
            eventEnd
        );

    if (
        region.includes(
            "existing.recipient_phone"
        )
    ) {
        console.log(
            "ACK already contains recipient phone."
        );
        process.exit(0);
    }

    const campaignIndex =
        region.indexOf(
            "campaignId:"
        );

    if (campaignIndex < 0) {
        throw new Error(
            "campaignId inside message_ack not found."
        );
    }

    const absoluteIndex =
        eventStart +
        campaignIndex;

    const insertion =
`phone:
                    existing.recipient_phone ||
                    null,

                `;

    source =
        source.slice(
            0,
            absoluteIndex
        ) +
        insertion +
        source.slice(
            absoluteIndex
        );
}

const backup =
    `${path}.backup-before-read-receipt-phone-${Date.now()}`;

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
console.log("ACK PHONE INSERTED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
