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


export default function CustomerCohortPanel(
    {
        connectionPayload,
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
            false
        );


    const [
        error,
        setError
    ] =
        useState(
            ""
        );


    async function runCohort() {

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
                    .cohort({

                        ...connectionPayload,

                        fromDate,

                        toDate,

                        maxMonths:
                            12,

                        observationMonths:
                            24

                    });


            setData(
                result
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer Cohort failed:",
                requestError
            );


            setData(
                null
            );


            setError(
                requestError?.message ||
                "فشل Customer Cohort."
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }


    function renderRetention(
        retention
    ) {

        const cells = [];


        for (
            let index = 0;
            index < 12;
            index += 1
        ) {

            const value =
                retention?.[
                    String(
                        index
                    )
                ];


            cells.push(

                <td
                    key={
                        index
                    }
                >

                    {
                        value
                            ? percent(
                                value.retentionRate
                            )
                            : "—"
                    }

                </td>

            );

        }


        return cells;

    }


    return (

        <section className="analysis-section">

            <div className="section-title">
                Customer Cohort Analysis
            </div>


            <button
                type="button"
                onClick={
                    runCohort
                }
                disabled={
                    loading
                }
            >

                {
                    loading
                        ? "جاري التحليل..."
                        : "تحليل Customer Cohort"
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
                                    Cohorts
                                </span>

                                <strong>
                                    {
                                        number(
                                            data
                                                .summary
                                                .cohorts
                                        )
                                    }
                                </strong>

                            </div>


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
                                    Initial Cohort Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            data
                                                .summary
                                                .initialCohortSales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Observed Cohort Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            data
                                                .summary
                                                .observedSales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Latest Cohort
                                </span>

                                <strong>
                                    {
                                        data
                                            .summary
                                            .latestCohort ||
                                        "—"
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Observation Months
                                </span>

                                <strong>
                                    {
                                        number(
                                            data
                                                .selectedPeriod
                                                .observationMonths
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Cohort Retention Matrix
                                </strong>

                                <span>
                                    Monthly Retention
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Cohort
                                            </th>

                                            <th>
                                                Customers
                                            </th>

                                            <th>
                                                Initial Sales
                                            </th>

                                            <th>
                                                Observed Sales
                                            </th>

                                            {
                                                Array.from(
                                                    {
                                                        length:
                                                            12
                                                    },
                                                    (
                                                        _,
                                                        index
                                                    ) => (

                                                        <th
                                                            key={
                                                                index
                                                            }
                                                        >

                                                            M{
                                                                index
                                                            }

                                                        </th>

                                                    )
                                                )
                                            }

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            (
                                                data.cohorts ||
                                                []
                                            ).map(
                                                cohort => (

                                                    <tr
                                                        key={
                                                            cohort.cohortMonth
                                                        }
                                                    >

                                                        <td>
                                                            {
                                                                cohort.cohortMonth
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                number(
                                                                    cohort.customers
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                money(
                                                                    cohort.initialMonthSales
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                money(
                                                                    cohort.observedSales
                                                                )
                                                            }
                                                        </td>

                                                        {
                                                            renderRetention(
                                                                cohort.retention
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


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Cohort Revenue by Month
                                </strong>

                                <span>
                                    Sales / Active Customer
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Cohort
                                            </th>

                                            {
                                                Array.from(
                                                    {
                                                        length:
                                                            12
                                                    },
                                                    (
                                                        _,
                                                        index
                                                    ) => (

                                                        <th
                                                            key={
                                                                index
                                                            }
                                                        >

                                                            M{
                                                                index
                                                            }

                                                        </th>

                                                    )
                                                )
                                            }

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            (
                                                data.cohorts ||
                                                []
                                            ).map(
                                                cohort => (

                                                    <tr
                                                        key={
                                                            `${cohort.cohortMonth}-revenue`
                                                        }
                                                    >

                                                        <td>
                                                            {
                                                                cohort.cohortMonth
                                                            }
                                                        </td>

                                                        {
                                                            Array.from(
                                                                {
                                                                    length:
                                                                        12
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const value =
                                                                        cohort
                                                                            .revenuePerCustomer
                                                                            ?.[
                                                                                String(
                                                                                    index
                                                                                )
                                                                            ];


                                                                    return (

                                                                        <td
                                                                            key={
                                                                                index
                                                                            }
                                                                        >

                                                                            {
                                                                                value
                                                                                    ? money(
                                                                                        value.salesPerActiveCustomer
                                                                                    )
                                                                                    : "—"
                                                                            }

                                                                        </td>

                                                                    );

                                                                }
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

                    </>

                )
            }

        </section>

    );

}