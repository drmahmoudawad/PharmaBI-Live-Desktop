const fs = require("fs");
const path = require("path");

function backup(file, suffix) {
    const b = file + suffix;

    if (!fs.existsSync(b)) {
        fs.copyFileSync(file, b);
    }

    return b;
}

/* =========================================================
   1) DASHBOARD IPC
   ========================================================= */

const ipcFile = path.join(
    process.cwd(),
    "electron",
    "ipc",
    "dashboard.ipc.js"
);

const ipcBackup =
    backup(
        ipcFile,
        ".backup-before-shift-traffic-weight-ipc-v2"
    );

let ipc = fs.readFileSync(
    ipcFile,
    "utf8"
);

/* Add import if it does not exist. */
if (
    !ipc.includes(
        "employeeShiftWeightService.js"
    )
) {
    const importRegex =
        /import\s*\{\s*getEmployeeDirectory\s*\}\s*from\s*["']\.\.\/pharmfly\/employeeDirectoryService\.js["'];/s;

    if (!importRegex.test(ipc)) {
        throw new Error(
            "EMPLOYEE DIRECTORY IMPORT NOT FOUND"
        );
    }

    ipc =
        ipc.replace(
            importRegex,
            match =>
                match +
                `
import {
    recalculateAllBranchShiftTrafficWeights
} from "../pharmfly/employeeShiftWeightService.js";`
        );

    console.log(
        "SHIFT WEIGHT IMPORT ADDED"
    );
}
else {
    console.log(
        "SHIFT WEIGHT IMPORT ALREADY EXISTS"
    );
}

/* Add IPC action if missing. */
if (
    !ipc.includes(
        '"employee-shift-weights-recalculate-all"'
    )
) {
    const anchorRegex =
        /if\s*\(\s*payload\?\.\s*action\s*===\s*"employee-directory-get"\s*\)\s*\{/s;

    if (!anchorRegex.test(ipc)) {
        throw new Error(
            "EMPLOYEE DIRECTORY IPC ACTION NOT FOUND"
        );
    }

    const action =
`              if (
                  payload?.action ===
                  "employee-shift-weights-recalculate-all"
              ) {

                  return recalculateAllBranchShiftTrafficWeights({
                      evaluationFromDate:
                          payload?.evaluationFromDate
                  });

              }

`;

    ipc =
        ipc.replace(
            anchorRegex,
            action + "$&"
        );

    console.log(
        "SHIFT WEIGHT IPC ACTION ADDED"
    );
}
else {
    console.log(
        "SHIFT WEIGHT IPC ACTION ALREADY EXISTS"
    );
}

fs.writeFileSync(
    ipcFile,
    ipc,
    "utf8"
);

console.log(
    "DASHBOARD IPC UPDATED"
);

/* =========================================================
   2) EMPLOYEE SHIFTS PAGE
   ========================================================= */

const pageFile = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const pageBackup =
    backup(
        pageFile,
        ".backup-before-shift-traffic-weight-page-v2"
    );

let page =
    fs.readFileSync(
        pageFile,
        "utf8"
    );

/*
 * Ensure the page has fromDate/toDate props.
 */
const propsRegex =
    /export default function EmployeeShiftsPage\(\{\s*branchId\s*,\s*connection(?:\s*,\s*fromDate\s*,\s*toDate)?\s*\}\)/s;

if (!propsRegex.test(page)) {
    throw new Error(
        "EMPLOYEE SHIFTS PAGE PROPS NOT FOUND"
    );
}

page =
    page.replace(
        propsRegex,
`export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
})`
    );

/*
 * Ensure normalized dates exist.
 */
if (
    !page.includes(
        "const normalizedFromDate ="
    )
) {
    const componentRegex =
        /export default function EmployeeShiftsPage\(\{[\s\S]*?\}\)\s*\{/;

    const match =
        componentRegex.exec(page);

    if (!match) {
        throw new Error(
            "EMPLOYEE SHIFTS COMPONENT OPENING NOT FOUND"
        );
    }

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

    const pos =
        match.index + match[0].length;

    page =
        page.slice(0, pos) +
        block +
        page.slice(pos);

    console.log(
        "NORMALIZED DATES ADDED"
    );
}

/*
 * Add automatic all-branch weight calculation once
 * before loading the employee directory.
 */
if (
    !page.includes(
        "employee-shift-weights-recalculate-all"
    )
) {
    const directoryRegex =
        /(\s*)window\s*\.pharmaBI\s*\.dashboard\s*\.overview\s*\(\s*\{\s*action\s*:\s*"employee-directory-get"/s;

    const match =
        directoryRegex.exec(page);

    if (!match) {
        throw new Error(
            "EMPLOYEE DIRECTORY REQUEST NOT FOUND"
        );
    }

    const indent =
        match[1];

    const weightCall =
`${indent}window
${indent}    .pharmaBI
${indent}    .dashboard
${indent}    .overview({
${indent}        action:
${indent}            "employee-shift-weights-recalculate-all",

${indent}        evaluationFromDate:
${indent}            normalizedFromDate

${indent}    })
${indent}    .then(
${indent}        result => {
${indent}            console.log(
${indent}                "[EmployeeShiftsPage] shift traffic weights:",
${indent}                result
${indent}            );
${indent}        }
${indent}    )
${indent}    .catch(
${indent}        error => {
${indent}            console.error(
${indent}                "[EmployeeShiftsPage] shift traffic weights failed:",
${indent}                error
${indent}            );
${indent}        }
${indent}    );

`;

    page =
        page.slice(0, match.index) +
        weightCall +
        page.slice(match.index);

    console.log(
        "SHIFT WEIGHT CALCULATION TRIGGER ADDED"
    );
}
else {
    console.log(
        "SHIFT WEIGHT CALCULATION TRIGGER ALREADY EXISTS"
    );
}

/*
 * Ensure useCallback reloads when the selected period changes.
 */
if (
    page.includes(
        "const load ="
    ) &&
    page.includes(
        "normalizedFromDate"
    ) &&
    page.includes(
        "normalizedToDate"
    )
) {
    const dependencyRegex =
        /\n\s*\[\s*branchId\s*,\s*connection\s*\]\s*\n\s*\);/s;

    if (dependencyRegex.test(page)) {
        page =
            page.replace(
                dependencyRegex,
`
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
}

fs.writeFileSync(
    pageFile,
    page,
    "utf8"
);

console.log(
    "EMPLOYEE SHIFTS PAGE UPDATED"
);

console.log("");
console.log(
    "SHIFT TRAFFIC WEIGHTS INSTALLATION FINISHED"
);
console.log(
    "Backups:"
);
console.log(
    ipcBackup
);
console.log(
    pageBackup
);
