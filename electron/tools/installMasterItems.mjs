import {
    app
} from "electron";

import path from "node:path";

import {
    ensureMasterItemSchema,
    importMasterItemSeed,
    getMasterItemStats
} from "../masterItem/masterItemService.js";


const USER_DATA =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-dev";


const SEED =
    "D:\\PharmaBI-Live-Desktop\\tools\\master-item-seed.json";


async function main() {

    await app.whenReady();


    /*
     * Force this one-time installer to use
     * the same DEV local database.
     */
    app.setPath(
        "userData",
        USER_DATA
    );


    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "PHARMABI MASTER ITEM INSTALLER"
    );
    console.log(
        "=============================================="
    );
    console.log("");


    ensureMasterItemSchema();


    const result =
        importMasterItemSeed(
            SEED
        );


    console.log("");
    console.log(
        "IMPORT RESULT:"
    );
    console.log(
        result
    );


    const stats =
        getMasterItemStats();


    console.log("");
    console.log(
        "DATABASE STATS:"
    );
    console.log(
        stats
    );
    console.log("");


    console.log(
        `Database: ${path.join(USER_DATA, "pharmabi-local.db")}`
    );


    await app.quit();

}


main()
    .catch(
        async error => {

            console.error("");
            console.error(
                "MASTER ITEM INSTALL FAILED:"
            );
            console.error(
                error
            );
            console.error("");

            try {
                await app.quit();
            }
            catch {
                // ignore
            }

            process.exit(1);

        }
    );