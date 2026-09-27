import fs from "node:fs";
import path from "node:path";

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "CustomerAnalyticsModulePanel.jsx"
);

const backup = `${file}.backup-before-date-normalization-20260925`;

let source = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    console.log(`Backup created: ${backup}`);
} else {
    console.log(`Backup already exists: ${backup}`);
}

/*
 * Add date normalizer after the React import.
 */
const reactImportAnchor = `} from "react";`;

if (!source.includes("function normalizeCustomerDate")) {
    const importIndex = source.indexOf(reactImportAnchor);

    if (importIndex < 0) {
        throw new Error('Could not locate React import anchor: } from "react";');
    }

    const insertAt = importIndex + reactImportAnchor.length;

    const helper = `


function normalizeCustomerDate(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
    ) {

        return "";

    }


    if (
        value instanceof Date
    ) {

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {

            return "";

        }

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
            \`\${year}-\${month}-\${day}\`
        );

    }


    const raw =
        String(
            value
        ).trim();


    const exact =
        raw.match(
            /^(\\d{4}-\\d{2}-\\d{2})/
        );


    if (
        exact
    ) {

        return exact[1];

    }


    const parsed =
        new Date(
            raw
        );


    if (
        !Number.isNaN(
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
            \`\${year}-\${month}-\${day}\`
        );

    }


    return "";

}

`;

    source =
        source.slice(
            0,
            insertAt
        ) +
        helper +
        source.slice(
            insertAt
        );

    console.log("Date normalizer added.");
}

/*
 * Locate the actual Customer module useEffect.
 */
const effectStart =
    source.indexOf(
        "useEffect("
    );

if (
    effectStart <
    0
) {

    throw new Error(
        "Could not locate Customer Module useEffect."
    );

}

/*
 * Locate the async loader inside that effect.
 */
const loaderAnchor =
    "async function loadModule() {";

const loaderIndex =
    source.indexOf(
        loaderAnchor,
        effectStart
    );

if (
    loaderIndex <
    0
) {

    throw new Error(
        "Could not locate async function loadModule()."
    );

}

/*
 * Add safe dates immediately inside loadModule().
 */
if (
    !source.includes(
        "const safeFromDate ="
    )
) {

    const insertAt =
        loaderIndex +
        loaderAnchor.length;

    const safeDates = `


                const safeToDate =
                    normalizeCustomerDate(
                        toDate
                    ) ||
                    normalizeCustomerDate(
                        new Date()
                    );


                const safeFromDate =
                    normalizeCustomerDate(
                        fromDate
                    ) ||
                    safeToDate;


                console.log(
                    "[Customer Module] Dates:",
                    {
                        fromDate,
                        toDate,
                        safeFromDate,
                        safeToDate
                    }
                );

`;

    source =
        source.slice(
            0,
            insertAt
        ) +
        safeDates +
        source.slice(
            insertAt
        );

    console.log("Safe dates added.");
}

/*
 * Restrict replacements to the actual useEffect section.
 */
const effectEnd =
    source.indexOf(
        "loadModule();",
        effectStart
    );

if (
    effectEnd <
    0
) {

    throw new Error(
        "Could not locate loadModule();"
    );

}

const effectSection =
    source.slice(
        effectStart,
        effectEnd
    );

let patchedEffect =
    effectSection;

/*
 * Replace API shorthand properties:
 *
 * fromDate,
 * toDate,
 *
 * with:
 *
 * fromDate: safeFromDate,
 * toDate: safeToDate,
 */
patchedEffect =
    patchedEffect.replace(
        /\bfromDate,\s*/g,
        "fromDate: safeFromDate,\n"
    );

patchedEffect =
    patchedEffect.replace(
        /\btoDate,\s*/g,
        "toDate: safeToDate,\n"
    );

/*
 * Also handle explicit property forms.
 */
patchedEffect =
    patchedEffect.replace(
        /\bfromDate:\s*fromDate\b/g,
        "fromDate: safeFromDate"
    );

patchedEffect =
    patchedEffect.replace(
        /\btoDate:\s*toDate\b/g,
        "toDate: safeToDate"
    );

if (
    patchedEffect ===
    effectSection
) {

    throw new Error(
        "No customer API date payloads were changed."
    );

}

source =
    source.slice(
        0,
        effectStart
    ) +
    patchedEffect +
    source.slice(
        effectEnd
    );

fs.writeFileSync(
    file,
    source,
    "utf8"
);

console.log(
    "Customer date normalization completed successfully."
);

console.log(
    `Updated: ${file}`
);