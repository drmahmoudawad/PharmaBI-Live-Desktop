import React, {
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


    async function run() {

        try {

            setLoading(
                true
            );


            setError(
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
                            100

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
                "فشل تحليل Customer RFM."
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }


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
                        ? "جاري التحليل..."
                        : "تحليل Customer RFM"
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
                                                .summary
                                                .customers
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
                                                .summary
                                                .averageRecencyDays
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
                                                .summary
                                                .averageFrequency
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
                                                .summary
                                                .averageMonetary
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
                                                .summary
                                                .customerIntelligence
                                                .champions
                                                .customers
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
                                                .summary
                                                .customerIntelligence
                                                .atRisk
                                                .customers
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
                                                .summary
                                                .customerIntelligence
                                                .dormant
                                                .customers
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
                                                .summary
                                                .customerIntelligence
                                                .reactivationOpportunity
                                                .netSales
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Customer Segments
                                </strong>

                                <span>
                                    {
                                        result
                                            .summary
                                            .segments
                                            .length
                                    }
                                </span>

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
                                            result
                                                .summary
                                                .segments
                                                .map(
                                                    segment => (

                                                        <tr
                                                            key={
                                                                segment.code
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    segment.name
                                                                }
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

                                                    )
                                                )
                                        }

                                    </tbody>

                                </table>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Priority Customers
                                </strong>

                                <span>
                                    Top {result.customers.length}
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
                                            result
                                                .customers
                                                .map(
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