import {
    useEffect,
    useMemo,
    useState
} from "react";
import MasterManagementPanel from "./MasterManagementPanel.jsx";


function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


function displayBranchName(
    branchId,
    branchNames
) {

    return (
        branchNames.get(
            Number(branchId)
        ) ||
        `فرع ${branchId}`
    );

}


function buildReviewSortKey(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /^\s*[\(\[\{][^)\]\}]+[\)\]\}]\s*/u,
            ""
        )
        .replace(
            /^\s*[-–—:]+\s*/u,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .toUpperCase();

}


export default function MasterItemPage() {

    const [
        activeTab,
        setActiveTab
    ] = useState(
        "review"
    );


    const [
        query,
        setQuery
    ] = useState("");


    const [
        results,
        setResults
    ] = useState([]);


    const [
        selectedItem,
        setSelectedItem
    ] = useState(null);


    const [
        branchNames,
        setBranchNames
    ] = useState(
        new Map()
    );


    const [
        reviewItems,
        setReviewItems
    ] = useState([]);


    const [
        reviewTotal,
        setReviewTotal
    ] = useState(0);


    const [
        reviewPage,
        setReviewPage
    ] = useState(0);


    const REVIEW_PAGE_SIZE =
        100;


    const [
        reviewGroup,
        setReviewGroup
    ] = useState([]);


    const [
        stats,
        setStats
    ] = useState(null);


    const [
        loading,
        setLoading
    ] = useState(false);


    const [
        reviewLoading,
        setReviewLoading
    ] = useState(false);


    const [
        groupLoading,
        setGroupLoading
    ] = useState(false);


    const [
        detailLoading,
        setDetailLoading
    ] = useState(false);


    const [
        actionKey,
        setActionKey
    ] = useState("");


    const [
        error,
        setError
    ] = useState("");


    const [
        searched,
        setSearched
    ] = useState(false);


    const [
        sortBy,
        setSortBy
    ] = useState(
        "name"
    );


    const [
        branchFilter,
        setBranchFilter
    ] = useState(
        "all"
    );


    const [
        reviewSearch,
        setReviewSearch
    ] = useState("");

    const [
        existingMasterOpen,
        setExistingMasterOpen
    ] = useState(false);

    const [
        existingMasterSearch,
        setExistingMasterSearch
    ] = useState("");

    const [
        existingMasterResults,
        setExistingMasterResults
    ] = useState([]);

    const [
        existingMasterLoading,
        setExistingMasterLoading
    ] = useState(false);

    const [
        newMasterOpen,
        setNewMasterOpen
    ] = useState(false);

    const [
        newMasterName,
        setNewMasterName
    ] = useState("");

    const [
        newMasterSaving,
        setNewMasterSaving
    ] = useState(false);


    const [
        currentReviewIndex,
        setCurrentReviewIndex
    ] = useState(0);


    useEffect(
        () => {

            let cancelled = false;


            async function loadBranches() {

                try {

                    const saved =
                        await window
                            .pharmaBI
                            .connection
                            .getAllSaved();


                    if (
                        cancelled ||
                        !Array.isArray(
                            saved
                        )
                    ) {

                        return;

                    }


                    const map =
                        new Map();


                    for (
                        const branch
                        of saved
                    ) {

                        map.set(
                            Number(
                                branch.branchId
                            ),
                            branch.branchName ||
                            `فرع ${branch.branchId}`
                        );

                    }


                    setBranchNames(
                        map
                    );

                }
                catch (
                    branchError
                ) {

                    console.error(
                        "[MasterItemPage] Branch names failed:",
                        branchError
                    );

                }

            }


            loadBranches();


            return () => {

                cancelled = true;

            };

        },
        []
    );


    async function loadStats() {

        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .stats();


            if (
                response
            ) {

                setStats(
                    response
                );

            }

        }
        catch (
            statsError
        ) {

            console.error(
                "[MasterItemPage] Stats failed:",
                statsError
            );

        }

    }


    async function loadReviewQueue(
        pageOverride = reviewPage
    ) {

        setReviewLoading(
            true
        );

        setError("");


        try {

            const offset =
                Number(
                    pageOverride
                ) *
                REVIEW_PAGE_SIZE;


            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .reviewSearch({

                        limit:
                            REVIEW_PAGE_SIZE,

                        offset,

                        branchId:
                            branchFilter ===
                                "all"
                                ? null
                                : Number(
                                    branchFilter
                                ),

                        search:
                            reviewSearch,

                        sortBy

                    });


            const nextItems =
                Array.isArray(
                    response?.results
                )
                    ? response.results
                    : [];


            setReviewItems(
                nextItems
            );


            setReviewTotal(
                Number(
                    response?.total ||
                    0
                )
            );


            setCurrentReviewIndex(
                0
            );


            await loadStats();

        }
        catch (
            reviewError
        ) {

            console.error(
                "[MasterItemPage] Global review search failed:",
                reviewError
            );


            setError(
                reviewError?.message ||
                "فشل البحث في كل حالات المراجعة."
            );

        }
        finally {

            setReviewLoading(
                false
            );

        }

    }


    async function loadReviewGroup(
        review
    ) {

        if (
            !review
        ) {

            setReviewGroup(
                []
            );

            return;

        }


        setGroupLoading(
            true
        );


        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .reviewGroup({

                        branchId:
                            review.branchId,

                        branchItemId:
                            review.branchItemId

                    });


            const groupItems =
                Array.isArray(
                    response?.items
                )
                    ? response.items
                    : [];

            let pricedGroupItems =
                groupItems;

            if (
                typeof window
                    ?.pharmaBI
                    ?.masterItem
                    ?.prices ===
                "function"
            ) {

                try {

                    const priceResponse =
                        await window
                            .pharmaBI
                            .masterItem
                            .prices({

                                items:
                                    groupItems

                            });

                    if (
                        Array.isArray(
                            priceResponse
                        )
                    ) {

                        pricedGroupItems =
                            priceResponse;

                    }

                }
                catch (
                    priceError
                ) {

                    console.warn(
                        "[MasterItemPage] Review group prices failed:",
                        priceError
                    );

                }

            }

            setReviewGroup(
                pricedGroupItems
            );

        }
        catch (
            groupError
        ) {

            console.error(
                "[MasterItemPage] Review group failed:",
                groupError
            );


            setReviewGroup(
                []
            );


            setError(
                groupError?.message ||
                "فشل تحميل فروع الصنف."
            );

        }
        finally {

            setGroupLoading(
                false
            );

        }

    }


    useEffect(
        () => {

            loadStats();
            loadReviewQueue(0);

        },
        []
    );



    /*
     * GLOBAL REVIEW FETCH EFFECT
     *
     * Search/sort/filter are executed by the backend
     * against the full review queue.
     *
     * 100 is only the current page size.
     */
    useEffect(
        () => {

            if (
                reviewPage !== 0
            ) {

                setReviewPage(
                    0
                );

                return;

            }


            const timer =
                setTimeout(
                    () => {

                        loadReviewQueue(
                            0
                        );

                    },
                    350
                );


            return () =>
                clearTimeout(
                    timer
                );

        },
        [
            reviewSearch,
            branchFilter,
            sortBy
        ]
    );


    useEffect(
        () => {

            if (
                reviewPage === 0
            ) {

                return;

            }


            loadReviewQueue(
                reviewPage
            );

        },
        [
            reviewPage
        ]
    );

    /*
     * BACKEND PAGINATED REVIEW RESULTS
     *
     * reviewItems already contains the exact page returned
     * by SQLite after applying:
     *
     * - global search
     * - branch filter
     * - sorting
     *
     * Therefore NO client-side filtering is allowed here.
     */
    const filteredReviews =
        Array.isArray(
            reviewItems
        )
            ? reviewItems
            : [];



    useEffect(
        () => {

            if (
                currentReviewIndex >=
                filteredReviews.length
            ) {

                setCurrentReviewIndex(
                    Math.max(
                        0,
                        filteredReviews.length - 1
                    )
                );

            }

        },
        [
            filteredReviews.length,
            currentReviewIndex
        ]
    );


    const currentReview =
        filteredReviews[
            currentReviewIndex
        ] ||
        null;


    useEffect(
        () => {

            loadReviewGroup(
                currentReview
            );

        },
        [
            currentReview?.branchId,
            currentReview?.branchItemId
        ]
    );


    const currentKey =
        currentReview
            ? `${currentReview.branchId}-${currentReview.branchItemId}`
            : "";


    function removeGroupFromQueue(
        group
    ) {

        const keys =
            new Set(
                (
                    group ||
                    []
                ).map(
                    row =>
                        `${row.branch_id}-${row.branch_item_id}`
                )
            );


        setReviewItems(
            previous =>
                previous.filter(
                    item =>
                        !keys.has(
                            `${item.branchId}-${item.branchItemId}`
                        )
                )
        );

    }


    async function openMasterItem(
        masterItemId
    ) {

        setDetailLoading(
            true
        );

        setError("");


        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .get({
                        masterItemId
                    });


            setSelectedItem(
                response?.item ||
                null
            );

        }
        catch (
            detailError
        ) {

            console.error(
                "[MasterItemPage] Detail failed:",
                detailError
            );


            setError(
                detailError?.message ||
                "فشل تحميل بيانات الصنف."
            );

        }
        finally {

            setDetailLoading(
                false
            );

        }

    }



    function openExistingMasterPicker() {

        setExistingMasterSearch("");
        setExistingMasterResults([]);
        setExistingMasterOpen(true);
        setError("");

    }


    function openNewMasterPicker() {

        setNewMasterName(
            currentReview?.branchItemName ||
            ""
        );

        setNewMasterOpen(true);
        setError("");

    }


    async function searchExistingMastersForReview(
        event
    ) {

        event?.preventDefault();

        const value =
            String(
                existingMasterSearch || ""
            ).trim();

        if (!value) {

            setExistingMasterResults([]);

            return;

        }

        setExistingMasterLoading(true);
        setError("");

        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .searchExisting({

                        query:
                            value,

                        limit:
                            50

                    });

            setExistingMasterResults(
                Array.isArray(
                    response?.results
                )
                    ? response.results
                    : []
            );

        }
        catch (searchError) {

            console.error(
                "[MasterItemPage] Existing master search failed:",
                searchError
            );

            setError(
                searchError?.message ||
                "فشل البحث في الأسماء الموحدة."
            );

            setExistingMasterResults([]);

        }
        finally {

            setExistingMasterLoading(false);

        }

    }


    async function attachCurrentToMaster(
        master
    ) {

        if (
            !currentReview ||
            !master?.id
        ) {

            return;

        }

        setActionKey(
            currentKey
        );

        setError("");

        try {

            await window
                .pharmaBI
                .masterItem
                .decideGroup({

                    branchId:
                        currentReview.branchId,

                    branchItemId:
                        currentReview.branchItemId,

                    candidateMasterItemId:
                        master.id,

                    decision:
                        "SAME"

                });

            setExistingMasterOpen(false);

            await loadStats();

            await loadReviewQueue(
                reviewPage
            );

        }
        catch (attachError) {

            console.error(
                "[MasterItemPage] Attach master failed:",
                attachError
            );

            setError(
                attachError?.message ||
                "فشل ربط الصنف بالاسم الموحد."
            );

        }
        finally {

            setActionKey("");

        }

    }


    async function saveNewMasterManual() {

        const name =
            String(
                newMasterName || ""
            ).trim();

        if (!currentReview) {
            return;
        }

        if (!name) {

            setError(
                "اكتب الاسم الموحد أولًا."
            );

            return;

        }

        setNewMasterSaving(true);
        setActionKey(currentKey);
        setError("");

        try {

            await window
                .pharmaBI
                .masterItem
                .createNewGroup({

                    branchId:
                        currentReview.branchId,

                    branchItemId:
                        currentReview.branchItemId,

                    canonicalName:
                        name

                });

            setNewMasterOpen(false);
            setNewMasterName("");

            await loadStats();

            await loadReviewQueue(
                reviewPage
            );

        }
        catch (createError) {

            console.error(
                "[MasterItemPage] Manual master create failed:",
                createError
            );

            setError(
                createError?.message ||
                "فشل إنشاء الاسم الموحد."
            );

        }
        finally {

            setNewMasterSaving(false);
            setActionKey("");

        }

    }

    async function runSearch(
        event
    ) {

        event?.preventDefault();


        const value =
            String(
                query || ""
            ).trim();


        setSearched(
            true
        );

        setSelectedItem(
            null
        );

        setError("");


        if (
            !value
        ) {

            setResults([]);

            return;

        }


        setLoading(
            true
        );


        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .search({
                        query:
                            value,

                        limit:
                            100
                    });


            setResults(
                Array.isArray(
                    response?.results
                )
                    ? response.results
                    : []
            );

        }
        catch (
            searchError
        ) {

            console.error(
                "[MasterItemPage] Search failed:",
                searchError
            );


            setError(
                searchError?.message ||
                "فشل البحث عن الصنف."
            );


            setResults([]);

        }
        finally {

            setLoading(
                false
            );

        }

    }


    async function decideCurrentGroup(
        decision
    ) {

        if (
            !currentReview?.candidate?.id
        ) {
            return;
        }

        setActionKey(
            currentKey
        );

        setError("");

        try {

            await window
                .pharmaBI
                .masterItem
                .decideGroup({

                    branchId:
                        currentReview.branchId,

                    branchItemId:
                        currentReview.branchItemId,

                    candidateMasterItemId:
                        currentReview.candidate.id,

                    decision

                });

            await loadStats();

            await loadReviewQueue(
                reviewPage
            );

        }
        catch (
            decisionError
        ) {

            console.error(
                "[MasterItemPage] Decision failed:",
                decisionError
            );

            setError(
                decisionError?.message ||
                "فشل حفظ القرار."
            );

        }
        finally {

            setActionKey(
                ""
            );

        }

    }


    async function createNewGroup(
        canonicalName
    ) {

        if (!currentReview) {
            return;
        }

        const name =
            String(
                canonicalName || ""
            ).trim();

        if (!name) {

            setError(
                "اكتب الاسم الموحد أولًا."
            );

            return;

        }

        setActionKey(
            currentKey
        );

        setError("");

        try {

            await window
                .pharmaBI
                .masterItem
                .createNewGroup({

                    branchId:
                        currentReview.branchId,

                    branchItemId:
                        currentReview.branchItemId,

                    canonicalName:
                        name

                });

            setNewMasterOpen(
                false
            );

            setNewMasterName("");

            await loadStats();

            await loadReviewQueue(
                reviewPage
            );

        }
        catch (
            createError
        ) {

            console.error(
                "[MasterItemPage] Manual master create failed:",
                createError
            );

            setError(
                createError?.message ||
                "فشل إنشاء الاسم الموحد."
            );

        }
        finally {

            setActionKey(
                ""
            );

        }

    }



    function clearSearch() {

        setQuery("");
        setResults([]);
        setSelectedItem(null);
        setSearched(false);

    }



    function moveReviewPage(
        direction
    ) {

        const pageCount =
            Math.max(
                1,
                Math.ceil(
                    reviewTotal /
                    REVIEW_PAGE_SIZE
                )
            );


        setCurrentReviewIndex(
            0
        );


        setReviewPage(
            previous => {

                const next =
                    previous +
                    direction;


                if (
                    next < 0
                ) {

                    return 0;

                }


                if (
                    next >=
                    pageCount
                ) {

                    return (
                        pageCount - 1
                    );

                }


                return next;

            }
        );

    }

    function moveReview(
        direction
    ) {

        if (
            !filteredReviews.length
        ) {

            return;

        }


        setCurrentReviewIndex(
            previous => {

                const next =
                    previous +
                    direction;


                if (
                    next < 0
                ) {

                    return (
                        filteredReviews.length - 1
                    );

                }


                if (
                    next >=
                    filteredReviews.length
                ) {

                    return 0;

                }


                return next;

            }
        );

    }


    const masterCount =
        new Set(
            results.map(
                row =>
                    row.id
            )
        ).size;


    const branchOptions =
        Array.from(
            branchNames.entries()
        ).sort(
            (
                a,
                b
            ) =>
                String(
                    a[1]
                ).localeCompare(
                    String(
                        b[1]
                    ),
                    "ar"
                )
        );


    return (

        <section className="page-card">

            <div className="page-header">

                <div>

                    <div className="page-eyebrow">
                        المنتجات
                    </div>

                    <h2>
                        إدارة الأصناف
                    </h2>

                    <p>
                        توحيد أسماء الأصناف على مستوى المجموعة
                        مع مراجعة الحالات غير المتطابقة وحفظ كل قرار بشكل دائم.
                    </p>

                </div>

            </div>


            <div
                style={{
                    display:
                        "flex",
                    gap:
                        "8px",
                    flexWrap:
                        "wrap",
                    marginBottom:
                        "18px"
                }}
            >

                <button
                    type="button"
                    onClick={() =>
                        setActiveTab(
                            "review"
                        )
                    }
                    className={
                        activeTab === "review"
                            ? "primary-button"
                            : "secondary-button"
                    }
                >
                    مراجعة التطابق
                    {
                        stats?.reviewCount
                            ? ` (${formatNumber(stats.reviewCount)})`
                            : ""
                    }
                </button>


                <button
                    type="button"
                    onClick={() =>
                        setActiveTab(
                            "search"
                        )
                    }
                    className={
                        activeTab === "search"
                            ? "primary-button"
                            : "secondary-button"
                    }
                >
                    البحث في الأصناف
                </button>

            </div>


            {
                stats && (

                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(170px,1fr))",
                            gap:
                                "10px",
                            marginBottom:
                                "18px"
                        }}
                    >

                        <div className="table-card">
                            <div style={{ padding: "14px" }}>
                                <strong>الأصناف الموحدة</strong>
                                <div>
                                    {formatNumber(stats.masterCount)}
                                </div>
                            </div>
                        </div>

                        <div className="table-card">
                            <div style={{ padding: "14px" }}>
                                <strong>تطابق تلقائي تام</strong>
                                <div>
                                    {formatNumber(stats.exactCount)}
                                </div>
                            </div>
                        </div>

                        <div className="table-card">
                            <div style={{ padding: "14px" }}>
                                <strong>قرارات المستخدم</strong>
                                <div>
                                    {formatNumber(stats.confirmedCount)}
                                </div>
                            </div>
                        </div>

                        <div className="table-card">
                            <div style={{ padding: "14px" }}>
                                <strong>مراجعة معلقة</strong>
                                <div>
                                    {formatNumber(stats.reviewCount)}
                                </div>
                            </div>
                        </div>

                    </div>

                )
            }


            {
                error && (

                    <div
                        className="table-card"
                        style={{
                            marginBottom:
                                "16px"
                        }}
                    >

                        <div
                            style={{
                                padding:
                                    "14px"
                            }}
                        >

                            <strong>
                                خطأ
                            </strong>

                            <div>
                                {error}
                            </div>

                        </div>

                    </div>

                )
            }


            {
                activeTab === "masters" && (

                    <MasterManagementPanel />

                )
            }

            {
                activeTab === "review" && (

                    <div>

                        <div
                            className="table-card"
                            style={{
                                marginBottom:
                                    "14px"
                            }}
                        >

                            <div
                                style={{
                                    padding:
                                        "14px",
                                    display:
                                        "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit,minmax(200px,1fr))",
                                    gap:
                                        "10px"
                                }}
                            >

                                <div>

                                    <div
                                        style={{
                                            fontSize:
                                                "12px",
                                            opacity:
                                                0.7,
                                            marginBottom:
                                                "5px"
                                        }}
                                    >
                                        ترتيب المراجعة
                                    </div>

                                    <select
                                        value={
                                            sortBy
                                        }
                                        onChange={
                                            event => {

                                                setCurrentReviewIndex(
                                                    0
                                                );

                                                setSortBy(
                                                    event.target.value
                                                );

                                            }
                                        }
                                        style={{
                                            width:
                                                "100%",
                                            height:
                                                "40px",
                                            padding:
                                                "0 10px",
                                            border:
                                                "1px solid #d8dee8",
                                            borderRadius:
                                                "9px",
                                            background:
                                                "#fff"
                                        }}
                                    >

                                        <option value="name">
                                            الاسم الأبجدي — تجميع الأسماء المتشابهة
                                        </option>

                                        <option value="similarity">
                                            أعلى درجة تشابه
                                        </option>

                                        <option value="branch">
                                            اسم الفرع
                                        </option>

                                        <option value="code">
                                            كود الصنف
                                        </option>

                                        <option value="oldest">
                                            الأقدم
                                        </option>

                                    </select>

                                </div>


                                <div>

                                    <div
                                        style={{
                                            fontSize:
                                                "12px",
                                            opacity:
                                                0.7,
                                            marginBottom:
                                                "5px"
                                        }}
                                    >
                                        فلترة حسب الفرع
                                    </div>

                                    <select
                                        value={
                                            branchFilter
                                        }
                                        onChange={
                                            event => {

                                                setCurrentReviewIndex(
                                                    0
                                                );

                                                setBranchFilter(
                                                    event.target.value
                                                );

                                            }
                                        }
                                        style={{
                                            width:
                                                "100%",
                                            height:
                                                "40px",
                                            padding:
                                                "0 10px",
                                            border:
                                                "1px solid #d8dee8",
                                            borderRadius:
                                                "9px",
                                            background:
                                                "#fff"
                                        }}
                                    >

                                        <option value="all">
                                            كل الفروع
                                        </option>

                                        {
                                            branchOptions.map(
                                                (
                                                    [
                                                        branchId,
                                                        branchName
                                                    ]
                                                ) => (

                                                    <option
                                                        key={
                                                            branchId
                                                        }
                                                        value={
                                                            branchId
                                                        }
                                                    >
                                                        {branchName}
                                                    </option>

                                                )
                                            )
                                        }

                                    </select>

                                </div>


                                <div>

                                    <div
                                        style={{
                                            fontSize:
                                                "12px",
                                            opacity:
                                                0.7,
                                            marginBottom:
                                                "5px"
                                        }}
                                    >
                                        بحث في كل حالات المراجعة
                                    </div>

                                    <input
                                        value={
                                            reviewSearch
                                        }
                                        onChange={
                                            event => {

                                                setCurrentReviewIndex(
                                                    0
                                                );

                                                setReviewSearch(
                                                    event.target.value
                                                );

                                            }
                                        }
                                        placeholder="اسم الصنف أو الكود — البحث في كل المراجعات"
                                        style={{
                                            width:
                                                "100%",
                                            height:
                                                "40px",
                                            padding:
                                                "0 12px",
                                            border:
                                                "1px solid #d8dee8",
                                            borderRadius:
                                                "9px",
                                            fontSize:
                                                "14px"
                                        }}
                                    />

                                </div>

                            </div>

                        </div>


                        <div
                            className="table-card"
                            style={{
                                marginBottom:
                                    "16px"
                            }}
                        >

                            <div
                                className="table-card-header"
                            >

                                <div>

                                    <strong>
                                        مراجعة حالات عدم التطابق
                                    </strong>

                                    <span>
                                        {
                                            filteredReviews.length
                                                ? `الحالة ${formatNumber(currentReviewIndex + 1)} من ${formatNumber(filteredReviews.length)} — إجمالي ${formatNumber(reviewTotal)} حالة`
                                                : "لا توجد حالات مطابقة للفلترة"
                                        }
                                    </span>

                                </div>


                                <div
                                    style={{
                                        display:
                                            "flex",
                                        gap:
                                            "8px",
                                        flexWrap:
                                            "wrap"
                                    }}
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            loadReviewQueue
                                        }
                                        className="secondary-button"
                                        disabled={
                                            reviewLoading
                                        }
                                    >
                                        تحديث
                                    </button>
                <button
                    type="button"
                    onClick={() =>
                        setActiveTab(
                            "masters"
                        )
                    }
                    className={
                        activeTab === "masters"
                            ? "primary-button"
                            : "secondary-button"
                    }
                >
                    الأسماء الموحدة
                </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveReview(-1)
                                        }
                                        className="secondary-button"
                                        disabled={
                                            !filteredReviews.length
                                        }
                                    >
                                        السابق
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveReviewPage(-1)
                                        }
                                        className="secondary-button"
                                        disabled={
                                            reviewPage <= 0 ||
                                            reviewLoading
                                        }
                                    >
                                        صفحة سابقة
                                    </button>


                                    <span
                                        style={{
                                            alignSelf:
                                                "center",
                                            padding:
                                                "0 4px",
                                            opacity:
                                                0.75
                                        }}
                                    >
                                        الصفحة
                                        {" "}
                                        {
                                            formatNumber(
                                                reviewPage + 1
                                            )
                                        }
                                        {" / "}
                                        {
                                            formatNumber(
                                                Math.max(
                                                    1,
                                                    Math.ceil(
                                                        reviewTotal /
                                                        REVIEW_PAGE_SIZE
                                                    )
                                                )
                                            )
                                        }
                                    </span>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveReviewPage(1)
                                        }
                                        className="secondary-button"
                                        disabled={
                                            reviewLoading ||
                                            (
                                                reviewPage + 1
                                            ) >=
                                            Math.ceil(
                                                reviewTotal /
                                                REVIEW_PAGE_SIZE
                                            )
                                        }
                                    >
                                        صفحة تالية
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveReview(1)
                                        }
                                        className="secondary-button"
                                        disabled={
                                            !filteredReviews.length
                                        }
                                    >
                                        التالي داخل الصفحة
                                    </button>

                                </div>

                            </div>

                        </div>


                        {
                            currentReview && (

                                <div
                                    className="table-card"
                                    style={{
                                        marginBottom:
                                            "14px"
                                    }}
                                >

                                    <div
                                        style={{
                                            padding:
                                                "20px"
                                        }}
                                    >

                                        <div
                                            style={{
                                                fontSize:
                                                    "13px",
                                                opacity:
                                                    0.75,
                                                marginBottom:
                                                    "8px"
                                            }}
                                        >
                                            الصنف الحالي للمراجعة
                                        </div>


                                        <strong
                                            style={{
                                                fontSize:
                                                    "20px"
                                            }}
                                        >
                                            {
                                                currentReview.branchItemName
                                            }
                                        </strong>


                                        <div
                                            style={{
                                                marginTop:
                                                    "7px"
                                            }}
                                        >
                                            {
                                                displayBranchName(
                                                    currentReview.branchId,
                                                    branchNames
                                                )
                                            }

                                            {" — "}

                                            {
                                                currentReview.branchItemCode ||
                                                currentReview.branchItemId
                                            }
                                        </div>

                                    </div>

                                </div>

                            )
                        }


                        {
                            currentReview &&
                            (
                                <div
                                    className="table-card"
                                    style={{
                                        marginBottom:
                                            "14px"
                                    }}
                                >

                                    <div
                                        className="table-card-header"
                                    >

                                        <div>

                                            <strong>
                                                فروع لها نفس الاسم
                                            </strong>

                                            <span>
                                                {
                                                    groupLoading
                                                        ? "جاري التحميل..."
                                                        : `${formatNumber(reviewGroup.length)} فرع — سيُطبق قرار المطابقة عليهم جميعًا`
                                                }
                                            </span>

                                        </div>

                                    </div>


                                    <div
                                        style={{
                                            padding:
                                                "14px"
                                        }}
                                    >

                                        {
                                            reviewGroup.length === 0 && (

                                                <div
                                                    style={{
                                                        padding:
                                                            "12px",
                                                        opacity:
                                                            0.7
                                                    }}
                                                >
                                                    لا توجد فروع أخرى بنفس الاسم حاليًا.
                                                </div>

                                            )
                                        }


                                        {
                                            reviewGroup.map(
                                                row => (

                                                    <div
                                                        key={
                                                            `${row.branch_id}-${row.branch_item_id}`
                                                        }
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            gap:
                                                                "12px",
                                                            padding:
                                                                "10px 4px",
                                                            borderBottom:
                                                                "1px solid #eef1f5"
                                                        }}
                                                    >

                                                        <strong>
                                                            {
                                                                displayBranchName(
                                                                    row.branch_id,
                                                                    branchNames
                                                                )
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                row.branch_item_code ||
                                                                row.branch_item_id
                                                            }
                                                        </span>

                                                        <strong
                                                            style={{
                                                                minWidth:
                                                                    "90px",
                                                                textAlign:
                                                                    "center",
                                                                whiteSpace:
                                                                    "nowrap"
                                                            }}
                                                        >
                                                            {
                                                                row.salesPrice ===
                                                                    null ||
                                                                row.salesPrice ===
                                                                    undefined
                                                                    ? "-"
                                                                    : `${Number(
                                                                        row.salesPrice
                                                                    ).toLocaleString(
                                                                        "en-US",
                                                                        {
                                                                            minimumFractionDigits:
                                                                                2,
                                                                            maximumFractionDigits:
                                                                                2
                                                                        }
                                                                    )} جنيه`
                                                            }
                                                        </strong>

                                                        <span
                                                            style={{
                                                                flex:
                                                                    1,
                                                                textAlign:
                                                                    "right"
                                                            }}
                                                        >
                                                            {
                                                                row.branch_item_name
                                                            }
                                                        </span>

                                                    </div>

                                                )
                                            )
                                        }

                                    </div>

                                </div>
                            )
                        }


                        {
                            currentReview && (

                                <div
                                    className="table-card"
                                    style={{
                                        marginBottom:
                                            "14px"
                                    }}
                                >

                                    <div
                                        style={{
                                            padding:
                                                "20px"
                                        }}
                                    >

                                        <div
                                            style={{
                                                display:
                                                    "grid",
                                                gridTemplateColumns:
                                                    "repeat(auto-fit,minmax(240px,1fr))",
                                                gap:
                                                    "16px"
                                            }}
                                        >

                                            <div>

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "12px",
                                                        opacity:
                                                            0.65,
                                                        marginBottom:
                                                            "6px"
                                                    }}
                                                >
                                                    الاقتراح الحالي
                                                </div>

                                                {
                                                    currentReview.candidate
                                                        ? (

                                                            <>
                                                                <strong
                                                                    style={{
                                                                        fontSize:
                                                                            "18px"
                                                                    }}
                                                                >
                                                                    {
                                                                        currentReview.candidate.unifiedCode
                                                                    }
                                                                </strong>

                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "6px"
                                                                    }}
                                                                >
                                                                    {
                                                                        currentReview.candidate.canonicalName
                                                                    }
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "8px",
                                                                        fontSize:
                                                                            "13px",
                                                                        opacity:
                                                                            0.7
                                                                    }}
                                                                >
                                                                    درجة التشابه:
                                                                    {" "}
                                                                    {
                                                                        formatNumber(
                                                                            currentReview.candidateScore
                                                                        )
                                                                    }%
                                                                </div>
                                                            </>

                                                        )
                                                        : (

                                                            <div>
                                                                لا يوجد اقتراح حالي.
                                                            </div>

                                                        )
                                                }

                                            </div>


                                            <div>

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "12px",
                                                        opacity:
                                                            0.65,
                                                        marginBottom:
                                                            "6px"
                                                    }}
                                                >
                                                    الربط الحالي
                                                </div>

                                                <strong>
                                                    {
                                                        currentReview.currentMaster?.unified_code ||
                                                        "—"
                                                    }
                                                </strong>

                                                <div
                                                    style={{
                                                        marginTop:
                                                            "6px"
                                                    }}
                                                >
                                                    {
                                                        currentReview.currentMaster?.canonical_name ||
                                                        "لا يوجد"
                                                    }
                                                </div>

                                            </div>

                                        </div>


                                        <div
                                            style={{
                                                marginTop:
                                                    "20px",
                                                padding:
                                                    "12px",
                                                border:
                                                    "1px solid #e5eaf1",
                                                borderRadius:
                                                    "10px",
                                                background:
                                                    "#fafbfd",
                                                fontSize:
                                                    "13px",
                                                marginBottom:
                                                    "16px"
                                            }}
                                        >
                                            هذا القرار سيُطبق على
                                            {" "}
                                            <strong>
                                                {
                                                    formatNumber(
                                                        reviewGroup.length ||
                                                        1
                                                    )
                                                }
                                            </strong>
                                            {" "}
                                            فرع بنفس الاسم.
                                        </div>


                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                gap:
                                                    "8px",
                                                flexWrap:
                                                    "wrap"
                                            }}
                                        >

                                            {
                                                currentReview.candidate && (

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            actionKey ===
                                                            currentKey
                                                        }
                                                        onClick={() =>
                                                            decideCurrentGroup(
                                                                "SAME"
                                                            )
                                                        }
                                                        className="primary-button"
                                                    >
                                                        تأكيد التطابق مع الاسم المقترح
                                                    </button>

                                                )
                                            }


                                            <button
                                                type="button"
                                                disabled={
                                                    actionKey ===
                                                    currentKey
                                                }
                                                onClick={
                                                    openExistingMasterPicker
                                                }
                                                className="primary-button"
                                            >
                                                الإضافة إلى اسم موحد موجود
                                            </button>


                                            <button
                                                type="button"
                                                disabled={
                                                    actionKey ===
                                                    currentKey
                                                }
                                                onClick={
                                                    openNewMasterPicker
                                                }
                                                className="secondary-button"
                                            >
                                                إضافة اسم موحد جديد
                                            </button>


                                            {
                                                currentReview.candidate && (

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            actionKey ===
                                                            currentKey
                                                        }
                                                        onClick={() =>
                                                            decideCurrentGroup(
                                                                "DIFFERENT"
                                                            )
                                                        }
                                                        className="secondary-button"
                                                    >
                                                        ليس نفس الصنف
                                                    </button>

                                                )
                                            }



                                            {
                                                actionKey ===
                                                    currentKey && (

                                                    <span
                                                        style={{
                                                            alignSelf:
                                                                "center",
                                                            opacity:
                                                                0.7
                                                        }}
                                                    >
                                                        جاري حفظ القرار...
                                                    </span>

                                                )
                                            }

                                        </div>

                                    </div>

                                </div>

                            )
                        }


                        {
                            !reviewLoading &&
                            !filteredReviews.length && (

                                <div className="table-card">

                                    <div
                                        style={{
                                            padding:
                                                "30px",
                                            textAlign:
                                                "center"
                                        }}
                                    >

                                        <strong>
                                            لا توجد حالات معلقة بهذه الفلترة.
                                        </strong>

                                    </div>

                                </div>

                            )
                        }

                    </div>

                )
            }


            {
                existingMasterOpen && (

                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                            padding: "20px"
                        }}
                    >

                        <div
                            className="table-card"
                            style={{
                                width: "min(700px,100%)"
                            }}
                        >

                            <div
                                className="table-card-header"
                            >
                                <strong>
                                    اختيار اسم موحد موجود
                                </strong>
                            </div>

                            <div
                                style={{
                                    padding: "18px"
                                }}
                            >

                                <form
                                    onSubmit={
                                        searchExistingMastersForReview
                                    }
                                    style={{
                                        display: "flex",
                                        gap: "8px"
                                    }}
                                >

                                    <input
                                        value={
                                            existingMasterSearch
                                        }
                                        onChange={
                                            event =>
                                                setExistingMasterSearch(
                                                    event.target.value
                                                )
                                        }
                                        placeholder="ابحث في الأسماء الموحدة فقط"
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            height: "42px",
                                            padding: "0 12px"
                                        }}
                                    />

                                    <button
                                        type="submit"
                                        className="primary-button"
                                        disabled={
                                            existingMasterLoading
                                        }
                                    >
                                        بحث
                                    </button>

                                </form>


                                <div
                                    style={{
                                        marginTop: "14px"
                                    }}
                                >

                                    {
                                        existingMasterResults.map(
                                            master => (

                                                <button
                                                    key={
                                                        master.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        attachCurrentToMaster(
                                                            master
                                                        )
                                                    }
                                                    className="secondary-button"
                                                    style={{
                                                        width: "100%",
                                                        textAlign: "right",
                                                        marginBottom: "8px"
                                                    }}
                                                >

                                                    <strong>
                                                        {
                                                            master.canonical_name
                                                        }
                                                    </strong>

                                                    {" — "}

                                                    {
                                                        master.unified_code
                                                    }

                                                </button>

                                            )
                                        )
                                    }

                                </div>


                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() =>
                                        setExistingMasterOpen(
                                            false
                                        )
                                    }
                                >
                                    إلغاء
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }


            {
                newMasterOpen && (

                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                            padding: "20px"
                        }}
                    >

                        <div
                            className="table-card"
                            style={{
                                width: "min(500px,100%)"
                            }}
                        >

                            <div
                                className="table-card-header"
                            >
                                <strong>
                                    إضافة اسم موحد جديد
                                </strong>
                            </div>

                            <div
                                style={{
                                    padding: "18px"
                                }}
                            >

                                <input
                                    value={
                                        newMasterName
                                    }
                                    onChange={
                                        event =>
                                            setNewMasterName(
                                                event.target.value
                                            )
                                    }
                                    placeholder="اكتب الاسم الموحد"
                                    autoFocus
                                    style={{
                                        width: "100%",
                                        height: "42px",
                                        padding: "0 12px"
                                    }}
                                />

                                <div
                                    style={{
                                        marginTop: "14px",
                                        display: "flex",
                                        gap: "8px"
                                    }}
                                >

                                    <button
                                        type="button"
                                        className="primary-button"
                                        disabled={
                                            newMasterSaving
                                        }
                                        onClick={
                                            saveNewMasterManual
                                        }
                                    >
                                        {
                                            newMasterSaving
                                                ? "جارٍ الحفظ..."
                                                : "حفظ وربط"
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={() =>
                                            setNewMasterOpen(
                                                false
                                            )
                                        }
                                    >
                                        إلغاء
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }

            {
                activeTab === "search" && (

                    <div>

                        <form
                            onSubmit={
                                runSearch
                            }
                            style={{
                                display:
                                    "flex",
                                gap:
                                    "10px",
                                alignItems:
                                    "center",
                                marginBottom:
                                    "18px",
                                flexWrap:
                                    "wrap"
                            }}
                        >

                            <input
                                value={
                                    query
                                }
                                onChange={
                                    event =>
                                        setQuery(
                                            event.target.value
                                        )
                                }
                                placeholder="الكود الموحد أو كود الصنف أو اسم الصنف"
                                style={{
                                    flex:
                                        "1 1 460px",
                                    minWidth:
                                        "320px",
                                    height:
                                        "42px",
                                    padding:
                                        "0 14px",
                                    border:
                                        "1px solid #d8dee8",
                                    borderRadius:
                                        "10px",
                                    fontSize:
                                        "14px"
                                }}
                            />


                            <button
                                type="submit"
                                disabled={
                                    loading
                                }
                                className="primary-button"
                            >
                                {
                                    loading
                                        ? "جاري البحث..."
                                        : "بحث"
                                }
                            </button>


                            <button
                                type="button"
                                onClick={
                                    clearSearch
                                }
                                className="secondary-button"
                            >
                                مسح
                            </button>

                        </form>


                        {
                            searched &&
                            !loading &&
                            results.length === 0 &&
                            !error && (

                                <div className="table-card">

                                    <div
                                        style={{
                                            padding:
                                                "24px",
                                            textAlign:
                                                "center"
                                        }}
                                    >
                                        لم يتم العثور على صنف مطابق.
                                    </div>

                                </div>

                            )
                        }


                        {
                            results.length > 0 && (

                                <div
                                    className="table-card"
                                    style={{
                                        marginBottom:
                                            "18px"
                                    }}
                                >

                                    <div
                                        className="table-card-header"
                                    >

                                        <div>

                                            <strong>
                                                نتائج البحث
                                            </strong>

                                            <span>
                                                {
                                                    formatNumber(
                                                        results.length
                                                    )
                                                }
                                                {" سجل — "}
                                                {
                                                    formatNumber(
                                                        masterCount
                                                    )
                                                }
                                                {" صنف موحد"}
                                            </span>

                                        </div>

                                    </div>


                                    <div className="table-wrap">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        الكود الموحد
                                                    </th>

                                                    <th>
                                                        الاسم الموحد
                                                    </th>

                                                    <th>
                                                        الفرع
                                                    </th>

                                                    <th>
                                                        كود الصنف
                                                    </th>

                                                    <th>
                                                        الاسم الأصلي
                                                    </th>

                                                    <th>
                                                        حالة المطابقة
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                {
                                                    results.map(
                                                        (
                                                            row,
                                                            index
                                                        ) => (

                                                            <tr
                                                                key={
                                                                    `${row.id}-${row.branch_id}-${row.branch_item_id}-${index}`
                                                                }
                                                                onClick={() =>
                                                                    openMasterItem(
                                                                        row.id
                                                                    )
                                                                }
                                                                style={{
                                                                    cursor:
                                                                        "pointer"
                                                                }}
                                                            >

                                                                <td>
                                                                    <strong>
                                                                        {
                                                                            row.unified_code
                                                                        }
                                                                    </strong>
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row.canonical_name
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        displayBranchName(
                                                                            row.branch_id,
                                                                            branchNames
                                                                        )
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row.branch_item_code ||
                                                                        row.branch_item_id ||
                                                                        "—"
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row.branch_item_name ||
                                                                        "—"
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row.match_status ||
                                                                        "—"
                                                                    }
                                                                </td>

                                                            </tr>

                                                        )
                                                    )
                                                }

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            )
                        }


                        {
                            selectedItem && (

                                <div className="table-card">

                                    <div
                                        className="table-card-header"
                                    >

                                        <div>

                                            <strong>
                                                {
                                                    selectedItem.unified_code
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    selectedItem.canonical_name
                                                }
                                            </span>

                                        </div>


                                        {
                                            detailLoading && (

                                                <span>
                                                    جاري التحميل...
                                                </span>

                                            )
                                        }

                                    </div>


                                    <div
                                        style={{
                                            padding:
                                                "18px"
                                        }}
                                    >

                                        <div className="table-wrap">

                                            <table>

                                                <thead>

                                                    <tr>

                                                        <th>
                                                            الفرع
                                                        </th>

                                                        <th>
                                                            كود الصنف
                                                        </th>

                                                        <th>
                                                            الاسم الأصلي
                                                        </th>

                                                        <th>
                                                            Barcode
                                                        </th>

                                                        <th>
                                                            Parts
                                                        </th>

                                                        <th>
                                                            حالة المطابقة
                                                        </th>

                                                    </tr>

                                                </thead>


                                                <tbody>

                                                    {
                                                        (
                                                            selectedItem.branches ||
                                                            []
                                                        ).map(
                                                            branch => (

                                                                <tr
                                                                    key={
                                                                        `${branch.branch_id}-${branch.branch_item_id}`
                                                                    }
                                                                >

                                                                    <td>
                                                                        {
                                                                            displayBranchName(
                                                                                branch.branch_id,
                                                                                branchNames
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                branch.branch_item_code ||
                                                                                branch.branch_item_id
                                                                            }
                                                                        </strong>
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            branch.branch_item_name ||
                                                                            "—"
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            branch.barcode &&
                                                                            branch.barcode !== "0" &&
                                                                            branch.barcode !== "1"
                                                                                ? branch.barcode
                                                                                : "—"
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            branch.parts ??
                                                                            1
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            branch.match_status ||
                                                                            "—"
                                                                        }
                                                                    </td>

                                                                </tr>

                                                            )
                                                        )
                                                    }

                                                </tbody>

                                            </table>

                                        </div>

                                    </div>

                                </div>

                            )
                        }

                    </div>

                )
            }

        </section>

    );

}
