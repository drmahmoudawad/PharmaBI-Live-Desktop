import {
    contextBridge,
    ipcRenderer
} from "electron";


contextBridge.exposeInMainWorld(
    "pharmaBI",
    {

        connection: {
            test: payload => ipcRenderer.invoke("connection:test", payload),
            save: payload => ipcRenderer.invoke("connection:save", payload),
            rename: payload => ipcRenderer.invoke("connection:rename", payload),
            getSaved: branchId => ipcRenderer.invoke("connection:get-saved", { branchId }),
            getAllSaved: () => ipcRenderer.invoke("connection:get-all-saved"),
            deleteSaved: branchId => ipcRenderer.invoke("connection:delete-saved", { branchId }),
            connectSaved: branchId => ipcRenderer.invoke("connection:connect-saved", { branchId }),
            close: branchId => ipcRenderer.invoke("connection:close", { branchId }),
            active: () => ipcRenderer.invoke("connection:active")
        },

        sales: {
            get: payload => ipcRenderer.invoke("sales:get", payload),
            preview: payload => ipcRenderer.invoke("sales:preview", payload),
            summary: payload => ipcRenderer.invoke("sales:summary", payload),
            deliverySummary: payload => ipcRenderer.invoke("sales:delivery-summary", payload),
            reconciliation: payload => ipcRenderer.invoke("sales:reconciliation", payload),
            byDay: payload => ipcRenderer.invoke("sales:by-day", payload),
            byHour: payload => ipcRenderer.invoke("sales:by-hour", payload),
            performance: payload => ipcRenderer.invoke("sales:performance", payload),
            cacheClear: payload => ipcRenderer.invoke("sales:cache:clear", payload),
            cacheStats: () => ipcRenderer.invoke("sales:cache:stats"),
            cacheCoverage:
                payload =>
                    ipcRenderer.invoke(
                        "sales:cache:coverage",
                        payload
                    )
        },

        masterItem: {

            search:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:search",
                        payload
                    ),

            resolve:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:resolve",
                        payload
                    ),

            get:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:get",
                        payload
                    ),


            searchExisting:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:search-existing",
                        payload
                    ),

            createManual:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:create-manual",
                        payload
                    ),
            reviewQueue:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:reviewQueue",
                        payload
                    ),

            reviewSearch:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:reviewSearch",
                        payload
                    ),

            reviewGroup:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:reviewGroup",
                        payload
                    ),

            decide:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:decide",
                        payload
                    ),

            decideGroup:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:decide-group",
                        payload
                    ),

            createNew:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:create-new",
                        payload
                    ),

            createNewGroup:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:create-new-group",
                        payload
                    ),

            prices:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:prices",
                        payload
                    ),

            managementList:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:management-list",
                        payload
                    ),

            managementGet:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:management-get",
                        payload
                    ),

            managementUpdateName:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:management-update-name",
                        payload
                    ),

            managementRemoveMember:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:management-remove-member",
                        payload
                    ),

            managementCancel:
                payload =>
                    ipcRenderer.invoke(
                        "master-item:management-cancel",
                        payload
                    ),
            stats:
                () =>
                    ipcRenderer.invoke(
                        "master-item:stats"
                    )
        },


        dashboard: {
            get: payload => ipcRenderer.invoke("dashboard:get", payload),
            overview: payload => ipcRenderer.invoke("dashboard:overview", payload)
        },

        group: {
            salesOverview: payload => ipcRenderer.invoke("group:sales-overview", payload)
        },

        customers: {
            rfm: payload => ipcRenderer.invoke("customers:rfm", payload),
            intelligence: payload => ipcRenderer.invoke("customers:intelligence", payload),
            retention: payload => ipcRenderer.invoke("customers:retention", payload),
            inactivity: payload => ipcRenderer.invoke("customers:inactivity", payload),
            clv: payload => ipcRenderer.invoke("customers:clv", payload),
            cohort: payload => ipcRenderer.invoke("customers:cohort", payload)
        },

        analytics: {

            module:
                payload =>
                    ipcRenderer.invoke(
                        "analytics:module",
                        payload
                    )

        },


        products: {
            overview: payload => ipcRenderer.invoke("products:overview", payload),
            top: payload => ipcRenderer.invoke("products:top", payload),
            profitability: payload => ipcRenderer.invoke("products:profitability", payload)
        }
    }
);
