const fs = require("fs");

const file =
    "D:\\PharmaBI-Live-Desktop\\tools\\master-item-seed.json";

const seed =
    JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );

const items =
    Array.isArray(seed?.masterItems)
        ? seed.masterItems
        : [];

const unifiedCodes = new Set();
const branchPairs = new Set();

let duplicateUnifiedCodes = 0;
let duplicateBranchMappings = 0;
let zeroItemMappings = 0;
let invalidItems = 0;

const branches = new Set();

for (const item of items) {

    if (
        !item?.unifiedCode ||
        !item?.canonicalName ||
        !Array.isArray(item?.branches)
    ) {

        invalidItems += 1;
        continue;

    }

    if (
        unifiedCodes.has(
            item.unifiedCode
        )
    ) {

        duplicateUnifiedCodes += 1;

    }

    unifiedCodes.add(
        item.unifiedCode
    );


    for (const branch of item.branches) {

        const branchId =
            Number(
                branch?.branchId
            );

        const itemId =
            String(
                branch?.branchItemId ?? ""
            );

        branches.add(
            branchId
        );


        if (
            itemId === "0"
        ) {

            zeroItemMappings += 1;

        }


        const pair =
            `${branchId}:${itemId}`;

        if (
            branchPairs.has(pair)
        ) {

            duplicateBranchMappings += 1;

        }

        branchPairs.add(pair);

    }

}


const expected =
    items.length > 0
        ? items.length
        : 0;


console.log("");
console.log("==============================================");
console.log("MASTER ITEM SEED PREFLIGHT");
console.log("==============================================");
console.log("");

console.log(
    `Master items              : ${items.length.toLocaleString("en-US")}`
);

console.log(
    `Unique unified codes      : ${unifiedCodes.size.toLocaleString("en-US")}`
);

console.log(
    `Branch mappings           : ${branchPairs.size.toLocaleString("en-US")}`
);

console.log(
    `Branches found            : ${[...branches].sort((a,b)=>a-b).join(", ")}`
);

console.log(
    `Duplicate unified codes   : ${duplicateUnifiedCodes}`
);

console.log(
    `Duplicate branch mappings : ${duplicateBranchMappings}`
);

console.log(
    `Zero ItemID mappings      : ${zeroItemMappings}`
);

console.log(
    `Invalid master records    : ${invalidItems}`
);

console.log("");

const ok =
    items.length === expected &&
    duplicateUnifiedCodes === 0 &&
    duplicateBranchMappings === 0 &&
    zeroItemMappings === 0 &&
    invalidItems === 0 &&
    branches.size === 5;

console.log(
    ok
        ? "PREFLIGHT: OK"
        : "PREFLIGHT: FAILED"
);

console.log("");