const fs = require("fs");

const INPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-catalog-all.csv";

const HIGH =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-high-confidence.csv";

const REVIEW =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-review-candidates.csv";


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


function normalizeDigits(text) {

    return String(text)
        .replace(/[٠-٩]/g, d =>
            String(
                "٠١٢٣٤٥٦٧٨٩".indexOf(d)
            )
        )
        .replace(/[۰-۹]/g, d =>
            String(
                "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
            )
        );

}


function normalizeName(name) {

    let value =
        normalizeDigits(
            String(name || "")
        )
        .toUpperCase()
        .trim();


    value =
        value.replace(
            /[‐-‒–—−]/g,
            "-"
        );


    value =
        value.replace(
            /[()[\]{},;:+*_#]/g,
            " "
        );


    value =
        value.replace(
            /\s+/g,
            " "
        );


    // Unit normalization.
    value =
        value
            .replace(/\bGMS?\b/g, "G")
            .replace(/\bGRAMS?\b/g, "G")
            .replace(/\bMGS?\b/g, "MG")
            .replace(/\bMCGS?\b/g, "MCG")
            .replace(/\bMLS?\b/g, "ML");


    // Dosage-form normalization.
    value =
        value
            .replace(/\bTABLETS?\b/g, "TAB")
            .replace(/\bTABS?\b/g, "TAB")
            .replace(/\bCAPSULES?\b/g, "CAP")
            .replace(/\bCAPS?\b/g, "CAP")
            .replace(/\bSYR\b/g, "SYRUP")
            .replace(/\bSUSPENSION\b/g, "SUSP")
            .replace(/\bEYE[\s.]*DROPS?\b/g, "EYE DROPS")
            .replace(/\bDROPS?\b/g, "DROP");


    // Normalize spacing around numbers and units.
    value =
        value
            .replace(
                /(\d+(?:\.\d+)?)[\s-]+(MG|MCG|G|ML|L|%)/g,
                "$1$2"
            )
            .replace(
                /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
                "$1/$2"
            );


    value =
        value.replace(
            /\s+/g,
            " "
        );


    return value.trim();

}


function similarity(
    a,
    b
) {

    const aa =
        String(a || "");

    const bb =
        String(b || "");


    if (
        aa === bb
    ) {
        return 1;
    }


    const max =
        Math.max(
            aa.length,
            bb.length
        );


    if (!max) {
        return 1;
    }


    const prev =
        new Array(
            bb.length + 1
        );

    let previous =
        prev;

    for (
        let j = 0;
        j <= bb.length;
        j += 1
    ) {
        previous[j] = j;
    }


    for (
        let i = 1;
        i <= aa.length;
        i += 1
    ) {

        const current =
            new Array(
                bb.length + 1
            );

        current[0] = i;


        for (
            let j = 1;
            j <= bb.length;
            j += 1
        ) {

            const cost =
                aa[i - 1] === bb[j - 1]
                    ? 0
                    : 1;


            current[j] =
                Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost
                );

        }


        previous =
            current;

    }


    return 1 -
        previous[bb.length] /
        max;

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
        );


    if (
        itemId === "0"
    ) {
        continue;
    }


    const originalName =
        String(
            cells[ix.branch_item_name] || ""
        )
        .trim();


    if (!originalName) {
        continue;
    }


    rows.push({

        branchId:
            String(
                cells[ix.branch_id] || ""
            ),

        branchName:
            String(
                cells[ix.branch_name] || ""
            ),

        itemId,

        originalName,

        normalized:
            normalizeName(
                originalName
            )

    });

}


const byNormalized =
    new Map();


for (
    const row
    of rows
) {

    if (
        !byNormalized.has(
            row.normalized
        )
    ) {

        byNormalized.set(
            row.normalized,
            []
        );

    }


    byNormalized
        .get(row.normalized)
        .push(row);

}


const highConfidence = [];
const seenHigh = new Set();


for (
    const [
        normalized,
        group
    ]
    of byNormalized
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
            .get(row.branchId)
            .push(row);

    }


    // Strong only when each branch has ONE item for
    // the normalized identity.
    const uniqueBranches =
        [
            ...byBranch.keys()
        ];


    if (
        uniqueBranches.length < 2
    ) {
        continue;
    }


    let ambiguous = false;


    for (
        const values
        of byBranch.values()
    ) {

        const uniqueIds =
            new Set(
                values.map(
                    row => row.itemId
                )
            );


        if (
            uniqueIds.size !== 1
        ) {

            ambiguous = true;
            break;

        }

    }


    if (ambiguous) {
        continue;
    }


    const representative =
        group[0];


    const itemRefs =
        uniqueBranches
            .sort(
                (a, b) =>
                    Number(a) -
                    Number(b)
            )
            .map(
                branchId => {

                    const row =
                        byBranch
                            .get(
                                branchId
                            )[0];

                    return `${branchId}:${row.itemId}`;

                }
            );


    const key =
        [
            normalized,
            itemRefs.join("|")
        ]
        .join("|||");


    if (
        seenHigh.has(key)
    ) {
        continue;
    }


    seenHigh.add(key);


    highConfidence.push({

        normalized_name:
            normalized,

        branch_count:
            uniqueBranches.length,

        representative_name:
            representative.originalName,

        branches:
            uniqueBranches.join(" | "),

        branch_item_ids:
            itemRefs.join(" | "),

        confidence:
            "HIGH"

    });

}


function signature(
    value
) {

    return String(
        value
    )
        .replace(
            /\s+/g,
            ""
        );

}


const signatureGroups =
    new Map();


for (
    const row
    of rows
) {

    const key =
        signature(
            row.normalized
        );

    if (
        !signatureGroups.has(key)
    ) {

        signatureGroups.set(
            key,
            []
        );

    }

    signatureGroups
        .get(key)
        .push(row);

}


const review = [];
const seenReview = new Set();


for (
    const [
        signatureKey,
        group
    ]
    of signatureGroups
) {

    const names =
        [
            ...new Set(
                group.map(
                    row =>
                        row.normalized
                )
            )
        ];


    if (
        names.length < 2
    ) {
        continue;
    }


    const branches =
        new Set(
            group.map(
                row =>
                    row.branchId
            )
        );


    if (
        branches.size < 2
    ) {
        continue;
    }


    for (
        let i = 0;
        i < names.length;
        i += 1
    ) {

        for (
            let j = i + 1;
            j < names.length;
            j += 1
        ) {

            const a =
                names[i];

            const b =
                names[j];


            if (
                a === b
            ) {
                continue;
            }


            const pair =
                [
                    a,
                    b
                ]
                .sort()
                .join("|||");


            if (
                seenReview.has(pair)
            ) {
                continue;
            }


            seenReview.add(pair);


            const score =
                similarity(
                    a,
                    b
                );


            if (
                score < 0.90
            ) {
                continue;
            }


            const groupA =
                group.filter(
                    row =>
                        row.normalized === a
                );


            const groupB =
                group.filter(
                    row =>
                        row.normalized === b
                );


            const branchesA =
                [
                    ...new Set(
                        groupA.map(
                            row =>
                                row.branchId
                        )
                    )
                ];


            const branchesB =
                [
                    ...new Set(
                        groupB.map(
                            row =>
                                row.branchId
                        )
                    )
                ];


            if (
                !branchesA.some(
                    branch =>
                        branchesB.includes(
                            branch
                        )
                )
            ) {
                continue;
            }


            review.push({

                similarity:
                    Number(
                        score.toFixed(4)
                    ),

                name_a:
                    a,

                name_b:
                    b,

                branches_a:
                    branchesA.join(" | "),

                branches_b:
                    branchesB.join(" | "),

                confidence:
                    score >= 0.97
                        ? "REVIEW-HIGH"
                        : "REVIEW"

            });

        }

    }

}


highConfidence.sort(
    (a, b) =>
        b.branch_count -
        a.branch_count ||
        a.normalized_name.localeCompare(
            b.normalized_name
        )
);


review.sort(
    (a, b) =>
        b.similarity -
        a.similarity
);


function writeCsv(
    file,
    headersOut,
    values
) {

    const linesOut = [

        headersOut.join(","),

        ...values.map(
            row =>
                headersOut
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
        file,
        "\uFEFF" +
        linesOut.join("\r\n"),
        "utf8"
    );

}


writeCsv(
    HIGH,
    [
        "normalized_name",
        "branch_count",
        "representative_name",
        "branches",
        "branch_item_ids",
        "confidence"
    ],
    highConfidence
);


writeCsv(
    REVIEW,
    [
        "similarity",
        "name_a",
        "name_b",
        "branches_a",
        "branches_b",
        "confidence"
    ],
    review
);


console.log("");
console.log("==============================================");
console.log("SAFE ITEM MATCH ANALYSIS");
console.log("==============================================");
console.log("");
console.log(
    `Rows analyzed       : ${rows.length.toLocaleString("en-US")}`
);
console.log(
    `HIGH confidence     : ${highConfidence.length.toLocaleString("en-US")}`
);
console.log(
    `Review candidates    : ${review.length.toLocaleString("en-US")}`
);
console.log("");
console.log(
    `HIGH : ${HIGH}`
);
console.log(
    `REVIEW: ${REVIEW}`
);
console.log("");
console.log("TOP REVIEW CANDIDATES");
console.log("");


for (
    const row
    of review.slice(0, 100)
) {

    console.log(
        `${row.similarity} | ${row.name_a} <=> ${row.name_b}`
    );

}

console.log("");