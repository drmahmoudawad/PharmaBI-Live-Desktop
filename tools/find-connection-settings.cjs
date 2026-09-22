const fs = require("fs");
const path = require("path");
const os = require("os");

const roots = [
    path.join(os.homedir(), "AppData", "Roaming"),
    path.join(os.homedir(), "AppData", "Local"),
    path.join(os.homedir(), "Documents")
];

console.log("");
console.log("===== SEARCHING FOR connection-settings.json =====");
console.log("");

for (const root of roots) {

    if (!fs.existsSync(root)) {
        continue;
    }

    function walk(dir) {

        let entries;

        try {
            entries = fs.readdirSync(
                dir,
                {
                    withFileTypes: true
                }
            );
        }
        catch {
            return;
        }

        for (const entry of entries) {

            const full =
                path.join(
                    dir,
                    entry.name
                );

            if (entry.isDirectory()) {

                walk(full);

                continue;
            }

            if (
                entry.isFile() &&
                entry.name.toLowerCase() ===
                    "connection-settings.json"
            ) {

                console.log(full);

            }

        }

    }

    walk(root);
}

console.log("");
console.log("===== DONE =====");