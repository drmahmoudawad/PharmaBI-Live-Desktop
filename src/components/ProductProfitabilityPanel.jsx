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


export default function ProductProfitabilityPanel(
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
                    .profitability({

                        ...connectionPayload,

                        fromDate,

                        toDate,

                        limit:
                            20,

                        negativeMarginLimit:
                            50

                    });


            setResult(
                response
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Product Profitability failed:",
                requestError
            );


            setResult(
                null
            );


            setError(
                requestError?.message ||
                "فشل تحليل ربحية المنتجات."
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
                Product Profitability
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
                        : "تحليل Product Profitability"
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
                                    Gross Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .grossSales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Discounts
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .discounts
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Returns
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .returns
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Net Sales
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .netSales
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Cost
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .cost
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Gross Profit
                                </span>

                                <strong>
                                    {
                                        money(
                                            result
                                                .summary
                                                .grossProfit
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Margin
                                </span>

                                <strong>
                                    {
                                        Number(
                                            result
                                                .summary
                                                .margin ||
                                            0
                                        ).toFixed(
                                            2
                                        )
                                    }%

                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Negative Margin Products
                                </span>

                                <strong>
                                    {
                                        number(
                                            result
                                                .summary
                                                .negativeMarginProducts
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        <div className="sales-result">

                            <div className="result-header">

                                <strong>
                                    Most Profitable Products
                                </strong>

                                <span>
                                    {
                                        result
                                            .profitByProduct
                                            .length
                                    }
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Rank
                                            </th>

                                            <th>
                                                Item ID
                                            </th>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Net Sales
                                            </th>

                                            <th>
                                                Cost
                                            </th>

                                            <th>
                                                Profit
                                            </th>

                                            <th>
                                                Margin
                                            </th>

                                            <th>
                                                Units
                                            </th>

                                            <th>
                                                Tickets
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            result
                                                .profitByProduct
                                                .map(
                                                    (
                                                        product,
                                                        index
                                                    ) => (

                                                        <tr
                                                            key={
                                                                product.itemId
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    index + 1
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    product.itemId
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    product.itemName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.netSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.cost
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.grossProfit
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    Number(
                                                                        product.margin ||
                                                                        0
                                                                    ).toFixed(
                                                                        2
                                                                    )
                                                                }%
                                                            </td>

                                                            <td>
                                                                {
                                                                    number(
                                                                        product.netUnits
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    number(
                                                                        product.tickets
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
                                    Loss Items
                                </strong>

                                <span>
                                    {
                                        result
                                            .lossItems
                                            .length
                                    }
                                </span>

                            </div>


                            <div className="table-wrap">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Item ID
                                            </th>

                                            <th>
                                                Product
                                            </th>

                                            <th>
                                                Net Sales
                                            </th>

                                            <th>
                                                Cost
                                            </th>

                                            <th>
                                                Loss
                                            </th>

                                            <th>
                                                Margin
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {
                                            result
                                                .lossItems
                                                .map(
                                                    product => (

                                                        <tr
                                                            key={
                                                                product.itemId
                                                            }
                                                        >

                                                            <td>
                                                                {
                                                                    product.itemId
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    product.itemName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.netSales
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.cost
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    money(
                                                                        product.grossProfit
                                                                    )
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    Number(
                                                                        product.margin ||
                                                                        0
                                                                    ).toFixed(
                                                                        2
                                                                    )
                                                                }%
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