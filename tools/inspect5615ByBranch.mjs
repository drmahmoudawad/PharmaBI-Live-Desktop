import Database from "better-sqlite3";

const db = new Database(
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
  { readonly: true }
);

console.log("=== CUSTOMER 5615 BY INTERNAL BRANCH ID ===");

const rows = db.prepare(`
  SELECT
    branch_id,
    customer_id,
    customer_name,
    COUNT(*) AS lines,
    COUNT(DISTINCT ticket_id) AS invoices,
    SUM(net_line_value) AS sales,
    MIN(date) AS first_purchase,
    MAX(date) AS last_purchase
  FROM sales_history
  WHERE CAST(customer_id AS TEXT) = '5615'
  GROUP BY branch_id, customer_id, customer_name
  ORDER BY branch_id
`).all();

console.log(JSON.stringify(rows, null, 2));

console.log("\n=== CRM PROFILE 5615 ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      branch_id,
      customer_id,
      customer_name,
      whatsapp_phone,
      r_score,
      f_score,
      m_score,
      rfm_score,
      rfm_total,
      segment_code,
      lifecycle_stage
    FROM crm_customer_profiles
    WHERE CAST(customer_id AS TEXT) = '5615'
    ORDER BY branch_id
  `).all(),
  null,
  2
));

console.log("\n=== RFM 5615 ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      branch_id,
      customer_id,
      customer_name,
      r_score,
      f_score,
      m_score,
      rfm_score,
      rfm_total,
      segment_code,
      lifecycle_stage
    FROM crm_rfm_customer_scores
    WHERE CAST(customer_id AS TEXT) = '5615'
    ORDER BY branch_id
  `).all(),
  null,
  2
));

console.log("\n=== BRANCH TABLES ===");

const branchTables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type='table'
    AND name LIKE '%branch%'
  ORDER BY name
`).all();

console.log(branchTables.map(x => x.name).join(", "));

db.close();
