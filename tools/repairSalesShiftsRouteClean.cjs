const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root =
    "D:\\PharmaBI-Live-Desktop";

const file =
    path.join(
        root,
        "src",
        "app",
        "BranchAnalyticsRouter.jsx"
    );

const cleanBackup =
    file +
    ".backup-before-sales-shifts-route-v3";

const safetyBackup =
    file +
    ".backup-before-sales-shifts-route-repair";

function fail(message) {
    throw new Error(message);
}

if (
    !fs.existsSync(
        cleanBackup
    )
) {
    fail(
        "CLEAN BACKUP NOT FOUND: " +
        cleanBackup
    );
}

fs.copyFileSync(
    file,
    safetyBackup
);

let source =
    fs.readFileSync(
        cleanBackup,
        "utf8"
    );

console.log(
    "CLEAN ROUTER BACKUP RESTORED"
);

/*
 * Add the import.
 */
if (
    !source.includes(
        "SalesAnalyticsPanel"
    )
) {

    const importNeedle =
        'import AnalyticsHubPanel\n    from "../components/AnalyticsHubPanel.jsx";';

    if (
        !source.includes(
            importNeedle
        )
    ) {
        fail(
            "AnalyticsHubPanel IMPORT BLOCK NOT FOUND"
        );
    }

    source =
        source.replace(
            importNeedle,
            importNeedle +
            '\n\nimport SalesAnalyticsPanel\n    from "../components/SalesAnalyticsPanel.jsx";'
        );

    console.log(
        "SalesAnalyticsPanel IMPORT ADDED"
    );

}

/*
 * Insert before the actual fallback return.
 */
const exactFallback =
    '        return (\n\n' +
    '            <AnalyticsHubPanel';

if (
    !source.includes(
        exactFallback
    )
) {
    fail(
        "REAL SALES FALLBACK BLOCK NOT FOUND"
    );
}

const route =
    '        if (\n' +
    '            activeModule ===\n' +
    '                "sales-shifts"\n' +
    '        ) {\n\n' +
    '            return (\n\n' +
    '                <SalesAnalyticsPanel\n\n' +
    '                    branchId={\n' +
    '                        selectedBranchId\n' +
    '                    }\n\n' +
    '                    connection={\n' +
    '                        selectedConnection\n' +
    '                    }\n\n' +
    '                    fromDate={\n' +
    '                        fromDate\n' +
    '                    }\n\n' +
    '                    toDate={\n' +
    '                        toDate\n' +
    '                    }\n\n' +
    '                    activeModule={\n' +
    '                        "sales-shifts"\n' +
    '                    }\n\n' +
    '                />\n\n' +
    '            );\n\n' +
    '        }\n\n\n';

source =
    source.replace(
        exactFallback,
        route +
        exactFallback
    );

fs.writeFileSync(
    file,
    source,
    "utf8"
);

console.log(
    "SALES SHIFTS ROUTE INSERTED"
);

/*
 * Validation.
 */
const finalSource =
    fs.readFileSync(
        file,
        "utf8"
    );

if (
    !finalSource.includes(
        'activeModule ===\n                "sales-shifts"'
    )
) {
    fail(
        "SHIFT ROUTE VALIDATION FAILED"
    );
}

const shiftPos =
    finalSource.indexOf(
        '"sales-shifts"'
    );

const panelPos =
    finalSource.indexOf(
        "<SalesAnalyticsPanel"
    );

const hubPos =
    finalSource.indexOf(
        "<AnalyticsHubPanel"
    );

console.log({
    shiftPos,
    panelPos,
    hubPos
});

if (
    panelPos < 0 ||
    hubPos < 0 ||
    panelPos > hubPos
) {
    fail(
        "ROUTE POSITION VALIDATION FAILED"
    );
}

console.log(
    "ROUTE VALIDATION OK"
);

console.log(
    "===== BUILD ====="
);

const build =
    spawnSync(
        "npm",
        [
            "run",
            "build:renderer"
        ],
        {
            cwd:
                root,

            stdio:
                "inherit",

            shell:
                true
        }
    );

if (
    build.status !== 0
) {
    process.exit(
        build.status || 1
    );
}

console.log(
    "SALES SHIFTS ROUTE REPAIR COMPLETE"
);
