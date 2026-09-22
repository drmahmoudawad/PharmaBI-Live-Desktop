import fs from "node:fs";
import path from "node:path";

import {
    app,
    safeStorage
} from "electron";


const FILE_NAME =
    "connection-settings.json";


function getFilePath() {

    return path.join(

        app.getPath(
            "userData"
        ),

        FILE_NAME

    );

}


function ensureDirectory() {

    const directory =
        path.dirname(
            getFilePath()
        );


    if (
        !fs.existsSync(
            directory
        )
    ) {

        fs.mkdirSync(

            directory,

            {
                recursive:
                    true
            }

        );

    }

}


function createEmptyStore() {

    return {

        version:
            2,

        branches:
            {}

    };

}


function readStore() {

    ensureDirectory();


    const filePath =
        getFilePath();


    if (
        !fs.existsSync(
            filePath
        )
    ) {

        return createEmptyStore();

    }


    try {

        const raw =
            fs.readFileSync(

                filePath,

                "utf8"

            );


        if (
            !raw.trim()
        ) {

            return createEmptyStore();

        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            !parsed ||
            typeof parsed !==
                "object"
        ) {

            return createEmptyStore();

        }


        if (
            !parsed.branches ||
            typeof parsed.branches !==
                "object"
        ) {

            parsed.branches =
                {};

        }


        /*
         * Backward compatibility.
         *
         * Existing branches created before branchName existed
         * remain valid.
         *
         * Their default display name becomes:
         *
         *     Branch 1
         *     Branch 2
         *     ...
         */

        for (
            const [
                key,
                entry
            ]
            of Object.entries(
                parsed.branches
            )
        ) {

            if (
                !entry ||
                typeof entry !==
                    "object"
            ) {

                delete parsed.branches[
                    key
                ];

                continue;

            }


            const branchId =
                Number(
                    entry.branchId ??
                    key
                );


            if (
                !Number.isInteger(
                    branchId
                ) ||
                branchId <= 0
            ) {

                continue;

            }


            parsed.branches[
                String(
                    branchId
                )
            ] = {

                ...entry,

                branchId,

                branchName:

                    String(
                        entry.branchName ||
                        ""
                    ).trim() ||

                    `Branch ${branchId}`

            };

        }


        return parsed;

    }
    catch (
        error
    ) {

        console.error(

            "[connectionStore] Failed to read settings:",

            error

        );


        return createEmptyStore();

    }

}


function writeStore(
    store
) {

    ensureDirectory();


    const filePath =
        getFilePath();


    const temporaryPath =
        `${filePath}.tmp`;


    fs.writeFileSync(

        temporaryPath,

        JSON.stringify(

            store,

            null,

            4

        ),

        "utf8"

    );


    fs.renameSync(

        temporaryPath,

        filePath

    );

}


function normalizeBranchId(
    branchId
) {

    const id =
        Number(
            branchId
        );


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {

        throw new Error(
            "Invalid branchId"
        );

    }


    return id;

}


function normalizeBranchName(
    branchName,
    branchId
) {

    const value =
        String(
            branchName ||
            ""
        ).trim();


    if (
        value
    ) {

        return value;

    }


    return `Branch ${branchId}`;

}


function encryptPassword(
    password
) {

    const value =
        String(
            password ??
            ""
        );


    if (
        !value
    ) {

        return {

            encrypted:
                false,

            value:
                ""

        };

    }


    if (
        !safeStorage.isEncryptionAvailable()
    ) {

        throw new Error(

            "Secure password storage is not available on this computer."

        );

    }


    const encrypted =
        safeStorage.encryptString(
            value
        );


    return {

        encrypted:
            true,

        value:
            encrypted.toString(
                "base64"
            )

    };

}


function decryptPassword(
    entry
) {

    if (
        !entry
    ) {

        return "";

    }


    if (
        !entry.password
    ) {

        return "";

    }


    if (
        entry.passwordEncrypted !==
        true
    ) {

        return "";

    }


    if (
        !safeStorage.isEncryptionAvailable()
    ) {

        return "";

    }


    try {

        return safeStorage.decryptString(

            Buffer.from(

                entry.password,

                "base64"

            )

        );

    }
    catch (
        error
    ) {

        console.error(

            "[connectionStore] Failed to decrypt password:",

            error

        );


        return "";

    }

}


/*
 * =========================================================
 * SAVE / UPDATE BRANCH
 * =========================================================
 */

export function saveBranchConnection(
    {
        branchId,
        branchName = "",
        connection
    }
) {

    const id =
        normalizeBranchId(
            branchId
        );


    if (
        !connection ||
        typeof connection !==
            "object"
    ) {

        throw new Error(

            "Connection configuration is required"

        );

    }


    const store =
        readStore();


    const existing =
        store.branches[
            String(
                id
            )
        ];


    const normalizedName =
        normalizeBranchName(

            branchName ||
            existing?.branchName,

            id

        );


    const encryptedPassword =
        encryptPassword(

            connection.password

        );


    store.branches[
        String(
            id
        )
    ] = {

        branchId:
            id,

        branchName:
            normalizedName,

        server:
            String(
                connection.server ||
                ""
            ).trim(),

        port:
            Number(
                connection.port ||
                1433
            ),

        database:
            String(
                connection.database ||
                ""
            ).trim(),

        user:
            String(
                connection.user ||
                ""
            ).trim(),

        password:
            encryptedPassword.value,

        passwordEncrypted:
            encryptedPassword.encrypted,

        updatedAt:
            new Date().toISOString()

    };


    writeStore(
        store
    );


    return {

        branchId:
            id,

        branchName:
            normalizedName,

        saved:
            true

    };

}


/*
 * =========================================================
 * UPDATE NAME ONLY
 * =========================================================
 */

export function renameBranch(
    {
        branchId,
        branchName
    }
) {

    const id =
        normalizeBranchId(
            branchId
        );


    const store =
        readStore();


    const existing =
        store.branches[
            String(
                id
            )
        ];


    if (
        !existing
    ) {

        throw new Error(

            `Branch ${id} does not exist.`

        );

    }


    const normalizedName =
        normalizeBranchName(

            branchName,

            id

        );


    store.branches[
        String(
            id
        )
    ] = {

        ...existing,

        branchId:
            id,

        branchName:
            normalizedName,

        updatedAt:
            new Date().toISOString()

    };


    writeStore(
        store
    );


    return {

        branchId:
            id,

        branchName:
            normalizedName,

        saved:
            true

    };

}


/*
 * =========================================================
 * GET ONE
 * =========================================================
 */

export function getBranchConnection(
    branchId
) {

    const id =
        normalizeBranchId(
            branchId
        );


    const store =
        readStore();


    const entry =
        store.branches[
            String(
                id
            )
        ];


    if (
        !entry
    ) {

        return null;

    }


    return {

        branchId:
            id,

        branchName:

            normalizeBranchName(

                entry.branchName,

                id

            ),

        server:
            entry.server ||
            "",

        port:
            Number(
                entry.port ||
                1433
            ),

        database:
            entry.database ||
            "",

        user:
            entry.user ||
            "",

        password:
            decryptPassword(
                entry
            )

    };

}


/*
 * =========================================================
 * GET ALL
 * =========================================================
 */

export function getAllSavedConnections() {

    const store =
        readStore();


    return Object.values(

        store.branches ||
        {}

    )

    .map(

        entry => {

            const branchId =
                Number(
                    entry?.branchId
                );


            if (
                !Number.isInteger(
                    branchId
                ) ||
                branchId <= 0
            ) {

                return null;

            }


            return {

                branchId,

                branchName:

                    normalizeBranchName(

                        entry?.branchName,

                        branchId

                    ),

                server:
                    entry?.server ||
                    "",

                port:
                    Number(
                        entry?.port ||
                        1433
                    ),

                database:
                    entry?.database ||
                    "",

                user:
                    entry?.user ||
                    "",

                password:
                    decryptPassword(
                        entry
                    )

            };

        }

    )

    .filter(
        Boolean
    )

    .sort(

        (
            a,
            b
        ) =>

            a.branchId -
            b.branchId

    );

}


/*
 * =========================================================
 * DELETE
 * =========================================================
 */

export function deleteBranchConnection(
    branchId
) {

    const id =
        normalizeBranchId(
            branchId
        );


    const store =
        readStore();


    delete store.branches[
        String(
            id
        )
    ];


    writeStore(
        store
    );


    return {

        branchId:
            id,

        deleted:
            true

    };

}


/*
 * =========================================================
 * DEFAULT
 * =========================================================
 */

export default {

    saveBranchConnection,

    renameBranch,

    getBranchConnection,

    getAllSavedConnections,

    deleteBranchConnection

};