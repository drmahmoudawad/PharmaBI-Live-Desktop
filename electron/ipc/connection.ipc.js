import {
    ipcMain
} from "electron";


import {
    testBranchConnection,
    closeBranchConnection,
    getActiveBranchConnections,
    getBranchPool
} from "../connection/connectionManager.js";


import {
    saveBranchConnection,
    renameBranch,
    getBranchConnection,
    getAllSavedConnections,
    deleteBranchConnection
} from "../settings/connectionStore.js";


let registered =
    false;


function normalizeBranchId(
    value
) {

    const branchId =
        Number(
            value
        );


    if (
        !Number.isInteger(
            branchId
        ) ||
        branchId <= 0
    ) {

        throw new Error(
            "Invalid branchId"
        );

    }


    return branchId;

}


function normalizeBranchName(
    value,
    branchId
) {

    const name =
        String(
            value ||
            ""
        ).trim();


    return name ||
        `Branch ${branchId}`;

}


function normalizeConnection(
    connection
) {

    if (
        !connection ||
        typeof connection !==
            "object"
    ) {

        throw new Error(

            "Connection configuration is required"

        );

    }


    const server =
        String(
            connection.server ||
            ""
        ).trim();


    const port =
        Number(
            connection.port ||
            1433
        );


    const database =
        String(
            connection.database ||
            ""
        ).trim();


    const user =
        String(
            connection.user ||
            ""
        ).trim();


    const password =
        String(
            connection.password ||
            ""
        );


    if (
        !server
    ) {

        throw new Error(
            "SQL Server is required"
        );

    }


    if (
        !Number.isInteger(
            port
        ) ||
        port <= 0
    ) {

        throw new Error(
            "Invalid SQL Server port"
        );

    }


    if (
        !database
    ) {

        throw new Error(
            "Database is required"
        );

    }


    if (
        !user
    ) {

        throw new Error(
            "SQL User is required"
        );

    }


    return {

        server,

        port,

        database,

        user,

        password

    };

}


export function registerConnectionIpc() {

    if (
        registered
    ) {

        return;

    }


    registered =
        true;


    /*
     * =========================================================
     * TEST
     * =========================================================
     */

    ipcMain.handle(

        "connection:test",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            const connection =
                normalizeConnection(
                    payload?.connection
                );


            const result =
                await testBranchConnection(

                    branchId,

                    connection

                );


            const existing =
                getBranchConnection(
                    branchId
                );


            const branchName =
                normalizeBranchName(

                    payload?.branchName ||
                    existing?.branchName,

                    branchId

                );


            saveBranchConnection({

                branchId,

                branchName,

                connection

            });


            return {

                ...result,

                branchId,

                branchName,

                settingsSaved:
                    true

            };

        }

    );


    /*
     * =========================================================
     * SAVE
     * =========================================================
     */

    ipcMain.handle(

        "connection:save",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            const connection =
                normalizeConnection(
                    payload?.connection
                );


            const existing =
                getBranchConnection(
                    branchId
                );


            const branchName =
                normalizeBranchName(

                    payload?.branchName ||
                    existing?.branchName,

                    branchId

                );


            return saveBranchConnection({

                branchId,

                branchName,

                connection

            });

        }

    );


    /*
     * =========================================================
     * RENAME
     * =========================================================
     */

    ipcMain.handle(

        "connection:rename",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            const branchName =
                normalizeBranchName(

                    payload?.branchName,

                    branchId

                );


            return renameBranch({

                branchId,

                branchName

            });

        }

    );


    /*
     * =========================================================
     * GET SAVED
     * =========================================================
     */

    ipcMain.handle(

        "connection:get-saved",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            return getBranchConnection(
                branchId
            );

        }

    );


    /*
     * =========================================================
     * GET ALL
     * =========================================================
     */

    ipcMain.handle(

        "connection:get-all-saved",

        async () => {

            return getAllSavedConnections();

        }

    );


    /*
     * =========================================================
     * DELETE
     * =========================================================
     */

    ipcMain.handle(

        "connection:delete-saved",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            try {

                await closeBranchConnection(
                    branchId
                );

            }
            catch (
                error
            ) {

                console.error(

                    `[connection] Failed to close branch ${branchId} before deletion:`,

                    error

                );

            }


            return deleteBranchConnection(
                branchId
            );

        }

    );


    /*
     * =========================================================
     * CLOSE
     * =========================================================
     */

    ipcMain.handle(

        "connection:close",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            await closeBranchConnection(
                branchId
            );


            return {

                success:
                    true,

                branchId

            };

        }

    );


    /*
     * =========================================================
     * ACTIVE
     * =========================================================
     */

    ipcMain.handle(

        "connection:active",

        async () => {

            return getActiveBranchConnections();

        }

    );


    /*
     * =========================================================
     * CONNECT SAVED
     * =========================================================
     */

    ipcMain.handle(

        "connection:connect-saved",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            const saved =
                getBranchConnection(
                    branchId
                );


            if (
                !saved
            ) {

                throw new Error(

                    `No saved connection for branch ${branchId}.`

                );

            }


            await getBranchPool(

                branchId,

                saved

            );


            return {

                success:
                    true,

                branchId,

                branchName:
                    saved.branchName

            };

        }

    );
    /*
     * =========================================================
     * TEMP DELIVERY DIAGNOSTIC
     * =========================================================
     */

    ipcMain.handle(

        "connection:inspect-delivery",

        async (
            _event,
            payload
        ) => {

            const branchId =
                normalizeBranchId(
                    payload?.branchId
                );


            const saved =
                getBranchConnection(
                    branchId
                );


            if (
                !saved
            ) {

                throw new Error(
                    `No saved connection for branch ${branchId}.`
                );

            }


            const pool =
                await getBranchPool(

                    branchId,

                    saved

                );


            const result =
                await pool
                    .request()
                    .query(`

                        SELECT

                            COUNT(*) AS total_delivery_lines,

                            COUNT(
                                DISTINCT
                                CASE
                                    WHEN ISNULL(
                                        t.DeliveryBoyId,
                                        0
                                    ) > 0
                                    THEN t.ID
                                END
                            ) AS delivery_tickets,

                            SUM(
                                CASE
                                    WHEN
                                        ISNULL(
                                            t.DeliveryBoyId,
                                            0
                                        ) > 0
                                    AND
                                        ISNULL(
                                            t.SalesReturn,
                                            0
                                        ) <> 2
                                    THEN
                                        ISNULL(
                                            t.Total,
                                            0
                                        )
                                    ELSE 0
                                END
                            ) AS delivery_sales

                        FROM posTickets t

                        WHERE

                            t.ztime >=
                            '2026-08-01'

                        AND

                            t.ztime <
                            '2026-09-01'

                    `);


            const row =
                result?.recordset?.[0] ||
                {};


            console.log(

                `[Delivery Diagnostic] Branch ${branchId}:`,

                row

            );


            return {

                success:
                    true,

                branchId,

                ...row

            };

        }

    );
}