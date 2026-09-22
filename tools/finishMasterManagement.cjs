const fs = require("node:fs");
const path = require("node:path");

const ROOT = "D:\\PharmaBI-Live-Desktop";

function read(file) {
    return fs.readFileSync(
        path.join(ROOT, file),
        "utf8"
    );
}

function write(file, value) {
    fs.writeFileSync(
        path.join(ROOT, file),
        value,
        "utf8"
    );
}


// ============================================================
// PRELOAD
// ============================================================

let preload = read(
    "electron\\preload.js"
);

if (!preload.includes("managementList:")) {

    const anchor =
`            stats:
                () =>
                    ipcRenderer.invoke(
                        "master-item:stats"
                    )`;

    const methods =
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

    if (!preload.includes(anchor)) {
        throw new Error(
            "لم أجد مكان stats في preload.js"
        );
    }

    preload =
        preload.replace(
            anchor,
            methods + anchor
        );

    write(
        "electron\\preload.js",
        preload
    );

    console.log(
        "PRELOAD: added management API."
    );

} else {

    console.log(
        "PRELOAD: management API already exists."
    );

}


// ============================================================
// PAGE IMPORT
// ============================================================

let page = read(
    "src\\components\\MasterItemPage.jsx"
);

const reactImport =
`import {
    useEffect,
    useMemo,
    useState
} from "react";`;

if (
    !page.includes(
        'MasterManagementPanel from "./MasterManagementPanel.jsx"'
    )
) {

    if (
        !page.includes(
            reactImport
        )
    ) {

        throw new Error(
            "لم أجد React import في MasterItemPage.jsx"
        );

    }

    page =
        page.replace(
            reactImport,
            reactImport +
            `

import MasterManagementPanel from "./MasterManagementPanel.jsx";`
        );

    console.log(
        "PAGE: added MasterManagementPanel import."
    );

}


// ============================================================
// MASTER TAB BUTTON
// ============================================================

if (
    !page.includes(
        'setActiveTab(
                            "masters"'
    )
) {

    const searchTabRegex =
        /<button[\s\S]*?activeTab === "search"[\s\S]*?<\/button>/;

    const match =
        page.match(
            searchTabRegex
        );

    if (!match) {

        throw new Error(
            "لم أجد زر البحث في التبويبات."
        );

    }

    const masterButton =
`
                
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
                </button>`;

    page =
        page.replace(
            match[0],
            match[0] +
            masterButton
        );

    console.log(
        "PAGE: added Masters tab."
    );

} else {

    console.log(
        "PAGE: Masters tab already exists."
    );

}


// ============================================================
// MASTER MANAGEMENT RENDER
// ============================================================

if (
    !page.includes(
        "<MasterManagementPanel />"
    )
) {

    const renderRegex =
        /(\s*\{\s*activeTab === "review" && \([\s\S]*?)/;

    const match =
        page.match(
            renderRegex
        );

    if (!match) {

        throw new Error(
            "لم أجد منطقة review في الصفحة."
        );

    }

    const managementRender =
`
            {
                activeTab === "masters" && (

                    <MasterManagementPanel />

                )
            }

`;

    page =
        page.replace(
            match[1],
            managementRender +
            match[1]
        );

    console.log(
        "PAGE: added Masters render."
    );

} else {

    console.log(
        "PAGE: Masters render already exists."
    );

}


write(
    "src\\components\\MasterItemPage.jsx",
    page
);


// ============================================================
// DONE
// ============================================================

console.log("");
console.log(
    "Master Management wiring completed successfully."
);