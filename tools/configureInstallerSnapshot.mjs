import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const packagePath = path.join(
    projectRoot,
    "package.json"
);

const mainPath = path.join(
    projectRoot,
    "electron",
    "main.js"
);

const bootstrapPath = path.join(
    projectRoot,
    "electron",
    "installerStateBootstrap.js"
);

const snapshotPath = path.join(
    projectRoot,
    "tools",
    "prepareInstallerSnapshot.mjs"
);

function writeFile(filePath, content) {
    fs.mkdirSync(
        path.dirname(filePath),
        {
            recursive: true
        }
    );

    fs.writeFileSync(
        filePath,
        content,
        "utf8"
    );
}

/* =========================================================
 * electron/installerStateBootstrap.js
 * ========================================================= */

const bootstrapSource = String.raw`
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const MARKER_FILE =
    "installer-seed-installed.json";

const SEED_DIRECTORY =
    "installer-seed";

function copyEntry(source, destination) {

    if (!fs.existsSync(source)) {
        return;
    }

    const stat =
        fs.statSync(source);

    if (stat.isDirectory()) {

        fs.cpSync(
            source,
            destination,
            {
                recursive: true
            }
        );

        return;
    }

    fs.mkdirSync(
        path.dirname(destination),
        {
            recursive: true
        }
    );

    fs.copyFileSync(
        source,
        destination
    );
}

export function restorePackagedInstallerState() {

    if (!app.isPackaged) {
        return;
    }

    const userData =
        app.getPath("userData");

    const existingDatabase =
        path.join(
            userData,
            "pharmabi-local.db"
        );

    /*
     * Never overwrite an existing installation.
     */
    if (fs.existsSync(existingDatabase)) {
        console.log(
            "[InstallerState] Existing database found. Snapshot import skipped."
        );

        return;
    }

    const markerPath =
        path.join(
            userData,
            MARKER_FILE
        );

    if (fs.existsSync(markerPath)) {
        console.log(
            "[InstallerState] Snapshot marker found. Import skipped."
        );

        return;
    }

    const seedRoot =
        path.join(
            process.resourcesPath,
            SEED_DIRECTORY
        );

    const sourceDatabase =
        path.join(
            seedRoot,
            "pharmabi-local.db"
        );

    if (!fs.existsSync(sourceDatabase)) {

        console.warn(
            "[InstallerState] No installer database snapshot found."
        );

        return;
    }

    const tempRoot =
        path.join(
            userData,
            ".installer-state-temp"
        );

    const copiedTargets = [];

    try {

        fs.rmSync(
            tempRoot,
            {
                recursive: true,
                force: true
            }
        );

        fs.mkdirSync(
            tempRoot,
            {
                recursive: true
            }
        );

        copyEntry(
            sourceDatabase,
            path.join(
                tempRoot,
                "pharmabi-local.db"
            )
        );

        const sourceCache =
            path.join(
                seedRoot,
                "persistent-cache"
            );

        if (fs.existsSync(sourceCache)) {

            copyEntry(
                sourceCache,
                path.join(
                    tempRoot,
                    "persistent-cache"
                )
            );

        }

        for (
            const fileName of [
                "connection-settings.json",
                "branch-targets.json"
            ]
        ) {

            const sourceFile =
                path.join(
                    seedRoot,
                    fileName
                );

            if (fs.existsSync(sourceFile)) {

                copyEntry(
                    sourceFile,
                    path.join(
                        tempRoot,
                        fileName
                    )
                );

            }
        }

        const entries =
            fs.readdirSync(
                tempRoot,
                {
                    withFileTypes: true
                }
            );

        for (
            const entry of entries
        ) {

            const source =
                path.join(
                    tempRoot,
                    entry.name
                );

            const destination =
                path.join(
                    userData,
                    entry.name
                );

            copyEntry(
                source,
                destination
            );

            copiedTargets.push(
                destination
            );
        }

        fs.writeFileSync(
            markerPath,
            JSON.stringify(
                {
                    installedAt:
                        new Date().toISOString(),

                    version:
                        app.getVersion(),

                    source:
                        "PharmaBI Live installer snapshot"
                },
                null,
                2
            ),
            "utf8"
        );

        fs.rmSync(
            tempRoot,
            {
                recursive: true,
                force: true
            }
        );

        console.log(
            "[InstallerState] Initial snapshot restored successfully."
        );

    }
    catch (error) {

        console.error(
            "[InstallerState] Snapshot restore failed:",
            error
        );

        for (
            const target of copiedTargets
        ) {

            try {

                fs.rmSync(
                    target,
                    {
                        recursive: true,
                        force: true
                    }
                );

            }
            catch {}

        }

        try {

            fs.rmSync(
                markerPath,
                {
                    force: true
                }
            );

        }
        catch {}

        try {

            fs.rmSync(
                tempRoot,
                {
                    recursive: true,
                    force: true
                }
            );

        }
        catch {}

        throw error;
    }
}

/*
 * Register before the main process registers its own
 * ready handlers. This makes snapshot restoration happen
 * first without depending on the exact main.js structure.
 */
if (app.isPackaged) {

    app.once(
        "ready",
        function() {

            try {

                restorePackagedInstallerState();

            }
            catch (error) {

                console.error(
                    "[InstallerState] Fatal snapshot restore error:",
                    error
                );

            }

        }
    );

}
`;

/* =========================================================
 * tools/prepareInstallerSnapshot.mjs
 * ========================================================= */

const snapshotSource = String.raw`
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require =
    createRequire(import.meta.url);

const Database =
    require("better-sqlite3");

const projectRoot =
    process.cwd();

const appDataRoot =
    path.join(
        process.env.APPDATA ||
            path.join(
                process.env.USERPROFILE,
                "AppData",
                "Roaming"
            ),
        "pharmabi-live"
    );

const databasePath =
    path.join(
        appDataRoot,
        "pharmabi-local.db"
    );

const seedRoot =
    path.join(
        projectRoot,
        "installer-seed"
    );

function stopElectron() {

    try {

        execFileSync(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                "Get-Process electron,'PharmaBI Live' -ErrorAction SilentlyContinue | Stop-Process -Force"
            ],
            {
                stdio: "ignore"
            }
        );

    }
    catch {}

}

function copyEntry(
    source,
    destination
) {

    if (!fs.existsSync(source)) {
        return false;
    }

    fs.cpSync(
        source,
        destination,
        {
            recursive: true
        }
    );

    return true;
}

console.log(
    "[InstallerSnapshot] Preparing snapshot..."
);

stopElectron();

await new Promise(
    function(resolve) {

        setTimeout(
            resolve,
            1500
        );

    }
);

if (!fs.existsSync(databasePath)) {

    throw new Error(
        "Database not found: " +
        databasePath
    );

}

let db = null;

try {

    db =
        new Database(
            databasePath
        );

    const integrity =
        db.pragma(
            "integrity_check",
            {
                simple: true
            }
        );

    if (integrity !== "ok") {

        throw new Error(
            "SQLite integrity check failed: " +
            String(integrity)
        );

    }

    /*
     * Merge WAL contents into the main database
     * before copying it into the installer seed.
     */
    db.pragma(
        "wal_checkpoint(TRUNCATE)"
    );

}
finally {

    if (db) {
        db.close();
    }

}

fs.rmSync(
    seedRoot,
    {
        recursive: true,
        force: true
    }
);

fs.mkdirSync(
    seedRoot,
    {
        recursive: true
    }
);

copyEntry(
    databasePath,
    path.join(
        seedRoot,
        "pharmabi-local.db"
    )
);

const cacheSource =
    path.join(
        appDataRoot,
        "persistent-cache"
    );

if (fs.existsSync(cacheSource)) {

    copyEntry(
        cacheSource,
        path.join(
            seedRoot,
            "persistent-cache"
        )
    );

}

for (
    const fileName of [
        "connection-settings.json",
        "branch-targets.json"
    ]
) {

    const sourceFile =
        path.join(
            appDataRoot,
            fileName
        );

    if (fs.existsSync(sourceFile)) {

        copyEntry(
            sourceFile,
            path.join(
                seedRoot,
                fileName
            )
        );

    }

}

const manifest = {

    createdAt:
        new Date().toISOString(),

    files: [
        "pharmabi-local.db",
        "persistent-cache",
        "connection-settings.json",
        "branch-targets.json"
    ],

    includes: [
        "master items",
        "sales",
        "customers",
        "local analytics",
        "persistent cache",
        "branch settings",
        "branch targets"
    ]

};

fs.writeFileSync(
    path.join(
        seedRoot,
        "snapshot-manifest.json"
    ),
    JSON.stringify(
        manifest,
        null,
        2
    ),
    "utf8"
);

const finalDatabase =
    path.join(
        seedRoot,
        "pharmabi-local.db"
    );

const stat =
    fs.statSync(
        finalDatabase
    );

if (stat.size <= 0) {

    throw new Error(
        "Snapshot database is empty."
    );

}

console.log(
    "[InstallerSnapshot] Snapshot created successfully."
);

console.log(
    "[InstallerSnapshot] Database size: " +
    stat.size.toLocaleString() +
    " bytes"
);

console.log(
    "[InstallerSnapshot] Seed directory: " +
    seedRoot
);
`;

/* =========================================================
 * WRITE GENERATED FILES
 * ========================================================= */

writeFile(
    bootstrapPath,
    bootstrapSource
);

writeFile(
    snapshotPath,
    snapshotSource
);

/* =========================================================
 * PATCH PACKAGE.JSON
 * ========================================================= */

const packageRaw =
    fs.readFileSync(
        packagePath,
        "utf8"
    );

const pkg =
    JSON.parse(
        packageRaw
    );

pkg.scripts =
    pkg.scripts || {};

pkg.scripts[
    "prepare:installer-snapshot"
] =
    "node tools/prepareInstallerSnapshot.mjs";

pkg.scripts.dist =
    "npm run prepare:installer-snapshot && npm run build:renderer && electron-builder --win nsis";

pkg.scripts[
    "dist:dir"
] =
    "npm run prepare:installer-snapshot && npm run build:renderer && electron-builder --win dir";

pkg.build =
    pkg.build || {};

pkg.build.extraResources =
    Array.isArray(
        pkg.build.extraResources
    )
        ? pkg.build.extraResources
        : [];

const hasSeedResource =
    pkg.build.extraResources.some(
        function(item) {

            return (
                item &&
                typeof item === "object" &&
                item.from === "installer-seed"
            );

        }
    );

if (!hasSeedResource) {

    pkg.build.extraResources.push(
        {
            from:
                "installer-seed",

            to:
                "installer-seed"
        }
    );

}

writeFile(
    packagePath,
    JSON.stringify(
        pkg,
        null,
        2
    ) + "\n"
);

/* =========================================================
 * PATCH MAIN.JS
 * ========================================================= */

let mainSource =
    fs.readFileSync(
        mainPath,
        "utf8"
    );

const importLine =
    'import { restorePackagedInstallerState } from "./installerStateBootstrap.js";';

if (
    !mainSource.includes(
        importLine
    )
) {

    /*
     * Put the import at the top.
     * No dependency on the structure of main.js.
     */
    mainSource =
        importLine +
        "\n\n" +
        mainSource;

    writeFile(
        mainPath,
        mainSource
    );

}

console.log("");
console.log(
    "Installer snapshot configuration completed successfully."
);
console.log(
    "Created: electron/installerStateBootstrap.js"
);
console.log(
    "Created: tools/prepareInstallerSnapshot.mjs"
);
console.log(
    "Updated: package.json"
);
console.log(
    "Updated: electron/main.js"
);