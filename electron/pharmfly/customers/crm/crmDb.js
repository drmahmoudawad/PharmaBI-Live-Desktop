import Database from "better-sqlite3";
import path from "node:path";
import {
    app
} from "electron";


let database = null;


/*
 * =========================================================
 * PATH
 * =========================================================
 */

function getDatabasePath() {

    return path.join(
        app.getPath("userData"),
        "pharmabi-local.db"
    );

}


/*
 * =========================================================
 * OPEN
 * =========================================================
 */

function openDatabase() {

    if (database) {

        return database;

    }


    database = new Database(
        getDatabasePath()
    );


    database.pragma(
        "journal_mode = WAL"
    );

    database.pragma(
        "synchronous = NORMAL"
    );

    database.pragma(
        "foreign_keys = ON"
    );

    database.pragma(
        "busy_timeout = 10000"
    );


    return database;

}


/*
 * =========================================================
 * SCHEMA
 * =========================================================
 */

export function initializeCrmSchema() {

    const db =
        openDatabase();


    db.exec(`

        /*
         * =====================================================
         * CUSTOMER PROFILE
         * One current CRM profile per branch/customer
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_customer_profiles (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            customer_name TEXT,

            whatsapp_phone TEXT,

            whatsapp_phone_normalized TEXT,

            whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,

            whatsapp_opt_in_at TEXT,

            whatsapp_opt_out_at TEXT,

            first_purchase_date TEXT,

            last_purchase_date TEXT,

            total_tickets INTEGER NOT NULL DEFAULT 0,

            total_net_sales REAL NOT NULL DEFAULT 0,

            total_gross_profit REAL NOT NULL DEFAULT 0,

            average_ticket_value REAL NOT NULL DEFAULT 0,

            average_days_between_purchases REAL NOT NULL DEFAULT 0,

            purchase_frequency_monthly REAL NOT NULL DEFAULT 0,

            r_score INTEGER,

            f_score INTEGER,

            m_score INTEGER,

            rfm_score TEXT,

            rfm_total INTEGER,

            segment_code TEXT,

            lifecycle_stage TEXT,

            behavior_score REAL NOT NULL DEFAULT 0,

            customer_value_score REAL NOT NULL DEFAULT 0,

            crm_priority_score REAL NOT NULL DEFAULT 0,

            crm_priority_level TEXT,

            crm_eligibility INTEGER NOT NULL DEFAULT 0,

            recommended_action TEXT,

            purchase_trend TEXT,

            purchase_trend_score REAL NOT NULL DEFAULT 0,

            last_crm_contact_at TEXT,

            last_crm_contact_result TEXT,

            last_crm_campaign_id INTEGER,

            last_crm_purchase_at TEXT,

            crm_conversion_count INTEGER NOT NULL DEFAULT 0,

            crm_attributed_revenue REAL NOT NULL DEFAULT 0,

            crm_attributed_gross_profit REAL NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE (

                branch_id,

                customer_id

            )

        );


        /*
         * =====================================================
         * RFM SNAPSHOT HEADER
         * Defines exactly how a scoring run was calculated.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_rfm_snapshots (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            branch_id INTEGER NOT NULL,

            analysis_date TEXT NOT NULL,

            observation_from_date TEXT NOT NULL,

            observation_to_date TEXT NOT NULL,

            observation_days INTEGER NOT NULL,

            scoring_method TEXT NOT NULL DEFAULT 'PERCENTILE_1_5',

            recency_method TEXT NOT NULL DEFAULT 'PERCENTILE_LOWER_IS_BETTER',

            frequency_method TEXT NOT NULL DEFAULT 'PERCENTILE_HIGHER_IS_BETTER',

            monetary_method TEXT NOT NULL DEFAULT 'PERCENTILE_HIGHER_IS_BETTER',

            customer_count INTEGER NOT NULL DEFAULT 0,

            total_net_sales REAL NOT NULL DEFAULT 0,

            total_gross_profit REAL NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * RFM CUSTOMER SCORE
         * Immutable customer-level result for each snapshot.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_rfm_customer_scores (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            snapshot_id INTEGER NOT NULL,

            branch_id INTEGER NOT NULL,

            customer_id TEXT NOT NULL,

            customer_name TEXT,

            first_purchase_date TEXT,

            last_purchase_date TEXT,

            recency_days INTEGER,

            ticket_count INTEGER NOT NULL DEFAULT 0,

            net_sales REAL NOT NULL DEFAULT 0,

            gross_profit REAL NOT NULL DEFAULT 0,

            average_ticket_value REAL NOT NULL DEFAULT 0,

            average_days_between_purchases REAL NOT NULL DEFAULT 0,

            monthly_frequency REAL NOT NULL DEFAULT 0,

            r_score INTEGER NOT NULL,

            f_score INTEGER NOT NULL,

            m_score INTEGER NOT NULL,

            rfm_score TEXT NOT NULL,

            rfm_total INTEGER NOT NULL,

            segment_code TEXT NOT NULL,

            lifecycle_stage TEXT,

            behavior_score REAL NOT NULL DEFAULT 0,

            customer_value_score REAL NOT NULL DEFAULT 0,

            priority_score REAL NOT NULL DEFAULT 0,

            priority_level TEXT,

            crm_eligibility INTEGER NOT NULL DEFAULT 0,

            recommended_action TEXT,

            purchase_trend TEXT,

            purchase_trend_score REAL NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (

                snapshot_id

            )

            REFERENCES crm_rfm_snapshots(id)

            ON DELETE CASCADE

        );


        /*
         * =====================================================
         * CRM SETTINGS
         * Central configuration for later CRM/WhatsApp engine.
         * =====================================================
         */

        CREATE TABLE IF NOT EXISTS crm_settings (

            setting_key TEXT PRIMARY KEY,

            setting_value TEXT,

            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

        );


        /*
         * =====================================================
         * INDEXES
         * =====================================================
         */

        CREATE INDEX IF NOT EXISTS
            idx_crm_profiles_branch_customer

        ON crm_customer_profiles (

            branch_id,
            customer_id

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_profiles_branch_segment

        ON crm_customer_profiles (

            branch_id,
            segment_code

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_profiles_branch_lifecycle

        ON crm_customer_profiles (

            branch_id,
            lifecycle_stage

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_profiles_branch_priority

        ON crm_customer_profiles (

            branch_id,
            crm_priority_score DESC

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_profiles_whatsapp

        ON crm_customer_profiles (

            branch_id,
            whatsapp_phone_normalized

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_rfm_snapshots_branch_date

        ON crm_rfm_snapshots (

            branch_id,
            analysis_date

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_rfm_scores_snapshot

        ON crm_rfm_customer_scores (

            snapshot_id

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_rfm_scores_branch_customer

        ON crm_rfm_customer_scores (

            branch_id,
            customer_id

        );


        CREATE INDEX IF NOT EXISTS
            idx_crm_rfm_scores_branch_segment

        ON crm_rfm_customer_scores (

            branch_id,
            segment_code

        );


        /*
         * =====================================================
         * DEFAULT CRM SETTINGS
         * =====================================================
         */

        INSERT OR IGNORE INTO crm_settings (

            setting_key,
            setting_value

        )

        VALUES

        (
            'rfm_default_observation_days',
            '365'
        ),

        (
            'rfm_min_customer_transactions',
            '1'
        ),

        (
            'crm_default_attribution_days',
            '7'
        ),

        (
            'crm_default_followup_days',
            '2'
        ),

        (
            'whatsapp_provider',
            ''
        ),

        (
            'whatsapp_enabled',
            '0'
        ),

        (
            'whatsapp_require_opt_in',
            '1'
        );

    `);


    console.log(
        `[crmDb] CRM schema ready: ${getDatabasePath()}`
    );


    return db;

}


/*
 * =========================================================
 * DB ACCESS
 * =========================================================
 */

export function getCrmDatabase() {

    return initializeCrmSchema();

}


/*
 * =========================================================
 * SETTINGS
 * =========================================================
 */

export function getCrmSetting(
    key,
    defaultValue = null
) {

    const db =
        initializeCrmSchema();


    const row =
        db.prepare(`
            SELECT setting_value
            FROM crm_settings
            WHERE setting_key = ?
        `).get(
            String(key)
        );


    return row
        ? row.setting_value
        : defaultValue;

}


export function setCrmSetting(
    key,
    value
) {

    const db =
        initializeCrmSchema();


    db.prepare(`
        INSERT INTO crm_settings (
            setting_key,
            setting_value,
            updated_at
        )

        VALUES (
            ?,
            ?,
            CURRENT_TIMESTAMP
        )

        ON CONFLICT(setting_key)

        DO UPDATE SET

            setting_value = excluded.setting_value,

            updated_at = CURRENT_TIMESTAMP
    `).run(
        String(key),
        value === null ||
        value === undefined
            ? null
            : String(value)
    );


    return true;

}


/*
 * =========================================================
 * CLOSE
 * =========================================================
 */

export function closeCrmDatabase() {

    if (!database) {

        return;

    }


    try {

        database.close();

    } finally {

        database = null;

    }

}


export default {

    initializeCrmSchema,

    getCrmDatabase,

    getCrmSetting,

    setCrmSetting,

    closeCrmDatabase

};