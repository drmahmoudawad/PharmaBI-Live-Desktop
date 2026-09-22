# PharmaBI Live - Analytics Integration

This build wires the existing PharmaFly analytics into the current navigation and adds a unified analytics endpoint/page for the active module.

## Included analytics

- Sales: overview, trends, day/hour, sellers, returns, delivery.
- Products: overview, top products, product profitability, product mix/ABC, stock movement.
- Customers: RFM, retention, churn/inactivity, CLV, cohorts.
- Staff: seller sales, invoices, average invoice, contribution.
- Profitability: sales, cost, profit, margin, product profitability and reconciliation signals.
- Branches: branch ranking/comparison using the existing group analytics service.
- Inventory: fast/slow movement and optional stock snapshot when a known stock column exists.
- Procurement: purchase invoice/line/product/supplier activity and purchase value.
- Suppliers: supplier contribution and purchase concentration.
- Forecast: recent daily trend and simple short-horizon forecast.
- Data quality: zero cost, missing reference, suspicious cost and reconciliation signals.
- Diagnostic layer: rule-based explanations attached to each response.

## Architecture

Renderer -> preload -> analytics:module IPC -> analyticsService -> existing domain services / lightweight SQL.

The module endpoint loads only the data required by the selected module wherever possible. Delivery analytics remains separate from the heavy sales/cost pipeline.

## Validation

All modified JavaScript files were syntax-checked with Node.js and relative import paths were checked from the extracted project source.

A renderer production build could not be executed in this Linux container because the uploaded project's Windows/native dependencies are not compatible with the container runtime. The package is therefore intentionally delivered without node_modules/dist so the existing Windows project can run its normal `npm install` / `npm run build:renderer` flow.
