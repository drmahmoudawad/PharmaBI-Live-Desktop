
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
