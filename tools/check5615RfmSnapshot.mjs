import Database from "better-sqlite3";

const db = new Database(
  "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live\\pharmabi-local.db",
  { readonly: true }
);

console.log("=== BRANCH 3 LATEST RFM SNAPSHOTS ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      id,
      branch_id,
      analysis_date,
      observation_from_date,
      observation_to_date,
      observation_days,
      customer_count,
      total_net_sales
    FROM crm_rfm_snapshots
    WHERE branch_id = 3
    ORDER BY id DESC
    LIMIT 10
  `).all(),
  null,
  2
));

console.log("\n=== CUSTOMER 5615 SALES VS SNAPSHOT WINDOWS ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      MIN(date) AS first_sale,
      MAX(date) AS last_sale,
      COUNT(DISTINCT ticket_id) AS invoices,
      SUM(net_line_value) AS sales
    FROM sales_history
    WHERE branch_id = 3
      AND CAST(customer_id AS TEXT) = '5615'
  `).get(),
  null,
  2
));

console.log("\n=== 5615 IN ANY BRANCH 3 RFM SNAPSHOT ===");

console.log(JSON.stringify(
  db.prepare(`
    SELECT
      snapshot_id,
      branch_id,
      customer_id,
      customer_name,
      last_purchase_date,
      ticket_count,
      net_sales,
      r_score,
      f_score,
      m_score,
      rfm_score,
      rfm_total,
      segment_code
    FROM crm_rfm_customer_scores
    WHERE branch_id = 3
      AND CAST(customer_id AS TEXT) = '5615'
    ORDER BY snapshot_id DESC
  `).all(),
  null,
  2
));

db.close();
