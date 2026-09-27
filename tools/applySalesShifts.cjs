const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = "D:\\PharmaBI-Live-Desktop";
const NAV_FILE = path.join(ROOT, "src", "app", "navigation.js");
const PANEL_FILE = path.join(
    ROOT,
    "src",
    "components",
    "SalesAnalyticsPanel.jsx"
);

const NAV_BACKUP = NAV_FILE + ".backup-before-sales-shifts";
const PANEL_BACKUP =
    PANEL_FILE + ".backup-before-sales-shifts";

function read(file) {
    return fs.readFileSync(file, "utf8");
}

function write(file, content) {
    fs.writeFileSync(file, content, "utf8");
}

function backup(file, backupFile) {
    if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(file, backupFile);
    }
}

function ensure(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

console.log("==============================================");
console.log(" APPLY SALES SHIFTS");
console.log("==============================================");

const navOriginal = read(NAV_FILE);
const panelOriginal = read(PANEL_FILE);

backup(NAV_FILE, NAV_BACKUP);
backup(PANEL_FILE, PANEL_BACKUP);

let nav = navOriginal;
let panel = panelOriginal;

/*
 * ============================================================
 * 1. NAVIGATION
 * ============================================================
 */

if (!nav.includes('"sales-shifts"')) {
    const navigationPattern =
        /(\{\s*id:\s*"sales-day-hour"[\s\S]*?\},\s*\r?\n)(\s*\{\s*id:\s*"sales-sellers")/;

    const navigationReplacement =
        '$1' +
        '            { id: "sales-shifts", label: "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a", sectionId: "sales" },\n' +
        '$2';

    const updatedNav =
        nav.replace(
            navigationPattern,
            navigationReplacement
        );

    ensure(
        updatedNav !== nav,
        "SALES NAVIGATION INSERTION POINT NOT FOUND"
    );

    nav = updatedNav;

    console.log(
        "SALES SHIFTS MENU ITEM INSERTED"
    );
}
else {
    console.log(
        "SALES SHIFTS MENU ITEM ALREADY EXISTS"
    );
}

/*
 * ============================================================
 * 2. SHIFT DEFINITIONS + AGGREGATION
 * ============================================================
 */

if (!panel.includes("SHIFT_DEFINITIONS")) {
    const helperBlock = `
const SHIFT_DEFINITIONS = [
    {
        id: "morning",
        name: "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0635\\u0628\\u0627\\u062d\\u064a",
        fromHour: 9,
        toHour: 17,
        hours: [
            9, 10, 11, 12, 13, 14, 15, 16
        ]
    },
    {
        id: "evening",
        name: "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0645\\u0633\\u0627\\u0626\\u064a",
        fromHour: 17,
        toHour: 2,
        hours: [
            17, 18, 19, 20, 21, 22, 23, 0, 1
        ]
    },
    {
        id: "night",
        name: "\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0646\\u0627\\u064a\\u062a",
        fromHour: 2,
        toHour: 9,
        hours: [
            2, 3, 4, 5, 6, 7, 8
        ]
    }
];


function buildShiftRows(
    hours
) {

    const source =
        Array.isArray(hours)
            ? hours
            : [];


    const byHour =
        new Map(
            source.map(
                row => [
                    Number(row?.hour),
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
                            shiftTotal,
                            hour
                        ) => {

                            const row =
                                byHour.get(
                                    hour
                                );

                            return shiftTotal +
                                (
                                    Number.isFinite(
                                        Number(
                                            row?.netSales
                                        )
                                    )
                                        ? Number(
                                            row.netSales
                                        )
                                        : 0
                                );

                        },
                        0
                    );

            },
            0
        );


    return SHIFT_DEFINITIONS.map(
        definition => {

            const result = {
                id:
                    definition.id,

                name:
                    definition.name,

                fromHour:
                    definition.fromHour,

                toHour:
                    definition.toHour,

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


            for (
                const hour
                of definition.hours
            ) {

                const row =
                    byHour.get(
                        hour
                    );


                if (!row) {
                    continue;
                }


                result.sales +=
                    Number.isFinite(
                        Number(
                            row.sales
                        )
                    )
                        ? Number(
                            row.sales
                        )
                        : 0;


                result.returns +=
                    Number.isFinite(
                        Number(
                            row.returns
                        )
                    )
                        ? Number(
                            row.returns
                        )
                        : 0;


                result.netSales +=
                    Number.isFinite(
                        Number(
                            row.netSales
                        )
                    )
                        ? Number(
                            row.netSales
                        )
                        : 0;


                result.cost +=
                    Number.isFinite(
                        Number(
                            row.cost
                        )
                    )
                        ? Number(
                            row.cost
                        )
                        : 0;


                result.profit +=
                    Number.isFinite(
                        Number(
                            row.profit
                        )
                    )
                        ? Number(
                            row.profit
                        )
                        : 0;


                result.units +=
                    Number.isFinite(
                        Number(
                            row.units
                        )
                    )
                        ? Number(
                            row.units
                        )
                        : 0;


                result.tickets +=
                    Number.isFinite(
                        Number(
                            row.tickets
                        )
                    )
                        ? Number(
                            row.tickets
                        )
                        : 0;

            }


            result.averageTicket =
                result.tickets > 0
                    ? result.netSales /
                        result.tickets
                    : 0;


            result.margin =
                result.netSales !== 0
                    ? (
                        result.profit /
                        result.netSales
                    ) * 100
                    : 0;


            result.share =
                totalNetSales !== 0
                    ? (
                        result.netSales /
                        totalNetSales
                    ) * 100
                    : 0;


            return result;

        }
    );

}


`;

    const helperPattern =
        /function getModuleTitle\s*\(\s*activeModule\s*\)/;

    ensure(
        helperPattern.test(panel),
        "GET MODULE TITLE FUNCTION NOT FOUND"
    );

    panel =
        panel.replace(
            helperPattern,
            helperBlock +
            "\nfunction getModuleTitle(\n    activeModule\n)"
        );

    console.log(
        "SHIFT DEFINITIONS INSERTED"
    );
}

/*
 * ============================================================
 * 3. TITLE
 * ============================================================
 */

if (
    !panel.includes(
        'case "sales-shifts"'
    )
) {

    const titlePattern =
        /(case\s+"sales-day-hour"\s*:\s*[\s\S]*?return\s+[^;]+;\s*)/;

    const titleReplacement =
        '$1' +
        '\n        case "sales-shifts":\n' +
        '            return "\\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a";\n';

    const updatedPanel =
        panel.replace(
            titlePattern,
            titleReplacement
        );

    ensure(
        updatedPanel !== panel,
        "SALES SHIFTS TITLE INSERTION POINT NOT FOUND"
    );

    panel = updatedPanel;

    console.log(
        "SALES SHIFTS TITLE INSERTED"
    );
}

/*
 * ============================================================
 * 4. SHIFTS LOAD
 * Reuse the already-tested byHour loader.
 * ============================================================
 */

if (
    !panel.includes(
        'activeModule ===\n                            "sales-shifts"'
    ) &&
    !panel.includes(
        'activeModule ===\n                        "sales-shifts"'
    )
) {

    const loaderPattern =
        /(else\s+if\s*\(\s*activeModule\s*===\s*"sales-day-hour"\s*\)\s*\{\s*await\s+loadDayHour\(\);\s*\})/;

    const loaderReplacement =
        '$1' +
        '\n' +
        '                      else if (\n' +
        '                          activeModule ===\n' +
        '                          "sales-shifts"\n' +
        '                      ) {\n' +
        '\n' +
        '                          await loadDayHour();\n' +
        '\n' +
        '                      }\n';

    const updatedPanel =
        panel.replace(
            loaderPattern,
            loaderReplacement
        );

    ensure(
        updatedPanel !== panel,
        "SALES SHIFTS LOAD INSERTION POINT NOT FOUND"
    );

    panel = updatedPanel;

    console.log(
        "SALES SHIFTS LOAD ROUTE INSERTED"
    );
}

/*
 * ============================================================
 * 5. DERIVED SHIFT DATA
 * ============================================================
 */

if (
    !panel.includes(
        "const shiftRows = useMemo"
    )
) {

    const activeModulePattern =
        /(const\s+activeModule\s*=\s*requestedModule\s*\|\|\s*"sales-overview"\s*;\s*)/;

    const activeModuleReplacement =
        '$1' +
        '\n' +
        '    const shiftRows = useMemo(\n' +
        '        () => buildShiftRows(hourData),\n' +
        '        [hourData]\n' +
        '    );\n';

    const updatedPanel =
        panel.replace(
            activeModulePattern,
            activeModuleReplacement
        );

    ensure(
        updatedPanel !== panel,
        "ACTIVE MODULE INSERTION POINT NOT FOUND"
    );

    panel = updatedPanel;

    console.log(
        "SHIFT DATA DERIVATION INSERTED"
    );
}

/*
 * ============================================================
 * 6. SHIFT PAGE
 * ============================================================
 */

if (
    !panel.includes(
        'activeModule ===\n         "sales-shifts"'
    ) &&
    !panel.includes(
        'activeModule ===\n        "sales-shifts"'
    )
) {

    const shiftUi = `
      if (
          activeModule ===
          "sales-shifts"
      ) {

          const totalNetSales =
              shiftRows.reduce(
                  (
                      total,
                      row
                  ) =>
                      total +
                      Number(
                          row.netSales
                      ),
                  0
              );


          return (

              <section className="page-card">

                  <div className="page-header">

                      <div>

                          <div className="page-eyebrow">
                              \\u062a\\u062d\\u0644\\u064a\\u0644 \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a
                          </div>


                          <h2>
                              \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a
                          </h2>


                          <p>
                              \\u0645\\u0642\\u0627\\u0631\\u0646\\u0629 \\u0623\\u062f\\u0627\\u0621 \\u0634\\u064a\\u0641\\u062a\\u0627\\u062a \\u0627\\u0644\\u0639\\u0645\\u0644 \\u062e\\u0644\\u0627\\u0644 \\u0627\\u0644\\u0641\\u062a\\u0631\\u0629 \\u0627\\u0644\\u0645\\u062d\\u062f\\u062f\\u0629.
                          </p>

                      </div>


                      <div className="period-chip">

                          {fromDate}

                          <span>
                              \\u2192
                          </span>

                          {toDate}

                      </div>

                  </div>


                  <div className="kpi-grid">

                      {
                          shiftRows.map(
                              row => (

                                  <div
                                      key={row.id}
                                      className="kpi-card"
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
                                                  "4px",

                                              marginTop:
                                                  "10px",

                                              fontSize:
                                                  "12px"
                                          }}
                                      >

                                          <span>
                                              \\u0639\\u062f\\u062f \\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631:{" "}
                                              {
                                                  formatNumber(
                                                      row.tickets
                                                  )
                                              }
                                          </span>


                                          <span>
                                              \\u0645\\u062a\\u0648\\u0633\\u0637 \\u0627\\u0644\\u0641\\u0627\\u062a\\u0648\\u0631\\u0629:{" "}
                                              {
                                                  formatMoney(
                                                      row.averageTicket
                                                  )
                                              }
                                          </span>


                                          <span>
                                              \\u0647\\u0627\\u0645\\u0634 \\u0627\\u0644\\u0631\\u0628\\u062d:{" "}
                                              {
                                                  formatPercent(
                                                      row.margin
                                                  )
                                              }
                                          </span>


                                          <span>
                                              \\u0646\\u0633\\u0628\\u0629 \\u0645\\u0646 \\u0625\\u062c\\u0645\\u0627\\u0644\\u064a \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a:{" "}
                                              {
                                                  formatPercent(
                                                      row.share
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
                                  \\u0645\\u0642\\u0627\\u0631\\u0646\\u0629 \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a\\u0627\\u062a
                              </strong>

                              <span>
                                  \\u0646\\u0641\\u0633 \\u0627\\u0644\\u0645\\u0646\\u0637\\u0642 \\u0627\\u0644\\u0645\\u0633\\u062a\\u062e\\u062f\\u0645 \\u0641\\u064a \\u062a\\u062d\\u0644\\u064a\\u0644 \\u0627\\u0644\\u0633\\u0627\\u0639\\u0627\\u062a.
                              </span>

                          </div>

                      </div>


                      <div className="table-wrap">

                          <table>

                              <thead>

                                  <tr>

                                      <th>
                                          \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a
                                      </th>

                                      <th>
                                          \\u0627\\u0644\\u0633\\u0627\\u0639\\u0627\\u062a
                                      </th>

                                      <th>
                                          \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a
                                      </th>

                                      <th>
                                          \\u0627\\u0644\\u0645\\u0631\\u062a\\u062c\\u0639\\u0627\\u062a
                                      </th>

                                      <th>
                                          \\u0635\\u0627\\u0641\\u064a \\u0627\\u0644\\u0645\\u0628\\u064a\\u0639\\u0627\\u062a
                                      </th>

                                      <th>
                                          \\u0627\\u0644\\u0641\\u0648\\u0627\\u062a\\u064a\\u0631
                                      </th>

                                      <th>
                                          \\u0645\\u062a\\u0648\\u0633\\u0637 \\u0627\\u0644\\u0641\\u0627\\u062a\\u0648\\u0631\\u0629
                                      </th>

                                      <th>
                                          \\u0627\\u0644\\u0631\\u0628\\u062d
                                      </th>

                                      <th>
                                          \\u0646\\u0633\\u0628\\u0629 \\u0627\\u0644\\u0645\\u0633\\u0627\\u0647\\u0645\\u0629
                                      </th>

                                  </tr>

                              </thead>


                              <tbody>

                                  {
                                      shiftRows.map(
                                          row => (

                                              <tr
                                                  key={row.id}
                                              >

                                                  <td>
                                                      <strong>
                                                          {row.name}
                                                      </strong>
                                                  </td>


                                                  <td>
                                                      {
                                                          String(
                                                              row.fromHour
                                                          ).padStart(
                                                              2,
                                                              "0"
                                                          )
                                                      }
                                                      :00
                                                      {" "}
                                                      \\u0625\\u0644\\u0649
                                                      {" "}
                                                      {
                                                          String(
                                                              row.toHour
                                                          ).padStart(
                                                              2,
                                                              "0"
                                                          )
                                                      }
                                                      :00
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
                      style={{
                          marginTop:
                              "12px",

                          color:
                              "#64748b",

                          fontSize:
                              "12px"
                      }}
                  >

                      \\u0627\\u0644\\u0634\\u064a\\u0641\\u062a \\u0627\\u0644\\u0645\\u0633\\u0627\\u0626\\u064a \\u064a\\u0645\\u062a\\u062f \\u0645\\u0646 5 \\u0645 \\u064f\\u0633\\u0627\\u0621\\u064b \\u062d\\u062a\\u0649 2 \\u0635 \\u0628\\u0645\\u0627 \\u0641\\u064a \\u0630\\u0644\\u0643 \\u0633\\u0627\\u0639\\u062a 12 \\u0635 \\u0648 1 \\u0635.

                  </div>

              </section>

          );

      }


`;

    const renderMarker =
        /\/\*\s*={5,}\s*\n\s*\* SALES[\\s\\S]*?\n\s*\*\s*={5,}\s*\n\s*\*\/\s*\n\s*\n\s*if\s*\(\s*activeModule\s*===\s*"sales-returns"\s*\)/;

    if (renderMarker.test(panel)) {

        panel =
            panel.replace(
                renderMarker,
                shiftUi +
                '\n      /*\n' +
                '       * =========================================================\n' +
                '       * SALES RETURNS\n' +
                '       * =========================================================\n' +
                '       */\n' +
                '\n      if (\n          activeModule ===\n          "sales-returns"\n      )'
            );

    }
    else {

        const simpleMarker =
            /(\s*if\s*\(\s*activeModule\s*===\s*"sales-returns"\s*\))/;

        const updatedPanel =
            panel.replace(
                simpleMarker,
                shiftUi +
                "\n" +
                "$1"
            );

        ensure(
            updatedPanel !== panel,
            "SALES SHIFTS PAGE INSERTION POINT NOT FOUND"
        );

        panel = updatedPanel;

    }

    console.log(
        "SALES SHIFTS PAGE INSERTED"
    );
}

/*
 * ============================================================
 * WRITE
 * ============================================================
 */

write(
    NAV_FILE,
    nav
);

write(
    PANEL_FILE,
    panel
);

console.log(
    "FILES UPDATED"
);

console.log(
    "BACKUP:",
    NAV_BACKUP
);

console.log(
    "BACKUP:",
    PANEL_BACKUP
);

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

const finalNav =
    read(
        NAV_FILE
    );

const finalPanel =
    read(
        PANEL_FILE
    );

ensure(
    finalNav.includes(
        '"sales-shifts"'
    ),
    "NAVIGATION VALIDATION FAILED"
);

ensure(
    finalPanel.includes(
        "SHIFT_DEFINITIONS"
    ),
    "SHIFT DEFINITIONS VALIDATION FAILED"
);

ensure(
    finalPanel.includes(
        '"sales-shifts"'
    ),
    "SALES SHIFTS MODULE VALIDATION FAILED"
);

ensure(
    finalPanel.includes(
        "buildShiftRows"
    ),
    "SHIFT AGGREGATOR VALIDATION FAILED"
);

console.log(
    "SOURCE VALIDATION OK"
);

/*
 * ============================================================
 * BUILD
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
    "SALES SHIFTS PATCH COMPLETE"
);