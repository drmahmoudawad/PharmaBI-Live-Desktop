const fs = require("fs");

const path = "./src/components/WhatsAppPage.jsx";

let source = fs.readFileSync(path, "utf8");

const backup =
    `${path}.backup-before-sidebar-history-stability-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;

/*
 * 1) Remove the background loadHistory call from inbound handling.
 */
const inboundLoadRegex =
    /(\n\s*\/\*\s*\*\s*Refresh full sidebar data as a\s*\n\s*\*\s*background consistency check\.\s*\n\s*\*\/\s*\n\s*)void loadHistory\(\);\s*/;

if (!inboundLoadRegex.test(source)) {
    console.log("Inbound loadHistory block not found - continuing.");
}
else {
    source = source.replace(
        inboundLoadRegex,
        "\n"
    );
}

/*
 * 2) Do not clear history merely because branchId is temporarily unavailable.
 *    Wait for the branch to become available instead.
 */
const emptyHistoryGuard =
    /if\s*\(\s*!branchId\s*\|\|\s*Number\(\s*branchId\s*\)\s*<=\s*0\s*\)\s*\{\s*setHistory\(\[\]\);\s*return;\s*\}/;

if (!emptyHistoryGuard.test(source)) {
    throw new Error(
        "LOAD HISTORY branchId guard not found."
    );
}

source = source.replace(
    emptyHistoryGuard,
`if (
                    !branchId ||
                    Number(
                        branchId
                    ) <= 0
                ) {
                    setHistoryLoading(
                        false
                    );
                    return;
                }`
);

/*
 * 3) Only replace sidebar history when the IPC actually returns an array.
 *    This avoids replacing valid existing conversations with [].
 */
const rowsBlock =
    /const\s+rows\s*=\s*Array\.isArray\(\s*result\?\.history\s*\)\s*\?\s*result\.history\s*:\s*Array\.isArray\(\s*result\s*\)\s*\?\s*result\s*:\s*\[\];\s*\n\s*setHistory\(\s*rows\s*\);/;

if (!rowsBlock.test(source)) {
    throw new Error(
        "LOAD HISTORY rows block not found."
    );
}

source = source.replace(
    rowsBlock,
`const rows =
                        Array.isArray(
                            result?.history
                        )
                            ? result.history
                            : Array.isArray(
                                result
                            )
                                ? result
                                : null;

                    if (
                        Array.isArray(rows)
                    ) {
                        setHistory(rows);
                    }`
);

/*
 * 4) Validate.
 */
if (source.includes("void loadHistory();") &&
    source.includes("background consistency check")) {
    throw new Error(
        "Inbound loadHistory call was not fully removed."
    );
}

if (!source.includes("setHistoryLoading(\n                        false\n                    );")) {
    throw new Error(
        "Branch guard protection missing."
    );
}

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
console.log("WHATSAPP SIDEBAR HISTORY STABILITY FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
