const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 50;

const cache = new Map();
const inFlight = new Map();

function keyOf({ branchId, fromDate, toDate }) {
    return [
        Number(branchId),
        String(fromDate),
        String(toDate)
    ].join("|");
}

export function getCachedSales(params) {
    const key = keyOf(params);
    const entry = cache.get(key);

    if (!entry) {
        return null;
    }

    if (Date.now() - entry.createdAt > TTL_MS) {
        cache.delete(key);
        return null;
    }

    cache.delete(key);
    cache.set(key, entry);
    return entry.rows;
}

export function setCachedSales(params, rows) {
    const key = keyOf(params);

    cache.delete(key);
    cache.set(key, {
        rows,
        createdAt: Date.now()
    });

    while (cache.size > MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
    }
}

export function getInFlightSales(params) {
    return inFlight.get(keyOf(params)) || null;
}

export function setInFlightSales(params, promise) {
    inFlight.set(keyOf(params), promise);
}

export function clearInFlightSales(params) {
    inFlight.delete(keyOf(params));
}

export function clearSalesCache() {
    cache.clear();
}

export function getSalesCacheStats() {
    return {
        cacheEntries: cache.size,
        inFlightEntries: inFlight.size,
        ttlSeconds: TTL_MS / 1000,
        maxEntries: MAX_ENTRIES
    };
}
