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
    ".backup-before-hourly-daily-average-tickets-final";

function fail(message) {
    throw new Error(message);
}

let source =
    fs.readFileSync(
        FILE,
        "utf8"
    );

if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(
        FILE,
        BACKUP
    );
}

/*
 * Find actual Day / Hour render block.
 */
const dayHourPositions = [];
const dayHourRegex =
    /"sales-day-hour"/g;

let match;

while (
    (match = dayHourRegex.exec(source)) !== null
) {
    dayHourPositions.push(
        match.index
    );
}

if (
    dayHourPositions.length < 2
) {
    fail(
        "DAY/HOUR OCCURRENCES NOT FOUND"
    );
}

const renderStart =
    dayHourPositions[
        dayHourPositions.length - 1
    ];

const returnsPositions = [];
const returnsRegex =
    /"sales-returns"/g;

while (
    (match = returnsRegex.exec(source)) !== null
) {
    returnsPositions.push(
        match.index
    );
}

if (
    returnsPositions.length < 2
) {
    fail(
        "SALES RETURNS OCCURRENCES NOT FOUND"
    );
}

const renderEnd =
    returnsPositions[
        returnsPositions.length - 1
    ];

if (
    renderEnd <= renderStart
) {
    fail(
        "INVALID DAY/HOUR RENDER RANGE"
    );
}

let block =
    source.slice(
        renderStart,
        renderEnd
    );

/*
 * Make sure daily day helper exists.
 */
if (
    !source.includes(
        "function getHourlyAverageDays"
    )
) {
    fail(
        "DAILY AVERAGE HELPER NOT FOUND"
    );
}

/*
 * Replace every ticket-value expression inside this
 * actual Day / Hour render block.
 */
const ticketPatterns = [
    /formatNumber\s*\(\s*row\.tickets\s*\)/g,
    /formatNumber\s*\(\s*row\?\.tickets\s*\)/g,
    /\{\s*row\.tickets\s*\}/g,
    /\{\s*row\?\.tickets\s*\}/g,
    /String\s*\(\s*row\.tickets\s*\)/g
];

let ticketChanges = 0;

for (
    const pattern of ticketPatterns
) {

    const before =
        block;

    block =
        block.replace(
            pattern,
            "(\n" +
            "    toNumber(row.tickets) /\n" +
            "    getHourlyAverageDays(fromDate, toDate)\n" +
            ").toLocaleString(\n" +
            '    "ar-EG",\n' +
            "    {\n" +
            "        minimumFractionDigits: 1,\n" +
            "        maximumFractionDigits: 1\n" +
            "    }\n" +
            ")"
        );

    if (
        before !== block
    ) {
        ticketChanges++;
    }
}

/*
 * If ticket cell uses a generic formatter with another
 * expression, replace the first row.tickets occurrence
 * inside a table cell.
 */
if (
    ticketChanges === 0
) {

    const genericTicketCell =
        /(<td[^>]*>\s*)([\s\S]{0,600}?row\.tickets[\s\S]{0,600}?)(<\/td>)/m;

    const genericMatch =
        block.match(
            genericTicketCell
        );

    if (
        genericMatch
    ) {

        const replacement =
            genericMatch[1] +
            "\n" +
            "    {\n" +
            "        (\n" +
            "            toNumber(row.tickets) /\n" +
            "            getHourlyAverageDays(fromDate, toDate)\n" +
            "        ).toLocaleString(\n" +
            '            "ar-EG",\n' +
            "            {\n" +
            "                minimumFractionDigits: 1,\n" +
            "                maximumFractionDigits: 1\n" +
            "            }\n" +
            "        )\n" +
            "    }\n" +
            genericMatch[3];

        block =
            block.replace(
                genericTicketCell,
                replacement
            );

        ticketChanges = 1;

    }

}

if (
    ticketChanges === 0
) {
    console.log(
        "NO TICKET CELL MATCH FOUND"
    );

    console.log(
        "===== ACTUAL DAY/HOUR BLOCK ====="
    );

    console.log(
        block.slice(
            Math.max(
                0,
                block.length - 12000
            )
        )
    );

    process.exit(2);
}

/*
 * Update sales header to indicate daily average.
 */
block =
    block.replace(
        /<th>\s*Sales\s*<\/th>/g,
        '<th>{"\\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>'
    );

/*
 * Update tickets header to indicate daily average.
 */
block =
    block.replace(
        /<th>\s*Tickets\s*<\/th>/g,
        '<th>{"\\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631 \\u0627\\u0644\\u064a\\u0648\\u0645\\u064a\\u0629"}</th>'
    );

/*
 * Put block back.
 */
source =
    source.slice(
        0,
        renderStart
    ) +
    block +
    source.slice(
        renderEnd
    );

fs.writeFileSync(
    FILE,
    source,
    "utf8"
);

console.log(
    "DAILY TICKET DISPLAY FIXED"
);

/*
 * Verify the actual render block.
 */
const finalSource =
    fs.readFileSync(
        FILE,
        "utf8"
    );

const verifyDayHour =
    finalSource.lastIndexOf(
        '"sales-day-hour"'
    );

const verifyReturns =
    finalSource.lastIndexOf(
        '"sales-returns"'
    );

const verifyBlock =
    finalSource.slice(
        verifyDayHour,
        verifyReturns
    );

if (
    !verifyBlock.includes(
        "getHourlyAverageDays(fromDate, toDate)"
    )
) {
    fail(
        "DAILY AVERAGE DISPLAY VALIDATION FAILED"
    );
}

if (
    !verifyBlock.includes(
        "row.tickets"
    )
) {
    fail(
        "TICKET DISPLAY VALIDATION FAILED"
    );
}

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
    "HOURLY DAILY TICKET FIX COMPLETE"
);
