import Database from "better-sqlite3";

const db = new Database(
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
  { readonly: true }
);

console.log("=== BRANCH 3 RFM SAMPLE ===");

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
    WHERE branch_id = 3
    ORDER BY rfm_total DESC
    LIMIT 10
  `).all(),
  null,
  2
));

console.log("\n=== BRANCH 3 CUSTOMER 5615 SALES ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      customer_id,
      customer_name,
      COUNT(DISTINCT ticket_id) AS invoices,
      SUM(net_line_value) AS sales,
      MIN(date) AS first_purchase,
      MAX(date) AS last_purchase
    FROM sales_history
    WHERE branch_id = 3
      AND CAST(customer_id AS TEXT) = '5615'
    GROUP BY customer_id, customer_name
  `).all(),
  null,
  2
));

db.close();
