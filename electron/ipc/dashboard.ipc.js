import {
    ipcMain
} from "electron";


import {
    getDashboardOverview
} from "../pharmfly/dashboardOverviewService.js";


import {
    getSellerPerformance
} from "../pharmfly/sellerPerformanceService.js";


import {
    getCustomerPerformance,
    getCustomerInvoiceDetails
} from "../pharmfly/customers/customerPerformanceService.js";


import {
    getBranchPerformance,
    getBranchForecast
} from "../pharmfly/branchPerformanceService.js";


import {
    getBranchMonthlyTarget,
    saveBranchMonthlyTarget,
    getAllBranchTargets
} from "../settings/branchTargetStore.js";


let registered =
    false;


export function registerDashboardIpc() {

    if (
        registered
    ) {
        return;
    }


    registered =
        true;


    ipcMain.handle(

        "dashboard:overview",

        async (
            _event,
            payload
        ) => {

            /*
             * =====================================================
             * SELLER PERFORMANCE
             * =====================================================
             */

            if (
                payload?.action ===
                "seller-performance"
            ) {

                return getSellerPerformance({

                    branchId:
                        payload?.branchId,

                    employeeId:
                        payload?.employeeId,

                    fromDate:
                        payload?.fromDate,

                    toDate:
                        payload?.toDate,

                    connection:
                        payload?.connection ||
                        null,

                    historyMonths:
                        payload?.historyMonths

                });

            }


            /*
             * =====================================================
             * CUSTOMER PERFORMANCE
             * =====================================================
             */

            if (
                payload?.action ===
                "customer-performance"
            ) {

                return getCustomerPerformance({

                    branchId:
                        payload?.branchId,

                    customerId:
                        payload?.customerId,

                    fromDate:
                        payload?.fromDate,

                    toDate:
                        payload?.toDate,

                    connection:
                        payload?.connection ||
                        null,

                    historyMonths:
                        payload?.historyMonths

                });

            }


            /*
             * =====================================================
             * CUSTOMER INVOICE DETAILS
             * =====================================================
             */

            if (
                payload?.action ===
                "customer-invoice-details"
            ) {

                return getCustomerInvoiceDetails({

                    branchId:
                        payload?.branchId,

                    ticketId:
                        payload?.ticketId,

                    connection:
                        payload?.connection ||
                        null

                });

            }


            /*
             * =====================================================
             * BRANCH PERFORMANCE
             * =====================================================
             */

            if (
                payload?.action ===
                "branch-performance"
            ) {

                return getBranchPerformance({

                    branchId:
                        payload?.branchId,

                    toDate:
                        payload?.toDate,

                    connection:
                        payload?.connection ||
                        null,

                    historyMonths:
                        payload?.historyMonths,

                    mode:
                        payload?.mode ||
                        "branch",

                    month:
                        payload?.month ||
                        null

                });

            }


            /*
             * =====================================================
             * BRANCH FORECAST
             * =====================================================
             */

            if (
                payload?.action ===
                "branch-forecast"
            ) {

                return getBranchForecast({

                    branchId:
                        payload?.branchId,

                    toDate:
                        payload?.toDate,

                    connection:
                        payload?.connection ||
                        null,

                    historyMonths:
                        payload?.historyMonths

                });

            }


            /*
             * =====================================================
             * BRANCH TARGET - GET
             * =====================================================
             */

            if (
                payload?.action ===
                "branch-target-get"
            ) {

                return getBranchMonthlyTarget({

                    branchId:
                        payload?.branchId,

                    month:
                        payload?.month

                });

            }


            /*
             * =====================================================
             * BRANCH TARGET - SAVE / UPDATE
             * =====================================================
             */

            if (
                payload?.action ===
                "branch-target-save"
            ) {

                return saveBranchMonthlyTarget({

                    branchId:
                        payload?.branchId,

                    month:
                        payload?.month,

                    forecastDaily:
                        payload?.forecastDaily,

                    programTargetADaily:
                        payload?.programTargetADaily,

                    programTargetBDaily:
                        payload?.programTargetBDaily,

                    managementTargetADaily:
                        payload?.managementTargetADaily,

                    managementTargetBDaily:
                        payload?.managementTargetBDaily

                });

            }


            /*
             * =====================================================
             * BRANCH TARGET - ALL
             * =====================================================
             */

            if (
                payload?.action ===
                "branch-target-all"
            ) {

                return {
                    success: true,

                    targets:
                        getAllBranchTargets()

                };

            }


            /*
             * =====================================================
             * DEFAULT DASHBOARD OVERVIEW
             * =====================================================
             */

            return getDashboardOverview({

                branchId:
                    payload?.branchId,

                fromDate:
                    payload?.fromDate,

                toDate:
                    payload?.toDate,

                connection:
                    payload?.connection ||
                    null

            });

        }

    );


    console.log(
        "[Electron] Dashboard IPC handlers registered."
    );

}


export default {
    registerDashboardIpc
};