const fs = require("fs");

const path =
    "./src/components/WhatsAppPage.jsx";

let source =
    fs.readFileSync(path, "utf8");

const anchor =
`      async function openConversation(
          row
      ) {`;

if (!source.includes(anchor)) {
    throw new Error(
        "openConversation anchor not found."
    );
}

if (
    !source.includes(
        "[WA-CONVERSATION-DIAG]"
    )
) {

    const replacement =
`      async function openConversation(
          row
      ) {

          console.log(
              "[WA-CONVERSATION-DIAG] OPEN CALLED",
              {
                  phone:
                      row?.recipient_phone ||
                      row?.phone ||
                      null,
                  name:
                      row?.customer_name ||
                      null
              }
          );

          console.trace(
              "[WA-CONVERSATION-DIAG] CALL STACK"
          );`;

    source =
        source.replace(
            anchor,
            replacement,
            1
        );
}

const backup =
    `${path}.backup-before-auto-switch-diagnostic-${Date.now()}`;

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
console.log("CONVERSATION AUTO-SWITCH DIAGNOSTIC ENABLED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
