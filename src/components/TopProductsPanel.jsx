import React, {
    useState
} from "react";


function formatMoney(
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


function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


export default function TopProductsPanel(
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
                    .top({

                        ...connectionPayload,

                        fromDate,

                        toDate,

                        limit:
                            20

                    });


            setResult(
                response
            );

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] أفضل المنتجات failed:",
                requestError
            );


            setResult(
                null
            );


            setError(

                requestError?.message ||
                "فشل تحميل أفضل المنتجات."

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
                أفضل المنتجات
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
                        : "تحليل أفضل المنتجات"
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

                    <div className="sales-result">

                        <div className="result-header">

                            <strong>
                                أفضل {result.limit} منتجات
                            </strong>

                            <span>
                                {
                                    formatNumber(
                                        result.totalProducts
                                    )
                                }
                                {" منتج"}
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
                                        result.products.map(
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
                                                            formatMoney(
                                                                product.netSales
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatMoney(
                                                                product.cost
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatMoney(
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
                                                            formatNumber(
                                                                product.units
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatNumber(
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

                )
            }

        </section>

    );

}