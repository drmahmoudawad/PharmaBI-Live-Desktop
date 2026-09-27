const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-sales-filter-v2";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

if (text.includes("AND EXISTS") && text.includes("t.PinNumber = c.ID")) {
    console.log("SALES FILTER ALREADY EXISTS");
    process.exit(0);
}

const queryStart = text.indexOf("FROM dbo.Cards c");

if (queryStart === -1) {
    throw new Error("FROM dbo.Cards c NOT FOUND");
}

const orderPos = text.indexOf("ORDER BY c.Name;", queryStart);

if (orderPos === -1) {
    throw new Error("ORDER BY c.Name; NOT FOUND");
}

const insertText = `
           AND EXISTS (
               SELECT 1
               FROM dbo.posTickets t
               WHERE t.PinNumber = c.ID
                 AND t.SalesReturn = 1
           )
`;

text =
    text.slice(0, orderPos) +
    insertText +
    text.slice(orderPos);

fs.writeFileSync(file, text, "utf8");

console.log("EMPLOYEE SALES FILTER ADDED SUCCESSFULLY");
console.log("Backup:", backup);
