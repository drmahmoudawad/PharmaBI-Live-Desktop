const fs = require("fs");
const Database = require("better-sqlite3");

const source =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db";

const destination =
    "D:\\PharmaBI-Backups\\pharmabi-local.before-master-items.db";

const GB =
    1024 ** 3;


if (!fs.existsSync(source)) {
    throw new Error(
        `Source database not found: ${source}`
    );
}


fs.mkdirSync(
    "D:\\PharmaBI-Backups",
    {
        recursive: true
    }
);


if (fs.existsSync(destination)) {
    fs.unlinkSync(destination);
}


const db =
    new Database(
        source,
        {
            readonly: true,
            fileMustExist: true
        }
    );


console.log("");
console.log("==============================================");
console.log("SQLITE DATABASE BACKUP");
console.log("==============================================");
console.log("");
console.log(
    `SOURCE      : ${source}`
);
console.log(
    `DESTINATION : ${destination}`
);
console.log("");


console.log(
    "Starting SQLite backup..."
);


db.backup(destination)
    .then(() => {

        db.close();


        const sourceSize =
            fs.statSync(source).size;

        const backupSize =
            fs.statSync(destination).size;


        console.log("");
        console.log(
            "BACKUP COMPLETED"
        );
        console.log("");

        console.log(
            `Source size : ${(sourceSize / GB).toFixed(2)} GB`
        );

        console.log(
            `Backup size : ${(backupSize / GB).toFixed(2)} GB`
        );

        console.log(
            `Backup file : ${destination}`
        );


        if (
            backupSize <= 0
        ) {

            throw new Error(
                "Backup file is empty."
            );

        }


        console.log("");
        console.log(
            "BACKUP VERIFIED."
        );
        console.log("");

    })
    .catch(error => {

        try {
            db.close();
        }
        catch {}

        console.error("");
        console.error(
            "BACKUP FAILED:"
        );
        console.error(
            error.message
        );
        console.error("");

        process.exit(1);

    });