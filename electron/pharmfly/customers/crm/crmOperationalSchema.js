import {
    getCrmDatabase
} from "./crmDb.js";


let initialized = false;


/*
 * =========================================================
 * CRM OPERATIONAL SCHEMA
 *
 * Campaigns
 * Targets
 * Interactions
 * Follow-ups
 * WhatsApp
 * Attribution
 * =========================================================
 */

export function initializeCrmOperationalSchema() {

    if (
        initialized
    ) {

        return getCrmDatabase();

    }


    const db =
        getCrmDatabase();


    db.exec(`

        /*
         * =====================================================
         * CAMPAIGNS
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_campaigns (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER,

            name TEXT NOT NULL,

            description TEXT,

            objective TEXT NOT NULL,

            segment_code TEXT,

            lifecycle_stage TEXT,

            channel TEXT NOT NULL DEFAULT 'WHATSAPP',

            status TEXT NOT NULL DEFAULT 'DRAFT',

            start_at TEXT,

            end_at TEXT,

            attribution_window_days INTEGER NOT NULL DEFAULT 7,

            followup_delay_days INTEGER NOT NULL DEFAULT 2,

            control_group_percent REAL NOT NULL DEFAULT 10,

            treatment_count INTEGER NOT NULL DEFAULT 0,

            control_count INTEGER NOT NULL DEFAULT 0,

            targeted_count INTEGER NOT NULL DEFAULT 0,

            sent_count INTEGER NOT NULL DEFAULT 0,

            delivered_count INTEGER NOT NULL DEFAULT 0,

            responded_count INTEGER NOT NULL DEFAULT 0,

            converted_count INTEGER NOT NULL DEFAULT 0,

            attributed_revenue REAL NOT NULL DEFAULT 0,

            attributed_gross_profit REAL NOT NULL DEFAULT 0,

            campaign_cost REAL NOT NULL DEFAULT 0,

            created_by TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * CAMPAIGN TARGETS
         * One customer can appear once per campaign.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_campaign_targets (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            campaign_id INTEGER NOT NULL,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            customer_name TEXT,

            phone TEXT,

            treatment_group TEXT NOT NULL DEFAULT 'TREATMENT',

            eligible INTEGER NOT NULL DEFAULT 1,

            eligibility_reason TEXT,

            snapshot_id INTEGER,

            segment_code TEXT,

            lifecycle_stage TEXT,

            r_score INTEGER,

            f_score INTEGER,

            m_score INTEGER,

            rfm_score TEXT,

            crm_priority_score REAL,

            customer_value_score REAL,

            contact_status TEXT NOT NULL DEFAULT 'PENDING',

            last_contact_at TEXT,

            last_contact_result TEXT,

            response_at TEXT,

            first_purchase_after_contact_at TEXT,

            conversion_status TEXT NOT NULL DEFAULT 'PENDING',

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (

                campaign_id,

                branch_id,

                customer_id

            )

        );


        /*
         * =====================================================
         * CRM INTERACTIONS
         * Generic communication/activity journal.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_interactions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            campaign_id INTEGER,

            campaign_target_id INTEGER,

            channel TEXT NOT NULL,

            direction TEXT NOT NULL,

            interaction_type TEXT NOT NULL,

            outcome TEXT,

            phone TEXT,

            message_id TEXT,

            subject TEXT,

            content TEXT,

            employee_id TEXT,

            occurred_at TEXT NOT NULL,

            metadata_json TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * FOLLOW-UPS
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_followups (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            campaign_id INTEGER,

            campaign_target_id INTEGER,

            interaction_id INTEGER,

            due_at TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'PENDING',

            reason TEXT,

            assigned_to TEXT,

            completed_at TEXT,

            completion_outcome TEXT,

            notes TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * WHATSAPP ACCOUNTS
         *
         * Token will later be stored encrypted.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_whatsapp_accounts (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER,

            provider TEXT NOT NULL,

            account_name TEXT,

            business_account_id TEXT,

            phone_number_id TEXT,

            display_phone_number TEXT,

            webhook_url TEXT,

            access_token_encrypted TEXT,

            status TEXT NOT NULL DEFAULT 'DISCONNECTED',

            last_connected_at TEXT,

            last_webhook_at TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * WHATSAPP MESSAGE TEMPLATES
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_whatsapp_templates (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            provider TEXT,

            template_name TEXT NOT NULL,

            language_code TEXT NOT NULL DEFAULT 'ar',

            category TEXT,

            body_text TEXT NOT NULL,

            variables_json TEXT,

            status TEXT NOT NULL DEFAULT 'DRAFT',

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (

                provider,

                template_name,

                language_code

            )

        );


        /*
         * =====================================================
         * WHATSAPP MESSAGES
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_whatsapp_messages (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            campaign_id INTEGER,

            campaign_target_id INTEGER,

            interaction_id INTEGER,

            whatsapp_account_id INTEGER,

            direction TEXT NOT NULL,

            message_type TEXT NOT NULL DEFAULT 'TEXT',

            template_name TEXT,

            template_language TEXT,

            body_text TEXT,

            provider_message_id TEXT,

            recipient_phone TEXT,

            status TEXT NOT NULL DEFAULT 'QUEUED',

            error_code TEXT,

            error_message TEXT,

            queued_at TEXT,

            sent_at TEXT,

            delivered_at TEXT,

            read_at TEXT,

            failed_at TEXT,

            inbound_reply INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * WHATSAPP EVENTS
         *
         * delivery/read/reply/webhook history
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_whatsapp_unmatched_messages (

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

);

CREATE INDEX IF NOT EXISTS
    idx_crm_whatsapp_unmatched_phone
ON crm_whatsapp_unmatched_messages (
    phone
);

CREATE INDEX IF NOT EXISTS
    idx_crm_whatsapp_unmatched_status
ON crm_whatsapp_unmatched_messages (
    status
);
CREATE TABLE IF NOT EXISTS crm_whatsapp_events (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            whatsapp_message_id INTEGER,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            provider_event_id TEXT,

            provider_message_id TEXT,

            event_type TEXT NOT NULL,

            event_at TEXT NOT NULL,

            payload_json TEXT,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * PURCHASE ATTRIBUTION
         *
         * Links CRM contact to actual purchase.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_purchase_attributions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            campaign_id INTEGER,

            campaign_target_id INTEGER,

            interaction_id INTEGER,

            whatsapp_message_id INTEGER,

            ticket_id TEXT NOT NULL,

            purchase_date TEXT NOT NULL,

            attribution_window_days INTEGER NOT NULL DEFAULT 7,

            days_after_contact INTEGER,

            attribution_method TEXT NOT NULL DEFAULT 'TIME_WINDOW',

            attributed_revenue REAL NOT NULL DEFAULT 0,

            attributed_gross_profit REAL NOT NULL DEFAULT 0,

            incremental_revenue REAL,

            incremental_gross_profit REAL,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (

                branch_id,

                customer_id,

                ticket_id,

                campaign_id

            )

        );


        /*
         * =====================================================
         * INDEXES
         * =====================================================
         */

        CREATE INDEX IF NOT EXISTS
            idx_crm_campaigns_branch_status

        ON crm_campaigns (

            branch_id,
            status

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_campaigns_segment

        ON crm_campaigns (

            segment_code,
            lifecycle_stage

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_targets_campaign_status

        ON crm_campaign_targets (

            campaign_id,
            contact_status,
            conversion_status

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_targets_customer

        ON crm_campaign_targets (

            branch_id,
            customer_id

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_interactions_customer

        ON crm_interactions (

            branch_id,
            customer_id,
            occurred_at

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_interactions_campaign

        ON crm_interactions (

            campaign_id,
            occurred_at

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_followups_due

        ON crm_followups (

            status,
            due_at

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_followups_customer

        ON crm_followups (

            branch_id,
            customer_id,
            status

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_whatsapp_messages_customer

        ON crm_whatsapp_messages (

            branch_id,
            customer_id,
            created_at

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_whatsapp_messages_campaign

        ON crm_whatsapp_messages (

            campaign_id,
            status

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_whatsapp_provider_id

        ON crm_whatsapp_messages (

            provider_message_id

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_whatsapp_events_provider

        ON crm_whatsapp_events (

            provider_message_id,
            event_at

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_attribution_customer

        ON crm_purchase_attributions (

            branch_id,
            customer_id,
            purchase_date

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_attribution_campaign

        ON crm_purchase_attributions (

            campaign_id,
            purchase_date

        );

    `);


    initialized =
        true;


    console.log(
        "[CRM] Operational schema ready."
    );


    return db;

}


export default {

    initializeCrmOperationalSchema

};
