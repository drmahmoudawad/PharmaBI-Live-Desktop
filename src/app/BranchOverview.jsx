import React from "react";

import {
    formatMoney,
    formatNumber,
    formatPercent
} from "./appHelpers.js";


export default function BranchOverview({
    selectedBranchName,
    fromDate,
    toDate,
    branchOverviewLoading,
    branchOverviewError,
    branchOverview
}) {

    return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            ذكاء الفرع
                        </div>


                        <h2>
                            نظرة عامة على النشاط
                        </h2>


                        <p>

                            أداء {
                                selectedBranchName
                            }
                            {" "}
                            خلال الفترة المحددة.

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
                    branchOverviewLoading && (

                        <div className="status loading">

                            جاري تحميل بيانات{" "}
                            {
                                selectedBranchName
                            }
                            ...

                        </div>

                    )
                }


                {
                    branchOverviewError && (

                        <div className="status error">

                            {
                                branchOverviewError
                            }

                        </div>

                    )
                }


                {
                    branchOverview &&
                    !branchOverviewLoading && (

                        <>

                            <div className="kpi-grid">

                                <div className="kpi-card">

                                    <span>
                                        إجمالي المبيعات
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                branchOverview.grossSales
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
                                                branchOverview.returns
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        صافي المبيعات
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                branchOverview.netSales
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        صافي التكلفة
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                branchOverview.netCost
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        صافي الربح
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                branchOverview.netProfit
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
                                                branchOverview.grossMargin
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        فواتير البيع
                                    </span>

                                    <strong>

                                        {
                                            formatNumber(
                                                branchOverview.saleTickets
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        متوسط الفاتورة
                                    </span>

                                    <strong>

                                        {
                                            formatMoney(
                                                branchOverview.averageTicket
                                            )
                                        }

                                    </strong>

                                </div>


                                <div className="kpi-card">

                                    <span>
                                        صافي الوحدات
                                    </span>

                                    <strong>

                                        {
                                            formatNumber(
                                                branchOverview.netUnits
                                            )
                                        }

                                    </strong>

                                </div>

                            </div>


                            <div className="table-card">

                                <div className="table-card-header">

                                    <div>

                                        <strong>
                                            أداء الفرع
                                        </strong>

                                        <span>
                                            {selectedBranchName}
                                        </span>

                                    </div>

                                </div>


                                <div className="table-wrap">

                                    <table>

                                        <thead>

                                            <tr>

                                                <th>
                                                    المؤشر
                                                </th>

                                                <th>
                                                    القيمة
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            <tr>

                                                <td>
                                                    بنود المبيعات
                                                </td>

                                                <td>
                                                    {
                                                        formatNumber(
                                                            branchOverview.saleLines
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    بنود المرتجعات
                                                </td>

                                                <td>
                                                    {
                                                        formatNumber(
                                                            branchOverview.returnLines
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    إجمالي التكلفة
                                                </td>

                                                <td>
                                                    {
                                                        formatMoney(
                                                            branchOverview.grossCost
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    إجمالي الربح
                                                </td>

                                                <td>
                                                    {
                                                        formatMoney(
                                                            branchOverview.grossProfit
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    معدل المرتجعات
                                                </td>

                                                <td>
                                                    {
                                                        formatPercent(
                                                            branchOverview.returnRate
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    الوحدات المرتجعة
                                                </td>

                                                <td>
                                                    {
                                                        formatNumber(
                                                            branchOverview.returnedUnits
                                                        )
                                                    }
                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    فواتير المطابقة
                                                </td>

                                                <td>

                                                    {
                                                        formatNumber(

                                                            branchOverview
                                                                ?.reconciliation
                                                                ?.ticketCount

                                                        )
                                                    }

                                                </td>

                                            </tr>


                                            <tr>

                                                <td>
                                                    الفواتير ذات الفروقات
                                                </td>

                                                <td>

                                                    {
                                                        formatNumber(

                                                            branchOverview
                                                                ?.reconciliation
                                                                ?.ticketsWithDifference

                                                        )
                                                    }

                                                </td>

                                            </tr>

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


