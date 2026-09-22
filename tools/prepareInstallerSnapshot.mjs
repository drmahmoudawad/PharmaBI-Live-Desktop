
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
