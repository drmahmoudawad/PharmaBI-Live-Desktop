const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-hardcoded-staff-dates";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const fromPattern =
`fromDate:
                                        employeeListRange.fromDate,

                                    toDate:
                                        employeeListRange.toDate,`;

const toReplacement =
`fromDate:
                                        "2013-01-01",

                                    toDate:
                                        "2026-12-31",`;

if (
    text.includes(
        fromPattern
    )
) {

    text =
        text.replace(
            fromPattern,
            toReplacement
        );

}
else if (
    !text.includes(
        '"2013-01-01"'
    )
) {

    const generic =
        /fromDate\s*:\s*employeeListRange\.fromDate\s*,\s*toDate\s*:\s*employeeListRange\.toDate\s*,/s;

    if (
        !generic.test(
            text
        )
    ) {
        throw new Error(
            "Employee seller-overview date block not found"
        );
    }

    text =
        text.replace(
            generic,
            toReplacement.trim()
        );
}

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "EMPLOYEE LIST DATES HARD-CODED TO VALID YYYY-MM-DD"
);

console.log(
    "Backup:",
    backup
);
