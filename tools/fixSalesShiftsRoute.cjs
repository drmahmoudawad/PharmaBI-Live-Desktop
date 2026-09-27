const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = "D:\\PharmaBI-Live-Desktop";
const FILE = path.join(
    ROOT,
    "src",
    "app",
    "BranchAnalyticsRouter.jsx"
);

const BACKUP =
    FILE +
    ".backup-before-sales-shifts-route-v4";

function fail(message) {
    throw new Error(message);
}

let source =
    fs.readFileSync(
        FILE,
        "utf8"
    );

if (
    !fs.existsSync(BACKUP)
) {
    fs.copyFileSync(
        FILE,
        BACKUP
    );
}

if (
    !source.includes(
        "SalesAnalyticsPanel"
    )
) {

    const importNeedle =
        'import AnalyticsHubPanel';

    const importIndex =
        source.indexOf(
            importNeedle
        );

    if (
        importIndex < 0
    ) {
        fail(
            "AnalyticsHubPanel import not found"
        );
    }

    const importLineEnd =
        source.indexOf(
            ";",
            importIndex
        );

    if (
        importLineEnd < 0
    ) {
        fail(
            "AnalyticsHubPanel import ending not found"
        );
    }

    source =
        source.slice(
            0,
            importLineEnd + 1
        ) +
        '\n\nimport SalesAnalyticsPanel\n    from "../components/SalesAnalyticsPanel.jsx";' +
        source.slice(
            importLineEnd + 1
        );

    console.log(
        "SalesAnalyticsPanel IMPORT ADDED"
    );
}
else {

    console.log(
        "SalesAnalyticsPanel IMPORT EXISTS"
    );

}

/*
 * Find the real sales section.
 */
const salesSectionIndex =
    source.search(
        /activeSection\s*===\s*"sales"/
    );

if (
    salesSectionIndex < 0
) {
    fail(
        "activeSection sales NOT FOUND"
    );
}

console.log(
    "SALES SECTION FOUND"
);

/*
 * Find the first AnalyticsHubPanel after
 * the sales section.
 */
const fallbackIndex =
    source.indexOf(
        "<AnalyticsHubPanel",
        salesSectionIndex
    );

if (
    fallbackIndex < 0
) {
    fail(
        "AnalyticsHubPanel after sales section NOT FOUND"
    );
}

console.log(
    "SALES FALLBACK FOUND"
);

/*
 * Prevent duplicate route.
 */
const existingRouteIndex =
    source.indexOf(
        'activeModule ===',
        salesSectionIndex
    );

const existingShiftRoute =
    source.indexOf(
        '"sales-shifts"',
        salesSectionIndex
    );

if (
    existingShiftRoute >= 0 &&
    existingShiftRoute < fallbackIndex
) {

    console.log(
        "SALES SHIFTS ROUTE ALREADY EXISTS"
    );

}
else {

    const route =
`
        if (
            activeModule ===
                "sales-shifts"
        ) {

            return (
                <SalesAnalyticsPanel

                    branchId={
                        selectedBranchId
                    }

                    connection={
                        selectedConnection
                    }

                    fromDate={
                        fromDate
                    }

                    toDate={
                        toDate
                    }

                    activeModule={
                        "sales-shifts"
                    }

                />
            );

        }


`;

    source =
        source.slice(
            0,
            fallbackIndex
        ) +
        route +
        source.slice(
            fallbackIndex
        );

    console.log(
        "SALES SHIFTS ROUTE INSERTED"
    );
}

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

const finalSource =
    fs.readFileSync(
        FILE,
        "utf8"
    );

if (
    !finalSource.includes(
        "SalesAnalyticsPanel"
    )
) {
    fail(
        "SalesAnalyticsPanel validation failed"
    );
}

if (
    !finalSource.includes(
        '"sales-shifts"'
    )
) {
    fail(
        "sales-shifts validation failed"
    );
}

console.log(
    "ROUTER VALIDATION OK"
);

console.log(
    "===== BUILD ====="
);

const result =
    spawnSync(
        "npm",
        [
            "run",
            "build:renderer"
        ],
        {
            cwd:
                ROOT,

            stdio:
                "inherit",

            shell:
                true
        }
    );

if (
    result.status !== 0
) {

    console.error(
        "BUILD FAILED"
    );

    process.exit(
        result.status || 1
    );
}

console.log(
    "SALES SHIFTS ROUTE FIX COMPLETE"
);
