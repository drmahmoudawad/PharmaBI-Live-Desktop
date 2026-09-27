const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "AnalyticsHubPanel.jsx"
);

const backup =
    file + ".backup-before-sales-hour-daily-average";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const moduleStartMatch = text.match(
    /moduleId\s*===\s*["']sales-day-hour["']/
);

if (!moduleStartMatch) {
    throw new Error(
        "sales-day-hour module block not found"
    );
}

const moduleStart =
    moduleStartMatch.index;

const moduleEnd =
    text.indexOf(
        "} else if (",
        moduleStart
    );

if (moduleEnd === -1) {
    throw new Error(
        "sales-day-hour module end not found"
    );
}

let block =
    text.slice(
        moduleStart,
        moduleEnd
    );

const hoursRowsMatch =
    block.match(
        /rows\s*=\s*\{\s*data\.hours/
    );

if (!hoursRowsMatch) {
    throw new Error(
        "data.hours table not found"
    );
}

const hourTableStart =
    block.lastIndexOf(
        "<Table",
        hoursRowsMatch.index
    );

if (hourTableStart === -1) {
    throw new Error(
        "hour table start not found"
    );
}

let hourTable =
    block.slice(
        hourTableStart
    );

const salesRegex =
    /(key\s*:\s*["']sales["'][\s\S]*?render\s*:\s*row\s*=>\s*money\s*\(\s*)row\.sales(\s*\))/;

if (!salesRegex.test(hourTable)) {
    throw new Error(
        "hour sales renderer not found"
    );
}

hourTable =
    hourTable.replace(
        salesRegex,
        `$1n(row.sales) / dayCount(fromDate, toDate)$2`
    );

const ticketsRegex =
    /(key\s*:\s*["']tickets["'][\s\S]*?label\s*:\s*[\s\S]*?)(\})/;

if (!ticketsRegex.test(hourTable)) {
    throw new Error(
        "hour tickets column not found"
    );
}

hourTable =
    hourTable.replace(
        ticketsRegex,
        `$1,
                            render:
                                row =>
                                    (
                                        n(row.tickets) /
                                        dayCount(
                                            fromDate,
                                            toDate
                                        )
                                    ).toLocaleString(
                                        undefined,
                                        {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1
                                        }
                                    )
                        }`
    );

block =
    block.slice(0, hourTableStart) +
    hourTable;

text =
    text.slice(0, moduleStart) +
    block +
    text.slice(moduleEnd);

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "SALES HOUR DAILY AVERAGE FIX APPLIED"
);

console.log(
    "Backup:",
    backup
);
