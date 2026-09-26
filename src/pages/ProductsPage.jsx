import React from "react";

import TopProductsPanel from "../components/TopProductsPanel.jsx";


export default function ProductsPage(
    {
        connectionPayload,
        fromDate,
        toDate
    }
) {

    return (

        <div className="analysis-page">

            <div className="page-header">

                <div>

                    <h1>
                        تحليلات المنتجات
                    </h1>

                    <p>
                        تحليل أداء المنتجات والمبيعات والربحية
                    </p>

                </div>

            </div>


            <div className="page-content">

                <TopProductsPanel

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

            </div>

        </div>

    );

}