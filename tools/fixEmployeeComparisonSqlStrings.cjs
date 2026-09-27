const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

let text = fs.readFileSync(file, "utf8");

const replacements = {
    '"ALL_EMPLOYEES" AS result_type': "'ALL_EMPLOYEES' AS result_type",
    '"SELLING_EMPLOYEES"': "'SELLING_EMPLOYEES'",
    '"EMPLOYEES_WITHOUT_SALES"': "'EMPLOYEES_WITHOUT_SALES'",
    '"SELLERS_NOT_MARKED_EMPLOYEE"': "'SELLERS_NOT_MARKED_EMPLOYEE'"
};

for (const [oldValue, newValue] of Object.entries(replacements)) {
    text = text.split(oldValue).join(newValue);
}

fs.writeFileSync(file, text, "utf8");

console.log("SQL STRING LITERALS FIXED");
