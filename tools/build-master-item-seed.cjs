const fs = require("fs");

const INPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-catalog-all.csv";

const OUTPUT_JSON =
    "D:\\PharmaBI-Live-Desktop\\tools\\master-item-seed.json";

const OUTPUT_CSV =
    "D:\\PharmaBI-Live-Desktop\\tools\\master-item-seed.csv";


function parseCsvLine(line) {

    const result = [];
    let value = "";
    let quoted = false;

    for (
        let i = 0;
        i < line.length;
        i += 1
    ) {

        const ch = line[i];

        if (quoted) {

            if (ch === '"') {

                if (line[i + 1] === '"') {
                    value += '"';
                    i += 1;
                }
                else {
                    quoted = false;
                }

            }
            else {
                value += ch;
            }

            continue;
        }

        if (ch === '"') {
            quoted = true;
            continue;
        }

        if (ch === ",") {
            result.push(value);
            value = "";
            continue;
        }

        value += ch;
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


const raw =
    fs.readFileSync(
        INPUT,
        "utf8"
    )
    .replace(/^\uFEFF/, "");


const lines =
    raw.split(/\r?\n/);


const headers =
    parseCsvLine(
        lines[0]
    );


const ix = {};

for (
    let i = 0;
    i < headers.length;
    i += 1
) {

    ix[headers[i]] = i;

}


const rows = [];


for (
    let i = 1;
    i < lines.length;
    i += 1
) {

    if (!lines[i].trim()) {
        continue;
    }


    const cells =
        parseCsvLine(
            lines[i]
        );


    const itemId =
        String(
            cells[ix.branch_item_id] || ""
        ).trim();


    if (
        itemId === "0"
    ) {
        continue;
    }


    const normalized =
        String(
            cells[ix.normalized_name] || ""
        ).trim();


    const name =
        String(
            cells[ix.branch_item_name] || ""
        ).trim();


    if (
        !normalized ||
        !name
    ) {
        continue;
    }


    rows.push({

        branchId:
            String(
                cells[ix.branch_id] || ""
            ).trim(),

        branchName:
            String(
                cells[ix.branch_name] || ""
            ).trim(),

        itemId,

        itemCode:
            String(
                cells[ix.branch_item_code] || ""
            ).trim(),

        name,

        normalized,

        barcode:
            String(
                cells[ix.barcode] || ""
            ).trim(),

        parts:
            String(
                cells[ix.parts] || ""
            ).trim()

    });

}


const groups =
    new Map();


for (
    const row
    of rows
) {

    if (
        !groups.has(
            row.normalized
        )
    ) {

        groups.set(
            row.normalized,
            []
        );

    }


    groups
        .get(
            row.normalized
        )
        .push(row);

}


const masterItems = [];


for (
    const [
        normalized,
        group
    ]
    of groups
) {

    const byBranch =
        new Map();


    for (
        const row
        of group
    ) {

        if (
            !byBranch.has(
                row.branchId
            )
        ) {

            byBranch.set(
                row.branchId,
                []
            );

        }


        byBranch
            .get(
                row.branchId
            )
            .push(row);

    }


    /*
     * SAFE RULE:
     *
     * Every branch represented by this identity
     * must point to exactly ONE local ItemID.
     *
     * Therefore:
     *
     * same normalized identity + one local ItemID
     * per branch = safe automatic master identity.
     */

    let safe = true;


    for (
        const branchRows
        of byBranch.values()
    ) {

        const uniqueIds =
            new Set(
                branchRows.map(
                    row =>
                        row.itemId
                )
            );


        if (
            uniqueIds.size !== 1
        ) {

            safe = false;
            break;

        }

    }


    if (!safe) {
        continue;
    }


    /*
     * Choose canonical display name by frequency.
     * In a tie, choose the longest informative name.
     */

    const nameCounts =
        new Map();


    for (
        const row
        of group
    ) {

        const current =
            nameCounts.get(
                row.name
            ) || 0;


        nameCounts.set(
            row.name,
            current + 1
        );

    }


    const canonicalName =
        [
            ...nameCounts.entries()
        ]
        .sort(
            (
                a,
                b
            ) =>
                b[1] -
                a[1] ||
                b[0].length -
                a[0].length ||
                a[0].localeCompare(
                    b[0]
                )
        )[0][0];


    const branches =
        [...byBranch.entries()]
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(a[0]) -
                    Number(b[0])
            )
            .map(
                (
                    [
                        branchId,
                        branchRows
                    ]
                ) => {

                    const row =
                        branchRows[0];

                    return {

                        branchId:

                            Number(
                                branchId
                            ),

                        branchName:
                            row.branchName,

                        branchItemId:
                            Number(
                                row.itemId
                            ),

                        branchItemCode:
                            row.itemCode,

                        branchItemName:
                            row.name,

                        barcode:
                            row.barcode,

                        parts:
                            row.parts

                    };

                }
            );


    masterItems.push({

        normalizedName:
            normalized,

        canonicalName,

        branchCount:
            branches.length,

        mappingCount:
            branches.length,

        branches

    });

}


masterItems.sort(
    (
        a,
        b
    ) =>
        b.branchCount -
        a.branchCount ||
        a.canonicalName.localeCompare(
            b.canonicalName
        )
);


const seeded =
    masterItems.map(
        (
            item,
            index
        ) => ({

            unifiedCode:
                `PBI-${String(index + 1).padStart(7, "0")}`,

            ...item

        })
    );


const summary = {

    generatedAt:
        new Date().toISOString(),

    sourceRows:
        rows.length,

    normalizedGroups:
        groups.size,

    safeMasterItems:
        seeded.length,

    mappedBranchItems:
        seeded.reduce(
            (
                total,
                item
            ) =>
                total +
                item.mappingCount,
            0
        ),

    branchesCovered:
        new Set(
            seeded.flatMap(
                item =>
                    item.branches
                        .map(
                            branch =>
                                branch.branchId
                        )
            )
        ).size,

    singleBranchMasters:
        seeded.filter(
            item =>
                item.branchCount === 1
        ).length,

    multiBranchMasters:
        seeded.filter(
            item =>
                item.branchCount > 1
        ).length,

    masterItems:
        seeded

};


fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify(
        summary,
        null,
        2
    ),
    "utf8"
);


const csvHeaders = [

    "unified_code",
    "canonical_name",
    "normalized_name",
    "branch_count",
    "branch_id",
    "branch_name",
    "branch_item_id",
    "branch_item_code",
    "branch_item_name",
    "barcode",
    "parts"

];


const csvRows = [];


for (
    const item
    of seeded
) {

    for (
        const branch
        of item.branches
    ) {

        csvRows.push({

            unified_code:
                item.unifiedCode,

            canonical_name:
                item.canonicalName,

            normalized_name:
                item.normalizedName,

            branch_count:
                item.branchCount,

            branch_id:
                branch.branchId,

            branch_name:
                branch.branchName,

            branch_item_id:
                branch.branchItemId,

            branch_item_code:
                branch.branchItemCode,

            branch_item_name:
                branch.branchItemName,

            barcode:
                branch.barcode,

            parts:
                branch.parts

        });

    }

}


const csvLines = [

    csvHeaders.join(","),

    ...csvRows.map(
        row =>
            csvHeaders
                .map(
                    key =>
                        csvEscape(
                            row[key]
                        )
                )
                .join(",")
    )

];


fs.writeFileSync(
    OUTPUT_CSV,
    "\uFEFF" +
    csvLines.join("\r\n"),
    "utf8"
);


console.log("");
console.log("==============================================");
console.log("MASTER ITEM SAFE SEED");
console.log("==============================================");
console.log("");
console.log(
    `Source rows          : ${summary.sourceRows.toLocaleString("en-US")}`
);
console.log(
    `Normalized groups     : ${summary.normalizedGroups.toLocaleString("en-US")}`
);
console.log(
    `Safe master items     : ${summary.safeMasterItems.toLocaleString("en-US")}`
);
console.log(
    `Mapped branch items   : ${summary.mappedBranchItems.toLocaleString("en-US")}`
);
console.log(
    `Branches covered     : ${summary.branchesCovered}`
);
console.log(
    `Single-branch masters : ${summary.singleBranchMasters.toLocaleString("en-US")}`
);
console.log(
    `Multi-branch masters  : ${summary.multiBranchMasters.toLocaleString("en-US")}`
);
console.log("");
console.log(
    `JSON : ${OUTPUT_JSON}`
);
console.log(
    `CSV  : ${OUTPUT_CSV}`
);
console.log("");
console.log("TOP 50 MASTER ITEMS");
console.log("");


for (
    const item
    of seeded.slice(0, 50)
) {

    console.log(
        `${item.unifiedCode} | ${item.branchCount} branches | ${item.canonicalName}`
    );

}