import fs from "node:fs";
import path from "node:path";

const PROJECT =
    "D:\\PharmaBI-Live-Desktop";

const SRC =
    path.join(
        PROJECT,
        "src"
    );

const BACKUP =
    path.join(
        PROJECT,
        "tools",
        "ui-arabic-backup-" +
        new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
    );

const UI_PROPERTIES =
    [
        "title",
        "label",
        "placeholder",
        "aria-label",
        "alt",
        "helperText",
        "emptyText",
        "buttonLabel",
        "header",
        "caption",
        "description",
        "message",
        "tooltip",
        "heading",
        "subtitle",
        "tabLabel",
        "actionLabel",
        "buttonText",
        "emptyMessage",
        "errorMessage",
        "successMessage",
        "warningMessage",
        "infoMessage",
        "statusText",
        "children"
    ];

const TRANSLATIONS = {

    "MAIN":
        "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",

    "Dashboard":
        "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",

    "Business Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u0634\u0627\u0637",

    "Branch Health":
        "\u062d\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Alerts & Opportunities":
        "\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u0641\u0631\u0635",

    "Customers":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Customer Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Customer RFM":
        "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "RFM":
        "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Retention":
        "\u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Churn / Inactivity":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u063a\u064a\u0631 \u0627\u0644\u0646\u0634\u0637\u064a\u0646",

    "Customer Lifetime Value":
        "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629 \u0644\u0644\u0639\u0645\u064a\u0644",

    "Cohort Analysis":
        "\u062a\u062d\u0644\u064a\u0644 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "CRM":
        "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Products":
        "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",

    "Product Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",

    "Top Products":
        "\u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",

    "ABC Analysis":
        "\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",

    "Stock Risk":
        "\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Inventory":
        "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Inventory Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Inventory Risk":
        "\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Reorder Analysis":
        "\u062a\u062d\u0644\u064a\u0644 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0637\u0644\u0628",

    "Procurement":
        "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",

    "Purchase Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",

    "Supplier Performance":
        "\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646",

    "Purchase Opportunities":
        "\u0641\u0631\u0635 \u0627\u0644\u0634\u0631\u0627\u0621",

    "Profitability":
        "\u0627\u0644\u0631\u0628\u062d\u064a\u0629",

    "Profit Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u0628\u0627\u062d",

    "Profit by Branch":
        "\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u062d\u0633\u0628 \u0627\u0644\u0641\u0631\u0639",

    "Profit by Product":
        "\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u0646\u062a\u062c",

    "Cost Anomalies":
        "\u0627\u062e\u062a\u0644\u0627\u0641\u0627\u062a \u0627\u0644\u062a\u0643\u0644\u0641\u0629",

    "Branches":
        "\u0627\u0644\u0641\u0631\u0648\u0639",

    "Branch Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Branch Comparison":
        "\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Branch Ranking":
        "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Staff":
        "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646",

    "Staff Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",

    "Sales by Seller":
        "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0628\u0627\u0626\u0639",

    "Productivity":
        "\u0627\u0644\u0625\u0646\u062a\u0627\u062c\u064a\u0629",

    "Forecasting":
        "\u0627\u0644\u062a\u0648\u0642\u0639\u0627\u062a",

    "Sales Forecast":
        "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",

    "Demand Forecast":
        "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0637\u0644\u0628",

    "Inventory Forecast":
        "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Data Quality":
        "\u062c\u0648\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",

    "Cost Quality":
        "\u062c\u0648\u062f\u0629 \u0627\u0644\u062a\u0643\u0644\u0641\u0629",

    "Sales Reconciliation":
        "\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",

    "System":
        "\u0627\u0644\u0646\u0638\u0627\u0645",

    "Branch Connections":
        "\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0627\u0644\u0641\u0631\u0648\u0639",

    "Cache Status":
        "\u062d\u0627\u0644\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0646\u0629",

    "ANALYTICS":
        "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",

    "MARKETING":
        "\u0627\u0644\u062a\u0633\u0648\u064a\u0642",

    "Search...":
        "\u0627\u0628\u062d\u062b...",

    "Search":
        "\u0628\u062d\u062b",

    "Filter":
        "\u062a\u0635\u0641\u064a\u0629",

    "Filters":
        "\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062a\u0635\u0641\u064a\u0629",

    "Apply":
        "\u062a\u0637\u0628\u064a\u0642",

    "Clear":
        "\u0645\u0633\u062d",

    "Refresh":
        "\u062a\u062d\u062f\u064a\u062b",

    "Save":
        "\u062d\u0641\u0638",

    "Cancel":
        "\u0625\u0644\u063a\u0627\u0621",

    "Close":
        "\u0625\u0636\u063a\u0644\u0627\u0642",

    "Delete":
        "\u062d\u0630\u0641",

    "Edit":
        "\u062a\u0639\u062f\u064a\u0644",

    "Add":
        "\u0625\u0636\u0627\u0641\u0629",

    "Export Excel":
        "\u062a\u0635\u062f\u064a\u0631 \u0625\u0644\u0649 \u0625\u0643\u0633\u0644",

    "Export":
        "\u062a\u0635\u062f\u064a\u0631",

    "Loading":
        "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644",

    "No data":
        "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a",

    "No results":
        "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c",

    "Retry":
        "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",

    "Back":
        "\u0631\u062c\u0648\u0639",

    "Next":
        "\u0627\u0644\u062a\u0627\u0644\u064a",

    "Previous":
        "\u0627\u0644\u0633\u0627\u0628\u0642",

    "View Details":
        "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",

    "Sales":
        "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",

    "Returns":
        "\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a",

    "Net Sales":
        "\u0635\u0627\u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",

    "Revenue":
        "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",

    "Cost":
        "\u0627\u0644\u062a\u0643\u0644\u0641\u0629",

    "Profit":
        "\u0627\u0644\u0631\u0628\u062d",

    "Gross Profit":
        "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0631\u0628\u062d",

    "Profit Margin":
        "\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d",

    "Growth":
        "\u0645\u0639\u062f\u0644 \u0627\u0644\u0646\u0645\u0648",

    "Target":
        "\u0627\u0644\u0647\u062f\u0641",

    "Forecast":
        "\u0627\u0644\u062a\u0648\u0642\u0639",

    "Performance":
        "\u0627\u0644\u0623\u062f\u0627\u0621",

    "Invoices":
        "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",

    "Number of Invoices":
        "\u0639\u062f\u062f \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",

    "Average Invoice":
        "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",

    "Customer Count":
        "\u0639\u062f\u062f \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Seller":
        "\u0627\u0644\u0628\u0627\u0626\u0639",

    "Sellers":
        "\u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646",

    "Quantity":
        "\u0627\u0644\u0643\u0645\u064a\u0629",

    "Product":
        "\u0627\u0644\u0645\u0646\u062a\u062c",

    "Rank":
        "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",

    "Ranking":
        "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",

    "Percentage":
        "\u0627\u0644\u0646\u0633\u0628\u0629",

    "Average":
        "\u0627\u0644\u0645\u062a\u0648\u0633\u0637",

    "Total":
        "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",

    "Actual":
        "\u0627\u0644\u0641\u0639\u0644\u064a",

    "Variance":
        "\u0627\u0644\u0641\u0631\u0642",

    "Achievement":
        "\u0646\u0633\u0628\u0629 \u062a\u062d\u0642\u064a\u0642 \u0627\u0644\u0647\u062f\u0641",

    "Branch Performance":
        "\u0623\u062f\u0627\u0621 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Current Performance":
        "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u062d\u0627\u0644\u064a",

    "Average Daily Sales":
        "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629",

    "Monthly Sales":
        "\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0634\u0647\u0631",

    "Daily Sales":
        "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629",

    "Program Forecast":
        "\u062a\u0648\u0642\u0639 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c",

    "Management Forecast":
        "\u062a\u0648\u0642\u0639 \u0627\u0644\u0625\u062f\u0627\u0631\u0629",

    "Management Target":
        "\u0647\u062f\u0641 \u0627\u0644\u0625\u062f\u0627\u0631\u0629",

    "Target A":
        "\u0627\u0644\u0647\u062f\u0641 \u0623",

    "Target B":
        "\u0627\u0644\u0647\u062f\u0641 \u0628",

    "Variance from Target":
        "\u0627\u0644\u0641\u0631\u0642 \u0639\u0646 \u0627\u0644\u0647\u062f\u0641",

    "Forecast Accuracy":
        "\u062f\u0642\u0629 \u0627\u0644\u062a\u0648\u0642\u0639",

    "Daily Target":
        "\u0627\u0644\u0647\u062f\u0641 \u0627\u0644\u064a\u0648\u0645\u064a",

    "Monthly Target":
        "\u0627\u0644\u0647\u062f\u0641 \u0627\u0644\u0634\u0647\u0631\u064a",

    "Customer 360":
        "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u0627\u0645\u0644 \u0644\u0644\u0639\u0645\u064a\u0644",

    "Customer Details":
        "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644",

    "Customer Profile":
        "\u0645\u0644\u0641 \u0627\u0644\u0639\u0645\u064a\u0644",

    "Customer History":
        "\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u064a\u0644",

    "Customer Invoices":
        "\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0639\u0645\u064a\u0644",

    "Customer Activity":
        "\u0646\u0634\u0627\u0637 \u0627\u0644\u0639\u0645\u064a\u0644",

    "Returning Customer":
        "\u0639\u0645\u064a\u0644 \u0639\u0627\u0626\u062f",

    "Lost Customer":
        "\u0639\u0645\u064a\u0644 \u0645\u0641\u0642\u0648\u062f",

    "Dormant":
        "\u0639\u0645\u064a\u0644 \u062e\u0627\u0645\u0644",

    "Champions":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0645\u064a\u0632\u0648\u0646",

    "Loyal Customers":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062e\u0644\u0635\u0648\u0646",

    "New Customers":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u062c\u062f\u062f",

    "At Risk":
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0639\u0631\u0636\u0648\u0646 \u0644\u0644\u0641\u0642\u062f",

    "Follow Up":
        "\u0645\u062a\u0627\u0628\u0639\u0629",

    "Follow-up":
        "\u0645\u062a\u0627\u0628\u0639\u0629",

    "Response":
        "\u0627\u0644\u0631\u062f",

    "Campaign":
        "\u0627\u0644\u062d\u0645\u0644\u0629",

    "Campaigns":
        "\u0627\u0644\u062d\u0645\u0644\u0627\u062a",

    "WhatsApp":
        "\u0648\u0627\u062a\u0633\u0627\u0628",

    "WhatsApp Campaigns":
        "\u062d\u0645\u0644\u0627\u062a \u0648\u0627\u062a\u0633\u0627\u0628",

    "Message":
        "\u0627\u0644\u0631\u0633\u0627\u0644\u0629",

    "Messages":
        "\u0627\u0644\u0631\u0633\u0627\u0626\u0644",

    "Sent":
        "\u062a\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644",

    "Delivered":
        "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",

    "Read":
        "\u062a\u0645\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629",

    "Replied":
        "\u062a\u0645\u062a \u0627\u0644\u0625\u062c\u0627\u0628\u0629",

    "Last Contact":
        "\u0622\u062e\u0631 \u062a\u0648\u0627\u0635\u0644",

    "Next Follow-up":
        "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629",

    "Data":
        "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",

    "Status":
        "\u0627\u0644\u062d\u0627\u0644\u0629",

    "Active":
        "\u064a\u0639\u0645\u0644",

    "Inactive":
        "\u0645\u062a\u0648\u0642\u0641",

    "Success":
        "\u062a\u0645\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0628\u0646\u062c\u0627\u062d",

    "Failed":
        "\u062a\u0639\u0630\u0631\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629",

    "Warning":
        "\u062a\u0646\u0628\u064a\u0647",

    "Information":
        "\u0645\u0639\u0644\u0648\u0645\u0627\u062a",

    "Connected":
        "\u0645\u062a\u0635\u0644",

    "Disconnected":
        "\u063a\u064a\u0631 \u0645\u062a\u0635\u0644",

    "Connecting":
        "\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644",

    "Connection Failed":
        "\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644",

    "Online":
        "\u0645\u062a\u0635\u0644",

    "Offline":
        "\u063a\u064a\u0631 \u0645\u062a\u0635\u0644",

    "Last Sync":
        "\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b \u0644\u0644\u0628\u064a\u0627\u0646\u0627\u062a",

    "Sync":
        "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",

    "Syncing":
        "\u062c\u0627\u0631\u064d \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",

    "Cache":
        "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0646\u0629 \u0645\u0624\u0642\u062a\u064b\u0627",

    "Error":
        "\u062e\u0637\u0623",

    "Pending":
        "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",

    "Completed":
        "\u0645\u0643\u062a\u0645\u0644",

    "Processing":
        "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0646\u0641\u064a\u0630",

    "Today":
        "\u0627\u0644\u064a\u0648\u0645",

    "This Month":
        "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",

    "Current Month":
        "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a",

    "Date":
        "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",

    "From":
        "\u0645\u0646",

    "To":
        "\u0625\u0644\u0649",

    "All Branches":
        "\u062c\u0645\u064a\u0639 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Branch":
        "\u0627\u0644\u0641\u0631\u0639",

    "Top Sellers":
        "\u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646",

    "Best Sellers":
        "\u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646",

    "Day / Hour":
        "\u0627\u0644\u064a\u0648\u0645 / \u0627\u0644\u0633\u0627\u0639\u0629",

    "Overview":
        "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",

    "Summary":
        "\u0627\u0644\u0645\u0644\u062e\u0635",

    "Details":
        "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",

    "History":
        "\u0627\u0644\u0633\u062c\u0644",

    "Activity":
        "\u0627\u0644\u0646\u0634\u0627\u0637",

    "Analytics":
        "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",

    "Report":
        "\u0627\u0644\u062a\u0642\u0631\u064a\u0631",

    "Reports":
        "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",

    "Settings":
        "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",

    "Connection":
        "\u0627\u0644\u0627\u062a\u0635\u0627\u0644",

    "Connections":
        "\u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a",

    "Employees":
        "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646",

    "Employee":
        "\u0627\u0644\u0645\u0648\u0638\u0641",

    "Evaluation":
        "\u0627\u0644\u062a\u0642\u064a\u064a\u0645",

    "PharmaBI":
        "\u0641\u0627\u0631\u0645\u0627 \u0628\u064a \u0622\u064a"
};

function escapeRegex(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

function getFiles(dir) {

    const result = [];

    for (
        const entry of fs.readdirSync(
            dir,
            {
                withFileTypes: true
            }
        )
    ) {

        const full =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {

            result.push(
                ...getFiles(full)
            );

            continue;
        }

        if (
            /\.(js|jsx|ts|tsx)$/.test(
                entry.name
            )
        ) {
            result.push(full);
        }
    }

    return result;
}

function replaceUiText(
    source
) {

    let text =
        source;

    let replacements =
        0;

    const propertyGroup =
        UI_PROPERTIES
            .map(escapeRegex)
            .join("|");

    for (
        const [
            english,
            arabic
        ] of Object.entries(
            TRANSLATIONS
        )
    ) {

        const key =
            escapeRegex(
                english
            );

        const objectPattern =
            new RegExp(
                "(\\b(?:" +
                propertyGroup +
                ")\\s*:\\s*)([\"'])" +
                key +
                "\\2",
                "g"
            );

        text =
            text.replace(
                objectPattern,
                (
                    match,
                    prefix,
                    quote
                ) => {

                    replacements++;

                    return (
                        prefix +
                        quote +
                        arabic +
                        quote
                    );
                }
            );

        const attributePattern =
            new RegExp(
                "(\\s(?:" +
                propertyGroup +
                ")\\s*=\\s*)([\"'])" +
                key +
                "\\2",
                "g"
            );

        text =
            text.replace(
                attributePattern,
                (
                    match,
                    prefix,
                    quote
                ) => {

                    replacements++;

                    return (
                        prefix +
                        quote +
                        arabic +
                        quote
                    );
                }
            );

        const jsxTextPattern =
            new RegExp(
                "(>\\s*)" +
                key +
                "(\\s*<)",
                "g"
            );

        text =
            text.replace(
                jsxTextPattern,
                (
                    match,
                    prefix,
                    suffix
                ) => {

                    replacements++;

                    return (
                        prefix +
                        arabic +
                        suffix
                    );
                }
            );

        const jsxExpressionPattern =
            new RegExp(
                "(\\{\\s*[\"'])" +
                key +
                "([\"']\\s*\\})",
                "g"
            );

        text =
            text.replace(
                jsxExpressionPattern,
                (
                    match,
                    prefix,
                    suffix
                ) => {

                    replacements++;

                    return (
                        prefix +
                        arabic +
                        suffix
                    );
                }
            );
    }

    return {
        text,
        replacements
    };
}

function findEnglishUiCandidates(
    source,
    file
) {

    const candidates =
        [];

    const lines =
        source.split(
            /\r?\n/
        );

    const englishPattern =
        /\b(?:Dashboard|Customers|Products|Branches|Sales|Returns|Profit|Cost|Target|Forecast|Performance|Settings|Search|Refresh|Save|Cancel|Delete|Edit|Add|Export|Loading|Error|Connected|Disconnected|Active|Inactive|Today|Summary|Details|History|Analytics|Report|Reports|WhatsApp|Message|Messages|Employee|Employees|Seller|Sellers|Product|Quantity|Total|Average|Status|Data|System|Inventory|Procurement|Forecasting|Staff|CRM|RFM|Online|Offline|Pending|Completed|Processing)\b/;

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        if (
            englishPattern.test(
                lines[i]
            )
        ) {

            candidates.push(
                `${file}:${i + 1}: ${lines[i].trim()}`
            );
        }
    }

    return candidates;
}

fs.mkdirSync(
    BACKUP,
    {
        recursive: true
    }
);

const files =
    getFiles(
        SRC
    );

let changedFiles =
    0;

let totalReplacements =
    0;

const remaining =
    [];

for (
    const file of files
) {

    const original =
        fs.readFileSync(
            file,
            "utf8"
        );

    const relative =
        path.relative(
            SRC,
            file
        );

    const result =
        replaceUiText(
            original
        );

    remaining.push(
        ...findEnglishUiCandidates(
            result.text,
            relative
        )
    );

    if (
        result.text ===
        original
    ) {
        continue;
    }

    const backupFile =
        path.join(
            BACKUP,
            relative
        );

    fs.mkdirSync(
        path.dirname(
            backupFile
        ),
        {
            recursive: true
        }
    );

    fs.copyFileSync(
        file,
        backupFile
    );

    fs.writeFileSync(
        file,
        result.text,
        "utf8"
    );

    changedFiles++;

    totalReplacements +=
        result.replacements;

    console.log(
        "UPDATED:",
        relative,
        "replacements:",
        result.replacements
    );
}

const report =
    path.join(
        PROJECT,
        "tools",
        "ui-english-review.txt"
    );

fs.writeFileSync(
    report,
    remaining.length
        ? remaining.join("\n") + "\n"
        : "لا توجد نصوص إنجليزية مرشحة بعد التعريب.\n",
    "utf8"
);

console.log("");
console.log(
    "========================================"
);
console.log(
    "تم تعريب نصوص الواجهة المحددة."
);
console.log(
    "الملفات المعدلة:",
    changedFiles
);
console.log(
    "عدد الاستبدالات:",
    totalReplacements
);
console.log(
    "نسخة الاحتياط:",
    BACKUP
);
console.log(
    "تقرير النصوص الإنجليزية المتبقية:",
    report
);
console.log(
    "========================================"
);