const fs = require("fs");

const file =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev\\connection-settings.json";

if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
}

const data =
    JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );

console.log("");
console.log("===== SAVED BRANCH CONNECTIONS =====");
console.log("");

for (
    const [key, entry]
    of Object.entries(data.branches || {})
) {

    console.log({
        key,
        branchId: entry?.branchId,
        branchName: entry?.branchName,
        server: entry?.server,
        port: entry?.port,
        database: entry?.database,
        user: entry?.user,
        passwordStored:
            Boolean(entry?.password),
        passwordEncrypted:
            entry?.passwordEncrypted === true
    });

}

console.log("");
console.log(
    `TOTAL: ${Object.keys(data.branches || {}).length}`
);