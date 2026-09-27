const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-page-period-final";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

/* =========================================================
   1) Component props
   ========================================================= */

if (
    !text.includes("fromDate") ||
    !text.includes("toDate")
) {
    throw new Error(
        "EmployeeShiftsPage date props cannot be identified"
    );
}

const propsRegex =
    /export default function EmployeeShiftsPage\(\{\s*branchId\s*,\s*connection\s*\}\)/s;

if (propsRegex.test(text)) {
    text = text.replace(
        propsRegex,
`export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
})`
    );

    console.log("PAGE PROPS UPDATED");
}
else {
    console.log("PAGE PROPS ALREADY UPDATED");
}

/* =========================================================
   2) Normalized selected period
   ========================================================= */

if (
    !text.includes(
        "const normalizedFromDate ="
    )
) {
    const componentOpen =
        /export default function EmployeeShiftsPage\(\{[\s\S]*?\}\)\s*\{/;

    const match =
        componentOpen.exec(text);

    if (!match) {
        throw new Error(
            "EmployeeShiftsPage component opening not found"
        );
    }

    const insertPos =
        match.index + match[0].length;

    const block = `

    const normalizedFromDate =
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

    text =
        text.slice(0, insertPos) +
        block +
        text.slice(insertPos);

    console.log(
        "NORMALIZED PERIOD ADDED"
    );
}
else {
    console.log(
        "NORMALIZED PERIOD ALREADY EXISTS"
    );
}

/* =========================================================
   3) Employee directory request
   ========================================================= */

const directoryRegex =
    /window\s*\.pharmaBI\s*\.dashboard\s*\.overview\s*\(\s*\{\s*action\s*:\s*"employee-directory-get"[\s\S]*?connection[\s\S]*?\}\s*\)/s;

if (!directoryRegex.test(text)) {
    throw new Error(
        "employee-directory-get request not found"
    );
}

text =
    text.replace(
        directoryRegex,
`window
    .pharmaBI
    .dashboard
    .overview({
        action:
            "employee-directory-get",

        branchId,

        fromDate:
            normalizedFromDate,

        toDate:
            normalizedToDate,

        connection
    })`
    );

console.log(
    "EMPLOYEE DIRECTORY REQUEST UPDATED"
);

/* =========================================================
   4) load callback dependencies
   ========================================================= */

const loadRegex =
    /(const\s+load\s*=\s*useCallback\s*\([\s\S]*?)(\n\s*\[\s*branchId\s*,\s*connection\s*\]\s*\);)/s;

if (loadRegex.test(text)) {
    text =
        text.replace(
            loadRegex,
            `$1
            [
                branchId,
                connection,
                normalizedFromDate,
                normalizedToDate
            ]
        );`
        );

    console.log(
        "LOAD DEPENDENCIES UPDATED"
    );
}
else {
    console.log(
        "LOAD DEPENDENCIES ALREADY UPDATED OR NOT IN EXPECTED FORM"
    );
}

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log("");
console.log(
    "EMPLOYEE SHIFT PAGE PERIOD FIX COMPLETED"
);
console.log(
    "Backup:",
    backup
);
