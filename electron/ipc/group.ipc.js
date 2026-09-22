import {
    ipcMain
} from "electron";


import {
    getGroupSalesOverview
} from "../pharmfly/group/groupAnalyticsService.js";


let registered =
    false;


export function registerGroupIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    ipcMain.handle(

        "group:sales-overview",

        async (
            _event,
            payload
        ) => {

            return getGroupSalesOverview({

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate

            });

        }

    );

}