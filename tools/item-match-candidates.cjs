const fs = require("fs");

const INPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-catalog-all.csv";

const OUTPUT =
    "D:\\PharmaBI-Live-Desktop\\tools\\item-match-candidates.csv";


function parseCsvLine(line) {

    const result = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {

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


function tokenize(name) {

    return String(name || "")
        .toUpperCase()
        .replace(/[^A-Z0-9\u0600-\u06FF]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

}


const STOP_TOKENS = new Set([

    "TAB",
    "TABS",
    "TABLET",
    "TABLETS",

    "CAP",
    "CAPS",
    "CAPSULE",
    "CAPSULES",

    "SYR",
    "SYRUP",

    "SUSP",
    "SUSPENSION",

    "AMP",
    "AMPS",
    "AMPOULE",
    "AMPOULES",

    "VIAL",
    "VIALS",

    "CREAM",
    "CREME",

    "GEL",
    "OINT",
    "OINTMENT",

    "DROP",
    "DROPS",

    "SPRAY",

    "SACH",
    "SACHET",
    "SACHETS",

    "PCS",
    "PC",

    "GM",
    "GMS",

    "MG",
    "MCG",
    "G",
    "ML",
    "L",

    "NO",
    "NOS",

    "EA"
]);


function canonicalTokens(name) {

    const tokens =
        tokenize(name);

    const result = [];

    for (
        let i = 0;
        i < tokens.length;
        i += 1
    ) {

        const token =
            tokens[i];

        if (
            STOP_TOKENS.has(token)
        ) {

            continue;

        }

        // Remove pure pack counts.
        if (
            /^\d+$/.test(token)
        ) {

            continue;

        }

        // Normalize decimal strengths.
        if (
            /^\d+(\.\d+)?$/.test(token)
        ) {

            continue;

        }

        result.push(token);

    }

    return [
        ...new Set(result)
    ];
}


function coreKey(name) {

    return canonicalTokens(name)
        .sort()
        .join(" ");

}


function levenshtein(
    a,
    b
) {

    const aa = String(a);
    const bb = String(b);

    if (aa === bb) {
        return 0;
    }

    if (!aa.length) {
        return bb.length;
    }

    if (!bb.length) {
        return aa.length;
    }

    let prev =
        new Array(
            bb.length + 1
        );

    let curr =
        new Array(
            bb.length + 1
        );

    for (
        let j = 0;
        j <= bb.length;
        j += 1
    ) {
        prev[j] = j;
    }

    for (
        let i = 1;
        i <= aa.length;
        i += 1
    ) {

        curr[0] = i;

        for (
            let j = 1;
            j <= bb.length;
            j += 1
        ) {

            const cost =
                aa[i - 1] === bb[j - 1]
                    ? 0
                    : 1;

            curr[j] =
                Math.min(
                    curr[j - 1] + 1,
                    prev[j] + 1,
                    prev[j - 1] + cost
                );

        }

        [prev, curr] =
            [curr, prev];

    }

    return prev[bb.length];

}


function similarity(
    a,
    b
) {

    const aa =
        String(a || "")
            .toUpperCase();

    const bb =
        String(b || "")
            .toUpperCase();

    const max =
        Math.max(
            aa.length,
            bb.length
        );

    if (!max) {
        return 1;
    }

    return 1 -
        levenshtein(
            aa,
            bb
        ) / max;

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


const items = [];

const branchByCore =
    new Map();


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

    const name =
        String(
            cells[ix.branch_item_name] || ""
        ).trim();

    const branchId =
        String(
            cells[ix.branch_id] || ""
        ).trim();

    const itemId =
        String(
            cells[ix.branch_item_id] || ""
        ).trim();


    if (
        !name ||
        itemId === "0"
    ) {
        continue;
    }


    const key =
        coreKey(
            name
        );


    if (!key) {
        continue;
    }


    const item = {

        branchId,

        itemId,

        name,

        key

    };


    items.push(
        item
    );


    if (!branchByCore.has(key)) {
        branchByCore.set(
            key,
            []
        );
    }


    branchByCore
        .get(key)
        .push(item);

}


const candidates = [];

const seen =
    new Set();


for (
    const [
        key,
        group
    ]
    of branchByCore
) {

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


    // Only compare different names.
    const uniqueNames =
        [
            ...new Set(
                group.map(
                    row =>
                        row.name
                )
            )
        ];


    if (
        uniqueNames.length < 2
    ) {
        continue;
    }


    for (
        let i = 0;
        i < uniqueNames.length;
        i += 1
    ) {

        for (
            let j = i + 1;
            j < uniqueNames.length;
            j += 1
        ) {

            const a =
                uniqueNames[i];

            const b =
                uniqueNames[j];


            if (
                a === b
            ) {
                continue;
            }


            const pairKey =
                [a, b]
                    .sort()
                    .join("|||");


            if (
                seen.has(pairKey)
            ) {
                continue;
            }


            seen.add(pairKey);


            const score =
                similarity(
                    a,
                    b
                );


            if (
                score < 0.72
            ) {
                continue;
            }


            const branchA =
                [
                    ...new Set(
                        group
                            .filter(
                                row =>
                                    row.name === a
                            )
                            .map(
                                row =>
                                    row.branchId
                            )
                    )
                ];


            const branchB =
                [
                    ...new Set(
                        group
                            .filter(
                                row =>
                                    row.name === b
                            )
                            .map(
                                row =>
                                    row.branchId
                            )
                    )
                ];


            candidates.push({

                coreKey:
                    key,

                similarity:
                    Number(
                        score.toFixed(4)
                    ),

                nameA:
                    a,

                nameB:
                    b,

                branchesA:
                    branchA.join(" | "),

                branchesB:
                    branchB.join(" | ")

            });

        }

    }

}


candidates.sort(
    (a, b) =>
        b.similarity -
        a.similarity ||
        a.nameA.localeCompare(
            b.nameA
        )
);


const headersOut = [

    "core_key",
    "similarity",
    "name_a",
    "name_b",
    "branches_a",
    "branches_b"

];


const linesOut = [

    headersOut.join(","),

    ...candidates.map(
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


function csvEscape(value) {

    const text =
        String(
            value ?? ""
        );

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


fs.writeFileSync(
    OUTPUT,
    "\uFEFF" +
    linesOut.join("\r\n"),
    "utf8"
);


console.log("");
console.log(
    "=============================================="
);
console.log(
    "ITEM MATCH CANDIDATES"
);
console.log(
    "=============================================="
);
console.log("");
console.log(
    `Candidates: ${candidates.length.toLocaleString("en-US")}`
);
console.log("");
console.log(
    `OUTPUT: ${OUTPUT}`
);
console.log("");
console.log(
    "TOP 100"
);
console.log("");


for (
    const candidate
    of candidates.slice(0, 100)
) {

    console.log(
        `${candidate.similarity} | ${candidate.nameA} <=> ${candidate.nameB}`
    );

}

console.log("");