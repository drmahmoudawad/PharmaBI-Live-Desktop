import {
    getBranchPool,
    getActiveBranchConnections
} from "../connection/connectionManager.js";

import {
    getLocalSalesDatabase
} from "../localdb/localSalesDb.js";

const BASELINE_DAYS = 90;

function normalizeDate(value) {
    const text = String(value || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(
            "Invalid evaluation date: " + text
        );
    }

    return text;
}

function calculateWeight(tickets, totalTickets) {
    if (!totalTickets) {
        return 0;
    }

    return Number(
        (
            (Number(tickets) / Number(totalTickets)) *
            100
        ).toFixed(4)
    );
}

function calculateIndex(weightPercent) {
    return Number(
        (
            (Number(weightPercent) / 100) *
            3
        ).toFixed(4)
    );
}

function ensureLocalTable() {
    const db = getLocalSalesDatabase();

    db.exec(
        "CREATE TABLE IF NOT EXISTS employee_shift_traffic_weights (" +
        "branch_id INTEGER NOT NULL," +
        "shift_code TEXT NOT NULL," +
        "baseline_start TEXT NOT NULL," +
        "baseline_end TEXT NOT NULL," +
        "sample_days INTEGER NOT NULL," +
        "tickets_total INTEGER NOT NULL DEFAULT 0," +
        "average_daily_tickets REAL NOT NULL DEFAULT 0," +
        "traffic_weight_percent REAL NOT NULL DEFAULT 0," +
        "traffic_index REAL NOT NULL DEFAULT 0," +
        "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
        "PRIMARY KEY (branch_id, shift_code)" +
        ");"
    );

    return db;
}

function saveWeights(rows) {
    const db = ensureLocalTable();

    const stmt = db.prepare(
        "INSERT INTO employee_shift_traffic_weights (" +
        "branch_id, shift_code, baseline_start, baseline_end, " +
        "sample_days, tickets_total, average_daily_tickets, " +
        "traffic_weight_percent, traffic_index, updated_at" +
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) " +
        "ON CONFLICT(branch_id, shift_code) DO UPDATE SET " +
        "baseline_start=excluded.baseline_start, " +
        "baseline_end=excluded.baseline_end, " +
        "sample_days=excluded.sample_days, " +
        "tickets_total=excluded.tickets_total, " +
        "average_daily_tickets=excluded.average_daily_tickets, " +
        "traffic_weight_percent=excluded.traffic_weight_percent, " +
        "traffic_index=excluded.traffic_index, " +
        "updated_at=datetime('now');"
    );

    for (const row of rows) {
        stmt.run(
            row.branchId,
            row.shiftCode,
            row.baselineStart,
            row.baselineEnd,
            row.sampleDays,
            row.ticketsTotal,
            row.averageDailyTickets,
            row.trafficWeightPercent,
            row.trafficIndex
        );
    }
}

export async function calculateBranchShiftTrafficWeights({
    branchId,
    evaluationFromDate,
    connection = null
}) {
    const numericBranchId = Number(branchId);
    const evaluationDate =
        normalizeDate(evaluationFromDate);

    if (
        !Number.isInteger(numericBranchId) ||
        numericBranchId <= 0
    ) {
        throw new Error("Invalid branchId");
    }

    /*
     * 02:00 is the operational boundary because:
     * Night    02:00 -> 09:00
     * Morning  09:00 -> 17:00
     * Evening  17:00 -> 02:00
     *
     * Therefore the 90-day reference period is aligned
     * exactly with complete operational days.
     */
    const baselineEnd =
        evaluationDate + " 02:00:00";

    const pool =
        await getBranchPool(
            numericBranchId,
            connection
        );

    const branchResult =
        await pool
            .request()
            .query(
                "SELECT TOP (1) " +
                "DefaultStoreID, " +
                "DefaultStoreName, " +
                "BranchName " +
                "FROM dbo.Branches " +
                "ORDER BY CASE " +
                "WHEN IsSelfBranch = 1 THEN 0 ELSE 1 END;"
            );

    const branchRow =
        branchResult?.recordset?.[0];

    const storeId =
        branchRow?.DefaultStoreID;

    if (
        storeId === null ||
        storeId === undefined
    ) {
        throw new Error(
            "DefaultStoreID not found for branch " +
            numericBranchId
        );
    }

    const result =
        await pool
            .request()
            .input(
                "storeId",
                storeId
            )
            .input(
                "baselineEnd",
                baselineEnd
            )
            .query(
                "SELECT " +
                "SUM(CASE " +
                "WHEN CONVERT(time, t.ztime) >= '09:00:00' " +
                "AND CONVERT(time, t.ztime) < '17:00:00' " +
                "THEN 1 ELSE 0 END) AS morning_tickets, " +

                "SUM(CASE " +
                "WHEN CONVERT(time, t.ztime) >= '17:00:00' " +
                "OR CONVERT(time, t.ztime) < '02:00:00' " +
                "THEN 1 ELSE 0 END) AS evening_tickets, " +

                "SUM(CASE " +
                "WHEN CONVERT(time, t.ztime) >= '02:00:00' " +
                "AND CONVERT(time, t.ztime) < '09:00:00' " +
                "THEN 1 ELSE 0 END) AS night_tickets, " +

                "COUNT_BIG(*) AS total_tickets " +

                "FROM dbo.posTickets t " +

                "WHERE t.StoreID = @storeId " +

                "AND t.SalesReturn = 1 " +

                "AND t.ztime >= DATEADD(" +
                "day, -" + BASELINE_DAYS + ", " +
                "CONVERT(datetime2, @baselineEnd)" +
                ") " +

                "AND t.ztime < CONVERT(" +
                "datetime2, @baselineEnd" +
                ");"
            );

    const row =
        result?.recordset?.[0] || {};

    const totals = {
        MORNING: Number(
            row.morning_tickets || 0
        ),

        EVENING: Number(
            row.evening_tickets || 0
        ),

        NIGHT: Number(
            row.night_tickets || 0
        )
    };

    const totalTickets =
        Number(row.total_tickets || 0);

    /*
     * Build weight rows.
     *
     * trafficWeightPercent:
     *   share of all branch traffic.
     *
     * trafficIndex:
     *   1.00 = average shift traffic.
     *   >1   = naturally busier shift.
     *   <1   = naturally quieter shift.
     */
    const rows = [
        {
            shiftCode: "MORNING",
            tickets: totals.MORNING
        },
        {
            shiftCode: "EVENING",
            tickets: totals.EVENING
        },
        {
            shiftCode: "NIGHT",
            tickets: totals.NIGHT
        }
    ].map(item => {
        const weightPercent =
            calculateWeight(
                item.tickets,
                totalTickets
            );

        return {
            branchId: numericBranchId,
            shiftCode: item.shiftCode,
            baselineStart:
                baselineEnd,
            baselineEnd:
                baselineEnd,
            sampleDays:
                BASELINE_DAYS,
            ticketsTotal:
                item.tickets,
            averageDailyTickets:
                Number(
                    (
                        item.tickets /
                        BASELINE_DAYS
                    ).toFixed(4)
                ),
            trafficWeightPercent:
                weightPercent,
            trafficIndex:
                calculateIndex(
                    weightPercent
                )
        };
    });

    saveWeights(rows);

    console.log("");
    console.log(
        "=============================================="
    );
    console.log(
        "[shiftTrafficWeight] BRANCH",
        numericBranchId,
        "STORE",
        String(storeId),
        String(branchRow?.DefaultStoreName || "")
    );
    console.log(
        "[shiftTrafficWeight] BASELINE",
        rows[0].baselineStart,
        "to",
        String(evaluationDate) + " 02:00:00",
        "(" + BASELINE_DAYS + " days)"
    );
    console.log(
        "[shiftTrafficWeight] TOTAL TICKETS:",
        totalTickets
    );

    for (const item of rows) {
        console.log(
            "[shiftTrafficWeight]",
            item.shiftCode,
            "tickets=",
            item.ticketsTotal,
            "avgDaily=",
            item.averageDailyTickets,
            "weight=",
            item.trafficWeightPercent + "%",
            "index=",
            item.trafficIndex
        );
    }

    console.log(
        "=============================================="
    );
    console.log("");

    return {
        branchId: numericBranchId,
        storeId: String(storeId),
        branchName:
            String(
                branchRow?.BranchName || ""
            ),
        baselineDays: BASELINE_DAYS,
        evaluationFromDate: evaluationDate,
        totalTickets,
        rows
    };
}

export async function recalculateAllBranchShiftTrafficWeights({
    evaluationFromDate
}) {
    const activeBranchIds =
        getActiveBranchConnections();

    if (
        !Array.isArray(activeBranchIds) ||
        activeBranchIds.length === 0
    ) {
        throw new Error(
            "No active branch connections found"
        );
    }

    const results = [];
    const failed = [];

    for (const branchId of activeBranchIds) {
        try {
            const result =
                await calculateBranchShiftTrafficWeights({
                    branchId,
                    evaluationFromDate,
                    connection: null
                });

            results.push(result);
        }
        catch (error) {
            console.error(
                "[shiftTrafficWeight] branch",
                branchId,
                "failed:",
                error?.message || error
            );

            failed.push({
                branchId,
                error:
                    error?.message ||
                    String(error)
            });
        }
    }

    console.log(
        "[shiftTrafficWeight] ALL BRANCHES COMPLETE",
        "success=",
        results.length,
        "failed=",
        failed.length
    );

    return {
        success:
            failed.length === 0,
        evaluationFromDate,
        results,
        failed
    };
}
