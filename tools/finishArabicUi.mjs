import fs from "node:fs";
import path from "node:path";

const ROOT = "D:\\PharmaBI-Live-Desktop\\src";

const translations = new Map([
    ["Saved Branches", "\u0627\u0644\u0641\u0631\u0648\u0639 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629"],
    ["Active Connections", "\u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629"],
    ["Data Coverage", "\u062a\u063a\u0637\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a"],
    ["Net Profit", "\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0628\u062d"],
    ["Missing Cost", "\u062a\u0643\u0644\u0641\u0629 \u0645\u0641\u0642\u0648\u062f\u0629"],
    ["Zero Cost", "\u062a\u0643\u0644\u0641\u0629 \u0635\u0641\u0631\u064a\u0629"],
    ["PharmaBI Analytics", "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0641\u0627\u0631\u0645\u0627 \u0628\u064a \u0622\u064a"],

    ["Known Customers", "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0633\u062c\u0644\u0648\u0646"],
    ["Previous Customers", "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0633\u0627\u0628\u0642\u0648\u0646"],
    ["Current Customers", "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u062d\u0627\u0644\u064a\u0648\u0646"],
    ["Active \u2264 30 Days", "\u0646\u0634\u0637 \u062e\u0644\u0627\u0644 30 \u064a\u0648\u0645\u064b\u0627 \u0623\u0648 \u0623\u0642\u0644"],
    ["Inactive \u2265 30 Days", "\u063a\u064a\u0631 \u0646\u0634\u0637 \u0645\u0646\u0630 30 \u064a\u0648\u0645\u064b\u0627 \u0623\u0648 \u0623\u0643\u062b\u0631"],
    ["Inactive \u2265 60 Days", "\u063a\u064a\u0631 \u0646\u0634\u0637 \u0645\u0646\u0630 60 \u064a\u0648\u0645\u064b\u0627 \u0623\u0648 \u0623\u0643\u062b\u0631"],
    ["Inactive \u2265 90 Days", "\u063a\u064a\u0631 \u0646\u0634\u0637 \u0645\u0646\u0630 90 \u064a\u0648\u0645\u064b\u0627 \u0623\u0648 \u0623\u0643\u062b\u0631"],
    ["Inactive 90 Days", "\u063a\u064a\u0631 \u0646\u0634\u0637 \u0645\u0646\u0630 90 \u064a\u0648\u0645\u064b\u0627"],

    ["Observed Net Sales", "\u0635\u0627\u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0641\u0639\u0644\u064a\u0629"],
    ["Top Customers by Observed Value", "\u0623\u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u062d\u0633\u0628 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0641\u0639\u0644\u064a\u0629"],
    ["Initial Cohort Sales", "\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0634\u0631\u064a\u062d\u0629 \u0639\u0646\u062f \u0627\u0644\u0628\u062f\u0627\u064a\u0629"],
    ["Observed Cohort Sales", "\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0634\u0631\u064a\u062d\u0629 \u0627\u0644\u0641\u0639\u0644\u064a\u0629"],
    ["Initial Sales", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0639\u0646\u062f \u0627\u0644\u0628\u062f\u0627\u064a\u0629"],
    ["Observed Sales", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0641\u0639\u0644\u064a\u0629"],
    ["Sales / Active Customer", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0644\u0643\u0644 \u0639\u0645\u064a\u0644 \u0646\u0634\u0637"],

    ["Priority Customers", "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0630\u0648\u0648 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629"],
    ["Customer RFM", "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"],
    ["فئات RFM", "\u0641\u0626\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621"],
    ["كل فئات RFM", "\u062c\u0645\u064a\u0639 \u0641\u0626\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621"],

    ["Product Mix Analytics", "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0645\u0632\u064a\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"],
    ["Product Mix", "\u0645\u0632\u064a\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"],
    ["Current Sales", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u064a\u0629"],
    ["Last Year Sales", "\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0627\u0636\u064a"],
    ["YoY Sales", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0627\u0636\u064a"],
    ["Product Mix Change", "\u0627\u0644\u062a\u063a\u064a\u0631 \u0641\u064a \u0645\u0632\u064a\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"],
    ["Current Products", "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u064a\u0629"],

    ["Product Profitability", "\u0631\u0628\u062d\u064a\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"],
    ["Gross Sales", "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"],
    ["Negative Margin Products", "\u0645\u0646\u062a\u062c\u0627\u062a \u0628\u0647\u0627\u0645\u0634 \u0631\u0628\u062d \u0633\u0644\u0628\u064a"],
    ["Most Profitable Products", "\u0623\u0643\u062b\u0631 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0631\u0628\u062d\u064a\u0629"],

    ["Sales Trend", "\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"],
    ["Sellers", "\u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646"],
    ["Returns", "\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"],
    ["Sales Overview", "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"],
    ["SQL Performance Test", "\u0627\u062e\u062a\u0628\u0627\u0631 \u0623\u062f\u0627\u0621 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a"],
    ["Sales + reconciliation", "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a + \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"],
    ["Total Test Time", "\u0625\u062c\u0645\u0627\u0644\u064a \u0648\u0642\u062a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"],
    ["Average Ticket", "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629"],
    ["Recent Sales Preview", "\u0645\u0639\u0627\u064a\u0646\u0629 \u0623\u062d\u062f\u062b \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"],
    ["Daily Performance", "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u064a\u0648\u0645\u064a"],
    ["Hourly Performance", "\u0627\u0644\u0623\u062f\u0627\u0621 \u062d\u0633\u0628 \u0627\u0644\u0633\u0627\u0639\u0629"],
    ["Net Sales after Returns", "\u0635\u0627\u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0628\u0639\u062f \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"],
    ["Return Cost", "\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"],
    ["Sellers Analytics", "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646"],
    ["Header Total", "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a"],

    ["Top Products", "\u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"],
    ["Products Analytics", "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"]
]);

function getFiles(dir) {

    const result = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {

            result.push(
                ...getFiles(fullPath)
            );

            continue;
        }

        if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
            result.push(fullPath);
        }
    }

    return result;
}

const files =
    getFiles(ROOT);

let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {

    const original =
        fs.readFileSync(
            file,
            "utf8"
        );

    let text =
        original;

    for (const [english, arabic] of translations) {

        const escaped =
            english.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

        const patterns = [

            new RegExp(
                `(["'])${escaped}\\1`,
                "g"
            ),

            new RegExp(
                `>(\\s*)${escaped}(\\s*)<`,
                "g"
            )
        ];

        for (const pattern of patterns) {

            text =
                text.replace(
                    pattern,
                    (...args) => {

                        totalReplacements++;

                        if (
                            args.length >= 4 &&
                            args[2] !== undefined
                        ) {
                            const prefix =
                                args[1];

                            const suffix =
                                args[2];

                            return (
                                ">" +
                                prefix +
                                arabic +
                                suffix +
                                "<"
                            );
                        }

                        return `"${arabic}"`;
                    }
                );
        }
    }

    text =
        text.replace(
            /Top \{result\.limit\} Products/g,
            "\u0623\u0641\u0636\u0644 {result.limit} \u0645\u0646\u062a\u062c\u0627\u062a"
        );

    if (text === original) {
        continue;
    }

    fs.writeFileSync(
        file,
        text,
        "utf8"
    );

    changedFiles++;

    console.log(
        "UPDATED:",
        path.relative(ROOT, file)
    );
}

console.log("");
console.log(
    "========================================"
);
console.log(
    "\u062a\u0645 \u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u062a\u0639\u0631\u064a\u0628 \u0627\u0644\u0648\u0627\u062c\u0647\u0629."
);
console.log(
    "Changed files:",
    changedFiles
);
console.log(
    "Replacements:",
    totalReplacements
);
console.log(
    "========================================"
);