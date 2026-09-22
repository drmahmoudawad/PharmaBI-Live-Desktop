import {
    ipcMain
} from "electron";


import {
    getTopProducts
} from "../pharmfly/products/topProductsService.js";


import {
    getProductProfitability
} from "../pharmfly/products/productProfitabilityService.js";


import {
    getProductMixAnalytics
} from "../pharmfly/products/productMixService.js";


let registered =
    false;


export function registerProductsIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    ipcMain.handle(

        "products:top",

        async (
            _event,
            payload
        ) => {

            return getTopProducts({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                limit:
                    payload?.limit

            });

        }

    );


    ipcMain.handle(

        "products:profitability",

        async (
            _event,
            payload
        ) => {

            return getProductProfitability({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                limit:
                    payload?.limit,

                negativeMarginLimit:
                    payload?.negativeMarginLimit

            });

        }

    );


    ipcMain.handle(

        "products:mix",

        async (
            _event,
            payload
        ) => {

            return getProductMixAnalytics({

                branchId:
                    payload?.branchId,

                connection:
                    payload?.connection,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate

            });

        }

    );

}