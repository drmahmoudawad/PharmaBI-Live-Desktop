import fs from "fs";

const file =
    "D:/PharmaBI-Live-Desktop/src/components/CustomerAnalyticsModulePanel.jsx";

let source = fs.readFileSync(file, "utf8");

const oldText =
    "typeof customersApi?.customer360 !==";

const newText =
    "typeof window.pharmaBI?.customers?.customer360 !==";

if (!source.includes(oldText)) {
    throw new Error("Customer 360 guard not found.");
}

source = source.replace(oldText, newText);

fs.writeFileSync(file, source, "utf8");

console.log("Customer 360 guard fixed successfully.");