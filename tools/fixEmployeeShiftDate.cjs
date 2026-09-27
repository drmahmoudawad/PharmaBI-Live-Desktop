const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "EmployeeShiftsPage.jsx"
);

const backup =
    file + ".backup-before-date-fix";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const helper = `
function normalizeDateInput(
    value,
    monthStart = false
) {

    const raw =
        String(
            value ?? ""
        ).trim();

    if (
        /^\\\\d{4}-\\\\d{2}-\\\\d{2}/.test(
            raw
        )
    ) {
        return raw.slice(0, 10);
    }

    if (
        value instanceof Date &&
        Number.isFinite(
            value.getTime()
        )
    ) {

        const year =
            value.getFullYear();

        const month =
            String(
                value.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                value.getDate()
            ).padStart(
                2,
                "0"
            );

        return (
            year +
            "-" +
            month +
            "-" +
            day
        );
    }

    const parsed =
        new Date(
            raw
        );

    if (
        Number.isFinite(
            parsed.getTime()
        )
    ) {

        const year =
            parsed.getFullYear();

        const month =
            String(
                parsed.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                parsed.getDate()
            ).padStart(
                2,
                "0"
            );

        return (
            year +
            "-" +
            month +
            "-" +
            day
        );
    }

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
        monthStart
            ? "01"
            : String(
                new Date(
                    year,
                    now.getMonth() + 1,
                    0
                ).getDate()
            ).padStart(
                2,
                "0"
            );

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}

`;

if (
    !text.includes(
        "function normalizeDateInput("
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


const componentAnchor =
`export default function EmployeeShiftsPage({
    branchId,
    connection,
    fromDate,
    toDate
}) {`;

const componentReplacement =
`${componentAnchor}

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

if (
    !text.includes(
        "const normalizedFromDate"
    )
) {

    if (
        !text.includes(
            componentAnchor
        )
    ) {
        throw new Error(
            "EmployeeShiftsPage component signature not found"
        );
    }

    text =
        text.replace(
            componentAnchor,
            componentReplacement
        );
}


const requestPattern =
`                                    fromDate,
                                    toDate,

                                    connection`;

const requestReplacement =
`                                    fromDate:
                                        normalizedFromDate,

                                    toDate:
                                        normalizedToDate,

                                    connection`;

if (
    !text.includes(
        "normalizedFromDate"
    )
) {
    throw new Error(
        "Normalized dates were not inserted"
    );
}

if (
    text.includes(
        requestPattern
    )
) {

    text =
        text.replace(
            requestPattern,
            requestReplacement
        );

}
else if (
    text.includes(
        "fromDate:\n                                        normalizedFromDate"
    )
) {
    // Already fixed.
}
else {

    throw new Error(
        "Seller overview date request block not found"
    );
}


console.log(
    "EMPLOYEE SHIFT DATE FIX APPLIED"
);

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "Backup:",
    backup
);
