const fs = require("fs");

const file =
    "src/components/CustomerAnalyticsModulePanel.jsx";

let content =
    fs.readFileSync(
        file,
        "utf8"
    ).replace(/\r\n/g, "\n");

const modalMarker =
    "function CustomerProfileModal(";

const componentMarker =
    "function CustomerCrmWhatsAppPanel(";

const insertionMarker =
`
                <div
                    style={{
                        padding:
                            22,

                        display:
                            "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "flex-start"
`;

if (
    !content.includes(
        modalMarker
    )
) {
    throw new Error(
        "CUSTOMER PROFILE MODAL NOT FOUND"
    );
}

if (
    !content.includes(
        insertionMarker
    )
) {
    throw new Error(
        "MODAL INSERTION MARKER NOT FOUND"
    );
}

if (
    !content.includes(
        componentMarker
    )
) {

    const component =
`
function CustomerCrmWhatsAppPanel(
    {
        customer,
        customerSource,
        profile,
        recommendedAction
    }
) {

    const branchId =
        Number(
            profile?.branchId ??
            profile?.branch_id ??
            customerSource?.branchId ??
            customerSource?.branch_id ??
            customer?.branchId ??
            customer?.branch_id ??
            0
        );

    const customerId =
        customer?.customer_id ??
        customer?.customerId ??
        customer?.customer_code ??
        customerSource?.customer_id ??
        customerSource?.customerId ??
        customerSource?.customer_code ??
        profile?.customerId ??
        profile?.customer_id ??
        null;

    const customerName =
        customer?.customer_name ||
        customer?.customerName ||
        customerSource?.customer_name ||
        customerSource?.customerName ||
        profile?.customer_name ||
        profile?.customerName ||
        "";

    const rawPhone =
        customer?.whatsapp_phone ||
        customer?.whatsappPhone ||
        customer?.phone_numbers ||
        customer?.phone ||
        customer?.mobile ||
        customerSource?.whatsappPhone ||
        customerSource?.whatsapp_phone ||
        customerSource?.phone_numbers ||
        customerSource?.phone ||
        profile?.whatsappPhone ||
        profile?.whatsapp_phone ||
        "";

    const phone =
        String(
            rawPhone || ""
        )
        .split(
            /[,;|\\s]+/
        )
        .map(
            value =>
                value.trim()
        )
        .find(
            Boolean
        ) || "";

    const [
        whatsappStatus,
        setWhatsappStatus
    ] = useState(
        "disconnected"
    );

    const [
        history,
        setHistory
    ] = useState([]);

    const [
        message,
        setMessage
    ] = useState("");

    const [
        sending,
        setSending
    ] = useState(false);

    const [
        loadingHistory,
        setLoadingHistory
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        refreshKey,
        setRefreshKey
    ] = useState(0);

    const loadStatus =
        async () => {

            try {

                const result =
                    await window.pharmaBI.whatsapp.status();

                const value =
                    typeof result ===
                        "string"
                        ? result
                        : (
                            result?.status ||
                            result?.state ||
                            "disconnected"
                        );

                setWhatsappStatus(
                    String(
                        value
                    ).toLowerCase()
                );

            }
            catch {

                setWhatsappStatus(
                    "disconnected"
                );

            }

        };

    const loadHistory =
        async () => {

            if (
                !branchId ||
                !customerId
            ) {
                return;
            }

            setLoadingHistory(
                true
            );

            try {

                const result =
                    await window.pharmaBI.whatsapp.history(
                        {
                            branchId,
                            customerId,
                            phone,
                            limit: 50,
                            offset: 0
                        }
                    );

                const rows =
                    Array.isArray(
                        result
                    )
                        ? result
                        : (
                            Array.isArray(
                                result?.messages
                            )
                                ? result.messages
                                : (
                                    Array.isArray(
                                        result?.history
                                    )
                                        ? result.history
                                        : []
                                )
                        );

                setHistory(
                    rows
                );

            }
            catch (
                historyError
            ) {

                console.error(
                    "Customer WhatsApp history failed:",
                    historyError
                );

                setHistory(
                    []
                );

            }
            finally {

                setLoadingHistory(
                    false
                );

            }

        };

    useEffect(
        () => {

            loadStatus();
            loadHistory();

        },
        [
            branchId,
            customerId,
            phone,
            refreshKey
        ]
    );

    useEffect(
        () => {

            const api =
                window.pharmaBI?.whatsapp;

            if (
                !api
            ) {
                return;
            }

            const refresh =
                () =>
                    setRefreshKey(
                        value =>
                            value + 1
                    );

            if (
                typeof api.onMessage ===
                    "function"
            ) {
                api.onMessage(
                    refresh
                );
            }

            if (
                typeof api.onMessageAck ===
                    "function"
            ) {
                api.onMessageAck(
                    refresh
                );
            }

            return () => {

                if (
                    typeof api.offMessage ===
                        "function"
                ) {
                    api.offMessage(
                        refresh
                    );
                }

                if (
                    typeof api.offMessageAck ===
                        "function"
                ) {
                    api.offMessageAck(
                        refresh
                    );
                }

            };

        },
        []
    );

    const handleSend =
        async () => {

            setError("");

            const cleanMessage =
                String(
                    message || ""
                ).trim();

            if (
                !phone
            ) {

                setError(
                    String.fromCodePoint(
                        0x0644,0x0627,
                        0x064a,0x0648,
                        0x062c,0x062f,
                        0x0020,
                        0x0631,0x0642,0x0645,
                        0x0020,
                        0x0648,0x0627,
                        0x062a,0x0633,
                        0x0627,0x0628
                    )
                );

                return;

            }

            if (
                !cleanMessage
            ) {

                setError(
                    String.fromCodePoint(
                        0x0627,0x0643,0x062a,
                        0x0628,
                        0x0020,
                        0x0627,0x0644,
                        0x0631,0x0633,0x0627,
                        0x0644,0x0629
                    )
                );

                return;

            }

            if (
                !branchId ||
                !customerId
            ) {

                setError(
                    String.fromCodePoint(
                        0x0628,0x064a,0x0627,
                        0x0646,0x0627,0x062a,
                        0x0020,
                        0x0627,0x0644,
                        0x0639,0x0645,0x064a,
                        0x0644,
                        0x0020,
                        0x063a,0x064a,0x0631,
                        0x0020,
                        0x0645,0x0643,0x062a,
                        0x0645,0x0644,0x0629
                    )
                );

                return;

            }

            const connected =
                whatsappStatus ===
                    "ready" ||
                whatsappStatus ===
                    "connected";

            if (
                !connected
            ) {

                setError(
                    String.fromCodePoint(
                        0x0648,0x0627,
                        0x062a,0x0633,
                        0x0627,0x0628,
                        0x0020,
                        0x063a,0x064a,0x0631,
                        0x0020,
                        0x0645,0x062a,
                        0x0635,0x0644
                    )
                );

                return;

            }

            setSending(
                true
            );

            try {

                const response =
                    await window.pharmaBI.whatsapp.send(
                        {
                            phone,

                            message:
                                cleanMessage,

                            type:
                                "TEXT",

                            customerId:
                                String(
                                    customerId
                                ),

                            customerName,

                            branchId:
                                Number(
                                    branchId
                                )
                        }
                    );

                const result =
                    response?.result ??
                    response;

                if (
                    response?.success ===
                        false ||
                    result?.success ===
                        false
                ) {
                    throw new Error(
                        response?.error ||
                        result?.error ||
                        "WhatsApp send failed"
                    );
                }

                setMessage("");

                setRefreshKey(
                    value =>
                        value + 1
                );

            }
            catch (
                sendError
            ) {

                console.error(
                    "Customer WhatsApp send failed:",
                    sendError
                );

                setError(
                    sendError?.message ||
                    "WhatsApp send failed"
                );

            }
            finally {

                setSending(
                    false
                );

            }

        };

    const connected =
        whatsappStatus ===
            "ready" ||
        whatsappStatus ===
            "connected";

    const priority =
        customer?.interventionPriority ??
        customer?.intervention_priority ??
        customerSource?.interventionPriority ??
        customerSource?.intervention_priority ??
        profile?.interventionPriority ??
        profile?.intervention_priority ??
        "";

    return (
        <div
            style={{
                margin:
                    "0 22px 18px",

                border:
                    "1px solid #e2e8f0",

                borderRadius:
                    16,

                background:
                    "#f8fafc",

                overflow:
                    "hidden"
            }}
        >

            <div
                style={{
                    padding:
                        "14px 16px",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "space-between",

                    gap:
                        12,

                    borderBottom:
                        "1px solid #e2e8f0"
                }}
            >

                <div>

                    <div
                        style={{
                            fontSize:
                                16,

                            fontWeight:
                                900,

                            color:
                                "#172033"
                        }}
                    >
                        {String.fromCodePoint(
                            0x0631,0x0628,0x0637,
                            0x0020,
                            0x0627,0x0644,
                            0x0639,0x0645,0x064a,
                            0x0644,
                            0x0020,
                            0x0628,
                            0x0627,0x0644,
                            0x0643,0x0631,0x064a,
                            0x0645,
                            0x0020,
                            0x0648,
                            0x0648,0x0627,
                            0x062a,0x0633,
                            0x0627,0x0628
                        )}
                    </div>

                    <div
                        style={{
                            marginTop:
                                5,

                            fontSize:
                                12,

                            color:
                                "#64748b",

                            fontWeight:
                                700
                        }}
                    >
                        {
                            String.fromCodePoint(
                                0x0623,0x0648,0x0644,
                                0x0648,0x064a,0x0629,
                                0x0020,
                                0x0627,0x0644,
                                0x062a,0x062f,0x062e,
                                0x0644
                            )
                        }
                        {priority
                            ? ": " + String(priority)
                            : ""}
                        {recommendedAction
                            ? " | " + String(recommendedAction)
                            : ""}
                    </div>

                </div>

                <div
                    style={{
                        padding:
                            "6px 10px",

                        borderRadius:
                            999,

                        fontSize:
                            12,

                        fontWeight:
                            800,

                        background:
                            connected
                                ? "#dcfce7"
                                : "#fee2e2",

                        color:
                            connected
                                ? "#166534"
                                : "#991b1b"
                    }}
                >
                    {
                        connected
                            ? String.fromCodePoint(
                                0x0645,0x062a,
                                0x0635,0x0644
                            )
                            : String.fromCodePoint(
                                0x063a,0x064a,0x0631,
                                0x0020,
                                0x0645,0x062a,
                                0x0635,0x0644
                            )
                    }
                </div>

            </div>

            <div
                style={{
                    padding:
                        16,

                    display:
                        "grid",

                    gap:
                        10
                }}
            >

                <div
                    style={{
                        fontSize:
                            13,

                        color:
                            "#475569"
                    }}
                >
                    <strong>
                        {String.fromCodePoint(
                            0x0631,0x0642,0x0645,
                            0x0020,
                            0x0648,0x0627,
                            0x062a,0x0633,
                            0x0627,0x0628
                        )}
                    </strong>
                    {": "}
                    {
                        phone ||
                        "-"
                    }
                </div>

                <textarea
                    value={
                        message
                    }
                    onChange={
                        event =>
                            setMessage(
                                event.target.value
                            )
                    }
                    rows={3}
                    placeholder={
                        String.fromCodePoint(
                            0x0627,0x0643,0x062a,
                            0x0628,
                            0x0020,
                            0x0631,0x0633,
                            0x0627,0x0644,0x0629,
                            0x0020,
                            0x0644,0x0644,
                            0x0639,0x0645,0x064a,
                            0x0644
                        )
                    }
                    style={{
                        width:
                            "100%",

                        boxSizing:
                            "border-box",

                        resize:
                            "vertical",

                        border:
                            "1px solid #cbd5e1",

                        borderRadius:
                            12,

                        padding:
                            "11px 13px",

                        fontFamily:
                            "inherit",

                        background:
                            "#fff",

                        direction:
                            "rtl"
                    }}
                />

                <button
                    type="button"
                    disabled={
                        sending ||
                        !connected
                    }
                    onClick={
                        handleSend
                    }
                    style={{
                        width:
                            "fit-content",

                        border:
                            "none",

                        borderRadius:
                            10,

                        padding:
                            "10px 16px",

                        cursor:
                            sending ||
                            !connected
                                ? "default"
                                : "pointer",

                        background:
                            sending ||
                            !connected
                                ? "#94a3b8"
                                : "#16a34a",

                        color:
                            "#fff",

                        fontWeight:
                            800
                    }}
                >
                    {
                        sending
                            ? String.fromCodePoint(
                                0x062c,0x0627,
                                0x0631,0x064a,
                                0x0020,
                                0x0627,0x0644,
                                0x0625,0x0631,
                                0x0633,0x0627,
                                0x0644
                            )
                            : String.fromCodePoint(
                                0x0625,0x0631,
                                0x0633,0x0627,
                                0x0644,
                                0x0020,
                                0x0639,0x0628,
                                0x0631,
                                0x0020,
                                0x0648,0x0627,
                                0x062a,0x0633,
                                0x0627,0x0628
                            )
                    }
                </button>

                {
                    error ? (
                        <div
                            style={{
                                padding:
                                    "8px 10px",

                                borderRadius:
                                    10,

                                background:
                                    "#fef2f2",

                                color:
                                    "#991b1b",

                                fontSize:
                                    12,

                                fontWeight:
                                    700
                            }}
                        >
                            {
                                error
                            }
                        </div>
                    ) : null
                }

                <div
                    style={{
                        borderTop:
                            "1px solid #e2e8f0",

                        paddingTop:
                            12
                    }}
                >

                    <div
                        style={{
                            fontWeight:
                                900,

                            marginBottom:
                                8,

                            color:
                                "#172033"
                        }}
                    >
                        {String.fromCodePoint(
                            0x0633,0x062c,0x0644,
                            0x0020,
                            0x0627,0x0644,
                            0x0645,0x0631,0x0627,
                            0x0633,0x0644,0x0627,
                            0x062a
                        )}
                    </div>

                    {
                        loadingHistory
                            ? (
                                <div
                                    style={{
                                        color:
                                            "#64748b",

                                        fontSize:
                                            12
                                    }}
                                >
                                    ...
                                </div>
                            )
                            : history.length === 0
                                ? (
                                    <div
                                        style={{
                                            color:
                                                "#64748b",

                                            fontSize:
                                                12
                                        }}
                                    >
                                        {String.fromCodePoint(
                                            0x0644,0x0627,
                                            0x062a,0x0648,
                                            0x062c,0x062f,
                                            0x0020,
                                            0x0631,0x0633,
                                            0x0627,0x0626,0x0644
                                        )}
                                    </div>
                                )
                                : (
                                    <div
                                        style={{
                                            display:
                                                "grid",

                                            gap:
                                                7,

                                            maxHeight:
                                                240,

                                            overflowY:
                                                "auto"
                                        }}
                                    >
                                        {
                                            history
                                                .slice(
                                                    0,
                                                    50
                                                )
                                                .map(
                                                    (
                                                        row,
                                                        index
                                                    ) => {

                                                        const incoming =
                                                            String(
                                                                row?.direction ||
                                                                ""
                                                            ).toUpperCase() ===
                                                            "INBOUND";

                                                        const body =
                                                            row?.body_text ||
                                                            row?.bodyText ||
                                                            row?.body ||
                                                            row?.content ||
                                                            "";

                                                        return (
                                                            <div
                                                                key={
                                                                    row?.id ??
                                                                    index
                                                                }
                                                                style={{
                                                                    padding:
                                                                        "8px 10px",

                                                                    border:
                                                                        "1px solid #e2e8f0",

                                                                    borderRadius:
                                                                        10,

                                                                    background:
                                                                        incoming
                                                                            ? "#fff"
                                                                            : "#ecfdf5",

                                                                    direction:
                                                                        "rtl"
                                                                }}
                                                            >

                                                                <div
                                                                    style={{
                                                                        fontSize:
                                                                            11,

                                                                        fontWeight:
                                                                            900,

                                                                        color:
                                                                            incoming
                                                                                ? "#334155"
                                                                                : "#166534"
                                                                    }}
                                                                >
                                                                    {
                                                                        incoming
                                                                            ? String.fromCodePoint(
                                                                                0x0627,0x0644,
                                                                                0x0639,0x0645,
                                                                                0x064a,0x0644
                                                                            )
                                                                            : "PharmaBI"
                                                                    }
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            3,

                                                                        fontSize:
                                                                            12,

                                                                        whiteSpace:
                                                                            "pre-wrap",

                                                                        color:
                                                                            "#1f2937"
                                                                    }}
                                                                >
                                                                    {
                                                                        body
                                                                    }
                                                                </div>

                                                            </div>
                                                        );

                                                    }
                                                )
                                        }
                                    </div>
                                )
                    }

                </div>

            </div>

        </div>
    );
}

`;

    content =
        content.replace(
            modalMarker,
            component +
            modalMarker
        );
}

const index =
    content.indexOf(
        insertionMarker
    );

if (
    !content.includes(
        "<CustomerCrmWhatsAppPanel"
    )
) {

    const panel =
`
                <CustomerCrmWhatsAppPanel
                    customer={
                        customer
                    }
                    customerSource={
                        customerSource
                    }
                    profile={
                        profile
                    }
                    recommendedAction={
                        customer?.recommended_action
                    }
                />

`;

    content =
        content.slice(
            0,
            index
        ) +
        panel +
        content.slice(
            index
        );
}

fs.writeFileSync(
    file,
    content.replace(/\n/g, "\r\n"),
    "utf8"
);

console.log(
    "CUSTOMER CRM WHATSAPP PANEL INSTALLED"
);
