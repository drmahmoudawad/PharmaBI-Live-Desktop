import fs from "node:fs";
import path from "node:path";

const ROOT = "D:\\PharmaBI-Live-Desktop\\src";

const files = [
    "app/BranchEditor.jsx",
    "app/navigation.js",
    "components/AnalyticsHubPanel.jsx",
    "components/AnalyticsModulePage.jsx",
    "components/BranchPerformancePanel.jsx",
    "components/MasterManagementPanel.jsx",
    "components/CustomerAnalyticsModulePanel.jsx",
    "components/CustomerRfmPanel.jsx",
    "components/SalesAnalyticsPanel.jsx"
];

const arabic = {
    server:
        "\u0627\u0633\u0645 \u0627\u0644\u062e\u0627\u062f\u0645 \u0623\u0648 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0643\u0645\u0628\u064a\u0648\u062a\u0631",

    analytics:
        "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0641\u0627\u0631\u0645\u0627 \u0628\u064a \u0622\u064a",

    programADaily:
        "\u062a\u0646\u0628\u0624 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c A / \u064a\u0648\u0645",

    programBDaily:
        "\u062a\u0646\u0628\u0624 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c B / \u064a\u0648\u0645",

    programAMonth:
        "\u062a\u0646\u0628\u0624 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c A \u0644\u0644\u0634\u0647\u0631",

    programBMonth:
        "\u062a\u0646\u0628\u0624 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c B \u0644\u0644\u0634\u0647\u0631",

    firstNumber:
        "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0623\u0648\u0644",

    secondNumber:
        "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062b\u0627\u0646\u064a",

    allCustomers:
        "\u062c\u0645\u064a\u0639 \u0641\u0626\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    customerAnalysis:
        "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"
};

function edit(relative, callback) {

    const file =
        path.join(
            ROOT,
            relative
        );

    if (!fs.existsSync(file)) {
        console.log("SKIP:", relative);
        return;
    }

    const original =
        fs.readFileSync(
            file,
            "utf8"
        );

    const updated =
        callback(
            original
        );

    if (updated === original) {
        console.log("NO CHANGE:", relative);
        return;
    }

    fs.writeFileSync(
        file,
        updated,
        "utf8"
    );

    console.log("UPDATED:", relative);
}


/* =========================================================
 * Branch editor
 * ========================================================= */

edit(
    "app/BranchEditor.jsx",
    text =>
        text.replace(
            /placeholder="[^"]*SERVER\\\\INSTANCE[^"]*"/,
            `placeholder="${arabic.server}"`
        )
);


/* =========================================================
 * Navigation / RFM labels
 * ========================================================= */

edit(
    "app/navigation.js",
    text =>
        text
            .replaceAll(
                'label: "تحليل RFM"',
                `label: "${arabic.customerAnalysis}"`
            )
);


edit(
    "components/AnalyticsHubPanel.jsx",
    text =>
        text
            .replaceAll(
                "'customer-rfm': 'تحليل RFM'",
                `'customer-rfm': '${arabic.customerAnalysis}'`
            )
            .replaceAll(
                "PharmaBI Analytics",
                arabic.analytics
            )
);


/* =========================================================
 * Analytics module page
 * ========================================================= */

edit(
    "components/AnalyticsModulePage.jsx",
    text =>
        text
            .replaceAll(
                "PHARMABI ANALYTICS",
                arabic.analytics
            )
            .replaceAll(
                "â†’",
                "\u0625\u0644\u0649"
            )
);


/* =========================================================
 * Branch performance
 * ========================================================= */

edit(
    "components/BranchPerformancePanel.jsx",
    text => {

        let result =
            text;

        result =
            result.replace(
                /note=\{\s*`\$\{num\(days\)\}[^`]*`\s*\}/s,
                "note={`\\${num(days)} \\u064a\\u0648\\u0645`}"
            );

        result =
            result.replace(
                /(<Card\s+)(?:\r?\n\s*)label="[^"]*"(\s*\r?\n\s*value=\{money\(programA\)\}\s*\r?\n\s*note=")[^"]*"/s,
                `$1label="${arabic.programADaily}"$2${arabic.firstNumber}"`
            );

        result =
            result.replace(
                /(<Card\s+)(?:\r?\n\s*)label="[^"]*"(\s*\r?\n\s*value=\{money\(programB\)\}\s*\r?\n\s*note=")[^"]*"/s,
                `$1label="${arabic.programBDaily}"$2${arabic.secondNumber}"`
            );

        result =
            result.replace(
                /(<Card\s+)(?:\r?\n\s*)label="[^"]*"(\s*\r?\n\s*value=\{money\(programAMonth\)\})/s,
                `$1label="${arabic.programAMonth}"$2`
            );

        result =
            result.replace(
                /(<Card\s+)(?:\r?\n\s*)label="[^"]*"(\s*\r?\n\s*value=\{money\(programBMonth\)\})/s,
                `$1label="${arabic.programBMonth}"$2`
            );

        result =
            result.replaceAll(
                "PharmaBI Analytics",
                arabic.analytics
            );

        return result;
    }
);


/* =========================================================
 * Master management
 * ========================================================= */

edit(
    "components/MasterManagementPanel.jsx",
    text =>
        text.replace(
            /placeholder="[^"]*Master[^"]*"/,
            'placeholder="\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0627\u0644\u0631\u0626\u064a\u0633\u064a \u0623\u0648 \u0627\u0644\u0643\u0648\u062f"'
        )
);


/* =========================================================
 * Remove English RFM from visible labels
 * ========================================================= */

edit(
    "components/CustomerAnalyticsModulePanel.jsx",
    text =>
        text
            .replaceAll(
                "تحليل RFM",
                arabic.customerAnalysis
            )
            .replaceAll(
                "فئات RFM",
                "\u0641\u0626\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621"
            )
            .replaceAll(
                "كل فئات RFM",
                arabic.allCustomers
            )
);


edit(
    "components/CustomerRfmPanel.jsx",
    text =>
        text
            .replaceAll(
                "تحليل RFM",
                arabic.customerAnalysis
            )
            .replaceAll(
                "فئات RFM",
                "\u0641\u0626\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621"
            )
            .replaceAll(
                "كل فئات RFM",
                arabic.allCustomers
            )
);


/* =========================================================
 * Sales analytics
 * ========================================================= */

edit(
    "components/SalesAnalyticsPanel.jsx",
    text => {

        let result =
            text;

        result =
            result.replace(
                /return "Sales Trend";/g,
                'return "\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a";'
            );

        result =
            result.replace(
                /return "Sellers";/g,
                'return "\u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646";'
            );

        result =
            result.replace(
                /return "Returns";/g,
                'return "\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a";'
            );

        result =
            result.replace(
                /return "Sales Overview";/g,
                'return "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a";'
            );

        result =
            result.replaceAll(
                'title="Preview"',
                'title="\u0645\u0639\u0627\u064a\u0646\u0629"'
            );

        result =
            result.replaceAll(
                'title="Summary"',
                'title="\u0627\u0644\u0645\u0644\u062e\u0635"'
            );

        result =
            result.replaceAll(
                'title="By Day"',
                'title="\u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645"'
            );

        result =
            result.replaceAll(
                'title="By Hour"',
                'title="\u062d\u0633\u0628 \u0627\u0644\u0633\u0627\u0639\u0629"'
            );

        result =
            result.replaceAll(
                '"Normalized sales path"',
                '"\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0645\u0648\u062d\u0651\u062f"'
            );

        result =
            result.replaceAll(
                '"Daily aggregation"',
                '"\u062a\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u064a\u0648\u0645"'
            );

        result =
            result.replaceAll(
                'SQL Performance Test',
                "\u0627\u062e\u062a\u0628\u0627\u0631 \u0623\u062f\u0627\u0621 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a"
            );

        result =
            result.replaceAll(
                'Sales + reconciliation',
                "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a + \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"
            );

        result =
            result.replaceAll(
                'Total Test Time',
                "\u0625\u062c\u0645\u0627\u0644\u064a \u0648\u0642\u062a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631"
            );

        result =
            result.replaceAll(
                'Recent Sales Preview',
                "\u0645\u0639\u0627\u064a\u0646\u0629 \u0623\u062d\u062f\u062b \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"
            );

        result =
            result.replaceAll(
                'Daily Performance',
                "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u064a\u0648\u0645\u064a"
            );

        result =
            result.replaceAll(
                'Hourly Performance',
                "\u0627\u0644\u0623\u062f\u0627\u0621 \u062d\u0633\u0628 \u0627\u0644\u0633\u0627\u0639\u0629"
            );

        result =
            result.replaceAll(
                'Net Sales after Returns',
                "\u0635\u0627\u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0628\u0639\u062f \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"
            );

        result =
            result.replaceAll(
                'Return Cost',
                "\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"
            );

        result =
            result.replaceAll(
                'Sellers Analytics',
                "\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646"
            );

        result =
            result.replaceAll(
                'Gross Sales',
                "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a"
            );

        result =
            result.replaceAll(
                'Net Cost',
                "\u0635\u0627\u0641\u064a \u0627\u0644\u062a\u0643\u0644\u0641\u0629"
            );

        result =
            result.replaceAll(
                'Net Profit',
                "\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0628\u062d"
            );

        result =
            result.replaceAll(
                'Average Ticket',
                "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629"
            );

        return result;
    }
);

console.log("");
console.log(
    "========================================"
);
console.log(
    "\u062a\u0645 \u062a\u0635\u062d\u064a\u062d \u0627\u0644\u0628\u0642\u0627\u064a\u0627 \u0627\u0644\u0644\u063a\u0648\u064a\u0629 \u0641\u064a \u0627\u0644\u0648\u0627\u062c\u0647\u0629."
);
console.log(
    "========================================"
);