import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";


import {
    getBranchPool
} from "../connection/connectionManager.js";


import {
    getAllSavedConnections
} from "../settings/connectionStore.js";


function normalizeName(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toUpperCase();

}


async function getCurrentItemPrices(
    items = []
) {

    const rows =
        Array.isArray(
            items
        )
            ? items
            : [];


    const grouped =
        new Map();


    for (
        const row
        of rows
    ) {

        const branchId =
            Number(
                row?.branch_id ??
                row?.branchId
            );


        const itemId =
            Number(
                row?.branch_item_id ??
                row?.branchItemId
            );


        if (
            !Number.isInteger(
                branchId
            ) ||
            branchId <= 0
        ) {
            continue;
        }


        if (
            !Number.isInteger(
                itemId
            ) ||
            itemId < 0
        ) {
            continue;
        }


        if (
            !grouped.has(
                branchId
            )
        ) {

            grouped.set(
                branchId,
                new Set()
            );

        }


        grouped
            .get(
                branchId
            )
            .add(
                itemId
            );

    }


    const priceMap =
        new Map();


    for (
        const [
            branchId,
            itemIds
        ]
        of grouped
    ) {

        const ids =
            Array.from(
                itemIds
            );


        if (
            !ids.length
        ) {
            continue;
        }


        const pool =
            await getBranchPool(
                branchId
            );


        const request =
            pool.request();


        const placeholders =
            ids.map(
                (
                    id,
                    index
                ) => {

                    const parameterName =
                        `item_${index}`;

                    request.input(
                        parameterName,
                        id
                    );

                    return `@${parameterName}`;

                }
            );


        const result =
            await request.query(
                `
                    SET NOCOUNT ON;

                    SELECT
                        ID,
                        SalesPrice

                    FROM dbo.Items

                    WHERE
                        ID IN (
                            ${placeholders.join(",")}
                        )
                `
            );


        for (
            const row
            of result.recordset ||
            []
        ) {

            priceMap.set(
                `${branchId}:${Number(row.ID)}`,
                row.SalesPrice == null
                    ? null
                    : Number(
                        row.SalesPrice
                    )
            );

        }

    }


    return rows.map(
        row => {

            const branchId =
                Number(
                    row?.branch_id ??
                    row?.branchId
                );


            const itemId =
                Number(
                    row?.branch_item_id ??
                    row?.branchItemId
                );


            return {

                ...row,

                salesPrice:
                    priceMap.get(
                        `${branchId}:${itemId}`
                    ) ??
                    null

            };

        }
    );

}


async function getMasterManagementList(
    {
        search = "",
        sortBy = "name"
    } = {}
) {

    const db =
        getLocalSalesDatabase();


    const value =
        String(
            search ?? ""
        )
            .trim()
            .toUpperCase();


    const conditions = [

        "mi.status = 'ACTIVE'"

    ];


    const params = [];


    if (
        value
    ) {

        const like =
            `%${value}%`;


        conditions.push(`

            (
                UPPER(
                    COALESCE(
                        mi.canonical_name,
                        ''
                    )
                ) LIKE ?

                OR

                UPPER(
                    COALESCE(
                        mi.unified_code,
                        ''
                    )
                ) LIKE ?

            )

        `);


        params.push(
            like,
            like
        );

    }


    let orderSql = `

        UPPER(
            TRIM(
                COALESCE(
                    mi.canonical_name,
                    ''
                )
            )
        ),

        mi.id

    `;


    if (
        sortBy ===
        "code"
    ) {

        orderSql = `

            mi.unified_code,
            mi.id

        `;

    }


    if (
        sortBy ===
        "members"
    ) {

        orderSql = `

            member_count DESC,

            UPPER(
                TRIM(
                    COALESCE(
                        mi.canonical_name,
                        ''
                    )
                )
            ),

            mi.id

        `;

    }


    const items =
        db.prepare(`

            SELECT

                mi.id,

                mi.unified_code,

                mi.canonical_name,

                mi.status,

                COUNT(
                    mim.id
                ) AS member_count,

                mi.created_at,

                mi.updated_at

            FROM master_items mi

            LEFT JOIN master_item_branch_map mim

                ON mim.master_item_id =
                   mi.id

            WHERE
                ${conditions.join(
                    " AND "
                )}

            GROUP BY

                mi.id,

                mi.unified_code,

                mi.canonical_name,

                mi.status,

                mi.created_at,

                mi.updated_at

            ORDER BY
                ${orderSql}

        `).all(
            ...params
        );


    return {

        success:
            true,

        items

    };

}


async function getMasterManagementDetails(
    masterItemId
) {

    const db =
        getLocalSalesDatabase();


    const id =
        Number(
            masterItemId
        );


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {

        throw new Error(
            "رقم الاسم الموحد غير صحيح."
        );

    }


    const master =
        db.prepare(`

            SELECT

                id,

                unified_code,

                canonical_name,

                normalized_name,

                status,

                created_at,

                updated_at

            FROM master_items

            WHERE
                id = ?

            LIMIT 1

        `).get(
            id
        );


    if (
        !master
    ) {

        throw new Error(
            "الاسم الموحد غير موجود."
        );

    }


    const members =
        db.prepare(`

            SELECT

                mim.id,

                mim.branch_id,

                mim.branch_item_id,

                mim.branch_item_code,

                mim.branch_item_name,

                mim.barcode,

                mim.parts,

                mim.match_status,

                mim.source

            FROM master_item_branch_map mim

            WHERE
                mim.master_item_id = ?

            ORDER BY

                UPPER(
                    TRIM(
                        COALESCE(
                            mim.branch_item_name,
                            ''
                        )
                    )
                ),

                mim.branch_id,

                mim.branch_item_id

        `).all(
            id
        );


    const pricedMembers =
        await getCurrentItemPrices(
            members
        );


    const branchNames =
        new Map(

            getAllSavedConnections()
                .map(
                    entry => [

                        Number(
                            entry?.branchId
                        ),

                        entry?.branchName ||
                        `فرع ${entry?.branchId}`

                    ]
                )

        );


    return {

        success:
            true,

        master: {

            ...master,

            memberCount:
                pricedMembers.length

        },

        members:
            pricedMembers.map(
                member => ({

                    ...member,

                    branchName:
                        branchNames.get(
                            Number(
                                member.branch_id
                            )
                        ) ||
                        `فرع ${member.branch_id}`

                })
            )

    };

}


function updateMasterName(
    {
        masterItemId,
        canonicalName
    }
) {

    const db =
        getLocalSalesDatabase();


    const id =
        Number(
            masterItemId
        );


    const name =
        String(
            canonicalName ?? ""
        ).trim();


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {

        throw new Error(
            "رقم الاسم الموحد غير صحيح."
        );

    }


    if (
        !name
    ) {

        throw new Error(
            "يجب إدخال الاسم الموحد."
        );

    }


    const normalizedName =
        normalizeName(
            name
        );


    const duplicate =
        db.prepare(`

            SELECT

                id,

                canonical_name

            FROM master_items

            WHERE

                status = 'ACTIVE'

                AND normalized_name = ?

                AND id <> ?

            LIMIT 1

        `).get(
            normalizedName,
            id
        );


    if (
        duplicate
    ) {

        throw new Error(
            `يوجد اسم موحد آخر بهذا الاسم بالفعل: ${duplicate.canonical_name}`
        );

    }


    const result =
        db.prepare(`

            UPDATE master_items

            SET

                canonical_name = ?,

                normalized_name = ?,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE

                id = ?

                AND status = 'ACTIVE'

        `).run(
            name,
            normalizedName,
            id
        );


    if (
        !result.changes
    ) {

        throw new Error(
            "تعذر تعديل الاسم الموحد."
        );

    }


    return {

        success:
            true,

        masterId:
            id,

        canonicalName:
            name

    };

}


function markReviewPending(
    db,
    row,
    reason
) {

    const existing =
        db.prepare(`

            SELECT
                id

            FROM master_item_review

            WHERE

                branch_id = ?

                AND branch_item_id = ?

            LIMIT 1

        `).get(
            Number(
                row.branch_id
            ),

            String(
                row.branch_item_id
            )
        );


    if (
        existing
    ) {

        db.prepare(`

            UPDATE master_item_review

            SET

                branch_item_code = ?,

                branch_item_name = ?,

                normalized_name = ?,

                reason = ?,

                status = 'PENDING',

                suggested_master_item_id = NULL,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                id = ?

        `).run(

            row.branch_item_code ??
            null,

            row.branch_item_name ??
            null,

            normalizeName(
                row.branch_item_name
            ),

            reason,

            existing.id

        );

        return;

    }


    db.prepare(`

        INSERT INTO master_item_review (

            branch_id,

            branch_item_id,

            branch_item_code,

            branch_item_name,

            normalized_name,

            reason,

            status,

            suggested_master_item_id,

            updated_at

        )

        VALUES (

            ?,

            ?,

            ?,

            ?,

            ?,

            ?,

            'PENDING',

            NULL,

            CURRENT_TIMESTAMP

        )

    `).run(

        Number(
            row.branch_id
        ),

        String(
            row.branch_item_id
        ),

        row.branch_item_code ??
        null,

        row.branch_item_name ??
        null,

        normalizeName(
            row.branch_item_name
        ),

        reason

    );

}


function removeMasterMember(
    {
        masterItemId,
        branchId,
        branchItemId
    }
) {

    const db =
        getLocalSalesDatabase();


    const masterId =
        Number(
            masterItemId
        );


    const numericBranchId =
        Number(
            branchId
        );


    const itemId =
        String(
            branchItemId ??
            ""
        );


    const row =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE

                master_item_id = ?

                AND branch_id = ?

                AND branch_item_id = ?

            LIMIT 1

        `).get(

            masterId,

            numericBranchId,

            itemId

        );


    if (
        !row
    ) {

        throw new Error(
            "الصنف غير مرتبط بهذا الاسم الموحد."
        );

    }


    const transaction =
        db.transaction(
            () => {

                db.prepare(`

                    UPDATE master_item_branch_map

                    SET

                        master_item_id = NULL,

                        match_status =
                            'PENDING_REVIEW',

                        source =
                            'REVIEW',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = ?

                `).run(
                    row.id
                );


                db.prepare(`

                    DELETE FROM master_item_aliases

                    WHERE

                        master_item_id = ?

                        AND branch_id = ?

                        AND alias_value = ?

                `).run(

                    masterId,

                    numericBranchId,

                    row.branch_item_name ??
                    ""

                );


                markReviewPending(
                    db,
                    row,
                    "REMOVED_FROM_MASTER"
                );

            }
        );


    transaction();


    return {

        success:
            true,

        removed:
            true

    };

}


function cancelMaster(
    masterItemId
) {

    const db =
        getLocalSalesDatabase();


    const id =
        Number(
            masterItemId
        );


    const master =
        db.prepare(`

            SELECT

                id,

                canonical_name

            FROM master_items

            WHERE
                id = ?

            LIMIT 1

        `).get(
            id
        );


    if (
        !master
    ) {

        throw new Error(
            "الاسم الموحد غير موجود."
        );

    }


    const members =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                master_item_id = ?

        `).all(
            id
        );


    const transaction =
        db.transaction(
            () => {

                db.prepare(`

                    UPDATE master_items

                    SET

                        status =
                            'INACTIVE',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = ?

                `).run(
                    id
                );


                db.prepare(`

                    UPDATE master_item_branch_map

                    SET

                        master_item_id = NULL,

                        match_status =
                            'PENDING_REVIEW',

                        source =
                            'REVIEW',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        master_item_id = ?

                `).run(
                    id
                );


                for (
                    const row
                    of members
                ) {

                    markReviewPending(
                        db,
                        row,
                        "MASTER_CANCELLED"
                    );

                }

            }
        );


    transaction();


    return {

        success:
            true,

        cancelled:
            true,

        masterId:
            id,

        memberCount:
            members.length

    };

}


export {

    getCurrentItemPrices,

    getMasterManagementList,

    getMasterManagementDetails,

    updateMasterName,

    removeMasterMember,

    cancelMaster

};