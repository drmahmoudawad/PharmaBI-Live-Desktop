const {
    getBranchPool
} = await import("../../connection/connectionManager.js");

const CACHE_TTL_MS = 30 * 1000;

const cache = new Map();

const inFlight = new Map();


function normalizeBranchId(branchId) {
    const id = Number(branchId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid branchId");
    }

    return id;
}


function buildDateRange(fromDate, toDate) {
    const from = String(fromDate || "").trim();
    const to = String(toDate || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
        throw new Error("Invalid fromDate. Expected YYYY-MM-DD");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new Error("Invalid toDate. Expected YYYY-MM-DD");
    }

    const [y, m, d] = to.split("-").map(Number);

    const nextDay =
        new Date(
            Date.UTC(
                y,
                m - 1,
                d + 1
            )
        );

    const toExclusive = [
        nextDay.getUTCFullYear(),
        String(nextDay.getUTCMonth() + 1).padStart(2, "0"),
        String(nextDay.getUTCDate()).padStart(2, "0")
    ].join("-");

    return {
        fromDate: from,
        toDate: to,
        fromDateSql: `${from} 00:00:00`,
        toDateExclusiveSql: `${toExclusive} 00:00:00`
    };
}


function cacheKey(branchId, fromDate, toDate) {
    return [
        "delivery-v2",
        branchId,
        fromDate,
        toDate
    ].join("|");
}


function getCached(key) {
    const entry = cache.get(key);

    if (!entry) {
        return null;
    }

    if (
        Date.now() - entry.createdAt >
        CACHE_TTL_MS
    ) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}


export async function getDeliverySummary({
    branchId,
    fromDate,
    toDate,
    connection = null
}) {

    const id =
        normalizeBranchId(
            branchId
        );

    const range =
        buildDateRange(
            fromDate,
            toDate
        );

    const key =
        cacheKey(
            id,
            range.fromDate,
            range.toDate
        );

    const cached =
        getCached(
            key
        );

    if (cached) {

        console.log(
            `[deliveryAnalyticsService] CACHE HIT ${key}`
        );

        return cached;
    }

    const existing =
        inFlight.get(
            key
        );

    if (existing) {

        console.log(
            `[deliveryAnalyticsService] IN-FLIGHT JOIN ${key}`
        );

        return existing;
    }

    console.log(
        `[deliveryAnalyticsService] IN-FLIGHT LEADER ${key}`
    );

    const request =
        (async () => {

            const pool =
                await getBranchPool(
                    id,
                    connection
                );

            const startedAt =
                Date.now();

            const result =
                await pool
                    .request()
                    .input(
                        "fromDate",
                        range.fromDateSql
                    )
                    .input(
                        "toDateExclusive",
                        range.toDateExclusiveSql
                    )
                    .query(`
                        SET NOCOUNT ON;

                        SELECT
                            COUNT(DISTINCT CASE
                                WHEN ISNULL(t.SalesReturn, 1) <> 2
                                 AND NULLIF(LTRIM(RTRIM(ISNULL(c.Name, ''))), '') IS NOT NULL
                                THEN t.ID
                            END) AS deliveryTickets,

                            COALESCE(SUM(CASE
                                WHEN NULLIF(LTRIM(RTRIM(ISNULL(c.Name, ''))), '') IS NOT NULL
                                THEN CASE
                                    WHEN ISNULL(t.SalesReturn, 1) = 2
                                        THEN -ABS(COALESCE(t.Total, 0))
                                    ELSE COALESCE(t.Total, 0)
                                END
                                ELSE 0
                            END), 0) AS deliverySales,

                            COUNT(DISTINCT CASE
                                WHEN ISNULL(t.SalesReturn, 1) = 2
                                 AND NULLIF(LTRIM(RTRIM(ISNULL(c.Name, ''))), '') IS NOT NULL
                                THEN t.ID
                            END) AS deliveryReturnTickets

                        FROM dbo.posTickets t

                        LEFT JOIN dbo.Cards c
                            ON c.ID = t.CustomerID

                        WHERE
                            t.ztime >= @fromDate
                        AND t.ztime < @toDateExclusive;
                    `);

            const row =
                result?.recordset?.[0] || {};

            const data = {
                branchId:
                    id,

                fromDate:
                    range.fromDate,

                toDate:
                    range.toDate,

                deliverySales:
                    Number(
                        row.deliverySales
                    ) || 0,

                deliveryTickets:
                    Number(
                        row.deliveryTickets
                    ) || 0,

                deliveryReturnTickets:
                    Number(
                        row.deliveryReturnTickets
                    ) || 0
            };

            cache.set(
                key,
                {
                    data,
                    createdAt:
                        Date.now()
                }
            );

            console.log(
                `[deliveryAnalyticsService] SQL ${id}|${range.fromDate}|${range.toDate} -> tickets=${data.deliveryTickets} sales=${data.deliverySales} returns=${data.deliveryReturnTickets} in ${Date.now() - startedAt} ms`
            );

            return data;

        })();

    inFlight.set(
        key,
        request
    );

    try {

        return await request;

    }
    finally {

        if (
            inFlight.get(
                key
            ) ===
            request
        ) {

            inFlight.delete(
                key
            );

        }

    }
}


export function clearDeliveryCache({
    branchId = null,
    fromDate = null,
    toDate = null
} = {}) {

    if (
        branchId === null &&
        fromDate === null &&
        toDate === null
    ) {

        cache.clear();
        inFlight.clear();

        return;
    }

    for (
        const key
        of Array.from(
            cache.keys()
        )
    ) {

        const parts =
            key.split("|");

        const matchesBranch =
            branchId === null ||
            Number(parts[1]) ===
            Number(branchId);

        const matchesFrom =
            fromDate === null ||
            parts[2] ===
            String(fromDate);

        const matchesTo =
            toDate === null ||
            parts[3] ===
            String(toDate);

        if (
            matchesBranch &&
            matchesFrom &&
            matchesTo
        ) {

            cache.delete(
                key
            );

        }

    }

}
