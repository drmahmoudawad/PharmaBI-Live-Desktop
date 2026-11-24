import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const FILE_NAME = "stock-optimization-abc-fsn-policy.json";

export const DEFAULT_STOCK_OPTIMIZATION_ABC_FSN_POLICY = Object.freeze({
    abcAThroughPct: 80,
    abcBThroughPct: 95,
    fastMinSellingDays: 10,
    fastRecentDays: 30,
    slowMinSellingDays: 1,
    slowRecentDays: 89,
    nonMovingAfterDays: 90
});

function isRecord(value) {
    return Boolean(value) &&
        typeof value === "object" &&
        !Array.isArray(value);
}

function integerField(value, key, min, max) {
    const number = Number(value);

    if (!Number.isInteger(number) || number < min || number > max) {
        throw new Error(`INVALID_ABC_FSN_POLICY_${key.toUpperCase()}`);
    }

    return number;
}

export function normalizeStockOptimizationAbcFsnPolicy(value) {
    if (!isRecord(value)) {
        throw new Error("INVALID_ABC_FSN_POLICY");
    }

    const policy = {
        abcAThroughPct: integerField(value.abcAThroughPct, "abcAThroughPct", 1, 99),
        abcBThroughPct: integerField(value.abcBThroughPct, "abcBThroughPct", 2, 100),
        fastMinSellingDays: integerField(value.fastMinSellingDays, "fastMinSellingDays", 1, 366),
        fastRecentDays: integerField(value.fastRecentDays, "fastRecentDays", 0, 366),
        slowMinSellingDays: integerField(value.slowMinSellingDays, "slowMinSellingDays", 1, 366),
        slowRecentDays: integerField(value.slowRecentDays, "slowRecentDays", 0, 366),
        nonMovingAfterDays: integerField(value.nonMovingAfterDays, "nonMovingAfterDays", 1, 730)
    };

    if (policy.abcBThroughPct <= policy.abcAThroughPct) {
        throw new Error("INVALID_ABC_FSN_POLICY_ABC_ORDER");
    }

    if (policy.slowRecentDays < policy.fastRecentDays) {
        throw new Error("INVALID_ABC_FSN_POLICY_FSN_WINDOW_ORDER");
    }

    if (policy.nonMovingAfterDays <= policy.slowRecentDays) {
        throw new Error("INVALID_ABC_FSN_POLICY_NON_MOVING_ORDER");
    }

    return policy;
}

function getFilePath() {
    return path.join(app.getPath("userData"), FILE_NAME);
}

export function getStockOptimizationAbcFsnPolicy() {
    const filePath = getFilePath();

    if (!fs.existsSync(filePath)) {
        return {
            success: true,
            exists: false,
            policy: { ...DEFAULT_STOCK_OPTIMIZATION_ABC_FSN_POLICY }
        };
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (!isRecord(parsed) || parsed.version !== 1) {
        throw new Error("INVALID_STOCK_OPTIMIZATION_ABC_FSN_POLICY_FILE");
    }

    return {
        success: true,
        exists: true,
        policy: normalizeStockOptimizationAbcFsnPolicy(parsed.policy)
    };
}

export function saveStockOptimizationAbcFsnPolicy(value) {
    const policy = normalizeStockOptimizationAbcFsnPolicy(value);
    const filePath = getFilePath();
    const directory = path.dirname(filePath);
    const temporaryPath = `${filePath}.tmp-${process.pid}`;

    fs.mkdirSync(directory, { recursive: true });

    fs.writeFileSync(
        temporaryPath,
        JSON.stringify({ version: 1, policy }, null, 4),
        "utf8"
    );

    try {
        fs.renameSync(temporaryPath, filePath);
    } catch (error) {
        fs.rmSync(temporaryPath, { force: true });
        throw error;
    }

    return {
        success: true,
        saved: true,
        exists: true,
        policy
    };
}
