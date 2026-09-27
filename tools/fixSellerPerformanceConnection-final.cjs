const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "AnalyticsHubPanel.jsx"
);

const backup =
    file + ".backup-before-seller-connection-final";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const start =
    text.indexOf("seller-performance");

if (start === -1) {
    throw new Error(
        "seller-performance NOT FOUND"
    );
}

const end =
    text.indexOf(
        "const openCustomerProfile",
        start
    );

if (end === -1) {
    throw new Error(
        "openCustomerProfile NOT FOUND"
    );
}

let region =
    text.slice(
        start,
        end
    );

const conditionalConnection =
    /connection\s*:\s*selectedBranchId\s*===\s*branchId\s*\?\s*connection\s*:\s*null\s*,/s;

if (!conditionalConnection.test(region)) {
    console.log(
        "Current seller-performance connection section:"
    );

    const compact =
        region
            .replace(/\s+/g, " ")
            .slice(0, 1800);

    console.log(compact);

    throw new Error(
        "SELLER PERFORMANCE CONDITIONAL CONNECTION NOT FOUND"
    );
}

region =
    region.replace(
        conditionalConnection,
        "connection:\n                            connection,"
    );

text =
    text.slice(
        0,
        start
    ) +
    region +
    text.slice(
        end
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
    "Only seller-performance block was changed."
);

console.log(
    "Backup:",
    backup
);
