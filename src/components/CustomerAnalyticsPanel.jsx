import React, {
    useState
} from "react";


import CustomerRfmPanel
    from "./CustomerRfmPanel.jsx";


import CustomerClvPanel
    from "./CustomerClvPanel.jsx";


import CustomerCohortPanel
    from "./CustomerCohortPanel.jsx";


function number(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


function percent(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "—";

    }


    return `${Number(
        value
    ).toFixed(
        2
    )}%`;

}


function change(
    value
) {

    const numberValue =
        Number(
            value || 0
        );


    return numberValue > 0

        ? `+${
            numberValue.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits:
                        2
                }
            )
        }`

        : numberValue.toLocaleString(
            "en-US",
            {
                maximumFractionDigits:
                    2
            }
        );

}


export default function CustomerAnalyticsPanel(
    {
        connectionPayload,
        fromDate,
        toDate
    }
) {

    const [
        retention,
        setRetention
    ] =
        useState(
            null
        );


    const [
        inactivity,
        setInactivity
    ] =
        useState(
            null
        );


    const [
        retentionLoading,
        setRetentionLoading
    ] =
        useState(
            false
        );


    const [
        inactivityLoading,
        setInactivityLoading
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


    async function runRetention() {

        try {

            setRetentionLoading(
                true
            );


            setError(
                ""
            );


            const result =
                await window
                    .pharmaBI
                    .customers
                    .retention({

                        ...connectionPayload,

                        fromDate,

                        toDate

                    });


            setRetention(
                result
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer Retention failed:",
                requestError
            );


            setError(
                requestError?.message ||
                "فشل Customer Retention."
            );

        }
        finally {

            setRetentionLoading(
                false
            );

        }

    }


    async function runInactivity() {

        try {

            setInactivityLoading(
                true
            );


            setError(
                ""
            );


            const result =
                await window
                    .pharmaBI
                    .customers
                    .inactivity({

                        ...connectionPayload,

                        toDate,

                        sampleLimit:
                            100

                    });


            setInactivity(
                result
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer Inactivity failed:",
                requestError
            );


            setError(
                requestError?.message ||
                "فشل Customer Inactivity."
            );

        }
        finally {

            setInactivityLoading(
                false
            );

        }

    }


    return (

        <>

            <CustomerRfmPanel

                connectionPayload={
                    connectionPayload
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }

            />


            <section className="analysis-section">

                <div className="section-title">
                    Customer Retention
                </div>


                <button
                    type="button"
                    onClick={
                        runRetention
                    }
                    disabled={
                        retentionLoading
                    }
                >

                    {
                        retentionLoading
                            ? "جاري التحليل..."
                            : "تحليل Customer Retention"
                    }

                </button>


                {
                    retention && (

                        <div className="summary-grid">

                            <div className="metric">

                                <span>
                                    Retention Rate
                                </span>

                                <strong>
                                    {
                                        percent(
                                            retention
                                                .retention
                                                .retentionRate
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    العملاء السابقون
                                </span>

                                <strong>
                                    {
                                        number(
                                            retention
                                                .retention
                                                .previousCustomers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Retained
                                </span>

                                <strong>
                                    {
                                        number(
                                            retention
                                                .retention
                                                .retainedCustomers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Lost
                                </span>

                                <strong>
                                    {
                                        number(
                                            retention
                                                .retention
                                                .lostCustomers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    New Customers
                                </span>

                                <strong>
                                    {
                                        number(
                                            retention
                                                .lifecycle
                                                .newCustomers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    العملاء الحاليون
                                </span>

                                <strong>
                                    {
                                        number(
                                            retention
                                                .current
                                                .customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Customer Change
                                </span>

                                <strong>
                                    {
                                        change(
                                            retention
                                                .movement
                                                .customerChange
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Retention Loss
                                </span>

                                <strong>
                                    {
                                        percent(
                                            retention
                                                .retention
                                                .retentionLossRate
                                        )
                                    }
                                </strong>

                            </div>

                        </div>

                    )
                }

            </section>


            <section className="analysis-section">

                <div className="section-title">
                    True Customer Inactivity
                </div>


                <button
                    type="button"
                    onClick={
                        runInactivity
                    }
                    disabled={
                        inactivityLoading
                    }
                >

                    {
                        inactivityLoading
                            ? "جاري التحليل..."
                            : "تحليل Inactivity 30 / 60 / 90"
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
                    inactivity && (

                        <>

                            <div className="summary-grid">

                                <div className="metric">

                                    <span>
                                        العملاء المسجلون
                                    </span>

                                    <strong>
                                        {
                                            number(
                                                inactivity
                                                    .summary
                                                    .knownCustomers
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        نشط خلال 30 يومًا أو أقل
                                    </span>

                                    <strong>
                                        {
                                            number(
                                                inactivity
                                                    .summary
                                                    .activeWithin30Days
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        غير نشط منذ 30 يومًا أو أكثر
                                    </span>

                                    <strong>
                                        {
                                            number(
                                                inactivity
                                                    .summary
                                                    .inactive30DaysOrMore
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        غير نشط منذ 60 يومًا أو أكثر
                                    </span>

                                    <strong>
                                        {
                                            number(
                                                inactivity
                                                    .summary
                                                    .inactive60DaysOrMore
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        غير نشط منذ 90 يومًا أو أكثر
                                    </span>

                                    <strong>
                                        {
                                            number(
                                                inactivity
                                                    .summary
                                                    .inactive90DaysOrMore
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        Inactivity Rate 30d
                                    </span>

                                    <strong>
                                        {
                                            percent(
                                                inactivity
                                                    .summary
                                                    .inactivityRate30Days
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        Inactivity Rate 60d
                                    </span>

                                    <strong>
                                        {
                                            percent(
                                                inactivity
                                                    .summary
                                                    .inactivityRate60Days
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="metric">

                                    <span>
                                        Inactivity Rate 90d
                                    </span>

                                    <strong>
                                        {
                                            percent(
                                                inactivity
                                                    .summary
                                                    .inactivityRate90Days
                                            )
                                        }
                                    </strong>

                                </div>

                            </div>


                            <div className="sales-result">

                                <div className="result-header">

                                    <strong>
                                        غير نشط منذ 90 يومًا
                                    </strong>

                                    <span>
                                        Top customers by inactivity
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
                                                    Last Purchase
                                                </th>

                                                <th>
                                                    Days Since Purchase
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {
                                                (
                                                    inactivity
                                                        .samples
                                                        .inactive90 ||
                                                    []
                                                ).map(
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
                                                                    customer
                                                                        .lastPurchaseDate
                                                                        ?.slice(
                                                                            0,
                                                                            10
                                                                        )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    customer
                                                                        .daysSinceLastPurchase
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

                        </>

                    )
                }

            </section>


            <CustomerClvPanel

                connectionPayload={
                    connectionPayload
                }

                toDate={
                    toDate
                }

            />


            <CustomerCohortPanel

                connectionPayload={
                    connectionPayload
                }

                fromDate={
                    fromDate
                }

                toDate={
                    toDate
                }

            />

        </>

    );

}