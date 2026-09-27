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


import {
    initializeCrmSchema
} from "../pharmfly/customers/crm/crmDb.js";


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



export async function syncCrmPhonesForBranch(
    branchIdInput
) {

    const branchId =
        normalizeBranchId(
            branchIdInput
        );

    const saved =
        getBranchConnection(
            branchId
        );

    if (!saved) {
        throw new Error(
            `No saved connection for branch ${branchId}.`
        );
    }

    const pool =
        await getBranchPool(
            branchId,
            saved
        );

    const sourceResult =
        await pool
            .request()
            .query(`
                SELECT
                    t.CustomerID,
                    t.Tel,
                    t.ID
                FROM dbo.Telephones t
                INNER JOIN dbo.Cards c
                    ON c.Id = t.CustomerID
                WHERE
                    c.IsHDCustomer = 1
                    AND t.Tel IS NOT NULL
                    AND LTRIM(
                        RTRIM(
                            t.Tel
                        )
                    ) <> ''
                ORDER BY
                    t.CustomerID,
                    t.ID DESC
            `);

    function normalizePhone(
        value
    ) {

        let digits =
            String(
                value ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (!digits) {
            return null;
        }

        if (
            digits.startsWith("00")
        ) {
            digits =
                digits.slice(2);
        }

        if (
            digits.startsWith("20") &&
            digits.length === 12
        ) {
            return digits;
        }

        if (
            digits.startsWith("0") &&
            digits.length === 11
        ) {
            return (
                "20" +
                digits.slice(1)
            );
        }

        if (
            digits.startsWith("1") &&
            digits.length === 10
        ) {
            return (
                "20" +
                digits
            );
        }

        return digits;
    }

    const phoneMap =
        new Map();

    for (
        const row
        of (
            sourceResult.recordset ||
            []
        )
    ) {

        const customerId =
            String(
                row.CustomerID
            );

        if (
            phoneMap.has(
                customerId
            )
        ) {
            continue;
        }

        const phone =
            String(
                row.Tel ||
                ""
            ).trim();

        if (!phone) {
            continue;
        }

        phoneMap.set(
            customerId,
            {
                phone,
                normalized:
                    normalizePhone(
                        phone
                    )
            }
        );
    }

    const crmDb =
        initializeCrmSchema();

    const profiles =
        crmDb.prepare(`
            SELECT
                customer_id,
                whatsapp_phone,
                whatsapp_phone_normalized
            FROM crm_customer_profiles
            WHERE
                branch_id = ?
        `).all(
            branchId
        );

    const updateProfile =
        crmDb.prepare(`
            UPDATE crm_customer_profiles
            SET
                whatsapp_phone = ?,
                whatsapp_phone_normalized = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE
                branch_id = ?
                AND customer_id = ?
                AND (
                    COALESCE(
                        whatsapp_phone,
                        ''
                    ) <> ?

                    OR

                    COALESCE(
                        whatsapp_phone_normalized,
                        ''
                    ) <> COALESCE(
                        ?,
                        ''
                    )
                )
        `);

    let matchedProfiles = 0;
    let updatedProfiles = 0;

    const transaction =
        crmDb.transaction(
            () => {

                for (
                    const profile
                    of profiles
                ) {

                    const customerId =
                        String(
                            profile.customer_id
                        );

                    const phone =
                        phoneMap.get(
                            customerId
                        );

                    if (!phone) {
                        continue;
                    }

                    matchedProfiles++;

                    const result =
                        updateProfile.run(
                            phone.phone,
                            phone.normalized,
                            branchId,
                            customerId,
                            phone.phone,
                            phone.normalized
                        );

                    updatedProfiles +=
                        Number(
                            result.changes ||
                            0
                        );
                }
            }
        );

    transaction();


    /*
     * =========================================================
     * WHATSAPP RECONCILIATION
     *
     * After PharmaFly phone synchronization:
     *
     * NEW WhatsApp message
     *        â†“
     * exact normalized phone
     *        â†“
     * exactly one CRM customer globally
     *        â†“
     * copy historical message into CRM WhatsApp history
     *        â†“
     * create CRM interaction
     *        â†“
     * mark unmatched row RESOLVED
     *
     * Never guess when the same phone belongs to multiple
     * CRM customers.
     * =========================================================
     */

    let whatsappReconciled =
        0;

    let whatsappAmbiguous =
        0;

    let whatsappSkipped =
        0;


    try {

        crmDb.prepare(
            `
            CREATE TABLE IF NOT EXISTS
                crm_whatsapp_unmatched_messages (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    whatsapp_account_id INTEGER,

                    phone TEXT NOT NULL,

                    message_type TEXT,

                    body_text TEXT,

                    provider_message_id TEXT UNIQUE,

                    message_timestamp INTEGER,

                    status TEXT NOT NULL DEFAULT 'NEW',

                    resolved_branch_id INTEGER,

                    resolved_customer_id TEXT,

                    resolved_at TEXT,

                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

                )
            `
        ).run();


        const unmatchedRows =
            crmDb.prepare(
                `
                SELECT
                    id,
                    whatsapp_account_id,
                    phone,
                    message_type,
                    body_text,
                    provider_message_id,
                    message_timestamp,
                    created_at
                FROM crm_whatsapp_unmatched_messages
                WHERE
                    status = 'NEW'
                    AND phone IS NOT NULL
                    AND TRIM(phone) <> ''
                ORDER BY
                    id
                `
            )
                .all();


        const findCustomer =
            crmDb.prepare(
                `
                SELECT
                    branch_id,
                    customer_id,
                    customer_name
                FROM crm_customer_profiles
                WHERE
                    whatsapp_phone_normalized = ?
                ORDER BY
                    branch_id,
                    customer_id
                `
            );


        const findExistingMessage =
            crmDb.prepare(
                `
                SELECT
                    id,
                    branch_id,
                    customer_id
                FROM crm_whatsapp_messages
                WHERE
                    provider_message_id = ?
                LIMIT 1
                `
            );


        const insertMessage =
            crmDb.prepare(
                `
                INSERT INTO crm_whatsapp_messages (
                    branch_id,
                    customer_id,
                    campaign_id,
                    campaign_target_id,
                    interaction_id,
                    whatsapp_account_id,
                    direction,
                    message_type,
                    template_name,
                    template_language,
                    body_text,
                    provider_message_id,
                    recipient_phone,
                    status,
                    inbound_reply,
                    created_at
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    NULL,
                    NULL,
                    ?,
                    'INBOUND',
                    ?,
                    NULL,
                    'ar',
                    ?,
                    ?,
                    ?,
                    'received',
                    1,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        ?
                    )
                )
                `
            );


        const insertInteraction =
            crmDb.prepare(
                `
                INSERT INTO crm_interactions (
                    branch_id,
                    customer_id,
                    campaign_id,
                    campaign_target_id,
                    channel,
                    direction,
                    interaction_type,
                    outcome,
                    phone,
                    message_id,
                    subject,
                    content,
                    employee_id,
                    occurred_at,
                    metadata_json,
                    created_at
                )
                VALUES (
                    ?,
                    ?,
                    NULL,
                    NULL,
                    'WHATSAPP',
                    'INBOUND',
                    'MESSAGE',
                    'RECEIVED',
                    ?,
                    ?,
                    NULL,
                    ?,
                    NULL,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        ?
                    ),
                    ?,
                    COALESCE(
                        datetime(?, 'unixepoch'),
                        CURRENT_TIMESTAMP
                    )
                )
                `
            );


        const updateMessageInteraction =
            crmDb.prepare(
                `
                UPDATE crm_whatsapp_messages
                SET
                    interaction_id = ?
                WHERE
                    id = ?
                `
            );


        const resolveUnmatched =
            crmDb.prepare(
                `
                UPDATE crm_whatsapp_unmatched_messages
                SET
                    status = 'RESOLVED',
                    resolved_branch_id = ?,
                    resolved_customer_id = ?,
                    resolved_at = CURRENT_TIMESTAMP
                WHERE
                    id = ?
                `
            );


        const transaction =
            crmDb.transaction(
                () => {

                    for (
                        const row
                        of unmatchedRows
                    ) {

                        const phone =
                            String(
                                row.phone ||
                                ""
                            ).trim();


                        if (
                            !phone
                        ) {

                            whatsappSkipped++;

                            continue;

                        }


                        const matches =
                            findCustomer.all(
                                phone
                            );


                        if (
                            matches.length !== 1
                        ) {

                            if (
                                matches.length > 1
                            ) {

                                whatsappAmbiguous++;

                            }
                            else {

                                whatsappSkipped++;

                            }

                            continue;

                        }


                        const customer =
                            matches[0];


                        const resolvedBranchId =
                            Number(
                                customer.branch_id
                            );


                        const resolvedCustomerId =
                            String(
                                customer.customer_id
                            );


                        if (
                            !Number.isInteger(
                                resolvedBranchId
                            ) ||
                            resolvedBranchId <= 0 ||
                            !resolvedCustomerId
                        ) {

                            whatsappSkipped++;

                            continue;

                        }


                        let messageId =
                            null;


                        if (
                            row.provider_message_id
                        ) {

                            const existing =
                                findExistingMessage.get(
                                    row.provider_message_id
                                );


                            if (
                                existing?.id
                            ) {

                                messageId =
                                    existing.id;

                            }

                        }


                        if (
                            !messageId
                        ) {

                            const messageResult =
                                insertMessage.run(
                                    resolvedBranchId,
                                    resolvedCustomerId,
                                    row.whatsapp_account_id || null,
                                    row.message_type || "chat",
                                    row.body_text || "",
                                    row.provider_message_id || null,
                                    phone,
                                    Number(
                                        row.message_timestamp ||
                                        0
                                    ) || null,
                                    row.created_at || null
                                );


                            messageId =
                                messageResult.lastInsertRowid;

                        }


                        let interactionId =
                            null;


                        const metadata =
                            JSON.stringify(
                                {
                                    whatsappReconciled:
                                        true,

                                    unmatchedMessageId:
                                        row.id,

                                    providerMessageId:
                                        row.provider_message_id ||
                                        null,

                                    messageType:
                                        row.message_type ||
                                        "chat",

                                    phone,

                                    branchId:
                                        resolvedBranchId,

                                    customerId:
                                        resolvedCustomerId,

                                    customerName:
                                        customer.customer_name ||
                                        null
                                }
                            );


                        const interactionResult =
                            insertInteraction.run(
                                resolvedBranchId,
                                resolvedCustomerId,
                                phone,
                                row.provider_message_id || null,
                                row.body_text || "",
                                Number(
                                    row.message_timestamp ||
                                    0
                                ) || null,
                                row.created_at || null,
                                metadata,
                                Number(
                                    row.message_timestamp ||
                                    0
                                ) || null
                            );


                        interactionId =
                            interactionResult.lastInsertRowid;


                        if (
                            messageId &&
                            interactionId
                        ) {

                            updateMessageInteraction.run(
                                interactionId,
                                messageId
                            );

                        }


                        resolveUnmatched.run(
                            resolvedBranchId,
                            resolvedCustomerId,
                            row.id
                        );


                        whatsappReconciled++;

                    }

                }
            );


        transaction();

    }
    catch (
        error
    ) {

        console.warn(
            "[CRM Phone AutoSync] WhatsApp reconciliation failed:",
            error?.message ||
                error
        );

    }

    const response = {
        success: true,
        branchId,
        sourceDeliveryCustomers:
            phoneMap.size,
        existingCrmProfiles:
            profiles.length,
        matchedProfiles,
        updatedProfiles
    };

    console.log(
        "[CRM Phone AutoSync]",
        response
    );

    return response;
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
    
}





