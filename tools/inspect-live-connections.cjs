const fs = require("fs");

const file =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\connection-settings.json";

const data =
    JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );

console.log("");
console.log("===== SAVED BRANCHES =====");
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
        passwordEncrypted:
            entry?.passwordEncrypted === true
    });

}

console.log("");
console.log(
    `TOTAL: ${Object.keys(data.branches || {}).length}`
);