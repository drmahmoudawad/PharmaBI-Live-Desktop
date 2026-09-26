import React, {
    useMemo,
    useState
} from "react";


function money(
    value
) {

    return Number(
        value || 0
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


function number(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            maximumFractionDigits:
                2
        }
    );

}


function customerBelongsToSegment(
    customer,
    segment
) {

    if (
        !customer ||
        !segment
    ) {

        return false;

    }


    const selectedCode =
        String(
            segment.code || ""
        )
            .trim()
            .toLowerCase();


    const selectedName =
        String(
            segment.name || ""
        )
            .trim()
            .toLowerCase();


    const customerSegmentCode =
        String(
            customer.segmentCode ||
            ""
        )
            .trim()
            .toLowerCase();


    const customerSegment =
        String(
            customer.segment ||
            ""
        )
            .trim()
            .toLowerCase();


    const customerSegmentName =
        String(
            customer.segmentName ||
            ""
        )
            .trim()
            .toLowerCase();


    return (
        (
            selectedCode &&
            customerSegmentCode &&
            selectedCode ===
                customerSegmentCode
        ) ||

        (
            selectedCode &&
            customerSegment &&
            selectedCode ===
                customerSegment
        ) ||

        (
            selectedName &&
            customerSegment &&
            selectedName ===
                customerSegment
        ) ||

        (
            selectedName &&
            customerSegmentName &&
            selectedName ===
                customerSegmentName
        )
    );

}


function getSegmentColor(
    index
) {

    const colors = [
        "#2563eb",
        "#16a34a",
        "#9333ea",
        "#ea580c",
        "#dc2626",
        "#0891b2",
        "#ca8a04",
        "#4f46e5",
        "#be123c",
        "#0f766e"
    ];


    return colors[
        index %
        colors.length
    ];

}


export default function CustomerRfmPanel(
    {
        connectionPayload,
        fromDate,
        toDate
    }
) {

    const [
        result,
        setResult
    ] =
        useState(
            null
        );


    const [
        loading,
        setLoading
    ] =
        useState(
            false
        );


    const [
        error,
        setError
    ] =
        useState(
            ""
        );


    const [
        selectedSegmentCode,
        setSelectedSegmentCode
    ] =
        useState(
            ""
        );


    async function run() {

        try {

            setLoading(
                true
            );


            setError(
                ""
            );


            setSelectedSegmentCode(
                ""
            );


            const response =
                await window
                    .pharmaBI
                    .customers
                    .rfm({

                        ...connectionPayload,

                        fromDate,

                        toDate,

                        limit:
                            1000

                    });


            setResult(
                response
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer RFM failed:",
                requestError
            );


            setResult(
                null
            );


            setError(
                requestError?.message ||
                "تعذر تحليل سلوك العمملاء."
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }


    const segments =
        result?.summary?.segments ||
        [];


    const selectedSegment =
        segments.find(
            segment =>
                String(
                    segment.code || ""
                ) ===
                String(
                    selectedSegmentCode
                )
        ) ||
        null;


    const filteredCustomers =
        useMemo(
            () => {

                const customers =
                    result?.customers ||
                    [];


                if (
                    !selectedSegmentCode
                ) {

                    return customers;

                }


                return customers.filter(
                    customer =>
                        customerBelongsToSegment(
                            customer,
                            selectedSegment
                        )
                );

            },
            [
                result,
                selectedSegmentCode,
                selectedSegment
            ]
        );


    return (

        <section className="analysis-section">

            <div className="section-title">
                Customer RFM
            </div>


            <button
                type="button"
                onClick={
                    run
                }
                disabled={
                    loading
                }
            >

                {
                    loading
                        ? "جارٍ التحليل..."
                        : "تحليل سلوك العملاء"
                }

            </button>


            {
                error && (

                    <div className="status error">

                        {
                            error
                        }

                    </div>

                )
            }


            {
                result && (

                    <>

                        <div className="summary-grid">

                            <div className="metric">

                                <span>
                                    Customers
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Avg Recency
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.averageRecencyDays
                                        )
                                    }
                                    {" days"}
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Avg Frequency
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.averageFrequency
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Avg Monetary
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                ?.summary
                                                ?.averageMonetary
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Champions
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.customerIntelligence
                                                ?.champions
                                                ?.customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    At Risk
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.customerIntelligence
                                                ?.atRisk
                                                ?.customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Dormant
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                ?.summary
                                                ?.customerIntelligence
                                                ?.dormant
                                                ?.customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Reactivation Opportunity
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                ?.summary
                                                ?.customerIntelligence
                                                ?.reactivationOpportunity
                                                ?.netSales
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    فئات العملاء - اختر الفئة
                                </strong>

                                <span>
                                    {
                                        selectedSegment
                                            ? selectedSegment.name
                                            : "كل العملاء"
                                    }
                                </span>

                            </div>


                            <div
                                style={{
                                    display:
                                        "grid",

                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(180px, 1fr))",

                                    gap:
                                        "10px",

                                    marginBottom:
                                        "16px"
                                }}
                            >

                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            setSelectedSegmentCode(
                                                ""
                                            )
                                    }
                                    style={{
                                        padding:
                                            "14px",

                                        borderRadius:
                                            "10px",

                                        border:
                                            selectedSegmentCode ===
                                            ""
                                                ? "2px solid #2563eb"
                                                : "1px solid #d1d5db",

                                        background:
                                            selectedSegmentCode ===
                                            ""
                                                ? "#eff6ff"
                                                : "#fff",

                                        cursor:
                                            "pointer",

                                        textAlign:
                                            "right"
                                    }}
                                >

                                    <div
                                        style={{
                                            fontWeight:
                                                700,

                                            marginBottom:
                                                "6px"
                                        }}
                                    >
                                        جميع فئات العملاء
                                    </div>

                                    <div
                                        style={{
                                            fontSize:
                                                "13px",

                                            opacity:
                                                0.75
                                        }}
                                    >
                                        {
                                            number(
                                                result
                                                    ?.summary
                                                    ?.customers
                                            )
                                        }
                                        {" عميل"}
                                    </div>

                                </button>


                                {
                                    segments.map(
                                        (
                                            segment,
                                            index
                                        ) => {

                                            const isSelected =
                                                String(
                                                    selectedSegmentCode
                                                ) ===
                                                String(
                                                    segment.code
                                                );


                                            return (

                                                <button
                                                    key={
                                                        segment.code
                                                    }
                                                    type="button"
                                                    onClick={
                                                        () =>
                                                            setSelectedSegmentCode(
                                                                segment.code
                                                            )
                                                    }
                                                    style={{
                                                        padding:
                                                            "14px",

                                                        borderRadius:
                                                            "10px",

                                                        border:
                                                            isSelected
                                                                ? `2px solid ${getSegmentColor(index)}`
                                                                : "1px solid #d1d5db",

                                                        background:
                                                            isSelected
                                                                ? "#f8fafc"
                                                                : "#fff",

                                                        cursor:
                                                            "pointer",

                                                        textAlign:
                                                            "right"
                                                    }}
                                                >

                                                    <div
                                                        style={{
                                                            fontWeight:
                                                                700,

                                                            marginBottom:
                                                                "6px"
                                                        }}
                                                    >
                                                        {
                                                            segment.name
                                                        }
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize:
                                                                "13px",

                                                            opacity:
                                                                0.75
                                                        }}
                                                    >
                                                        {
                                                            number(
                                                                segment.customers
                                                            )
                                                        }
                                                        {" عميل"}
                                                    </div>

                                                </button>

                                            );

                                        }
                                    )
                                }

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Segment
                                            </th>

                                            <th>
                                                Customers
                                            </th>

                                            <th>
                                                Net Sales
                                            </th>

                                            <th>
                                                Priority
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            segments.map(
                                                segment => {

                                                    const isSelected =
                                                        String(
                                                            selectedSegmentCode
                                                        ) ===
                                                        String(
                                                            segment.code
                                                        );


                                                    return (

                                                        <tr
                                                            key={
                                                                segment.code
                                                            }
                                                            onClick={
                                                                () =>
                                                                    setSelectedSegmentCode(
                                                                        isSelected
                                                                            ? ""
                                                                            : segment.code
                                                                    )
                                                            }
                                                            style={{
                                                                cursor:
                                                                    "pointer",

                                                                background:
                                                                    isSelected
                                                                        ? "#eff6ff"
                                                                        : undefined
                                                            }}
                                                        >

                                                            <td>

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        event => {

                                                                            event.stopPropagation();

                                                                            setSelectedSegmentCode(
                                                                                isSelected
                                                                                    ? ""
                                                                                    : segment.code
                                                                            );

                                                                        }
                                                                    }
                                                                    style={{
                                                                        border:
                                                                            "none",

                                                                        background:
                                                                            "transparent",

                                                                        padding:
                                                                            0,

                                                                        cursor:
                                                                            "pointer",

                                                                        fontWeight:
                                                                            isSelected
                                                                                ? 700
                                                                                : 500
                                                                    }}
                                                                >

                                                                    {
                                                                        segment.name
                                                                    }

                                                                </button>

                                                            </td>


                                                            <td>
                                                                {
                                                                    number(
                                                                        segment.customers
                                                                    )
                                                                }
                                                            </td>


                                                            <td>
                                                                {
                                                                    money(
                                                                        segment.netSales
                                                                    )
                                                                }
                                                            </td>


                                                            <td>
                                                                {
                                                                    segment.priority
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


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    {
                                        selectedSegment
                                            ? `عملاء فئة: ${selectedSegment.name}`
                                            : "العملاء ذوو الأولوية"
                                    }
                                </strong>

                                <span>

                                    {
                                        selectedSegment
                                            ? `${number(filteredCustomers.length)} عميل`
                                            : `Top ${result?.customers?.length || 0}`
                                    }

                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Customer
                                            </th>

                                            <th>
                                                RFM
                                            </th>

                                            <th>
                                                Segment
                                            </th>

                                            <th>
                                                Net Sales
                                            </th>

                                            <th>
                                                R
                                            </th>

                                            <th>
                                                F
                                            </th>

                                            <th>
                                                M
                                            </th>

                                            <th>
                                                Priority
                                            </th>

                                            <th>
                                                Urgency
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            filteredCustomers.length ===
                                                0
                                                ? (

                                                    <tr>

                                                        <td
                                                            colSpan={
                                                                9
                                                            }
                                                            style={{
                                                                textAlign:
                                                                    "center",

                                                                padding:
                                                                    "24px"
                                                            }}
                                                        >
                                                            لا يوجد عملاء ظاهرون لهذه الفئة ضمن البيانات المستحضرة.
                                                        </td>

                                                    </tr>

                                                )
                                                : (

                                                    filteredCustomers.map(
                                                        customer => (

                                                            <tr
                                                                key={
                                                                    customer.customerId
                                                                }
                                                            >

                                                                <td>
                                                                    {
                                                                        customer.customerName
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.rfmScore
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.segment
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        money(
                                                                            customer.netSales
                                                                        )
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.r
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.f
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.m
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.priorityLevel
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        customer.urgencyScore
                                                                    }
                                                                </td>

                                                            </tr>

                                                        )
                                                    )

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