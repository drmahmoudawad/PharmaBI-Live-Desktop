import React from "react";


import ProductAnalyticsPanel
    from "../components/ProductAnalyticsPanel.jsx";


import CustomerAnalyticsPanel
    from "../components/CustomerAnalyticsPanel.jsx";


import SalesPage
    from "./SalesPage.jsx";


export default function BranchAnalyticsRouter({

    activeSection,
    activeModule,
    activeModuleDefinition,
    activeSectionDefinition,
    selectedConnection,
    selectedBranchId,
    selectedBranchName,
    fromDate,
    toDate,
    branchOverview,
    branchOverviewLoading,
    branchOverviewError,
    renderBranchOverview,
    renderBranchConnections,
    renderCacheStatus,
    renderSales

}) {

    /*
     * =========================================================
     * DASHBOARD
     * =========================================================
     */

    if (
        activeSection ===
        "dashboard"
    ) {

        if (
            activeModule ===
            "overview"
        ) {

            return renderBranchOverview();

        }


        return (

            <section className="page-card empty-state">

                <div className="page-eyebrow">
                    لوحة التحكم
                </div>


                <h2>
                    {
                        activeModuleDefinition?.label
                    }
                </h2>


                <p>
                    هذا التحليل سيتم ربطه على مستوى الفرع.
                </p>

            </section>

        );

    }


    /*
     * =========================================================
     * SALES
     *
     * sales-overview is intentionally rendered directly by
     * SalesPage.jsx so it can never fall back to the legacy
     * SalesAnalyticsPanel.
     *
     * =========================================================
     */

    if (
        activeSection ===
        "sales"
    ) {

        if (
            activeModule ===
                "sales-overview" ||
            activeModule ===
                "overview" ||
            activeModule ===
                "sales"
        ) {

            return (

                <SalesPage

                    selectedBranchId={
                        selectedBranchId
                    }

                    selectedConnection={
                        selectedConnection
                    }

                    fromDate={
                        fromDate
                    }

                    toDate={
                        toDate
                    }

                    activeModule={
                        "sales-overview"
                    }

                />

            );

        }


        return renderSales();

    }


    /*
     * =========================================================
     * PRODUCTS
     * =========================================================
     */

    if (
        activeSection ===
        "products"
    ) {

        if (
            !selectedConnection
        ) {

            return (

                <section className="page-card empty-state">

                    <h2>
                        اختر فرعًا لعرض تحليلات المنتجات
                    </h2>

                </section>

            );

        }


        return (

            <ProductAnalyticsPanel

                connectionPayload={
                    selectedConnection
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }

            />

        );

    }


    /*
     * =========================================================
     * CUSTOMERS
     * =========================================================
     */

    if (
        activeSection ===
        "customers"
    ) {

        if (
            !selectedConnection
        ) {

            return (

                <section className="page-card empty-state">

                    <h2>
                        اختر فرعًا لعرض تحليلات العملاء
                    </h2>

                </section>

            );

        }


        return (

            <CustomerAnalyticsPanel

                connectionPayload={
                    selectedConnection
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }

            />

        );

    }


    /*
     * =========================================================
     * BRANCHES
     * =========================================================
     */

    if (
        activeSection ===
        "branches"
    ) {

        return (

            <section className="page-card empty-state">

                <div className="page-eyebrow">
                    تحليلات الفروع
                </div>


                <h2>
                    {
                        activeModuleDefinition?.label
                    }
                </h2>


                <p>
                    تحليلات الفروع ستستخدم اسم الفرع ومعرفه الداخلي.
                </p>

            </section>

        );

    }


    /*
     * =========================================================
     * SYSTEM
     * =========================================================
     */

    if (
        activeSection ===
        "system"
    ) {

        if (
            activeModule ===
            "connections"
        ) {

            return renderBranchConnections();

        }


        if (
            activeModule ===
            "cache"
        ) {

            return renderCacheStatus();

        }


        return renderBranchConnections();

    }


    /*
     * =========================================================
     * FALLBACK
     * =========================================================
     */

    return (

        <section className="page-card empty-state">

            <div className="page-eyebrow">

                {
                    activeSectionDefinition?.label
                }

            </div>


            <h2>

                {
                    activeModuleDefinition?.label
                }

            </h2>


            <p>

                هذا التحليل موجود داخل القائمة وسيتم ربطه بالتحليل الفعلي الخاص به.

            </p>

        </section>

    );

}
