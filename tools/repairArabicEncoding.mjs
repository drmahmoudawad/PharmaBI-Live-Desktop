import fs from "node:fs";
import path from "node:path";

const ROOTS = [
    path.join(process.cwd(), "src"),
    path.join(process.cwd(), "electron")
];

const EXTENSIONS = new Set([
    ".js",
    ".jsx",
    ".cjs",
    ".mjs"
]);

const BACKUP_SUFFIX =
    ".backup-before-full-encoding-repair-20260925";

const suspiciousPatterns = [
    "ظ„",
    "ظ…",
    "ظ„ظ",
    "ط§",
    "ط„",
    "Ù„",
    "Ù…",
    "Ø§",
    "Ø±",
    "â€”",
    "â€“",
    "Ã"
];

function score(value) {
    let result = 0;

    for (
        const pattern of suspiciousPatterns
    ) {
        let index = 0;

        while (true) {
            index =
                value.indexOf(
                    pattern,
                    index
                );

            if (index < 0) {
                break;
            }

            result +=
                pattern.length;

            index +=
                pattern.length;
        }
    }

    return result;
}

function buildCp1256ReverseMap() {
    const map = new Map();

    for (
        let byte = 0;
        byte <= 255;
        byte += 1
    ) {

        const decoder =
            new TextDecoder(
                "windows-1256"
            );

        const character =
            decoder.decode(
                Uint8Array.of(
                    byte
                )
            );

        if (
            character &&
            !map.has(
                character
            )
        ) {
            map.set(
                character,
                byte
            );
        }
    }

    return map;
}

const reverseMap =
    buildCp1256ReverseMap();

const utf8Decoder =
    new TextDecoder(
        "utf-8",
        {
            fatal: true
        }
    );

function repairText(value) {

    if (
        score(value) < 2
    ) {
        return null;
    }

    const bytes = [];

    for (
        const character of value
    ) {

        const byte =
            reverseMap.get(
                character
            );

        if (
            byte === undefined
        ) {
            return null;
        }

        bytes.push(
            byte
        );
    }

    let repaired;

    try {

        repaired =
            utf8Decoder.decode(
                Uint8Array.from(
                    bytes
                )
            );

    } catch {

        return null;

    }

    if (
        !repaired ||
        repaired === value
    ) {
        return null;
    }

    if (
        score(repaired) >=
        score(value)
    ) {
        return null;
    }

    if (
        repaired.includes(
            "\uFFFD"
        )
    ) {
        return null;
    }

    return repaired;
}

function repairLine(line) {

    /*
     * Repair the whole line only when it is clearly
     * mojibake. ASCII/code syntax survives unchanged.
     */
    const repaired =
        repairText(
            line
        );

    if (
        repaired
    ) {
        return {
            value: repaired,
            changed: true
        };
    }

    /*
     * Fallback: repair suspicious non-ASCII runs.
     */
    const runPattern =
        /[^\x00-\x7F]+/g;

    let changed = false;

    const value =
        line.replace(
            runPattern,
            (run) => {

                const fixed =
                    repairText(
                        run
                    );

                if (
                    !fixed
                ) {
                    return run;
                }

                changed = true;

                return fixed;
            }
        );

    return {
        value,
        changed
    };
}

function walk(directory) {

    const result = [];

    for (
        const entry of fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        )
    ) {

        if (
            entry.name.startsWith(".")
        ) {
            continue;
        }

        if (
            entry.name.includes(
                ".backup-"
            )
        ) {
            continue;
        }

        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isDirectory()
        ) {

            result.push(
                ...walk(
                    fullPath
                )
            );

            continue;
        }

        if (
            EXTENSIONS.has(
                path.extname(
                    entry.name
                ).toLowerCase()
            )
        ) {

            result.push(
                fullPath
            );

        }

    }

    return result;
}

let changedFiles = 0;
let changedLines = 0;

for (
    const root of ROOTS
) {

    if (
        !fs.existsSync(root)
    ) {
        continue;
    }

    for (
        const file of walk(
            root
        )
    ) {

        const source =
            fs.readFileSync(
                file,
                "utf8"
            );

        const lines =
            source.split(
                "\n"
            );

        let changed = false;

        for (
            let i = 0;
            i < lines.length;
            i += 1
        ) {

            const result =
                repairLine(
                    lines[i]
                );

            if (
                result.changed
            ) {

                lines[i] =
                    result.value;

                changed = true;
                changedLines += 1;

            }

        }

        if (
            !changed
        ) {
            continue;
        }

        const backup =
            `${file}${BACKUP_SUFFIX}`;

        if (
            !fs.existsSync(
                backup
            )
        ) {

            fs.copyFileSync(
                file,
                backup
            );

        }

        fs.writeFileSync(
            file,
            lines.join(
                "\n"
            ),
            "utf8"
        );

        changedFiles += 1;

        console.log(
            `REPAIRED: ${file}`
        );

    }

}

console.log("");
console.log(
    `Files changed: ${changedFiles}`
);
console.log(
    `Lines repaired: ${changedLines}`
);