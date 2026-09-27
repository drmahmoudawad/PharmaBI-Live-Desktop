import React, {
    useEffect,
    useMemo,
    useState
} from "react";


function normalizeCustomerDate(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
    ) {

        return "";

    }


    if (
        value instanceof Date
    ) {

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {

            return "";

        }

        const year =
            value.getFullYear();

        const month =
            String(
                value.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                value.getDate()
            ).padStart(
                2,
                "0"
            );

        return (
            `${year}-${month}-${day}`
        );

    }


    const raw =
        String(
            value
        ).trim();


    const exact =
        raw.match(
            /^(\d{4}-\d{2}-\d{2})/
        );


    if (
        exact
    ) {

        return exact[1];

    }


    const parsed =
        new Date(
            raw
        );


    if (
        !Number.isNaN(
            parsed.getTime()
        )
    ) {

        const year =
            parsed.getFullYear();

        const month =
            String(
                parsed.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                parsed.getDate()
            ).padStart(
                2,
                "0"
            );

        return (
            `${year}-${month}-${day}`
        );

    }


    return "";

}




function n(
    value
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


function money(
    value
) {

    return n(
        value
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}


function num(
    value
) {

    return n(
        value
    ).toLocaleString(
        "en-US",
        {
            maximumFractionDigits:
                2
        }
    );

}


function pct(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {

        return "—";

    }

    return `${n(value).toFixed(2)}%`;

}



const RFM_SEGMENT_LABELS = {

    CHAMPIONS:
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0645\u064a\u0632\u0648\u0646",

    LOYAL:
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062e\u0644\u0635\u0648\u0646",

    PROMISING:
        "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0648\u0627\u0639\u062f\u0648\u0646",

    NEW_PROMISING:
        "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f \u0648\u0627\u0639\u062f",

    AT_RISK:
        "\u0639\u0645\u0644\u0627\u0621 \u0645\u0639\u0631\u0636\u0648\u0646 \u0644\u0644\u0641\u0642\u062f",

    NEEDS_ATTENTION:
        "\u0639\u0645\u0644\u0627\u0621 \u064a\u062d\u062a\u0627\u062c\u0648\u0646 \u0627\u0647\u062a\u0645\u0627\u0645",

    HIBERNATING:
        "\u0639\u0645\u0644\u0627\u0621 \u0646\u0627\u0626\u0645\u0648\u0646",

    LOST:
        "\u0639\u0645\u0644\u0627\u0621 \u0645\u0641\u0642\u0648\u062f\u0648\u0646",

    NEW:
        "\u0639\u0645\u0644\u0627\u0621 \u062c\u062f\u062f",

    POTENTIAL_LOYALISTS:
        "\u0639\u0645\u0644\u0627\u0621 \u0645\u062d\u062a\u0645\u0644\u0648\u0646 \u0645\u062e\u0644\u0635\u0648\u0646",

    ABOUT_TO_SLEEP:
        "\u0639\u0645\u0644\u0627\u0621 \u0639\u0644\u0649 \u0648\u0634\u0643 \u0627\u0644\u062e\u0645\u0648\u0644",

    CANNOT_LOSE:
        "\u0639\u0645\u0644\u0627\u0621 \u0644\u0627 \u064a\u0645\u0643\u0646 \u062e\u0633\u0627\u0631\u062a\u0647\u0645"

,
    FREQUENT:
        "\u0639\u0645\u064a\u0644 \u0645\u062a\u0643\u0631\u0631",

    HIGH_VALUE_AT_RISK:
        "\u0639\u0645\u064a\u0644 \u0639\u0627\u0644\u064a \u0627\u0644\u0642\u064a\u0645\u0629 \u0645\u0639\u0631\u0636 \u0644\u0644\u0641\u0642\u062f",

    REGULAR:
        "\u0639\u0645\u064a\u0644 \u0645\u0646\u062a\u0638\u0645",

    DORMANT:
        "\u0639\u0645\u064a\u0644 \u062e\u0627\u0645\u0644",
};

function getRfmSegmentLabel(
    customer
) {

    const rawCode =
        customer?.segmentCode ??
        customer?.segment_code ??
        customer?.segmentName ??
        customer?.segment ??
        customer?.rfm?.segmentCode ??
        customer?.rfm?.segment_code ??
        customer?.rfm?.segmentName ??
        customer?.rfm?.segment ??
        "";

    const code =
        String(
            rawCode
        )
            .trim()
            .toUpperCase();

    if (
        RFM_SEGMENT_LABELS[code]
    ) {
        return RFM_SEGMENT_LABELS[code];
    }

    if (
        code
    ) {
        return code
            .replace(/_/g, " ")
            .replace(
                /\b\w/g,
                c => c.toUpperCase()
            );
    }

    return "-";
}

function text(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined ||
        value ===
            ""
    ) {

        return "-";

    }

    return String(
        value
    );

}


function dateOnly(
    value
) {

    if (
        !value
    ) {

        return "-";

    }

    return String(
        value
    ).slice(
        0,
        10
    );

}


function getCustomerRows(
    result
) {

    return (

        result?.customers ||

        result?.rows ||

        result?.inactiveCustomers ||

        result?.topCustomers ||

        result?.data ||

        []

    );

}


function getCustomerName(
    row
) {

    return (

        row?.customerName ||

        row?.customer_name ||

        row?.name ||

        row?.customerId ||

        row?.customer_id ||

        "-"

    );

}


function getCustomerId(
    row
) {

    return (
        row?.customerId ??
        row?.customer_id ??
        row?.id
    );

}


function getPhone(
    row
) {

    return (

        row?.whatsappPhone ||

        row?.whatsapp_phone ||

        row?.phone ||

        row?.telephone ||

        row?.tel ||

        row?.mobile ||

        "-"

    );

}


function normalizeSegments(
    result
) {

    const raw =
        result?.summary?.segments;


    if (
        Array.isArray(
            raw
        )
    ) {

        return raw;

    }


    if (
        raw &&
        typeof raw ===
            "object"
    ) {

        return Object.entries(
            raw
        ).map(
            (
                [
                    code,
                    value
                ]
            ) => ({

                code,

                name:
                    value?.name ||
                    value?.segment ||
                    code,

                customers:
                    value?.customers ??
                    value?.count ??
                    value?.customerCount ??
                    0,

                netSales:
                    value?.netSales ??
                    value?.sales ??
                    value?.totalSales ??
                    0,

                priority:
                    value?.priority ??
                    "-"

            })
        );

    }


    const customers =
        Array.isArray(
            result?.customers
        )
            ? result.customers
            : [];


    const grouped =
        new Map();


    for (
        const customer
        of customers
    ) {

        const code =
            String(
                customer?.segmentCode ||
                customer?.segment ||
                "UNCLASSIFIED"
            );


        const name =
            customer?.segmentName ||
            customer?.segment ||
            code;


        if (
            !grouped.has(
                code
            )
        ) {

            grouped.set(
                code,
                {
                    code,

                    name,

                    customers:
                        0,

                    netSales:
                        0
                }
            );

        }


        const row =
            grouped.get(
                code
            );


        row.customers +=
            1;


        row.netSales +=
            n(
                customer?.netSales ??
                customer?.monetary
            );

    }


    return Array.from(
        grouped.values()
    );

}


function MetricGrid(
    {
        items = []
    }
) {

    return (

        <div
            className="kpi-grid"
        >

            {
                items.map(
                    (
                        item,
                        index
                    ) => (

                        <div
                            className="kpi-card"
                            key={
                                index
                            }
                        >

                            <span>
                                {
                                    item.label
                                }
                            </span>

                            <strong>
                                {
                                    item.value
                                }
                            </strong>

                            {
                                item.note && (

                                    <small>
                                        {
                                            item.note
                                        }
                                    </small>

                                )
                            }

                        </div>

                    )
                )
            }

        </div>

    );

}


function CustomerTable(
    {
        rows = [],
        onCustomerClick
    }
) {

    return (

        <div
            className="table-card"
        >

            <div
                className="table-wrap"
            >

                <table>

                    <thead>

                        <tr>

                            <th>
                                العميل
                            </th>

                            <th>
                                الهاتف
                            </th>

                            <th>
                                RFM
                            </th>

                            <th>
                                Segment
                            </th>

                            <th>
                                Recency
                            </th>

                            <th>
                                Frequency
                            </th>

                            <th>
                                المبيعات
                            </th>

                            <th>
                                آخر شراء
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {
                            rows.length
                                ? rows.map(
                                    (
                                        row,
                                        index
                                    ) => {

                                        const id =
                                            getCustomerId(
                                                row
                                            );


                                        return (

                                            <tr
                                                key={
                                                    `${id ?? "row"}-${index}`
                                                }
                                            >

                                                <td>

                                                    {
                                                        id &&
                                                        onCustomerClick
                                                            ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onCustomerClick(
                                                                            row
                                                                        )
                                                                    }
                                                                    style={{
                                                                        border:
                                                                            0,

                                                                        background:
                                                                            "transparent",

                                                                        padding:
                                                                            0,

                                                                        cursor:
                                                                            "pointer",

                                                                        textDecoration:
                                                                            "underline",

                                                                        fontWeight:
                                                                            700,

                                                                        fontFamily:
                                                                            "inherit"
                                                                    }}
                                                                >

                                                                    {
                                                                        getCustomerName(
                                                                            row
                                                                        )
                                                                    }

                                                                </button>
                                                            )
                                                            : getCustomerName(
                                                                row
                                                            )
                                                    }

                                                </td>


                                                <td>
                                                    {
                                                        getPhone(
                                                            row
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        text(
                                                            row?.rfmScore ??
                                                            row?.rfm_score ??
                                                            row?.rfmTotal
                                                        )
                                                    }
                                                </td>


                                                <td>
    {
        getRfmSegmentLabel(
            row
        )
    }
</td>


                                                <td>
                                                    {
                                                        num(
                                                            row?.recencyDays ??
                                                            row?.recency
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        num(
                                                            row?.ticketCount ??
                                                            row?.tickets ??
                                                            row?.frequency ??
                                                            row?.invoices
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        money(
                                                            row?.netSales ??
                                                            row?.monetary ??
                                                            row?.sales ??
                                                            row?.total_sales
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        dateOnly(
                                                            row?.lastPurchase ??
                                                            row?.lastPurchaseDate ??
                                                            row?.last_purchase
                                                        )
                                                    }
                                                </td>

                                            </tr>

                                        );

                                    }
                                )
                                : (

                                    <tr>

                                        <td
                                            colSpan={
                                                8
                                            }
                                            style={{
                                                textAlign:
                                                    "center",

                                                padding:
                                                    24
                                            }}
                                        >
                                            لا توجد بيانات
                                        </td>

                                    </tr>

                                )
                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

}




function SegmentCards(
    {
        segments = [],
        selectedCode,
        onSelect
    }
) {

    const labels = {

        CHAMPIONS:
            "\u0639\u0645\u064a\u0644 \u0645\u0647\u0645 \u062c\u062f\u0627\u064b",

        FREQUENT:
            "\u0639\u0645\u0644\u0627\u0621 \u0645\u062a\u0643\u0631\u0631\u0648\u0646",

        HIGH_VALUE_AT_RISK:
            "\u0639\u0645\u064a\u0644 \u0639\u0627\u0644\u064a \u0627\u0644\u0642\u064a\u0645\u0629 \u0645\u0639\u0631\u0636 \u0644\u0644\u0641\u0642\u062f",

        LOYAL:
            "\u0639\u0645\u064a\u0644 \u0645\u0647\u0645",

        REGULAR:
            "\u0639\u0645\u064a\u0644 \u0645\u0646\u062a\u0638\u0645",

        AT_RISK:
            "\u0639\u0645\u064a\u0644 \u0645\u0639\u0631\u0636 \u0644\u0644\u0641\u0642\u062f",

        NEW_PROMISING:
            "\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f",

        DORMANT:
            "\u0639\u0645\u064a\u0644 \u062e\u0627\u0645\u0644"

    };

    return (
        <div
            style={{
                display:
                    "grid",

                gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",

                gap:
                    10,

                marginBottom:
                    18
            }}
        >

            <button
                type="button"
                onClick={() =>
                    onSelect("")
                }
                style={{
                    textAlign:
                        "right",

                    padding:
                        14,

                    borderRadius:
                        12,

                    border:
                        selectedCode === ""
                            ? "2px solid #2563eb"
                            : "1px solid #d7dee8",

                    background:
                        selectedCode === ""
                            ? "#eff6ff"
                            : "#fff",

                    cursor:
                        "pointer",

                    fontFamily:
                        "inherit"
                }}
            >

                <strong>
                    "كل العملاء"
                </strong>

                <div
                    style={{
                        marginTop:
                            6,

                        fontSize:
                            13,

                        opacity:
                            0.7
                    }}
                >
                    "جميع فئات العملاء"
                </div>

            </button>

            {
                segments.map(
                    (
                        segment,
                        index
                    ) => {

                        const code =
                            String(
                                segment?.code ??
                                segment?.segmentCode ??
                                ""
                            )
                                .trim()
                                .toUpperCase();

                        const label =
                            labels[code] ||
                            (
                                segment?.name &&
                                String(
                                    segment.name
                                ).trim() !== "-"
                                    ? String(
                                        segment.name
                                    )
                                    : (
                                        code ||
                                        "-"
                                    )
                            );

                        const selected =
                            String(
                                selectedCode ?? ""
                            ) ===
                            code;

                        return (
                            <button
                                type="button"
                                key={
                                    code +
                                    "-" +
                                    index
                                }
                                onClick={() =>
                                    onSelect(
                                        code
                                    )
                                }
                                style={{
                                    textAlign:
                                        "right",

                                    padding:
                                        14,

                                    borderRadius:
                                        12,

                                    border:
                                        selected
                                            ? "2px solid #2563eb"
                                            : "1px solid #d7dee8",

                                    background:
                                        selected
                                            ? "#eff6ff"
                                            : "#fff",

                                    cursor:
                                        "pointer",

                                    fontFamily:
                                        "inherit"
                                }}
                            >

                                <strong>
                                    {label}
                                </strong>

                                <div
                                    style={{
                                        marginTop:
                                            6,

                                        fontSize:
                                            13,

                                        opacity:
                                            0.7
                                    }}
                                >
                                    {
                                        num(
                                            segment?.customers ??
                                            0
                                        )
                                    }
                                    {" \u0639\u0645\u064a\u0644"}
                                </div>

                            </button>
                        );

                    }
                )
            }

        </div>
    );

}

function GenericTable(
    {
        rows = [],

        onRowClick = null
    }
) {

    if (
        !rows.length
    ) {

        return (

            <div
                className="table-card"
            >

                <div
                    style={{
                        padding:
                            24,

                        textAlign:
                            "center"
                    }}
                >
                    لا توجد بيانات
                </div>

            </div>

        );

    }


    const keys =
        Array.from(
            new Set(
                rows.flatMap(
                    row =>
                        Object.keys(
                            row ||
                            {}
                        )
                )
            )
        )
            .slice(
                0,
                8
            );


    return (

        <div
            className="table-card"
        >

            <div
                className="table-wrap"
            >

                <table>

                    <thead>

                        <tr>

                            {
                                keys.map(
                                    key => (
                                        <th
                                            key={
                                                key
                                            }
                                        >
                                            {
                                                key
                                            }
                                        </th>
                                    )
                                )
                            }

                        </tr>

                    </thead>


                    <tbody>

                        {
                            rows.map(
                                (
                                    row,
                                    index
                                ) => (

                                    <tr
                                        key={
                                            index
                                        }
                                        onClick={() =>
                                            onRowClick &&
                                            onRowClick(
                                                row
                                            )
                                        }
                                        style={{
                                            cursor:
                                                onRowClick
                                                    ? "pointer"
                                                    : "default"
                                        }}
                                    >

                                        {
                                            keys.map(
                                                key => (

                                                    <td
                                                        key={
                                                            key
                                                        }
                                                    >

                                                        {
                                                            typeof row?.[
                                                                key
                                                            ] ===
                                                                "number"
                                                                ? num(
                                                                    row[
                                                                        key
                                                                    ]
                                                                )
                                                                : text(
                                                                    row?.[
                                                                        key
                                                                    ]
                                                                )
                                                        }

                                                    </td>

                                                )
                                            )
                                        }

                                    </tr>

                                )
                            )
                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

}



function getCustomerInterventionPriority(customer) {

    const rfm =
        customer?.rfm ||
        customer?.currentRfm ||
        customer?.rfmData ||
        {};

    const readNumber = (...values) => {

        for (const value of values) {

            const number =
                Number(value);

            if (
                Number.isFinite(number)
            ) {
                return number;
            }

        }

        return 0;
    };

    let r =
        readNumber(
            customer?.r,
            customer?.R,
            customer?.rScore,
            customer?.r_score,
            customer?.recencyScore,
            rfm?.r,
            rfm?.R,
            rfm?.rScore,
            rfm?.r_score
        );

    let f =
        readNumber(
            customer?.f,
            customer?.F,
            customer?.fScore,
            customer?.f_score,
            customer?.frequencyScore,
            rfm?.f,
            rfm?.F,
            rfm?.fScore,
            rfm?.f_score
        );

    let m =
        readNumber(
            customer?.m,
            customer?.M,
            customer?.mScore,
            customer?.m_score,
            customer?.monetaryScore,
            rfm?.m,
            rfm?.M,
            rfm?.mScore,
            rfm?.m_score
        );

    const rfmScore =
        String(
            customer?.rfmScore ||
            customer?.rfm_score ||
            rfm?.rfmScore ||
            rfm?.rfm_score ||
            ""
        ).replace(
            /[^1-5]/g,
            ""
        );

    if (
        (!r || !f || !m) &&
        rfmScore.length >= 3
    ) {

        r =
            r ||
            Number(
                rfmScore.charAt(0)
            );

        f =
            f ||
            Number(
                rfmScore.charAt(1)
            );

        m =
            m ||
            Number(
                rfmScore.charAt(2)
            );

    }

    const recencyDays =
        readNumber(
            customer?.recencyDays,
            customer?.recency_days,
            customer?.daysSinceLastPurchase,
            customer?.days_since_last_purchase,
            rfm?.recencyDays,
            rfm?.recency_days
        );

    if (!r && recencyDays > 0) {

        if (recencyDays > 90) {
            r = 1;
        } else if (recencyDays > 60) {
            r = 2;
        } else if (recencyDays > 30) {
            r = 3;
        } else if (recencyDays > 14) {
            r = 4;
        } else {
            r = 5;
        }

    }

    r =
        Math.min(
            5,
            Math.max(
                1,
                r || 1
            )
        );

    f =
        Math.min(
            5,
            Math.max(
                1,
                f || 1
            )
        );

    m =
        Math.min(
            5,
            Math.max(
                1,
                m || 1
            )
        );

    const text =
        String(
            customer?.segmentCode ||
            customer?.segment_code ||
            customer?.segment ||
            customer?.lifecycleStage ||
            customer?.lifecycle_stage ||
            customer?.recommendedAction ||
            customer?.recommended_action ||
            ""
        ).toLowerCase();

    let priority =
        (6 - r) *
        (
            1 +
            (m * 0.55) +
            (f * 0.45)
        );

    if (
        text.includes("at_risk") ||
        text.includes("at-risk") ||
        text.includes("churn") ||
        text.includes("lost") ||
        text.includes("dormant") ||
        text.includes("reactivation") ||
        text.includes("win_back")
    ) {
        priority += 10;
    }

    if (
        text.includes("retention_vip") ||
        text.includes("retention")
    ) {
        priority += 3;
    }

    return {
        score: priority,
        r,
        f,
        m,
        monetary:
            readNumber(
                customer?.monetary,
                customer?.mon,
                customer?.totalSales,
                customer?.total_sales,
                customer?.total_net_sales,
                customer?.netSales,
                customer?.net_sales
            ),
        frequency:
            readNumber(
                customer?.frequency,
                customer?.freq,
                customer?.ticketCount,
                customer?.ticket_count,
                customer?.totalTickets,
                customer?.total_tickets
            ),
        recencyScore: r
    };
}

export default function CustomerAnalyticsModulePanel(
    {
        moduleId,
        branchId,
        connection,
        fromDate,
        toDate
    }
) {

    const [
        data,
        setData
    ] =
        useState(
            null
        );


    const [
        loading,
        setLoading
    ] =
        useState(
            true
        );


    const [
        error,
        setError
    ] =
        useState(
            ""
        );


    const [
        selectedSegment,
        setSelectedSegment
    ] =
        useState(
            ""
        );


    const [
        search,
        setSearch
    ] =
        useState(
            ""
        );


    const [
        customerProfile,
        setCustomerProfile
    ] =
        useState(
            null
        );

    const customerSortMode =
        "intervention";

    useEffect(
        () => {

            function handleCustomerProfileEscape(event) {

                if (
                    event.key === "Escape" &&
                    customerProfile
                ) {

                    setCustomerProfile(null);

                }

            }

            window.addEventListener(
                "keydown",
                handleCustomerProfileEscape
            );

            return () => {

                window.removeEventListener(
                    "keydown",
                    handleCustomerProfileEscape
                );

            };

        },
        [customerProfile]
    );



    useEffect(
        () => {

            let cancelled =
                false;


            async function loadModule() {


                const safeToDate =
                    normalizeCustomerDate(
                        toDate
                    ) ||
                    normalizeCustomerDate(
                        new Date()
                    );


                const safeFromDate =
                    normalizeCustomerDate(
                        fromDate
                    ) ||
                    safeToDate;


                console.log(
                    "[Customer Module] Dates:",
                    {
                        fromDate: safeFromDate,
toDate: safeToDate,
safeFromDate,
                        safeToDate
                    }
                );



                setLoading(
                    true
                );

                setError(
                    ""
                );

                setData(
                    null
                );

                setSelectedSegment(
                    ""
                );


                try {

                    const customersApi =
                        window
                            ?.pharmaBI
                            ?.customers;


                    const analyticsApi =
                        window
                            ?.pharmaBI
                            ?.analytics;


                    let result =
                        null;


                    
                    /*
                     * RFM + Customer Overview
                     *
                     * IMPORTANT:
                     * Customer Overview must NOT run
                     * the heavy RFM V2 calculation.
                     *
                     * Customer Overview:
                     *     -> analytics.module
                     *
                     * RFM:
                     *     -> RFM V2
                     */

                    if (
                        moduleId ===
                            "customer-rfm" ||
                        moduleId ===
                            "customer-overview"
                    ) {

                        if (
                            moduleId ===
                                "customer-rfm" &&
                            typeof customersApi?.rfmV2 ===
                                "function"
                        ) {

                            result =
                                await customersApi.rfmV2({

                                    branchId,

                                    fromDate:
                                        safeFromDate,

                                    toDate:
                                        safeToDate

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                                "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate:
                                        safeFromDate,

                                    toDate:
                                        safeToDate

                                });

                        }

                    }


/*
                     * Retention
                     */

                    else if (
                        moduleId ===
                            "customer-retention"
                    ) {

                        if (
                            typeof customersApi?.retention ===
                            "function"
                        ) {

                            result =
                                await customersApi.retention({

                                    branchId,

                                    fromDate: safeFromDate,
toDate

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                                "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate: safeFromDate,
toDate

                                });

                        }

                    }


                    /*
                     * Churn / Inactivity
                     */

                    else if (
                        moduleId ===
                            "customer-churn"
                    ) {

                        if (
                            typeof customersApi?.inactivity ===
                            "function"
                        ) {

                            result =
                                await customersApi.inactivity({

                                    branchId,

                                    toDate: safeToDate,
sampleLimit:
                                        300

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                            "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate: safeFromDate,
toDate

                                });

                        }

                    }


                    /*
                     * CLV
                     */

                    else if (
                        moduleId ===
                            "customer-clv"
                    ) {

                        if (
                            typeof customersApi?.clv ===
                            "function"
                        ) {

                            result =
                                await customersApi.clv({

                                    branchId,

                                    fromDate: safeFromDate,
toDate: safeToDate,
observationDays:
                                        365,

                                    limit:
                                        100

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                            "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate: safeFromDate,
toDate

                                });

                        }

                    }


                    /*
                     * Cohort
                     */

                    else if (
                        moduleId ===
                            "customer-cohort"
                    ) {

                        if (
                            typeof customersApi?.cohort ===
                            "function"
                        ) {

                            result =
                                await customersApi.cohort({

                                    branchId,

                                    fromDate: safeFromDate,
toDate: safeToDate,
maxMonths:
                                        24

                                });

                        }


                        if (
                            result ==
                                null &&
                            typeof analyticsApi?.module ===
                            "function"
                        ) {

                            result =
                                await analyticsApi.module({

                                    moduleId,

                                    branchId,

                                    connection,

                                    fromDate: safeFromDate,
toDate

                                });

                        }

                    }


                    if (
                        result ==
                            null ||
                        result ===
                            undefined
                    ) {

                        throw new Error(
                            `لم تصل بيانات من الـAPI للصفحة ${moduleId}.`
                        );

                    }


                    if (
                        result?.success ===
                            false
                    ) {

                        throw new Error(
                            result?.message ||
                            `فشل تحميل ${moduleId}.`
                        );

                    }


                    console.log(
                        "[Customer Module] Loaded:",
                        moduleId,
                        result
                    );


                    if (
                        !cancelled
                    ) {

                        setData(
                            result
                        );

                    }

                }
                catch (
                    requestError
                ) {

                    console.error(
                        "[Customer Module] Load failed:",
                        moduleId,
                        requestError
                    );


                    if (
                        !cancelled
                    ) {

                        setError(
                            requestError?.message ||
                            "تعذر تحميل تحليل العملاء."
                        );

                    }

                }
                finally {

                    if (
                        !cancelled
                    ) {

                        setLoading(
                            false
                        );

                    }

                }

            }


            loadModule();


            return () => {

                cancelled =
                    true;

            };

        },
        [
            moduleId,
            branchId,
            connection,
            fromDate,
            toDate
        ]
    );


    async function openCustomerProfile(
        customer
    ) {

        const customerId =
            getCustomerId(
                customer
            );

        if (
            !customerId ||
            branchId ===
                "all"
        ) {

            return;

        }

        try {

            const safeFromDate =
                normalizeCustomerDate(
                    fromDate
                );

            const safeToDate =
                normalizeCustomerDate(
                    toDate
                );

            if (
                typeof window.pharmaBI?.customers?.customer360 !==
                "function"
            ) {
                throw new Error(
                    "Customer 360 API is unavailable."
                );
            }

            const result =
                await window.pharmaBI.customers.customer360({

                    branchId,

                    customerId,

                    fromDate:
                        safeFromDate,

                    toDate:
                        safeToDate,

                    quick:
                        true
                });

            if (
                result &&
                result.success !== false
            ) {

                setCustomerProfile({
                    ...result,

                    clickedCustomer:
                        customer,

                    customer: {
                        ...(result?.customer || {}),
                        ...(customer || {})
                    },

                    profile: {
                        ...(result?.profile || {}),
                        ...(customer || {})
                    }
                });

            }
            else {

                console.error(
                    "[UI] Customer 360 failed:",
                    result
                );

            }

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer 360 failed:",
                requestError
            );

        }

    }


    const titleMap = {

        "customer-overview":
            "نظرة عامة على العملاء",

        "customer-rfm":
            "تحليل سلوك العملاء",

        "customer-retention":
            "الاحتفاظ بالعملاء",

        "customer-churn":
            "التوقف / عدم النشاط",

        "customer-clv":
            "القيمة العمرية للعميل",

        "customer-cohort":
            "تحليل مجموعات العملاء"

    };


    const title =
        titleMap[
            moduleId
        ] ||
        "تحليل العملاء";


    
const segments =
    useMemo(
        () => {

            const customers =
                Array.isArray(
                    data?.customers
                )
                    ? data.customers
                    : [];

            const grouped =
                new Map();

            for (
                const customer
                of customers
            ) {

                const code =
                    String(
                        customer?.segmentCode ??
                        customer?.segment_code ??
                        customer?.segment ??
                        ""
                    ).trim();

                if (
                    !code
                ) {
                    continue;
                }

                if (
                    !grouped.has(
                        code
                    )
                ) {

                    grouped.set(
                        code,
                        {
                            code,
                            name:
                                getRfmSegmentLabel(
                                    customer
                                ),
                            customers:
                                0,
                            netSales:
                                0
                        }
                    );

                }

                const item =
                    grouped.get(
                        code
                    );

                item.customers += 1;

                item.netSales +=
                    Number(
                        customer?.netSales ??
                        0
                    ) || 0;

            }

            return Array.from(
                grouped.values()
            );

        },
        [
            data
        ]
    );


    const rfmCustomers =
        useMemo(
            () => {

                let rows =
                    Array.isArray(
                        data?.customers
                    )
                        ? [
                            ...data.customers
                        ]
                        : [];


                if (
                    selectedSegment
                ) {

                    rows =
                        rows.filter(
                            customer =>
                                String(
                                    customer?.segmentCode ||
                                    customer?.segment ||
                                    customer?.segmentName ||
                                    ""
                                ) ===
                                String(
                                    selectedSegment
                                )
                        );

                }


                const searchValue =
                    search
                        .trim()
                        .toLowerCase();


                if (
                    searchValue
                ) {

                    rows =
                        rows.filter(
                            customer => {

                                const name =
                                    String(
                                        getCustomerName(
                                            customer
                                        )
                                    )
                                        .toLowerCase();


                                const phone =
                                    String(
                                        getPhone(
                                            customer
                                        )
                                    )
                                        .toLowerCase();


                                const id =
                                    String(
                                        getCustomerId(
                                            customer
                                        ) ??
                                        ""
                                    )
                                        .toLowerCase();


                                return (

                                    name.includes(
                                        searchValue
                                    ) ||

                                    phone.includes(
                                        searchValue
                                    ) ||

                                    id.includes(
                                        searchValue
                                    )

                                );

                            }
                        );

                }


                rows =
                    [
                        ...rows
                    ].sort(
                        (
                            left,
                            right
                        ) => {

                            if (
                                customerSortMode ===
                                "intervention"
                            ) {

                                const a =
                                    getCustomerInterventionPriority(
                                        left
                                    );

                                const b =
                                    getCustomerInterventionPriority(
                                        right
                                    );

                                if (
                                    b.score !==
                                    a.score
                                ) {
                                    return (
                                        b.score -
                                        a.score
                                    );
                                }

                                if (
                                    b.monetary !==
                                    a.monetary
                                ) {
                                    return (
                                        b.monetary -
                                        a.monetary
                                    );
                                }

                                if (
                                    b.frequency !==
                                    a.frequency
                                ) {
                                    return (
                                        b.frequency -
                                        a.frequency
                                    );
                                }

                                return (
                                    b.recencyScore -
                                    a.recencyScore
                                );

                            }

                            return 0;

                        }
                    );

                return rows;

            },
            [
                data,
                selectedSegment,
                search,
                customerSortMode
            ]
        );


    if (
        loading
    ) {

        return (

            <section
                className="page-card loading-card"
            >

                <div
                    className="loading-spinner"
                />

                <h2>
                    جاري تحميل {title}...
                </h2>

            </section>

        );

    }


    if (
        error
    ) {

        return (

            <section
                className="page-card"
            >

                <div
                    className="status error"
                >
                    {
                        error
                    }
                </div>

            </section>

        );

    }


    if (
        !data
    ) {

        return (

            <section
                className="page-card empty-state"
            >

                <h2>
                    {
                        title
                    }
                </h2>

                <p>
                    لا توجد نتيجة.
                </p>

            </section>

        );

    }


    /*
     * =====================================================
     * CUSTOMER OVERVIEW
     * =====================================================
     */

    if (
        moduleId ===
            "customer-overview"
    ) {

        const customers =
            getCustomerRows(
                data
            );


        const totalCustomers =
            data?.summary?.customers ??
            data?.summary?.totalCustomers ??
            customers.length;


        const totalSales =
            data?.summary?.totalSales ??
            data?.summary?.netSales ??
            customers.reduce(
                (
                    sum,
                    row
                ) =>
                    sum +
                    n(
                        row?.netSales ??
                        row?.monetary
                    ),
                0
            );


        const averageMonetary =
            data?.summary?.averageCustomerValue ??
            data?.summary?.averageTicket ??
            0;


        const topCustomers =
            [
                ...customers
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        n(
                            b?.netSales ??
                            b?.monetary ??
                            b?.total_sales
                        ) -
                        n(
                            a?.netSales ??
                            a?.monetary ??
                            a?.total_sales
                        )
                )
                .slice(
                    0,
                    100
                );


        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            نظرة عامة على العملاء
                        </h2>

                        <p>
                            {
                                fromDate
                            }
                            {" → "}
                            {
                                toDate
                            }
                        </p>

                    </div>


                    <div
                        className="period-chip"
                    >
                        الفرع {
                            branchId
                        }
                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "إجمالي العملاء",
                            value:
                                num(
                                    totalCustomers
                                )
                        },

                        {
                            label:
                                "إجمالي مبيعات العملاء",
                            value:
                                money(
                                    totalSales
                                )
                        },

                        {
                            label:
                                "متوسط الإنفاق",
                            value:
                                money(
                                    averageMonetary
                                )
                        },

                        {
                            label:
                                "فئات العملاء",
                            value:
                                num(
                                    segments.length
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        className="result-header"
                    >

                        <strong>
                            أعلى العملاء حسب المبيعات
                        </strong>

                        <span>
                            Top 100
                        </span>

                    </div>


                    <CustomerTable
                        rows={
                            topCustomers
                        }
                        onCustomerClick={
                            openCustomerProfile
                        }
                    />

                </div>


                {
                    customerProfile && (

                        <CustomerProfileModal
                            profile={
                                customerProfile
                            }
                            onClose={() =>
                                setCustomerProfile(
                                    null
                                )
                            }
                        />

                    )
                }

            </section>

        );

    }


    /*
     * =====================================================
     * RFM
     * =====================================================
     */

    if (
        moduleId ===
            "customer-rfm"
    ) {

        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            تحليل سلوك العملاء
                        </h2>

                        <p>
                            اختر فئة RFM لعرض العملاء التابعين لها
                        </p>

                    </div>


                    <div
                        className="period-chip"
                    >
                        الفرع {
                            branchId
                        }
                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "العملاء",
                            value:
                                num(
                                    data?.summary?.customers ??
                                    data?.summary?.totalCustomers ??
                                    data?.customers?.length
                                )
                        },

                        {
                            label:
                                "متوسط حداثة آخر شراء",
                            value:
                                `${num(
                                    data?.summary?.averageRecencyDays
                                )} يوم`
                        },

                        {
                            label:
                                "متوسط تكرار الشراء الشهري",
                            value:
                                num(
                                    data?.summary?.averageMonthlyFrequency
                                )
                        },

                        {
                            label:
                                "متوسط قيمة مشتريات العميل",
                            value:
                                money(
                                    data?.summary?.averageCustomerValue
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        className="result-header"
                    >

                        <strong>
                            فئات العملاء
                        </strong>

                        <span>
                            اضغط على الفئة
                        </span>

                    </div>


                    <SegmentCards
                        segments={
                            segments
                        }
                        selectedCode={
                            selectedSegment
                        }
                        onSelect={
                            setSelectedSegment
                        }
                    />


                    <div
                        style={{
                            display:
                                "flex",

                            justifyContent:
                                "flex-end",

                            marginBottom:
                                12
                        }}
                    >

                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={event =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="بحث باسم العميل أو الهاتف أو الرقم..."
                            style={{
                                width:
                                    "min(420px,100%)",

                                padding:
                                    "10px 12px",

                                border:
                                    "1px solid #d7dee8",

                                borderRadius:
                                    10,

                                fontFamily:
                                    "inherit"
                            }}
                        />

                    </div>


                    <div
                        style={{
                            marginBottom:
                                12,

                            fontWeight:
                                700
                        }}
                    >

                        {
                            selectedSegment
                                ? "العملاء داخل الفئة المختارة: "
                                : "كل العملاء: "
                        }

                        {
                            num(
                                rfmCustomers.length
                            )
                        }

                    </div>


                    <CustomerTable
                        rows={
                            rfmCustomers
                        }
                        onCustomerClick={
                            openCustomerProfile
                        }
                    />

                </div>


                {
                    customerProfile && (

                        <CustomerProfileModal
                            profile={
                                customerProfile
                            }
                            onClose={() =>
                                setCustomerProfile(
                                    null
                                )
                            }
                        />

                    )
                }

            </section>

        );

    }


    /*
     * =====================================================
     * RETENTION
     * =====================================================
     */

    if (
        moduleId ===
            "customer-retention"
    ) {

        const retention =
            data?.retention ||
            {};


        const lifecycle =
            data?.lifecycle ||
            {};


        const current =
            data?.current ||
            {};


        const movement =
            data?.movement ||
            {};


        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            الاحتفاظ بالعملاء
                        </h2>

                        <p>
                            هل العملاء يعودون للشراء؟
                        </p>

                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "Retention Rate",
                            value:
                                pct(
                                    retention.retentionRate
                                )
                        },

                        {
                            label:
                                "العملاء السابقون",
                            value:
                                num(
                                    retention.previousCustomers
                                )
                        },

                        {
                            label:
                                "المحتفظ بهم",
                            value:
                                num(
                                    retention.retainedCustomers
                                )
                        },

                        {
                            label:
                                "المفقودون",
                            value:
                                num(
                                    retention.lostCustomers
                                )
                        },

                        {
                            label:
                                "العملاء الجدد",
                            value:
                                num(
                                    lifecycle.newCustomers
                                )
                        },

                        {
                            label:
                                "العملاء الحاليون",
                            value:
                                num(
                                    current.customers
                                )
                        },

                        {
                            label:
                                "تغير العملاء",
                            value:
                                num(
                                    movement.customerChange
                                )
                        },

                        {
                            label:
                                "Retention Loss",
                            value:
                                pct(
                                    retention.retentionLossRate
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        style={{
                            padding:
                                20,

                            lineHeight:
                                1.9
                        }}
                    >

                        تم الاحتفاظ بـ{" "}
                        {
                            num(
                                retention.retainedCustomers
                            )
                        }
                        {" "}عميل من أصل{" "}
                        {
                            num(
                                retention.previousCustomers
                            )
                        }
                        {" "}عميل سابق.

                        {" "}

                        عدد العملاء المفقودين{" "}
                        {
                            num(
                                retention.lostCustomers
                            )
                        }
                        .

                    </div>

                </div>

            </section>

        );

    }


    /*
     * =====================================================
     * CHURN
     * =====================================================
     */

    if (
        moduleId ===
            "customer-churn"
    ) {

        const summary =
            data?.summary ||
            {};


        const inactive90 =
            Array.isArray(
                data?.samples?.inactive90
            )
                ? data.samples.inactive90
                : [];


        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            التوقف / عدم النشاط
                        </h2>

                        <p>
                            العملاء الذين ابتعدوا عن الشراء
                        </p>

                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "العملاء المسجلون",
                            value:
                                num(
                                    summary.knownCustomers
                                )
                        },

                        {
                            label:
                                "نشط ≤ 30 يوم",
                            value:
                                num(
                                    summary.activeWithin30Days
                                )
                        },

                        {
                            label:
                                "غير نشط ≥ 30 يوم",
                            value:
                                num(
                                    summary.inactive30DaysOrMore
                                )
                        },

                        {
                            label:
                                "غير نشط ≥ 60 يوم",
                            value:
                                num(
                                    summary.inactive60DaysOrMore
                                )
                        },

                        {
                            label:
                                "غير نشط ≥ 90 يوم",
                            value:
                                num(
                                    summary.inactive90DaysOrMore
                                )
                        },

                        {
                            label:
                                "Inactivity 30d",
                            value:
                                pct(
                                    summary.inactivityRate30Days
                                )
                        },

                        {
                            label:
                                "Inactivity 60d",
                            value:
                                pct(
                                    summary.inactivityRate60Days
                                )
                        },

                        {
                            label:
                                "Inactivity 90d",
                            value:
                                pct(
                                    summary.inactivityRate90Days
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        className="result-header"
                    >

                        <strong>
                            العملاء غير النشطين 90+ يوم
                        </strong>

                        <span>
                            {
                                num(
                                    inactive90.length
                                )
                            }
                        </span>

                    </div>


                    <GenericTable
                        rows={
                            inactive90
                        }
                    />

                </div>

            </section>

        );

    }


    /*
     * =====================================================
     * CLV
     * =====================================================
     */

    if (
        moduleId ===
            "customer-clv"
    ) {

        const rows =
            getCustomerRows(
                data
            );


        const summary =
            data?.summary ||
            {};


        const sorted =
            [
                ...rows
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        n(
                            b?.clv ??
                            b?.customerLifetimeValue ??
                            b?.predictedClv ??
                            b?.lifetimeValue ??
                            b?.value
                        ) -
                        n(
                            a?.clv ??
                            a?.customerLifetimeValue ??
                            a?.predictedClv ??
                            a?.lifetimeValue ??
                            a?.value
                        )
                )
                .slice(
                    0,
                    100
                );


        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            القيمة العمرية للعميل
                        </h2>

                        <p>
                            ترتيب العملاء حسب قيمة العميل
                        </p>

                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "العملاء",
                            value:
                                num(
                                    summary?.customers ??
                                    rows.length
                                )
                        },

                        {
                            label:
                                "متوسط CLV",
                            value:
                                money(
                                    summary?.averageClv ??
                                    summary?.avgClv ??
                                    0
                                )
                        },

                        {
                            label:
                                "عدد العملاء الظاهرين",
                            value:
                                num(
                                    sorted.length
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        className="result-header"
                    >

                        <strong>
                            أعلى العملاء قيمة
                        </strong>

                    </div>


                    <GenericTable
                        rows={
                            sorted
                        }
                    />

                </div>

            </section>

        );

    }


    /*
     * =====================================================
     * COHORT
     * =====================================================
     */

    if (
        moduleId ===
            "customer-cohort"
    ) {

        const rows =
            Array.isArray(
                data?.cohorts
            )
                ? data.cohorts
                : (
                    Array.isArray(
                        data?.rows
                    )
                        ? data.rows
                        : (
                            Array.isArray(
                                data?.matrix
                            )
                                ? data.matrix
                                : []
                        )
                );


        return (

            <section
                className="page-card"
            >

                <div
                    className="page-header"
                >

                    <div>

                        <div
                            className="page-eyebrow"
                        >
                            Customers
                        </div>

                        <h2>
                            تحليل مجموعات العملاء
                        </h2>

                        <p>
                            متابعة كل مجموعة حسب شهر أول شراء
                        </p>

                    </div>

                </div>


                <MetricGrid
                    items={[
                        {
                            label:
                                "عدد المجموعات",
                            value:
                                num(
                                    rows.length
                                )
                        },

                        {
                            label:
                                "أكبر مجموعة",
                            value:
                                num(
                                    Math.max(
                                        0,
                                        ...rows.map(
                                            row =>
                                                n(
                                                    row?.customers ??
                                                    row?.customerCount ??
                                                    row?.size ??
                                                    row?.cohortSize
                                                )
                                        )
                                    )
                                )
                        }

                    ]}
                />


                <div
                    className="sales-result"
                    style={{
                        marginTop:
                            18
                    }}
                >

                    <div
                        className="result-header"
                    >

                        <strong>
                            Cohort Analysis
                        </strong>

                        <span>
                            الاحتفاظ بالمجموعة مع مرور الوقت
                        </span>

                    </div>


                    <GenericTable
                        rows={
                            rows
                        }
                    />

                </div>

            </section>

        );

    }


    return null;

}



function CustomerRfmVisual({
    R,
    F,
    M,
    score
}) {
    const items = [
        {
            key: "R",
            label: String.fromCodePoint(
                0x0627,0x0644,0x062d,
                0x062f,0x0627,0x062b,0x0629
            ),
            value: R
        },
        {
            key: "F",
            label: String.fromCodePoint(
                0x0627,0x0644,
                0x062a,0x0643,0x0631,
                0x0627,0x0631
            ),
            value: F
        },
        {
            key: "M",
            label: String.fromCodePoint(
                0x0627,0x0644,0x0642,
                0x064a,0x0645,0x0629,
                0x0020,
                0x0627,0x0644,
                0x0634,0x0631,0x0627,
                0x0626,0x064a,0x0629
            ),
            value: M
        }
    ];

    return (
        <Box sx={{ mt: 2 }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    gap: 1.5
                }}
            >
                {items.map((item) => (
                    <Box
                        key={item.key}
                        sx={{
                            border:
                                "1px solid rgba(167,139,250,.22)",
                            borderRadius: 3,
                            p: 1.5,
                            textAlign: "center",
                            background:
                                "rgba(167,139,250,.06)"
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                fontWeight: 800,
                                opacity: .75
                            }}
                        >
                            {item.key}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                mt: .5,
                                fontWeight: 800
                            }}
                        >
                            {item.label}
                        </Typography>

                        <Typography
                            variant="h5"
                            sx={{
                                mt: .5,
                                fontWeight: 900
                            }}
                        >
                            {item.value ?? "-"}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box
                sx={{
                    mt: 1.5,
                    p: 1.5,
                    borderRadius: 3,
                    textAlign: "center",
                    background:
                        "rgba(255,255,255,.04)",
                    border:
                        "1px solid rgba(255,255,255,.08)"
                }}
            >
                <Typography
                    variant="caption"
                    sx={{ fontWeight: 800 }}
                >
                    RFM
                </Typography>

                <Typography
                    variant="h5"
                    sx={{
                        mt: .25,
                        fontWeight: 950,
                        letterSpacing: 2
                    }}
                >
                    {score ?? "-"}
                </Typography>
            </Box>
        </Box>
    );
}

function CustomerInvoiceDetailsPopup({
    details,
    loading,
    onClose
}) {

    const header =
        details?.header ||
        {};

    const lines =
        Array.isArray(
            details?.lines
        )
            ? details.lines
            : [];

    const totals =
        details?.totals ||
        {};

    const cp =
        (...codes) =>
            String.fromCodePoint(
                ...codes
            );

    const money =
        value =>
            Number(
                value ?? 0
            ).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits:
                        2,
                    maximumFractionDigits:
                        2
                }
            );

    const formatDate =
        value => {

            if (!value) {
                return "-";
            }

            const d =
                new Date(
                    value
                );

            return Number.isFinite(
                d.getTime()
            )
                ? d.toLocaleString(
                    "en-GB"
                )
                : String(
                    value
                );
        };

    const title =
        cp(
            0x062a,0x0641,0x0627,0x0635,0x064a,0x0644,
            0x0020,
            0x0627,0x0644,0x0641,0x0627,0x062a,0x0648,0x0631,0x0629
        );

    const itemsTitle =
        cp(
            0x0623,0x0635,0x0646,0x0627,0x0641,
            0x0020,
            0x0627,0x0644,0x0641,0x0627,0x062a,0x0648,0x0631,0x0629
        );

    return (
        <div
            style={{
                position:
                    "fixed",
                inset:
                    0,
                zIndex:
                    30000,
                background:
                    "rgba(15,23,42,.45)",
                display:
                    "flex",
                alignItems:
                    "center",
                justifyContent:
                    "center",
                padding:
                    20
            }}
        >

            <div
                style={{
                    width:
                        "min(1150px,96vw)",
                    maxHeight:
                        "90vh",
                    overflow:
                        "auto",
                    background:
                        "#fff",
                    borderRadius:
                        18,
                    boxShadow:
                        "0 30px 90px rgba(0,0,0,.28)"
                }}
            >

                <div
                    style={{
                        position:
                            "sticky",
                        top:
                            0,
                        zIndex:
                            5,
                        background:
                            "#fff",
                        padding:
                            "18px 22px",
                        borderBottom:
                            "1px solid #e5e7eb",
                        display:
                            "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "space-between"
                    }}
                >

                    <div>

                        <div
                            style={{
                                fontSize:
                                    20,
                                fontWeight:
                                    900,
                                color:
                                    "#172033"
                            }}
                        >
                            {
                                title
                            }
                        </div>

                        <div
                            style={{
                                marginTop:
                                    5,
                                color:
                                    "#64748b",
                                fontSize:
                                    13,
                                fontWeight:
                                    700
                            }}
                        >
                            {
                                header?.customerName ||
                                "-"
                            }
                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        style={{
                            border:
                                0,
                            background:
                                "#f1f5f9",
                            color:
                                "#334155",
                            borderRadius:
                                10,
                            padding:
                                "9px 14px",
                            cursor:
                                "pointer",
                            fontWeight:
                                800
                        }}
                    >
                        X
                    </button>

                </div>

                {
                    loading ? (

                        <div
                            style={{
                                padding:
                                    60,
                                textAlign:
                                    "center",
                                fontWeight:
                                    800
                            }}
                        >
                            {
                                cp(
                                    0x062c,0x0627,0x0631,0x064a,
                                    0x0020,
                                    0x062a,0x062d,0x0645,0x064a,0x0644,
                                    0x0020,
                                    0x062a,0x0641,0x0627,0x0635,0x064a,0x0644,
                                    0x0020,
                                    0x0627,0x0644,0x0641,0x0627,0x062a,0x0648,0x0631,0x0629
                                )
                            }
                        </div>

                    ) : (

                        <div
                            style={{
                                padding:
                                    22
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit,minmax(170px,1fr))",
                                    gap:
                                        12,
                                    marginBottom:
                                        20
                                }}
                            >

                                {
                                    [
                                        [
                                            cp(
                                                0x0631,0x0642,0x0645,
                                                0x0020,
                                                0x0627,0x0644,0x0641,0x0627,0x062a,0x0648,0x0631,0x0629
                                            ),
                                            header?.invoiceCode ||
                                            header?.invoiceNumber ||
                                            header?.ticketId ||
                                            "-"
                                        ],
                                        [
                                            cp(
                                                0x0627,0x0644,0x0639,0x0645,0x064a,0x0644
                                            ),
                                            header?.customerName ||
                                            "-"
                                        ],
                                        [
                                            cp(
                                                0x0627,0x0644,0x0628,0x0627,0x0626,0x0639
                                            ),
                                            header?.sellerName ||
                                            "-"
                                        ],
                                        [
                                            cp(
                                                0x0627,0x0644,0x062a,0x0627,0x0631,0x064a,0x062e
                                            ),
                                            formatDate(
                                                header?.invoiceDate ||
                                                header?.date ||
                                                header?.ztime
                                            )
                                        ],
                                        [
                                            cp(
                                                0x0627,0x0644,0x0625,0x062c,0x0645,0x0627,0x0644,0x064a
                                            ),
                                            money(
                                                header?.total ??
                                                header?.invoiceTotal ??
                                                totals?.total
                                            )
                                        ],
                                        [
                                            cp(
                                                0x0627,0x0644,0x062e,0x0635,0x0645
                                            ),
                                            money(
                                                header?.discount
                                            )
                                        ]
                                    ].map(
                                        item => (
                                            <div
                                                key={
                                                    item[0]
                                                }
                                                style={{
                                                    background:
                                                        "#f8fafc",
                                                    border:
                                                        "1px solid #e2e8f0",
                                                    borderRadius:
                                                        12,
                                                    padding:
                                                        14
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        fontSize:
                                                            12,
                                                        color:
                                                            "#64748b",
                                                        marginBottom:
                                                            5,
                                                        fontWeight:
                                                            700
                                                    }}
                                                >
                                                    {
                                                        item[0]
                                                    }
                                                </div>

                                                <div
                                                    style={{
                                                        fontWeight:
                                                            900
                                                    }}
                                                >
                                                    {
                                                        item[1]
                                                    }
                                                </div>

                                            </div>
                                        )
                                    )
                                }

                            </div>

                            <div
                                style={{
                                    border:
                                        "1px solid #e2e8f0",
                                    borderRadius:
                                        14,
                                    overflow:
                                        "hidden"
                                }}
                            >

                                <div
                                    style={{
                                        padding:
                                            14,
                                        fontWeight:
                                            900,
                                        background:
                                            "#f8fafc",
                                        borderBottom:
                                            "1px solid #e2e8f0"
                                    }}
                                >
                                    {
                                        itemsTitle
                                    }
                                </div>

                                <div
                                    style={{
                                        overflowX:
                                            "auto"
                                    }}
                                >

                                    <table
                                        style={{
                                            width:
                                                "100%",
                                            borderCollapse:
                                                "collapse",
                                            direction:
                                                "rtl"
                                        }}
                                    >

                                        <thead>

                                            <tr>

                                                {
                                                    [
                                                        cp(
                                                            0x0627,0x0644,0x0635,0x0646,0x0641
                                                        ),
                                                        cp(
                                                            0x0627,0x0644,0x0643,0x0645,0x064a,0x0629
                                                        ),
                                                        cp(
                                                            0x0633,0x0639,0x0631,
                                                            0x0020,
                                                            0x0627,0x0644,0x0648,0x062d,0x062f,0x0629
                                                        ),
                                                        cp(
                                                            0x0627,0x0644,0x062e,0x0635,0x0645
                                                        ),
                                                        cp(
                                                            0x0627,0x0644,0x0635,0x0627,0x0641,0x064a
                                                        ),
                                                        cp(
                                                            0x0627,0x0644,0x062a,0x0643,0x0644,0x0641,0x0629
                                                        )
                                                    ].map(
                                                        label => (
                                                            <th
                                                                key={
                                                                    label
                                                                }
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                    padding:
                                                                        11,
                                                                    background:
                                                                        "#f8fafc",
                                                                    borderBottom:
                                                                        "1px solid #e2e8f0"
                                                                }}
                                                            >
                                                                {
                                                                    label
                                                                }
                                                            </th>
                                                        )
                                                    )
                                                }

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {
                                                lines.map(
                                                    (
                                                        line,
                                                        index
                                                    ) => (

                                                        <tr
                                                            key={
                                                                line?.lineId ||
                                                                index
                                                            }
                                                        >

                                                            <td
                                                                dir="rtl"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right"
                                                                }}
                                                            >
                                                                {
                                                                    line?.itemName ||
                                                                    line?.item_name ||
                                                                    "-"
                                                                }
                                                            </td>

                                                            <td
                                                                dir="ltr"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right",
                                                                    whiteSpace:
                                                                        "nowrap"
                                                                }}
                                                            >
                                                                {
                                                                    line?.baseUnits ??
                                                                    line?.quantity ??
                                                                    line?.units ??
                                                                    "-"
                                                                }
                                                            </td>

                                                            <td
                                                                dir="ltr"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right",
                                                                    whiteSpace:
                                                                        "nowrap"
                                                                }}
                                                            >
                                                                {
                                                                    money(
                                                                        line?.unitPrice ??
                                                                        line?.salesPrice
                                                                    )
                                                                }
                                                            </td>

                                                            <td
                                                                dir="ltr"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right",
                                                                    whiteSpace:
                                                                        "nowrap"
                                                                }}
                                                            >
                                                                {
                                                                    money(
                                                                        Number(
                                                                            line?.discount ||
                                                                            0
                                                                        ) +
                                                                        Number(
                                                                            line?.extraDiscount ||
                                                                            0
                                                                        )
                                                                    )
                                                                }
                                                            </td>

                                                            <td
                                                                dir="ltr"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right",
                                                                    whiteSpace:
                                                                        "nowrap"
                                                                }}
                                                            >
                                                                {
                                                                    money(
                                                                        line?.netLineValue ??
                                                                        line?.netSales ??
                                                                        0
                                                                    )
                                                                }
                                                            </td>

                                                            <td
                                                                dir="ltr"
                                                                style={{
                                                                    padding:
                                                                        11,
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    textAlign:
                                                                        "right",
                                                                    whiteSpace:
                                                                        "nowrap"
                                                                }}
                                                            >
                                                                {
                                                                    money(
                                                                        line?.lineCost ??
                                                                        line?.costPrice ??
                                                                        0
                                                                    )
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

        </div>
    );
}


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



function CustomerProfileModal(
    {
        profile,
        onClose
    }
) {

    
        
      
      const arabicRfmLabel = (value) => {
          const key =
              String(value ?? "")
                  .trim()
                  .toUpperCase();

          const labels = {
              CHAMPIONS:
                  String.fromCodePoint(
                      0x0627,0x0644,0x0623,0x0628,
                      0x0637,0x0627,0x0644
                  ),

              AT_RISK:
                  String.fromCodePoint(
                      0x0645,0x0639,0x0631,0x0636,
                      0x0020,
                      0x0644,0x0644,0x062e,
                      0x0637,0x0631
                  ),

              RETENTION_VIP:
                  String.fromCodePoint(
                      0x0627,0x0644,0x0627,0x062d,
                      0x062a,0x0641,0x0627,0x0638,
                      0x0020,
                      0x0628,0x0627,0x0644,
                      0x0639,0x0645,0x0644,
                      0x0627,0x0621,
                      0x0020,
                      0x0627,0x0644,
                      0x0645,0x0645,0x064a,
                      0x0632,0x064a,0x0646
                  )
          };

          return labels[key] ?? value ?? "";
      };


      const arabicCustomerAction = (value) => {
          const key =
              String(value ?? "")
                  .trim()
                  .toUpperCase();

          if (key === "RETENTION_VIP") {
              return String.fromCodePoint(
                  0x0627,0x0644,0x0627,0x062d,
                  0x062a,0x0641,0x0627,0x0638,
                  0x0020,
                  0x0628,0x0627,0x0644,
                  0x0639,0x0645,0x0644,
                  0x0627,0x0621,
                  0x0020,
                  0x0627,0x0644,
                  0x0645,0x0645,0x064a,
                  0x0632,0x064a,0x064a,
                  0x0646
              );
          }

          return value ?? "";
      };

const [


    customerInvoiceDetailsState,


    setCustomerInvoiceDetailsState


] = useState(null);





const [


    customerInvoiceLoading,


    setCustomerInvoiceLoading


] = useState(false);





const customerSource =
          profile?.clickedCustomer ||
          profile?.customer ||
          profile?.profile ||
          profile?.customerData ||
          profile?.data ||
          profile ||
          {};

      const summarySource =
          profile?.summary ||
          customerSource?.summary ||
          {};

      const firstNonEmpty = (...values) => {
          for (const value of values) {
              if (
                  value !== undefined &&
                  value !== null &&
                  String(value).trim() !== ""
              ) {
                  return value;
              }
          }
          return "";
      };

      const lifecycleLabels = {
          NEW: "عميل جديد",
          ACTIVE: "نشط",
          GROWING: "ينمو",
          STABLE: "مستقر",
          AT_RISK: "معرض للفقد",
          DECLINING: "متراجع",
          DORMANT: "خامل",
          LOST: "متوقف",
          REACTIVATED: "عاد للشراء"
      };

      const actionLabels = {
          RETENTION_VIP: "الحفاظ على العميل المهم",
          RETENTION: "الحفاظ على العميل",
          WIN_BACK: "إعادة تنشيط العميل",
          REACTIVATION: "إعادة تنشيط العميل",
          NURTURE: "تنمية العلاقة مع العميل",
          MONITOR: "متابعة العميل",
          CROSS_SELL: "زيادة المنتجات في السلة",
          UPSELL: "رفع قيمة المشتريات"
      };

      const lifecycleCode =
          String(
              firstNonEmpty(
                  customerSource?.lifecycleStage,
                  customerSource?.lifecycle_stage,
                  profile?.lifecycleStage,
                  profile?.lifecycle_stage,
                  summarySource?.lifecycleStage
              )
          )
              .trim()
              .toUpperCase();

      const actionCode =
          String(
              firstNonEmpty(
                  customerSource?.recommendedAction,
                  customerSource?.recommended_action,
                  profile?.recommendedAction,
                  profile?.recommended_action,
                  summarySource?.recommendedAction
              )
          )
              .trim()
              .toUpperCase();

      const customer = {
          ...customerSource,

          customer_name:
              firstNonEmpty(
                  customerSource?.customerName,
                  customerSource?.customer_name,
                  customerSource?.name,
                  profile?.customerName,
                  profile?.customer_name,
                  summarySource?.customerName,
                  summarySource?.customer_name
              ) || "غير مسجل",

          customerName:
              firstNonEmpty(
                  customerSource?.customerName,
                  customerSource?.customer_name,
                  customerSource?.name,
                  profile?.customerName,
                  profile?.customer_name,
                  summarySource?.customerName,
                  summarySource?.customer_name
              ) || "غير مسجل",

          customer_code:
              firstNonEmpty(
                  customerSource?.customerId,
                  customerSource?.customer_id,
                  customerSource?.customerCode,
                  customerSource?.customer_code,
                  profile?.customerId,
                  profile?.customer_id
              ) || "-",

          phone_numbers:
              firstNonEmpty(
                  customerSource?.whatsappPhone,
                  customerSource?.whatsappPhoneNormalized,
                  customerSource?.phone_numbers,
                  customerSource?.phone,
                  profile?.whatsappPhone,
                  profile?.whatsappPhoneNormalized
              ),

          invoices:
              Number(
                  firstNonEmpty(
                      customerSource?.ticketCount,
                      customerSource?.invoices,
                      customerSource?.invoiceCount,
                      profile?.ticketCount,
                      profile?.invoices,
                      summarySource?.ticketCount,
                      summarySource?.invoices,
                      0
                  )
              ) || 0,

          total_sales:
              Number(
                  firstNonEmpty(
                      customerSource?.netSales,
                      customerSource?.total_sales,
                      customerSource?.sales,
                      profile?.netSales,
                      profile?.totalSales,
                      summarySource?.netSales,
                      0
                  )
              ) || 0,

          average_invoice:
              Number(
                  firstNonEmpty(
                      customerSource?.averageTicketValue,
                      customerSource?.average_invoice,
                      profile?.averageTicketValue,
                      summarySource?.averageTicketValue,
                      0
                  )
              ) || 0,

          last_purchase:
              firstNonEmpty(
                  customerSource?.lastPurchaseDate,
                  customerSource?.last_purchase,
                  profile?.lastPurchaseDate,
                  summarySource?.lastPurchaseDate
              ) || "-",

          first_purchase:
              firstNonEmpty(
                  customerSource?.firstPurchaseDate,
                  customerSource?.first_purchase,
                  profile?.firstPurchaseDate,
                  summarySource?.firstPurchaseDate
              ) || "-",

          segment:
              getRfmSegmentLabel(
                  customerSource?.segmentCode ||
                  customerSource?.segment_code
                      ? customerSource
                      : profile
              ),

          crm_status:
              lifecycleLabels[lifecycleCode] ||
              lifecycleCode ||
              "-",

          recommended_action:
              actionLabels[actionCode] ||
              actionCode ||
              "-"
      };

      const rfm =
            profile?.currentRfm ||
            profile?.rfm ||
            rawCustomer?.currentRfm ||
            rawCustomer?.rfm ||
            profile ||
            {};


    const behavior =
        profile?.behavior ||
        {};

    const salesSummary =
        profile?.sales?.periodSummary ||
        {};

    const invoices =
        Array.isArray(
            profile?.sales?.recentInvoices
        )
            ? profile.sales.recentInvoices
            : (
                Array.isArray(
                    profile?.invoices
                )
                    ? profile.invoices
                    : []
            );

    const openCustomerInvoiceFromProfile =


        async invoice => {


    


            const selectedBranchId =


                Number(


                    profile?.branchId ??


                    profile?.branch_id ??


                    customerSource?.branchId ??


                    customerSource?.branch_id


                );


    


            const ticketId =


                invoice?.ticketId ??


                invoice?.ticket_id ??


                invoice?.id;


    


            if (


                !ticketId ||


                !Number.isFinite(


                    selectedBranchId


                )


            ) {


                return;


            }


    


            try {


    


                setCustomerInvoiceLoading(


                    true


                );


    


                setCustomerInvoiceDetailsState(


                    null


                );


    


                const result =


                    await window.pharmaBI.dashboard.overview({


                        action:


                            "customer-invoice-details",


    


                        branchId:


                            selectedBranchId,


    


                        ticketId,


    


                        connection:


                            null


                    });


    


                setCustomerInvoiceDetailsState(


                    result || null


                );


    


            }


            catch (error) {


    


                console.error(


                    "Customer invoice details error:",


                    error


                );


    


            }


            finally {


    


                setCustomerInvoiceLoading(


                    false


                );


    


            }


    


        };


    


    const address =
        customer?.full_address ||
        customer?.address ||
        [
            customer?.street_name,
            customer?.area_name
        ]
            .filter(Boolean)
            .join(" - ") ||
        "غير مسجل";

    const phone =
        customer?.whatsapp_phone ||
        customer?.phone_numbers ||
        customer?.phone ||
        customer?.mobile ||
        "غير مسجل";

    const classification =
        rfm?.segmentCode ||
        customer?.segment_code ||
        rfm?.lifecycleStage ||
        customer?.lifecycle_stage ||
        "غير مصنف";

    const recommendedAction =
        rfm?.recommendedAction ||
        customer?.recommended_action ||
        "لا يوجد تصرف مقترح مسجل";

    
    
    const employeeBehaviorText = (() => {
        const R =
            Number(
                rfm?.R ??
                rfm?.r ??
                customerSource?.R ??
                customerSource?.r ??
                customerSource?.rScore ??
                0
            );

        const F =
            Number(
                rfm?.F ??
                rfm?.f ??
                customerSource?.F ??
                customerSource?.f ??
                customerSource?.fScore ??
                0
            );

        const M =
            Number(
                rfm?.M ??
                rfm?.m ??
                customerSource?.M ??
                customerSource?.m ??
                customerSource?.mScore ??
                0
            );

        const cp = String.fromCodePoint;

        if (R >= 4 && F >= 4 && M >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0639,0x0627,0x0644,0x064a,
                0x0020,
                0x0627,0x0644,0x0642,0x064a,0x0645,0x0629,
                0x0020,
                0x0648,0x0645,0x062a,0x0643,0x0631,0x0631,
                0x0020,
                0x0627,0x0644,0x0634,0x0631,0x0627,0x0621
            );
        }

        if (R <= 2 && F >= 4 && M >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0639,0x0627,0x0644,0x064a,
                0x0020,
                0x0627,0x0644,0x0642,0x064a,0x0645,0x0629,
                0x0020,
                0x0648,0x0645,0x0639,0x0631,0x0636,
                0x0020,
                0x0644,0x0644,0x0641,0x0642,0x062f
            );
        }

        if (R >= 4 && F >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0646,0x0634,0x0637,
                0x0020,
                0x0648,0x0645,0x062a,0x0643,0x0631,0x0631,
                0x0020,
                0x0627,0x0644,0x0634,0x0631,0x0627,0x0621
            );
        }

        if (R >= 4 && M >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0639,0x0627,0x0644,0x064a,
                0x0020,
                0x0627,0x0644,0x0642,0x064a,0x0645,0x0629,
                0x0020,
                0x0648,0x062d,0x062f,0x064a,0x062b,
                0x0020,
                0x0627,0x0644,0x0634,0x0631,0x0627,0x0621
            );
        }

        if (R <= 2) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0645,0x0639,0x0631,0x0636,
                0x0020,
                0x0644,0x0644,0x0641,0x0642,0x062f,
                0x0020,
                0x0648,0x064a,0x062d,0x062a,0x0627,0x062c,
                0x0020,
                0x0645,0x062a,0x0627,0x0628,0x0639,0x0629
            );
        }

        if (F >= 4 && M >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0639,0x0627,0x0644,0x064a,
                0x0020,
                0x0627,0x0644,0x0642,0x064a,0x0645,0x0629,
                0x0020,
                0x0648,0x0645,0x062a,0x0643,0x0631,0x0631,
                0x0020,
                0x0627,0x0644,0x0634,0x0631,0x0627,0x0621
            );
        }

        if (M >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0639,0x0627,0x0644,0x064a,
                0x0020,
                0x0627,0x0644,0x0642,0x064a,0x0645,0x0629
            );
        }

        if (F >= 4) {
            return cp(
                0x0639,0x0645,0x064a,0x0644,
                0x0020,
                0x0645,0x062a,0x0643,0x0631,0x0631,
                0x0020,
                0x0627,0x0644,0x0634,0x0631,0x0627,0x0621
            );
        }

        return cp(
            0x0639,0x0645,0x064a,0x0644,
            0x0020,
            0x064a,0x062d,0x062a,0x0627,0x062c,
            0x0020,
            0x0645,0x062a,0x0627,0x0628,0x0639,0x0629
        );
    })();

    const employeeActionLabel = (value) => {
        const key =
            String(value ?? "")
                .trim()
                .toUpperCase();

        if (key === "RETENTION_VIP") {
            return String.fromCodePoint(
                0x0627,0x0644,0x0627,0x062d,
                0x062a,0x0641,0x0627,0x0638,
                0x0020,
                0x0628,0x0627,0x0644,
                0x0639,0x0645,0x0644,0x0627,0x0621,
                0x0020,
                0x0627,0x0644,
0x0645,0x0645,0x064a,0x0632,0x064a,0x0646
            );
        }

        if (key === "RETENTION") {
            return String.fromCodePoint(
                0x0627,0x0644,0x0627,0x062d,
                0x062a,0x0641,0x0627,0x0638,
                0x0020,
                0x0628,0x0627,0x0644,
                0x0639,0x0645,0x064a,0x0644
            );
        }

        if (
            key === "WIN_BACK" ||
            key === "REACTIVATION"
        ) {
            return String.fromCodePoint(
                0x0625,0x0639,0x0627,0x062f,
                0x0629,
                0x0020,
                0x062a,0x0646,0x0634,
                0x064a,0x0637,
                0x0020,
                0x0627,0x0644,
                0x0639,0x0645,0x064a,0x0644
            );
        }

        return value ?? "";
    };

const firstPositiveNumber = (...values) => {
        for (const value of values) {
            const numberValue = Number(value);

            if (
                Number.isFinite(numberValue) &&
                numberValue > 0
            ) {
                return numberValue;
            }
        }

        return 0;
    };

    const firstDate = (...values) => {
        for (const value of values) {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return value;
            }
        }

        return null;
    };

    const totalSales =
        firstPositiveNumber(
            customerSource?.netSales,
            customerSource?.total_net_sales,
            customerSource?.total_sales,
            customerSource?.totalSales,
            profile?.netSales,
            profile?.totalNetSales,
            summarySource?.netSales,
            summarySource?.totalNetSales
        );

    const invoiceCount =
        firstPositiveNumber(
            customerSource?.ticketCount,
            customerSource?.ticket_count,
            customerSource?.invoices,
            customerSource?.invoiceCount,
            customerSource?.invoice_count,
            customerSource?.saleTickets,
            customerSource?.sale_tickets,
            customerSource?.totalTickets,
            customerSource?.total_tickets,
            profile?.ticketCount,
            profile?.invoiceCount,
            profile?.saleTickets,
            summarySource?.ticketCount,
            summarySource?.invoices,
            summarySource?.invoiceCount,
            summarySource?.saleTickets,
            profile?.currentRfm?.ticketCount,
            profile?.currentRfm?.invoices,
            profile?.currentRfm?.invoiceCount,
            profile?.rfm?.ticketCount,
            profile?.rfm?.invoices,
            profile?.rfm?.invoiceCount
        );

    const directAverageInvoice =
        firstPositiveNumber(
            customerSource?.averageTicketValue,
            customerSource?.average_ticket_value,
            customerSource?.average_invoice,
            profile?.averageTicketValue,
            summarySource?.averageTicketValue,
            profile?.currentRfm?.averageTicketValue,
            profile?.rfm?.averageTicketValue
        );

    const averageInvoice =
        directAverageInvoice > 0
            ? directAverageInvoice
            : (
                invoiceCount > 0
                    ? totalSales / invoiceCount
                    : 0
            );

    const lastPurchase =
        firstDate(
            customerSource?.lastPurchaseDate,
            customerSource?.last_purchase,
            customerSource?.last_purchase_date,
            profile?.lastPurchaseDate,
            summarySource?.lastPurchaseDate,
            summarySource?.last_purchase_date,
            profile?.currentRfm?.lastPurchaseDate,
            profile?.rfm?.lastPurchaseDate
        );

    const firstPurchase =
        firstDate(
            customerSource?.firstPurchaseDate,
            customerSource?.first_purchase,
            customerSource?.first_purchase_date,
            profile?.firstPurchaseDate,
            summarySource?.firstPurchaseDate,
            summarySource?.first_purchase_date,
            profile?.currentRfm?.firstPurchaseDate,
            profile?.rfm?.firstPurchaseDate
        );

return (

        <div
            style={{
                position:
                    "fixed",

                inset:
                    0,

                background:
                    "rgba(0,0,0,.40)",

                zIndex:
                    9999,

                display:
                    "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                padding:
                    20
            }}
        >

            <div
                style={{
                    background:
                        "#fff",

                    color:
                        "#111827",

                    width:
                        "min(1250px,96vw)",

                    maxHeight:
                        "92vh",

                    overflow:
                        "auto",

                    borderRadius:
                        18,

                    boxShadow:
                        "0 24px 70px rgba(0,0,0,.25)"
                }}
            >

                    <div
                        className="customer-profile-sticky-header"
                        style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 20,
                            background: "#fff",
                            padding: "18px 22px",
                            borderBottom:
                                "1px solid #e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16
                        }}
                    >

                        <div
                            style={{
                                minWidth: 0
                            }}
                        >

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 900,
                                    color: "#172033",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}
                            >
                                {
                                    customer?.customer_name ||
                                    customer?.customerName ||
                                    customerSource?.customer_name ||
                                    customerSource?.customerName ||
                                    profile?.customer_name ||
                                    profile?.customerName ||
                                    String.fromCodePoint(
                                        0x063a,0x064a,0x0631,
                                        0x0020,
                                        0x0645,0x0633,0x062c,0x0644
                                    )
                                }
                            </div>

                            <div
                                style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#64748b"
                                }}
                            >
                                {
                                    customer?.phone_numbers ||
                                    customer?.whatsapp_phone ||
                                    customer?.whatsappPhone ||
                                    customer?.phone ||
                                    customer?.mobile ||
                                    customerSource?.phone_numbers ||
                                    customerSource?.whatsappPhone ||
                                    customerSource?.whatsapp_phone ||
                                    String.fromCodePoint(
                                        0x0631,0x0642,0x0645,
                                        0x0020,
                                        0x063a,0x064a,0x0631,
                                        0x0020,
                                        0x0645,0x0633,0x062c,0x0644
                                    )
                                }
                            </div>

                        </div>

                    </div>



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

                <div
                    style={{
                        padding:
                            22,

                        display:
                            "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "flex-start",

                        borderBottom:
                            "1px solid #e5e7eb",

                        position:
                            "sticky",

                        top:
                            0,

                        background:
                            "#fff",

                        zIndex:
                            2
                    }}
                >

                    <div>

                        <h2
                            style={{
                                margin:
                                    "0 0 8px",

                                fontSize:
                                    24
                            }}
                        >
                            {
                                getCustomerName(
                                    customer
                                ) ||
                                customer?.customer_name ||
                                "عميل"
                            }
                        </h2>

                        <div
                            style={{
                                color:
                                    "#4b5563",

                                marginBottom:
                                    5
                            }}
                        >
                            الهاتف: {phone}
                        </div>

                        <div
                            style={{
                                color:
                                    "#4b5563"
                            }}
                        >
                            كود العميل: {
                                customer?.customer_code ||
                                customer?.customer_id ||
                                profile?.customerId ||
                                "—"
                            }
                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        style={{
                            border:
                                "1px solid #d1d5db",

                            background:
                                "#fff",

                            borderRadius:
                                10,

                            padding:
                                "8px 14px",

                            cursor:
                                "pointer",

                            fontSize:
                                15
                        }}
                    >
                        إغلاق
                    </button>

                </div>


                <div
                    style={{
                        padding:
                            22
                    }}
                >

                    <div
                        style={{
                            display:
                                "grid",

                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(220px,1fr))",

                            gap:
                                12,

                            marginBottom:
                                18
                        }}
                    >

                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                العنوان
                            </div>

                            <strong>
                                {address}
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                التصنيف
                            </div>

                            <strong>
                                {arabicRfmLabel(classification)}
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                مرحلة العميل
                            </div>

                            <strong>
                                {arabicRfmLabel(rfm?.lifecycleStage ||
                                    customer?.lifecycle_stage ||
                                    "غير محددة")}
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                التصرف المقترح
                            </div>

                            <strong>
                                {employeeActionLabel(recommendedAction)}
                            </strong>
                        </div>

                    </div>


                    <MetricGrid
                        items={[
                            {
                                label:
                                    "إجمالي المسحوبات",

                                value:
                                    money(
                                        totalSales
                                    )
                            },

                            {
                                label:
                                    "عدد الفواتير",

                                value:
                                    num(
                                        invoiceCount
                                    )
                            },

                            {
                                label:
                                    "متوسط الفاتورة",

                                value:
                                    money(
                                        averageInvoice
                                    )
                            },

                            {
                                label:
                                    "آخر شراء",

                                value:
                                    dateOnly(
                                        lastPurchase
                                    )
                            },

                            {
                                label:
                                    "أول شراء",

                                value:
                                    dateOnly(
                                        firstPurchase
                                    )
                            }

                        ]}
                    />


                    <div
                        style={{
                            marginTop:
                                22,

                            padding:
                                18,

                            borderRadius:
                                14,

                            background:
                                "#f8fafc",

                            border:
                                "1px solid #e5e7eb"
                        }}
                    >

                        <div
                            style={{
                                fontWeight:
                                    700,

                                fontSize:
                                    18,

                                marginBottom:
                                    14
                            }}
                        >
                            تحليل سلوك العملاء
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(4,minmax(120px,1fr))",

                                gap:
                                    12
                            }}
                        >

                            <div>
                                
                              <div
                                  style={{
                                      gridColumn:
                                          "1 / -1",

                                      padding:
                                          18,

                                      borderRadius:
                                          14,

                                      background:
                                          "rgba(167,139,250,.08)",

                                      border:
                                          "1px solid rgba(167,139,250,.25)",

                                      textAlign:
                                          "center"
                                  }}
                              >
                                  <div
                                      style={{
                                          color:
                                              "#64748b",

                                          fontWeight:
                                              800,

                                          marginBottom:
                                              8
                                      }}
                                  >
                                      {String.fromCodePoint(
                                          0x062a,0x062d,0x0644,
                                          0x064a,0x0644,
                                          0x0020,
                                          0x0633,0x0644,0x0648,
                                          0x0643,
                                          0x0020,
                                          0x0627,0x0644,
                                          0x0639,0x0645,0x064a,0x0644
                                      )}
                                  </div>

                                  <strong
                                      style={{
                                          display:
                                              "block",

                                          fontSize:
                                              20,

                                          fontWeight:
                                              900
                                      }}
                                  >
                                      {employeeBehaviorText}
                                  </strong>
                              </div>


                                <strong>
                                    {rfm?.rfmScore ?? "—"}
                                </strong>
                            </div>

                        </div>

                    </div>


                    <div
                        style={{
                            marginTop:
                                18,

                            padding:
                                18,

                            borderRadius:
                                14,

                            background:
                                "#fff7ed",

                            border:
                                "1px solid #fed7aa"
                        }}
                    >

                        <div
                            style={{
                                fontWeight:
                                    700,

                                marginBottom:
                                    7
                            }}
                        >
                            التصرف المقترح للعميل
                        </div>

                        <div>
                            {employeeActionLabel(recommendedAction)}
                        </div>

                    </div>


                    {
                        invoices.length >
                            0 ? (

                            <div
                                className="sales-result"
                                style={{
                                    marginTop:
                                        22
                                }}
                            >

                                <div
                                    className="result-header"
                                >

                                    <strong
                                        style={{
                                            fontSize:
                                                18
                                        }}
                                    >
                                        فواتير العميل بالتفصيل
                                    </strong>

                                    <span>
                                        إجمالي المعروض: {
                                            invoices.length
                                        }
                                    </span>

                                </div>


                                <div
                                    style={{
                                        marginTop:
                                            12
                                    }}
                                >

                                    <GenericTable
                                        rows={
                                            invoices.slice(
                                                0,
                                                300
                                            )
                                        }
                                        onRowClick={
                                            openCustomerInvoiceFromProfile
                                        }
                                    />

                                </div>

                            </div>

                        ) : (

                            <div
                                style={{
                                    marginTop:
                                        22,

                                    padding:
                                        18,

                                    borderRadius:
                                        14,

                                    background:
                                        "#f8fafc",

                                    border:
                                        "1px solid #e5e7eb"
                                }}
                            >
                                لا توجد فواتير مسجلة لهذا العميل في الفترة المحددة.
                            </div>

                        )
                    }


                    <div
                        style={{
                            marginTop:
                                18,

                            color:
                                "#64748b",

                            fontSize:
                                13
                        }}
                    >
                        نطاق البيانات:
                        {" "}
                        {
                            profile?.period?.fromDate ||
                            "—"
                        }
                        {" "}
                        إلى
                        {" "}
                        {
                            profile?.period?.toDate ||
                            "—"
                        }
                    </div>

                </div>

            </div>

            {
                (
                    customerInvoiceLoading ||
                    customerInvoiceDetailsState
                ) && (
                    <CustomerInvoiceDetailsPopup
                        details={
                            customerInvoiceDetailsState
                        }
                        loading={
                            customerInvoiceLoading
                        }
                        onClose={() =>
                            setCustomerInvoiceDetailsState(
                                null
                            )
                        }
                    />
                )
            }


        </div>

    );

}