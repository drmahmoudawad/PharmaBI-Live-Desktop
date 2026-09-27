$ErrorActionPreference = "Stop"

$project = "D:\PharmaBI-Live-Desktop"
$src = Join-Path $project "src"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $project "tools\ui-arabic-final-backup-$timestamp"

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$files = @(
    "app\navigation.js",
    "components\AnalyticsHubPanel.jsx",
    "components\BranchPerformancePanel.jsx",
    "components\CustomerAnalyticsModulePanel.jsx",
    "components\CustomerAnalyticsPanel.jsx",
    "components\CustomerClvPanel.jsx",
    "components\CustomerCohortPanel.jsx",
    "components\CustomerRfmPanel.jsx",
    "components\ProductMixPanel.jsx",
    "components\ProductProfitabilityPanel.jsx",
    "components\SalesAnalyticsPanel.jsx",
    "components\TicketReconciliation.jsx",
    "components\TopProductsPanel.jsx",
    "pages\ProductsPage.jsx"
)

$map = [ordered]@{
    "Saved Branches" = "الفروع المحفوظة"
    "Active Connections" = "الاتصالات النشطة"
    "Data Coverage" = "تغطية البيانات"
    "Net Profit" = "صافي الربح"
    "Missing Cost" = "تكلفة مفقودة"
    "Zero Cost" = "تكلفة صفرية"

    "PharmaBI Analytics" = "تحليلات فارما بي آي"

    "Known Customers" = "العملاء المسجلون"
    "Previous Customers" = "العملاء السابقون"
    "Current Customers" = "العملاء الحاليون"

    "Active ≤ 30 Days" = "نشط خلال 30 يومًا أو أقل"
    "Inactive ≥ 30 Days" = "غير نشط منذ 30 يومًا أو أكثر"
    "Inactive ≥ 60 Days" = "غير نشط منذ 60 يومًا أو أكثر"
    "Inactive ≥ 90 Days" = "غير نشط منذ 90 يومًا أو أكثر"
    "Inactive 90 Days" = "غير نشط منذ 90 يومًا"

    "Observed Net Sales" = "صافي المبيعات الفعلية"
    "Top Customers by Observed Value" = "أعلى العملاء حسب القيمة الفعلية"

    "Initial Cohort Sales" = "مبيعات الشريحة عند البداية"
    "Observed Cohort Sales" = "مبيعات الشريحة الفعلية"
    "Initial Sales" = "المبيعات عند البداية"
    "Observed Sales" = "المبيعات الفعلية"
    "Sales / Active Customer" = "المبيعات لكل عميل نشط"

    "Customer RFM failed" = "تعذر تحليل سلوك العملاء"
    "Customer RFM" = "تحليل سلوك العملاء"
    "Priority Customers" = "العملاء ذوو الأولوية"

    "Product Mix failed" = "تعذر تحليل مزيج المنتجات"
    "Product Mix Analytics" = "تحليلات مزيج المنتجات"
    "Product Mix" = "مزيج المنتجات"
    "Current Sales" = "المبيعات الحالية"
    "Last Year Sales" = "مبيعات العام الماضي"
    "YoY Sales" = "المبيعات مقارنة بالعام الماضي"
    "Product Mix Change" = "التغير في مزيج المنتجات"
    "Current Products" = "المنتجات الحالية"

    "Product Profitability failed" = "تعذرت عملية تحليل ربحية المنتجات"
    "Product Profitability" = "ربحية المنتجات"
    "Gross Sales" = "إجمالي المبيعات"
    "Negative Margin Products" = "منتجات بهامش ربح سلبي"
    "Most Profitable Products" = "أكثر المنتجات ربحية"

    "Sales Trend" = "اتجاه المبيعات"
    "Sellers" = "البائعون"
    "Returns" = "المرتجعات"
    "Sales Overview" = "نظرة عامة على المبيعات"
    "Sales Summary" = "ملخص المبيعات"
    "SQL Performance Test" = "اختبار أداء قاعدة البيانات"
    "Sales + reconciliation" = "المبيعات + المطابقة"
    "Total Test Time" = "إجمالي وقت الاختبار"
    "Average Ticket" = "متوسط الفاتورة"
    "Recent Sales Preview" = "معاينة أحدث المبيعات"
    "Daily Performance" = "الأداء اليومي"
    "Hourly Performance" = "الأداء حسب الساعة"
    "Net Sales after Returns" = "صافي المبيعات بعد المرتجعات"
    "Return Cost" = "تكلفة المرتجعات"
    "Sellers Analytics" = "تحليلات البائعين"

    "Header Total" = "الإجمالي"

    "Top Products failed" = "تعذر تحميل أفضل المنتجات"
    "Top Products" = "أفضل المنتجات"

    "Products Analytics" = "تحليلات المنتجات"

    "فشل تحليل Customer RFM." = "تعذر تحليل سلوك العملاء."
    "تحليل Customer RFM" = "تحليل سلوك العملاء"
    "فشل تحليل Product Mix." = "تعذر تحليل مزيج المنتجات."
    "تحليل Product Mix" = "تحليلات مزيج المنتجات"
    "فشل تحميل Sales Overview." = "تعذر تحميل نظرة عامة على المبيعات."
    "فشل تحميل Sales Trend." = "تعذر تحميل اتجاه المبيعات."
    "فشل تحميل Returns." = "تعذر تحميل المرتجعات."
    "لم يتم إرجاع بيانات Sales Summary." = "لم يتم إرجاع بيانات ملخص المبيعات."
    "فشل تحميل Top Products." = "تعذر تحميل أفضل المنتجات."

    "تحليل RFM" = "تحليل سلوك العملاء"
    "فئات RFM" = "فئات العملاء"
    "كل فئات RFM" = "جميع فئات العملاء"
    "فئات RFM - اختر الفئة" = "فئات العملاء - اختر الفئة"
    "اختر فئة RFM لعرض العملاء التابعين لها" = "اختر فئة العملاء لعرض العملاء التابعين لها"
}

foreach ($relative in $files) {

    $file = Join-Path $src $relative

    if (-not (Test-Path -LiteralPath $file)) {
        Write-Host "SKIP - NOT FOUND: $relative" -ForegroundColor Yellow
        continue
    }

    $text = [System.IO.File]::ReadAllText(
        $file,
        [System.Text.Encoding]::UTF8
    )

    $original = $text

    foreach ($pair in $map.GetEnumerator()) {

        $escaped = [regex]::Escape($pair.Key)

        $text = [regex]::Replace(
            $text,
            $escaped,
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($m)
                $pair.Value
            }
        )
    }

    if ($text -eq $original) {
        continue
    }

    $backupFile =
        Join-Path `
            $backupRoot `
            $relative

    New-Item `
        -ItemType Directory `
        -Path (Split-Path -Parent $backupFile) `
        -Force |
        Out-Null

    Copy-Item `
        -LiteralPath $file `
        -Destination $backupFile `
        -Force

    [System.IO.File]::WriteAllText(
        $file,
        $text,
        (New-Object System.Text.UTF8Encoding($false))
    )

    Write-Host `
        "UPDATED: $relative" `
        -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "تم استكمال تعريب الواجهة." -ForegroundColor Green
Write-Host "النسخة الاحتياطية:" -ForegroundColor Yellow
Write-Host $backupRoot
Write-Host "============================================" -ForegroundColor Cyan