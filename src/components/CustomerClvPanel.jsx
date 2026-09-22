import React, {
    useState
} from "react";


function number(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


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


export default function CustomerClvPanel(
    {
        connectionPayload,
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
            false
        );


    const [
        error,
        setError
    ] =
        useState(
            ""
        );


    async function runClv() {

        try {

            setLoading(
                true
            );


            setError(
                ""
            );


            const result =
                await window
                    .pharmaBI
                    .customers
                    .clv({

                        ...connectionPayload,

                        toDate,

                        observationDays:
                            365,

                        limit:
                            100

                    });


            setData(
                result
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer CLV failed:",
                requestError
            );


            setData(
                null
            );


            setError(
                requestError?.message ||
                "فشل Customer CLV."
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
                Customer Lifetime Value
            </div>


            <button
                type="button"
                onClick={
                    runClv
                }
                disabled={
                    loading
                }
            >

                {
                    loading
                        ? "جاري التحليل..."
                        : "تحليل Customer CLV"
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
                data && (

                    <>

                        <div className="summary-grid">

                            <div className="metric">

                                <span>
                                    Customers
                                </span>

                                <strong>
                                    {
                                        number(
                                            data
                                                .summary
                                                .customers
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Observed Net Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            data
                                                .summary
                                                .observedNetSales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Orders
                                </span>

                                <strong>
                                    {
                                        number(
                                            data
                                                .summary
                                                .orders
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Avg Customer Value
                                </span>

                                <strong>
                                    {
                                        money(
                                            data
                                                .summary
                                                .averageCustomerValue
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Avg Order Value
                                </span>

                                <strong>
                                    {
                                        money(
                                            data
                                                .summary
                                                .averageOrderValue
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Monthly Frequency
                                </span>

                                <strong>
                                    {
                                        Number(
                                            data
                                                .summary
                                                .averageMonthlyFrequency ||
                                            0
                                        ).toFixed(
                                            2
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Observation Days
                                </span>

                                <strong>
                                    {
                                        number(
                                            data
                                                .selectedPeriod
                                                .observationDays
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Months Observed
                                </span>

                                <strong>
                                    {
                                        Number(
                                            data
                                                .selectedPeriod
                                                .monthsObserved ||
                                            0
                                        ).toFixed(
                                            2
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Top Customers by Observed Value
                                </strong>

                                <span>
                                    آخر 365 يوم
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
                                                Observed Value
                                            </th>

                                            <th>
                                                Orders
                                            </th>

                                            <th>
                                                Avg Order
                                            </th>

                                            <th>
                                                Monthly Frequency
                                            </th>

                                            <th>
                                                Annualized Value
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            (
                                                data.customers ||
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
                                                                money(
                                                                    customer.observedNetSales
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                number(
                                                                    customer.orders
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                money(
                                                                    customer.averageOrderValue
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                Number(
                                                                    customer.monthlyFrequency ||
                                                                    0
                                                                ).toFixed(
                                                                    2
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                money(
                                                                    customer.annualizedValue
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

                    </>

                )
            }

        </section>

    );

}