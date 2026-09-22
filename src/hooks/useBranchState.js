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

                    setSelectedBranchId("all");
                    setSelectedConnection(null);
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

        let disposed = false;

        refreshActiveConnections();

        const timer =
            setInterval(
                () => {

                    if (
                        !disposed
                    ) {

                        refreshActiveConnections();

                    }

                },
                2000
            );

        return () => {

            disposed = true;

            clearInterval(
                timer
            );

        };

    }, []);


    useEffect(() => {

        if (
            selectedBranchId === "all"
        ) {

            setBranchOverview(null);
            setBranchOverviewError("");

            return;

        }


        if (
            activeSection !== "dashboard" ||
            activeModule !== "overview"
        ) {

            return;

        }


        if (
            !selectedConnection
        ) {

            setBranchOverview(null);

            return;

        }


        let cancelled = false;


        async function loadBranchOverview() {

            try {

                setBranchOverviewLoading(true);
                setBranchOverviewError("");


                const result =
                    await window
                        .pharmaBI
                        .sales
                        .summary({
                            ...selectedConnection,
                            fromDate,
                            toDate
                        });


                if (
                    cancelled
                ) {

                    return;

                }


                setBranchOverview(result);

            }
            catch (error) {

                console.error(
                    "[UI] Branch overview failed:",
                    error
                );


                if (
                    !cancelled
                ) {

                    setBranchOverview(null);
                    setBranchOverviewError(
                        error?.message ||
                        "فشل تحميل بيانات الفرع."
                    );

                }

            }
            finally {

                if (
                    !cancelled
                ) {

                    setBranchOverviewLoading(false);

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


    async function selectBranch(value) {

        if (
            value === "all"
        ) {

            setSelectedBranchId("all");
            setSelectedConnection(null);
            setSystemConnection(
                buildEmptyConnection()
            );
            setBranchOverview(null);
            setBranchOverviewError("");
            setConnectionStatus({
                type: "idle",
                message: ""
            });

            return;

        }


        const branchId =
            Number(value);


        if (
            !Number.isInteger(branchId) ||
            branchId <= 0
        ) {

            return;

        }


        try {

            setLoadingBranch(true);

            setConnectionStatus({
                type: "loading",
                message: "جاري تجهيز الفرع..."
            });


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(branchId);


            if (
                !saved
            ) {

                throw new Error(
                    `لا توجد بيانات اتصال محفوظة للفرع ${branchId}.`
                );

            }


            setSelectedBranchId(
                String(branchId)
            );


            setSelectedConnection(
                buildConnectionPayload(saved)
            );


            setSystemConnection({
                server: saved.server || "",
                port: String(saved.port || 1433),
                database: saved.database || "",
                user: saved.user || "",
                password: saved.password || ""
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


            setConnectionStatus({
                type: "error",
                message:
                    error?.message ||
                    "فشل تغيير الفرع."
            });

        }
        finally {

            setLoadingBranch(false);

        }

    }


    function openAddBranchEditor() {

        const usedIds =
            new Set(
                savedBranches.map(
                    branch =>
                        Number(branch.branchId)
                )
            );


        let nextId = 1;


        while (
            usedIds.has(nextId)
        ) {

            nextId += 1;

        }


        setBranchEditor({
            open: true,
            mode: "add",
            branchId: String(nextId),
            branchName: "",
            connection: buildEmptyConnection()
        });


        setBranchEditorMessage(null);

    }


    async function openEditBranchEditor(branchId) {

        try {

            setBranchEditorBusy(true);


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(branchId);


            if (
                !saved
            ) {

                throw new Error(
                    `الفرع ${branchId} غير موجود.`
                );

            }


            setBranchEditor({

                open: true,
                mode: "edit",
                branchId: String(branchId),
                branchName:
                    normalizeBranchName(saved),

                connection: {
                    server: saved.server || "",
                    port: String(saved.port || 1433),
                    database: saved.database || "",
                    user: saved.user || "",
                    password: saved.password || ""
                }

            });


            setBranchEditorMessage(null);

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

            setBranchEditorBusy(false);

        }

    }


    function closeBranchEditor() {

        if (
            branchEditorBusy
        ) {

            return;

        }


        setBranchEditor({
            open: false,
            mode: "add",
            branchId: "",
            branchName: "",
            connection: buildEmptyConnection()
        });


        setBranchEditorMessage(null);

    }


    function updateBranchEditorField(
        field,
        value
    ) {

        setBranchEditor(
            current => ({
                ...current,
                connection: {
                    ...current.connection,
                    [field]: value
                }
            })
        );

    }


    function updateBranchEditorName(value) {

        setBranchEditor(
            current => ({
                ...current,
                branchName: value
            })
        );

    }


    function updateBranchEditorId(value) {

        setBranchEditor(
            current => ({
                ...current,
                branchId: value
            })
        );

    }


    function validateBranchEditor() {

        const branchId =
            Number(branchEditor.branchId);


        if (
            !Number.isInteger(branchId) ||
            branchId <= 0
        ) {

            throw new Error(
                "Branch ID يجب أن يكون رقمًا صحيحًا أكبر من صفر."
            );

        }


        const branchName =
            String(
                branchEditor.branchName || ""
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
                connection.server || ""
            ).trim()
        ) {

            throw new Error(
                "SQL Server مطلوب."
            );

        }


        const port =
            Number(connection.port);


        if (
            !Number.isInteger(port) ||
            port <= 0
        ) {

            throw new Error(
                "Port غير صحيح."
            );

        }


        if (
            !String(
                connection.database || ""
            ).trim()
        ) {

            throw new Error(
                "Database مطلوبة."
            );

        }


        if (
            !String(
                connection.user || ""
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
                        connection.password || ""
                    )
            }
        };

    }


    async function saveBranchFromEditor() {

        try {

            setBranchEditorBusy(true);
            setBranchEditorMessage(null);


            const payload =
                validateBranchEditor();


            if (
                branchEditor.mode === "add"
            ) {

                const exists =
                    savedBranches.some(
                        branch =>
                            Number(branch.branchId) ===
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
                        branchId: payload.branchId,
                        branchName: payload.branchName,
                        connection: payload.connection
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
                        branchId: payload.branchId,
                        branchName: payload.branchName,
                        connection: payload.connection
                    });


            if (
                testResult?.success === false
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


            setSelectedBranchId(
                String(payload.branchId)
            );


            const saved =
                await window
                    .pharmaBI
                    .connection
                    .getSaved(
                        payload.branchId
                    );


            setSelectedConnection(
                buildConnectionPayload(saved)
            );


            setSystemConnection({
                server: saved.server || "",
                port: String(saved.port || 1433),
                database: saved.database || "",
                user: saved.user || "",
                password: saved.password || ""
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

            setBranchEditorBusy(false);

        }

    }


    async function deleteBranch(branchId) {

        const branch =
            savedBranches.find(
                item =>
                    Number(item.branchId) ===
                    Number(branchId)
            );


        const branchName =
            normalizeBranchName(
                branch || { branchId }
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

            setLoadingBranch(true);


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
                selectedBranchId ===
                String(branchId)
            ) {

                setSelectedBranchId("all");
                setSelectedConnection(null);
                setSystemConnection(
                    buildEmptyConnection()
                );
                setBranchOverview(null);

            }


            setConnectionStatus({
                type: "success",
                message:
                    `تم حذف ${branchName}.`
            });


            if (
                remaining.length === 0
            ) {

                setSelectedBranchId("all");

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

            setLoadingBranch(false);

        }

    }


    async function reconnectBranch(branchId) {

        try {

            setLoadingBranch(true);


            const branch =
                savedBranches.find(
                    item =>
                        Number(item.branchId) ===
                        Number(branchId)
                );


            const branchName =
                normalizeBranchName(
                    branch || { branchId }
                );


            setConnectionStatus({
                type: "loading",
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
                type: "success",
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
                type: "error",
                message:
                    error?.message ||
                    "فشل الاتصال."
            });

        }
        finally {

            setLoadingBranch(false);

        }

    }


    async function closeBranch(branchId) {

        try {

            const branch =
                savedBranches.find(
                    item =>
                        Number(item.branchId) ===
                        Number(branchId)
                );


            const branchName =
                normalizeBranchName(
                    branch || { branchId }
                );


            await window
                .pharmaBI
                .connection
                .close(
                    branchId
                );


            await refreshActiveConnections();


            setConnectionStatus({
                type: "success",
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
                type: "error",
                message:
                    error?.message ||
                    "فشل إغلاق الاتصال."
            });

        }

    }


    async function testCurrentConnection() {

        if (
            selectedBranchId === "all"
        ) {

            return;

        }


        try {

            const branchId =
                Number(selectedBranchId);


            const currentBranch =
                savedBranches.find(
                    branch =>
                        Number(branch.branchId) ===
                        branchId
                );


            const branchName =
                normalizeBranchName(
                    currentBranch || { branchId }
                );


            setConnectionStatus({
                type: "loading",
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
                                    systemConnection.server || ""
                                ).trim(),
                            port:
                                Number(
                                    systemConnection.port ||
                                    1433
                                ),
                            database:
                                String(
                                    systemConnection.database || ""
                                ).trim(),
                            user:
                                String(
                                    systemConnection.user || ""
                                ).trim(),
                            password:
                                String(
                                    systemConnection.password || ""
                                )
                        }
                    });


            if (
                result?.success === false
            ) {

                throw new Error(
                    result?.error ||
                    `فشل اتصال ${branchName}.`
                );

            }


            await refreshActiveConnections();


            setConnectionStatus({
                type: "success",
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
                type: "error",
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
