import React from "react";

import {
    normalizeBranchName,
    formatMoney,
    formatNumber,
    formatPercent
} from "./appHelpers.js";


export default function GroupOverview({
    groupLoading,
    groupError,
    groupOverview,
    savedBranches,
    fromDate,
    toDate
}) {

    return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            ذكاء المجموعة
                        </div>


                        <h2>
                            نظرة عامة على النشاط
                        </h2>


                        <p>
                            الأداء المجمّع لجميع الفروع المحفوظة.
                        </p>

                    </div>


                    <div className="period-chip">

                        {fromDate}

                        <span>
                            →
                        </span>

                        {toDate}

                    </div>

                </div>


                {
                    groupLoading && (

                        <div className="status loading">

                            جاري تحليل المجموعة...

                        </div>

                    )
                }


                {
                    groupError && (

                        <div className="status error">

                            {
                                groupError
                            }

                        </div>

                    )
                }


                {
                    groupOverview?.success && (

                        <>

                            <div className="kpi-grid">

                                <div className="kpi-card">

                                    <span>
                                        الفروع
                                    </span>

                                    <strong>

                                        {
                                            formatNumber(
                                                groupOverview
                                                    .summary
                                                    .branches
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        مبيعات المجموعة
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                groupOverview
                                                    .summary
                                                    .sales
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        ربح المجموعة
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                groupOverview
                                                    .summary
                                                    .profit
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        هامش الربح
                                    </span>

                                    <strong>

                                        {
                                            formatPercent(
                                                groupOverview
                                                    .summary
                                                    .margin
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        الفواتير
                                    </span>

                                    <strong>

                                        {
                                            formatNumber(
                                                groupOverview
                                                    .summary
                                                    .invoices
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        المرتجعات
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                groupOverview
                                                    .summary
                                                    .returns
                                            )
                                        }

                                    </strong>

                                </div>

                            </div>


                            <div className="table-card">

                                <div className="table-card-header">

                                    <div>

                                        <strong>
                                            ترتيب الفروع
                                        </strong>

                                        <span>
                                            حسب صافي المبيعات
                                        </span>

                                    </div>

                                </div>


                                <div className="table-wrap">

                                    <table>

                                        <thead>

                                            <tr>

                                                <th>
                                                    الترتيب
                                                </th>

                                                <th>
                                                    الفرع
                                                </th>

                                                <th>
                                                    المبيعات
                                                </th>

                                                <th>
                                                    التكلفة
                                                </th>

                                                <th>
                                                    الربح
                                                </th>

                                                <th>
                                                    هامش الربح
                                                </th>

                                                <th>
                                                    الفواتير
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {
                                                (
                                                    groupOverview.branches ||
                                                    []
                                                ).map(

                                                    branch => {

                                                        const branchInfo =
                                                            savedBranches.find(

                                                                item =>

                                                                    Number(
                                                                        item.branchId
                                                                    ) ===
                                                                    Number(
                                                                        branch.branchId
                                                                    )

                                                            );


                                                        const branchName =
                                                            normalizeBranchName(

                                                                branchInfo || {

                                                                    branchId:
                                                                        branch.branchId

                                                                }

                                                            );


                                                        return (

                                                            <tr

                                                                key={
                                                                    branch.branchId
                                                                }

                                                            >

                                                                <td>

                                                                    <span className="rank-badge">

                                                                        {
                                                                            branch.rank
                                                                        }

                                                                    </span>

                                                                </td>


                                                                <td>

                                                                    <strong>

                                                                        {
                                                                            branchName
                                                                        }

                                                                    </strong>

                                                                </td>


                                                                <td>

                                                                    {
                                                                        formatMoney(
                                                                            branch.sales
                                                                        )
                                                                    }

                                                                </td>


                                                                <td>

                                                                    {
                                                                        formatMoney(
                                                                            branch.cost
                                                                        )
                                                                    }

                                                                </td>


                                                                <td>

                                                                    {
                                                                        formatMoney(
                                                                            branch.profit
                                                                        )
                                                                    }

                                                                </td>


                                                                <td>

                                                                    {
                                                                        formatPercent(
                                                                            branch.margin
                                                                        )
                                                                    }

                                                                </td>


                                                                <td>

                                                                    {
                                                                        formatNumber(
                                                                            branch.invoices
                                                                        )
                                                                    }

                                                                </td>

                                                            </tr>

                                                        );

                                                    }

                                                )
                                            }

                                        </tbody>

                                    </table>

                                </div>

                            </div>

                        </>

                    )
                }

            </section>

        );

    }


