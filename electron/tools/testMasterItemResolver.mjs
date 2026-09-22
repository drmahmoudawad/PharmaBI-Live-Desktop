import {
    app
} from "electron";

import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";

import {
    getMasterItemStats,
    resolveItem
} from "../masterItem/masterItemService.js";


const USER_DATA =
    "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live";


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        USER_DATA
    );


    console.log("");
    console.log("==============================================");
    console.log("MASTER ITEM RESOLVER TEST");
    console.log("==============================================");
    console.log("");


    const stats =
        getMasterItemStats();


    console.log("DATABASE STATS:");
    console.log(stats);


    const db =
        getLocalSalesDatabase();


    /*
     * Find a real master item where the same
     * unified item has different local IDs/names
     * across branches.
     */

    const candidate =
        db.prepare(`

            SELECT

                master_item_id,

                COUNT(
                    DISTINCT branch_id
                ) AS branch_count,

                COUNT(
                    DISTINCT branch_item_id
                ) AS item_id_count,

                COUNT(
                    DISTINCT branch_item_name
                ) AS name_count

            FROM master_item_branch_map

            GROUP BY
                master_item_id

            HAVING
                COUNT(DISTINCT branch_id) = 5
                AND COUNT(DISTINCT branch_item_id) > 1

            ORDER BY
                master_item_id

            LIMIT 1

        `).get();


    if (!candidate) {

        throw new Error(
            "Could not find a multi-branch item with different local IDs."
        );

    }


    const master =
        db.prepare(`

            SELECT

                id,
                unified_code,
                canonical_name,
                normalized_name

            FROM master_items

            WHERE id = ?

            LIMIT 1

        `).get(
            candidate.master_item_id
        );


    const mappings =
        db.prepare(`

            SELECT

                branch_id,
                branch_item_id,
                branch_item_code,
                branch_item_name

            FROM master_item_branch_map

            WHERE master_item_id = ?

            ORDER BY
                branch_id

        `).all(
            candidate.master_item_id
        );


    console.log("");
    console.log("REAL MULTI-BRANCH TEST ITEM:");
    console.log(master);


    console.log("");
    console.log("BRANCH MAPPINGS:");
    console.table(mappings);


    console.log("");
    console.log("TEST 1: UNIFIED CODE");
    console.log(
        resolveItem(
            master.unified_code
        )
    );


    console.log("");
    console.log("TEST 2: CANONICAL NAME");
    console.log(
        resolveItem(
            master.canonical_name
        )
    );


    console.log("");
    console.log("TEST 3: EACH BRANCH LOCAL CODE");
    console.log("");


    for (
        const mapping
        of mappings
    ) {

        const result =
            resolveItem(
                String(
                    mapping.branch_item_code ||
                    mapping.branch_item_id
                ),
                {
                    branchId:
                        Number(
                            mapping.branch_id
                        )
                }
            );


        console.log(
            `Branch ${mapping.branch_id} | Local ${mapping.branch_item_code || mapping.branch_item_id}`
        );

        console.log(
            JSON.stringify(
                {
                    found:
                        result.found,

                    ambiguous:
                        result.ambiguous,

                    unifiedCode:
                        result.result?.unified_code,

                    canonicalName:
                        result.result?.canonical_name,

                    branchItemId:
                        result.result?.branch_item_id,

                    branchItemName:
                        result.result?.branch_item_name

                },
                null,
                2
            )
        );

    }


    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "RESOLVER TEST COMPLETE"
    );
    console.log(
        "=============================================="
    );
    console.log("");


    app.quit();

}


main()
    .catch(
        error => {

            console.error("");
            console.error(
                "RESOLVER TEST FAILED:"
            );
            console.error(
                error
            );
            console.error("");

            try {
                app.quit();
            }
            catch {}

            process.exit(1);

        }
    );