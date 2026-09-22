import React from "react";


import ProductProfitabilityPanel
    from "./ProductProfitabilityPanel.jsx";


import ProductMixPanel
    from "./ProductMixPanel.jsx";


export default function ProductAnalyticsPanel(
    {
        connectionPayload,
        fromDate,
        toDate
    }
) {

    return (

        <>

            <ProductProfitabilityPanel

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


            <ProductMixPanel

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