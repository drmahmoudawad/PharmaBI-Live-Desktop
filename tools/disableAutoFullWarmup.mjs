import fs from "fs";

const file =
    "D:/PharmaBI-Live-Desktop/electron/main.js";

const backup =
    `${file}.backup-before-disable-full-warmup-20260925`;

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

const functionPattern =
    /function startBackgroundWarmup\(\)\s*\{/;

if (!functionPattern.test(source)) {
    throw new Error(
        "startBackgroundWarmup() not found."
    );
}

const guard = `
function startBackgroundWarmup() {

    if (
        process.env.PHARMABI_ENABLE_FULL_WARMUP !== "1"
    ) {
        console.log(
            "[Electron] Full historical cache warm-up disabled by default."
        );

        console.log(
            "[Electron] Historical data will load on demand."
        );

        return;
    }
`;

source =
    source.replace(
        functionPattern,
        guard
    );

fs.writeFileSync(
    file,
    source,
    "utf8"
);

console.log(
    "Automatic full historical warm-up disabled."
);

console.log(
    `Backup: ${backup}`
);