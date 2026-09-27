import fs from "fs";

const file =
    "D:/PharmaBI-Live-Desktop/src/components/CustomerAnalyticsModulePanel.jsx";

let source = fs.readFileSync(file, "utf8");

const pattern =
    /customersApi\s*\.\s*customer360/g;

const matches = source.match(pattern) || [];

console.log(
    `Found ${matches.length} customersApi.customer360 reference(s).`
);

if (matches.length === 0) {
    throw new Error(
        "No customersApi.customer360 reference found in the current source file."
    );
}

source = source.replace(
    pattern,
    "window.pharmaBI.customers.customer360"
);

fs.writeFileSync(file, source, "utf8");

console.log("Customer 360 reference fixed successfully.");