const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "AnalyticsHubPanel.jsx"
);

const backup =
    file + ".backup-before-seller-connection-fix-v2";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const regionRegex =
    /action\s*:\s*['"]seller-performance['"][\s\S]{0,1800}?connection\s*:\s*selectedBranchId\s*===\s*branchId\s*\?\s*connection\s*:\s*null\s*,/s;

const match =
    text.match(regionRegex);

if (!match) {
    throw new Error(
        "SELLER PERFORMANCE CONDITIONAL CONNECTION NOT FOUND"
    );
}

const updated =
    match[0].replace(
        /connection\s*:\s*selectedBranchId\s*===\s*branchId\s*\?\s*connection\s*:\s*null\s*,/s,
`connection:
                            connection,`
    );

text =
    text.replace(
        regionRegex,
        updated
    );

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "SELLER PERFORMANCE CONNECTION FIXED SUCCESSFULLY"
);

console.log(
    "Only the seller-performance request was changed."
);

console.log(
    "Backup:",
    backup
);
