import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

export default function SupplierPerformancePanel({
    data,
    Table,
    money,
    num,
    pct,
    n
}) {
    const suppliers = Array.isArray(data?.suppliers)
        ? data.suppliers
        : [];

    const [supplierCategories, setSupplierCategories] =
        useState(() => {
            try {
                const raw = localStorage.getItem(
                    'pharmabi_supplier_categories_v1'
                );

                return raw
                    ? JSON.parse(raw)
                    : {};
            } catch {
                return {};
            }
        });

    const [supplierFilter, setSupplierFilter] =
        useState('all');

    const [supplierExclusions, setSupplierExclusions] =
        useState(() => {
            try {
                const raw = localStorage.getItem(
                    'pharmabi_supplier_exclusions_v1'
                );

                return raw
                    ? JSON.parse(raw)
                    : {};
            } catch {
                return {};
            }
        });

    useEffect(() => {
        try {
            localStorage.setItem(
                'pharmabi_supplier_categories_v1',
                JSON.stringify(supplierCategories)
            );
        } catch {}
    }, [supplierCategories]);

    useEffect(() => {
        try {
            localStorage.setItem(
                'pharmabi_supplier_exclusions_v1',
                JSON.stringify(supplierExclusions)
            );
        } catch {}
    }, [supplierExclusions]);

    const supplierKey = row =>
        String(
            row?.supplierId ??
            row?.supplierName ??
            ''
        ).trim();

    const categoryFor = row =>
        supplierCategories[supplierKey(row)] ||
        'unclassified';

    const categoryLabel = category => {
        if (category === 'medicine') {
            return 'أدوية';
        }

        if (category === 'accessories') {
            return 'إكسسوارات';
        }

        return 'غير مصنف';
    };

    const isSupplierExcluded = row =>
        supplierExclusions[supplierKey(row)] === true;

    const visibleSuppliers = useMemo(() => {
        if (supplierFilter === 'all') {
            return suppliers;
        }

        return suppliers.filter(
            row =>
                categoryFor(row) ===
                supplierFilter
        );
    }, [
        suppliers,
        supplierFilter,
        supplierCategories
    ]);

    const includedVisibleSuppliers =
        visibleSuppliers.filter(
            row =>
                !isSupplierExcluded(row)
        );

    const categoryTotals = useMemo(() => {
        const result = {
            medicine: {
                suppliers: 0,
                netPurchaseBeforeDiscount: 0,
                netPurchaseCost: 0,
                purchaseProfit: 0,
                netPacks: 0,
                netUnits: 0
            },

            accessories: {
                suppliers: 0,
                netPurchaseBeforeDiscount: 0,
                netPurchaseCost: 0,
                purchaseProfit: 0,
                netPacks: 0,
                netUnits: 0
            },

            unclassified: {
                suppliers: 0,
                netPurchaseBeforeDiscount: 0,
                netPurchaseCost: 0,
                purchaseProfit: 0,
                netPacks: 0,
                netUnits: 0
            }
        };

        suppliers
            .filter(
                row =>
                    !isSupplierExcluded(row)
            )
            .forEach(row => {
                const category =
                    categoryFor(row);

                const bucket =
                    result[category] ||
                    result.unclassified;

                bucket.suppliers += 1;

                bucket.netPurchaseBeforeDiscount +=
                    n(
                        row?.netPurchaseBeforeDiscount
                    );

                bucket.netPurchaseCost +=
                    n(
                        row?.netPurchaseCost
                    );

                bucket.purchaseProfit +=
                    n(
                        row?.purchaseProfit
                    );

                bucket.netPacks +=
                    n(
                        row?.netPacks
                    );

                bucket.netUnits +=
                    n(
                        row?.netUnits
                    );
            });

        return result;
    }, [
        suppliers,
        supplierCategories,
        supplierExclusions
    ]);

    const filteredTotal = useMemo(() => {
        return includedVisibleSuppliers.reduce(
            (acc, row) => ({
                suppliers:
                    acc.suppliers + 1,

                invoices:
                    acc.invoices +
                    n(row?.invoices),

                lines:
                    acc.lines +
                    n(row?.lines),

                items:
                    acc.items +
                    n(row?.items),

                netPurchaseBeforeDiscount:
                    acc.netPurchaseBeforeDiscount +
                    n(
                        row?.netPurchaseBeforeDiscount
                    ),

                netPurchaseCost:
                    acc.netPurchaseCost +
                    n(
                        row?.netPurchaseCost
                    ),

                purchaseProfit:
                    acc.purchaseProfit +
                    n(
                        row?.purchaseProfit
                    ),

                netPacks:
                    acc.netPacks +
                    n(
                        row?.netPacks
                    ),

                netUnits:
                    acc.netUnits +
                    n(
                        row?.netUnits
                    )
            }),
            {
                suppliers: 0,
                invoices: 0,
                lines: 0,
                items: 0,
                netPurchaseBeforeDiscount: 0,
                netPurchaseCost: 0,
                purchaseProfit: 0,
                netPacks: 0,
                netUnits: 0
            }
        );
    }, [
        includedVisibleSuppliers
    ]);

    const filteredMargin =
        filteredTotal.netPurchaseBeforeDiscount > 0
            ? (
                filteredTotal.purchaseProfit /
                filteredTotal.netPurchaseBeforeDiscount
            ) * 100
            : 0;

    const summaryRows = [
        'medicine',
        'accessories',
        'unclassified'
    ].map(category => {
        const row =
            categoryTotals[category];

        const margin =
            row.netPurchaseBeforeDiscount > 0
                ? (
                    row.purchaseProfit /
                    row.netPurchaseBeforeDiscount
                ) * 100
                : 0;

        return {
            category,
            label: categoryLabel(category),
            suppliers: row.suppliers,
            netPurchaseCost:
                row.netPurchaseCost,
            netPacks:
                row.netPacks,
            netUnits:
                row.netUnits,
            margin
        };
    });

    const supplierColumns = [
        {
            key: 'supplierName',
            label: 'المورد'
        },

        {
            key: 'category',
            label: 'التصنيف',
            render: row => (
                <select
                    value={categoryFor(row)}
                    onChange={event => {
                        const key =
                            supplierKey(row);

                        setSupplierCategories(
                            previous => ({
                                ...previous,
                                [key]:
                                    event.target.value
                            })
                        );
                    }}
                    style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border:
                            '1px solid rgba(127,127,127,.25)',
                        background: '#fff',
                        fontFamily: 'inherit'
                    }}
                >
                    <option value="medicine">
                        أدوية
                    </option>

                    <option value="accessories">
                        إكسسوارات
                    </option>

                    <option value="unclassified">
                        غير مصنف
                    </option>
                </select>
            )
        },

        {
            key: 'aggregationStatus',
            label: 'تجميع المشتريات',
            render: row => {
                const excluded =
                    isSupplierExcluded(row);

                return (
                    <button
                        type="button"
                        onClick={() => {
                            const key =
                                supplierKey(row);

                            setSupplierExclusions(
                                previous => {
                                    const next = {
                                        ...previous
                                    };

                                    if (
                                        next[key]
                                    ) {
                                        delete next[key];
                                    } else {
                                        next[key] =
                                            true;
                                    }

                                    return next;
                                }
                            );
                        }}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border:
                                '1px solid rgba(127,127,127,.25)',
                            background:
                                excluded
                                    ? '#dcfce7'
                                    : '#fee2e2',
                            color:
                                excluded
                                    ? '#166534'
                                    : '#991b1b',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontWeight: 700
                        }}
                    >
                        {
                            excluded
                                ? 'إعادة'
                                : 'استبعاد'
                        }
                    </button>
                );
            }
        },

        {
            key: 'invoices',
            label: 'الفواتير',
            render: row =>
                num(row.invoices)
        },

        {
            key: 'lines',
            label: 'بنود الشراء',
            render: row =>
                num(row.lines)
        },

        {
            key: 'items',
            label: 'الأصناف',
            render: row =>
                num(row.items)
        },

        {
            key: 'netPurchaseBeforeDiscount',
            label: 'إجمالي قبل الخصم',
            render: row =>
                money(
                    row.netPurchaseBeforeDiscount
                )
        },

        {
            key: 'netPurchaseCost',
            label: 'التكلفة الفعلية',
            render: row =>
                money(
                    row.netPurchaseCost
                )
        },

        {
            key: 'netPacks',
            label: 'العبوات',
            render: row =>
                num(row.netPacks)
        },

        {
            key: 'netUnits',
            label: 'الوحدات',
            render: row =>
                num(row.netUnits)
        },

        {
            key: 'purchaseProfit',
            label: 'ربحية المشتريات',
            render: row =>
                money(
                    row.purchaseProfit
                )
        },

        {
            key: 'purchaseMarginPercent',
            label: 'هامش الربحية',
            render: row =>
                pct(
                    row.purchaseMarginPercent
                )
        }
    ];

    const tableRows =
        visibleSuppliers.map(row => ({
            ...row,
            isExcluded:
                isSupplierExcluded(row)
        }));

    const totalRow = {
        supplierName: 'الإجمالي',

        supplierId: '__TOTAL__',

        invoices:
            filteredTotal.invoices,

        lines:
            filteredTotal.lines,

        items:
            filteredTotal.items,

        netPurchaseBeforeDiscount:
            filteredTotal.netPurchaseBeforeDiscount,

        netPurchaseCost:
            filteredTotal.netPurchaseCost,

        netPacks:
            filteredTotal.netPacks,

        netUnits:
            filteredTotal.netUnits,

        purchaseProfit:
            filteredTotal.purchaseProfit,

        purchaseMarginPercent:
            filteredMargin
    };

    const body = (
        <>
            <div
                style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 16
                }}
            >
                <strong>
                    تصنيف الموردين
                </strong>

                <select
                    value={supplierFilter}
                    onChange={event =>
                        setSupplierFilter(
                            event.target.value
                        )
                    }
                    style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border:
                            '1px solid rgba(127,127,127,.25)',
                        background:
                            'transparent',
                        fontFamily: 'inherit',
                        fontWeight: 700
                    }}
                >
                    <option value="all">
                        كل الموردين
                    </option>

                    <option value="medicine">
                        أدوية
                    </option>

                    <option value="accessories">
                        إكسسوارات
                    </option>

                    <option value="unclassified">
                        غير مصنف
                    </option>
                </select>
            </div>

            <div className="table-card">
                <div className="table-card-header">
                    <div>
                        <strong>
                            ملخص تصنيف الموردين
                        </strong>

                        <span>
                            التصنيف لا يدخل في الحساب إلا للموردين غير المستبعدين
                        </span>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    الفئة
                                </th>

                                <th>
                                    الموردون
                                </th>

                                <th>
                                    قيمة المشتريات
                                </th>

                                <th>
                                    العبوات
                                </th>

                                <th>
                                    الوحدات
                                </th>

                                <th>
                                    هامش الربحية
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {summaryRows.map(row => (
                                <tr
                                    key={
                                        row.category
                                    }
                                >
                                    <td>
                                        {row.label}
                                    </td>

                                    <td>
                                        {num(
                                            row.suppliers
                                        )}
                                    </td>

                                    <td>
                                        {money(
                                            row.netPurchaseCost
                                        )}
                                    </td>

                                    <td>
                                        {num(
                                            row.netPacks
                                        )}
                                    </td>

                                    <td>
                                        {num(
                                            row.netUnits
                                        )}
                                    </td>

                                    <td>
                                        {pct(
                                            row.margin
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div
                style={{
                    marginTop: 18
                }}
            >
                <Table
                    columns={
                        supplierColumns
                    }
                    rows={[
                        ...tableRows,
                        totalRow
                    ]}
                />
            </div>

            <div
                className="table-card"
                style={{
                    marginTop: 18
                }}
            >
                <div className="table-card-header">
                    <div>
                        <strong>
                            إجمالي الاختيار الحالي
                        </strong>

                        <span>
                            {
                                supplierFilter ===
                                'all'
                                    ? 'كل الموردين'
                                    : categoryLabel(
                                        supplierFilter
                                    )
                            }
                        </span>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    الموردون
                                </td>
                                <td>
                                    {num(
                                        filteredTotal.suppliers
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    قيمة المشتريات
                                </td>
                                <td>
                                    {money(
                                        filteredTotal.netPurchaseCost
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    العبوات
                                </td>
                                <td>
                                    {num(
                                        filteredTotal.netPacks
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    الوحدات
                                </td>
                                <td>
                                    {num(
                                        filteredTotal.netUnits
                                    )}
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    ربحية المشتريات
                                </td>
                                <td>
                                    {money(
                                        filteredTotal.purchaseProfit
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    return body;
}