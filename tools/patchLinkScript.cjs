const fs = require("fs");

const file =
    "tools/linkRfmCrmWhatsApp.cjs";

let content =
    fs.readFileSync(
        file,
        "utf8"
    ).replace(/\r\n/g, "\n");

const start =
    content.indexOf(
        "const insertionMarker ="
    );

const oldIndexLine =
    content.indexOf(
        "const index = content.indexOf(insertionMarker);",
        start
    );

if (
    start === -1 ||
    oldIndexLine === -1
) {
    throw new Error(
        "SCRIPT INSERTION SECTION NOT FOUND"
    );
}

const endOfOldLine =
    content.indexOf(
        "\n",
        oldIndexLine
    );

const replacement =
`
const stickyHeaderIndex =
    content.indexOf(
        'className="customer-profile-sticky-header"'
    );

if (
    stickyHeaderIndex === -1
) {
    throw new Error(
        "CUSTOMER STICKY HEADER NOT FOUND"
    );
}

const index =
    content.indexOf(
        "\\n                <div",
        stickyHeaderIndex
    );

if (
    index === -1
) {
    throw new Error(
        "CUSTOMER MODAL CONTENT INSERTION POINT NOT FOUND"
    );
}
`.trim();

content =
    content.slice(
        0,
        start
    ) +
    replacement +
    content.slice(
        endOfOldLine + 1
    );

fs.writeFileSync(
    file,
    content.replace(/\n/g, "\r\n"),
    "utf8"
);

console.log(
    "LINK SCRIPT INSERTION LOGIC FIXED"
);
