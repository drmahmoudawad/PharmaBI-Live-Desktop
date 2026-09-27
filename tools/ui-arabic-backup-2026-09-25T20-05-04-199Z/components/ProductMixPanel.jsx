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


function changeClass(
    value
) {

    if (
        Number(value) > 0
    ) {

        return "positive";

    }


    if (
        Number(value) < 0
    ) {

        return "negative";

    }


    return "";

}


export default function ProductMixPanel(
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
                    .products
                    .mix({

                        ...connectionPayload,

                        fromDate,

                        toDate

                    });


            setResult(
                response
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Product Mix failed:",
                requestError
            );


            setResult(
                null
            );


            setError(

                requestError?.message ||
                "فشل تحليل Product Mix."

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
                Product Mix Analytics
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
                        : "تحليل Product Mix"
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
                                    Current Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            result.current.sales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Last Year Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            result.samePeriodLastYear.sales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    YoY Sales
                                </span>

                                <strong
                                    className={
                                        changeClass(
                                            result.yoy.salesPct
                                        )
                                    }
                                >
                                    {
                                        percent(
                                            result.yoy.salesPct
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Product Mix Change
                                </span>

                                <strong
                                    className={
                                        changeClass(
                                            result
                                                .contributors
                                                .totalSalesChange
                                        )
                                    }
                                >
                                    {
                                        money(
                                            result
                                                .contributors
                                                .totalSalesChange
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Current Products
                                </span>

                                <strong>
                                    {
                                        number(
                                            result.current.products
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Current Units
                                </span>

                                <strong>
                                    {
                                        number(
                                            result.current.units
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Units / Invoice
                                </span>

                                <strong>
                                    {
                                        number(
                                            result.current.unitsPerInvoice
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Top 10 Share
                                </span>

                                <strong>
                                    {
                                        percent(
                                            result.current
                                                .concentration
                                                .top10SharePct
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Positive Contributors
                                </strong>

                                <span>
                                    صعود
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Current
                                            </th>

                                            <th>
                                                Previous
                                            </th>

                                            <th>
                                                Change
                                            </th>

                                            <th>
                                                Change %
                                            </th>

                                            <th>
                                                Contribution %
                                            </th>

                                            <th>
                                                Units Change
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            result
                                                .contributors
                                                .positive
                                                .map(
                                                    product => (

                                                        <tr
                                                            key={
                                                                product.itemId
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    product.itemName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.currentSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.previousSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.change
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    percent(
                                                                        product.changePct
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    percent(
                                                                        product.contributionSharePct
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    number(
                                                                        product.unitsChange
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


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Negative Contributors
                                </strong>

                                <span>
                                    هبوط
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Current
                                            </th>

                                            <th>
                                                Previous
                                            </th>

                                            <th>
                                                Change
                                            </th>

                                            <th>
                                                Change %
                                            </th>

                                            <th>
                                                Contribution %
                                            </th>

                                            <th>
                                                Units Change
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            result
                                                .contributors
                                                .negative
                                                .map(
                                                    product => (

                                                        <tr
                                                            key={
                                                                product.itemId
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    product.itemName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.currentSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.previousSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.change
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    percent(
                                                                        product.changePct
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    percent(
                                                                        product.contributionSharePct
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    number(
                                                                        product.unitsChange
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


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Biggest Movers
                                </strong>

                                <span>
                                    Top 10
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Current
                                            </th>

                                            <th>
                                                Previous
                                            </th>

                                            <th>
                                                Change
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            result
                                                .contributors
                                                .biggestMovers
                                                .map(
                                                    product => (

                                                        <tr
                                                            key={
                                                                `mover-${product.itemId}`
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    product.itemName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.currentSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.previousSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.change
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    product.status
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