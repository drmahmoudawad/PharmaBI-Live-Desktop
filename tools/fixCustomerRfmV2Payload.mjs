import fs from "node:fs";
import path from "node:path";

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "CustomerAnalyticsModulePanel.jsx"
);

const backup =
    `${file}.backup-before-rfm-v2-payload-fix-20260925`;

let source =
    fs.readFileSync(
        file,
        "utf8"
    );

if (
    !fs.existsSync(
        backup
    )
) {

    fs.copyFileSync(
        file,
        backup
    );

    console.log(
        `Backup created: ${backup}`
    );

} else {

    console.log(
        `Backup already exists: ${backup}`
    );

}


/*
 * Date normalizer
 */
if (
    !source.includes(
        "function normalizeCustomerDate"
    )
) {

    const anchor =
        '} from "react";';

    const anchorIndex =
        source.indexOf(
            anchor
        );

    if (
        anchorIndex <
        0
    ) {

        throw new Error(
            'Could not locate React import.'
        );

    }

    const insertAt =
        anchorIndex +
        anchor.length;

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


    const raw =
        String(
            value
        ).trim();


    const isoMatch =
        raw.match(
            /^(\\d{4}-\\d{2}-\\d{2})/
        );


    if (
        isoMatch
    ) {

        return isoMatch[1];

    }


    const date =
        new Date(
            raw
        );


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                date.getDate()
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

    console.log(
        "Date normalizer added."
    );

}


/*
 * Fix only the RFM V2 calls.
 */
const rfmRegex =
    /(customersApi\.rfmV2\(\{\s*branchId,\s*)fromDate,\s*toDate,\s*limit:\s*5000\s*(\})/gs;

const matches =
    source.match(
        rfmRegex
    );

if (
    !matches ||
    matches.length === 0
) {

    /*
     * Second form: formatted multiline source.
     */
    const alternateRegex =
        /(customersApi\s*\.\s*rfmV2\s*\(\s*\{\s*branchId,\s*)fromDate\s*,\s*toDate\s*,\s*limit\s*:\s*5000\s*(\})/gs;

    if (
        !source.match(
            alternateRegex
        )
    ) {

        throw new Error(
            "Could not locate the customersApi.rfmV2 payload."
        );

    }

    source =
        source.replace(
            alternateRegex,
            `$1analysisDate: normalizeCustomerDate(toDate),\n\n                                    limit:\n                                        5000\n\n                                $2`
        );

    console.log(
        "RFM V2 payload fixed using alternate pattern."
    );

} else {

    source =
        source.replace(
            rfmRegex,
            `$1analysisDate: normalizeCustomerDate(toDate),\n\n                                    limit:\n                                        5000\n\n                                $2`
        );

    console.log(
        `RFM V2 payload fixed. Matches: ${matches.length}`
    );

}


fs.writeFileSync(
    file,
    source,
    "utf8"
);

console.log(
    "Customer RFM V2 payload fix completed successfully."
);

console.log(
    `Updated: ${file}`
);