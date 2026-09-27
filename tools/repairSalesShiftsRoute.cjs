const fs = require("fs");

const file =
    "D:\\PharmaBI-Live-Desktop\\src\\app\\BranchAnalyticsRouter.jsx";

const backup =
    file +
    ".backup-before-sales-shifts-route-working";

let source =
    fs.readFileSync(
        file,
        "utf8"
    );

if (!fs.existsSync(backup)) {
    fs.copyFileSync(
        file,
        backup
    );
}

/*
 * Remove the incorrectly inserted route.
 */
const badRouteRegex =
    /\s*if\s*\(\s*activeModule\s*===\s*"sales-shifts"\s*\)\s*\{\s*return\s*\(\s*<SalesAnalyticsPanel[\s\S]*?<\/SalesAnalyticsPanel>\s*\);\s*\}\s*/m;

if (
    badRouteRegex.test(
        source
    )
) {

    source =
        source.replace(
            badRouteRegex,
            "\n"
        );

    console.log(
        "BAD SALES SHIFTS ROUTE REMOVED"
    );

}
else {

    console.log(
        "BAD SALES SHIFTS ROUTE NOT FOUND"
    );

}

/*
 * Find the real sales section.
 */
const salesStart =
    source.search(
        /activeSection\s*===\s*"sales"/
    );

if (
    salesStart < 0
) {

    throw new Error(
        "SALES SECTION NOT FOUND"
    );

}

/*
 * Find the first fallback return inside sales.
 */
const tail =
    source.slice(
        salesStart
    );

const fallbackMatch =
    tail.match(
        /\n\s*return\s*\(\s*<AnalyticsHubPanel/
    );

if (
    !fallbackMatch
) {

    throw new Error(
        "SALES FALLBACK RETURN NOT FOUND"
    );

}

const insertAt =
    salesStart +
    fallbackMatch.index;

if (
    source.includes(
        '"sales-shifts"',
        salesStart
    )
) {

    console.log(
        "SALES SHIFTS ROUTE ALREADY EXISTS"
    );

}
else {

    const route = [
        "",
        "        if (",
        "            activeModule ===",
        '                "sales-shifts"',
        "        ) {",
        "",
        "            return (",
        "",
        "                <SalesAnalyticsPanel",
        "",
        "                    selectedBranchId={",
        "                        selectedBranchId",
        "                    }",
        "",
        "                    selectedConnection={",
        "                        selectedConnection",
        "                    }",
        "",
        "                    fromDate={",
        "                        fromDate",
        "                    }",
        "",
        "                    toDate={",
        "                        toDate",
        "                    }",
        "",
        "                    activeModule={",
        '                        "sales-shifts"',
        "                    }",
        "",
        "                />",
        "",
        "            );",
        "",
        "        }",
        ""
    ].join("\n");

    source =
        source.slice(
            0,
            insertAt
        ) +
        route +
        source.slice(
            insertAt
        );

    console.log(
        "SALES SHIFTS ROUTE INSERTED CORRECTLY"
    );

}

fs.writeFileSync(
    file,
    source,
    "utf8"
);

/*
 * Validation.
 */
const finalSource =
    fs.readFileSync(
        file,
        "utf8"
    );

const finalSalesStart =
    finalSource.search(
        /activeSection\s*===\s*"sales"/
    );

const finalShiftIndex =
    finalSource.indexOf(
        '"sales-shifts"',
        finalSalesStart
    );

const finalPanelIndex =
    finalSource.indexOf(
        "<SalesAnalyticsPanel",
        finalSalesStart
    );

const finalHubIndex =
    finalSource.indexOf(
        "<AnalyticsHubPanel",
        finalSalesStart
    );

console.log(
    "ROUTE POSITIONS:",
    {
        shiftIndex:
            finalShiftIndex,

        panelIndex:
            finalPanelIndex,

        hubIndex:
            finalHubIndex
    }
);

if (
    finalShiftIndex < 0 ||
    finalPanelIndex < 0 ||
    finalHubIndex < 0 ||
    finalPanelIndex > finalHubIndex
) {

    throw new Error(
        "ROUTE POSITION VALIDATION FAILED"
    );

}

console.log(
    "ROUTE VALIDATION OK"
);
