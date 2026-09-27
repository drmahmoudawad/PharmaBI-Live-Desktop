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

const CLEAN_BACKUP =
    FILE +
    ".backup-before-hourly-daily-average";

const RECOVERY_BACKUP =
    FILE +
    ".backup-before-hourly-daily-average-recovery";

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

ensure(
    fs.existsSync(
        CLEAN_BACKUP
    ),
    "CLEAN HOURLY BACKUP NOT FOUND"
);

/*
 * Keep the current file safe.
 */
if (
    !fs.existsSync(
        RECOVERY_BACKUP
    )
) {
    fs.copyFileSync(
        FILE,
        RECOVERY_BACKUP
    );
}

/*
 * Restore the clean pre-hourly-average version.
 */
fs.copyFileSync(
    CLEAN_BACKUP,
    FILE
);

let source =
    fs.readFileSync(
        FILE,
        "utf8"
    );

console.log(
    "CLEAN SALES ANALYTICS VERSION RESTORED"
);

/*
 * ============================================================
 * 1. DAILY PERIOD DAYS
 * ============================================================
 */

const activeModuleMarker =
    /const\s+activeModule\s*=\s*requestedModule\s*\|\|\s*"sales-overview"\s*;/;

ensure(
    activeModuleMarker.test(
        source
    ),
    "ACTIVE MODULE DECLARATION NOT FOUND"
);

const dailyDaysCode =
`
    const salesPeriodDays =
        useMemo(
            () => {

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

            },
            [
                fromDate,
                toDate
            ]
        );


`;

source =
    source.replace(
        activeModuleMarker,
        match =>
            match +
            "\n" +
            dailyDaysCode
    );

console.log(
    "DAILY PERIOD CALCULATION ADDED"
);

/*
 * ============================================================
 * 2. DAILY FORMATTERS
 * ============================================================
 */

const formatMoneyMarker =
`function formatNumber(`;

const formatMoneyIndex =
    source.indexOf(
        formatMoneyMarker
    );

ensure(
    formatMoneyIndex >= 0,
    "FORMAT NUMBER FUNCTION NOT FOUND"
);

const dailyFormatters =
`function formatDailyMoney(
    value,
    days
) {

    return toNumber(
        value
    )
    /
    Math.max(
        1,
        toNumber(
            days
        )
    );
}


function formatDailyTickets(
    value,
    days
) {

    return (
        toNumber(
            value
        ) /
        Math.max(
            1,
            toNumber(
                days
            )
        )
    ).toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits:
                1,

            maximumFractionDigits:
                1
        }
    );
}


`;

source =
    source.slice(
        0,
        formatMoneyIndex
    ) +
    dailyFormatters +
    source.slice(
        formatMoneyIndex
    );

console.log(
    "DAILY FORMATTERS ADDED"
);

/*
 * ============================================================
 * 3. FIND DAY / HOUR SECTION
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

const returnsStart =
    source.search(
        /activeModule\s*===\s*"sales-returns"/
    );

ensure(
    returnsStart > dayHourStart,
    "SALES RETURNS SECTION NOT FOUND"
);

let dayHourSection =
    source.slice(
        dayHourStart,
        returnsStart
    );

/*
 * ============================================================
 * 4. DAILY AVERAGE VALUES
 * ============================================================
 */

const replacements = [
    [
        /formatMoney\(\s*row\.sales\s*\)/g,
        "formatMoney(formatDailyMoney(row.sales, salesPeriodDays))"
    ],
    [
        /formatMoney\(\s*row\.returns\s*\)/g,
        "formatMoney(formatDailyMoney(row.returns, salesPeriodDays))"
    ],
    [
        /formatMoney\(\s*row\.netSales\s*\)/g,
        "formatMoney(formatDailyMoney(row.netSales, salesPeriodDays))"
    ],
    [
        /formatMoney\(\s*row\.cost\s*\)/g,
        "formatMoney(formatDailyMoney(row.cost, salesPeriodDays))"
    ],
    [
        /formatMoney\(\s*row\.profit\s*\)/g,
        "formatMoney(formatDailyMoney(row.profit, salesPeriodDays))"
    ],
    [
        /formatNumber\(\s*row\.tickets\s*\)/g,
        "formatDailyTickets(row.tickets, salesPeriodDays)"
    ],
    [
        /formatNumber\(\s*row\.units\s*\)/g,
        "formatDailyTickets(row.units, salesPeriodDays)"
    ]
];

let changedCount = 0;

for (
    const [
        pattern,
        replacement
    ]
    of replacements
) {

    const before =
        dayHourSection;

    dayHourSection =
        dayHourSection.replace(
            pattern,
            replacement
        );

    if (
        dayHourSection !==
        before
    ) {

        changedCount++;

    }

}

ensure(
    changedCount > 0,
    "NO HOURLY VALUE EXPRESSIONS WERE CHANGED"
);

/*
 * ============================================================
 * 5. DAILY HEADERS
 * ============================================================
 */

dayHourSection =
    dayHourSection.replace(
        /<th>\s*Sales\s*<\/th>/g,
        `<th>{"\\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>`
    );

dayHourSection =
    dayHourSection.replace(
        /<th>\s*Tickets\s*<\/th>/g,
        `<th>{"\\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631 \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>`
    );

/*
 * ============================================================
 * 6. ADD EXPLANATION ABOVE HOURLY TABLE
 * ============================================================
 */

const hourlyHeaderPattern =
    /(<strong>\s*[^<]*\s*<\/strong>\s*)(<\/div>\s*<\/div>\s*<div className="table-wrap">)/;

if (
    hourlyHeaderPattern.test(
        dayHourSection
    )
) {

    dayHourSection =
        dayHourSection.replace(
            hourlyHeaderPattern,
            `$1
<span style={{
    display: "block",
    marginTop: "6px",
    fontSize: "12px",
    color: "#64748b"
}}>
    {"\\\\u0645\\\\u062a\\\\u0648\\\\u0633\\\\u0637 \\\\8a\\\\u0648\\\\u0645\\\\u064a \\\\84\\\\u0644\\\\u0643\\\\u0644 \\\\8c\\\\u0639\\\\u0627\\\\u0639\\\\u0629 \\\\8c\\\\u0648\\\\u0641\\\\u0627\\\\u062a\\\\u064a\\\\u0631 \\\\8c\\\\u0648\\\\u0645\\\\u064a\\\\u0629"}
</span>
$2`
        );

}

/*
 * ============================================================
 * 7. WRITE SECTION BACK
 * ============================================================
 */

source =
    source.slice(
        0,
        dayHourStart
    ) +
    dayHourSection +
    source.slice(
        returnsStart
    );

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

console.log(
    "HOURLY TABLE CONVERTED TO DAILY AVERAGES"
);

/*
 * ============================================================
 * 8. VALIDATION
 * ============================================================
 */

const finalSource =
    fs.readFileSync(
        FILE,
        "utf8"
    );

ensure(
    finalSource.includes(
        "salesPeriodDays"
    ),
    "DAILY DAYS VALIDATION FAILED"
);

const finalDayHourStart =
    finalSource.search(
        /activeModule\s*===\s*"sales-day-hour"/
    );

const finalReturnsStart =
    finalSource.search(
        /activeModule\s*===\s*"sales-returns"/
    );

const finalDayHour =
    finalSource.slice(
        finalDayHourStart,
        finalReturnsStart
    );

ensure(
    finalDayHour.includes(
        "formatDailyMoney(row.sales, salesPeriodDays)"
    ),
    "HOURLY SALES DAILY VALIDATION FAILED"
);

ensure(
    finalDayHour.includes(
        "formatDailyTickets(row.tickets, salesPeriodDays)"
    ),
    "HOURLY TICKETS DAILY VALIDATION FAILED"
);

console.log(
    "SOURCE VALIDATION OK"
);

/*
 * ============================================================
 * 9. BUILD
 * ============================================================
 */

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
                ROOT,

            stdio:
                "inherit",

            shell:
                true
        }
    );

if (
    build.status !== 0
) {

    console.error(
        "BUILD FAILED"
    );

    process.exit(
        build.status || 1
    );

}

console.log(
    "HOURLY DAILY AVERAGE FIX COMPLETE"
);
