const fs = require("node:fs");
const path = require("node:path");

const ROOT = "D:\\PharmaBI-Live-Desktop";

function read(file) {
    return fs.readFileSync(
        path.join(ROOT, file),
        "utf8"
    );
}

function write(file, text) {
    fs.writeFileSync(
        path.join(ROOT, file),
        text,
        "utf8"
    );
}


// ============================================================
// PRELOAD
// ============================================================

const preloadFile =
    "electron\\preload.js";

let preload =
    read(preloadFile);


if (!preload.includes("managementList:")) {

    const statsAnchor =
`            stats:
                () =>
                    ipcRenderer.invoke(
                        "master-item:stats"
                    )`;

    if (!preload.includes(statsAnchor)) {
        throw new Error(
            "لم أجد stats داخل preload.js"
        );
    }

    const managementApi =
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
        preload.replace(
            statsAnchor,
            managementApi +
            statsAnchor
        );

    write(
        preloadFile,
        preload
    );

    console.log(
        "PRELOAD: added"
    );

} else {

    console.log(
        "PRELOAD: already exists"
    );

}


// ============================================================
// PAGE
// ============================================================

const pageFile =
    "src\\components\\MasterItemPage.jsx";

let page =
    read(pageFile);


// import
if (
    !page.includes(
        "MasterManagementPanel"
    )
) {

    const reactImport =
`import {
    useEffect,
    useMemo,
    useState
} from "react";`;

    if (
        !page.includes(
            reactImport
        )
    ) {
        throw new Error(
            "لم أجد React imports"
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
        "PAGE: import added"
    );

}


// ============================================================
// TAB BUTTON
// ============================================================

if (
    !page.includes(
        '"masters"'
    )
) {

    const searchButtonRegex =
        /<button[\s\S]*?activeTab\s*===\s*"search"[\s\S]*?البحث في الأصناف[\s\S]*?<\/button>/;

    const match =
        page.match(
            searchButtonRegex
        );

    if (!match) {
        throw new Error(
            "لم أجد زر البحث في الأصناف"
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
        "PAGE: Masters button added"
    );

} else {

    console.log(
        "PAGE: Masters button already exists"
    );

}


// ============================================================
// PANEL
// ============================================================

if (
    !page.includes(
        "<MasterManagementPanel />"
    )
) {

    const reviewAnchor =
`            {
                activeTab === "review" && (`;

    if (
        !page.includes(
            reviewAnchor
        )
    ) {
        throw new Error(
            "لم أجد منطقة مراجعة التطابق"
        );
    }

    const managementBlock =
`            {
                activeTab === "masters" && (

                    <MasterManagementPanel />

                )
            }


`;

    page =
        page.replace(
            reviewAnchor,
            managementBlock +
            reviewAnchor
        );

    console.log(
        "PAGE: Masters panel added"
    );

} else {

    console.log(
        "PAGE: Masters panel already exists"
    );

}


write(
    pageFile,
    page
);


console.log("");
console.log(
    "Master Management UI fixed successfully."
);