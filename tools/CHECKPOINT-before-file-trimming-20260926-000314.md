# PharmaBI-Live-Desktop CHECKPOINT
# Created: 2026-09-26 00:03:14 +03:00

## CURRENT VERIFIED STATE

### Sales Sync
- Current-month sales refresh runs while the application is open.
- Initial refresh runs during startup.
- Current-month refresh repeats every 10 minutes.
- Refresh is performed per active/saved branch.
- Sales are stored in local SQLite table: sales_history.
- sales_history uniqueness: (branch_id, line_id).
- Customer sales lookup must remain branch-scoped.

### RFM / CRM
- RFM service: electron/pharmfly/customers/customerRfmV2Service.js
- CRM profile uniqueness: (branch_id, customer_id).
- RFM stores:
  - crm_rfm_snapshots
  - crm_rfm_customer_scores
  - crm_customer_profiles
- Current-month sales sync now triggers automatic RFM refresh for the same branch.
- RFM refresh uses:
  - observationDays = 365
  - trendDays = 90
  - minTickets = 1
  - saveSnapshot = true

### Verified Customer 5615
- Internal branch_id: 3
- customer_id: 5615
- customer_name: الحاج رمضان
- invoices: 4
- net_sales: 2058
- last purchase: 2026-09-25
- RFM snapshot_id: 27
- RFM: 555
- RFM total: 15
- segment: CHAMPIONS

### Verified RFM Snapshot
- branch_id: 3
- snapshot_id: 27
- analysis_date: 2026-09-25
- observation_from_date: 2025-09-26
- observation_to_date: 2026-09-25
- observation_days: 365
- customer_count: 296
- total_net_sales: 181238.69

### Verified JavaScript
- node --check electron/main.js: PASSED
- node --check electron/cache/cacheWarmupService.js: PASSED

### Current Auto-Refresh Integration
- cacheWarmupService.js imports getCustomerRfmV2.
- refreshCustomerRfmAfterSalesSync(branchId) exists.
- refreshCurrentMonthAllBranches() calls the RFM refresh after successful current-month sales refresh.
- main.js calls startBackgroundWarmup().
- startBackgroundWarmup() calls refreshCurrentMonthAllBranches().
- 10-minute timer is active.

## IMPORTANT DESIGN DECISION

Do NOT make customer/RFM logic depend on customer_id alone.

Always preserve:
    branch_id + customer_id

Sales history remains:
    branch_id + line_id

RFM should be refreshed after successful sales synchronization, not once per individual sales batch.

## NEXT TASK

Begin shortening/cleaning large files.

Rules:
1. Preserve behavior exactly.
2. Do not change database schema.
3. Do not change branch/customer keys.
4. Do not remove automatic current-month sales refresh.
5. Do not remove automatic RFM refresh.
6. Before shortening any large file, create a dedicated backup.
7. After each file, run node --check.
8. After each functional change, verify the affected flow.

## CURRENT FILE BACKUP
.\electron\cache\cacheWarmupService.js.backup-before-file-trimming-20260926-000314

## GIT STATE
