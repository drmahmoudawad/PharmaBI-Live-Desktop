import fs from "node:fs";

const file =
    "D:\\PharmaBI-Live-Desktop\\electron\\cache\\cacheWarmupService.js";

const source =
    fs.readFileSync(
        file,
        "utf8"
    );

const functionMatches =
    [
        ...source.matchAll(
            /^(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/gm
        )
    ];

console.log("\n===== INTERNAL FUNCTION USAGE =====\n");

for (const match of functionMatches) {

    const name =
        match[1];

    const escaped =
        name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

    const occurrences =
        [
            ...source.matchAll(
                new RegExp(
                    `\\b${escaped}\\s*\\(`,
                    "g"
                )
            )
        ];

    const lines =
        occurrences.map(
            occurrence =>

                source
                    .slice(
                        0,
                        occurrence.index
                    )
                    .split("\n")
                    .length
        );

    console.log(
        `${name.padEnd(36)} count=${String(occurrences.length).padStart(3)} lines=${lines.join(",")}`
    );

}

console.log("\n===== EXPORTED FUNCTIONS =====\n");

const exportMatches =
    [
        ...source.matchAll(
            /^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm
        )
    ];

for (const match of exportMatches) {

    console.log(
        match[1]
    );

}

console.log("\n===== DEFAULT EXPORT OBJECT =====\n");

const defaultStart =
    source.indexOf(
        "export default {"
    );

if (
    defaultStart !== -1
) {

    console.log(
        source.slice(
            defaultStart
        )
        .split("\n")
        .slice(
            0,
            60
        )
        .join("\n")
    );

}

console.log("\n===== ALL START/REFRESH REFERENCES =====\n");

for (
    const pattern
    of [
        "startAllBranchesWarmup",
        "warmupBranchCache",
        "refreshCurrentMonthAllBranches",
        "refreshWarmupQueue",
        "startBranchWarmup",
        "runRoundRobinEngine",
        "buildBranchPlan",
        "processPlanMonth",
        "finalizePlan",
        "warmMonthOnce",
        "runMonthOnce"
    ]
) {

    const matches =
        [
            ...source.matchAll(
                new RegExp(
                    `\\b${pattern}\\b`,
                    "g"
                )
            )
        ];

    const lines =
        matches.map(
            match =>
                source
                    .slice(
                        0,
                        match.index
                    )
                    .split("\n")
                    .length
        );

    console.log(
        `${pattern.padEnd(36)} ${lines.join(", ")}`
    );

}
