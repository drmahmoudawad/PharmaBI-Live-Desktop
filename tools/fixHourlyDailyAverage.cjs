const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT =
    "D:\\PharmaBI-Live-Desktop";

const FILE =
    path.join(
        ROOT,
        "src",
        "components",
        "SalesAnalyticsPanel.jsx"
    );

const BACKUP =
    FILE +
    ".backup-before-hourly-daily-average";

function ensure(
    condition,
    message
) {
    if (!condition) {
        throw new Error(
            message
        );
    }
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

/*
 * ============================================================
 * 1. DAILY DAYS HELPER
 * ============================================================
 */

if (
    !source.includes(
        "function getSalesPeriodDays"
    )
) {

    const marker =
        "function normalizeResponseRows";

    const markerIndex =
        source.indexOf(
            marker
        );

    ensure(
        markerIndex >= 0,
        "NORMALIZE RESPONSE ROWS FUNCTION NOT FOUND"
    );

    const helper =
`
function getSalesPeriodDays(
    fromDate,
    toDate
) {

    const from =
        new Date(
            String(
                fromDate
            ) +
            "T00:00:00"
        );

    const to =
        new Date(
            String(
                toDate
            ) +
            "T00:00:00"
        );

    if (
        Number.isNaN(
            from.getTime()
        ) ||
        Number.isNaN(
            to.getTime()
        )
    ) {

        return 1;

    }

    return Math.max(
        1,
        Math.round(
            (
                to.getTime() -
                from.getTime()
            ) /
            (
                24 *
                60 *
                60 *
                1000
            )
        ) + 1
    );
}


`;

    source =
        source.slice(
            0,
            markerIndex
        ) +
        helper +
        source.slice(
            markerIndex
        );

    console.log(
        "DAILY PERIOD HELPER ADDED"
    );

}
else {

    console.log(
        "DAILY PERIOD HELPER ALREADY EXISTS"
    );

}

/*
 * ============================================================
 * 2. ADD PERIOD DAYS AFTER HOUR STATE
 * ============================================================
 */

if (
    !source.includes(
        "const salesPeriodDays ="
    )
) {

    const stateRegex =
        /const\s*\[\s*hourData\s*,\s*setHourData\s*\]\s*=\s*useState\(\s*\[\s*\]\s*\);/m;

    const match =
        source.match(
            stateRegex
        );

    ensure(
        match,
        "HOUR DATA STATE NOT FOUND"
    );

    const addition =
`
    

    const salesPeriodDays =
        getSalesPeriodDays(
            fromDate,
            toDate
        );


`;

    source =
        source.replace(
            match[0],
            match[0] +
            addition
        );

    console.log(
        "SALES PERIOD DAYS ADDED"
    );

}

/*
 * ============================================================
 * 3. DAILY HOURLY DISPLAY DATA
 * ============================================================
 */

if (
    !source.includes(
        "const dailyHourData ="
    )
) {

    const marker =
        "const salesPeriodDays =";

    const markerIndex =
        source.indexOf(
            marker
        );

    ensure(
        markerIndex >= 0,
        "SALES PERIOD DAYS MARKER NOT FOUND"
    );

    const endMarker =
        source.indexOf(
            ";",
            markerIndex
        );

    ensure(
        endMarker >= 0,
        "SALES PERIOD DAYS END NOT FOUND"
    );

    const addition =
`

    const dailyHourData =
        useMemo(
            () =>
                (
                    Array.isArray(
                        hourData
                    )
                        ? hourData
                        : []
                ).map(
                    row => ({
                        ...row,

                        sales:
                            Number(
                                row?.sales
                            ) /
                            salesPeriodDays,

                        returns:
                            Number(
                                row?.returns
                            ) /
                            salesPeriodDays,

                        netSales:
                            Number(
                                row?.netSales
                            ) /
                            salesPeriodDays,

                        cost:
                            Number(
                                row?.cost
                            ) /
                            salesPeriodDays,

                        profit:
                            Number(
                                row?.profit
                            ) /
                            salesPeriodDays,

                        units:
                            Number(
                                row?.units
                            ) /
                            salesPeriodDays,

                        tickets:
                            Number(
                                row?.tickets
                            ) /
                            salesPeriodDays
                    })
                ),
            [
                hourData,
                salesPeriodDays
            ]
        );


`;

    source =
        source.slice(
            0,
            endMarker + 1
        ) +
        addition +
        source.slice(
            endMarker + 1
        );

    console.log(
        "DAILY HOURLY DISPLAY DATA ADDED"
    );

}

/*
 * ============================================================
 * 4. USE DAILY DATA ONLY IN DAY / HOUR TABLE
 * ============================================================
 */

const dayHourStart =
    source.search(
        /activeModule\s*===\s*"sales-day-hour"/
    );

ensure(
    dayHourStart >= 0,
    "SALES DAY HOUR SECTION NOT FOUND"
);

const beforeSection =
    source.slice(
        0,
        dayHourStart
    );

const section =
    source.slice(
        dayHourStart
    );

if (
    section.includes(
        "hourData.map("
    )
) {

    const updatedSection =
        section.replace(
            "hourData.map(",
            "dailyHourData.map("
        );

    source =
        beforeSection +
        updatedSection;

    console.log(
        "DAY / HOUR TABLE SWITCHED TO DAILY AVERAGE DATA"
    );

}
else if (
    section.includes(
        "dailyHourData.map("
    )
) {

    console.log(
        "DAY / HOUR TABLE ALREADY USES DAILY DATA"
    );

}
else {

    throw new Error(
        "HOURLY TABLE MAP NOT FOUND"
    );

}

/*
 * ============================================================
 * 5. BUILD
 * ============================================================
 */

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

console.log(
    "SOURCE UPDATED"
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
    "HOURLY DAILY AVERAGE FIX COMPLETE"
);
