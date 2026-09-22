# PharmaBI Live — Analytics Upgrade

This package is a source replacement for the current PharmaBI Live Desktop project.

## What changed

- Preserved the existing PharmaFly SQL Server connection architecture.
- Preserved the working Sales Overview, cache, auto-connect and warm-up layers.
- Added a unified Analytics Hub for the navigation modules that were previously placeholders.
- Preserved the old analytical approach: invoice-level KPIs, period comparisons, Top Products, customers/RFM, branch performance, and seller analysis.
- Added dedicated fast Delivery Analytics through `posTickets + Cards` without loading full sales-cost history.
- Added unified modules for inventory movement, purchasing, suppliers, profitability, data quality, reconciliation, and forecast.
- Added a common diagnostic block to explain the likely driver of change.

## Replaced / added files

`electron/main.js`
`electron/preload.js`
`electron/ipc/sales.ipc.js`
`electron/ipc/analyticsHub.ipc.js`
`electron/pharmfly/analyticsHubService.js`
`src/app/BranchAnalyticsRouter.jsx`
`src/app/SalesPage.jsx`
`src/components/AnalyticsHubPanel.jsx`

All other current project files are included unchanged in this package.

## Validation

Relative source paths were checked for missing project files. Native Vite/Rolldown binaries could not be executed in the Linux build environment because the uploaded `node_modules` contains Windows/native dependencies. The package intentionally excludes `node_modules`, `dist`, `release`, and `.env`.

On the Windows development machine:

```powershell
npm install
npm run build:renderer
npm start
```
