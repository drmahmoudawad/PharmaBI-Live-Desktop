const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = "D:\\PharmaBI-Live-Desktop";

const panelFile = path.join(
    ROOT,
    "src",
    "components",
    "SalesAnalyticsPanel.jsx"
);

const panelCleanBackup =
    panelFile +
    ".backup-before-sales-shifts";

const panelSafetyBackup =
    panelFile +
    ".backup-before-dedicated-shifts-page";

const shiftsPage =
    path.join(
        ROOT,
        "src",
        "components",
        "SalesShiftsPage.jsx"
    );

const routerFile =
    path.join(
        ROOT,
        "src",
        "app",
        "BranchAnalyticsRouter.jsx"
    );

const routerBackup =
    routerFile +
    ".backup-before-dedicated-shifts-page";

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

/*
 * ============================================================
 * 1. RESTORE SALES ANALYTICS PANEL
 * ============================================================
 */

ensure(
    fs.existsSync(
        panelCleanBackup
    ),
    "CLEAN SALES ANALYTICS BACKUP NOT FOUND"
);

if (
    !fs.existsSync(
        panelSafetyBackup
    )
) {
    fs.copyFileSync(
        panelFile,
        panelSafetyBackup
    );
}

fs.copyFileSync(
    panelCleanBackup,
    panelFile
);

console.log(
    "SalesAnalyticsPanel RESTORED TO CLEAN VERSION"
);

/*
 * ============================================================
 * 2. CREATE DEDICATED SALES SHIFTS PAGE
 * ============================================================
 */

const page = `import React, {
    useEffect,
    useMemo,
    useState
} from "react";


const TEXT = {
    eyebrow:
        "\\u062a\\u062d\\u0644\\u064a\\u0644 \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a",

    title:
        "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a",

    description:
        "\\u0645\\u0642\\u0627\\u0631\\u0646\\u0629 \\u0623\\u062f\\u0627\\u0621 \\u0634\\u064a\\u0641\\u062a\\u0627\\u062a \\u0627\\u0644\\u0639\\u0645\\u0644 \\u062e\\u0644\\u0627\\u0644 \\u0627\\u0644\\u0641\\u062a\\u0631\\u0629 \\u0627\\u0644\\u0645\\u062d\\u062f\\u062f\\u0629.",

    morning:
        "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0635\\u0628\\u0627\\u062d\\u064a",

    evening:
        "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0645\\u0633\\u0627\\u0626\\u064a",

    night:
        "\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0646\\u0627\\u064a\\u062a",

    comparison:
        "\\u0645\\u0642\\u0627\\u0631\\u0646\\u0629 \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a",

    hours:
        "\\u0627\\u0644\\u0633\\u0627\\u0639\\u0627\\u062a",

    sales:
        "\\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a",

    returns:
        "\\u0627\\u0644\\u0645\\u0631\\u062a\\u062c\\u0639\\u0627\\u062a",

    netSales:
        "\\u0635\\u0627\\u0641\\u064a \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a",

    tickets:
        "\\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631",

    averageTicket:
        "\\u0645\\u062a\\u0648\\u0633\\u0637 \\u0627\\u0644\\u0641\\u0627\\u062a\\u0648\\u0631\\u0629",

    profit:
        "\\u0627\\u0644\\u0631\\u0628\\u062d",

    margin:
        "\\u0647\\u0627\\u0645\\u0634 \\u0627\\u0644\\u0631\\u0628\\u062d",

    share:
        "\\u0646\\u0633\\u0628\\u0629 \\u0627\\u0644\\u0645\\u0633\\u0627\\u0647\\u0645\\u0629",

    salesPerHour:
        "\\u0645\\u062a\\u0648\\u0633\\u0637 \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a \\u0644\\u0643\\u0644 \\u0633\\u0627\\u0639\\u0629",

    ticketsPerHour:
        "\\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631 \\u0644\\u0643\\u0644 \\u0633\\u0627\\u0639\\u0629",

    noBranch:
        "\\u0627\\u062e\\u062a\\u0631 \\u0641\\u0631\\u0639\\u064b\\u0627",

    loading:
        "\\u062c\\u0627\\u0631\\u064a \\u062a\\u062d\\u0644\\u064a\\u0644 \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a...",

    failed:
        "\\u062a\\u0639\\u0630\\u0631 \\u062a\\u062d\\u0645\\u064a\\u0644 \\u062a\\u062d\\u0644\\u064a\\u0644 \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a.",

    total:
        "\\u0627\\u0644\\u0625\\u062c\\u0645\\u0627\\u0644\\u064a",

    perHour:
        "\\u0644\\u0643\\u0644 \\u0633\\u0627\\u0639\\u0629"
};


const SHIFT_DEFINITIONS = [
    {
        id:
            "morning",

        name:
            TEXT.morning,

        fromHour:
            9,

        toHour:
            17,

        durationHours:
            8,

        hours: [
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16
        ]
    },

    {
        id:
            "evening",

        name:
            TEXT.evening,

        fromHour:
            17,

        toHour:
            2,

        durationHours:
            9,

        hours: [
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            0,
            1
        ]
    },

    {
        id:
            "night",

        name:
            TEXT.night,

        fromHour:
            2,

        toHour:
            9,

        durationHours:
            7,

        hours: [
            2,
            3,
            4,
            5,
            6,
            7,
            8
        ]
    }
];


function toNumber(
    value
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}


function formatMoney(
    value
) {

    return toNumber(
        value
    ).toLocaleString(
        "ar-EG",
        {
            maximumFractionDigits:
                0
        }
    );
}


function formatNumber(
    value
) {

    return toNumber(
        value
    ).toLocaleString(
        "ar-EG",
        {
            maximumFractionDigits:
                0
        }
    );
}


function formatPercent(
    value
) {

    return toNumber(
        value
    ).toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits:
                1,

            maximumFractionDigits:
                1
        }
    ) +
    "%";
}


function normalizeHours(
    result
) {

    if (
        Array.isArray(
            result?.hours
        )
    ) {

        return result.hours;

    }

    if (
        Array.isArray(
            result
        )
    ) {

        return result;

    }

    return [];

}


function formatHourRange(
    definition
) {

    const from =
        String(
            definition.fromHour
        ).padStart(
            2,
            "0"
        );

    const to =
        String(
            definition.toHour
        ).padStart(
            2,
            "0"
        );

    return (
        from +
        ":00 " +
        TEXT.arrow +
        " " +
        to +
        ":00"
    );
}


TEXT.arrow =
    "\\u2192";


export default function SalesShiftsPage({
    selectedBranchId,
    selectedConnection,
    fromDate,
    toDate
}) {

    const [
        loading,
        setLoading
    ] =
        useState(
            true
        );


    const [
        error,
        setError
    ] =
        useState(
            ""
        );


    const [
        hourData,
        setHourData
    ] =
        useState(
            []
        );


    useEffect(
        () => {

            let cancelled =
                false;


            async function load() {

                if (
                    selectedBranchId ===
                    "all" ||
                    selectedBranchId ===
                    undefined ||
                    selectedBranchId ===
                    null
                ) {

                    setHourData(
                        []
                    );

                    setLoading(
                        false
                    );

                    return;

                }


                try {

                    setLoading(
                        true
                    );

                    setError(
                        ""
                    );


                    const result =
                        await window
                            .pharmaBI
                            .sales
                            .byHour({
                                ...(selectedConnection || {}),

                                branchId:
                                    Number(
                                        selectedBranchId
                                    ),

                                fromDate,

                                toDate

                            });


                    if (
                        cancelled
                    ) {

                        return;

                    }


                    setHourData(
                        normalizeHours(
                            result
                        )
                    );

                }
                catch (
                    requestError
                ) {

                    if (
                        cancelled
                    ) {

                        return;

                    }


                    console.error(
                        "[SalesShiftsPage] load failed:",
                        requestError
                    );


                    setError(
                        requestError?.message ||
                        TEXT.failed
                    );

                }
                finally {

                    if (
                        !cancelled
                    ) {

                        setLoading(
                            false
                        );

                    }

                }

            }


            load();


            return () => {

                cancelled =
                    true;

            };

        },

        [
            selectedBranchId,
            selectedConnection,
            fromDate,
            toDate
        ]

    );


    const shiftRows =
        useMemo(
            () => {

                const byHour =
                    new Map(
                        hourData.map(
                            row => [
                                Number(
                                    row?.hour
                                ),
                                row
                            ]
                        )
                    );


                const totalNetSales =
                    SHIFT_DEFINITIONS.reduce(
                        (
                            total,
                            definition
                        ) => {

                            return total +
                                definition.hours.reduce(
                                    (
                                        subtotal,
                                        hour
                                    ) => {

                                        const row =
                                            byHour.get(
                                                hour
                                            );

                                        return subtotal +
                                            toNumber(
                                                row?.netSales
                                            );

                                    },
                                    0
                                );

                        },
                        0
                    );


                return SHIFT_DEFINITIONS.map(
                    definition => {

                        const row = {
                            ...definition,

                            sales:
                                0,

                            returns:
                                0,

                            netSales:
                                0,

                            cost:
                                0,

                            profit:
                                0,

                            units:
                                0,

                            tickets:
                                0

                        };


                        definition.hours.forEach(
                            hour => {

                                const hourly =
                                    byHour.get(
                                        hour
                                    );


                                row.sales +=
                                    toNumber(
                                        hourly?.sales
                                    );


                                row.returns +=
                                    toNumber(
                                        hourly?.returns
                                    );


                                row.netSales +=
                                    toNumber(
                                        hourly?.netSales
                                    );


                                row.cost +=
                                    toNumber(
                                        hourly?.cost
                                    );


                                row.profit +=
                                    toNumber(
                                        hourly?.profit
                                    );


                                row.units +=
                                    toNumber(
                                        hourly?.units
                                    );


                                row.tickets +=
                                    toNumber(
                                        hourly?.tickets
                                    );

                            }
                        );


                        row.averageTicket =
                            row.tickets > 0
                                ? row.netSales /
                                    row.tickets
                                : 0;


                        row.margin =
                            row.netSales !== 0
                                ? (
                                    row.profit /
                                    row.netSales
                                ) *
                                100
                                : 0;


                        row.share =
                            totalNetSales !== 0
                                ? (
                                    row.netSales /
                                    totalNetSales
                                ) *
                                100
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


                        return row;

                    }
                );

            },

            [
                hourData
            ]
        );


    if (
        selectedBranchId ===
        "all"
    ) {

        return (

            <section
                className="page-card empty-state"
            >

                <h2>
                    {TEXT.noBranch}
                </h2>

            </section>

        );

    }


    if (
        loading
    ) {

        return (

            <section
                className="page-card loading-card"
            >

                <div
                    className="loading-spinner"
                />

                <h2>
                    {TEXT.loading}
                </h2>

            </section>

        );

    }


    if (
        error
    ) {

        return (

            <section
                className="page-card"
            >

                <div
                    className="status error"
                >
                    {error}
                </div>

            </section>

        );

    }


    return (

        <section
            className="page-card"
        >

            <div
                className="page-header"
            >

                <div>

                    <div
                        className="page-eyebrow"
                    >
                        {TEXT.eyebrow}
                    </div>


                    <h2>
                        {TEXT.title}
                    </h2>


                    <p>
                        {TEXT.description}
                    </p>

                </div>


                <div
                    className="period-chip"
                >

                    {fromDate}

                    <span>
                        {" "}
                        {TEXT.arrow}
                        {" "}
                    </span>

                    {toDate}

                </div>

            </div>


            <div
                className="kpi-grid"
            >

                {
                    shiftRows.map(
                        row => (

                            <div
                                className="kpi-card"
                                key={
                                    row.id
                                }
                            >

                                <span>
                                    {row.name}
                                </span>


                                <strong>
                                    {
                                        formatMoney(
                                            row.netSales
                                        )
                                    }
                                </strong>


                                <div
                                    style={{
                                        display:
                                            "grid",

                                        gap:
                                            "5px",

                                        marginTop:
                                            "10px",

                                        fontSize:
                                            "12px"
                                    }}
                                >

                                    <span>
                                        {TEXT.tickets}
                                        {": "}
                                        {
                                            formatNumber(
                                                row.tickets
                                            )
                                        }
                                    </span>


                                    <span>
                                        {TEXT.averageTicket}
                                        {": "}
                                        {
                                            formatMoney(
                                                row.averageTicket
                                            )
                                        }
                                    </span>


                                    <span>
                                        {TEXT.margin}
                                        {": "}
                                        {
                                            formatPercent(
                                                row.margin
                                            )
                                        }
                                    </span>


                                    <span>
                                        {TEXT.salesPerHour}
                                        {": "}
                                        {
                                            formatMoney(
                                                row.salesPerHour
                                            )
                                        }
                                    </span>

                                </div>

                            </div>

                        )
                    )
                }

            </div>


            <div
                className="table-card"
                style={{
                    marginTop:
                        "18px"
                }}
            >

                <div
                    className="table-card-header"
                >

                    <div>

                        <strong>
                            {TEXT.comparison}
                        </strong>

                    </div>

                </div>


                <div
                    className="table-wrap"
                >

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    {TEXT.title}
                                </th>

                                <th>
                                    {TEXT.hours}
                                </th>

                                <th>
                                    {TEXT.sales}
                                </th>

                                <th>
                                    {TEXT.returns}
                                </th>

                                <th>
                                    {TEXT.netSales}
                                </th>

                                <th>
                                    {TEXT.tickets}
                                </th>

                                <th>
                                    {TEXT.averageTicket}
                                </th>

                                <th>
                                    {TEXT.profit}
                                </th>

                                <th>
                                    {TEXT.margin}
                                </th>

                                <th>
                                    {TEXT.salesPerHour}
                                </th>

                                <th>
                                    {TEXT.ticketsPerHour}
                                </th>

                                <th>
                                    {TEXT.share}
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                shiftRows.map(
                                    row => (

                                        <tr
                                            key={
                                                row.id
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        row.name
                                                    }
                                                </strong>
                                            </td>


                                            <td>
                                                {
                                                    formatHourRange(
                                                        row
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.sales
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.returns
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.netSales
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatNumber(
                                                        row.tickets
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.averageTicket
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.profit
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatPercent(
                                                        row.margin
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.salesPerHour
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    row.ticketsPerHour
                                                        .toLocaleString(
                                                            "ar-EG",
                                                            {
                                                                minimumFractionDigits:
                                                                    1,

                                                                maximumFractionDigits:
                                                                    1
                                                            }
                                                        )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatPercent(
                                                        row.share
                                                    )
                                                }
                                            </td>

                                        </tr>

                                    )
                                )
                            }

                        </tbody>

                    </table>

                </div>

            </div>


            <div
                className="table-card"
                style={{
                    marginTop:
                        "18px"
                }}
            >

                <div
                    className="table-card-header"
                >

                    <div>

                        <strong>
                            {TEXT.perHour}
                        </strong>

                        <span>
                            {
                                TEXT.description
                            }
                        </span>

                    </div>

                </div>


                <div
                    className="table-wrap"
                >

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    {TEXT.title}
                                </th>

                                <th>
                                    {TEXT.salesPerHour}
                                </th>

                                <th>
                                    {TEXT.ticketsPerHour}
                                </th>

                                <th>
                                    {TEXT.profit}
                                </th>

                                <th>
                                    {TEXT.share}
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                shiftRows.map(
                                    row => (

                                        <tr
                                            key={
                                                row.id +
                                                "-per-hour"
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        row.name
                                                    }
                                                </strong>
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.salesPerHour
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    row.ticketsPerHour
                                                        .toLocaleString(
                                                            "ar-EG",
                                                            {
                                                                minimumFractionDigits:
                                                                    1,

                                                                maximumFractionDigits:
                                                                    1
                                                            }
                                                        )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatMoney(
                                                        row.profitPerHour
                                                    )
                                                }
                                            </td>


                                            <td>
                                                {
                                                    formatPercent(
                                                        row.share
                                                    )
                                                }
                                            </td>

                                        </tr>

                                    )
                                )
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>

    );

}
`;

fs.writeFileSync(
    shiftsPage,
    page,
    "utf8"
);

console.log(
    "SalesShiftsPage.jsx CREATED"
);

/*
 * ============================================================
 * 3. PATCH ROUTER
 * ============================================================
 */

let router =
    fs.readFileSync(
        routerFile,
        "utf8"
    );

if (
    !fs.existsSync(
        routerBackup
    )
) {
    fs.copyFileSync(
        routerFile,
        routerBackup
    );
}

/*
 * Remove the old SalesAnalyticsPanel import.
 */
router =
    router.replace(
        /import\s+SalesAnalyticsPanel\s*\n\s*from\s+["']\.\.\/components\/SalesAnalyticsPanel\.jsx["'];\s*/g,
        ""
    );

/*
 * Add the dedicated page import.
 */
if (
    !router.includes(
        "SalesShiftsPage"
    )
) {

    const hubImport =
        /import\s+AnalyticsHubPanel\s*\n\s*from\s+["']\.\.\/components\/AnalyticsHubPanel\.jsx["'];/;

    const match =
        router.match(
            hubImport
        );

    ensure(
        match,
        "AnalyticsHubPanel IMPORT NOT FOUND"
    );

    router =
        router.replace(
            hubImport,
            match[0] +
            '\n\nimport SalesShiftsPage\n    from "../components/SalesShiftsPage.jsx";'
        );

}

/*
 * Replace the old shift route.
 */
const oldRoute =
    /\s*if\s*\(\s*activeModule\s*===\s*"sales-shifts"\s*\)\s*\{\s*return\s*\(\s*<SalesAnalyticsPanel[\s\S]*?\/>\s*\);\s*\}\s*/m;

const newRoute =
`
        if (
            activeModule ===
                "sales-shifts"
        ) {

            return (
                <SalesShiftsPage

                    selectedBranchId={
                        selectedBranchId
                    }

                    selectedConnection={
                        selectedConnection
                    }

                    fromDate={
                        fromDate
                    }

                    toDate={
                        toDate
                    }

                />
            );

        }

`;

if (
    oldRoute.test(
        router
    )
) {

    router =
        router.replace(
            oldRoute,
            newRoute
        );

    console.log(
        "OLD SHIFT ROUTE REPLACED"
    );

}
else if (
    router.includes(
        "SalesShiftsPage"
    )
) {

    console.log(
        "DEDICATED SHIFT ROUTE ALREADY PRESENT"
    );

}
else {

    throw new Error(
        "OLD SALES SHIFTS ROUTE NOT FOUND"
    );

}

fs.writeFileSync(
    routerFile,
    router,
    "utf8"
);

console.log(
    "ROUTER UPDATED"
);

/*
 * ============================================================
 * 4. VALIDATION
 * ============================================================
 */

ensure(
    fs.existsSync(
        shiftsPage
    ),
    "SHIFT PAGE FILE NOT FOUND"
);

const finalRouter =
    fs.readFileSync(
        routerFile,
        "utf8"
    );

ensure(
    finalRouter.includes(
        "SalesShiftsPage"
    ),
    "SHIFT PAGE IMPORT/ROUTE VALIDATION FAILED"
);

ensure(
    !finalRouter.includes(
        "SalesAnalyticsPanel"
    ),
    "OLD SALES ANALYTICS PANEL STILL CONNECTED"
);

console.log(
    "SOURCE VALIDATION OK"
);

/*
 * ============================================================
 * 5. BUILD
 * ============================================================
 */

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

    process.exit(
        result.status || 1
    );

}

console.log(
    "DEDICATED SALES SHIFTS PAGE COMPLETE"
);
