import {
    ipcMain
} from "electron";


import {
    getSalesByDay
} from "../pharmfly/sales/salesByDayService.js";


let registered =
    false;


export function registerSalesByDayIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    ipcMain.handle(

        "sales:by-day",

        async (
            _event,
            payload
        ) => {

            return getSalesByDay({

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