import {
    app
} from "electron";


import {
    getCustomerRfmV2
} from "../electron/pharmfly/customers/customerRfmV2Service.js";


await app.whenReady();


try {

    console.log("");
    console.log("========================================");
    console.log("      PHARMABI RFM 2.0 TEST");
    console.log("========================================");
    console.log("");


    const result =
        await getCustomerRfmV2({

            branchId:
                1,

            analysisDate:
                "2026-09-24",

            observationDays:
                365,

            trendDays:
                90,

            minTickets:
                1,

            saveSnapshot:
                false

        });


    console.log("");
    console.log("===== SUMMARY =====");
    console.log(
        JSON.stringify(
            result.summary,
            null,
            2
        )
    );


    console.log("");
    console.log("===== FIRST 20 CUSTOMERS =====");

    for (
        const customer
        of result.customers.slice(
            0,
            20
        )
    ) {

        console.log(
            JSON.stringify(
                {

                    customerId:
                        customer.customerId,

                    customerName:
                        customer.customerName,

                    rfm:
                        customer.rfmScore,

                    segment:
                        customer.segmentCode,

                    lifecycle:
                        customer.lifecycleStage,

                    recencyDays:
                        customer.recencyDays,

                    tickets:
                        customer.ticketCount,

                    netSales:
                        customer.netSales,

                    grossProfit:
                        customer.grossProfit,

                    avgTicket:
                        customer.averageTicketValue,

                    interval:
                        customer.averageDaysBetweenPurchases,

                    monthlyFrequency:
                        customer.monthlyFrequency,

                    trend:
                        customer.purchaseTrend,

                    trendPercent:
                        customer.purchaseTrendPercent,

                    customerValue:
                        customer.customerValueScore,

                    crmPriority:
                        customer.crmPriorityScore,

                    priorityLevel:
                        customer.crmPriorityLevel,

                    action:
                        customer.recommendedAction

                }
            )
        );

    }


    console.log("");
    console.log("RFM 2.0 TEST SUCCESS");
    console.log("");

}
catch (
    error
) {

    console.error("");
    console.error(
        "RFM 2.0 TEST FAILED"
    );
    console.error(
        error?.stack ||
        error?.message ||
        error
    );
    console.error("");

    process.exitCode =
        1;

}
finally {

    app.quit();

}