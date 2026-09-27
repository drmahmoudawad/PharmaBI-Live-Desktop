const fs = require("fs");
const path = require("path");

const pageFile = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backupFile =
    pageFile + ".backup-before-shift-traffic-weight-page-v2";

if (!fs.existsSync(backupFile)) {
    throw new Error(
        "SAFE PAGE BACKUP NOT FOUND"
    );
}

/*
 * Restore the last known-good page.
 */
fs.copyFileSync(
    backupFile,
    pageFile
);

let text =
    fs.readFileSync(
        pageFile,
        "utf8"
    );

/*
 * Ensure selected-period props exist.
 */
const propsRegex =
    /export default function EmployeeShiftsPage\(\{\s*branchId\s*,\s*connection\s*(?:,\s*fromDate\s*,\s*toDate)?\s*\}\)/s;

if (!propsRegex.test(text)) {
    throw new Error(
        "EMPLOYEE SHIFT PAGE PROPS NOT FOUND"
    );
}

text =
    text.replace(
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
    !text.includes(
        "const normalizedFromDate ="
    )
) {
    const componentRegex =
        /export default function EmployeeShiftsPage\(\{[\s\S]*?\}\)\s*\{/;

    const match =
        componentRegex.exec(text);

    if (!match) {
        throw new Error(
            "EMPLOYEE SHIFT COMPONENT OPENING NOT FOUND"
        );
    }

    const dateBlock = `

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

    const insertPos =
        match.index + match[0].length;

    text =
        text.slice(0, insertPos) +
        dateBlock +
        text.slice(insertPos);
}

/*
 * Ensure the directory request uses the selected period.
 */
const hardcodedPattern =
    /branchId,\s*fromDate:\s*"2013-01-01",\s*toDate:\s*"2026-12-31",\s*connection/s;

if (hardcodedPattern.test(text)) {
    text =
        text.replace(
            hardcodedPattern,
`branchId,
                                      fromDate:
                                          normalizedFromDate,
                                      toDate:
                                          normalizedToDate,
                                      connection`
        );
}

/*
 * Add a completely separate effect for calculating
 * all branch shift traffic weights.
 */
if (
    !text.includes(
        "employee-shift-weights-recalculate-all"
    )
) {
    const firstUseEffect =
        text.indexOf(
            "    useEffect("
        );

    if (firstUseEffect === -1) {
        throw new Error(
            "FIRST useEffect NOT FOUND"
        );
    }

    const weightEffect = `    useEffect(
        () => {

            if (
                branchId ===
                "all" ||
                branchId == null ||
                !normalizedFromDate
            ) {
                return;
            }

            void window
                .pharmaBI
                .dashboard
                .overview({
                    action:
                        "employee-shift-weights-recalculate-all",

                    evaluationFromDate:
                        normalizedFromDate
                })
                .then(
                    result => {
                        console.log(
                            "[EmployeeShiftsPage] shift traffic weights:",
                            result
                        );
                    }
                )
                .catch(
                    error => {
                        console.error(
                            "[EmployeeShiftsPage] shift traffic weights failed:",
                            error
                        );
                    }
                );

        },
        [
            branchId,
            normalizedFromDate
        ]
    );

`;

    text =
        text.slice(
            0,
            firstUseEffect
        ) +
        weightEffect +
        text.slice(
            firstUseEffect
        );
}

/*
 * Make the employee-directory request use normalized dates.
 */
const directoryActionRegex =
    /action\s*:\s*"employee-directory-get"[\s\S]*?branchId[\s\S]*?fromDate[\s\S]*?toDate[\s\S]*?connection/s;

if (!directoryActionRegex.test(text)) {
    throw new Error(
        "EMPLOYEE DIRECTORY REQUEST NOT FOUND"
    );
}

text =
    text.replace(
        directoryActionRegex,
        match => {
            let updated = match;

            updated =
                updated.replace(
                    /fromDate\s*:\s*"[^"]*"/s,
                    "fromDate:\n                                          normalizedFromDate"
                );

            updated =
                updated.replace(
                    /toDate\s*:\s*"[^"]*"/s,
                    "toDate:\n                                          normalizedToDate"
                );

            return updated;
        }
    );

/*
 * Ensure load callback reloads when the selected period changes.
 */
const dependencyRegex =
    /\[\s*branchId\s*,\s*connection\s*\]/s;

if (
    dependencyRegex.test(text) &&
    text.includes("normalizedFromDate")
) {
    text =
        text.replace(
            dependencyRegex,
`[
                branchId,
                connection,
                normalizedFromDate,
                normalizedToDate
            ]`
        );
}

fs.writeFileSync(
    pageFile,
    text,
    "utf8"
);

console.log(
    "EMPLOYEE SHIFT PAGE RESTORED AND FIXED"
);

console.log(
    "SHIFT WEIGHT CALCULATION MOVED TO INDEPENDENT useEffect"
);

console.log(
    "NO PROMISE.ALL MODIFICATION"
);

console.log(
    "Backup used:",
    backupFile
);
