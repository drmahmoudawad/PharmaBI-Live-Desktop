const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-independent-date-range";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const helper = String.raw`

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

    const day =
        String(
            now.getDate() + 1
        ).padStart(
            2,
            "0"
        );

    let nextDate =
        new Date(
            year,
            now.getMonth(),
            now.getDate() + 1
        );

    const nextYear =
        nextDate.getFullYear();

    const nextMonth =
        String(
            nextDate.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const nextDay =
        String(
            nextDate.getDate()
        ).padStart(
            2,
            "0"
        );

    return {
        fromDate:
            "2013-01-01",

        toDate:
            nextYear +
            "-" +
            nextMonth +
            "-" +
            nextDay
    };

}

`;

if (
    !text.includes(
        "function getEmployeeListDateRange("
    )
) {

    const anchor =
        "export default function EmployeeShiftsPage(";

    const position =
        text.indexOf(
            anchor
        );

    if (
        position === -1
    ) {
        throw new Error(
            "EmployeeShiftsPage component not found"
        );
    }

    text =
        text.slice(
            0,
            position
        ) +
        helper +
        text.slice(
            position
        );
}


const loadAnchor =
`    const load =
        useCallback(
            async () => {`;

if (
    !text.includes(
        "const employeeListRange ="
    )
) {

    if (
        !text.includes(
            loadAnchor
        )
    ) {
        throw new Error(
            "load callback not found"
        );
    }

    text =
        text.replace(
            loadAnchor,
            loadAnchor +
`
                const employeeListRange =
                    getEmployeeListDateRange();
`
        );
}


const oldDates =
`                                    fromDate:
                                        normalizedFromDate,

                                    toDate:
                                        normalizedToDate,

                                    connection`;

const newDates =
`                                    fromDate:
                                        employeeListRange.fromDate,

                                    toDate:
                                        employeeListRange.toDate,

                                    connection`;

if (
    text.includes(
        oldDates
    )
) {

    text =
        text.replace(
            oldDates,
            newDates
        );

}
else if (
    !text.includes(
        "employeeListRange.fromDate"
    )
) {

    const genericDates =
        /fromDate\s*:\s*normalizedFromDate\s*,\s*toDate\s*:\s*normalizedToDate\s*,\s*connection/s;

    if (
        !genericDates.test(
            text
        )
    ) {
        throw new Error(
            "Seller overview date parameters not found"
        );
    }

    text =
        text.replace(
            genericDates,
            `fromDate:
                                        employeeListRange.fromDate,

                                    toDate:
                                        employeeListRange.toDate,

                                    connection`
        );
}


fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "EMPLOYEE SHIFT PAGE NOW USES INDEPENDENT VALID DATE RANGE"
);
