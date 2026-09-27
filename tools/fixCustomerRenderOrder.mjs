import fs from "node:fs";
import path from "node:path";

const file =
    path.join(
        process.cwd(),
        "src",
        "components",
        "AnalyticsHubPanel.jsx"
    );

const backup =
    `${file}.backup-before-customer-render-order-20260925`;

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
 * Remove the customer render block currently located
 * after the !data check.
 */

const customerRenderBlockRegex =
    /\n\s*if \(\s*moduleId\.startsWith\(\s*['"]customer['"]\s*\)\s*\) \{\s*return \(\s*<CustomerAnalyticsModulePanel[\s\S]*?\n\s*\}\s*\n\s*\n\s*const sellerDailyFactor =/m;


const match =
    source.match(
        customerRenderBlockRegex
    );


if (
    match
) {

    source =
        source.replace(
            customerRenderBlockRegex,
            "\n\n    const sellerDailyFactor ="
        );

    console.log(
        "Old customer render location removed."
    );

}
else {

    console.log(
        "Old customer render block not found; it may already be moved."
    );

}


/*
 * Insert customer render BEFORE loading/data checks.
 */

const loadingAnchor =
    "    if (loading) {";


if (
    !source.includes(
        loadingAnchor
    )
) {

    throw new Error(
        "Loading anchor not found."
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

`;


if (
    !source.includes(
        "<CustomerAnalyticsModulePanel"
    )
) {

    source =
        source.replace(
            loadingAnchor,
            customerRender +
            loadingAnchor
        );

}
else if (
    !source.slice(
        0,
        source.indexOf(
            loadingAnchor
        )
    ).includes(
        "<CustomerAnalyticsModulePanel"
    )
) {

    source =
        source.replace(
            loadingAnchor,
            customerRender +
            loadingAnchor
        );

}


fs.writeFileSync(
    file,
    source,
    "utf8"
);


console.log(
    "Customer render order fixed successfully."
);

console.log(
    `Updated: ${file}`
);