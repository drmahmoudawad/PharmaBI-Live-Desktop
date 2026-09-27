import { app } from "electron";

import {
    getBranchConnection
} from "./electron/settings/connectionStore.js";

import {
    getBranchPool
} from "./electron/connection/connectionManager.js";

const branchId = 1;

await app.whenReady();

try {
    const connection =
        getBranchConnection(branchId);

    const pool =
        await getBranchPool(
            branchId,
            connection
        );

    const result =
        await pool
            .request()
            .query(`
                SELECT
                    IsHDCustomer,
                    COUNT(*) AS customer_count
                FROM dbo.Cards
                WHERE IsCustomer = 1
                GROUP BY IsHDCustomer
                ORDER BY IsHDCustomer;
            `);

    console.table(
        result.recordset
    );

    const samples =
        await pool
            .request()
            .query(`
                SELECT TOP 15
                    ID,
                    Name,
                    IsCustomer,
                    IsHDCustomer
                FROM dbo.Cards
                WHERE IsCustomer = 1
                  AND IsHDCustomer = 1
                ORDER BY ID DESC;
            `);

    console.table(
        samples.recordset
    );

    await pool.close();
}
catch (error) {
    console.error("BRANCH 1 HD CHECK FAILED:");
    console.error(error);
}
finally {
    app.quit();
}
