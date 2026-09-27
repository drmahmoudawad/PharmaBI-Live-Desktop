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
    ".backup-before-hourly-daily-average-display-only";

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
 * Add a top-level day-count helper.
 * ============================================================
 */

if (
    !source.includes(
        "function getHourlyAverageDays"
    )
) {

    const marker =
        "function normalizeResponseRows";

    const index =
        source.indexOf(
            marker
        );

    ensure(
        index >= 0,
        "NORMALIZE FUNCTION NOT FOUND"
    );

    const helper = [
        "function getHourlyAverageDays(",
        "    fromDate,",
        "    toDate",
        ") {",
        "",
        "    const from =",
        "        new Date(",
        "            String(fromDate) +",
        '            "T00:00:00"',
        "        );",
        "",
        "    const to =",
        "        new Date(",
        "            String(toDate) +",
        '            "T00:00:00"',
        "        );",
        "",
        "    if (",
        "        Number.isNaN(from.getTime()) ||",
        "        Number.isNaN(to.getTime())",
        "    ) {",
        "",
        "        return 1;",
        "",
        "    }",
        "",
        "    return Math.max(",
        "        1,",
        "        Math.round(",
        "            (",
        "                to.getTime() -",
        "                from.getTime()",
        "            ) /",
        "            (",
        "                24 *",
        "                60 *",
        "                60 *",
        "                1000",
        "            )",
        "        ) +",
        "        1",
        "    );",
        "",
        "}",
        "",
        ""
    ].join("\n");

    source =
        source.slice(
            0,
            index
        ) +
        helper +
        source.slice(
            index
        );

    console.log(
        "DAILY AVERAGE DAY HELPER ADDED"
    );
}

/*
 * ============================================================
 * Find the REAL Day / Hour render block.
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
    dayHourMatches.length >= 2,
    "DAY/HOUR OCCURRENCES NOT FOUND"
);

const renderStart =
    dayHourMatches[
        dayHourMatches.length - 1
    ];

const returnMatches = [];
const returnRegex =
    /"sales-returns"/g;

while (
    (match =
        returnRegex.exec(
            source
        )) !== null
) {

    returnMatches.push(
        match.index
    );

}

ensure(
    returnMatches.length >= 2,
    "RETURNS OCCURRENCES NOT FOUND"
);

const renderEnd =
    returnMatches[
        returnMatches.length - 1
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

/*
 * ============================================================
 * Replace displayed hourly totals with daily averages.
 * ============================================================
 */

const dayExpression =
    "getHourlyAverageDays(fromDate, toDate)";

const replacements = [
    [
        /formatMoney\s*\(\s*row\.sales\s*\)/g,
        "formatMoney(toNumber(row.sales) / " +
            dayExpression +
            ")"
    ],
    [
        /formatMoney\s*\(\s*row\.returns\s*\)/g,
        "formatMoney(toNumber(row.returns) / " +
            dayExpression +
            ")"
    ],
    [
        /formatMoney\s*\(\s*row\.netSales\s*\)/g,
        "formatMoney(toNumber(row.netSales) / " +
            dayExpression +
            ")"
    ],
    [
        /formatMoney\s*\(\s*row\.cost\s*\)/g,
        "formatMoney(toNumber(row.cost) / " +
            dayExpression +
            ")"
    ],
    [
        /formatMoney\s*\(\s*row\.profit\s*\)/g,
        "formatMoney(toNumber(row.profit) / " +
            dayExpression +
            ")"
    ],
    [
        /formatNumber\s*\(\s*row\.tickets\s*\)/g,
        "(toNumber(row.tickets) / " +
            dayExpression +
            ").toLocaleString(" +
            '"ar-EG", ' +
            "{ minimumFractionDigits: 1, maximumFractionDigits: 1 }" +
            ")"
    ],
    [
        /formatNumber\s*\(\s*row\.units\s*\)/g,
        "(toNumber(row.units) / " +
            dayExpression +
            ").toLocaleString(" +
            '"ar-EG", ' +
            "{ minimumFractionDigits: 1, maximumFractionDigits: 1 }" +
            ")"
    ]
];

let changed =
    0;

for (
    const [
        pattern,
        replacement
    ] of replacements
) {

    const before =
        renderBlock;

    renderBlock =
        renderBlock.replace(
            pattern,
            replacement
        );

    if (
        before !==
        renderBlock
    ) {

        changed++;

    }

}

ensure(
    changed > 0,
    "NO HOURLY DISPLAY VALUES MATCHED"
);

/*
 * ============================================================
 * Change table labels to explicitly say DAILY.
 * ============================================================
 */

renderBlock =
    renderBlock.replace(
        /<th>\s*Sales\s*<\/th>/g,
        '<th>{"\\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>'
    );

renderBlock =
    renderBlock.replace(
        /<th>\s*Tickets\s*<\/th>/g,
        '<th>{"\\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631 \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>'
    );

/*
 * ============================================================
 * Put the corrected render block back.
 * ============================================================
 */

source =
    source.slice(
        0,
        renderStart
    ) +
    renderBlock +
    source.slice(
        renderEnd
    );

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

console.log(
    "HOURLY DISPLAY NOW USES DAILY AVERAGES"
);

/*
 * ============================================================
 * Verify.
 * ============================================================
 */

const finalSource =
    fs.readFileSync(
        FILE,
        "utf8"
    );

const verifyStart =
    finalSource.lastIndexOf(
        '"sales-day-hour"'
    );

const verifyEnd =
    finalSource.lastIndexOf(
        '"sales-returns"'
    );

ensure(
    verifyStart >= 0 &&
    verifyEnd > verifyStart,
    "FINAL DAY/HOUR BLOCK NOT FOUND"
);

const verifyBlock =
    finalSource.slice(
        verifyStart,
        verifyEnd
    );

ensure(
    verifyBlock.includes(
        "toNumber(row.sales) / getHourlyAverageDays(fromDate, toDate)"
    ),
    "DAILY SALES DISPLAY VALIDATION FAILED"
);

ensure(
    verifyBlock.includes(
        "toNumber(row.tickets) / getHourlyAverageDays(fromDate, toDate)"
    ),
    "DAILY TICKETS DISPLAY VALIDATION FAILED"
);

console.log(
    "DISPLAY VALIDATION OK"
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

    process.exit(
        build.status || 1
    );

}

console.log(
    "HOURLY DAILY AVERAGE DISPLAY FIX COMPLETE"
);
