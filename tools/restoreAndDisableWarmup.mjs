import fs from "node:fs";
import path from "node:path";

const projectRoot = "D:/PharmaBI-Live-Desktop";
const mainPath = path.join(projectRoot, "electron", "main.js");
const backupPath = path.join(
    projectRoot,
    "electron",
    "main.js.backup-before-disable-full-warmup-20260925"
);

if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`);
}

let source = fs.readFileSync(backupPath, "utf8");

const exactCall = "startBackgroundWarmup();";
const occurrences = source.split(exactCall).length - 1;

console.log(`Found startBackgroundWarmup() calls: ${occurrences}`);

if (occurrences !== 1) {
    throw new Error(
        `Expected exactly 1 startBackgroundWarmup(); call, found ${occurrences}.`
    );
}

source = source.replace(
    exactCall,
    'console.log("[Electron] Full historical cache warm-up disabled by default.");'
);

fs.writeFileSync(mainPath, source, "utf8");

console.log("main.js restored from known-good backup.");
console.log("Full historical cache warm-up disabled.");
console.log(`Written: ${mainPath}`);