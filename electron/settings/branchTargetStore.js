import fs from "node:fs";
import path from "node:path";

import {
    app
} from "electron";


let initialized = false;

let filePath = null;


function ensureInitialized() {

    if (
        initialized
    ) {
        return;
    }


    filePath =
        path.join(
            app.getPath(
                "userData"
            ),
            "branch-targets.json"
        );


    initialized =
        true;

}


/* =========================================================
 * HELPERS
 * ========================================================= */

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
            "Invalid branchId."
        );

    }


    return id;

}


function normalizeMonth(
    month
) {

    const value =
        String(
            month || ""
        ).trim();


    if (
        !/^\d{4}-\d{2}$/.test(
            value
        )
    ) {

        throw new Error(
            "Invalid target month. Expected YYYY-MM."
        );

    }


    const monthNumber =
        Number(
            value.slice(
                5,
                7
            )
        );


    if (
        monthNumber < 1 ||
        monthNumber > 12
    ) {

        throw new Error(
            "Invalid target month."
        );

    }


    return value;

}


function normalizeNumber(
    value,
    fieldName,
    {
        allowNull = true
    } = {}
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        if (
            allowNull
        ) {

            return null;

        }

        throw new Error(
            `${fieldName} is required.`
        );

    }


    const numberValue =
        Number(
            value
        );


    if (
        !Number.isFinite(
            numberValue
        )
    ) {

        throw new Error(
            `${fieldName} must be a valid number.`
        );

    }


    if (
        numberValue < 0
    ) {

        throw new Error(
            `${fieldName} cannot be negative.`
        );

    }


    return Math.round(
        numberValue * 100
    ) / 100;

}


function createEmptyStore() {

    return {
        version: 1,
        targets: {}
    };

}


function readStore() {

    ensureInitialized();


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
            !parsed.targets ||
            typeof parsed.targets !==
                "object"
        ) {

            parsed.targets =
                {};

        }


        return parsed;

    }
    catch (
        error
    ) {

        console.error(
            "[branchTargetStore] Failed to read store:",
            error
        );


        return createEmptyStore();

    }

}


function writeStore(
    store
) {

    ensureInitialized();


    const directory =
        path.dirname(
            filePath
        );


    fs.mkdirSync(
        directory,
        {
            recursive: true
        }
    );


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


function buildKey(
    branchId,
    month
) {

    return `${normalizeBranchId(branchId)}|${normalizeMonth(month)}`;

}


/* =========================================================
 * GET ONE
 * ========================================================= */

export function getBranchMonthlyTarget(
    {
        branchId,
        month
    }
) {

    const normalizedBranchId =
        normalizeBranchId(
            branchId
        );


    const normalizedMonth =
        normalizeMonth(
            month
        );


    const store =
        readStore();


    const key =
        buildKey(
            normalizedBranchId,
            normalizedMonth
        );


    const target =
        store.targets[key];


    if (
        !target
    ) {

        return {
            success: true,
            exists: false,
            branchId:
                normalizedBranchId,
            month:
                normalizedMonth,
            target: null
        };

    }


    return {
        success: true,
        exists: true,
        branchId:
            normalizedBranchId,
        month:
            normalizedMonth,
        target: {
            ...target
        }
    };

}


/* =========================================================
 * SAVE / UPDATE
 * ========================================================= */

export function saveBranchMonthlyTarget(
    {
        branchId,
        month,
        forecastDaily,
        programTargetADaily,
        programTargetBDaily,
        managementTargetADaily,
        managementTargetBDaily
    }
) {

    const normalizedBranchId =
        normalizeBranchId(
            branchId
        );


    const normalizedMonth =
        normalizeMonth(
            month
        );


    const store =
        readStore();


    const key =
        buildKey(
            normalizedBranchId,
            normalizedMonth
        );


    const existing =
        store.targets[key] || {};


    const next = {

        branchId:
            normalizedBranchId,

        month:
            normalizedMonth,

        forecastDaily:
            normalizeNumber(
                forecastDaily,
                "forecastDaily"
            ),

        programTargetADaily:
            normalizeNumber(
                programTargetADaily,
                "programTargetADaily"
            ),

        programTargetBDaily:
            normalizeNumber(
                programTargetBDaily,
                "programTargetBDaily"
            ),

        managementTargetADaily:
            normalizeNumber(
                managementTargetADaily,
                "managementTargetADaily"
            ),

        managementTargetBDaily:
            normalizeNumber(
                managementTargetBDaily,
                "managementTargetBDaily"
            ),

        actualDaily:
            existing.actualDaily ?? null,

        actualMonthly:
            existing.actualMonthly ?? null,

        closedAt:
            existing.closedAt ?? null,

        createdAt:
            existing.createdAt ||
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


    store.targets[key] =
        next;


    writeStore(
        store
    );


    return {
        success: true,
        branchId:
            normalizedBranchId,
        month:
            normalizedMonth,
        target: {
            ...next
        }
    };

}


/* =========================================================
 * ALL TARGETS
 * ========================================================= */

export function getAllBranchTargets() {

    const store =
        readStore();


    return Object.values(
        store.targets || {}
    );

}


/* =========================================================
 * DEFAULT
 * ========================================================= */

export default {

    getBranchMonthlyTarget,

    saveBranchMonthlyTarget,

    getAllBranchTargets

};