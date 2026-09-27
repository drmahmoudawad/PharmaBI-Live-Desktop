import fs from "node:fs";
import path from "node:path";

const root =
    process.cwd();

const file =
    path.join(
        root,
        "src",
        "components",
        "AnalyticsHubPanel.jsx"
    );

const customerComponent =
    path.join(
        root,
        "src",
        "components",
        "CustomerAnalyticsModulePanel.jsx"
    );

const backup =
    `${file}.backup-before-customer-pages-separation-20260925`;

let source =
    fs.readFileSync(
        file,
        "utf8"
    );


if (
    !fs.existsSync(
        customerComponent
    )
) {

    throw new Error(
        `CustomerAnalyticsModulePanel.jsx not found:\n${customerComponent}`
    );

}


if (
    !fs.existsSync(
        backup
    )
) {

    fs.writeFileSync(
        backup,
        source,
        "utf8"
    );

    console.log(
        `Backup created: ${backup}`
    );

}
else {

    console.log(
        `Backup already exists: ${backup}`
    );

}


/*
 * ---------------------------------------------------------
 * 1. Add customer module import
 * ---------------------------------------------------------
 */

const importLine =
    `import CustomerAnalyticsModulePanel from './CustomerAnalyticsModulePanel.jsx';`;

if (
    !source.includes(
        "CustomerAnalyticsModulePanel"
    )
) {

    const importAnchor =
        "import * as XLSX from 'xlsx';";

    if (
        !source.includes(
            importAnchor
        )
    ) {

        throw new Error(
            "XLSX import anchor not found."
        );

    }


    source =
        source.replace(
            importAnchor,
            `${importAnchor}\n${importLine}`
        );

    console.log(
        "CustomerAnalyticsModulePanel import added."
    );

}
else {

    console.log(
        "CustomerAnalyticsModulePanel import already exists."
    );

}


/*
 * ---------------------------------------------------------
 * 2. Prevent generic analytics.module from loading
 *    for customer pages.
 * ---------------------------------------------------------
 */

if (
    !source.includes(
        "if (moduleId.startsWith('customer'))"
    )
) {

    const customerGuard =
`                    if (
                        moduleId.startsWith(
                            'customer'
                        )
                    ) {
                        if (!cancelled) {
                            setLoading(false);
                        }

                        return;
                    }

`;


    const effectPattern =
        /(\s*)const result\s*=\s*moduleId\s*===\s*['"]sales-sellers['"]/;


    if (
        !effectPattern.test(
            source
        )
    ) {

        throw new Error(
            "Current analytics loading anchor was not found."
        );

    }


    source =
        source.replace(
            effectPattern,
            `$1${customerGuard}                    const result = moduleId === 'sales-sellers'`
        );

    console.log(
        "Customer loading guard added."
    );

}
else {

    console.log(
        "Customer loading guard already exists."
    );

}


/*
 * ---------------------------------------------------------
 * 3. Render the dedicated customer module
 * ---------------------------------------------------------
 */

if (
    !source.includes(
        "<CustomerAnalyticsModulePanel"
    )
) {

    const marker =
        "    const sellerDailyFactor =";


    const occurrenceCount =
        (
            source.match(
                /    const sellerDailyFactor =/g
            ) ||
            []
        ).length;


    if (
        occurrenceCount !==
        1
    ) {

        throw new Error(
            `sellerDailyFactor marker count = ${occurrenceCount}`
        );

    }


    const customerRender =
`    if (
        moduleId.startsWith(
            'customer'
        )
    ) {
        return (
            <CustomerAnalyticsModulePanel
                moduleId={
                    moduleId
                }

                branchId={
                    branchId
                }

                connection={
                    connection
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }
            />
        );
    }

    const sellerDailyFactor =`;


    source =
        source.replace(
            marker,
            customerRender
        );

    console.log(
        "Dedicated customer rendering added."
    );

}
else {

    console.log(
        "Dedicated customer rendering already exists."
    );

}


/*
 * ---------------------------------------------------------
 * 4. Remove the old generic customer body
 *    so there is no duplicate rendering.
 * ---------------------------------------------------------
 */

const oldCustomerStart =
`    } else if (
        moduleId.startsWith(
            'customer'
        )
    ) {`;


const oldCustomerIndex =
    source.indexOf(
        oldCustomerStart
    );


if (
    oldCustomerIndex !==
        -1
) {

    const oldCustomerEndMarker =
        `        } else if (
            moduleId === 'purchase-overview'`;


    const oldCustomerEndIndex =
        source.indexOf(
            oldCustomerEndMarker,
            oldCustomerIndex
        );


    if (
        oldCustomerEndIndex !==
        -1
    ) {

        const before =
            source.slice(
                0,
                oldCustomerIndex
            );


        const after =
            source.slice(
                oldCustomerEndIndex
            );


        source =
            before +
            `    } else if (false) {\n` +
            `        /* customer pages are rendered by CustomerAnalyticsModulePanel */\n` +
            `        body = null;\n` +
            `    ` +
            after;


        console.log(
            "Old generic customer body disabled."
        );

    }
    else {

        console.log(
            "Old generic customer body end marker not found; leaving it unchanged."
        );

    }

}
else {

    console.log(
        "Old generic customer body already removed or not found."
    );

}


/*
 * ---------------------------------------------------------
 * 5. Write
 * ---------------------------------------------------------
 */

fs.writeFileSync(
    file,
    source,
    "utf8"
);


console.log(
    "Customer page separation completed successfully."
);

console.log(
    `Updated: ${file}`
);