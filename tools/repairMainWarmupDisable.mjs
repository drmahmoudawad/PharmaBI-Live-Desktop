import fs from "fs";

const mainFile =
    "D:/PharmaBI-Live-Desktop/electron/main.js";

const backupFile =
    "D:/PharmaBI-Live-Desktop/electron/main.js.backup-before-disable-full-warmup-20260925";

if (!fs.existsSync(backupFile)) {
    throw new Error(
        `Backup file not found: ${backupFile}`
    );
}

/*
 * Restore the exact known-good main.js first.
 */
const original =
    fs.readFileSync(
        backupFile,
        "utf8"
    );

const startMarker =
    "function startBackgroundWarmup()";

const endMarker =
    "app.whenReady()";

const startIndex =
    original.indexOf(
        startMarker
    );

const endIndex =
    original.indexOf(
        endMarker,
        startIndex
    );

if (
    startIndex < 0 ||
    endIndex < 0 ||
    endIndex <= startIndex
) {
    throw new Error(
        "Could not locate startBackgroundWarmup() boundaries."
    );
}

const disabledFunction = `
function startBackgroundWarmup() {

    console.log(
        "[Electron] Full historical cache warm-up disabled by default."
    );

    console.log(
        "[Electron] Historical data will load on demand."
    );

    return {
        started: false,
        disabled: true
    };
}
`;

const repaired =
    original.slice(
        0,
        startIndex
    ) +
    disabledFunction +
    "\n\n\n" +
    original.slice(
        endIndex
    );

fs.writeFileSync(
    mainFile,
    repaired,
    "utf8"
);

console.log(
    "main.js restored and automatic full historical warm-up disabled correctly."
);