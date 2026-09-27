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
    ".backup-before-hourly-daily-average-real";

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
    !fs.existsSync(
        BACKUP
    )
) {
    fs.copyFileSync(
        FILE,
        BACKUP
    );
}

/*
 * ============================================================
 * 1. Replace the actual hourData state assignment
 * ============================================================
 */

const oldPattern =
    /setHourData\s*\(\s*normalizeResponseRows\(\s*hourResult\s*\)\s*\)\s*;/m;

ensure(
    oldPattern.test(
        source
    ),
    "ACTUAL HOURLY SETTER NOT FOUND"
);

const newSetter =
    [
        "setHourData(",
        "                normalizeResponseRows(",
        "                    hourResult",
        "                ).map(",
        "                    row => {",
        "",
        "                        const from =",
        "                            new Date(",
        "                                String(",
        "                                    fromDate",
        "                                ) +",
        '                                "T00:00:00"',
        "                            );",
        "",
        "                        const to =",
        "                            new Date(",
        "                                String(",
        "                                    toDate",
        "                                ) +",
        '                                "T00:00:00"',
        "                            );",
        "",
        "                        const days =",
        "                            Math.max(",
        "                                1,",
        "                                Math.round(",
        "                                    (",
        "                                        to.getTime() -",
        "                                        from.getTime()",
        "                                    ) /",
        "                                    (",
        "                                        24 *",
        "                                        60 *",
        "                                        60 *",
        "                                        1000",
        "                                    )",
        "                                ) +",
        "                                1",
        "                            );",
        "",
        "                        return {",
        "                            ...row,",
        "",
        "                            sales:",
        "                                toNumber(",
        "                                    row?.sales",
        "                                ) / days,",
        "",
        "                            returns:",
        "                                toNumber(",
        "                                    row?.returns",
        "                                ) / days,",
        "",
        "                            netSales:",
        "                                toNumber(",
        "                                    row?.netSales",
        "                                ) / days,",
        "",
        "                            cost:",
        "                                toNumber(",
        "                                    row?.cost",
        "                                ) / days,",
        "",
        "                            profit:",
        "                                toNumber(",
        "                                    row?.profit",
        "                                ) / days,",
        "",
        "                            units:",
        "                                toNumber(",
        "                                    row?.units",
        "                                ) / days,",
        "",
        "                            tickets:",
        "                                toNumber(",
        "                                    row?.tickets",
        "                                ) / days",
        "                        };",
        "",
        "                    }",
        "                )",
        "            );"
    ].join("\n");

source =
    source.replace(
        oldPattern,
        newSetter
    );

console.log(
    "HOURLY SOURCE DATA CONVERTED TO DAILY AVERAGE"
);

/*
 * ============================================================
 * 2. Add decimal ticket formatter
 * ============================================================
 */

if (
    !source.includes(
        "function formatDailyTicketCount"
    )
) {

    const marker =
        "function formatPercent(";

    const index =
        source.indexOf(
            marker
        );

    ensure(
        index >= 0,
        "FORMAT PERCENT MARKER NOT FOUND"
    );

    const formatter =
        [
            "function formatDailyTicketCount(",
            "    value",
            ") {",
            "",
            "    return toNumber(",
            "        value",
            "    ).toLocaleString(",
            '        "ar-EG",',
            "        {",
            "            minimumFractionDigits:",
            "                1,",
            "",
            "            maximumFractionDigits:",
            "                1",
            "        }",
            "    );",
            "}",
            "",
            ""
        ].join("\n");

    source =
        source.slice(
            0,
            index
        ) +
        formatter +
        source.slice(
            index
        );

    console.log(
        "DAILY TICKET FORMATTER ADDED"
    );
}

/*
 * ============================================================
 * 3. Change ticket display inside the actual
 *    Day / Hour render section only.
 * ============================================================
 */

const dayHourMatches = [];

const dayHourRegex =
    /"sales-day-hour"/g;

let match;

while (
    (match =
        dayHourRegex.exec(
            source
        )) !== null
) {
    dayHourMatches.push(
        match.index
    );
}

ensure(
    dayHourMatches.length >= 3,
    "DAY/HOUR RENDER BLOCK NOT FOUND"
);

const renderStart =
    dayHourMatches[
        dayHourMatches.length - 1
    ];

const returnsMatches = [];

const returnsRegex =
    /"sales-returns"/g;

while (
    (match =
        returnsRegex.exec(
            source
        )) !== null
) {
    returnsMatches.push(
        match.index
    );
}

ensure(
    returnsMatches.length >= 3,
    "SALES RETURNS RENDER BLOCK NOT FOUND"
);

const renderEnd =
    returnsMatches[
        returnsMatches.length - 1
    ];

ensure(
    renderEnd > renderStart,
    "DAY/HOUR RENDER RANGE INVALID"
);

let renderBlock =
    source.slice(
        renderStart,
        renderEnd
    );

renderBlock =
    renderBlock.replace(
        /formatNumber\s*\(\s*row\.tickets\s*\)/g,
        "formatDailyTicketCount(row.tickets)"
    );

renderBlock =
    renderBlock.replace(
        /formatNumber\s*\(\s*row\.units\s*\)/g,
        "formatDailyTicketCount(row.units)"
    );

source =
    source.slice(
        0,
        renderStart
    ) +
    renderBlock +
    source.slice(
        renderEnd
    );

console.log(
    "DAY/HOUR TICKET DISPLAY UPDATED"
);

/*
 * ============================================================
 * 4. Save and build
 * ============================================================
 */

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

console.log(
    "SOURCE SAVED"
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
