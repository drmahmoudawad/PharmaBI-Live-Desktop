const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup = file + ".backup-before-sales-filter";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const oldBlock = `
         WHERE ISNULL(c.IsEmployee,0)=1
           AND NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(400),c.Name))), '') IS NOT NULL
         ORDER BY c.Name;
`;

const newBlock = `
         WHERE ISNULL(c.IsEmployee,0)=1
           AND NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(400),c.Name))), '') IS NOT NULL
           AND EXISTS (
               SELECT 1
               FROM dbo.posTickets t
               WHERE t.PinNumber = c.ID
                 AND t.SalesReturn = 1
           )
         ORDER BY c.Name;
`;

if (!text.includes(oldBlock)) {
    throw new Error("EMPLOYEE DIRECTORY SQL BLOCK NOT FOUND");
}

text = text.replace(oldBlock, newBlock);

fs.writeFileSync(file, text, "utf8");

console.log("EMPLOYEE SALES FILTER ADDED");
console.log("Backup:", backup);
