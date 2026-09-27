import React from 'react';

import AnalyticsHubPanel
    from '../components/AnalyticsHubPanel.jsx';

import BranchPerformancePanel
    from '../components/BranchPerformancePanel.jsx';

import SalesPage
    from './SalesPage.jsx';


import MasterItemPage
    from '../components/MasterItemPage.jsx';


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
    renderBranchOverview,
    renderDashboardOverview,
    renderBranchConnections,
    renderCacheStatus,
    renderSales
}) {

    /*
     * =========================================================
     * SYSTEM
     * =========================================================
     */

    if (
        activeSection ===
        'system'
    ) {

        if (
            activeModule ===
            'connections'
        ) {
            return renderBranchConnections();
        }

        if (
            activeModule ===
            'cache'
        ) {
            return renderCacheStatus();
        }

    }



    /*
     * =========================================================
     * MASTER ITEMS
     * GROUP-WIDE
     * =========================================================
     */

    if (
        activeSection ===
        'products' &&
        activeModule ===
        'master-items'
    ) {

        return (
            <MasterItemPage />
        );

    }

    /*
     * =========================================================
     * SALES OVERVIEW
     * =========================================================
     */

    if (
        activeSection ===
        'sales' &&
        activeModule ===
        'sales-overview'
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
                    'sales-overview'
                }
            />
        );

    }


    /*
     * =========================================================
     * DASHBOARD OVERVIEW
     * =========================================================
     */

    if (
        activeSection ===
        'dashboard' &&
        activeModule ===
        'overview'
    ) {

        return renderDashboardOverview();

    }


    /*
     * =========================================================
     * SALES FORECAST
     *
     * Forecast is branch-specific.
     * "All Branches" is not a valid target for the branch
     * forecast engine.
     * =========================================================
     */

    if (
        activeModule ===
        'forecast-sales'
    ) {

        if (
            String(
                selectedBranchId
            ) ===
            'all'
        ) {

            return (
                <section
                    className="page-card empty-state"
                >

                    <div className="page-eyebrow">
                        SALES FORECAST
                    </div>

                    <h2>
                        توقع المبيعات
                    </h2>

                    <p>
                        اختر فرعًا محددًا لعرض توقع مبيعات الشهر القادم
                        وإعداد Program A وProgram B.
                    </p>

                </section>
            );

        }


        return (
            <BranchPerformancePanel

                mode="forecast"

                branchId={
                    selectedBranchId
                }

                connection={
                    selectedConnection
                }

                toDate={
                    toDate
                }

                historyMonths={
                    12
                }

            />
        );

    }


    /*
     * =========================================================
     * DEFAULT ANALYTICS
     * =========================================================
     */

    return (
        <AnalyticsHubPanel

            moduleId={
                activeModule
            }

            branchId={
                selectedBranchId
            }

            connection={
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