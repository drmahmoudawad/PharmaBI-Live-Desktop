import React from 'react';

export default function PurchaseOverviewPanel({
    data,
    Table,
    money,
    pct
}) {

            const branchRows =
                Array.isArray(data?.branches)
                    ? data.branches
                    : [];

            const total =
                data?.total || {};

            const body = (
                <Table
                    columns={[
                        {
                            key: 'branchName',
                            label: '\u0627\u0644\u0641\u0631\u0639'
                        },
                        {
                            key: 'salesTotal',
                            label: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a',
                            render: row =>
                                money(
                                    row.salesTotal
                                )
                        },
                        {
                            key: 'salesProfit',
                            label: '\u0631\u0628\u062d\u064a\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a',
                            render: row =>
                                money(
                                    row.salesProfit
                                )
                        },
                        {
                            key: 'salesMarginPercent',
                            label: '\u0647\u0627\u0645\u0634 \u0631\u0628\u062d\u064a\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a',
                            render: row =>
                                pct(
                                    row.salesMarginPercent
                                )
                        },
                        {
                            key: 'netPurchaseBeforeDiscount',
                            label: '\u0625\u062c\u0645\u0627\u0644\u064a \u0642\u0628\u0644 \u0627\u0644\u062e\u0635\u0645',
                            render: row =>
                                money(
                                    row.netPurchaseBeforeDiscount
                                )
                        },
                        {
                            key: 'netPurchaseCost',
                            label: '\u0627\u0644\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0641\u0639\u0644\u064a\u0629',
                            render: row =>
                                money(
                                    row.netPurchaseCost
                                )
                        },
                        {
                            key: 'purchaseProfit',
                            label: '\u0631\u0628\u062d\u064a\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a',
                            render: row =>
                                money(
                                    row.purchaseProfit
                                )
                        },
                        {
                            key: 'purchaseMarginPercent',
                            label: '\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062d\u064a\u0629',
                            render: row =>
                                pct(
                                    row.purchaseMarginPercent
                                )
                        }
                    ]}
                    rows={[
                        ...branchRows,
                        {
                            branchName:
                                '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a',
                            netPurchaseBeforeDiscount:
                                total.netPurchaseBeforeDiscount,
                            netPurchaseCost:
                                total.netPurchaseCost,
                            purchaseProfit:
                                total.purchaseProfit,
                            purchaseMarginPercent:
                                total.purchaseMarginPercent,

                            salesTotal:
                                total.salesTotal,

                            salesProfit:
                                total.salesProfit,

                            salesMarginPercent:
                                total.salesMarginPercent
                        }
                    ]}
                />
            );


    return body;
}
