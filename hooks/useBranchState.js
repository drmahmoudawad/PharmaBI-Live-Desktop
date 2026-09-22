import {
    useEffect,
    useState
} from "react";


import {
    isValidSavedBranch,
    normalizeBranchName,
    sortBranches,
    buildConnectionPayload,
    buildEmptyConnection
} from "../app/appHelpers.js";


export function useBranchState({
    initialRange,
    fromDate,
    toDate,
    activeSection,
    activeModule
}) {

    const [
        savedBranches,
        setSavedBranches
    ] = useState([]);


    const [
        selectedBranchId,
        setSelectedBranchId
    ] = useState("all");


    const [
        selectedConnection,
        setSelectedConnection
    ] = useState(null);


    const [
        branchOverview,
        setBranchOverview
    ] = useState(null);


    const [
        branchOverviewLoading,
        setBranchOverviewLoading
    ] = useState(false);


    const [
        branchOverviewError,
        setBranchOverviewError
    ] = useState("");


    const [
        loadingBranches,
        setLoadingBranches
    ] = useState(true);


    const [
        loadingBranch,
        setLoadingBranch
    ] = useState(false);


    const [
        connectionStatus,
        setConnectionStatus
    ] = useState({
        type: "idle",
        message: ""
    });


    const [
        systemConnection,
        setSystemConnection
    ] = useState(
        buildEmptyConnection()
    );


    const [
        branchEditor,
        setBranchEditor
    ] = useState({
        open: false,
        mode: "add",
        branchId: "",
        branchName: "",
        connection: buildEmptyConnection()
    });


    const [
        branchEditorBusy,
        setBranchEditorBusy
    ] = useState(false);


    const [
        branchEditorMessage,
        setBranchEditorMessage
    ] = useState(null);


    const [
        activeConnections,
        setActiveConnections
    ] = useState([]);


    async function loadSavedBranches() {

        const result =
            await window
                .pharmaBI
                .connection
                .getAllSaved();


        const branches =
            Array.isArray(result)
                ? sortBranches(
                    result
                        .filter(isValidSavedBranch)
                        .map(branch => ({
                            ...branch,
                            branchName:
                                normalizeBranchName(branch)
                        }))
                )
                : [];


        setSavedBranches(
            branches
        );


        return branches;

    }


    useEffect(() => {

        let cancelled = false;


        async function load() {

            try {

                setLoadingBranches(true);


                const branches =
                    await loadSavedBranches();


                if (
                    cancelled
                ) {

                    return;

                }


                if (
                    branches.length ===
                    0
                ) {

                    setSelectedBranchId(
                        "all"
                    );

                    setSelectedConnection(
                        null
                    );

                    setBranchOverview(
                        null
                    );

                    setSystemConnection(
                        buildEmptyConnection()
                    );

                }

            }
            catch (error) {

                console.error(
                    "[UI] Failed to load saved branches:",
                    error
                );


                if (
                    !cancelled
                ) {

                    setConnectionStatus({
                        type: "error",
                        message:
                            error?.message ||
                            "فشل تحميل الفروع المحفوظة."
                    });

                }

            }
            finally {

                if (
                    !cancelled
                ) {

                    setLoadingBranches(false);

                }

            }

        }


        load();


        return () => {

            cancelled = true;

        };

    }, []);


    async function refreshActiveConnections() {

        try {

            const active =
                await window
                    .pharmaBI
                    .connection
                    .active();


            setActiveConnections(
                Array.isArray(active)
                    ? active
                    : []
            );

        }
        catch (error) {

            console.error(
                "[UI] Failed to load active connections:",
                error
            );

        }

    }


    useEffect(() => {

        refreshActiveConnections();

    }, []);


    /*
     * =========================================================
     * BRANCH OVERVIEW
     * =========================================================
     *
     * IMPORTANT:
     *
     * The branch ID is the source of truth.
     * The SQL connection is explicitly taken from
     * selectedConnection.connection.
     *
     * Any response belonging to an older branch is ignored.
     */

    useEffect(() => {

        if (
            selectedBranchId ===
            "all"
        ) {

            setBranchOverview(
                null
            );

            setBranchOverviewError(
                ""
            );

            setBranchOverviewLoading(
                false
            );

            return;

        }


        if (
            activeSection !==
            "dashboard" ||
            activeModule !==
            "overview"
        ) {

            return;

        }


        if (
            !selectedConnection ||
            Number(
                selectedConnection.branchId
            ) !==
            Number(
                selectedBranchId
            ) ||
            !selectedConnection.connection
        ) {

            setBranchOverview(
                null
            );

            return;

        }


        let cancelled = false;


        const requestBranchId =
            Number(
                selectedBranchId
            );


        const requestConnection = {

            ...selectedConnection.connection

        };


        async function loadBranchOverview() {

            try {

                setBranchOverviewLoading(
                    true
                );

                setBranchOverviewError(
                    ""
                );


                /*
                 * Explicitly identify the branch.
                 * Never rely on a stale/nested branch object.
                 */

                const result =
                    await window
                        .pharmaBI
                        .sales
                        .summary({

                            branchId:
                                requestBranchId,

                            connection:
                                requestConnection,

                            fromDate,

                            toDate

                        });


                if (
                    cancelled
                ) {

                    return;

                }


                /*
                 * Additional guard:
                 * the result must belong to the branch currently
                 * selected in the UI.
                 */

                if (
                    result &&
                    result.branchId !== undefined &&
                    Number(
                        result.branchId
                    ) !==
                    requestBranchId
                ) {

                    console.error(
                        "[UI] Ignored mismatched branch result:",
                        {
                            requestedBranchId:
                                requestBranchId,
                            returnedBranchId:
                                result.branchId
                        }
                    );

                    return;

                }


                setBranchOverview(
                    result
                );

            }
            catch (error) {

                if (
                    cancelled
                ) {

                    return;

                }


                console.error(
                    `[UI] Branch overview failed for branch ${requestBranchId}:`,
                    error
                );


                setBranchOverview(
                    null
                );

                setBranchOverviewError(
                    error?.message ||
                    "فشل تحميل بيانات الفرع."
                );

            }
            finally {

                if (
                    !cancelled
                ) {

                    setBranchOverviewLoading(
                        false
                    );

                }

            }

        }


        loadBranchOverview();


        return () => {

            cancelled = true;

        };

    }, [
        selectedBranchId,
        selectedConnection,
        activeSection,
        activeModule,
        fromDate,
        toDate
    ]);


    /*
     * =========================================================
     * BRANCH SELECTION
     * =========================================================
     */

    async function selectBranch(value) {

        /*
         * ALWAYS clear the old branch immediately.
         * This prevents Ascut data from remaining visible
         * while another branch is loading.
         */

        setBranchOverview(
            null
        );

        setBranchOverviewError(
            ""
        );

        setBranchOverviewLoading(
            false
        );


        if (
            value ===
            "all"
        ) {

            setLoadingBranch(
                false
            );


            setSelectedBranchId(
                "all"
            );


            setSelectedConnection(
                null
            );


            setSystemConnection(
                buildEmptyConnection()
            );


            setConnectionStatus({
                type: "idle",
                message: ""
            });


            return;

        }


        const branchId =
            Number(
                value
            );


        if (
            !Number.isInteger(
                branchId
            ) ||
            branchId <= 0
        ) {

            return;

        }


        try {

            setLoadingBranch(
                true
            );


            setConnectionStatus({
                type: "loading",
                message:
                    "جاري تجهيز الفرع..."
            });


            /*
             * Remove the old connection before getting the new one.
             */

            setSelectedConnection(
                null
            );


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(
                        branchId
                    );


            if (
                !saved
            ) {

                throw new Error(
                    `لا توجد بيانات اتصال محفوظة للفرع ${branchId}.`
                );

            }


            const normalizedBranchId =
                Number(
                    saved.branchId ||
                    branchId
                );


            if (
                normalizedBranchId !==
                branchId
            ) {

                throw new Error(
                    `بيانات الاتصال للفرع ${branchId} غير متطابقة.`
                );

            }


            const nextConnection =
                buildConnectionPayload(
                    saved
                );


            if (
                !nextConnection
            ) {

                throw new Error(
                    `تعذر بناء اتصال الفرع ${branchId}.`
                );

            }


            /*
             * Set branch and connection together conceptually.
             * The overview effect will only execute when both
             * selectedBranchId and selectedConnection identify
             * the same branch.
             */

            setSelectedBranchId(
                String(
                    branchId
                )
            );


            setSelectedConnection(
                nextConnection
            );


            setSystemConnection({
                server:
                    saved.server ||
                    "",

                port:
                    String(
                        saved.port ||
                        1433
                    ),

                database:
                    saved.database ||
                    "",

                user:
                    saved.user ||
                    "",

                password:
                    saved.password ||
                    ""
            });


            setConnectionStatus({
                type: "success",
                message:
                    `${normalizeBranchName(saved)} جاهز.`
            });


            await refreshActiveConnections();

        }
        catch (error) {

            console.error(
                "[UI] Failed to switch branch:",
                error
            );


            /*
             * Never leave the previous branch's data visible
             * after a failed switch.
             */

            setBranchOverview(
                null
            );

            setSelectedConnection(
                null
            );


            setConnectionStatus({
                type: "error",
                message:
                    error?.message ||
                    "فشل تغيير الفرع."
            });

        }
        finally {

            setLoadingBranch(
                false
            );

        }

    }


    /*
     * =========================================================
     * ADD BRANCH
     * =========================================================
     */

    function openAddBranchEditor() {

        const usedIds =
            new Set(
                savedBranches.map(
                    branch =>
                        Number(
                            branch.branchId
                        )
                )
            );


        let nextId = 1;


        while (
            usedIds.has(
                nextId
            )
        ) {

            nextId += 1;

        }


        setBranchEditor({

            open:
                true,

            mode:
                "add",

            branchId:
                String(
                    nextId
                ),

            branchName:
                "",

            connection:
                buildEmptyConnection()

        });


        setBranchEditorMessage(
            null
        );

    }


    /*
     * =========================================================
     * EDIT BRANCH
     * =========================================================
     */

    async function openEditBranchEditor(
        branchId
    ) {

        try {

            setBranchEditorBusy(
                true
            );


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(
                        branchId
                    );


            if (
                !saved
            ) {

                throw new Error(
                    `الفرع ${branchId} غير موجود.`
                );

            }


            setBranchEditor({

                open:
                    true,

                mode:
                    "edit",

                branchId:
                    String(
                        branchId
                    ),

                branchName:
                    normalizeBranchName(
                        saved
                    ),

                connection: {

                    server:
                        saved.server ||
                        "",

                    port:
                        String(
                            saved.port ||
                            1433
                        ),

                    database:
                        saved.database ||
                        "",

                    user:
                        saved.user ||
                        "",

                    password:
                        saved.password ||
                        ""

                }

            });


            setBranchEditorMessage(
                null
            );

        }
        catch (error) {

            console.error(
                "[UI] Failed to open branch editor:",
                error
            );


            setBranchEditorMessage({
                type: "error",
                message:
                    error?.message ||
                    "فشل تحميل بيانات الفرع."
            });

        }
        finally {

            setBranchEditorBusy(
                false
            );

        }

    }


    /*
     * =========================================================
     * CLOSE EDITOR
     * =========================================================
     */

    function closeBranchEditor() {

        if (
            branchEditorBusy
        ) {

            return;

        }


        setBranchEditor({

            open:
                false,

            mode:
                "add",

            branchId:
                "",

            branchName:
                "",

            connection:
                buildEmptyConnection()

        });


        setBranchEditorMessage(
            null
        );

    }


    /*
     * =========================================================
     * UPDATE EDITOR
     * =========================================================
     */

    function updateBranchEditorField(
        field,
        value
    ) {

        setBranchEditor(
            current => ({

                ...current,

                connection: {

                    ...current.connection,

                    [field]:
                        value

                }

            })
        );

    }


    function updateBranchEditorName(
        value
    ) {

        setBranchEditor(
            current => ({

                ...current,

                branchName:
                    value

            })
        );

    }


    function updateBranchEditorId(
        value
    ) {

        setBranchEditor(
            current => ({

                ...current,

                branchId:
                    value

            })
        );

    }


    /*
     * =========================================================
     * VALIDATE EDITOR
     * =========================================================
     */

    function validateBranchEditor() {

        const branchId =
            Number(
                branchEditor.branchId
            );


        if (
            !Number.isInteger(
                branchId
            ) ||
            branchId <= 0
        ) {

            throw new Error(
                "Branch ID يجب أن يكون رقمًا صحيحًا أكبر من صفر."
            );

        }


        const branchName =
            String(
                branchEditor.branchName ||
                ""
            ).trim();


        if (
            !branchName
        ) {

            throw new Error(
                "اسم الفرع مطلوب."
            );

        }


        const connection =
            branchEditor.connection;


        if (
            !String(
                connection.server ||
                ""
            ).trim()
        ) {

            throw new Error(
                "SQL Server مطلوب."
            );

        }


        const port =
            Number(
                connection.port
            );


        if (
            !Number.isInteger(
                port
            ) ||
            port <= 0
        ) {

            throw new Error(
                "Port غير صحيح."
            );

        }


        if (
            !String(
                connection.database ||
                ""
            ).trim()
        ) {

            throw new Error(
                "Database مطلوبة."
            );

        }


        if (
            !String(
                connection.user ||
                ""
            ).trim()
        ) {

            throw new Error(
                "SQL User مطلوب."
            );

        }


        return {

            branchId,

            branchName,

            connection: {

                server:
                    String(
                        connection.server
                    ).trim(),

                port,

                database:
                    String(
                        connection.database
                    ).trim(),

                user:
                    String(
                        connection.user
                    ).trim(),

                password:
                    String(
                        connection.password ||
                        ""
                    )

            }

        };

    }


    /*
     * =========================================================
     * SAVE BRANCH
     * =========================================================
     */

    async function saveBranchFromEditor() {

        try {

            setBranchEditorBusy(
                true
            );

            setBranchEditorMessage(
                null
            );


            const payload =
                validateBranchEditor();


            if (
                branchEditor.mode ===
                "add"
            ) {

                const exists =
                    savedBranches.some(
                        branch =>
                            Number(
                                branch.branchId
                            ) ===
                            payload.branchId
                    );


                if (
                    exists
                ) {

                    throw new Error(
                        `الفرع ${payload.branchId} موجود بالفعل.`
                    );

                }

            }


            const saveResult =
                await window
                    .pharmaBI
                    .connection
                    .save({

                        branchId:
                            payload.branchId,

                        branchName:
                            payload.branchName,

                        connection:
                            payload.connection

                    });


            if (
                !saveResult?.saved
            ) {

                throw new Error(
                    "لم يتم حفظ بيانات الفرع."
                );

            }


            const testResult =
                await window
                    .pharmaBI
                    .connection
                    .test({

                        branchId:
                            payload.branchId,

                        branchName:
                            payload.branchName,

                        connection:
                            payload.connection

                    });


            if (
                testResult?.success ===
                false
            ) {

                throw new Error(

                    testResult?.error ||

                    `فشل اتصال الفرع ${payload.branchId}.`

                );

            }


            await window
                .pharmaBI
                .connection
                .connectSaved(
                    payload.branchId
                );


            await loadSavedBranches();

            await refreshActiveConnections();


            setBranchOverview(
                null
            );


            setSelectedBranchId(
                String(
                    payload.branchId
                )
            );


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(
                        payload.branchId
                    );


            if (
                !saved
            ) {

                throw new Error(
                    `تعذر استرجاع بيانات الفرع ${payload.branchId}.`
                );

            }


            setSelectedConnection(
                buildConnectionPayload(
                    saved
                )
            );


            setSystemConnection({

                server:
                    saved.server ||
                    "",

                port:
                    String(
                        saved.port ||
                        1433
                    ),

                database:
                    saved.database ||
                    "",

                user:
                    saved.user ||
                    "",

                password:
                    saved.password ||
                    ""

            });


            setConnectionStatus({
                type: "success",
                message:
                    `✅ ${normalizeBranchName(saved)} — الاتصال ناجح ومتصل الآن.`
            });


            closeBranchEditor();

        }
        catch (error) {

            console.error(
                "[UI] Failed to save branch:",
                error
            );


            setBranchEditorMessage({
                type: "error",
                message:
                    error?.message ||
                    "فشل حفظ الفرع."
            });

        }
        finally {

            setBranchEditorBusy(
                false
            );

        }

    }


    /*
     * =========================================================
     * DELETE BRANCH
     * =========================================================
     */

    async function deleteBranch(
        branchId
    ) {

        const branch =
            savedBranches.find(
                item =>
                    Number(
                        item.branchId
                    ) ===
                    Number(
                        branchId
                    )
            );


        const branchName =
            normalizeBranchName(
                branch || {
                    branchId
                }
            );


        const confirmed =
            window.confirm(
                `هل تريد حذف ${branchName}؟\n\nسيتم حذف بيانات الاتصال وإغلاق الاتصال النشط.`
            );


        if (
            !confirmed
        ) {

            return;

        }


        try {

            setLoadingBranch(
                true
            );


            const result =
                await window
                    .pharmaBI
                    .connection
                    .deleteSaved(
                        branchId
                    );


            if (
                !result?.deleted
            ) {

                throw new Error(
                    `لم يتم حذف ${branchName}.`
                );

            }


            const remaining =
                await loadSavedBranches();


            await refreshActiveConnections();


            if (
                Number(
                    selectedBranchId
                ) ===
                Number(
                    branchId
                )
            ) {

                setSelectedBranchId(
                    "all"
                );

                setSelectedConnection(
                    null
                );

                setSystemConnection(
                    buildEmptyConnection()
                );

                setBranchOverview(
                    null
                );

                setBranchOverviewError(
                    ""
                );

            }


            setConnectionStatus({
                type: "success",
                message:
                    `تم حذف ${branchName}.`
            });


            if (
                remaining.length ===
                0
            ) {

                setSelectedBranchId(
                    "all"
                );

            }

        }
        catch (error) {

            console.error(
                "[UI] Failed to delete branch:",
                error
            );


            setConnectionStatus({
                type: "error",
                message:
                    error?.message ||
                    "فشل حذف الفرع."
            });

        }
        finally {

            setLoadingBranch(
                false
            );

        }

    }


    /*
     * =========================================================
     * RECONNECT
     * =========================================================
     */

    async function reconnectBranch(
        branchId
    ) {

        try {

            setLoadingBranch(
                true
            );


            const branch =
                savedBranches.find(
                    item =>
                        Number(
                            item.branchId
                        ) ===
                        Number(
                            branchId
                        )
                );


            const branchName =
                normalizeBranchName(
                    branch || {
                        branchId
                    }
                );


            setConnectionStatus({

                type:
                    "loading",

                message:
                    `جاري اتصال ${branchName}...`

            });


            await window
                .pharmaBI
                .connection
                .connectSaved(
                    branchId
                );


            await refreshActiveConnections();


            setConnectionStatus({

                type:
                    "success",

                message:
                    `✅ ${branchName} متصل الآن.`

            });

        }
        catch (error) {

            console.error(
                "[UI] Failed to reconnect branch:",
                error
            );


            setConnectionStatus({

                type:
                    "error",

                message:
                    error?.message ||
                    "فشل الاتصال."

            });

        }
        finally {

            setLoadingBranch(
                false
            );

        }

    }


    /*
     * =========================================================
     * CLOSE BRANCH
     * =========================================================
     */

    async function closeBranch(
        branchId
    ) {

        try {

            const branch =
                savedBranches.find(
                    item =>
                        Number(
                            item.branchId
                        ) ===
                        Number(
                            branchId
                        )
                );


            const branchName =
                normalizeBranchName(
                    branch || {
                        branchId
                    }
                );


            await window
                .pharmaBI
                .connection
                .close(
                    branchId
                );


            await refreshActiveConnections();


            setConnectionStatus({

                type:
                    "success",

                message:
                    `تم فصل ${branchName}.`

            });

        }
        catch (error) {

            console.error(
                "[UI] Failed to close branch:",
                error
            );


            setConnectionStatus({

                type:
                    "error",

                message:
                    error?.message ||
                    "فشل إغلاق الاتصال."

            });

        }

    }


    /*
     * =========================================================
     * TEST CURRENT CONNECTION
     * =========================================================
     */

    async function testCurrentConnection() {

        if (
            selectedBranchId ===
            "all"
        ) {

            return;

        }


        try {

            const branchId =
                Number(
                    selectedBranchId
                );


            const currentBranch =
                savedBranches.find(
                    branch =>
                        Number(
                            branch.branchId
                        ) ===
                        branchId
                );


            const branchName =
                normalizeBranchName(
                    currentBranch || {
                        branchId
                    }
                );


            setConnectionStatus({

                type:
                    "loading",

                message:
                    `جاري اختبار اتصال ${branchName}...`

            });


            const result =
                await window
                    .pharmaBI
                    .connection
                    .test({

                        branchId,

                        branchName,

                        connection: {

                            server:
                                String(
                                    systemConnection.server ||
                                    ""
                                ).trim(),

                            port:
                                Number(
                                    systemConnection.port ||
                                    1433
                                ),

                            database:
                                String(
                                    systemConnection.database ||
                                    ""
                                ).trim(),

                            user:
                                String(
                                    systemConnection.user ||
                                    ""
                                ).trim(),

                            password:
                                String(
                                    systemConnection.password ||
                                    ""
                                )

                        }

                    });


            if (
                result?.success ===
                false
            ) {

                throw new Error(

                    result?.error ||

                    `فشل اتصال ${branchName}.`

                );

            }


            await refreshActiveConnections();


            setConnectionStatus({

                type:
                    "success",

                message:
                    `✅ الاتصال ناجح — ${branchName} متصل الآن.`

            });


            await loadSavedBranches();

        }
        catch (error) {

            console.error(
                "[UI] Connection test failed:",
                error
            );


            setConnectionStatus({

                type:
                    "error",

                message:
                    error?.message ||
                    "فشل الاتصال."

            });

        }

    }


    return {

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

    };

}


export default useBranchState;