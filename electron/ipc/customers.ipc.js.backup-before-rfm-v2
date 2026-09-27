import {
    ipcMain
} from "electron";


import {
    getCustomerRfm
} from "../pharmfly/customers/customerRfmService.js";


import {
    getCustomerIntelligence
} from "../pharmfly/customers/customerIntelligenceService.js";


import {
    getCustomerRetention
} from "../pharmfly/customers/customerRetentionService.js";


import {
    getCustomerInactivity
} from "../pharmfly/customers/customerInactivityService.js";


import {
    getCustomerClv
} from "../pharmfly/customers/customerClvService.js";


import {
    getCustomerCohort
} from "../pharmfly/customers/customerCohortService.js";


let registered =
    false;


export function registerCustomersIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    ipcMain.handle(

        "customers:rfm",

        async (
            _event,
            payload
        ) => {

            return getCustomerRfm({

                branchId:
                    payload?.branchId,

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

        "customers:intelligence",

        async (
            _event,
            payload
        ) => {

            return getCustomerIntelligence({

                branchId:
                    payload?.branchId,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate

            });

        }

    );


    ipcMain.handle(

        "customers:retention",

        async (
            _event,
            payload
        ) => {

            return getCustomerRetention({

                branchId:
                    payload?.branchId,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate

            });

        }

    );


    ipcMain.handle(

        "customers:inactivity",

        async (
            _event,
            payload
        ) => {

            return getCustomerInactivity({

                branchId:
                    payload?.branchId,

                toDate:
                    payload?.toDate,

                sampleLimit:
                    payload?.sampleLimit

            });

        }

    );


    ipcMain.handle(

        "customers:clv",

        async (
            _event,
            payload
        ) => {

            return getCustomerClv({

                branchId:
                    payload?.branchId,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                observationDays:
                    payload?.observationDays,

                limit:
                    payload?.limit

            });

        }

    );


    ipcMain.handle(

        "customers:cohort",

        async (
            _event,
            payload
        ) => {

            return getCustomerCohort({

                branchId:
                    payload?.branchId,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                maxMonths:
                    payload?.maxMonths

            });

        }

    );

}