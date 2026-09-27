import { app } from "electron";

import {
    getBranchConnection
} from "./electron/settings/connectionStore.js";

import {
    getBranchPool
} from "./electron/connection/connectionManager.js";

const branchId = 1;
const targetName = "محمود سامي 01067400797";

await app.whenReady();

try {
    const connection =
        getBranchConnection(branchId);

    const pool =
        await getBranchPool(
            branchId,
            connection
        );

    console.log("\n===== CUSTOMER CARD =====");

    const customerResult =
        await pool
            .request()
            .input(
                "customerName",
                targetName
            )
            .query(`
                SET NOCOUNT ON;

                SELECT
                    ID,
                    Name,
                    IsCustomer,
                    IsHDCustomer,
                    IsCreditCustomer,
                    IsDeliveryBoy,
                    IsSalesRep,
                    IsEmployee,
                    IsWaiter
                FROM dbo.Cards
                WHERE
                    LTRIM(RTRIM(Name)) =
                    LTRIM(RTRIM(@customerName));
            `);

    console.table(
        customerResult.recordset
    );

    const customers =
        customerResult.recordset || [];

    if (customers.length === 0) {
        console.log("CUSTOMER NOT FOUND");
        await pool.close();
        app.quit();
    }

    for (const customer of customers) {

        const customerId =
            customer.ID;

        console.log(
            `\n===== PURCHASES FOR CUSTOMER ID ${customerId} =====`
        );

        const ticketResult =
            await pool
                .request()
                .input(
                    "customerId",
                    customerId
                )
                .query(`
                    SET NOCOUNT ON;

                    SELECT TOP (100)

                        t.ID AS TicketID,
                        t.ztime,
                        t.zEndTime,

                        t.CustomerID,
                        t.CustomerType,

                        t.Total,
                        t.Discount,
                        t.DiscountOnItems,

                        t.PaidByCustomer,
                        t.Collected,

                        t.SalesReturn,

                        t.PinNumber,
                        t.SalesRepID,

                        t.StoreID,

                        t.DeliveryBoyId,

                        t.Table_ID,
                        t.WaiterId,

                        t.PricingTypeID,

                        t.InvoiceCode,
                        t.InvoiceDate,

                        t.subCustomer,
                        t.SubCustomerX,

                        t.MachineName

                    FROM dbo.posTickets t

                    WHERE
                        t.CustomerID =
                        @customerId

                    ORDER BY
                        t.ID DESC;
                `);

        console.table(
            ticketResult.recordset
        );

        const summaryResult =
            await pool
                .request()
                .input(
                    "customerId",
                    customerId
                )
                .query(`
                    SET NOCOUNT ON;

                    SELECT

                        COUNT(*) AS ticket_count,

                        SUM(
                            CASE
                                WHEN SalesReturn = 1
                                THEN ISNULL(Total,0)
                                ELSE 0
                            END
                        ) AS sales_total,

                        SUM(
                            CASE
                                WHEN SalesReturn = 2
                                THEN ISNULL(Total,0)
                                ELSE 0
                            END
                        ) AS returns_total,

                        MIN(ztime) AS first_purchase,
                        MAX(ztime) AS last_purchase,

                        COUNT(
                            DISTINCT CustomerType
                        ) AS customer_type_count

                    FROM dbo.posTickets

                    WHERE
                        CustomerID =
                        @customerId;
                `);

        console.log("\n===== SUMMARY =====");

        console.table(
            summaryResult.recordset
        );
    }

    await pool.close();
}
catch (error) {
    console.error("\nCUSTOMER PURCHASE CHECK FAILED:");
    console.error(error);
}
finally {
    app.quit();
}
