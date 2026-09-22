const fs = require("node:fs");
const path = require("node:path");

const ROOT =
    "D:\\PharmaBI-Live-Desktop";


function read(
    file
) {

    return fs.readFileSync(
        path.join(
            ROOT,
            file
        ),
        "utf8"
    );

}


function write(
    file,
    value
) {

    fs.writeFileSync(
        path.join(
            ROOT,
            file
        ),
        value,
        "utf8"
    );

}


function replaceOnce(
    text,
    search,
    replacement,
    label
) {

    if (
        !text.includes(
            search
        )
    ) {

        throw new Error(
            `لم أجد مكان التعديل: ${label}`
        );

    }


    return text.replace(
        search,
        replacement
    );

}


// ============================================================
// IPC
// ============================================================

let ipc =
    read(
        "electron\\ipc\\masterItem.ipc.js"
    );


ipc =
    replaceOnce(
        ipc,

        `    createMasterFromReviewGroup,
    getMasterItemStats
`,

        `    createMasterFromReviewGroup,
    getMasterItemStats
} from "../masterItem/masterItemService.js";


import {
    getCurrentItemPrices,
    getMasterManagementList,
    getMasterManagementDetails,
    updateMasterName,
    removeMasterMember,
    cancelMaster
} from "../masterItem/masterManagementService.js";
`,

        "IPC imports"
    );


// إزالة التكرار الناتج من الاستبدال السابق في حالة وجود from
ipc =
    ipc.replace(
        `    getMasterManagementList,
    getMasterManagementDetails,
    updateMasterName,
    removeMasterMember,
    cancelMaster
} from "../masterItem/masterManagementService.js";

`,

        `    getMasterManagementList,
    getMasterManagementDetails,
    updateMasterName,
    removeMasterMember,
    cancelMaster
} from "../masterItem/masterManagementService.js";

`
    );


const statsAnchor =
`    ipcMain.handle(
        "master-item:stats",`;


const managementHandlers =
`

    ipcMain.handle(
        "master-item:prices",
        async (
            _event,
            payload
        ) => {

            return getCurrentItemPrices(
                payload?.items || []
            );

        }
    );


    ipcMain.handle(
        "master-item:management-list",
        async (
            _event,
            payload
        ) => {

            return getMasterManagementList(
                {
                    search:
                        payload?.search,

                    sortBy:
                        payload?.sortBy
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-get",
        async (
            _event,
            payload
        ) => {

            return getMasterManagementDetails(
                payload?.masterItemId
            );

        }
    );


    ipcMain.handle(
        "master-item:management-update-name",
        async (
            _event,
            payload
        ) => {

            return updateMasterName(
                {
                    masterItemId:
                        payload?.masterItemId,

                    canonicalName:
                        payload?.canonicalName
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-remove-member",
        async (
            _event,
            payload
        ) => {

            return removeMasterMember(
                {
                    masterItemId:
                        payload?.masterItemId,

                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-cancel",
        async (
            _event,
            payload
        ) => {

            return cancelMaster(
                payload?.masterItemId
            );

        }
    );

`;


ipc =
    replaceOnce(
        ipc,
        statsAnchor,
        managementHandlers +
        statsAnchor,
        "IPC handlers"
    );


write(
    "electron\\ipc\\masterItem.ipc.js",
    ipc
);


// ============================================================
// PRELOAD
// ============================================================

let preload =
    read(
        "electron\\preload.js"
    );


const preloadAnchor =
`            stats:
                () =>
                    ipcRenderer.invoke(
                        "master-item:stats",`;


const preloadMethods =
`            prices:
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

`;


preload =
    replaceOnce(
        preload,
        preloadAnchor,
        preloadMethods +
        preloadAnchor,
        "preload methods"
    );


write(
    "electron\\preload.js",
    preload
);


// ============================================================
// PAGE
// ============================================================

let page =
    read(
        "src\\components\\MasterItemPage.jsx"
    );


const importAnchor =
`import {
    useEffect,
    useMemo,
    useState
} from "react";
`;


page =
    replaceOnce(
        page,
        importAnchor,
        importAnchor +
        `

import MasterManagementPanel from "./MasterManagementPanel.jsx";
`,
        "MasterManagementPanel import"
    );


const searchButtonEnd =
`                </button>

            </div>


            {
                stats && (`;


const searchButtonWithManagement =
`                </button>


                <button
                    type="button"
                    onClick={() =>
                        setActiveTab(
                            "masters"
                        )
                    }
                    className={
                        activeTab === "masters"
                            ? "primary-button"
                            : "secondary-button"
                    }
                >
                    الأسماء الموحدة
                </button>

            </div>


            {
                stats && (`;


page =
    replaceOnce(
        page,
        searchButtonEnd,
        searchButtonWithManagement,
        "Master tab button"
    );


const reviewAnchor =
`            {
                activeTab === "review" && (`;


page =
    replaceOnce(
        page,
        reviewAnchor,
        `            {
                activeTab === "masters" && (

                    <MasterManagementPanel />

                )
            }


${reviewAnchor}`,
        "Master management render"
    );


write(
    "src\\components\\MasterItemPage.jsx",
    page
);


console.log(
    "Master Management wired successfully."
);