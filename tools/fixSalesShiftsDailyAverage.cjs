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
        "SalesShiftsPage.jsx"
    );

const BACKUP =
    FILE +
    ".backup-before-daily-average";

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
 * 1. Add daily-days helper
 * ============================================================
 */

if (
    !source.includes(
        "function getDaysInclusive"
    )
) {

    const marker =
`function normalizeHours(
    result
) {`;

    ensure(
        source.includes(
            marker
        ),
        "NORMALIZE HOURS MARKER NOT FOUND"
    );

    const helper =
`function getDaysInclusive(
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
        source.replace(
            marker,
            helper +
            marker
        );

    console.log(
        "DAILY DAYS HELPER ADDED"
    );

}

/*
 * ============================================================
 * 2. Add periodDays inside component
 * ============================================================
 */

if (
    !source.includes(
        "const periodDays = getDaysInclusive"
    )
) {

    const marker =
`    const [
        hourData,
        setHourData
    ] =
        useState(
            []
        );


`;

    ensure(
        source.includes(
            marker
        ),
        "HOUR DATA STATE BLOCK NOT FOUND"
    );

    const addition =
`    const periodDays =
        getDaysInclusive(
            fromDate,
            toDate
        );


`;

    source =
        source.replace(
            marker,
            marker +
            addition
        );

    console.log(
        "PERIOD DAYS ADDED"
    );

}

/*
 * ============================================================
 * 3. Convert shift totals to daily averages
 * ============================================================
 */

if (
    !source.includes(
        "row.salesDaily"
    )
) {

    const marker =
`                        row.profitPerHour =
                            row.profit /
                            row.durationHours;


                        return row;`;

    ensure(
        source.includes(
            marker
        ),
        "SHIFT CALCULATION MARKER NOT FOUND"
    );

    const replacement =
`                        row.profitPerHour =
                            row.profit /
                            row.durationHours;


                        /*
                         * Keep share based on the period total,
                         * then expose operational values as DAILY
                         * averages for the selected date range.
                         */

                        row.salesDaily =
                            row.sales /
                            periodDays;

                        row.returnsDaily =
                            row.returns /
                            periodDays;

                        row.netSalesDaily =
                            row.netSales /
                            periodDays;

                        row.costDaily =
                            row.cost /
                            periodDays;

                        row.profitDaily =
                            row.profit /
                            periodDays;

                        row.unitsDaily =
                            row.units /
                            periodDays;

                        row.ticketsDaily =
                            row.tickets /
                            periodDays;


                        row.sales =
                            row.salesDaily;

                        row.returns =
                            row.returnsDaily;

                        row.netSales =
                            row.netSalesDaily;

                        row.cost =
                            row.costDaily;

                        row.profit =
                            row.profitDaily;

                        row.units =
                            row.unitsDaily;

                        row.tickets =
                            row.ticketsDaily;


                        row.averageTicket =
                            row.tickets > 0
                                ? row.netSales /
                                    row.tickets
                                : 0;


                        row.salesPerHour =
                            row.netSales /
                            row.durationHours;

                        row.ticketsPerHour =
                            row.tickets /
                            row.durationHours;

                        row.profitPerHour =
                            row.profit /
                            row.durationHours;


                        return row;`;

    source =
        source.replace(
            marker,
            replacement
        );

    console.log(
        "SHIFT VALUES CONVERTED TO DAILY AVERAGES"
    );

}

/*
 * ============================================================
 * 4. Ensure daily label is visible
 * ============================================================
 */

source =
    source.replace(
        "مقارنة أداء شيفتات العمل خلال الفترة المحددة.",
        "مقارنة متوسط الأداء اليومي لشيفتات العمل خلال الفترة المحددة."
    );

source =
    source.replace(
        "مقارنة أداء شيفتات العمل خلال الفترة المحددة.",
        "مقارنة متوسط الأداء اليومي لشيفتات العمل خلال الفترة المحددة."
    );

/*
 * Use Unicode escapes for a safe Arabic UI label.
 */
if (
    !source.includes(
        "\\u0645\\u062a\\u0648\\u0633\\u0637 \\u064a\\u0648\\u0645\\u064a"
    )
) {

    const kpiMarker =
`<div
                                    className="kpi-card"
                                    key={
                                        row.id
                                    }
                                >`;

    if (
        source.includes(
            kpiMarker
        )
    ) {

        const replacement =
`<div
                                    className="kpi-card"
                                    key={
                                        row.id
                                    }
                                >`;

        source =
            source.replace(
                kpiMarker,
                replacement
            );

    }

}

/*
 * ============================================================
 * 5. Build
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
    "SALES SHIFTS DAILY AVERAGE FIX COMPLETE"
);
