import fs from "fs";

const file = "D:/PharmaBI-Live-Desktop/src/components/CustomerAnalyticsModulePanel.jsx";

let source = fs.readFileSync(file, "utf8");

const oldText = `await customersApi.customer360(`;

const newText = `await window.pharmaBI.customers.customer360(`;

if (!source.includes(oldText)) {
    throw new Error("customersApi.customer360 reference not found.");
}

source = source.replace(oldText, newText);

fs.writeFileSync(file, source, "utf8");

console.log("Customer 360 API reference fixed.");