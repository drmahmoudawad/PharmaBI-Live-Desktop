import React, {
    useEffect,
    useMemo,
    useState
} from "react";


import {
    NAVIGATION
} from "./navigation.js";


import {
    useBranchState
} from "../hooks/useBranchState.js";


import BranchEditor
    from "./BranchEditor.jsx";


import GroupOverview
    from "./GroupOverview.jsx";


import BranchOverview
    from "./BranchOverview.jsx";


import DashboardOverview
    from "../components/DashboardOverview.jsx";


import BranchConnections
    from "./BranchConnections.jsx";


import CacheStatus
    from "./CacheStatus.jsx";


import SalesPage
    from "./SalesPage.jsx";


import BranchAnalyticsRouter
    from "./BranchAnalyticsRouter.jsx";

import MasterItemPage
    from "../components/MasterItemPage.jsx";


import {
    buildTodayRange,
    isValidSavedBranch,
    normalizeBranchName,
    sortBranches,
    buildConnectionPayload,
    buildEmptyConnection,
    formatMoney,
    formatNumber,
    formatPercent,
    isBranchActive
} from "./appHelpers.js";
function App() {

    const initialRange =
        useMemo(

            () =>
                buildTodayRange(),

            []

        );



    const [
        activeSection,
        setActiveSection
    ] = useState("system");


    const [
        activeModule,
        setActiveModule
    ] = useState("connections");


    const [
        openMenu,
        setOpenMenu
    ] = useState(null);


    const [
        fromDate,
        setFromDate
    ] = useState(initialRange.fromDate);


    const [
        toDate,
        setToDate
    ] = useState(initialRange.toDate);


    const [
        groupOverview,
        setGroupOverview
    ] = useState(null);


    const [
        groupLoading,
        setGroupLoading
    ] = useState(false);


    const [
        groupError,
        setGroupError
    ] = useState("");


    const {
        savedBranches,
        selectedBranchId,
        setSelectedBranchId,
        selectedConnection,
        setSelectedConnection,
        branchOverview,
        setBranchOverview,
        branchOverviewLoading,
        branchOverviewError,
        setBranchOverviewError,
        loadingBranches,
        loadingBranch,
        setLoadingBranch,
        connectionStatus,
        setConnectionStatus,
        systemConnection,
        setSystemConnection,
        branchEditor,
        branchEditorBusy,
        branchEditorMessage,
        activeConnections,
        refreshActiveConnections,
        loadSavedBranches,
        selectBranch,
        openAddBranchEditor,
        openEditBranchEditor,
        closeBranchEditor,
        updateBranchEditorField,
        updateBranchEditorName,
        updateBranchEditorId,
        saveBranchFromEditor,
        deleteBranch,
        reconnectBranch,
        closeBranch,
        testCurrentConnection
    } = useBranchState({
        initialRange,
        fromDate,
        toDate,
        activeSection,
        activeModule
    });



 /*
     * =========================================================
     * NAVIGATION
     * =========================================================
     */

    function toggleMenu(
        section
    ) {

        setOpenMenu(

            current =>

                current ===
                section.id

                    ? null
                    : section.id

        );

    }


    function selectModule(
        section,
        module
    ) {

        const resolvedSectionId =
            module?.sectionId ||
            section.id;


        setActiveSection(
            resolvedSectionId
        );

        setActiveModule(
            module.id
        );

        setOpenMenu(
            null
        );

        if (
            resolvedSectionId ===
            "dashboard"
        ) {

            setBranchOverviewError(
                ""
            );

        }

    }


    /*
     * =========================================================
     * SALES VIEW
     * =========================================================
     */

    function renderSales() {

        return (

            <SalesPage
                selectedBranchId={selectedBranchId}
                selectedConnection={selectedConnection}
                fromDate={fromDate}
                toDate={toDate}
                activeModule={activeModule}
            />

        );

    }


    function renderDashboardOverview() {

        return (

            <DashboardOverview
                selectedBranchId={selectedBranchId}
                selectedConnection={selectedConnection}
                fromDate={fromDate}
                toDate={toDate}
                selectedBranchName={selectedBranchName}
            />

        );

    }


 /*
     * =========================================================
     * ACTIVE DEFINITIONS
     * =========================================================
     */

    const activeSectionDefinition =
        NAVIGATION.find(

            section =>

                section.id ===
                activeSection

        ) ||

        NAVIGATION.find(

            section =>

                section.children?.some(

                    module =>

                        (module.sectionId || section.id) ===
                        activeSection

                )

        ) ||

        NAVIGATION[0];


    const activeModuleDefinition =
        NAVIGATION
            .flatMap(
                section =>
                    section.children || []
            )
            .find(
                module =>
                    module.id ===
                    activeModule
            ) ||

        activeSectionDefinition
            ?.children
            ?.[0] ||

        null;


    const selectedBranchDefinition =
        selectedBranchId ===
        "all"

            ? null

            : savedBranches.find(

                branch =>

                    Number(
                        branch.branchId
                    ) ===
                    Number(
                        selectedBranchId
                    )

            );


    const selectedBranchName =
        selectedBranchDefinition

            ? normalizeBranchName(
                selectedBranchDefinition
            )

            : "كل الفروع";


    /*
     * =========================================================
     * GROUP OVERVIEW
     * =========================================================
     */




    /*
     * =========================================================
     * BRANCH BUSINESS OVERVIEW
     * =========================================================
     */




    /*
     * =========================================================
     * BRANCH CONNECTIONS
     * =========================================================
     */




    /*
     * =========================================================
     * CACHE STATUS
     * =========================================================
     */




    /*
     * =========================================================
     * SALES
     * =========================================================
     */


    /*
     * =========================================================
     * BRANCH EDITOR MODAL
     * =========================================================
     */



    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (

        <main className="app-shell">

            <header className="top-shell">

                <div className="top-row">

                    <div className="brand-block">

                        <div className="brand-mark">
                            PB
                        </div>


                        <div>

                            <div className="brand-name">
                                PharmaBI
                            </div>


                            <div className="brand-caption">
                                ذكاء PharmaFly
                            </div>

                        </div>

                    </div>


                    <div className="global-controls">

                        <label className="global-control">

                            <span>
                                الفرع
                            </span>


                            <select

                                value={
                                    selectedBranchId
                                }

                                onChange={event =>
                                    selectBranch(
                                        event.target.value
                                    )
                                }

                                disabled={

                                    loadingBranches ||
                                    loadingBranch

                                }

                            >

                                <option value="all">
                                    كل الفروع
                                </option>


                                {
                                    savedBranches.map(

                                        branch => (

                                            <option

                                                key={
                                                    branch.branchId
                                                }

                                                value={
                                                    branch.branchId
                                                }

                                            >

                                                {
                                                    normalizeBranchName(
                                                        branch
                                                    )
                                                }

                                            </option>

                                        )

                                    )

                                }

                            </select>

                        </label>


                        <label className="global-control">

                            <span>
                                من
                            </span>


                            <input

                                type="date"

                                value={
                                    fromDate
                                }

                                onChange={event =>
                                    setFromDate(
                                        event.target.value
                                    )
                                }

                            />

                        </label>


                        <label className="global-control">

                            <span>
                                إلى
                            </span>


                            <input

                                type="date"

                                value={
                                    toDate
                                }

                                onChange={event =>
                                    setToDate(
                                        event.target.value
                                    )
                                }

                            />

                        </label>

                    </div>

                </div>


                <div className="navigation-row">

                    <nav className="main-navigation">

                        {
                            NAVIGATION.map(

                                section => {

                                    const active =
                                        activeSection ===
                                        section.id ||
                                        section.children?.some(
                                            module =>
                                                (module.sectionId || section.id) ===
                                                activeSection
                                        );


                                    const open =
                                        openMenu ===
                                        section.id;


                                    return (

                                        <div

                                            className="navigation-item"

                                            key={
                                                section.id
                                            }

                                        >

                                            <button

                                                type="button"

                                                className={

                                                    `navigation-button ${
                                                        active
                                                            ? "active"
                                                            : ""
                                                    } ${
                                                        open
                                                            ? "open"
                                                            : ""
                                                    }`

                                                }

                                                onClick={() =>
                                                    toggleMenu(
                                                        section
                                                    )
                                                }

                                            >

                                                <span>

                                                    {
                                                        section.label
                                                    }

                                                </span>


                                                <span className="navigation-arrow">
    {open ? "▴" : "▾"}
</span>

                                            </button>


                                            {

                                                open && (

                                                    <div className="navigation-dropdown">

                                                        <div className="dropdown-title">

                                                            {
                                                                section.label
                                                            }

                                                        </div>


                                                        {

                                                            section.children.map(

                                                                module => (

                                                                    <button

                                                                        key={
                                                                            module.id
                                                                        }

                                                                        type="button"

                                                                        className={

                                                                            `dropdown-link ${
                                                                                activeModule ===
                                                                                module.id &&
                                                                                (module.sectionId || section.id) ===
                                                                                activeSection
                                                                                    ? "active"
                                                                                    : ""
                                                                            }`

                                                                        }

                                                                        onClick={() =>

                                                                            selectModule(

                                                                                section,

                                                                                module

                                                                            )

                                                                        }

                                                                    >

                                                                        {
                                                                            module.label
                                                                        }

                                                                    </button>

                                                                )

                                                            )

                                                        }

                                                    </div>

                                                )

                                            }

                                        </div>

                                    );

                                }

                            )

                        }

                    </nav>

                </div>


                <div className="context-row">

                    <div className="breadcrumbs">

                        <span>
                            PharmaBI
                        </span>


                        <span>
                            /
                        </span>


                        <strong>
                            {
                                selectedBranchName
                            }
                        </strong>


                        <span>
                            /
                        </span>


                        <strong>

                            {
                                activeModuleDefinition?.label ||
                                activeSectionDefinition?.label
                            }

                        </strong>

                    </div>


                    <div className="mode-indicator">

                        <span

                            className={

                                `mode-dot ${
                                    selectedBranchId ===
                                    "all"

                                        ? "group"

                                        : "branch"

                                }`

                            }

                        />


                        {
                            selectedBranchId ===
                            "all"

                                ? "وضع المجموعة"

                                : selectedBranchName

                        }

                    </div>

                </div>

            </header>


            {
                connectionStatus.message && (

                    <div

                        className={

                            `status-banner ${connectionStatus.type}`

                        }

                    >

                        {
                            connectionStatus.message
                        }

                    </div>

                )
            }


            <section className="workspace">

                {
                    loadingBranches

                        ? (

                            <section className="page-card loading-card">

                                <div className="loading-spinner" />

                                <h2>
                                    جاري تحميل الفروع...
                                </h2>

                            </section>

                        )

                        : (

                            selectedBranchId ===
                            "all" &&
                            activeSection !==
                            "procurement"

                                ? (

                                    activeSection ===
                                    "dashboard" &&

                                    activeModule ===
                                    "overview"

                                        ? renderDashboardOverview()

                                        : activeSection ===
                                          "system"

                                            ? (

                                                activeModule ===
                                                "connections"

                                                    ? (

                                                        <BranchConnections
                                                            savedBranches={savedBranches}
                                                            activeConnections={activeConnections}
                                                            branchEditorBusy={branchEditorBusy}
                                                            openAddBranchEditor={openAddBranchEditor}
                                                            selectedBranchId={selectedBranchId}
                                                            selectedBranchName={selectedBranchName}
                                                            systemConnection={systemConnection}
                                                            setSystemConnection={setSystemConnection}
                                                            testCurrentConnection={testCurrentConnection}
                                                            selectBranch={selectBranch}
                                                            openEditBranchEditor={openEditBranchEditor}
                                                            closeBranch={closeBranch}
                                                            reconnectBranch={reconnectBranch}
                                                            deleteBranch={deleteBranch}
                                                            loadingBranch={loadingBranch}
                                                        />

                                                    )

                                                    : (

                                                        <CacheStatus
                                                            savedBranches={savedBranches}
                                                            activeConnections={activeConnections}
                                                        />

                                                    )

                                            )

                                            : activeSection === "sales"
    ? renderSales()
    : activeSection === "products" && activeModule === "master-items"
        ? <MasterItemPage />
        : (

                                                    <section className="page-card empty-state">

                                                        <div className="page-eyebrow">
                                                            تحليلات المجموعة
                                                        </div>


                                                        <h2>

                                                            {
                                                                activeModuleDefinition?.label
                                                            }

                                                        </h2>


                                                        <p>

                                                            هذا التحليل سيعمل على مستوى
                                                            المجموعة عند ربط التحليل الجماعي
                                                            الخاص به.

                                                        </p>

                                                    </section>

                                                )

                                )

                                : <BranchAnalyticsRouter

                                activeSection={activeSection}
                                activeModule={activeModule}
                                activeModuleDefinition={activeModuleDefinition}
                                activeSectionDefinition={activeSectionDefinition}
                                selectedConnection={selectedConnection}
                                selectedBranchId={selectedBranchId}
                                selectedBranchName={selectedBranchName}
                                fromDate={fromDate}
                                toDate={toDate}
                                branchOverview={branchOverview}
                                branchOverviewLoading={branchOverviewLoading}
                                branchOverviewError={branchOverviewError}
                                renderBranchOverview={() => (

                                    <BranchOverview
                                        selectedBranchName={selectedBranchName}
                                        fromDate={fromDate}
                                        toDate={toDate}
                                        branchOverview={branchOverview}
                                        branchOverviewLoading={branchOverviewLoading}
                                        branchOverviewError={branchOverviewError}
                                    />

                                )}
                                renderDashboardOverview={renderDashboardOverview}
                                renderBranchConnections={() => (

                                    <BranchConnections
                                        savedBranches={savedBranches}
                                        activeConnections={activeConnections}
                                        branchEditorBusy={branchEditorBusy}
                                        openAddBranchEditor={openAddBranchEditor}
                                        selectedBranchId={selectedBranchId}
                                        selectedBranchName={selectedBranchName}
                                        systemConnection={systemConnection}
                                        setSystemConnection={setSystemConnection}
                                        testCurrentConnection={testCurrentConnection}
                                        selectBranch={selectBranch}
                                        openEditBranchEditor={openEditBranchEditor}
                                        closeBranch={closeBranch}
                                        reconnectBranch={reconnectBranch}
                                        deleteBranch={deleteBranch}
                                        loadingBranch={loadingBranch}
                                    />

                                )}
                                renderCacheStatus={() => (

                                    <CacheStatus
                                        savedBranches={savedBranches}
                                        activeConnections={activeConnections}
                                    />

                                )}
                                renderSales={() => (

                                    <SalesPage
                                        selectedBranchId={selectedBranchId}
                                        selectedConnection={selectedConnection}
                                        fromDate={fromDate}
                                        toDate={toDate}
                                        activeModule={activeModule}
                                    />

                                )}

                            />

                        )

                }

            </section>


            <footer className="app-footer">

                <span>
                    PharmaBI Live
                </span>


                <span>
                    PharmaFly
                </span>


                <span>

                    {
                        selectedBranchId ===
                        "all"

                            ? "متعدد الفروع"

                            : selectedBranchName

                    }

                </span>

            </footer>


            {
                <BranchEditor

                    branchEditor={branchEditor}
                    branchEditorBusy={branchEditorBusy}
                    branchEditorMessage={branchEditorMessage}
                    updateBranchEditorField={updateBranchEditorField}
                    updateBranchEditorName={updateBranchEditorName}
                    updateBranchEditorId={updateBranchEditorId}
                    closeBranchEditor={closeBranchEditor}
                    saveBranchFromEditor={saveBranchFromEditor}

                />
            }

        </main>

    );

}


export default App;




