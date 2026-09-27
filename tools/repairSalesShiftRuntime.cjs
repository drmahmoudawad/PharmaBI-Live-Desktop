const fs = require("fs");
const { spawnSync } = require("child_process");

const file =
    "D:\\PharmaBI-Live-Desktop\\src\\components\\SalesAnalyticsPanel.jsx";

const backup =
    file +
    ".backup-before-shift-runtime-repair";

let source =
    fs.readFileSync(
        file,
        "utf8"
    );

if (!fs.existsSync(backup)) {
    fs.copyFileSync(
        file,
        backup
    );
}

const shiftRegex =
    /(\s*const\s+shiftRows\s*=\s*useMemo\(\s*\(\)\s*=>\s*buildShiftRows\(hourData\),\s*\[hourData\]\s*\);\s*)/m;

const shiftMatch =
    source.match(
        shiftRegex
    );

if (!shiftMatch) {
    throw new Error(
        "SHIFT ROWS BLOCK NOT FOUND"
    );
}

const hourStateRegex =
    /const\s*\[\s*hourData\s*,\s*setHourData\s*\]\s*=\s*useState\(\s*\[\s*\]\s*\)\s*;/m;

const hourMatch =
    source.match(
        hourStateRegex
    );

if (!hourMatch) {
    throw new Error(
        "HOUR DATA STATE NOT FOUND"
    );
}

const shiftIndex =
    source.indexOf(
        shiftMatch[0]
    );

const hourEnd =
    hourMatch.index +
    hourMatch[0].length;

console.log(
    "SHIFT ROWS INDEX:",
    shiftIndex
);

console.log(
    "HOUR STATE END:",
    hourEnd
);

if (
    shiftIndex < hourEnd
) {

    source =
        source.replace(
            shiftMatch[0],
            "\n"
        );

    source =
        source.slice(
            0,
            hourEnd
        ) +
        "\n" +
        shiftMatch[0].trim() +
        "\n" +
        source.slice(
            hourEnd
        );

    console.log(
        "SHIFT ROWS MOVED AFTER HOUR DATA STATE"
    );

}
else {

    console.log(
        "SHIFT ROWS ORDER ALREADY CORRECT"
    );

}

fs.writeFileSync(
    file,
    source,
    "utf8"
);

const finalSource =
    fs.readFileSync(
        file,
        "utf8"
    );

console.log(
    "===== VALIDATION ====="
);

const finalShiftIndex =
    finalSource.indexOf(
        "const shiftRows = useMemo"
    );

const finalHourIndex =
    finalSource.search(
        /const\s*\[\s*hourData\s*,\s*setHourData\s*\]/
    );

console.log({
    shiftRowsIndex:
        finalShiftIndex,

    hourDataIndex:
        finalHourIndex
});

if (
    finalShiftIndex < 0 ||
    finalHourIndex < 0 ||
    finalShiftIndex < finalHourIndex
) {

    throw new Error(
        "SHIFT ROWS ORDER VALIDATION FAILED"
    );

}

console.log(
    "ORDER VALIDATION OK"
);

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
                "D:\\PharmaBI-Live-Desktop",

            stdio:
                "inherit",

            shell:
                true
        }
    );

if (
    build.status !== 0
) {

    process.exit(
        build.status || 1
    );

}

console.log(
    "RUNTIME REPAIR BUILD COMPLETE"
);
