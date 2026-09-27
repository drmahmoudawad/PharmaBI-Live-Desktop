const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-fast-employee-list";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const startMarker =
    "function getEmployeeListDateRange()";

const start =
    text.indexOf(
        startMarker
    );

if (start === -1) {
    throw new Error(
        "getEmployeeListDateRange function not found"
    );
}

const openBrace =
    text.indexOf(
        "{",
        start
    );

if (openBrace === -1) {
    throw new Error(
        "Employee date function opening brace not found"
    );
}

let depth = 0;
let end = -1;

for (
    let i = openBrace;
    i < text.length;
    i++
) {

    if (text[i] === "{") {
        depth++;
    }
    else if (text[i] === "}") {
        depth--;

        if (depth === 0) {
            end = i + 1;
            break;
        }
    }
}

if (end === -1) {
    throw new Error(
        "Employee date function closing brace not found"
    );
}

const replacement = `
function getEmployeeListDateRange() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const tomorrow =
        new Date(
            year,
            now.getMonth(),
            now.getDate() + 1
        );

    const tomorrowYear =
        tomorrow.getFullYear();

    const tomorrowMonth =
        String(
            tomorrow.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const tomorrowDay =
        String(
            tomorrow.getDate()
        ).padStart(
            2,
            "0"
        );

    return {

        fromDate:
            year +
            "-" +
            month +
            "-01",

        toDate:
            tomorrowYear +
            "-" +
            tomorrowMonth +
            "-" +
            tomorrowDay

    };

}
`;

text =
    text.slice(
        0,
        start
    ) +
    replacement +
    text.slice(
        end
    );

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "EMPLOYEE LIST RANGE CHANGED TO CURRENT MONTH"
);
console.log(
    "Old range: 2013-01-01 -> 2026-12-31"
);
console.log(
    "New range: current month start -> tomorrow"
);
