const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-remove-unused-dates";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const badBlock = `    const normalizedFromDate =
        normalizeDateInput(
            fromDate,
            true
        );

    const normalizedToDate =
        normalizeDateInput(
            toDate,
            false
        );


`;

if (
    !text.includes(
        badBlock
    )
) {
    throw new Error(
        "Unused normalized date block not found"
    );
}

text =
    text.replace(
        badBlock,
        ""
    );

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "UNUSED DATE REFERENCES REMOVED"
);
console.log(
    "Backup:",
    backup
);
