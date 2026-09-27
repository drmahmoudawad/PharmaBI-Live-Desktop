const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup =
    file + ".backup-before-schema-diagnostic";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const marker = "    let pool =";

const diagnostic = `
    console.log("");
    console.log("==============================================");
    console.log("[employeeSchema] START");
    console.log("==============================================");

    const cardColumns =
        await pool
            .request()
            .query(\`
                SELECT
                    c.COLUMN_NAME,
                    c.DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_SCHEMA = 'dbo'
                  AND c.TABLE_NAME = 'Cards'
                ORDER BY c.ORDINAL_POSITION;
            \`);

    console.log(
        "[employeeSchema] Cards columns:"
    );

    console.table(
        cardColumns?.recordset || []
    );

    const branchCandidates =
        await pool
            .request()
            .query(\`
                SELECT
                    TABLE_SCHEMA,
                    TABLE_NAME,
                    COLUMN_NAME,
                    DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE
                    (
                        LOWER(COLUMN_NAME) LIKE '%branch%'
                        OR LOWER(COLUMN_NAME) LIKE '%store%'
                        OR LOWER(COLUMN_NAME) LIKE '%employee%'
                        OR LOWER(COLUMN_NAME) LIKE '%staff%'
                    )
                ORDER BY
                    TABLE_NAME,
                    ORDINAL_POSITION;
            \`);

    console.log(
        "[employeeSchema] Branch/employee/store candidate columns:"
    );

    console.table(
        branchCandidates?.recordset || []
    );

    console.log(
        "[employeeSchema] END"
    );

    console.log("==============================================");
    console.log("");

`;

if (text.includes("[employeeSchema] START")) {
    console.log("DIAGNOSTIC ALREADY INSTALLED");
    process.exit(0);
}

const pos = text.indexOf(marker);

if (pos === -1) {
    throw new Error("POOL MARKER NOT FOUND");
}

text =
    text.slice(0, pos) +
    diagnostic +
    text.slice(pos);

fs.writeFileSync(file, text, "utf8");

console.log("EMPLOYEE SCHEMA DIAGNOSTIC INSTALLED");
console.log("Backup:", backup);
