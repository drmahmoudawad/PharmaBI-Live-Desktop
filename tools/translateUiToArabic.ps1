$ErrorActionPreference = "Stop"

$project = "D:\PharmaBI-Live-Desktop"
$sourceRoot = Join-Path $project "src"
$scriptPath = Join-Path $project "tools\translateUiToArabic.ps1"
$backupRoot = Join-Path $project ("tools\ui-ar-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

if (-not (Test-Path -LiteralPath $sourceRoot)) {
    throw "src folder not found: $sourceRoot"
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$json = @'
{
    "MAIN": "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
    "Dashboard": "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
    "Business Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0646\u0634\u0627\u0637",
    "Branch Health": "\u062d\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0648\u0639",
    "Alerts & Opportunities": "\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u0641\u0631\u0635",

    "Customers": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "Customer Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "Customer RFM": "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "RFM": "\u062a\u062d\u0644\u064a\u0644 \u0633\u0644\u0648\u0643 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "Retention": "\u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "Churn / Inactivity": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u063a\u064a\u0631 \u0627\u0644\u0646\u0634\u0637\u064a\u0646",
    "Customer Lifetime Value": "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629 \u0644\u0644\u0639\u0645\u064a\u0644",
    "Cohort Analysis": "\u062a\u062d\u0644\u064a\u0644 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "CRM": "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",

    "Products": "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "Product Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "Top Products": "\u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "ABC Analysis": "\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "Stock Risk": "\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Inventory": "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "Inventory Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "Inventory Risk": "\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "Reorder Analysis": "\u062a\u062d\u0644\u064a\u0644 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0637\u0644\u0628",

    "Procurement": "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
    "Purchase Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
    "Supplier Performance": "\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646",
    "Purchase Opportunities": "\u0641\u0631\u0635 \u0627\u0644\u0634\u0631\u0627\u0621",

    "Profitability": "\u0627\u0644\u0631\u0628\u062d\u064a\u0629",
    "Profit Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u0628\u0627\u062d",
    "Profit by Branch": "\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u062d\u0633\u0628 \u0627\u0644\u0641\u0631\u0639",
    "Profit by Product": "\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u0646\u062a\u062c",
    "Cost Anomalies": "\u0627\u062e\u062a\u0644\u0627\u0641\u0627\u062a \u0627\u0644\u062a\u0643\u0644\u0641\u0629",

    "Branches": "\u0627\u0644\u0641\u0631\u0648\u0639",
    "Branch Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u0631\u0648\u0639",
    "Branch Comparison": "\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0641\u0631\u0648\u0639",
    "Branch Ranking": "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0641\u0631\u0648\u0639",

    "Staff": "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646",
    "Staff Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
    "Sales by Seller": "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0628\u0627\u0626\u0639",
    "Productivity": "\u0627\u0644\u0625\u0646\u062a\u0627\u062c\u064a\u0629",

    "Forecasting": "\u0627\u0644\u062a\u0648\u0642\u0639\u0627\u062a",
    "Sales Forecast": "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
    "Demand Forecast": "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0637\u0644\u0628",
    "Inventory Forecast": "\u062a\u0648\u0642\u0639\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0648\u0646",

    "Data Quality": "\u062c\u0648\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    "Cost Quality": "\u062c\u0648\u062f\u0629 \u0627\u0644\u062a\u0643\u0644\u0641\u0629",
    "Sales Reconciliation": "\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",

    "System": "\u0627\u0644\u0646\u0638\u0627\u0645",
    "Branch Connections": "\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0627\u0644\u0641\u0631\u0648\u0639",
    "Cache Status": "\u062d\u0627\u0644\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0646\u0629",
    "ANALYTICS": "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
    "MARKETING": "\u0627\u0644\u062a\u0633\u0648\u064a\u0642",

    "Search...": "\u0627\u0628\u062d\u062b...",
    "Search": "\u0628\u062d\u062b",
    "Filter": "\u062a\u0635\u0641\u064a\u0629",
    "Filters": "\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062a\u0635\u0641\u064a\u0629",
    "Apply": "\u062a\u0637\u0628\u064a\u0642",
    "Clear": "\u0645\u0633\u062d",
    "Refresh": "\u062a\u062d\u062f\u064a\u062b",
    "Save": "\u062d\u0641\u0638",
    "Cancel": "\u0625\u0644\u063a\u0627\u0621",
    "Close": "\u0625\u0634\u063a\u0644\u0627\u0642",
    "Delete": "\u062d\u0630\u0641",
    "Edit": "\u062a\u0639\u062f\u064a\u0644",
    "Add": "\u0625\u0636\u0627\u0641\u0629",
    "Export Excel": "\u062a\u0635\u062f\u064a\u0631 \u0625\u0644\u0649 \u0625\u0643\u0633\u0644",
    "Export": "\u062a\u0635\u062f\u064a\u0631",
    "Loading": "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0645\u064a\u0644",
    "No data": "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a",
    "No results": "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c",
    "Retry": "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
    "Back": "\u0631\u062c\u0648\u0639",
    "Next": "\u0627\u0644\u062a\u0627\u0644\u064a",
    "Previous": "\u0627\u0644\u0633\u0627\u0628\u0642",
    "View Details": "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",

    "Sales": "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
    "Returns": "\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a",
    "Net Sales": "\u0635\u0627\u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
    "Revenue": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",
    "Cost": "\u0627\u0644\u062a\u0643\u0644\u0641\u0629",
    "Profit": "\u0627\u0644\u0631\u0628\u062d",
    "Gross Profit": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0631\u0628\u062d",
    "Profit Margin": "\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d",
    "Growth": "\u0645\u0639\u062f\u0644 \u0627\u0644\u0646\u0645\u0648",
    "Target": "\u0627\u0644\u0647\u062f\u0641",
    "Forecast": "\u0627\u0644\u062a\u0648\u0642\u0639",
    "Performance": "\u0627\u0644\u0623\u062f\u0627\u0621",
    "Invoices": "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",
    "Number of Invoices": "\u0639\u062f\u062f \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",
    "Average Invoice": "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",
    "Customer Count": "\u0639\u062f\u062f \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "Seller": "\u0627\u0644\u0628\u0627\u0626\u0639",
    "Sellers": "\u0627\u0644\u0628\u0627\u0626\u0639\u0648\u0646",
    "Quantity": "\u0627\u0644\u0643\u0645\u064a\u0629",
    "Product": "\u0627\u0644\u0645\u0646\u062a\u062c",
    "Rank": "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    "Ranking": "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    "Percentage": "\u0627\u0644\u0646\u0633\u0628\u0629",
    "Average": "\u0627\u0644\u0645\u062a\u0648\u0633\u0637",
    "Total": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    "Actual": "\u0627\u0644\u0641\u0639\u0644\u064a",
    "Variance": "\u0627\u0644\u0641\u0631\u0642",
    "Achievement": "\u0646\u0633\u0628\u0629 \u062a\u062d\u0642\u064a\u0642 \u0627\u0644\u0647\u062f\u0641",

    "Branch Performance": "\u0623\u062f\u0627\u0621 \u0627\u0644\u0641\u0631\u0648\u0639",
    "Current Performance": "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u062d\u0627\u0644\u064a",
    "Average Daily Sales": "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629",
    "Monthly Sales": "\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0634\u0647\u0631",
    "Daily Sales": "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629",
    "Program Forecast": "\u062a\u0648\u0642\u0639 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c",
    "Management Forecast": "\u062a\u0648\u0642\u0639 \u0627\u0644\u0625\u062f\u0627\u0631\u0629",
    "Management Target": "\u0647\u062f\u0641 \u0627\u0644\u0625\u062f\u0627\u0631\u0629",
    "Target A": "\u0627\u0644\u0647\u062f\u0641 \u0623",
    "Target B": "\u0627\u0644\u0647\u062f\u0641 \u0628",
    "Variance from Target": "\u0627\u0644\u0641\u0631\u0642 \u0639\u0646 \u0627\u0644\u0647\u062f\u0641",
    "Forecast Accuracy": "\u062f\u0642\u0629 \u0627\u0644\u062a\u0648\u0642\u0639",
    "Daily Target": "\u0627\u0644\u0647\u062f\u0641 \u0627\u0644\u064a\u0648\u0645\u064a",
    "Monthly Target": "\u0627\u0644\u0647\u062f\u0641 \u0627\u0644\u0634\u0647\u0631\u064a",

    "Customer 360": "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u0627\u0645\u0644 \u0644\u0644\u0639\u0645\u064a\u0644",
    "Customer Details": "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644",
    "Customer Profile": "\u0645\u0644\u0641 \u0627\u0644\u0639\u0645\u064a\u0644",
    "Customer History": "\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u064a\u0644",
    "Customer Invoices": "\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0639\u0645\u064a\u0644",
    "Customer Activity": "\u0646\u0634\u0627\u0637 \u0627\u0644\u0639\u0645\u064a\u0644",
    "Returning Customer": "\u0639\u0645\u064a\u0644 \u0639\u0627\u0626\u062f",
    "Lost Customer": "\u0639\u0645\u064a\u0644 \u0645\u0641\u0642\u0648\u062f",
    "Dormant": "\u0639\u0645\u064a\u0644 \u062e\u0627\u0645\u0644",
    "Champions": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0645\u064a\u0632\u0648\u0646",
    "Loyal Customers": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062e\u0644\u0635\u0648\u0646",
    "New Customers": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u062c\u062f\u062f",
    "At Risk": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0639\u0631\u0636\u0648\u0646 \u0644\u0644\u0641\u0642\u062f",
    "Follow Up": "\u0645\u062a\u0627\u0628\u0639\u0629",
    "Follow-up": "\u0645\u062a\u0627\u0628\u0639\u0629",
    "Response": "\u0627\u0644\u0631\u062f",
    "Campaign": "\u0627\u0644\u062d\u0645\u0644\u0629",
    "Campaigns": "\u0627\u0644\u062d\u0645\u0644\u0627\u062a",
    "WhatsApp": "\u0648\u0627\u062a\u0633\u0627\u0628",
    "WhatsApp Campaigns": "\u062d\u0645\u0644\u0627\u062a \u0648\u0627\u062a\u0633\u0627\u0628",
    "Message": "\u0627\u0644\u0631\u0633\u0627\u0644\u0629",
    "Messages": "\u0627\u0644\u0631\u0633\u0627\u0626\u0644",
    "Sent": "\u062a\u0645 \u0627\u0644\u0625\u0631\u0633\u0627\u0644",
    "Delivered": "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    "Read": "\u062a\u0645\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
    "Replied": "\u062a\u0645\u062a \u0627\u0644\u0625\u062c\u0627\u0628\u0629",
    "Last Contact": "\u0622\u062e\u0631 \u062a\u0648\u0627\u0635\u0644",
    "Next Follow-up": "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629",

    "Data": "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    "Status": "\u0627\u0644\u062d\u0627\u0644\u0629",
    "Active": "\u064a\u0639\u0645\u0644",
    "Inactive": "\u0645\u062a\u0648\u0642\u0641",
    "Success": "\u062a\u0645\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0628\u0646\u062c\u0627\u062d",
    "Failed": "\u062a\u0639\u0630\u0631\u062a \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
    "Warning": "\u062a\u0646\u0628\u064a\u0647",
    "Information": "\u0645\u0639\u0644\u0648\u0645\u0627\u062a",
    "Connected": "\u0645\u062a\u0635\u0644",
    "Disconnected": "\u063a\u064a\u0631 \u0645\u062a\u0635\u0644",
    "Connecting": "\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644",
    "Connection Failed": "\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644",
    "Online": "\u0645\u062a\u0635\u0644",
    "Offline": "\u063a\u064a\u0631 \u0645\u062a\u0635\u0644",
    "Last Sync": "\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b \u0644\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    "Sync": "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    "Syncing": "\u062c\u0627\u0631\u064d \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    "Cache": "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0646\u0629 \u0645\u0624\u0642\u062a\u064b\u0627",
    "Error": "\u062e\u0637\u0623",
    "Pending": "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
    "Completed": "\u0645\u0643\u062a\u0645\u0644",
    "Processing": "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0646\u0641\u064a\u0630",

    "Today": "\u0627\u0644\u064a\u0648\u0645",
    "This Month": "\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",
    "Current Month": "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a",
    "Date": "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    "From": "\u0645\u0646",
    "To": "\u0625\u0644\u0649",
    "All Branches": "\u062c\u0645\u064a\u0639 \u0627\u0644\u0641\u0631\u0648\u0639",
    "Branch": "\u0627\u0644\u0641\u0631\u0639",

    "Top Sellers": "\u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646",
    "Best Sellers": "\u0623\u0641\u0636\u0644 \u0627\u0644\u0628\u0627\u0626\u0639\u064a\u0646",
    "Day / Hour": "\u0627\u0644\u064a\u0648\u0645 / \u0627\u0644\u0633\u0627\u0639\u0629",
    "Overview": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
    "Summary": "\u0627\u0644\u0645\u0644\u062e\u0635",
    "Details": "\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
    "History": "\u0627\u0644\u0633\u062c\u0644",
    "Activity": "\u0627\u0644\u0646\u0634\u0627\u0637",
    "Analytics": "\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a",
    "Report": "\u0627\u0644\u062a\u0642\u0631\u064a\u0631",
    "Reports": "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
    "Settings": "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    "Connection": "\u0627\u0644\u0627\u062a\u0635\u0627\u0644",
    "Connections": "\u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a",
    "Employees": "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646",
    "Employee": "\u0627\u0644\u0645\u0648\u0638\u0641",
    "Evaluation": "\u0627\u0644\u062a\u0642\u064a\u064a\u0645"
}
'@

$map = $json | ConvertFrom-Json

$files =
    Get-ChildItem `
        -LiteralPath $sourceRoot `
        -Recurse `
        -File `
        -Include *.js,*.jsx,*.ts,*.tsx

$propNames =
    "title|label|placeholder|aria-label|alt|helperText|emptyText|buttonLabel|header|caption|description|message|tooltip"

$changedFiles = 0
$totalReplacements = 0

foreach ($file in $files) {

    $original =
        [System.IO.File]::ReadAllText(
            $file.FullName
        )

    $text = $original

    foreach ($property in $map.PSObject.Properties) {

        $english =
            [regex]::Escape(
                [string]$property.Name
            )

        $arabic =
            [string]$property.Value

        # -----------------------------------------------------
        # Object properties:
        # label: "Dashboard"
        # title: "Dashboard"
        # placeholder: "Search..."
        # -----------------------------------------------------

        $patternObject =
            '(\b(?:' +
            $propNames +
            ')\s*:\s*)(["''] )'.Replace('' '','') +
            $english +
            '\2'

        $text =
            [regex]::Replace(
                $text,
                $patternObject,
                {
                    param($m)

                    $m.Groups[1].Value +
                    $m.Groups[2].Value +
                    $arabic +
                    $m.Groups[2].Value
                }
            )

        # -----------------------------------------------------
        # JSX attributes:
        # title="Dashboard"
        # placeholder="Search..."
        # aria-label="Refresh"
        # -----------------------------------------------------

        $patternAttribute =
            '(\s(?:' +
            $propNames +
            ')\s*=\s*)(["''])' +
            $english +
            '\2'

        $text =
            [regex]::Replace(
                $text,
                $patternAttribute,
                {
                    param($m)

                    $m.Groups[1].Value +
                    $m.Groups[2].Value +
                    $arabic +
                    $m.Groups[2].Value
                }
            )

        # -----------------------------------------------------
        # Direct JSX text:
        # >Dashboard<
        # >Customers<
        # >Loading<
        # -----------------------------------------------------

        $patternJsxText =
            '(>\s*)' +
            $english +
            '(\s*<)'

        $text =
            [regex]::Replace(
                $text,
                $patternJsxText,
                {
                    param($m)

                    $m.Groups[1].Value +
                    $arabic +
                    $m.Groups[2].Value
                }
            )
    }

    if ($text -ne $original) {

        $relative =
            $file.FullName.Substring(
                $sourceRoot.Length
            ).TrimStart('\')

        $backupFile =
            Join-Path `
                $backupRoot `
                $relative

        $backupDir =
            Split-Path `
                -Parent `
                $backupFile

        New-Item `
            -ItemType Directory `
            -Path $backupDir `
            -Force |
            Out-Null

        Copy-Item `
            -LiteralPath $file.FullName `
            -Destination $backupFile `
            -Force

        [System.IO.File]::WriteAllText(
            $file.FullName,
            $text,
            (New-Object System.Text.UTF8Encoding($false))
        )

        $changedFiles++
        $totalReplacements++

        Write-Host `
            ("UPDATED: " + $relative) `
            -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Arabic UI translation completed." -ForegroundColor Cyan
Write-Host ("Changed files: " + $changedFiles) -ForegroundColor Green
Write-Host ("Changed UI blocks: " + $totalReplacements) -ForegroundColor Green
Write-Host ("Backup: " + $backupRoot) -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan