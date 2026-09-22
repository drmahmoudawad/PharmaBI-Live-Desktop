const fs = require("fs");

const INPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-catalog-all.csv";

const SUMMARY =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-catalog-analysis.json";

const EXACT_NAME_OUTPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-exact-name-matches.csv";

const BARCODE_OUTPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-barcode-matches.csv";


function parseCsvLine(line) {

    const result = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {

        const char = line[i];

        if (quoted) {

            if (char === '"') {

                if (line[i + 1] === '"') {
                    value += '"';
                    i += 1;
                }
                else {
                    quoted = false;
                }

            }
            else {
                value += char;
            }

            continue;
        }

        if (char === '"') {
            quoted = true;
            continue;
        }

        if (char === ",") {
            result.push(value);
            value = "";
            continue;
        }

        value += char;
    }

    result.push(value);

    return result;
}


function csvEscape(value) {

    const text =
        String(value ?? "");

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {
        return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
}


function addToMap(
    map,
    key,
    value
) {

    if (!key) {
        return;
    }

    let set = map.get(key);

    if (!set) {
        set = new Set();
        map.set(key, set);
    }

    set.add(value);
}


if (!fs.existsSync(INPUT)) {
    throw new Error(`Input file not found: ${INPUT}`);
}


const raw =
    fs.readFileSync(
        INPUT,
        "utf8"
    )
    .replace(/^\uFEFF/, "");


const lines =
    raw.split(/\r?\n/);


if (lines.length < 2) {
    throw new Error("CSV is empty.");
}


const headers =
    parseCsvLine(
        lines[0]
    );


const index = {};

for (let i = 0; i < headers.length; i += 1) {
    index[headers[i]] = i;
}


const rows = [];

const branchNames =
    new Map();

const nameBranches =
    new Map();

const nameIds =
    new Map();

const nameOriginals =
    new Map();

const barcodeBranches =
    new Map();

const barcodeIds =
    new Map();


for (
    let lineIndex = 1;
    lineIndex < lines.length;
    lineIndex += 1
) {

    const line =
        lines[lineIndex];

    if (!line.trim()) {
        continue;
    }

    const cells =
        parseCsvLine(line);


    const row = {

        branch_id:
            cells[index.branch_id] ?? "",

        branch_name:
            cells[index.branch_name] ?? "",

        branch_item_id:
            cells[index.branch_item_id] ?? "",

        branch_item_code:
            cells[index.branch_item_code] ?? "",

        branch_item_name:
            cells[index.branch_item_name] ?? "",

        normalized_name:
            cells[index.normalized_name] ?? "",

        barcode:
            cells[index.barcode] ?? "",

        parts:
            cells[index.parts] ?? "",

        is_zero_item:
            cells[index.is_zero_item] ?? ""

    };


    rows.push(row);


    branchNames.set(
        row.branch_id,
        row.branch_name
    );


    addToMap(
        nameBranches,
        row.normalized_name,
        row.branch_id
    );


    addToMap(
        nameIds,
        row.normalized_name,
        `${row.branch_id}:${row.branch_item_id}`
    );


    addToMap(
        nameOriginals,
        row.normalized_name,
        row.branch_item_name
    );


    const barcode =
        String(
            row.barcode
        ).trim();


    if (barcode) {

        addToMap(
            barcodeBranches,
            barcode,
            row.branch_id
        );


        addToMap(
            barcodeIds,
            barcode,
            `${row.branch_id}:${row.branch_item_id}`
        );

    }

}


const exactNameMatches = [];

for (
    const [
        normalizedName,
        branches
    ]
    of nameBranches
) {

    if (
        branches.size < 2
    ) {
        continue;
    }


    exactNameMatches.push({

        normalizedName,

        branchCount:
            branches.size,

        branches:
            [...branches]
                .sort(
                    (a, b) =>
                        Number(a) -
                        Number(b)
                ),

        itemIds:
            [
                ...(nameIds.get(
                    normalizedName
                ) || [])
            ],

        originals:
            [
                ...(nameOriginals.get(
                    normalizedName
                ) || [])
            ]

    });

}


exactNameMatches.sort(
    (
        a,
        b
    ) =>
        b.branchCount -
        a.branchCount ||
        a.normalizedName.localeCompare(
            b.normalizedName
        )
);


const barcodeMatches = [];

for (
    const [
        barcode,
        branches
    ]
    of barcodeBranches
) {

    if (
        branches.size < 2
    ) {
        continue;
    }


    barcodeMatches.push({

        barcode,

        branchCount:
            branches.size,

        branches:
            [...branches]
                .sort(
                    (a, b) =>
                        Number(a) -
                        Number(b)
                ),

        itemIds:
            [
                ...(barcodeIds.get(
                    barcode
                ) || [])
            ]

    });

}


barcodeMatches.sort(
    (
        a,
        b
    ) =>
        b.branchCount -
        a.branchCount ||
        a.barcode.localeCompare(
            b.barcode
        )
);


const zeroItems =
    rows.filter(
        row =>
            String(
                row.branch_item_id
            ) === "0"
    );


const uniqueItemIds =
    new Set();

for (
    const row
    of rows
) {

    uniqueItemIds.add(
        `${row.branch_id}:${row.branch_item_id}`
    );

}


const uniqueNormalizedNames =
    new Set(
        rows
            .map(
                row =>
                    row.normalized_name
            )
            .filter(Boolean)
    );


const uniqueBarcodes =
    new Set(
        rows
            .map(
                row =>
                    String(
                        row.barcode
                    ).trim()
            )
            .filter(Boolean)
    );


const rowsByBranch =
    new Map();

for (
    const row
    of rows
) {

    rowsByBranch.set(
        row.branch_id,
        (
            rowsByBranch.get(
                row.branch_id
            ) || 0
        ) + 1
    );

}


const summary = {

    generatedAt:
        new Date().toISOString(),

    totalRows:
        rows.length,

    branchCount:
        branchNames.size,

    uniqueBranchItems:
        uniqueItemIds.size,

    uniqueNormalizedNames:
        uniqueNormalizedNames.size,

    uniqueBarcodes:
        uniqueBarcodes.size,

    zeroItemRows:
        zeroItems.length,

    exactCrossBranchNames:
        exactNameMatches.length,

    crossBranchBarcodes:
        barcodeMatches.length,

    rowsByBranch:
        [...rowsByBranch.entries()]
            .map(
                (
                    [
                        branchId,
                        count
                    ]
                ) => ({

                    branchId,

                    branchName:
                        branchNames.get(
                            branchId
                        ),

                    rows:
                        count

                })
            )
            .sort(
                (a, b) =>
                    Number(a.branchId) -
                    Number(b.branchId)
            ),

    topExactNameMatches:
        exactNameMatches
            .slice(0, 50),

    topBarcodeMatches:
        barcodeMatches
            .slice(0, 50)

};


fs.writeFileSync(
    SUMMARY,
    JSON.stringify(
        summary,
        null,
        2
    ),
    "utf8"
);


const exactLines = [

    [
        "normalized_name",
        "branch_count",
        "branches",
        "item_ids",
        "original_names"
    ].join(","),

    ...exactNameMatches.map(
        row =>
            [
                row.normalizedName,
                row.branchCount,
                row.branches.join(" | "),
                row.itemIds.join(" | "),
                row.originals.join(" | ")
            ]
            .map(csvEscape)
            .join(",")
    )

];


fs.writeFileSync(
    EXACT_NAME_OUTPUT,
    "\uFEFF" +
    exactLines.join("\r\n"),
    "utf8"
);


const barcodeLines = [

    [
        "barcode",
        "branch_count",
        "branches",
        "item_ids"
    ].join(","),

    ...barcodeMatches.map(
        row =>
            [
                row.barcode,
                row.branchCount,
                row.branches.join(" | "),
                row.itemIds.join(" | ")
            ]
            .map(csvEscape)
            .join(",")
    )

];


fs.writeFileSync(
    BARCODE_OUTPUT,
    "\uFEFF" +
    barcodeLines.join("\r\n"),
    "utf8"
);


console.log("");
console.log("==============================================");
console.log("ITEM CATALOG ANALYSIS");
console.log("==============================================");
console.log("");
console.log(
    `Total rows              : ${summary.totalRows.toLocaleString("en-US")}`
);
console.log(
    `Unique branch items     : ${summary.uniqueBranchItems.toLocaleString("en-US")}`
);
console.log(
    `Unique normalized names : ${summary.uniqueNormalizedNames.toLocaleString("en-US")}`
);
console.log(
    `Unique barcodes         : ${summary.uniqueBarcodes.toLocaleString("en-US")}`
);
console.log(
    `ItemID 0 rows           : ${summary.zeroItemRows.toLocaleString("en-US")}`
);
console.log(
    `Exact cross-branch names: ${summary.exactCrossBranchNames.toLocaleString("en-US")}`
);
console.log(
    `Cross-branch barcodes   : ${summary.crossBranchBarcodes.toLocaleString("en-US")}`
);

console.log("");
console.log("ROWS BY BRANCH");

for (
    const item
    of summary.rowsByBranch
) {

    console.log(
        `${item.branchId} | ${item.branchName} | ${item.rows.toLocaleString("en-US")}`
    );

}

console.log("");
console.log(
    `SUMMARY : ${SUMMARY}`
);

console.log(
    `NAMES   : ${EXACT_NAME_OUTPUT}`
);

console.log(
    `BARCODE : ${BARCODE_OUTPUT}`
);

console.log("");
console.log("TOP EXACT NAME MATCHES");

for (
    const item
    of exactNameMatches.slice(0, 30)
) {

    console.log(
        `${item.branchCount} branches | ${item.normalizedName}`
    );

}

console.log("");
console.log("TOP BARCODE MATCHES");

for (
    const item
    of barcodeMatches.slice(0, 20)
) {

    console.log(
        `${item.branchCount} branches | ${item.barcode}`
    );

}

console.log("");