const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "AnalyticsHubPanel.jsx"
);

const backup =
    file + ".backup-before-seller-connection-fix";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const oldBlock =
`                        connection:
                            selectedBranchId ===
                            branchId
                                ? connection
                                : null,`;

const newBlock =
`                        connection:
                            connection,`;

if (!text.includes(oldBlock)) {
    throw new Error(
        "SELLER PERFORMANCE CONNECTION BLOCK NOT FOUND"
    );
}

text =
    text.replace(
        oldBlock,
        newBlock
    );

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "SELLER PERFORMANCE CONNECTION FIXED"
);

console.log(
    "The selected branch connection is now passed directly."
);

console.log(
    "Backup:",
    backup
);
