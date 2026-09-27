import {
    getLocalSalesDatabase
} from "../../localdb/localSalesDb.js";


import {
    initializeCrmSchema,
    getCrmDatabase
} from "./crm/crmDb.js";


import {
    initializeCrmOperationalSchema
} from "./crm/crmOperationalSchema.js";


const QUICK_CUSTOMER_360_CACHE_TTL_MS = 30 * 1000;

const quickCustomer360Cache = new Map();

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


function round2(
    value
) {

    return Math.round(
        (
            toNumber(
                value
            ) +
            Number.EPSILON
        ) * 100
    ) / 100;

}


function normalizeCustomerId(
    value
) {

    const text =
        String(
            value ??
            ""
        ).trim();


    if (
        !text
    ) {

        return null;

    }


    if (
        !/^\d+$/.test(
            text
        )
    ) {

        return text;

    }


    return text;

}


function normalizeDate(
    value
) {

    const text =
        String(
            value ||
            ""
        ).trim();


    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {

        return null;

    }


    return text;

}


function addDays(
    dateText,
    days
) {

    const date =
        new Date(
            `${dateText}T00:00:00.000Z`
        );


    date.setUTCDate(
        date.getUTCDate() +
        Number(
            days
        )
    );


    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


function getToday() {

    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );

}


function buildRange(
    fromDate,
    toDate
) {

    const today =
        getToday();


    const normalizedTo =
        normalizeDate(
            toDate
        ) ||
        today;


    const normalizedFrom =
        normalizeDate(
            fromDate
        ) ||
        addDays(
            normalizedTo,
            -364
        );


    return {

        fromDate:
            normalizedFrom,

        toDate:
            normalizedTo,

        toExclusive:
            addDays(
                normalizedTo,
                1
            )

    };

}


/*
 * =========================================================
 * CUSTOMER PROFILE
 * =========================================================
 */

function getProfile(
    db,
    branchId,
    customerId
) {

    return db.prepare(`

        SELECT

            *

        FROM crm_customer_profiles

        WHERE
            branch_id = ?
            AND customer_id = ?

        LIMIT 1

    `).get(
        Number(branchId),
        String(customerId)
    ) || null;

}


/*
 * =========================================================
 * CUSTOMER SALES SUMMARY
 * =========================================================
 */

function getSalesSummary(
    db,
    branchId,
    customerId,
    fromDate,
    toDate
) {

    return db.prepare(`

        SELECT

            COUNT(
                DISTINCT CASE
                    WHEN transaction_type = 'SALE'
                    THEN ticket_id
                END
            ) AS sale_tickets,

            COUNT(
                DISTINCT CASE
                    WHEN transaction_type = 'RETURN'
                    THEN ticket_id
                END
            ) AS return_tickets,

            MIN(
                CASE
                    WHEN transaction_type = 'SALE'
                    THEN substr(date, 1, 10)
                END
            ) AS first_purchase_date,

            MAX(
                CASE
                    WHEN transaction_type = 'SALE'
                    THEN substr(date, 1, 10)
                END
            ) AS last_purchase_date,

            SUM(
                CASE
                    WHEN transaction_type = 'SALE'
                    THEN ABS(
                        COALESCE(
                            net_line_value,
                            0
                        )
                    )
                    ELSE 0
                END
            ) AS gross_sales,

            SUM(
                CASE
                    WHEN transaction_type = 'RETURN'
                    THEN ABS(
                        COALESCE(
                            net_line_value,
                            0
                        )
                    )
                    ELSE 0
                END
            ) AS returns,

            SUM(
                CASE
                    WHEN transaction_type = 'SALE'
                    THEN ABS(
                        COALESCE(
                            net_line_value,
                            0
                        )
                    )

                    WHEN transaction_type = 'RETURN'
                    THEN -ABS(
                        COALESCE(
                            net_line_value,
                            0
                        )
                    )

                    ELSE 0

                END
            ) AS net_sales,

            SUM(
                CASE
                    WHEN transaction_type = 'SALE'
                    THEN ABS(
                        COALESCE(
                            line_cost,
                            0
                        )
                    )

                    WHEN transaction_type = 'RETURN'
                    THEN -ABS(
                        COALESCE(
                            line_cost,
                            0
                        )
                    )

                    ELSE 0

                END
            ) AS net_cost

        FROM sales_history

        WHERE
            branch_id = ?
            AND customer_id = ?
            AND transaction_type IN (
                'SALE',
                'RETURN'
            )
            AND date >= ?
            AND date < ?

    `).get(
        Number(branchId),
        String(customerId),
        `${fromDate}T00:00:00.000Z`,
        `${toDate}T00:00:00.000Z`
    ) || {};

}


/*
 * =========================================================
 * RECENT INVOICES
 * =========================================================
 */

function getRecentInvoices(
    db,
    branchId,
    customerId,
    limit = 20
) {

    const rows =
        db.prepare(`

            SELECT

                ticket_id,

                MAX(
                    substr(
                        date,
                        1,
                        10
                    )
                ) AS date,

                MAX(
                    customer_name
                ) AS customer_name,

                SUM(
                    CASE
                        WHEN transaction_type = 'SALE'
                        THEN ABS(
                            COALESCE(
                                net_line_value,
                                0
                            )
                        )

                        WHEN transaction_type = 'RETURN'
                        THEN -ABS(
                            COALESCE(
                                net_line_value,
                                0
                            )
                        )

                        ELSE 0

                    END
                ) AS net_value,

                SUM(
                    CASE
                        WHEN transaction_type = 'SALE'
                        THEN ABS(
                            COALESCE(
                                line_cost,
                                0
                            )
                        )

                        WHEN transaction_type = 'RETURN'
                        THEN -ABS(
                            COALESCE(
                                line_cost,
                                0
                            )
                        )

                        ELSE 0

                    END
                ) AS cost_value,

                COUNT(*) AS lines

            FROM sales_history

            WHERE
                branch_id = ?
                AND customer_id = ?
                AND transaction_type IN (
                    'SALE',
                    'RETURN'
                )

            GROUP BY
                ticket_id

            ORDER BY
                date DESC,
                ticket_id DESC

            LIMIT ?

        `).all(
            Number(branchId),
            String(customerId),
            Math.max(
                1,
                Math.min(
                    100,
                    Number(limit) || 20
                )
            )
        );


    return rows.map(
        row => ({

            ticketId:
                row.ticket_id,

            date:
                row.date,

            customerName:
                row.customer_name ||
                null,

            netSales:
                round2(
                    row.net_value
                ),

            grossProfit:
                round2(
                    toNumber(
                        row.net_value
                    ) -
                    toNumber(
                        row.cost_value
                    )
                ),

            lines:
                Number(
                    row.lines
                ) || 0

        })
    );

}


/*
 * =========================================================
 * RECENT CRM INTERACTIONS
 * =========================================================
 */

function getInteractions(
    db,
    branchId,
    customerId,
    limit = 50
) {

    return db.prepare(`

        SELECT

            id,

            campaign_id,

            campaign_target_id,

            channel,

            direction,

            interaction_type,

            outcome,

            phone,

            message_id,

            content,

            employee_id,

            occurred_at,

            metadata_json

        FROM crm_interactions

        WHERE
            branch_id = ?
            AND customer_id = ?

        ORDER BY
            occurred_at DESC,
            id DESC

        LIMIT ?

    `).all(
        Number(branchId),
        String(customerId),
        Math.max(
            1,
            Math.min(
                200,
                Number(limit) || 50
            )
        )
    );

}


/*
 * =========================================================
 * WHATSAPP MESSAGES
 * =========================================================
 */

function getWhatsappMessages(
    db,
    branchId,
    customerId,
    limit = 50
) {

    return db.prepare(`

        SELECT

            id,

            campaign_id,

            campaign_target_id,

            direction,

            message_type,

            template_name,

            body_text,

            provider_message_id,

            recipient_phone,

            status,

            error_code,

            error_message,

            queued_at,

            sent_at,

            delivered_at,

            read_at,

            failed_at,

            inbound_reply,

            created_at,

            updated_at

        FROM crm_whatsapp_messages

        WHERE
            branch_id = ?
            AND customer_id = ?

        ORDER BY
            created_at DESC,
            id DESC

        LIMIT ?

    `).all(
        Number(branchId),
        String(customerId),
        Math.max(
            1,
            Math.min(
                200,
                Number(limit) || 50
            )
        )
    );

}


/*
 * =========================================================
 * FOLLOW-UPS
 * =========================================================
 */

function getFollowups(
    db,
    branchId,
    customerId,
    limit = 50
) {

    return db.prepare(`

        SELECT

            id,

            campaign_id,

            campaign_target_id,

            interaction_id,

            due_at,

            status,

            reason,

            assigned_to,

            completed_at,

            completion_outcome,

            notes,

            created_at,

            updated_at

        FROM crm_followups

        WHERE
            branch_id = ?
            AND customer_id = ?

        ORDER BY

            CASE
                WHEN status = 'PENDING'
                THEN 0
                ELSE 1
            END,

            due_at ASC,

            id DESC

        LIMIT ?

    `).all(
        Number(branchId),
        String(customerId),
        Math.max(
            1,
            Math.min(
                200,
                Number(limit) || 50
            )
        )
    );

}


/*
 * =========================================================
 * PURCHASE ATTRIBUTION
 * =========================================================
 */

function getAttributions(
    db,
    branchId,
    customerId,
    limit = 50
) {

    return db.prepare(`

        SELECT

            id,

            campaign_id,

            campaign_target_id,

            interaction_id,

            whatsapp_message_id,

            ticket_id,

            purchase_date,

            attribution_window_days,

            days_after_contact,

            attribution_method,

            attributed_revenue,

            attributed_gross_profit,

            incremental_revenue,

            incremental_gross_profit,

            created_at

        FROM crm_purchase_attributions

        WHERE
            branch_id = ?
            AND customer_id = ?

        ORDER BY
            purchase_date DESC,
            id DESC

        LIMIT ?

    `).all(
        Number(branchId),
        String(customerId),
        Math.max(
            1,
            Math.min(
                200,
                Number(limit) || 50
            )
        )
    ).map(
        row => ({

            ...row,

            attributed_revenue:
                round2(
                    row.attributed_revenue
                ),

            attributed_gross_profit:
                round2(
                    row.attributed_gross_profit
                ),

            incremental_revenue:
                row.incremental_revenue === null
                    ? null
                    : round2(
                        row.incremental_revenue
                    ),

            incremental_gross_profit:
                row.incremental_gross_profit === null
                    ? null
                    : round2(
                        row.incremental_gross_profit
                    )

        })
    );

}


/*
 * =========================================================
 * CAMPAIGN HISTORY
 * =========================================================
 */

function getCampaignHistory(
    db,
    branchId,
    customerId
) {

    return db.prepare(`

        SELECT

            t.id AS target_id,

            t.campaign_id,

            c.name AS campaign_name,

            c.objective,

            c.channel,

            c.status AS campaign_status,

            t.treatment_group,

            t.eligible,

            t.contact_status,

            t.last_contact_at,

            t.last_contact_result,

            t.response_at,

            t.first_purchase_after_contact_at,

            t.conversion_status,

            t.segment_code,

            t.lifecycle_stage,

            t.crm_priority_score,

            t.customer_value_score,

            t.created_at

        FROM crm_campaign_targets t

        LEFT JOIN crm_campaigns c

            ON c.id =
               t.campaign_id

        WHERE
            t.branch_id = ?
            AND t.customer_id = ?

        ORDER BY
            t.created_at DESC,
            t.id DESC

        LIMIT 100

    `).all(
        Number(branchId),
        String(customerId)
    );

}


/*
 * =========================================================
 * BEHAVIOR SUMMARY
 * =========================================================
 */

function buildBehaviorSummary(
    profile,
    salesSummary,
    today
) {

    const ticketCount =
        Number(
            salesSummary.sale_tickets
        ) ||
        Number(
            profile?.total_tickets
        ) ||
        0;


    const netSales =
        toNumber(
            salesSummary.net_sales
        );


    const grossProfit =
        round2(
            netSales -
            toNumber(
                salesSummary.net_cost
            )
        );


    const lastPurchase =
        salesSummary.last_purchase_date ||
        profile?.last_purchase_date ||
        null;


    const averageInterval =
        toNumber(
            profile?.average_days_between_purchases
        );


    let nextExpectedPurchaseDate =
        null;


    let purchaseTiming =
        "UNKNOWN";


    if (
        lastPurchase &&
        averageInterval > 0
    ) {

        nextExpectedPurchaseDate =
            addDays(
                lastPurchase,
                Math.max(
                    1,
                    Math.round(
                        averageInterval
                    )
                )
            );


        const daysSinceLast =
            (
                new Date(
                    `${today}T00:00:00.000Z`
                ).getTime() -
                new Date(
                    `${lastPurchase}T00:00:00.000Z`
                ).getTime()
            ) /
            86400000;


        if (
            daysSinceLast >=
            averageInterval * 1.5
        ) {

            purchaseTiming =
                "OVERDUE";

        }
        else if (
            daysSinceLast >=
            averageInterval
        ) {

            purchaseTiming =
                "DUE";

        }
        else if (
            daysSinceLast >=
            averageInterval * 0.75
        ) {

            purchaseTiming =
                "DUE_SOON";

        }
        else {

            purchaseTiming =
                "ON_TRACK";

        }

    }


    return {

        ticketCount,

        netSales:
            round2(
                netSales
            ),

        grossProfit,

        firstPurchaseDate:
            salesSummary.first_purchase_date ||
            profile?.first_purchase_date ||
            null,

        lastPurchaseDate:
            lastPurchase,

        averageTicketValue:
            ticketCount > 0
                ? round2(
                    netSales /
                    ticketCount
                )
                : toNumber(
                    profile?.average_ticket_value
                ),

        averageDaysBetweenPurchases:
            round2(
                averageInterval
            ),

        nextExpectedPurchaseDate,

        purchaseTiming

    };

}


/*
 * =========================================================
 * CUSTOMER 360
 * =========================================================
 */

export async function getCustomer360(
    {
        branchId,
        customerId,
        fromDate,
        toDate,
        quick = false
    }
) {

    const numericBranchId =
        Number(
            branchId
        );


    const normalizedCustomerId =
        normalizeCustomerId(
            customerId
        );


    if (
        !Number.isInteger(
            numericBranchId
        ) ||
        numericBranchId <= 0
    ) {

        throw new Error(
            "Invalid branchId"
        );

    }


    if (
        !normalizedCustomerId
    ) {

        throw new Error(
            "Invalid customerId"
        );

    }


    initializeCrmSchema();

    if (!quick) {
        initializeCrmOperationalSchema();
    }


    const db =
        getLocalSalesDatabase();


    const crmDb =
        getCrmDatabase();


    const range =
        buildRange(
            fromDate,
            toDate
        );


    let profile =
        getProfile(
            crmDb,
            numericBranchId,
            normalizedCustomerId
        );


    const salesSummary =
        getSalesSummary(

            db,

            numericBranchId,

            normalizedCustomerId,

            range.fromDate,

            range.toExclusive

        );


    /*
     * Build a minimal fallback profile when RFM snapshot
     * has not yet been generated for this customer.
     */

    if (
        !profile &&
        (
            Number(
                salesSummary.sale_tickets
            ) > 0
        )
    ) {

        profile = {

            branch_id:
                numericBranchId,

            customer_id:
                normalizedCustomerId,

            customer_name:
                null,

            whatsapp_phone:
                null,

            whatsapp_phone_normalized:
                null,

            whatsapp_opt_in:
                0,

            whatsapp_opt_in_at:
                null,

            whatsapp_opt_out_at:
                null

        };

    }


    if (
        !profile &&
        Number(
            salesSummary.sale_tickets
        ) === 0
    ) {

        return {

            success:
                false,

            code:
                "CUSTOMER_NOT_FOUND",

            message:
                "Customer was not found."

        };

    }


    const behaviorSummary =
        buildBehaviorSummary(
            profile,
            salesSummary,
            range.toDate
        );


    const recentInvoices =
        getRecentInvoices(
            db,
            numericBranchId,
            normalizedCustomerId,
            300
        );


    

    if (quick) {

        const quickCacheKey =
            [
                numericBranchId,
                normalizedCustomerId,
                range.fromDate,
                range.toDate
            ].join("|");

        const cached =
            quickCustomer360Cache.get(
                quickCacheKey
            );

        if (
            cached &&
            Date.now() - cached.createdAt <
                QUICK_CUSTOMER_360_CACHE_TTL_MS
        ) {
            console.log(
                "[Customer360 Quick] MEMORY CACHE HIT",
                quickCacheKey
            );

            return cached.data;
        }

        const quickResult = {
            success: true,

            branchId:
                numericBranchId,

            customerId:
                normalizedCustomerId,

            period: {
                fromDate:
                    range.fromDate,

                toDate:
                    range.toDate
            },

            profile: {
                ...(profile || {}),

                whatsappOptIn:
                    Boolean(
                        Number(
                            profile?.whatsapp_opt_in
                        )
                    )
            },

            behavior:
                behaviorSummary,

            currentRfm: {
                r:
                    profile?.r_score ??
                    null,

                f:
                    profile?.f_score ??
                    null,

                m:
                    profile?.m_score ??
                    null,

                rfmScore:
                    profile?.rfm_score ??
                    null,

                rfmTotal:
                    profile?.rfm_total ??
                    null,

                segmentCode:
                    profile?.segment_code ??
                    null,

                lifecycleStage:
                    profile?.lifecycle_stage ??
                    null,

                behaviorScore:
                    Number(
                        profile?.behavior_score
                    ) || 0,

                customerValueScore:
                    Number(
                        profile?.customer_value_score
                    ) || 0,

                crmPriorityScore:
                    Number(
                        profile?.crm_priority_score
                    ) || 0,

                crmPriorityLevel:
                    profile?.crm_priority_level ??
                    null,

                recommendedAction:
                    profile?.recommended_action ??
                    null,

                purchaseTrend:
                    profile?.purchase_trend ??
                    null,

                purchaseTrendScore:
                    Number(
                        profile?.purchase_trend_score
                    ) || 0
            },

            sales: {
                periodSummary: {
                    saleTickets:
                        Number(
                            salesSummary.sale_tickets
                        ) || 0,

                    returnTickets:
                        Number(
                            salesSummary.return_tickets
                        ) || 0,

                    grossSales:
                        round2(
                            salesSummary.gross_sales
                        ),

                    returns:
                        round2(
                            salesSummary.returns
                        ),

                    netSales:
                        round2(
                            salesSummary.net_sales
                        ),

                    netCost:
                        round2(
                            salesSummary.net_cost
                        ),

                    grossProfit:
                        round2(
                            salesSummary.gross_profit
                        ),

                    firstPurchaseDate:
                        salesSummary.first_purchase_date ??
                        null,

                    lastPurchaseDate:
                        salesSummary.last_purchase_date ??
                        null
                },

                recentInvoices
            },

            crm: {
                campaigns: [],

                interactions: [],

                followups: [],

                whatsappMessages: [],

                purchaseAttributions: []
            }
        };

        quickCustomer360Cache.set(
            quickCacheKey,
            {
                data:
                    quickResult,

                createdAt:
                    Date.now()
            }
        );

        console.log(
            "[Customer360 Quick] LOADED",
            quickCacheKey
        );

        return quickResult;
    }
const interactions =
        getInteractions(
            crmDb,
            numericBranchId,
            normalizedCustomerId,
            50
        );


    const whatsappMessages =
        getWhatsappMessages(
            crmDb,
            numericBranchId,
            normalizedCustomerId,
            50
        );


    const followups =
        getFollowups(
            crmDb,
            numericBranchId,
            normalizedCustomerId,
            50
        );


    const attributions =
        getAttributions(
            crmDb,
            numericBranchId,
            normalizedCustomerId,
            50
        );


    const campaignHistory =
        getCampaignHistory(
            crmDb,
            numericBranchId,
            normalizedCustomerId
        );


    const attributedRevenue =
        attributions.reduce(
            (
                total,
                row
            ) =>
                total +
                toNumber(
                    row.attributed_revenue
                ),
            0
        );


    const attributedGrossProfit =
        attributions.reduce(
            (
                total,
                row
            ) =>
                total +
                toNumber(
                    row.attributed_gross_profit
                ),
            0
        );


    const responses =
        interactions.filter(
            row =>
                row.direction ===
                "INBOUND"
        ).length;


    const outboundContacts =
        interactions.filter(
            row =>
                row.direction ===
                "OUTBOUND"
        ).length;


    const pendingFollowups =
        followups.filter(
            row =>
                row.status ===
                "PENDING"
        ).length;


    return {

        success:
            true,

        branchId:
            numericBranchId,

        customerId:
            normalizedCustomerId,

        period: {

            fromDate:
                range.fromDate,

            toDate:
                range.toDate

        },

        profile: {

            ...(profile || {}),

            whatsappOptIn:
                Boolean(
                    Number(
                        profile?.whatsapp_opt_in
                    )
                )

        },

        behavior:
            behaviorSummary,

        currentRfm: {

            r:
                profile?.r_score ??
                null,

            f:
                profile?.f_score ??
                null,

            m:
                profile?.m_score ??
                null,

            rfmScore:
                profile?.rfm_score ??
                null,

            rfmTotal:
                profile?.rfm_total ??
                null,

            segmentCode:
                profile?.segment_code ??
                null,

            lifecycleStage:
                profile?.lifecycle_stage ??
                null,

            behaviorScore:
                toNumber(
                    profile?.behavior_score
                ),

            customerValueScore:
                toNumber(
                    profile?.customer_value_score
                ),

            crmPriorityScore:
                toNumber(
                    profile?.crm_priority_score
                ),

            crmPriorityLevel:
                profile?.crm_priority_level ??
                null,

            recommendedAction:
                profile?.recommended_action ??
                null,

            purchaseTrend:
                profile?.purchase_trend ??
                null,

            purchaseTrendScore:
                toNumber(
                    profile?.purchase_trend_score
                )

        },

        sales: {

            periodSummary: {

                saleTickets:
                    Number(
                        salesSummary.sale_tickets
                    ) || 0,

                returnTickets:
                    Number(
                        salesSummary.return_tickets
                    ) || 0,

                grossSales:
                    round2(
                        salesSummary.gross_sales
                    ),

                returns:
                    round2(
                        salesSummary.returns
                    ),

                netSales:
                    round2(
                        salesSummary.net_sales
                    ),

                netCost:
                    round2(
                        salesSummary.net_cost
                    ),

                grossProfit:
                    round2(
                        toNumber(
                            salesSummary.net_sales
                        ) -
                        toNumber(
                            salesSummary.net_cost
                        )
                    ),

                firstPurchaseDate:
                    salesSummary.first_purchase_date ||
                    null,

                lastPurchaseDate:
                    salesSummary.last_purchase_date ||
                    null

            },

            recentInvoices

        },

        crm: {

            campaigns:
                campaignHistory,

            interactions,

            followups,

            whatsappMessages,

            purchaseAttributions:
                attributions,

            metrics: {

                outboundContacts,

                inboundResponses:
                    responses,

                pendingFollowups,

                attributedRevenue:
                    round2(
                        attributedRevenue
                    ),

                attributedGrossProfit:
                    round2(
                        attributedGrossProfit
                    ),

                attributedPurchases:
                    attributions.length

            }

        }

    };

}


/*
 * =========================================================
 * CUSTOMER SEARCH
 * =========================================================
 */

export async function searchCustomer360(
    {
        branchId,
        search,
        segmentCode,
        lifecycleStage,
        priorityLevel,
        limit = 50
    }
) {

    const numericBranchId =
        Number(
            branchId
        );


    if (
        !Number.isInteger(
            numericBranchId
        ) ||
        numericBranchId <= 0
    ) {

        throw new Error(
            "Invalid branchId"
        );

    }


    initializeCrmSchema();


    const crmDb =
        getCrmDatabase();


    const normalizedSearch =
        String(
            search ||
            ""
        ).trim();


    const normalizedLimit =
        Math.max(
            1,
            Math.min(
                500,
                Number(
                    limit
                ) || 50
            )
        );


    const conditions = [
        "branch_id = ?"
    ];


    const parameters = [
        numericBranchId
    ];


    if (
        normalizedSearch
    ) {

        conditions.push(`
            (
                customer_id LIKE ?
                OR COALESCE(
                    customer_name,
                    ''
                ) LIKE ?
                OR COALESCE(
                    whatsapp_phone_normalized,
                    ''
                ) LIKE ?
            )
        `);


        const like =
            `%${normalizedSearch}%`;


        parameters.push(
            like,
            like,
            like
        );

    }


    if (
        segmentCode
    ) {

        conditions.push(
            "segment_code = ?"
        );


        parameters.push(
            String(
                segmentCode
            )
        );

    }


    if (
        lifecycleStage
    ) {

        conditions.push(
            "lifecycle_stage = ?"
        );


        parameters.push(
            String(
                lifecycleStage
            )
        );

    }


    if (
        priorityLevel
    ) {

        conditions.push(
            "crm_priority_level = ?"
        );


        parameters.push(
            String(
                priorityLevel
            )
        );

    }


    parameters.push(
        normalizedLimit
    );


    return {

        success:
            true,

        customers:
            crmDb.prepare(`

                SELECT

                    branch_id,

                    customer_id,

                    customer_name,

                    whatsapp_phone,

                    whatsapp_phone_normalized,

                    whatsapp_opt_in,

                    last_purchase_date,

                    total_tickets,

                    total_net_sales,

                    total_gross_profit,

                    average_ticket_value,

                    average_days_between_purchases,

                    purchase_frequency_monthly,

                    r_score,

                    f_score,

                    m_score,

                    rfm_score,

                    rfm_total,

                    segment_code,

                    lifecycle_stage,

                    behavior_score,

                    customer_value_score,

                    crm_priority_score,

                    crm_priority_level,

                    crm_eligibility,

                    recommended_action,

                    purchase_trend,

                    purchase_trend_score,

                    last_crm_contact_at,

                    last_crm_contact_result,

                    crm_conversion_count,

                    crm_attributed_revenue,

                    crm_attributed_gross_profit

                FROM crm_customer_profiles

                WHERE
                    ${conditions.join(
                        " AND "
                    )}

                ORDER BY

                    crm_priority_score DESC,

                    customer_value_score DESC,

                    total_net_sales DESC

                LIMIT ?

            `).all(
                ...parameters
            )

    };

}


export default {

    getCustomer360,

    searchCustomer360

};