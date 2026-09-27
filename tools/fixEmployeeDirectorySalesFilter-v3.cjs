const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-sales-filter-v3";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

if (
    text.includes("t.PinNumber = c.ID") &&
    text.includes("t.SalesReturn = 1")
) {
    console.log("SALES FILTER ALREADY EXISTS");
    process.exit(0);
}

const queryStart = text.search(/FROM\s+dbo\.Cards\s+c/i);

if (queryStart === -1) {
    throw new Error("EMPLOYEE CARDS QUERY NOT FOUND");
}

const afterFrom = text.slice(queryStart);

const orderMatch = afterFrom.match(/\bORDER\s+BY\b/i);

const filter = `
           AND EXISTS (
               SELECT 1
               FROM dbo.posTickets t
               WHERE t.PinNumber = c.ID
                 AND t.SalesReturn = 1
           )
`;

if (orderMatch) {
    const insertPos = queryStart + orderMatch.index;

    text =
        text.slice(0, insertPos) +
        filter +
        text.slice(insertPos);
} else {
    const queryEndMatch = afterFrom.match(/`\s*\)\s*;/);

    if (!queryEndMatch) {
        throw new Error("EMPLOYEE DIRECTORY QUERY END NOT FOUND");
    }

    const insertPos =
        queryStart + queryEndMatch.index;

    text =
        text.slice(0, insertPos) +
        filter +
        text.slice(insertPos);
}

fs.writeFileSync(file, text, "utf8");

console.log("EMPLOYEE SALES FILTER ADDED SUCCESSFULLY");
console.log("Backup:", backup);
