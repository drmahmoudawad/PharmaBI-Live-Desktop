import { app } from "electron";

import {
    getBranchConnection
} from "./electron/settings/connectionStore.js";

import {
    getBranchPool
} from "./electron/connection/connectionManager.js";

await app.whenReady();

try {
    const connection =
        getBranchConnection(1);

    const pool =
        await getBranchPool(
            1,
            connection
        );

    const result =
        await pool
            .request()
            .input(
                "customerId",
                6048
            )
            .query(`
                SELECT TOP (30)

                    ID AS TicketID,
                    ztime,
                    CustomerID,
                    CustomerType,
                    Total,
                    Discount,
                    DiscountOnItems,
                    SalesReturn,

                    PinNumber,
                    SalesRepID,
                    StoreID,

                    DeliveryBoyId,
                    Table_ID,
                    WaiterId,
                    PricingTypeID,

                    InvoiceCode,
                    InvoiceDate,

                    subCustomer,
                    SubCustomerX,

                    MachineName

                FROM dbo.posTickets

                WHERE CustomerID = @customerId

                ORDER BY ID DESC;
            `);

    console.table(
        result.recordset
    );

    await pool.close();
}
catch (error) {
    console.error(error);
}
finally {
    app.quit();
}
