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


import SalesPage
    from "./SalesPage.jsx";


import BranchAnalyticsRouter
    from "./BranchAnalyticsRouter.jsx";


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
     * ACTIVE DEFINITIONS
     * =========================================================
     */

    const activeSectionDefinition =
        NAVIGATION.find(

            section =>

                section.id ===
                activeSection

        ) ||

        NAVIGATION[0];


    const activeModuleDefinition =
        activeSectionDefinition
            ?.children
            ?.find(

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

            : "All Branches";


    /*
     * =========================================================
     * GROUP OVERVIEW
     * =========================================================
     */

    function renderGroupOverview() {

        return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            GROUP INTELLIGENCE
                        </div>


                        <h2>
                            Business Overview
                        </h2>


                        <p>
                            Consolidated performance across all saved branches.
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
                                        Branches
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
                                        Group Sales
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
                                        Group Profit
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
                                        Margin
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
                                        Invoices
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
                                        Returns
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
                                            Branch Ranking
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
                                                    Rank
                                                </th>

                                                <th>
                                                    Branch
                                                </th>

                                                <th>
                                                    Sales
                                                </th>

                                                <th>
                                                    Cost
                                                </th>

                                                <th>
                                                    Profit
                                                </th>

                                                <th>
                                                    Margin
                                                </th>

                                                <th>
                                                    Invoices
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


    /*
     * =========================================================
     * BRANCH BUSINESS OVERVIEW
     * =========================================================
     */

    function renderBranchOverview() {

        return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            BRANCH INTELLIGENCE
                        </div>


                        <h2>
                            Business Overview
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
                                        Gross Sales
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
                                        Returns
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
                                        Net Sales
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
                                        Net Cost
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
                                        Net Profit
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
                                        Margin
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
                                        Sale Tickets
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
                                        Average Ticket
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
                                        Net Units
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
                                            Branch Performance
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
                                                    Metric
                                                </th>

                                                <th>
                                                    Value
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            <tr>

                                                <td>
                                                    Sales Lines
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
                                                    Return Lines
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
                                                    Gross Cost
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
                                                    Gross Profit
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
                                                    Return Rate
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
                                                    Returned Units
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
                                                    Reconciliation Tickets
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
                                                    Tickets With Difference
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


    /*
     * =========================================================
     * BRANCH CONNECTIONS
     * =========================================================
     */

    function renderBranchConnections() {

        return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            SYSTEM
                        </div>


                        <h2>
                            Branch Connections
                        </h2>


                        <p>
                            إدارة فروع PharmaFly واتصالاتها وأسمائها.
                        </p>

                    </div>


                    <button

                        type="button"

                        className="primary-button"

                        onClick={
                            openAddBranchEditor
                        }

                        disabled={
                            branchEditorBusy
                        }

                    >

                        Add Branch +

                    </button>

                </div>


                <div className="table-card">

                    <div className="table-card-header">

                        <div>

                            <strong>
                                Saved Branches
                            </strong>

                            <span>
                                {savedBranches.length} Branches
                            </span>

                        </div>

                    </div>


                    <div className="table-wrap">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Branch
                                    </th>

                                    <th>
                                        Name
                                    </th>

                                    <th>
                                        Server
                                    </th>

                                    <th>
                                        Database
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {
                                    savedBranches.length ===
                                    0

                                        ? (

                                            <tr>

                                                <td

                                                    colSpan="6"

                                                    style={{

                                                        textAlign:
                                                            "center",

                                                        padding:
                                                            "30px"

                                                    }}

                                                >

                                                    لا توجد فروع محفوظة.

                                                </td>

                                            </tr>

                                        )

                                        : (

                                            savedBranches.map(

                                                branch => {

                                                    const active =
                                                        isBranchActive(

                                                            activeConnections,

                                                            branch.branchId

                                                        );


                                                    return (

                                                        <tr

                                                            key={
                                                                branch.branchId
                                                            }

                                                        >

                                                            <td>

                                                                <strong>
                                                                    #{branch.branchId}
                                                                </strong>

                                                            </td>


                                                            <td>

                                                                <strong>

                                                                    {
                                                                        normalizeBranchName(
                                                                            branch
                                                                        )
                                                                    }

                                                                </strong>

                                                            </td>


                                                            <td>

                                                                {
                                                                    branch.server ||
                                                                    "—"
                                                                }

                                                            </td>


                                                            <td>

                                                                {
                                                                    branch.database ||
                                                                    "—"
                                                                }

                                                            </td>


                                                            <td>

                                                                <span>

                                                                    <span

                                                                        className={

                                                                            active

                                                                                ? "mode-dot branch"

                                                                                : "mode-dot"

                                                                        }

                                                                    />

                                                                    {" "}

                                                                    {

                                                                        active

                                                                            ? "Connected"

                                                                            : "Disconnected"

                                                                    }

                                                                </span>

                                                            </td>


                                                            <td>

                                                                <div

                                                                    style={{

                                                                        display:
                                                                            "flex",

                                                                        gap:
                                                                            "6px",

                                                                        flexWrap:
                                                                            "wrap"

                                                                    }}

                                                                >

                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            selectBranch(

                                                                                String(

                                                                                    branch.branchId

                                                                                )

                                                                            )

                                                                        }

                                                                    >

                                                                        Open

                                                                    </button>


                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            openEditBranchEditor(

                                                                                branch.branchId

                                                                            )

                                                                        }

                                                                    >

                                                                        Edit

                                                                    </button>


                                                                    {

                                                                        active

                                                                            ? (

                                                                                <button

                                                                                    type="button"

                                                                                    onClick={() =>

                                                                                        closeBranch(

                                                                                            branch.branchId

                                                                                        )

                                                                                    }

                                                                                >

                                                                                    Disconnect

                                                                                </button>

                                                                            )

                                                                            : (

                                                                                <button

                                                                                    type="button"

                                                                                    onClick={() =>

                                                                                        reconnectBranch(

                                                                                            branch.branchId

                                                                                        )

                                                                                    }

                                                                                >

                                                                                    Connect

                                                                                </button>

                                                                            )

                                                                    }


                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            deleteBranch(

                                                                                branch.branchId

                                                                            )

                                                                        }

                                                                    >

                                                                        Delete

                                                                    </button>

                                                                </div>

                                                            </td>

                                                        </tr>

                                                    );

                                                }

                                            )

                                        )

                                }

                            </tbody>

                        </table>

                    </div>

                </div>


                {

                    selectedBranchId !==
                    "all" && (

                        <>

                            <div

                                className="section-title"

                                style={{

                                    marginTop:
                                        "22px"

                                }}

                            >

                                {
                                    selectedBranchName
                                }

                            </div>


                            <div className="system-grid">

                                <label>

                                    Server

                                    <input

                                        value={
                                            systemConnection.server
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    server:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    Port

                                    <input

                                        value={
                                            systemConnection.port
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    port:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    Database

                                    <input

                                        value={
                                            systemConnection.database
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    database:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    User

                                    <input

                                        value={
                                            systemConnection.user
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    user:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    Password

                                    <input

                                        type="password"

                                        value={
                                            systemConnection.password
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    password:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>

                            </div>


                            <button

                                type="button"

                                className="primary-button"

                                onClick={
                                    testCurrentConnection
                                }

                                disabled={
                                    loadingBranch
                                }

                            >

                                اختبار اتصال{" "}

                                {
                                    selectedBranchName
                                }

                            </button>

                        </>

                    )

                }

            </section>

        );

    }


    /*
     * =========================================================
     * CACHE STATUS
     * =========================================================
     */

    function renderCacheStatus() {

        return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            SYSTEM
                        </div>


                        <h2>
                            Cache Status
                        </h2>


                        <p>
                            حالة الفروع والاتصالات والتخزين المحلي.
                        </p>

                    </div>

                </div>


                <div className="kpi-grid">

                    <div className="kpi-card">

                        <span>
                            Saved Branches
                        </span>

                        <strong>
                            {
                                savedBranches.length
                            }
                        </strong>

                    </div>


                    <div className="kpi-card">

                        <span>
                            Active Connections
                        </span>

                        <strong>
                            {
                                activeConnections.length
                            }
                        </strong>

                    </div>


                    <div className="kpi-card">

                        <span>
                            Local Store
                        </span>

                        <strong>
                            SQLite
                        </strong>

                    </div>


                    <div className="kpi-card">

                        <span>
                            Mode
                        </span>

                        <strong>
                            Multi-Branch
                        </strong>

                    </div>

                </div>


                <div className="table-card">

                    <div className="table-card-header">

                        <div>

                            <strong>
                                Connection Status
                            </strong>

                            <span>
                                الفروع المحفوظة حاليًا
                            </span>

                        </div>

                    </div>


                    <div className="table-wrap">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        Branch
                                    </th>

                                    <th>
                                        Connection
                                    </th>

                                    <th>
                                        Server
                                    </th>

                                    <th>
                                        Database
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {
                                    savedBranches.map(

                                        branch => {

                                            const active =
                                                isBranchActive(

                                                    activeConnections,

                                                    branch.branchId

                                                );


                                            return (

                                                <tr

                                                    key={
                                                        branch.branchId
                                                    }

                                                >

                                                    <td>
                                                        {
                                                            branch.branchId
                                                        }
                                                    </td>


                                                    <td>

                                                        <strong>

                                                            {
                                                                normalizeBranchName(
                                                                    branch
                                                                )
                                                            }

                                                        </strong>

                                                    </td>


                                                    <td>

                                                        <span>

                                                            <span

                                                                className={

                                                                    active

                                                                        ? "mode-dot branch"

                                                                        : "mode-dot"

                                                                }

                                                            />

                                                            {" "}

                                                            {

                                                                active

                                                                    ? "Connected"

                                                                    : "Disconnected"

                                                            }

                                                        </span>

                                                    </td>


                                                    <td>

                                                        {
                                                            branch.server ||
                                                            "—"
                                                        }

                                                    </td>


                                                    <td>

                                                        {
                                                            branch.database ||
                                                            "—"
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

            </section>

        );

    }


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
                                PharmaFly Intelligence
                            </div>

                        </div>

                    </div>


                    <div className="global-controls">

                        <label className="global-control">

                            <span>
                                Branch
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
                                    All Branches
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
                                From
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
                                To
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
                                        section.id;


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

                                                    {
                                                        open
                                                            ? "▲"
                                                            : "▼"
                                                    }

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
                                                                                module.id
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

                                ? "Group Mode"

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
                            "all"

                                ? (

                                    activeSection ===
                                    "dashboard" &&

                                    activeModule ===
                                    "overview"

                                        ? renderGroupOverview()

                                        : activeSection ===
                                          "system"

                                            ? (

                                                activeModule ===
                                                "connections"

                                                    ? renderBranchConnections()

                                                    : renderCacheStatus()

                                            )

                                            : activeSection ===
                                              "sales"

                                                ? renderSales()

                                                : (

                                                    <section className="page-card empty-state">

                                                        <div className="page-eyebrow">
                                                            GROUP ANALYTICS
                                                        </div>


                                                        <h2>

                                                            {
                                                                activeModuleDefinition?.label
                                                            }

                                                        </h2>


                                                        <p>

                                                            هذا التحليل سيعمل على مستوى
                                                            المجموعة عند ربط Group Analytics
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
                                renderBranchOverview={renderBranchOverview}
                                renderBranchConnections={renderBranchConnections}
                                renderCacheStatus={renderCacheStatus}
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

                            ? "Multi-Branch"

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
