import { app } from "electron";

import {
    getBranchConnection
} from "./electron/settings/connectionStore.js";

import {
    getBranchPool
} from "./electron/connection/connectionManager.js";

await app.whenReady();

try {
    const connection = getBranchConnection(1);

    const pool = await getBranchPool(
        1,
        connection
    );

    const result = await pool
        .request()
        .input("customerId", 6048)
        .query(`
            SELECT
                ID,
                Name,
                IsCustomer,
                IsHDCustomer,
                IsCreditCustomer,
                IsDeliveryBoy
            FROM dbo.Cards
            WHERE ID = @customerId;
        `);

    console.table(result.recordset);

    await pool.close();
}
catch (error) {
    console.error(error);
}
finally {
    app.quit();
}
