import { restorePackagedInstallerState } from "./installerStateBootstrap.js";

import {
    app,
    BrowserWindow,
    Menu
} from "electron";


import path from "node:path";


import {
    fileURLToPath
} from "node:url";


import {
    registerConnectionIpc,
    syncCrmPhonesForBranch
} from "./ipc/connection.ipc.js";


import {
    registerSalesIpc
} from "./ipc/sales.ipc.js";


import {
    registerGroupIpc
} from "./ipc/group.ipc.js";


import {
    registerCustomersIpc
} from "./ipc/customers.ipc.js";


import {
    registerDashboardIpc
} from "./ipc/dashboard.ipc.js";


import {
    registerAnalyticsHubIpc
} from "./ipc/analyticsHub.ipc.js";


import {
    registerMasterItemIpc
} from "./ipc/masterItem.ipc.js";
import {
    registerWhatsAppIpc
} from "./ipc/whatsapp.ipc.js";



import {
    getAllSavedConnections
} from "./settings/connectionStore.js";


import {
    getBranchPool,
    closeAllConnections
} from "./connection/connectionManager.js";


import {
    refreshCurrentMonthAllBranches
} from "./cache/cacheWarmupService.js";


import {
    preloadPersistentCache,
    flushPersistentCache
} from "./cache/persistentCacheService.js";


import {
    closeLocalSalesDatabase
} from "./localdb/localSalesDb.js";


const __filename =
    fileURLToPath(
        import.meta.url
    );


const __dirname =
    path.dirname(
        __filename
    );


let mainWindow =
    null;


const DEV_SERVER =
    process.env.PHARMABI_DEV_SERVER === "1";


const DEV_SERVER_URL =
    "http://localhost:5173";


function createWindow() {

    mainWindow =
        new BrowserWindow({

            width:
                1450,

            height:
                900,

            minWidth:
                1100,

            minHeight:
                700,

            show:
                false,

            backgroundColor:
                "#f5f7fb",

            webPreferences: {

                preload:
                    path.join(
                        __dirname,
                        "preload.js"
                    ),

                contextIsolation:
                    true,

                nodeIntegration:
                    false,

                sandbox:
                    false

            }

        });


    mainWindow.once(

        "ready-to-show",

        () => {

            mainWindow.show();

        }

    );


    mainWindow.webContents.on(

        "did-fail-load",

        (
            _event,
            errorCode,
            errorDescription,
            validatedURL
        ) => {

            console.error(

                "[Electron] Renderer failed to load:",

                {

                    errorCode,

                    errorDescription,

                    validatedURL

                }

            );

        }

    );


    if (
        DEV_SERVER
    ) {

        console.log(
            `[Electron] Development renderer: ${DEV_SERVER_URL}`
        );


        mainWindow.loadURL(
            DEV_SERVER_URL
        );

        mainWindow.webContents.openDevTools({
            mode:
                "detach"
        });

    }
    else {

        const productionPath =
            path.join(
                __dirname,
                "../dist/index.html"
            );


        console.log(
            `[Electron] Production renderer: ${productionPath}`
        );


        mainWindow.loadFile(
            productionPath
        );

    }


    mainWindow.on(

        "closed",

        () => {

            mainWindow =
                null;

        }

    );

}


async function autoConnectSavedBranches() {

    let connections =
        [];


    try {

        connections =
            getAllSavedConnections();

    }
    catch (
        error
    ) {

        console.error(

            "[Electron] Failed to load saved connections:",

            error

        );


        return {

            success:
                false,

            connected:
                0,

            failed:
                0

        };

    }


    if (
        !Array.isArray(
            connections
        ) ||
        connections.length ===
        0
    ) {

        console.log(

            "[Electron] No saved branch connections."

        );


        return {

            success:
                true,

            connected:
                0,

            failed:
                0

        };

    }


    console.log(

        `[Electron] Auto-connecting ${connections.length} saved branch(es)...`

    );


    let connected =
        0;


    let failed =
        0;


    for (
        const connection
        of connections
    ) {

        const branchId =
            Number(
                connection?.branchId
            );


        if (
            !Number.isInteger(
                branchId
            ) ||
            branchId <= 0
        ) {

            failed +=
                1;


            continue;

        }


        try {

            const connectPromise =
                getBranchPool(
                    branchId,
                    connection
                );

            const connectTimeout =
                new Promise(
                    (_, reject) => {
                        setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        `Auto-connect timeout after 300000ms for branch ${branchId}`
                                    )
                                ),
                            300000
                        );
                    }
                );

            await Promise.race([
                connectPromise,
                connectTimeout
            ]);


            connected +=
                1;


            console.log(

                `[Electron] Branch ${branchId} connected automatically.`

            );

        }
        catch (
            error
        ) {

            failed +=
                1;


            console.error(

                `[Electron] Branch ${branchId} auto-connect failed:`,

                error

            );

        }

    }


    console.log(

        `[Electron] Auto-connect complete. connected=${connected} failed=${failed}`

    );


    return {

        success:
            failed === 0,

        connected,

        failed

    };

}


let currentMonthRefreshTimer =
    null;


async function startBackgroundWarmup() {

    console.log(
        "[Electron] Initial current-month warmup delayed 300000ms to prioritize UI loading."
    );

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                300000
            )
    );

    try {

        const result =
            await refreshCurrentMonthAllBranches({

                maxRetries:
                    2

            });

        console.log(
            "[Electron] Initial current-month refresh result:",
            result
        );

    }
    catch (
        error
    ) {

        console.error(
            "[Electron] Initial current-month refresh failed:",
            error
        );

    }

    if (
        !currentMonthRefreshTimer
    ) {

        currentMonthRefreshTimer =
            setInterval(
                async () => {

                    try {

                        const result =
                            await refreshCurrentMonthAllBranches({

                                maxRetries:
                                    2

                            });

                        console.log(
                            "[Electron] 10-minute current-month refresh result:",
                            result
                        );

                    }
                    catch (
                        error
                    ) {

                        console.error(
                            "[Electron] 10-minute current-month refresh failed:",
                            error
                        );

                    }

                },
                10 *
                60 *
                1000
            );

        console.log(
            "[Electron] Current-month auto-refresh scheduled every 10 minutes."
        );

    }

}

let crmPhoneSyncTimer =
    null;

let crmPhoneSyncRunning =
    false;


async function runCrmPhoneAutoSync() {

    if (
        crmPhoneSyncRunning
    ) {
        return;
    }

    crmPhoneSyncRunning =
        true;

    try {

        const branches =
            await getAllSavedConnections();

        if (
            !Array.isArray(
                branches
            )
        ) {
            return;
        }

        const results =
            await Promise.allSettled(
                branches.map(
                    async branch => {

                        const branchId =
                            Number(
                                branch?.branchId
                            );

                        if (
                            !Number.isInteger(
                                branchId
                            ) ||
                            branchId <= 0
                        ) {
                            return null;
                        }

                        try {

                            return await syncCrmPhonesForBranch(
                                branchId
                            );

                        } catch (
                            error
                        ) {

                            console.warn(
                                `[CRM Phone AutoSync] Branch ${branchId} unavailable: ${error?.message || error}`
                            );

                            return null;
                        }
                    }
                )
            );

        const successful =
            results
                .filter(
                    result =>
                        result.status ===
                        "fulfilled" &&
                        result.value
                )
                .map(
                    result =>
                        result.value
                );

        if (
            successful.length > 0
        ) {

            console.log(
                "[CRM Phone AutoSync] Completed:",
                successful
            );
        }

    } catch (
        error
    ) {

        console.warn(
            "[CRM Phone AutoSync] General error:",
            error?.message || error
        );

    } finally {

        crmPhoneSyncRunning =
            false;
    }
}


function startCrmPhoneAutoSync() {

    if (
        crmPhoneSyncTimer
    ) {
        return;
    }

    console.log(
        "[CRM Phone AutoSync] Started. Interval = 120000 ms."
    );

    setTimeout(
        () => {
            void runCrmPhoneAutoSync();
        },
        30000
    );

    crmPhoneSyncTimer =
        setInterval(
            () => {
                void runCrmPhoneAutoSync();
            },
            120000
        );
}

app.whenReady()
    .then(
        async () => {

            Menu.setApplicationMenu(null);


            try {

                const cacheState =
                    preloadPersistentCache();


                console.log(

                    "[Electron] Persistent cache preloaded:",

                    cacheState

                );

            }
            catch (
                error
            ) {

                console.error(

                    "[Electron] Persistent cache preload failed:",

                    error

                );

            }


            registerConnectionIpc();

            registerSalesIpc();

            registerGroupIpc();

            registerCustomersIpc();

            registerDashboardIpc();

            registerAnalyticsHubIpc();
            registerMasterItemIpc();
            registerWhatsAppIpc();
            startCrmPhoneAutoSync();
console.log(
                "[Electron] IPC handlers registered."
            );


            createWindow();


            setTimeout(

                async () => {

                    try {

                        const connectionResult =
                            await autoConnectSavedBranches();


                        console.log(

                            "[Electron] Auto-connect result:",

                            connectionResult

                        );


                        startBackgroundWarmup();

                    }
                    catch (
                        error
                    ) {

                        console.error(

                            "[Electron] Unexpected auto-connect failure:",

                            error

                        );


                        startBackgroundWarmup();

                    }

                },

                0

            );


            app.on(

                "activate",

                () => {

                    if (

                        BrowserWindow
                            .getAllWindows()
                            .length ===
                        0

                    ) {

                        createWindow();

                    }

                }

            );

        }

    )
    .catch(

        error => {

            console.error(

                "[Electron] Startup failed:",

                error

            );


            app.quit();

        }

    );


app.on(

    "before-quit",

    async () => {

        try {

            await flushPersistentCache();


            console.log(

                "[Electron] Persistent cache flushed."

            );

        }
        catch (
            error
        ) {

            console.error(

                "[Electron] Persistent cache flush failed:",

                error

            );

        }


        try {

            closeLocalSalesDatabase();

        }
        catch (
            error
        ) {

            console.error(

                "[Electron] Local SQLite cleanup failed:",

                error

            );

        }


        try {

            await closeAllConnections();


            console.log(

                "[Electron] SQL connections closed."

            );

        }
        catch (
            error
        ) {

            console.error(

                "[Electron] Connection cleanup failed:",

                error

            );

        }

    }

);


app.on(

    "window-all-closed",

    () => {

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();

        }

    }

);

