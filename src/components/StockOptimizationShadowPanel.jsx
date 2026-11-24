import React, { useCallback, useEffect, useMemo, useState } from "react";

const REASON_LABELS = Object.freeze({
    BRANCH_SNAPSHOT_NOT_FRESH: "لقطة المخزون للفروع غير متزامنة الحداثة",
    SALES_SYNC_NOT_READY: "حالة المزامنة الحالية ليست READY؛ تُراجع صلاحية كل يوم منفصلًا",
    SALES_DETAIL_QUERY_BLOCKED: "تعذر تجميع سجل المبيعات المحلي الموثق",
    MISSING_VERIFIED_SALES_DAYS: "توجد أيام مبيعات بلا سجل تحقق",
    UNVERIFIED_SALES_DAYS: "توجد أيام مبيعات لم تجتز التحقق",
    MULTIPLE_LOCAL_ITEM_IDS: "توجد عدة أكواد محلية معتمدة للـMaster داخل الفرع",
    AMBIGUOUS_APPROVED_ITEM_MAPPING: "الكود المحلي نفسه مربوط بأكثر من Master؛ استُبعدت مبيعاته",
    MISSING_INVENTORY_ROW: "رابط معتمد بلا صف مخزون؛ لا يُعامل كصفر",
    SALES_DAY_BOUNDARY_NOT_VERIFIED: "حد اليوم التشغيلي والمنطقة الزمنية غير معتمدين",
    SALES_WINDOW_POLICY_NOT_CONFIGURED: "نافذة المبيعات غير معتمدة",
    PARTS_ORIGIN_UNVERIFIED: "مصدر Parts أو قيمة التحويل غير مثبتة",
    PARTS_MISMATCH: "بيانات Parts لا تطابق أحدث بيانات الأصناف المحملة محليًا",
    LATEST_LOCAL_PARTS_NOT_VERIFIED: "آخر تحديث محلي لبيانات Parts غير مكتمل",
    NEGATIVE_BALANCE: "يوجد رصيد سالب يحتاج مراجعة",
    INVENTORY_SOURCE_NOT_TRACEABLE: "لا يمكن تتبع المصدر الفائز لرصيد المخزون",
    BASE_UNIT_NOT_VERIFIED: "وحدة الأساس غير موثقة",
    STOCK_BALANCE_NOT_VERIFIED: "رصيد المخزن الرئيسي أو تحويله إلى وحدات غير متحقق منه",
    STORE_SCOPE_NOT_VERIFIED: "نطاق المخازن وطريقة جمعها غير مثبتين",
    STALE_OR_INCOMPLETE_INVENTORY_SNAPSHOT: "لقطة المخزون قديمة أو غير مكتملة في فرع",
    SALES_WINDOW_NOT_FULLY_VERIFIED: "نافذة المبيعات لهذا الصنف غير مكتملة التحقق في الفروع المرتبطة",
    SERVICE_POLICY_NOT_CONFIGURED: "سياسة الخدمة ومخزون الأمان غير معتمدة",
    COVERAGE_DAYS_REQUIRED: "أدخل عدد أيام التغطية المطلوبة",
    TRANSFER_ROUTE_COST_AND_TIME_MISSING: "زمن وتكلفة النقل بين الفروع غير متاحين",
    OPEN_SUPPLY_AND_CURRENT_COST_MISSING: "الوارد المؤكد وتكلفة الشراء الحالية غير متاحين",
    NO_APPROVED_MAPPING: "لا يوجد ربط Master معتمد للفرع",
    NO_FEASIBLE_SURPLUS_OR_ROUTE: "لا يوجد فائض متاح للنقل بين الفروع المرتبطة",
    UNPRICED_QUANTITY_ESTIMATE: "كمية شراء تقديرية بلا سعر",
    PURCHASE_COST_IGNORED: "تكلفة الشراء مستبعدة من الحساب",
    TRANSPORT_COST_IGNORED: "تكلفة النقل مستبعدة من الحساب",
    CONFIRMED_INCOMING_NOT_INCLUDED: "الوارد غير المؤكد غير مطروح من الكمية",
    ROUTE_REQUIRES_MANUAL_REVIEW: "مسار النقل يحتاج مراجعة بشرية",
    BRANCH_DEMAND_OR_POLICY_MISSING: "الطلب أو سياسة الفرع غير مكتملة",
    APPROVED_PLANNING_POLICY_REQUIRED: "يلزم اعتماد سياسة التخطيط قبل القرار",
    INVALID_BRANCH_INPUT: "بيانات الفروع غير صالحة للمقارنة",
    NO_SHORTAGE: "لا يظهر عجز ضمن سياسة معتمدة",
    SOURCE_PROVENANCE_UNAVAILABLE: "تتبع مصدر الرصيد غير متاح"
});

const ACTION_LABELS = Object.freeze({
    NO_ACTION: "عدم التحرك",
    TRANSFER: "نقل بين الفروع",
    PURCHASE: "تقدير شراء"
});

function labelFor(code) {
    return REASON_LABELS[code] || String(code || "بيانات غير مكتملة").replaceAll("_", " ");
}

function formatNumber(value, digits = 0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return Number(value).toLocaleString("ar-EG", { maximumFractionDigits: digits });
}

function alternativeLabel(alternative) {
    if (!alternative) return "غير متاح";
    if (alternative.status === "BASELINE_ONLY" || alternative.status === "SELECTED_SHADOW_BASELINE") {
        return "خط أساس للمقارنة";
    }
    if (alternative.status === "AVAILABLE_IN_SHADOW_MODE") {
        const details = [`للمحاكاة: ${formatNumber(alternative.quantityUnits, 2)} وحدة`];
        if (alternative.totalCost !== null && alternative.totalCost !== undefined) {
            details.push(`تكلفة تقديرية ${formatNumber(alternative.totalCost, 2)}`);
        }
        if (alternative.capitalInvestment !== null && alternative.capitalInvestment !== undefined) {
            details.push(`رأس مال ${formatNumber(alternative.capitalInvestment, 2)}`);
        }
        if (alternative.totalCost === null || alternative.totalCost === undefined) {
            details.push("التكلفة مستبعدة من الحساب");
        }
        if (alternative.unmetUnits !== null && alternative.unmetUnits !== undefined) {
            details.push(`عجز متبقٍ ${formatNumber(alternative.unmetUnits, 2)}`);
        }
        return details.join(" · ");
    }
    return "محجوب";
}

const DEFAULT_ABC_FSN_POLICY = Object.freeze({
    abcAThroughPct: 80,
    abcBThroughPct: 95,
    fastMinSellingDays: 10,
    fastRecentDays: 30,
    slowMinSellingDays: 1,
    slowRecentDays: 89,
    nonMovingAfterDays: 90
});

const ABC_FSN_STATUS_LABELS = Object.freeze({
    POLICY_REQUIRED: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629",
    POLICY_READ_ERROR: "\u062a\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062a\u0635\u0646\u064a\u0641",
    NOT_MAPPED: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0631\u0628\u0637 \u0645\u0639\u062a\u0645\u062f",
    SALES_WINDOW_NOT_VERIFIED: "\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629",
    RETURNS_POLICY_REVIEW: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a",
    INSUFFICIENT_HISTORY: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u0648\u062b\u0642 \u0623\u0642\u0635\u0631 \u0645\u0646 \u0645\u062f\u0629 \u0627\u0644\u0631\u0643\u0648\u062f \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629",
    FSN_POLICY_REVIEW: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0634\u0631\u0648\u0637 \u0627\u0644\u062d\u0631\u0643\u0629",
    NO_VERIFIED_SALES_VALUE_OR_HISTORY: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0642\u064a\u0645\u0629 \u0645\u0628\u064a\u0639\u0627\u062a \u0645\u0648\u062b\u0642\u0629"
});

function classificationText(classification) {
    if (!classification) {
        return "\u063a\u064a\u0631 \u0645\u062d\u0633\u0648\u0628";
    }

    const pair = `${classification.abc || "\u2014"} / ${classification.fsn || "\u2014"}`;

    if (classification.status === "CLASSIFIED") {
        return pair;
    }

    const reason = ABC_FSN_STATUS_LABELS[classification.status] ||
        String(classification.status || "\u063a\u064a\u0631 \u0645\u0635\u0646\u0641");

    return classification.abc || classification.fsn
        ? `${pair} - ${reason}`
        : reason;
}
export default function StockOptimizationShadowPanel() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [coverageDays, setCoverageDays] = useState("");
    const [abcFsnPolicy, setAbcFsnPolicy] = useState({ ...DEFAULT_ABC_FSN_POLICY });
    const [abcFsnPolicyLoading, setAbcFsnPolicyLoading] = useState(false);
    const [abcFsnSaving, setAbcFsnSaving] = useState(false);
    const [abcFsnError, setAbcFsnError] = useState("");
    const [abcFsnSaveMessage, setAbcFsnSaveMessage] = useState("");

    const loadReport = useCallback(async (requestedCoverageDays = null) => {
        setLoading(true);
        setError("");
        try {
            const readReport = window?.pharmaBI?.products?.stockRedistribution;
            if (typeof readReport !== "function") {
                throw new Error("واجهة تقرير Shadow Mode غير متاحة. أعد تشغيل البرنامج بعد تحديثه.");
            }
            const normalizedCoverageDays = Number(requestedCoverageDays);
            const options = Number.isFinite(normalizedCoverageDays) && normalizedCoverageDays > 0
                ? { coverageDays: normalizedCoverageDays }
                : {};
            const result = await readReport(options);
            if (!result?.success) {
                const details = (result?.warnings || []).slice(0, 2).filter(Boolean).join(" · ");
                throw new Error(details || "تعذر قراءة مدخلات محرك المخزون.");
            }
            setReport(result);
        } catch (loadError) {
            setError(String(loadError?.pharmaBIRawMessage || loadError?.message || loadError).slice(0, 500));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAbcFsnPolicy = useCallback(async () => {
        setAbcFsnPolicyLoading(true);
        setAbcFsnError("");

        try {
            const readReport = window?.pharmaBI?.products?.stockRedistribution;

            if (typeof readReport !== "function") {
                throw new Error("ABC_FSN_POLICY_API_UNAVAILABLE");
            }

            const result = await readReport({
                action: "get-abc-fsn-policy"
            });

            if (!result?.success || !result?.policy) {
                throw new Error("ABC_FSN_POLICY_LOAD_FAILED");
            }

            setAbcFsnPolicy(result.policy);
        } catch (loadError) {
            setAbcFsnError(
                String(loadError?.pharmaBIRawMessage || loadError?.message || loadError).slice(0, 300)
            );
        } finally {
            setAbcFsnPolicyLoading(false);
        }
    }, []);

    const saveAbcFsnPolicy = useCallback(async () => {
        setAbcFsnError("");
        setAbcFsnSaveMessage("");

        const numericFields = Object.keys(DEFAULT_ABC_FSN_POLICY);
        const normalized = {};

        for (const key of numericFields) {
            const rawValue = abcFsnPolicy[key];

            if (
                rawValue === null ||
                rawValue === undefined ||
                String(rawValue).trim() === "" ||
                !Number.isInteger(Number(rawValue))
            ) {
                setAbcFsnError("\u062c\u0645\u064a\u0639 \u0627\u0644\u0642\u064a\u0645 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0623\u0631\u0642\u0627\u0645\u064b\u0627 \u0635\u062d\u064a\u062d\u0629.");
                return;
            }

            normalized[key] = Number(rawValue);
        }

        if (
            normalized.abcAThroughPct < 1 ||
            normalized.abcAThroughPct > 99 ||
            normalized.abcBThroughPct < 2 ||
            normalized.abcBThroughPct > 100 ||
            normalized.abcBThroughPct <= normalized.abcAThroughPct
        ) {
            setAbcFsnError("\u062d\u062f\u0627 A \u0648B \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u064a\u0646. \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 B \u0623\u0643\u0628\u0631 \u0645\u0646 A\u060c \u0648\u0643\u0644\u0627\u0647\u0645\u0627 \u062d\u062a\u0649 100%.");
            return;
        }

        if (
            normalized.fastMinSellingDays < 1 ||
            normalized.fastMinSellingDays > 366 ||
            normalized.fastRecentDays < 0 ||
            normalized.fastRecentDays > 366 ||
            normalized.slowMinSellingDays < 1 ||
            normalized.slowMinSellingDays > 366 ||
            normalized.slowRecentDays < normalized.fastRecentDays ||
            normalized.slowRecentDays > 366 ||
            normalized.nonMovingAfterDays <= normalized.slowRecentDays ||
            normalized.nonMovingAfterDays > 730
        ) {
            setAbcFsnError("\u062a\u062d\u0642\u0642 \u0645\u0646 \u0623\u064a\u0627\u0645 F \u0648S \u0648N. \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0645\u062f\u0629 N \u0623\u0643\u0628\u0631 \u0645\u0646 \u062d\u062f S\u060c \u0648\u062d\u062f S \u0644\u0627 \u064a\u0642\u0644 \u0639\u0646 \u062d\u062f F.");
            return;
        }

        setAbcFsnSaving(true);

        try {
            const saveReport = window?.pharmaBI?.products?.stockRedistribution;

            if (typeof saveReport !== "function") {
                throw new Error("ABC_FSN_POLICY_API_UNAVAILABLE");
            }

            const result = await saveReport({
                action: "save-abc-fsn-policy",
                policy: normalized
            });

            if (!result?.success || !result?.policy) {
                throw new Error("ABC_FSN_POLICY_SAVE_FAILED");
            }

            setAbcFsnPolicy(result.policy);
            setAbcFsnSaveMessage("\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0633\u064a\u0627\u0633\u0629. \u062c\u0627\u0631\u064a \u0625\u0639\u0627\u062f\u0629 \u062d\u0633\u0627\u0628 \u0627\u0644\u062a\u0635\u0646\u064a\u0641.");
            await loadReport(coverageDays);
        } catch (saveError) {
            setAbcFsnError(
                String(saveError?.pharmaBIRawMessage || saveError?.message || saveError).slice(0, 300)
            );
        } finally {
            setAbcFsnSaving(false);
        }
    }, [abcFsnPolicy, coverageDays, loadReport]);

    useEffect(() => {
        loadReport();
        loadAbcFsnPolicy();
    }, [loadReport, loadAbcFsnPolicy]);

    const matchingItems = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("ar");
        const items = report?.items || [];
        if (!query) return items;
        return items.filter(item =>
            `${item.masterItemId} ${item.unifiedCode} ${item.itemName} ${(item.blockers || []).join(" ")}`
                .toLocaleLowerCase("ar")
                .includes(query)
        );
    }, [report, search]);
    const visibleItems = matchingItems.slice(0, 200);
    const branchNameFor = branchId =>
        report?.branchStatus?.find(branch => Number(branch.id) === Number(branchId))?.name || `فرع ${branchId}`;

    const styles = `
      .so-root{direction:rtl;margin-top:28px;color:var(--text-primary,#243447)}
      .so-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      .so-title{margin:0;font-size:21px;font-weight:800}
      .so-desc{max-width:850px;margin:7px 0;color:var(--text-secondary,#64748b);font-size:13px;line-height:1.9}
      .so-button{border:1px solid var(--border-color,#dbe3ec);background:var(--panel-bg,#fff);border-radius:9px;padding:9px 13px;cursor:pointer;font:inherit;font-size:12px;color:inherit}
      .so-button:disabled{opacity:.55;cursor:wait}
      .so-mode{display:inline-flex;align-items:center;gap:6px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800}
      .so-banner{border:1px solid #f0d6a1;background:#fffbeb;color:#765018;padding:11px 13px;border-radius:10px;margin:10px 0;font-size:12px;line-height:1.9}
      .so-error{border:1px solid #fecaca;background:#fff1f2;color:#9f1239;padding:10px 12px;border-radius:9px;margin:8px 0;font-size:12px}
      .so-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px;margin:14px 0}
      .so-kpi,.so-branch,.so-reasons{border:1px solid var(--border-color,#e2e8f0);border-radius:11px;padding:12px;background:var(--panel-bg,#fff)}
      .so-kpi-label{font-size:11px;color:var(--text-secondary,#64748b);line-height:1.7}
      .so-kpi-value{font-size:22px;font-weight:800;margin-top:4px}
      .so-branches{display:grid;grid-template-columns:repeat(5,minmax(140px,1fr));gap:8px;margin:14px 0}
      .so-branch-name{font-size:13px;font-weight:800;margin-bottom:6px}
      .so-status{display:inline-block;border-radius:7px;padding:3px 7px;font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b}
      .so-status.good{background:#dcfce7;color:#166534}
      .so-muted{font-size:11px;color:var(--text-secondary,#64748b);line-height:1.8}
      .so-reasons{margin:12px 0}
      .so-reasons h3{margin:0 0 8px;font-size:14px}
      .so-reason-list{display:flex;gap:6px;flex-wrap:wrap}
      .so-tag{display:inline-block;border-radius:7px;background:#f1f5f9;color:#334155;padding:4px 7px;font-size:10px;line-height:1.5}
      .so-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:12px 0}
      .so-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .so-coverage{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text-secondary,#64748b)}
      .so-coverage input{width:100px;border:1px solid var(--border-color,#dbe3ec);border-radius:8px;padding:9px 10px;background:var(--panel-bg,#fff);color:inherit;font:inherit}
      .so-policy{border:1px solid var(--border-color,#e2e8f0);border-radius:11px;padding:14px;background:var(--panel-bg,#fff);margin:12px 0}
      .so-policy-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
      .so-policy-title{font-size:14px;font-weight:800;margin:0}
      .so-policy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px}
      .so-policy-field{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-secondary,#64748b)}
      .so-policy-field input{width:100%;box-sizing:border-box;border:1px solid var(--border-color,#dbe3ec);border-radius:8px;padding:8px 9px;background:var(--panel-bg,#fff);color:inherit;font:inherit;font-size:13px}
      .so-policy-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px}
      .so-policy-note{font-size:11px;color:var(--text-secondary,#64748b);line-height:1.8;margin-top:9px}
      .so-policy-error{font-size:11px;color:#b91c1c;margin-top:8px}
      .so-policy-success{font-size:11px;color:#166534;margin-top:8px}
      .so-classification{font-weight:800;white-space:nowrap}
      .so-search{min-width:min(360px,90vw);border:1px solid var(--border-color,#dbe3ec);border-radius:8px;padding:9px 10px;background:var(--panel-bg,#fff);color:inherit;font:inherit}
      .so-wrap{overflow:auto;border:1px solid var(--border-color,#e2e8f0);border-radius:11px;background:var(--panel-bg,#fff)}
      .so-table{width:100%;min-width:1200px;border-collapse:collapse;font-size:12px}
      .so-table th,.so-table td{padding:10px;text-align:right;border-bottom:1px solid var(--border-color,#edf1f5);vertical-align:top;line-height:1.7}
      .so-table th{background:var(--table-header-bg,#f8fafc);white-space:nowrap;font-weight:800}
      .so-table tr:last-child td{border-bottom:0}
      .so-detail{min-width:210px}
      .so-detail summary{cursor:pointer;font-weight:700}
      .so-detail ul{padding-right:18px;margin:6px 0}
      .so-empty{padding:22px;text-align:center;color:var(--text-secondary,#64748b);font-size:13px;line-height:1.9}
      @media(max-width:1000px){.so-branches{grid-template-columns:repeat(3,minmax(130px,1fr))}}
      @media(max-width:600px){.so-branches{grid-template-columns:repeat(2,minmax(125px,1fr))}}
    `;

    return (
        <section className="so-root">
            <style>{styles}</style>
            <div className="so-head">
                <div>
                    <h2 className="so-title">محرك تحسين توزيع المخزون</h2>
                    <p className="so-desc">
                        يقارن النقل والشراء وعدم التحرك على بيانات محلية موثقة، ويعرض النتيجة كمحاكاة فقط.
                        يعتمد الرصيد على المخزن الرئيسي، وParts من آخر تحديث محلي مكتمل، وصافي المبيعات بعد المرتجعات.
                    </p>
                    <span className="so-mode">Shadow Mode · {report?.engineVersion || "0.3.0-shadow"}</span>
                </div>
                <button type="button" className="so-button" onClick={() => loadReport(coverageDays)} disabled={loading}>
                    {loading ? "جارٍ تحديث القراءة…" : "إعادة قراءة البيانات المحلية"}
                </button>
            </div>

            <div className="so-banner">
                لا ينفذ المحرك تحويلًا أو أمر شراء ولا يكتب إلى PharmaFly أو قاعدة البيانات. أي اقتراح يحتاج موافقة الإدارة؛ وعدم التحرك ظاهر كخط أساس للمقارنة، وليس أمر تشغيل.
            </div>
            {error && <div className="so-error">{error}</div>}

            {report && (
                <>
                    {(report.warnings || []).map((warning, index) => (
                        <div className="so-banner" key={`${index}-${warning}`}>{warning}</div>
                    ))}

                    <div className="so-kpis">
                        <div className="so-kpi"><div className="so-kpi-label">Master نشط</div><div className="so-kpi-value">{formatNumber(report.summary?.activeMasterCount)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">له رابط معتمد</div><div className="so-kpi-value">{formatNumber(report.summary?.mappedMasterCount)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">محجوب لقصور البيانات</div><div className="so-kpi-value">{formatNumber(report.summary?.blockedMasterCount)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">قرار جاهز للمحاكاة</div><div className="so-kpi-value">{formatNumber(report.summary?.readyMasterCount)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">بدائل نقل مؤهلة</div><div className="so-kpi-value">{formatNumber(report.summary?.transferAlternatives)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">بدائل شراء مؤهلة</div><div className="so-kpi-value">{formatNumber(report.summary?.purchaseAlternatives)}</div></div>
                        <div className="so-kpi"><div className="so-kpi-label">ABC / FSN</div><div className="so-kpi-value" style={{ fontSize: 15 }}>{report.abcFsnStatus === "POLICY_CONFIGURED" ? "\u0645\u0641\u0639\u0644\u0629" : report.abcFsnStatus === "POLICY_READ_ERROR" ? "\u062e\u0637\u0623 \u0642\u0631\u0627\u0621\u0629" : report.abcFsnStatus === "POLICY_REQUIRED" ? "\u062a\u062d\u062a\u0627\u062c \u0633\u064a\u0627\u0633\u0629" : "\u063a\u064a\u0631 \u0645\u062d\u0633\u0648\u0628\u0629"}</div></div>
                    </div>

                    <div className="so-policy">
                        <div className="so-policy-head">
                            <h3 className="so-policy-title">{"\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u062a\u0635\u0646\u064a\u0641 ABC / FSN"}</h3>
                            <span className="so-muted">
                                {abcFsnPolicyLoading
                                    ? "\u062c\u0627\u0631\u064a \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a..."
                                    : "\u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0645\u062d\u0641\u0648\u0638\u0629 \u0645\u062d\u0644\u064a\u064b\u0627"}
                            </span>
                        </div>

                        <div className="so-policy-grid">
                            {[
                                { key: "abcAThroughPct", label: "\u062d\u062f \u0627\u0644\u0641\u0626\u0629 A (%)", min: 1, max: 99 },
                                { key: "abcBThroughPct", label: "\u062d\u062f \u0627\u0644\u0641\u0626\u0629 B \u0627\u0644\u062a\u0631\u0627\u0643\u0645\u064a (%)", min: 2, max: 100 },
                                { key: "fastMinSellingDays", label: "\u0623\u0642\u0644 \u0623\u064a\u0627\u0645 \u0628\u064a\u0639 \u0644\u0640 F", min: 1, max: 366 },
                                { key: "fastRecentDays", label: "\u062d\u062f\u0627\u062b\u0629 \u0622\u062e\u0631 \u0628\u064a\u0639 \u0644\u0640 F", min: 0, max: 366 },
                                { key: "slowMinSellingDays", label: "\u0623\u0642\u0644 \u0623\u064a\u0627\u0645 \u0628\u064a\u0639 \u0644\u0640 S", min: 1, max: 366 },
                                { key: "slowRecentDays", label: "\u062d\u062f\u0627\u062b\u0629 \u0622\u062e\u0631 \u0628\u064a\u0639 \u0644\u0640 S", min: 0, max: 366 },
                                { key: "nonMovingAfterDays", label: "\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0631\u0643\u0648\u062f N", min: 1, max: 730 }
                            ].map(field => (
                                <label className="so-policy-field" key={field.key}>
                                    <span>{field.label}</span>
                                    <input
                                        type="number"
                                        min={field.min}
                                        max={field.max}
                                        step="1"
                                        value={abcFsnPolicy[field.key]}
                                        onChange={event => setAbcFsnPolicy(current => ({
                                            ...current,
                                            [field.key]: event.target.value === "" ? "" : Number(event.target.value)
                                        }))}
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="so-policy-note">
                            {"\u062a\u0635\u0646\u064a\u0641 ABC \u064a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0645\u0648\u062b\u0642\u0629. FSN \u064a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0623\u064a\u0627\u0645 \u0627\u0644\u0628\u064a\u0639 \u0648\u062a\u0627\u0631\u064a\u062e \u0622\u062e\u0631 \u0628\u064a\u0639. \u0644\u0627 \u064a\u064f\u0639\u062a\u0628\u0631 \u063a\u064a\u0627\u0628 \u0627\u0644\u0628\u064a\u0639 \u0631\u0643\u0648\u062f\u064b\u0627 \u0625\u0644\u0627 \u0628\u0639\u062f \u0627\u0643\u062a\u0645\u0627\u0644 \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u062a\u062d\u0642\u0642."}
                        </div>

                        <div className="so-policy-actions">
                            <button
                                type="button"
                                className="so-button"
                                onClick={saveAbcFsnPolicy}
                                disabled={abcFsnSaving || abcFsnPolicyLoading}
                            >
                                {abcFsnSaving
                                    ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..."
                                    : "\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0648\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062d\u0633\u0627\u0628"}
                            </button>
                            <button
                                type="button"
                                className="so-button"
                                onClick={() => {
                                    setAbcFsnPolicy({ ...DEFAULT_ABC_FSN_POLICY });
                                    setAbcFsnError("");
                                    setAbcFsnSaveMessage("");
                                }}
                                disabled={abcFsnSaving}
                            >
                                {"\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629"}
                            </button>
                        </div>

                        {abcFsnError && <div className="so-policy-error">{abcFsnError}</div>}
                        {abcFsnSaveMessage && <div className="so-policy-success">{abcFsnSaveMessage}</div>}
                    </div>

                    <div className="so-branches">
                        {(report.branchStatus || []).map(branch => (
                            <div className="so-branch" key={branch.id}>
                                <div className="so-branch-name">{branch.name}</div>
                                <div><span className={`so-status ${branch.inventoryFresh && branch.salesWindowVerified ? "good" : ""}`}>
                                    {branch.inventoryFresh ? "لقطة المخزون مكتملة" : "لقطة المخزون غير مؤهلة"}
                                </span></div>
                                <div className="so-muted" style={{ marginTop: 5 }}>
                                    المخزن الرئيسي {branch.mainStoreId || "—"} · {branch.inventoryStatus} · {formatNumber(branch.inventoryAgeHours, 1)} ساعة
                                </div>
                                <div className="so-muted">
                                    تحديث Parts محلي: {branch.latestLocalPartsVerified ? "مكتمل" : "غير مكتمل/غير موثق"} · آخر تحميل {branch.itemDataLastFinishedAt || "—"}
                                </div>
                                <div className="so-muted">مزامنة المبيعات: {branch.salesStatus}</div>
                                <div className="so-muted">
                                    تواريخ تقويمية متحققة للنافذة: {formatNumber(branch.verifiedSalesDays)}/{formatNumber(branch.expectedSalesDays)}
                                </div>
                                {(branch.blockers || []).map(code => (
                                    <div className="so-muted" key={code}>{labelFor(code)}</div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {Object.keys(report.blockerCounts || {}).length > 0 && (
                        <div className="so-reasons">
                            <h3>أكثر أسباب حجب القرار</h3>
                            <div className="so-reason-list">
                                {Object.entries(report.blockerCounts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 10)
                                    .map(([code, count]) => (
                                        <span className="so-tag" key={code}>{labelFor(code)} · {formatNumber(count)}</span>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="so-controls">
                        <strong>{report.decisionReady ? "توجد حالات جاهزة للمحاكاة" : "لا توجد توصيات نقل أو شراء مؤهلة حاليًا"}</strong>
                        <div className="so-toolbar">
                            <label className="so-coverage">
                                أيام المخزون المطلوب الاحتفاظ به
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={coverageDays}
                                    onChange={event => setCoverageDays(event.target.value)}
                                    aria-label="أيام المخزون المطلوب الاحتفاظ به"
                                />
                            </label>
                            <button type="button" className="so-button" onClick={() => loadReport(coverageDays)} disabled={loading}>
                                {loading ? "جارٍ الحساب…" : "تحديث وحساب هدف المخزون"}
                            </button>
                            <input
                                className="so-search"
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="ابحث باسم الصنف أو Master ID"
                                aria-label="البحث عن صنف"
                            />
                        </div>
                    </div>

                    <div className="so-wrap">
                        <table className="so-table">
                            <thead>
                                <tr>
                                    <th>Master</th>
                                    <th>الصنف</th>
                                    <th>الفروع ذات الربط المعتمد</th>
                                    <th>المبيعات والهدف حسب الفرع</th>
                                    <th>البدائل</th>
                                    <th>أسباب القرار</th>
                                    <th>تفاصيل الفروع</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleItems.map(item => (
                                    <tr key={item.masterItemId}>
                                                                                <td>{item.masterItemId}</td>
                                        <td>
                                            <div className="so-classification">{classificationText(item.classification)}</div>
                                        </td>
                                        <td>{item.itemName || item.unifiedCode || "—"}</td>
                                        <td>{formatNumber(item.mappedBranchCount)}/5 فروع · {formatNumber(item.localItemCount)} أكواد</td>
                                        <td>
                                            {(item.branches || []).filter(branch => branch.mappingVerified).map(branch => (
                                                <div className="so-muted" key={`sales-${branch.branchId}`}>
                                                    <strong>{branchNameFor(branch.branchId)}:</strong>{" "}
                                                    {branch.averageMonthlySalesUnits !== null
                                                        ? `متوسط شهري ${formatNumber(branch.averageMonthlySalesUnits, 2)} base_units`
                                                        : `مبيعات محجوبة (${formatNumber(branch.verifiedSalesDays)}/${formatNumber(branch.expectedSalesDays)} تواريخ متحققة)`}
                                                    {branch.targetStockUnits !== null && ` · هدف ${formatNumber(branch.coverageDays)} يومًا: ${formatNumber(branch.targetStockUnits, 2)}`}
                                                    {branch.quantityComparisonStatus === "VERIFIED" && ` · فائض ${formatNumber(branch.potentialSurplusUnits, 2)} · عجز ${formatNumber(branch.potentialDeficitUnits, 2)}`}
                                                </div>
                                            ))}
                                            {(item.branches || []).filter(branch => branch.mappingVerified).map(branch => (
                                                <div className="so-muted" key={`classification-${branch.branchId}`}>
                                                    <strong>{branchNameFor(branch.branchId)} - {"\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062D\u0631\u0643\u0629"}:</strong>{" "}
                                                    <span className="so-classification">{classificationText(branch.classification)}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td>
                                            {(item.alternatives || []).map(alternative => (
                                                <div className="so-muted" key={alternative.action}>
                                                    <strong>{ACTION_LABELS[alternative.action] || alternative.action}:</strong> {alternativeLabel(alternative)}
                                                    {(alternative.movements || []).map((movement, index) => (
                                                        <div key={`move-${index}`}>
                                                            من {branchNameFor(movement.sourceBranchId)} إلى {branchNameFor(movement.destinationBranchId)}: {formatNumber(movement.quantityUnits, 2)} وحدة
                                                        </div>
                                                    ))}
                                                    {(alternative.orders || []).map((order, index) => (
                                                        <div key={`order-${index}`}>
                                                            {order.supplierId ? "طلب للمورد" : "احتياج شراء تقديري"} · {branchNameFor(order.branchId)}: {formatNumber(order.quantityUnits, 2)} وحدة
                                                            {order.leadTimeDays !== null && order.leadTimeDays !== undefined && ` · موعد ${formatNumber(order.leadTimeDays, 1)} يوم`}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="so-detail">
                                            {(item.blockers || []).slice(0, 5).map(code => (
                                                <div className="so-muted" key={code}>• {labelFor(code)}</div>
                                            ))}
                                            {item.blockers?.length > 5 && <div className="so-muted">وأسباب أخرى ({item.blockers.length - 5})</div>}
                                        </td>
                                        <td>
                                            <details className="so-detail">
                                                <summary>عرض الحالة حسب الفرع</summary>
                                                <ul>
                                                    {(item.branches || []).map(branch => (
                                                        <li key={branch.branchId}>
                                                            {branch.branchId}: {branch.localItemIds?.join(", ") || "غير داخل المقارنة؛ لا يوجد رابط معتمد"}; المخزن الرئيسي {branch.mainStoreId || "—"}؛
                                                            مخازن {formatNumber(branch.storeCount)}؛ رصيد اللقطة {formatNumber(branch.snapshotOnHandRaw, 2)}؛ Parts {branch.partsValues?.join(", ") || "—"}
                                                            {branch.blockers?.length ? `؛ ${branch.blockers.map(labelFor).join("، ")}` : ""}
                                                            {(branch.sourceRows || []).map((source, index) => (
                                                                <div className="so-muted" key={`source-${branch.branchId}-${source.itemId}-${index}`}>
                                                                    كود {source.itemId}: {formatNumber(source.packs, 2)} عبوة × Parts {formatNumber(source.parts, 2)} + {formatNumber(source.units, 2)} وحدة = {formatNumber(source.onHandBaseUnits, 2)} وحدة مشتقة؛ مصدر الرصيد {source.sourceType || "—"} / {source.sourceRecordId || "—"} بتاريخ {source.sourceUpdatedAt || "—"}؛ تحديث Parts {source.partsSourceUpdatedAt || "—"}.
                                                                </div>
                                                            ))}
                                                            {branch.mappingVerified && branch.averageMonthlySalesUnits !== null && (
                                                                <div className="so-muted">
                                                                    متوسط صافي البيع الشهري بعد خصم المرتجعات لآخر 3 أشهر: {formatNumber(branch.averageMonthlySalesUnits, 2)} وحدة مشتقة.
                                                                    {Object.entries(branch.monthlySalesUnitsByMonth || {}).map(([month, units]) => (
                                                                        <span key={month}> {month}: {formatNumber(units, 2)}؛</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {branch.mappingVerified && branch.averageMonthlySalesUnits === null && (
                                                                <div className="so-muted">
                                                                    معدل المبيعات غير متاح: تواريخ متحققة {formatNumber(branch.verifiedSalesDays)}/{formatNumber(branch.expectedSalesDays)}؛ حالة المزامنة {branch.salesStatus}.
                                                                </div>
                                                            )}
                                                            {branch.mappingVerified && branch.targetStockUnits !== null && (
                                                                <div className="so-muted">
                                                                    هدف تغطية {formatNumber(branch.coverageDays)} يومًا: {formatNumber(branch.targetStockUnits, 2)} base_units.
                                                                </div>
                                                            )}
                                                            {branch.quantityComparisonStatus === "VERIFIED" && (
                                                                <div className="so-muted">
                                                                    فائض مقابل الهدف: {formatNumber(branch.potentialSurplusUnits, 2)} · عجز مقابل الهدف: {formatNumber(branch.potentialDeficitUnits, 2)}.
                                                                </div>
                                                            )}
                                                            {branch.mappingVerified && branch.targetStockUnits !== null && branch.quantityComparisonStatus === "BLOCKED" && (
                                                                <div className="so-muted">
                                                                    لم تُقارن الكمية: تحقق من آخر Parts محلي ورصيد المخزن الرئيسي ونافذة المبيعات.
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </details>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!visibleItems.length && <div className="so-empty">لا توجد أصناف مطابقة للبحث.</div>}
                    </div>
                    <div className="so-muted" style={{ marginTop: 8 }}>
                        نافذة المبيعات: {report.salesWindow?.from || "—"} إلى ما قبل {report.salesWindow?.toExclusive || "—"} ·
                        أشهر مكتملة: {(report.salesWindow?.months || []).join("، ") || "—"} · حد اليوم التشغيلي 03:00 ·
                        {report.coverageDays ? ` هدف الاحتفاظ: ${formatNumber(report.coverageDays)} يومًا · ` : " لم يُحدد هدف أيام التغطية · "}
                        صافي البيع = إجمالي البيع − المرتجعات؛ متوسط الشهر = صافي الأشهر الثلاثة ÷ 3؛ هدف الكمية = صافي البيع ÷ أيام النافذة × أيام الاحتفاظ. ·
                        الفروع بلا ربط معتمد مستبعدة من الحساب ولا تُعامل كرصيد صفر. ·
                        {matchingItems.length > visibleItems.length ? " عُرضت أول 200 نتيجة مطابقة." : ""}
                        {report.itemsTruncated ? " وتوجد نتائج إضافية خارج حد التقرير المعروض." : ""}
                    </div>
                </>
            )}

            {!report && !error && <div className="so-empty">جارٍ قراءة مدخلات المحرك من الكاش المحلي…</div>}
        </section>
    );
}
