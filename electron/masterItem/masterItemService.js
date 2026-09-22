import fs from "node:fs";

import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";


const SCHEMA_VERSION = 2;


function normalizeSearchValue(value) {

    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


function normalizeSuggestionValue(value) {

    return normalizeSearchValue(value)
        .replace(
            /^\s*[\(\[\{][^)\]\}]+[\)\]\}]\s*/u,
            ""
        )
        .trim();

}


function tokenize(value) {

    return normalizeSuggestionValue(value)
        .split(/[^A-Z0-9\u0600-\u06FF]+/u)
        .filter(
            token =>
                token &&
                token.length >= 2
        );

}


function levenshtein(a, b) {

    const source = String(a || "");
    const target = String(b || "");

    if (source === target) {
        return 0;
    }

    if (!source.length) {
        return target.length;
    }

    if (!target.length) {
        return source.length;
    }

    let previous = Array.from(
        { length: target.length + 1 },
        (_, index) => index
    );

    for (
        let i = 1;
        i <= source.length;
        i += 1
    ) {

        const current = [i];

        for (
            let j = 1;
            j <= target.length;
            j += 1
        ) {

            const insert =
                current[j - 1] + 1;

            const remove =
                previous[j] + 1;

            const replace =
                previous[j - 1] +
                (
                    source[i - 1] === target[j - 1]
                        ? 0
                        : 1
                );

            current[j] =
                Math.min(
                    insert,
                    remove,
                    replace
                );

        }

        previous = current;

    }

    return previous[target.length];

}


function similarityScore(
    sourceValue,
    targetValue
) {

    const source =
        normalizeSuggestionValue(
            sourceValue
        );

    const target =
        normalizeSuggestionValue(
            targetValue
        );

    if (!source || !target) {
        return 0;
    }

    if (source === target) {
        return 100;
    }

    if (
        target.startsWith(source) ||
        source.startsWith(target)
    ) {

        return 92;

    }

    if (
        target.includes(source) ||
        source.includes(target)
    ) {

        return 86;

    }

    const sourceTokens =
        new Set(
            tokenize(source)
        );

    const targetTokens =
        new Set(
            tokenize(target)
        );

    const union =
        new Set([
            ...sourceTokens,
            ...targetTokens
        ]);

    let intersection = 0;

    for (
        const token
        of sourceTokens
    ) {

        if (
            targetTokens.has(token)
        ) {

            intersection += 1;

        }

    }

    const jaccard =
        union.size
            ? intersection / union.size
            : 0;

    const editDistance =
        levenshtein(
            source,
            target
        );

    const maxLength =
        Math.max(
            source.length,
            target.length
        );

    const editScore =
        maxLength
            ? Math.max(
                0,
                1 -
                (
                    editDistance /
                    maxLength
                )
            )
            : 0;

    return Math.round(
        Math.max(
            jaccard * 78,
            editScore * 70
        )
    );

}


function ensureMasterItemSchema() {

    const db =
        getLocalSalesDatabase();


    db.exec(`

        CREATE TABLE IF NOT EXISTS master_items (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            unified_code TEXT NOT NULL UNIQUE,

            canonical_name TEXT NOT NULL,

            normalized_name TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'ACTIVE',

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_master_items_unified_code

        ON master_items (
            unified_code
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_items_normalized_name

        ON master_items (
            normalized_name
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_items_canonical_name

        ON master_items (
            canonical_name
        );


        CREATE TABLE IF NOT EXISTS master_item_branch_map (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            master_item_id INTEGER NOT NULL,

            branch_id INTEGER NOT NULL,

            branch_item_id TEXT NOT NULL,

            branch_item_code TEXT,

            branch_item_name TEXT,

            barcode TEXT,

            parts REAL DEFAULT 1,

            match_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',

            source TEXT NOT NULL DEFAULT 'REVIEW',

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (
                master_item_id
            )
            REFERENCES master_items (
                id
            )
            ON DELETE CASCADE,

            UNIQUE (
                branch_id,
                branch_item_id
            )

        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_branch_master

        ON master_item_branch_map (
            master_item_id
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_branch_code

        ON master_item_branch_map (
            branch_id,
            branch_item_code
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_branch_item

        ON master_item_branch_map (
            branch_id,
            branch_item_id
        );


        CREATE TABLE IF NOT EXISTS master_item_aliases (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            master_item_id INTEGER NOT NULL,

            alias_value TEXT NOT NULL,

            normalized_alias TEXT NOT NULL,

            alias_type TEXT NOT NULL DEFAULT 'BRANCH_NAME',

            branch_id INTEGER,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (
                master_item_id
            )
            REFERENCES master_items (
                id
            )
            ON DELETE CASCADE

        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_alias_normalized

        ON master_item_aliases (
            normalized_alias
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_alias_branch

        ON master_item_aliases (
            branch_id,
            normalized_alias
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_alias_master

        ON master_item_aliases (
            master_item_id
        );


        CREATE TABLE IF NOT EXISTS master_item_review (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            branch_item_id TEXT NOT NULL,

            branch_item_code TEXT,

            branch_item_name TEXT,

            normalized_name TEXT,

            reason TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'PENDING',

            suggested_master_item_id INTEGER,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (
                suggested_master_item_id
            )
            REFERENCES master_items (
                id
            )
            ON DELETE SET NULL,

            UNIQUE (
                branch_id,
                branch_item_id
            )

        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_review_status

        ON master_item_review (
            status
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_review_branch

        ON master_item_review (
            branch_id,
            branch_item_id
        );


        CREATE TABLE IF NOT EXISTS master_item_match_decisions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            branch_item_id TEXT NOT NULL,

            candidate_master_item_id INTEGER NOT NULL,

            decision TEXT NOT NULL,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (
                branch_id,
                branch_item_id,
                candidate_master_item_id

            ),

            FOREIGN KEY (
                candidate_master_item_id
            )
            REFERENCES master_items (
                id
            )
            ON DELETE CASCADE

        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_decisions_item

        ON master_item_match_decisions (
            branch_id,
            branch_item_id
        );


        CREATE INDEX IF NOT EXISTS
            idx_master_item_decisions_candidate

        ON master_item_match_decisions (
            candidate_master_item_id
        );


    `);


    return {
        schemaVersion:
            SCHEMA_VERSION
    };

}


function getDecisionRows(
    db,
    branchId,
    branchItemId
) {

    return db.prepare(`

        SELECT

            candidate_master_item_id,
            decision

        FROM master_item_match_decisions

        WHERE
            branch_id = ?
            AND branch_item_id = ?

    `).all(
        branchId,
        String(branchItemId)
    );

}


function getRejectedMasterIds(
    db,
    branchId,
    branchItemId
) {

    return new Set(
        getDecisionRows(
            db,
            branchId,
            branchItemId
        )
            .filter(
                row =>
                    row.decision ===
                    "DIFFERENT"
            )
            .map(
                row =>
                    Number(
                        row.candidate_master_item_id
                    )
            )
    );

}


function upsertDecision(
    db,
    {
        branchId,
        branchItemId,
        candidateMasterItemId,
        decision
    }
) {

    db.prepare(`

        INSERT INTO master_item_match_decisions (

            branch_id,
            branch_item_id,
            candidate_master_item_id,
            decision,
            updated_at

        )

        VALUES (

            ?,
            ?,
            ?,
            ?,
            CURRENT_TIMESTAMP

        )

        ON CONFLICT (
            branch_id,
            branch_item_id,
            candidate_master_item_id
        )

        DO UPDATE SET

            decision =
                excluded.decision,

            updated_at =
                CURRENT_TIMESTAMP

    `).run(
        branchId,
        String(branchItemId),
        candidateMasterItemId,
        decision
    );

}


function getExactMasters(
    db,
    normalizedName
) {

    return db.prepare(`

        SELECT

            id,
            unified_code,
            canonical_name,
            normalized_name,
            status

        FROM master_items

        WHERE
            status = 'ACTIVE'
            AND normalized_name = ?

        ORDER BY
            id

    `).all(
        normalizedName
    );

}


function getCandidateMasters(
    db,
    {
        branchId,
        branchItemId,
        itemName,
        currentMasterId = null,
        limit = 5
    }
) {

    const rejected =
        getRejectedMasterIds(
            db,
            branchId,
            branchItemId
        );


    const key =
        normalizeSuggestionValue(
            itemName
        );

    const tokens =
        tokenize(
            key
        );

    const firstToken =
        tokens.find(
            token =>
                token.length >= 3
        ) ||
        "";

    const secondToken =
        tokens.find(
            token =>
                token.length >= 4 &&
                token !== firstToken
        ) ||
        "";


    let pool = [];


    if (firstToken) {

        pool =
            db.prepare(`

                SELECT

                    id,
                    unified_code,
                    canonical_name,
                    normalized_name,
                    status

                FROM master_items

                WHERE

                    status = 'ACTIVE'

                    AND (

                        normalized_name LIKE ?
                        OR normalized_name LIKE ?

                    )

                LIMIT 2500

            `).all(
                `%${firstToken}%`,
                secondToken
                    ? `%${secondToken}%`
                    : `%${firstToken}%`
            );

    }
    else {

        pool =
            db.prepare(`

                SELECT

                    id,
                    unified_code,
                    canonical_name,
                    normalized_name,
                    status

                FROM master_items

                WHERE
                    status = 'ACTIVE'

                LIMIT 1000

            `).all();

    }


    if (
        currentMasterId
    ) {

        const current =
            db.prepare(`

                SELECT

                    id,
                    unified_code,
                    canonical_name,
                    normalized_name,
                    status

                FROM master_items

                WHERE id = ?

                LIMIT 1

            `).get(
                Number(
                    currentMasterId
                )
            );


        if (
            current &&
            !pool.some(
                row =>
                    Number(row.id) ===
                    Number(current.id)
            )
        ) {

            pool.push(
                current
            );

        }

    }


    const candidates =
        pool
            .filter(
                row =>
                    !rejected.has(
                        Number(
                            row.id
                        )
                    ) &&
                    Number(row.id) !==
                    Number(currentMasterId)
            )
            .map(
                row => {

                    let score =
                        similarityScore(
                            itemName,
                            row.canonical_name
                        );

                    if (
                        Number(row.id) ===
                        Number(currentMasterId)
                    ) {

                        score += 4;

                    }

                    return {

                        id:
                            row.id,

                        unifiedCode:
                            row.unified_code,

                        canonicalName:
                            row.canonical_name,

                        normalizedName:
                            row.normalized_name,

                        score:
                            Math.min(
                                100,
                                score
                            ),

                        isCurrent:
                            Number(row.id) ===
                            Number(currentMasterId)

                    };

                }
            )
            .filter(
                row =>
                    row.score > 35
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            )
            .slice(
                0,
                Math.max(
                    1,
                    Number(limit) || 5
                )
            );


    return candidates;

}


function insertAlias(
    db,
    {
        masterItemId,
        branchId,
        aliasValue
    }
) {

    const value =
        String(
            aliasValue ?? ""
        ).trim();

    if (!value) {
        return;
    }


    db.prepare(`

        INSERT INTO master_item_aliases (

            master_item_id,
            alias_value,
            normalized_alias,
            alias_type,
            branch_id,
            updated_at

        )

        VALUES (

            ?,
            ?,
            ?,
            'BRANCH_NAME',
            ?,
            CURRENT_TIMESTAMP

        )

    `).run(
        masterItemId,
        value,
        normalizeSearchValue(
            value
        ),
        branchId
    );

}


function getNextUnifiedCode(
    db
) {

    const row =
        db.prepare(`

            SELECT

                MAX(
                    CAST(
                        SUBSTR(
                            unified_code,
                            5
                        ) AS INTEGER
                    )
                ) AS maxNumber

            FROM master_items

            WHERE
                unified_code LIKE 'PBI-%'

        `).get();


    const next =
        (
            Number(
                row?.maxNumber
            ) || 0
        ) + 1;


    return `PBI-${String(next).padStart(7, "0")}`;

}


function classifyMapping(
    db,
    mapping
) {

    const branchId =
        Number(
            mapping.branch_id
        );

    const branchItemId =
        String(
            mapping.branch_item_id
        );

    const itemName =
        String(
            mapping.branch_item_name ??
            ""
        ).trim();


    if (
        !itemName
    ) {

        db.prepare(`

            UPDATE master_item_branch_map

            SET
                match_status = 'PENDING_REVIEW',
                source = 'REVIEW',
                updated_at = CURRENT_TIMESTAMP

            WHERE
                branch_id = ?
                AND branch_item_id = ?

                AND match_status NOT IN (
                    'USER_CONFIRMED',
                    'USER_CREATED'
                )

        `).run(
            branchId,
            branchItemId
        );

        return "PENDING_REVIEW";

    }


    if (
        mapping.match_status ===
        "USER_CONFIRMED" ||
        mapping.match_status ===
        "USER_CREATED"
    ) {

        return mapping.match_status;

    }


    const normalized =
        normalizeSearchValue(
            itemName
        );


    const exactMasters =
        getExactMasters(
            db,
            normalized
        );


    if (
        exactMasters.length === 1
    ) {

        const master =
            exactMasters[0];


        db.prepare(`

            UPDATE master_item_branch_map

            SET

                master_item_id = ?,

                match_status = 'AUTO_EXACT',

                source = 'AUTO_EXACT',

                updated_at = CURRENT_TIMESTAMP

            WHERE
                branch_id = ?
                AND branch_item_id = ?

        `).run(
            master.id,
            branchId,
            branchItemId
        );


        insertAlias(
            db,
            {
                masterItemId:
                    master.id,

                branchId,

                aliasValue:
                    itemName
            }
        );


        db.prepare(`

            UPDATE master_item_review

            SET

                status = 'RESOLVED',

                suggested_master_item_id = ?,

                updated_at = CURRENT_TIMESTAMP

            WHERE
                branch_id = ?
                AND branch_item_id = ?

        `).run(
            master.id,
            branchId,
            branchItemId
        );


        return "AUTO_EXACT";

    }


    db.prepare(`

        UPDATE master_item_branch_map

        SET

            match_status = 'PENDING_REVIEW',

            source = 'REVIEW',

            updated_at = CURRENT_TIMESTAMP

        WHERE
            branch_id = ?
            AND branch_item_id = ?

    `).run(
        branchId,
        branchItemId
    );


    return "PENDING_REVIEW";

}


function ensureReviewRecord(
    db,
    mapping
) {

    const branchId =
        Number(
            mapping.branch_id
        );

    const branchItemId =
        String(
            mapping.branch_item_id
        );


    if (
        mapping.match_status !==
        "PENDING_REVIEW"
    ) {

        return null;

    }


    const candidates =
        getCandidateMasters(
            db,
            {
                branchId,
                branchItemId,

                itemName:
                    mapping.branch_item_name,

                currentMasterId:
                    mapping.master_item_id,

                limit:
                    5
            }
        );


    const suggested =
        candidates[0] ||
        null;


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
            ?,
            CURRENT_TIMESTAMP

        )

        ON CONFLICT (
            branch_id,
            branch_item_id
        )

        DO UPDATE SET

            branch_item_code =
                excluded.branch_item_code,

            branch_item_name =
                excluded.branch_item_name,

            normalized_name =
                excluded.normalized_name,

            reason =
                excluded.reason,

            status =
                CASE

                    WHEN master_item_review.status =
                        'RESOLVED'

                    THEN master_item_review.status

                    ELSE 'PENDING'

                END,

            suggested_master_item_id =
                excluded.suggested_master_item_id,

            updated_at =
                CURRENT_TIMESTAMP

    `).run(

        branchId,

        branchItemId,

        mapping.branch_item_code ??
            null,

        mapping.branch_item_name ??
            null,

        normalizeSearchValue(
            mapping.branch_item_name
        ),

        candidates.length
            ? "NAME_NOT_EXACT"
            : "NO_CANDIDATE",

        suggested?.id ??
            null

    );


    return candidates;

}


function buildReviewObject(
    db,
    mapping
) {

    const review =
        db.prepare(`

            SELECT

                id,
                status,
                reason,
                suggested_master_item_id

            FROM master_item_review

            WHERE
                branch_id = ?
                AND branch_item_id = ?

            LIMIT 1

        `).get(
            Number(
                mapping.branch_id
            ),
            String(
                mapping.branch_item_id
            )
        );


    if (
        !review ||
        review.status ===
        "RESOLVED"
    ) {

        return null;

    }


    const current =
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
            Number(
                mapping.master_item_id
            )
        );


    const candidate =
        review.suggested_master_item_id
            ? db.prepare(`

                SELECT

                    id,
                    unified_code,
                    canonical_name,
                    normalized_name

                FROM master_items

                WHERE id = ?

                LIMIT 1

            `).get(
                Number(
                    review.suggested_master_item_id
                )
            )
            : null;


    return {

        reviewId:
            review.id,

        status:
            review.status,

        reason:
            review.reason,

        branchId:
            Number(
                mapping.branch_id
            ),

        branchItemId:
            String(
                mapping.branch_item_id
            ),

        branchItemCode:
            mapping.branch_item_code ??
            null,

        branchItemName:
            mapping.branch_item_name ??
            null,

        currentMaster:
            current,

        candidate:
            candidate,

        candidateScore:
            candidate
                ? similarityScore(
                    mapping.branch_item_name,
                    candidate.canonical_name
                )
                : 0

    };

}


function importMasterItemSeed_DISABLED(
    seedPath
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    if (
        !fs.existsSync(
            seedPath
        )
    ) {

        throw new Error(
            `Master item seed not found: ${seedPath}`
        );

    }


    const seed =
        JSON.parse(
            fs.readFileSync(
                seedPath,
                "utf8"
            )
        );


    const masterItems =
        Array.isArray(
            seed?.masterItems
        )
            ? seed.masterItems
            : [];


    if (
        masterItems.length === 0
    ) {

        throw new Error(
            "Master item seed contains no masterItems."
        );

    }


    const transaction =
        db.transaction(
            items => {

                let masterCount = 0;
                let mappingCount = 0;
                let aliasCount = 0;


                for (
                    const item
                    of items
                ) {

                    if (
                        !item?.unifiedCode ||
                        !item?.canonicalName ||
                        !Array.isArray(
                            item?.branches
                        )
                    ) {

                        continue;

                    }


                    db.prepare(`

                        INSERT INTO master_items (

                            unified_code,
                            canonical_name,
                            normalized_name,
                            status,
                            updated_at

                        )

                        VALUES (
                            ?,
                            ?,
                            ?,
                            'ACTIVE',
                            CURRENT_TIMESTAMP
                        )

                        ON CONFLICT (
                            unified_code
                        )

                        DO UPDATE SET

                            canonical_name =
                                excluded.canonical_name,

                            normalized_name =
                                excluded.normalized_name,

                            updated_at =
                                CURRENT_TIMESTAMP

                    `).run(

                        String(
                            item.unifiedCode
                        ),

                        String(
                            item.canonicalName
                        ),

                        String(
                            item.normalizedName ||
                            normalizeSearchValue(
                                item.canonicalName
                            )
                        )

                    );


                    const master =
                        db.prepare(`

                            SELECT
                                id

                            FROM master_items

                            WHERE
                                unified_code = ?

                            LIMIT 1

                        `).get(
                            String(
                                item.unifiedCode
                            )
                        );


                    if (
                        !master?.id
                    ) {

                        throw new Error(
                            `Failed to resolve master item ${item.unifiedCode}`
                        );

                    }


                    masterCount += 1;


                    for (
                        const branch
                        of item.branches
                    ) {

                        const branchId =
                            Number(
                                branch?.branchId
                            );

                        const branchItemId =
                            String(
                                branch?.branchItemId ??
                                ""
                            );


                        if (
                            !Number.isInteger(
                                branchId
                            ) ||
                            branchId <= 0 ||
                            !branchItemId ||
                            branchItemId === "0"
                        ) {

                            continue;

                        }


                        db.prepare(`

                            INSERT INTO master_item_branch_map (

                                master_item_id,
                                branch_id,
                                branch_item_id,
                                branch_item_code,
                                branch_item_name,
                                barcode,
                                parts,
                                match_status,
                                source,
                                updated_at

                            )

                            VALUES (

                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                'AUTO_HIGH',
                                'MASTER_SEED',
                                CURRENT_TIMESTAMP

                            )

                            ON CONFLICT (
                                branch_id,
                                branch_item_id
                            )

                            DO UPDATE SET

                                master_item_id =
                                    CASE
                                        WHEN master_item_branch_map.match_status
                                             IN ('USER_CONFIRMED','USER_CREATED')
                                        THEN master_item_branch_map.master_item_id
                                        ELSE excluded.master_item_id
                                    END,

                                branch_item_code =
                                    excluded.branch_item_code,

                                branch_item_name =
                                    excluded.branch_item_name,

                                barcode =
                                    excluded.barcode,

                                parts =
                                    excluded.parts,

                                updated_at =
                                    CURRENT_TIMESTAMP

                        `).run(

                            master.id,

                            branchId,

                            branchItemId,

                            branch?.branchItemCode ??
                                null,

                            branch?.branchItemName ??
                                null,

                            branch?.barcode ??
                                null,

                            Number(
                                branch?.parts
                            ) || 1

                        );


                        mappingCount += 1;


                        if (
                            branch?.branchItemName
                        ) {

                            insertAlias(
                                db,
                                {
                                    masterItemId:
                                        master.id,

                                    branchId,

                                    aliasValue:
                                        branch.branchItemName
                                }
                            );

                            aliasCount += 1;

                        }

                    }

                }


                return {

                    masterCount,
                    mappingCount,
                    aliasCount

                };

            }
        );


    const result =
        transaction(
            masterItems
        );


    return {

        success:
            true,

        ...result,

        seedMasterCount:
            masterItems.length

    };

}


function searchExistingMasters(
    query,
    {
        limit = 50
    } = {}
) {

    ensureMasterItemSchema();

    const db =
        getLocalSalesDatabase();

    const value =
        String(
            query ?? ""
        ).trim();

    if (!value) {
        return [];
    }

    const normalized =
        normalizeSearchValue(
            value
        );

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            100
        );

    const like =
        `%${normalized}%`;

    return db.prepare(`

        SELECT
            id,
            unified_code,
            canonical_name,
            normalized_name,
            status

        FROM master_items

        WHERE
            status = 'ACTIVE'

            AND (
                normalized_name LIKE ?
                OR UPPER(canonical_name) LIKE UPPER(?)
                OR UPPER(unified_code) LIKE UPPER(?)
            )

        ORDER BY
            UPPER(TRIM(COALESCE(canonical_name, ''))),
            unified_code

        LIMIT ?

    `).all(
        like,
        `%${value}%`,
        `%${value}%`,
        safeLimit
    );
}
function searchMasterItems(
    query,
    {
        branchId = null,
        limit = 50
    } = {}
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const value =
        String(
            query ?? ""
        ).trim();


    if (
        !value
    ) {

        return [];

    }


    const normalized =
        normalizeSearchValue(
            value
        );


    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            200
        );


    const numericBranchId =
        Number(
            branchId
        );


    const hasBranch =
        Number.isInteger(
            numericBranchId
        ) &&
        numericBranchId > 0;


    if (
        /^PBI-\d+$/i.test(
            value
        )
    ) {

        return db.prepare(`

            SELECT

                mi.id,
                mi.unified_code,
                mi.canonical_name,
                mi.normalized_name,
                mi.status,

                mim.branch_id,
                mim.branch_item_id,
                mim.branch_item_code,
                mim.branch_item_name,
                mim.barcode,
                mim.parts,
                mim.match_status,
                mim.source

            FROM master_items mi

            LEFT JOIN master_item_branch_map mim

                ON mim.master_item_id =
                   mi.id

            WHERE

                mi.unified_code = ?

                AND (
                    ? = 0
                    OR mim.branch_id = ?
                )

            ORDER BY
                mim.branch_id

            LIMIT ${safeLimit}

        `).all(
            value.toUpperCase(),
            hasBranch
                ? numericBranchId
                : 0,
            hasBranch
                ? numericBranchId
                : 0
        );

    }


    if (
        /^\d+$/.test(
            value
        )
    ) {

        const querySql = hasBranch
            ? `

                SELECT

                    mi.id,
                    mi.unified_code,
                    mi.canonical_name,
                    mi.normalized_name,
                    mi.status,

                    mim.branch_id,
                    mim.branch_item_id,
                    mim.branch_item_code,
                    mim.branch_item_name,
                    mim.barcode,
                    mim.parts,
                    mim.match_status,
                    mim.source

                FROM master_item_branch_map mim

                INNER JOIN master_items mi

                    ON mi.id =
                       mim.master_item_id

                WHERE

                    mim.branch_id = ?

                    AND (
                        mim.branch_item_id = ?
                        OR mim.branch_item_code = ?
                    )

                ORDER BY
                    mi.id

                LIMIT ${safeLimit}

            `
            : `

                SELECT

                    mi.id,
                    mi.unified_code,
                    mi.canonical_name,
                    mi.normalized_name,
                    mi.status,

                    mim.branch_id,
                    mim.branch_item_id,
                    mim.branch_item_code,
                    mim.branch_item_name,
                    mim.barcode,
                    mim.parts,
                    mim.match_status,
                    mim.source

                FROM master_item_branch_map mim

                INNER JOIN master_items mi

                    ON mi.id =
                       mim.master_item_id

                WHERE

                    mim.branch_item_id = ?
                    OR mim.branch_item_code = ?

                ORDER BY
                    mi.id,
                    mim.branch_id

                LIMIT ${safeLimit}

            `;


        const params =
            hasBranch
                ? [
                    numericBranchId,
                    value,
                    value
                ]
                : [
                    value,
                    value
                ];


        const rows =
            db.prepare(
                querySql
            ).all(
                ...params
            );


        if (
            rows.length
        ) {

            return rows;

        }

    }


    const exact =
        db.prepare(`

            SELECT DISTINCT

                mi.id,
                mi.unified_code,
                mi.canonical_name,
                mi.normalized_name,
                mi.status,

                mim.branch_id,
                mim.branch_item_id,
                mim.branch_item_code,
                mim.branch_item_name,
                mim.barcode,
                mim.parts,
                mim.match_status,
                mim.source

            FROM master_item_aliases mia

            INNER JOIN master_items mi

                ON mi.id =
                   mia.master_item_id

            LEFT JOIN master_item_branch_map mim

                ON mim.master_item_id =
                   mi.id

                AND (
                    mia.branch_id IS NULL
                    OR mim.branch_id =
                       mia.branch_id
                )

            WHERE

                mia.normalized_alias = ?

                AND (
                    ? = 0
                    OR mim.branch_id = ?
                    OR mim.branch_id IS NULL
                )

            ORDER BY
                mi.id

            LIMIT ${safeLimit}

        `).all(
            normalized,
            hasBranch
                ? numericBranchId
                : 0,
            hasBranch
                ? numericBranchId
                : 0
        );


    if (
        exact.length
    ) {

        return exact;

    }


    const like =
        `%${normalized}%`;


    return db.prepare(`

        SELECT DISTINCT

            mi.id,
            mi.unified_code,
            mi.canonical_name,
            mi.normalized_name,
            mi.status,

            mim.branch_id,
            mim.branch_item_id,
            mim.branch_item_code,
            mim.branch_item_name,
            mim.barcode,
            mim.parts,
            mim.match_status,
            mim.source

        FROM master_items mi

        LEFT JOIN master_item_branch_map mim

            ON mim.master_item_id =
               mi.id

        WHERE

            (
                mi.normalized_name LIKE ?
                OR mi.canonical_name LIKE ?
            )

            AND (
                ? = 0
                OR mim.branch_id = ?
                OR mim.branch_id IS NULL
            )

        ORDER BY

            CASE

                WHEN mi.normalized_name = ?
                    THEN 0

                WHEN mi.canonical_name = ?
                    THEN 1

                ELSE 2

            END,

            mi.canonical_name

        LIMIT ${safeLimit}

    `).all(

        like,
        like,

        hasBranch
            ? numericBranchId
            : 0,

        hasBranch
            ? numericBranchId
            : 0,

        normalized,
        value

    );

}


function resolveItem(
    query,
    {
        branchId = null
    } = {}
) {

    const results =
        searchMasterItems(
            query,
            {
                branchId,
                limit:
                    20
            }
        );


    if (
        results.length === 0
    ) {

        return {

            success:
                false,

            found:
                false,

            ambiguous:
                false,

            query:
                String(
                    query ?? ""
                ),

            results: []

        };

    }


    const masterIds =
        [
            ...new Set(
                results.map(
                    row =>
                        row.id
                )
            )
        ];


    return {

        success:
            true,

        found:
            true,

        ambiguous:
            masterIds.length > 1,

        query:
            String(
                query ?? ""
            ),

        result:
            results[0],

        results

    };

}


function getMasterItemById(
    masterItemId
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


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

            WHERE id = ?

            LIMIT 1

        `).get(
            Number(
                masterItemId
            )
        );


    if (
        !master
    ) {

        return null;

    }


    const branches =
        db.prepare(`

            SELECT

                mim.branch_id,
                mim.branch_item_id,
                mim.branch_item_code,
                mim.branch_item_name,
                mim.barcode,
                mim.parts,
                mim.match_status,
                mim.source

            FROM master_item_branch_map mim

            WHERE mim.master_item_id = ?

            ORDER BY
                mim.branch_id

        `).all(
            Number(
                masterItemId
            )
        );


    const aliases =
        db.prepare(`

            SELECT

                id,
                alias_value,
                normalized_alias,
                alias_type,
                branch_id

            FROM master_item_aliases

            WHERE master_item_id = ?

            ORDER BY
                branch_id,
                alias_value

        `).all(
            Number(
                masterItemId
            )
        );


    return {

        ...master,

        branches,

        aliases

    };

}


function classifyAutoHighMappings(
    db
) {

    const mappings =
        db.prepare(`

            SELECT

                id,
                branch_id,
                branch_item_id,
                branch_item_name,
                match_status

            FROM master_item_branch_map

            WHERE
                match_status = 'AUTO_HIGH'

            ORDER BY
                id

        `).all();


    if (
        mappings.length === 0
    ) {

        return {

            scanned:
                0,

            exact:
                0,

            pending:
                0

        };

    }


    const masters =
        db.prepare(`

            SELECT

                id,
                normalized_name

            FROM master_items

            WHERE
                status = 'ACTIVE'

        `).all();


    const exactMap =
        new Map();


    const ambiguousNames =
        new Set();


    for (
        const master
        of masters
    ) {

        const normalized =
            normalizeSearchValue(
                master.normalized_name
            );


        if (
            !normalized
        ) {

            continue;

        }


        if (
            ambiguousNames.has(
                normalized
            )
        ) {

            continue;

        }


        if (
            exactMap.has(
                normalized
            )
        ) {

            exactMap.delete(
                normalized
            );

            ambiguousNames.add(
                normalized
            );

            continue;

        }


        exactMap.set(
            normalized,
            Number(
                master.id
            )
        );

    }


    const updateExact =
        db.prepare(`

            UPDATE master_item_branch_map

            SET

                master_item_id = ?,

                match_status = 'AUTO_EXACT',

                source = 'AUTO_EXACT',

                updated_at = CURRENT_TIMESTAMP

            WHERE
                id = ?

        `);


    const updatePending =
        db.prepare(`

            UPDATE master_item_branch_map

            SET

                match_status = 'PENDING_REVIEW',

                source = 'REVIEW',

                updated_at = CURRENT_TIMESTAMP

            WHERE
                id = ?

        `);


    let exact = 0;
    let pending = 0;


    const transaction =
        db.transaction(
            () => {

                for (
                    const mapping
                    of mappings
                ) {

                    const normalized =
                        normalizeSearchValue(
                            mapping.branch_item_name
                        );


                    const masterId =
                        normalized &&
                        !ambiguousNames.has(
                            normalized
                        )
                            ? exactMap.get(
                                normalized
                            )
                            : null;


                    if (
                        masterId
                    ) {

                        updateExact.run(
                            masterId,
                            mapping.id
                        );

                        exact += 1;

                    }
                    else {

                        updatePending.run(
                            mapping.id
                        );

                        pending += 1;

                    }

                }

            }
        );


    transaction();


    return {

        scanned:
            mappings.length,

        exact,

        pending

    };

}


function getReviewGroup(
    {
        branchId,
        branchItemId
    }
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const numericBranchId =
        Number(
            branchId
        );


    const itemId =
        String(
            branchItemId
        );


    const mapping =
        db.prepare(`

            SELECT

                mim.id,
                mim.branch_id,
                mim.branch_item_id,
                mim.branch_item_code,
                mim.branch_item_name,
                mim.master_item_id,
                mim.match_status

            FROM master_item_branch_map mim

            WHERE
                mim.branch_id = ?
                AND mim.branch_item_id = ?

            LIMIT 1

        `).get(
            numericBranchId,
            itemId
        );


    if (
        !mapping
    ) {

        return {

            success:
                false,

            items:
                [],

            count:
                0

        };

    }


    const normalizedName =
        normalizeSearchValue(
            mapping.branch_item_name
        );


    if (
        !normalizedName
    ) {

        return {

            success:
                true,

            normalizedName:
                "",

            items:
                [mapping],

            count:
                1

        };

    }


    const items =
        db.prepare(`

            SELECT

                mim.id,
                mim.branch_id,
                mim.branch_item_id,
                mim.branch_item_code,
                mim.branch_item_name,
                mim.master_item_id,
                mim.match_status,

                mir.id AS review_id,
                mir.status AS review_status,
                mir.suggested_master_item_id

            FROM master_item_branch_map mim

            LEFT JOIN master_item_review mir

                ON mir.branch_id =
                   mim.branch_id

                AND mir.branch_item_id =
                    mim.branch_item_id

            WHERE

                mim.match_status =
                    'PENDING_REVIEW'

                AND mir.status =
                    'PENDING'

                AND mir.normalized_name = ?

            ORDER BY

                mim.branch_id,
                mim.branch_item_id

        `).all(
            normalizedName
        );


    return {

        success:
            true,

        normalizedName,

        items,

        count:
            items.length

    };

}

function searchReviewQueue(
    {
        limit = 100,
        offset = 0,
        branchId = null,
        search = "",
        sortBy = "name"
    } = {}
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 100,
                1
            ),
            100
        );


    const safeOffset =
        Math.max(
            Number(offset) || 0,
            0
        );


    const numericBranchId =
        Number(
            branchId
        );


    const hasBranch =
        Number.isInteger(
            numericBranchId
        ) &&
        numericBranchId > 0;


    const searchValue =
        String(
            search ?? ""
        )
            .trim()
            .toUpperCase();


    const conditions = [

        "mim.match_status = 'PENDING_REVIEW'"

    ];


    const params = [];


    if (
        hasBranch
    ) {

        conditions.push(
            "mim.branch_id = ?"
        );

        params.push(
            numericBranchId
        );

    }


    if (
        searchValue
    ) {

        const like =
            `%${searchValue}%`;


        conditions.push(`

            (

                UPPER(
                    COALESCE(
                        mim.branch_item_name,
                        ''
                    )
                ) LIKE ?

                OR UPPER(
                    COALESCE(
                        mim.branch_item_code,
                        ''
                    )
                ) LIKE ?

                OR UPPER(
                    COALESCE(
                        mim.branch_item_id,
                        ''
                    )
                ) LIKE ?

                OR UPPER(
                    COALESCE(
                        mi.canonical_name,
                        ''
                    )
                ) LIKE ?

                OR UPPER(
                    COALESCE(
                        mi.unified_code,
                        ''
                    )
                ) LIKE ?

            )

        `);


        params.push(
            like,
            like,
            like,
            like,
            like
        );

    }


    const whereSql =
        conditions.join(
            " AND "
        );


    const total =
        db.prepare(`

            SELECT
                COUNT(*) AS count

            FROM master_item_branch_map mim

            LEFT JOIN master_item_review mir

                ON mir.branch_id =
                   mim.branch_id

                AND mir.branch_item_id =
                    mim.branch_item_id

            LEFT JOIN master_items mi

                ON mi.id =
                   mim.master_item_id

            WHERE
                ${whereSql}

        `).get(
            ...params
        ).count;


    let orderSql = `

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

    `;


    if (
        sortBy ===
        "branch"
    ) {

        orderSql = `

            mim.branch_id,

            UPPER(
                TRIM(
                    COALESCE(
                        mim.branch_item_name,
                        ''
                    )
                )
            ),

            mim.branch_item_id

        `;

    }


    if (
        sortBy ===
        "code"
    ) {

        orderSql = `

            mim.branch_item_code,

            mim.branch_item_id

        `;

    }


    if (
        sortBy ===
        "oldest"
    ) {

        orderSql = `

            mir.id

        `;

    }


    const rows =
        db.prepare(`

            SELECT

                mim.*,

                mi.unified_code
                    AS current_unified_code,

                mi.canonical_name
                    AS current_canonical_name

            FROM master_item_branch_map mim

            LEFT JOIN master_item_review mir

                ON mir.branch_id =
                   mim.branch_id

                AND mir.branch_item_id =
                    mim.branch_item_id

            LEFT JOIN master_items mi

                ON mi.id =
                   mim.master_item_id

            WHERE
                ${whereSql}

            ORDER BY
                ${orderSql}

            LIMIT ?

            OFFSET ?

        `).all(

            ...params,

            safeLimit,

            safeOffset

        );


    const results = [];


    for (
        const row
        of rows
    ) {

        ensureReviewRecord(
            db,
            row
        );


        const review =
            buildReviewObject(
                db,
                row
            );


        if (
            review
        ) {

            results.push(
                review
            );

        }

    }


    if (
        sortBy ===
        "similarity"
    ) {

        results.sort(
            (
                a,
                b
            ) =>
                Number(
                    b.candidateScore ||
                    0
                ) -
                Number(
                    a.candidateScore ||
                    0
                )
        );

    }


    return {

        success:
            true,

        results,

        total:
            Number(
                total
            ) || 0,

        limit:
            safeLimit,

        offset:
            safeOffset

    };

}

function getReviewQueue(
    {
        limit = 25,
        branchId = null
    } = {}
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    /*
     * Full one-time classification:
     *
     * AUTO_HIGH
     *      ↓
     * exact name  → AUTO_EXACT
     * different   → PENDING_REVIEW
     *
     * On later calls there should normally be
     * no AUTO_HIGH rows left, so this becomes cheap.
     */


    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 25,
                1
            ),
            100
        );


    const numericBranchId =
        Number(
            branchId
        );


    const branchFilter =
        Number.isInteger(
            numericBranchId
        ) &&
        numericBranchId > 0
            ? numericBranchId
            : null;


    const mappings =
        db.prepare(`

            SELECT

                mim.*,

                mi.unified_code AS current_unified_code,

                mi.canonical_name AS current_canonical_name

            FROM master_item_branch_map mim

            INNER JOIN master_items mi

                ON mi.id =
                   mim.master_item_id

            WHERE

                mim.match_status =
                    'PENDING_REVIEW'

                AND (
                    ? IS NULL
                    OR mim.branch_id = ?
                )

            ORDER BY

                UPPER(
                    TRIM(
                        mim.branch_item_name
                    )
                ),
                mim.branch_id,
                mim.branch_item_id

            LIMIT ?

        `).all(
            branchFilter,
            branchFilter,
            safeLimit
        );


    const result = [];


    for (
        const mapping
        of mappings
    ) {

        ensureReviewRecord(
            db,
            mapping
        );


        const review =
            buildReviewObject(
                db,
                mapping
            );


        if (
            review
        ) {

            result.push(
                review
            );

        }

    }


    return result;

}


function decideReview(
    {
        branchId,
        branchItemId,
        candidateMasterItemId,
        decision
    }
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const numericBranchId =
        Number(
            branchId
        );

    const itemId =
        String(
            branchItemId
        );

    const candidateId =
        Number(
            candidateMasterItemId
        );


    if (
        !Number.isInteger(
            numericBranchId
        ) ||
        numericBranchId <= 0 ||
        !itemId ||
        !Number.isInteger(
            candidateId
        ) ||
        candidateId <= 0
    ) {

        throw new Error(
            "بيانات قرار المطابقة غير صحيحة."
        );

    }


    if (
        ![
            "SAME",
            "DIFFERENT"
        ].includes(
            decision
        )
    ) {

        throw new Error(
            "قرار المطابقة غير معروف."
        );

    }


    const mapping =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                branch_id = ?
                AND branch_item_id = ?

            LIMIT 1

        `).get(
            numericBranchId,
            itemId
        );


    if (
        !mapping
    ) {

        throw new Error(
            "الصنف المحلي غير موجود."
        );

    }


    const candidate =
        db.prepare(`

            SELECT

                id,
                unified_code,
                canonical_name

            FROM master_items

            WHERE id = ?

            LIMIT 1

        `).get(
            candidateId
        );


    if (
        !candidate
    ) {

        throw new Error(
            "الصنف الموحد المقترح غير موجود."
        );

    }


    const transaction =
        db.transaction(
            () => {

                upsertDecision(
                    db,
                    {
                        branchId:
                            numericBranchId,

                        branchItemId:
                            itemId,

                        candidateMasterItemId:
                            candidateId,

                        decision

                    }
                );


                if (
                    decision ===
                    "SAME"
                ) {

                    db.prepare(`

                        UPDATE master_item_branch_map

                        SET

                            master_item_id = ?,

                            match_status =
                                'USER_CONFIRMED',

                            source =
                                'USER_REVIEW',

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            branch_id = ?
                            AND branch_item_id = ?

                    `).run(

                        candidateId,

                        numericBranchId,

                        itemId

                    );


                    insertAlias(
                        db,
                        {
                            masterItemId:
                                candidateId,

                            branchId:
                                numericBranchId,

                            aliasValue:
                                mapping.branch_item_name
                        }
                    );


                    db.prepare(`

                        UPDATE master_item_review

                        SET

                            status =
                                'RESOLVED',

                            suggested_master_item_id = ?,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            branch_id = ?
                            AND branch_item_id = ?

                    `).run(

                        candidateId,

                        numericBranchId,

                        itemId

                    );

                }
                else {

                    db.prepare(`

                        UPDATE master_item_branch_map

                        SET

                            match_status =
                                'PENDING_REVIEW',

                            source =
                                'REVIEW',

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            branch_id = ?
                            AND branch_item_id = ?

                            AND match_status NOT IN (
                                'USER_CONFIRMED',
                                'USER_CREATED'
                            )

                    `).run(
                        numericBranchId,
                        itemId
                    );

                }

            }
        );


    transaction();


    if (
        decision ===
        "DIFFERENT"
    ) {

        const refreshed =
            db.prepare(`

                SELECT *

                FROM master_item_branch_map

                WHERE
                    branch_id = ?
                    AND branch_item_id = ?

                LIMIT 1

            `).get(
                numericBranchId,
                itemId
            );


        const candidates =
            getCandidateMasters(
                db,
                {
                    branchId:
                        numericBranchId,

                    branchItemId:
                        itemId,

                    itemName:
                        refreshed.branch_item_name,

                    currentMasterId:
                        refreshed.master_item_id,

                    limit:
                        5
                }
            );


        const next =
            candidates[0] ||
            null;


        db.prepare(`

            UPDATE master_item_review

            SET

                status =
                    'PENDING',

                suggested_master_item_id = ?,

                reason = ?,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                branch_id = ?
                AND branch_item_id = ?

        `).run(

            next?.id ??
                null,

            next
                ? "NAME_NOT_EXACT"
                : "NO_CANDIDATE",

            numericBranchId,

            itemId

        );

    }


    const current =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                branch_id = ?
                AND branch_item_id = ?

            LIMIT 1

        `).get(
            numericBranchId,
            itemId
        );


    return {

        success:
            true,

        decision,

        review:
            current
                ? buildReviewObject(
                    db,
                    current
                )
                : null

    };

}


function decideReviewGroup(
    {
        branchId,
        branchItemId,
        candidateMasterItemId,
        decision
    }
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const group =
        getReviewGroup(
            {
                branchId,
                branchItemId
            }
        );


    if (
        !group?.items?.length
    ) {

        throw new Error(
            "لم يتم العثور على مجموعة المراجعة."
        );

    }


    const candidateId =
        Number(
            candidateMasterItemId
        );


    if (
        !Number.isInteger(
            candidateId
        ) ||
        candidateId <= 0
    ) {

        throw new Error(
            "الـ Master المقترح غير صحيح."
        );

    }


    const candidate =
        db.prepare(`

            SELECT

                id,
                unified_code,
                canonical_name

            FROM master_items

            WHERE id = ?

            LIMIT 1

        `).get(
            candidateId
        );


    if (
        !candidate
    ) {

        throw new Error(
            "الـ Master المقترح غير موجود."
        );

    }


    if (
        ![
            "SAME",
            "DIFFERENT"
        ].includes(
            decision
        )
    ) {

        throw new Error(
            "قرار المطابقة غير صحيح."
        );

    }


    const transaction =
        db.transaction(
            () => {

                for (
                    const row
                    of group.items
                ) {

                    upsertDecision(
                        db,
                        {
                            branchId:
                                Number(
                                    row.branch_id
                                ),

                            branchItemId:
                                String(
                                    row.branch_item_id
                                ),

                            candidateMasterItemId:
                                candidateId,

                            decision
                        }
                    );


                    if (
                        decision ===
                        "SAME"
                    ) {

                        db.prepare(`

                            UPDATE master_item_branch_map

                            SET

                                master_item_id = ?,

                                match_status =
                                    'USER_CONFIRMED',

                                source =
                                    'USER_REVIEW',

                                updated_at =
                                    CURRENT_TIMESTAMP

                            WHERE
                                branch_id = ?

                                AND branch_item_id = ?

                        `).run(

                            candidateId,

                            Number(
                                row.branch_id
                            ),

                            String(
                                row.branch_item_id
                            )

                        );


                        insertAlias(
                            db,
                            {
                                masterItemId:
                                    candidateId,

                                branchId:
                                    Number(
                                        row.branch_id
                                    ),

                                aliasValue:
                                    row.branch_item_name
                            }
                        );


                        db.prepare(`

                            UPDATE master_item_review

                            SET

                                status =
                                    'RESOLVED',

                                suggested_master_item_id = ?,

                                updated_at =
                                    CURRENT_TIMESTAMP

                            WHERE
                                branch_id = ?

                                AND branch_item_id = ?

                        `).run(

                            candidateId,

                            Number(
                                row.branch_id
                            ),

                            String(
                                row.branch_item_id
                            )

                        );

                    }
                    else {

                        db.prepare(`

                            UPDATE master_item_branch_map

                            SET

                                match_status =
                                    'PENDING_REVIEW',

                                source =
                                    'REVIEW',

                                updated_at =
                                    CURRENT_TIMESTAMP

                            WHERE
                                branch_id = ?

                                AND branch_item_id = ?

                        `).run(

                            Number(
                                row.branch_id
                            ),

                            String(
                                row.branch_item_id
                            )

                        );

                    }

                }

            }
        );


    transaction();


    /*
     * When rejecting a candidate, calculate the
     * next candidate independently for each
     * branch item, because previous decisions
     * can differ between branches.
     */
    if (
        decision ===
        "DIFFERENT"
    ) {

        for (
            const row
            of group.items
        ) {

            const refreshed =
                db.prepare(`

                    SELECT *

                    FROM master_item_branch_map

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


            const candidates =
                getCandidateMasters(
                    db,
                    {
                        branchId:
                            Number(
                                row.branch_id
                            ),

                        branchItemId:
                            String(
                                row.branch_item_id
                            ),

                        itemName:
                            refreshed.branch_item_name,

                        currentMasterId:
                            refreshed.master_item_id,

                        limit:
                            5

                    }
                );


            const next =
                candidates[0] ||
                null;


            db.prepare(`

                UPDATE master_item_review

                SET

                    suggested_master_item_id = ?,

                    reason = ?,

                    status =
                        'PENDING',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE
                    branch_id = ?

                    AND branch_item_id = ?

            `).run(

                next?.id ??
                    null,

                next
                    ? "NAME_NOT_EXACT"
                    : "NO_CANDIDATE",

                Number(
                    row.branch_id
                ),

                String(
                    row.branch_item_id
                )

            );

        }

    }


    const firstRow =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                branch_id = ?

                AND branch_item_id = ?

            LIMIT 1

        `).get(

            Number(
                group.items[0].branch_id
            ),

            String(
                group.items[0].branch_item_id
            )

        );


    return {

        success:
            true,

        decision,

        affectedCount:
            group.items.length,

        review:
            firstRow
                ? buildReviewObject(
                    db,
                    firstRow
                )
                : null

    };

}

function createMasterFromReviewManual(
    {
        branchId,
        branchItemId,
        canonicalName
    }
) {

    ensureMasterItemSchema();

    const db =
        getLocalSalesDatabase();

    const numericBranchId =
        Number(
            branchId
        );

    const itemId =
        String(
            branchItemId
        );

    const name =
        String(
            canonicalName ?? ""
        ).trim();

    if (!name) {
        throw new Error(
            "يجب إدخال الاسم الموحد."
        );
    }

    const mapping =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                branch_id = ?
                AND branch_item_id = ?

            LIMIT 1

        `).get(
            numericBranchId,
            itemId
        );

    if (!mapping) {
        throw new Error(
            "الصنف المحلي غير موجود."
        );
    }

    const normalizedName =
        normalizeSearchValue(
            name
        );

    const duplicate =
        db.prepare(`

            SELECT
                id,
                unified_code,
                canonical_name

            FROM master_items

            WHERE
                status = 'ACTIVE'
                AND normalized_name = ?

            LIMIT 1

        `).get(
            normalizedName
        );

    if (duplicate) {
        throw new Error(
            `يوجد اسم موحد بهذا الاسم بالفعل: ${duplicate.canonical_name}`
        );
    }

    const transaction =
        db.transaction(
            () => {

                const unifiedCode =
                    getNextUnifiedCode(db);

                const created =
                    db.prepare(`

                        INSERT INTO master_items (
                            unified_code,
                            canonical_name,
                            normalized_name,
                            status,
                            updated_at
                        )

                        VALUES (
                            ?,
                            ?,
                            ?,
                            'ACTIVE',
                            CURRENT_TIMESTAMP
                        )

                    `).run(
                        unifiedCode,
                        name,
                        normalizedName
                    );

                const masterId =
                    Number(
                        created.lastInsertRowid
                    );

                db.prepare(`

                    UPDATE master_item_branch_map

                    SET
                        master_item_id = ?,
                        match_status = 'USER_CREATED',
                        source = 'USER_REVIEW',
                        updated_at = CURRENT_TIMESTAMP

                    WHERE
                        branch_id = ?
                        AND branch_item_id = ?

                `).run(
                    masterId,
                    numericBranchId,
                    itemId
                );

                insertAlias(
                    db,
                    {
                        masterItemId:
                            masterId,

                        branchId:
                            numericBranchId,

                        aliasValue:
                            mapping.branch_item_name
                    }
                );

                db.prepare(`

                    UPDATE master_item_review

                    SET
                        status = 'RESOLVED',
                        suggested_master_item_id = ?,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE
                        branch_id = ?
                        AND branch_item_id = ?

                `).run(
                    masterId,
                    numericBranchId,
                    itemId
                );

                return {
                    masterId,
                    unifiedCode
                };

            }
        );

    const result =
        transaction();

    return {
        success: true,
        decision: "NEW_MASTER",
        ...result
    };
}
function createMasterFromReview(
    {
        branchId,
        branchItemId
    }
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const numericBranchId =
        Number(
            branchId
        );

    const itemId =
        String(
            branchItemId
        );


    const mapping =
        db.prepare(`

            SELECT *

            FROM master_item_branch_map

            WHERE
                branch_id = ?
                AND branch_item_id = ?

            LIMIT 1

        `).get(
            numericBranchId,
            itemId
        );


    if (
        !mapping
    ) {

        throw new Error(
            "الصنف المحلي غير موجود."
        );

    }


    const canonicalName =
        String(
            mapping.branch_item_name ??
            ""
        ).trim();


    if (
        !canonicalNameValue
    ) {

        throw new Error(
            "لا يمكن إنشاء صنف موحد بدون اسم."
        );

    }


    const transaction =
        db.transaction(
            () => {

                const unifiedCode =
                    getNextUnifiedCode(
                        db
                    );


                const created =
                    db.prepare(`

                        INSERT INTO master_items (

                            unified_code,
                            canonical_name,
                            normalized_name,
                            status,
                            updated_at

                        )

                        VALUES (

                            ?,
                            ?,
                            ?,
                            'ACTIVE',
                            CURRENT_TIMESTAMP

                        )

                    `).run(

                        unifiedCode,

                        canonicalNameValue,

                        normalizeSearchValue(
                            canonicalNameValue
                        )

                    );


                const masterId =
                    Number(
                        created.lastInsertRowid
                    );


                db.prepare(`

                    UPDATE master_item_branch_map

                    SET

                        master_item_id = ?,

                        match_status =
                            'USER_CREATED',

                        source =
                            'USER_REVIEW',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        branch_id = ?
                        AND branch_item_id = ?

                `).run(

                    masterId,

                    numericBranchId,

                    itemId

                );


                insertAlias(
                    db,
                    {
                        masterItemId:
                            masterId,

                        branchId:
                            numericBranchId,

                        aliasValue:
                            canonicalName
                    }
                );


                upsertDecision(
                    db,
                    {
                        branchId:
                            numericBranchId,

                        branchItemId:
                            itemId,

                        candidateMasterItemId:
                            masterId,

                        decision:
                            'SAME'
                    }
                );


                db.prepare(`

                    UPDATE master_item_review

                    SET

                        status =
                            'RESOLVED',

                        suggested_master_item_id = ?,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        branch_id = ?
                        AND branch_item_id = ?

                `).run(

                    masterId,

                    numericBranchId,

                    itemId

                );


                return {

                    masterId,

                    unifiedCode

                };

            }
        );


    const result =
        transaction();


    return {

        success:
            true,

        decision:
            "NEW_MASTER",

        ...result

    };

}


function createMasterFromReviewGroup(
    {
        branchId,
        branchItemId,
        canonicalName
    }
) {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const group =
        getReviewGroup(
            {
                branchId,
                branchItemId
            }
        );


    if (
        !group?.items?.length
    ) {

        throw new Error(
            "لم يتم العثور على مجموعة المراجعة."
        );

    }


    const manualCanonicalName =
        String(
            canonicalName ??
            ""
        ).trim();

    const canonicalNameValue =
        manualCanonicalName ||
        String(
            group.items[0].branch_item_name ??
            ""
        ).trim();


    if (
        !canonicalNameValue
    ) {

        throw new Error(
            "لا يمكن إنشاء صنف موحد بدون اسم."
        );

    }


    const transaction =
        db.transaction(
            () => {

                const unifiedCode =
                    getNextUnifiedCode(
                        db
                    );


                const created =
                    db.prepare(`

                        INSERT INTO master_items (

                            unified_code,
                            canonical_name,
                            normalized_name,
                            status,
                            updated_at

                        )

                        VALUES (

                            ?,
                            ?,
                            ?,
                            'ACTIVE',
                            CURRENT_TIMESTAMP

                        )

                    `).run(

                        unifiedCode,

                        canonicalNameValue,

                        normalizeSearchValue(
                            canonicalNameValue
                        )

                    );


                const masterId =
                    Number(
                        created.lastInsertRowid
                    );


                for (
                    const row
                    of group.items
                ) {

                    db.prepare(`

                        UPDATE master_item_branch_map

                        SET

                            master_item_id = ?,

                            match_status =
                                'USER_CREATED',

                            source =
                                'USER_REVIEW',

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            branch_id = ?

                            AND branch_item_id = ?

                    `).run(

                        masterId,

                        Number(
                            row.branch_id
                        ),

                        String(
                            row.branch_item_id
                        )

                    );


                    insertAlias(
                        db,
                        {
                            masterItemId:
                                masterId,

                            branchId:
                                Number(
                                    row.branch_id
                                ),

                            aliasValue:
                                row.branch_item_name

                        }
                    );


                    upsertDecision(
                        db,
                        {
                            branchId:
                                Number(
                                    row.branch_id
                                ),

                            branchItemId:
                                String(
                                    row.branch_item_id
                                ),

                            candidateMasterItemId:
                                masterId,

                            decision:
                                "SAME"

                        }
                    );


                    db.prepare(`

                        UPDATE master_item_review

                        SET

                            status =
                                'RESOLVED',

                            suggested_master_item_id = ?,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            branch_id = ?

                            AND branch_item_id = ?

                    `).run(

                        masterId,

                        Number(
                            row.branch_id
                        ),

                        String(
                            row.branch_item_id
                        )

                    );

                }


                return {

                    masterId,

                    unifiedCode,

                    affectedCount:
                        group.items.length

                };

            }
        );


    const result =
        transaction();


    return {

        success:
            true,

        decision:
            "NEW_MASTER",

        ...result

    };

}

function getMasterItemStats() {

    ensureMasterItemSchema();


    const db =
        getLocalSalesDatabase();


    const counts =
        db.prepare(`

            SELECT

                COUNT(*) AS mappingCount,

                SUM(
                    CASE
                        WHEN match_status =
                            'AUTO_EXACT'
                        THEN 1
                        ELSE 0
                    END
                ) AS exactCount,

                SUM(
                    CASE
                        WHEN match_status =
                            'USER_CONFIRMED'
                        THEN 1
                        ELSE 0
                    END
                ) AS confirmedCount,

                SUM(
                    CASE
                        WHEN match_status =
                            'USER_CREATED'
                        THEN 1
                        ELSE 0
                    END
                ) AS createdCount,

                SUM(
                    CASE
                        WHEN match_status =
                            'PENDING_REVIEW'
                        THEN 1
                        ELSE 0
                    END
                ) AS pendingCount

            FROM master_item_branch_map

        `).get();


    const masterCount =
        db.prepare(`

            SELECT COUNT(*) AS count

            FROM master_items

        `).get().count;


    const aliasCount =
        db.prepare(`

            SELECT COUNT(*) AS count

            FROM master_item_aliases

        `).get().count;


    const branchCount =
        db.prepare(`

            SELECT COUNT(
                DISTINCT branch_id
            ) AS count

            FROM master_item_branch_map

        `).get().count;


    const reviewCount =
        db.prepare(`

            SELECT COUNT(*) AS count

            FROM master_item_branch_map

            WHERE
                match_status =
                    'PENDING_REVIEW'

        `).get().count;


    return {

        masterCount:
            Number(
                masterCount
            ) || 0,

        mappingCount:
            Number(
                counts?.mappingCount
            ) || 0,

        aliasCount:
            Number(
                aliasCount
            ) || 0,

        branchCount:
            Number(
                branchCount
            ) || 0,

        exactCount:
            Number(
                counts?.exactCount
            ) || 0,

        confirmedCount:
            Number(
                counts?.confirmedCount
            ) || 0,

        createdCount:
            Number(
                counts?.createdCount
            ) || 0,

        pendingCount:
            Number(
                counts?.pendingCount
            ) || 0,

        reviewCount:
            Number(
                reviewCount
            ) || 0

    };

}


export {

    ensureMasterItemSchema,


    searchMasterItems,

    resolveItem,

    getMasterItemById,

    getReviewQueue,

    searchReviewQueue,

    getReviewGroup,

    decideReviewGroup,

    createMasterFromReviewGroup,

    decideReview,

    createMasterFromReview,

    searchExistingMasters,

    createMasterFromReviewManual,

    getMasterItemStats

};
