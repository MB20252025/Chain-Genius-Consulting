# 03 — Distributor Without Manufacturing

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Business:** Pennine Fastener Supplies Ltd (fictional): buys 120 fastener and fixing lines from 10 suppliers and sells from Leeds and Bristol, with a quarantine area.

**Used to test:** Distributor mode: no BOM or production files; Buy replenishment from supplier lead times; warehouse aggregation with an excluded location.

M1 test-data library v1.0 (generated 12 Nov 2026, seed-deterministic)

## Files

| File | Contents |
| --- | --- |
| dataset.csv | Import header: format version, business, snapshot date, currency |
| items.csv | Every stocked item with Make/Buy, cost, price, supplier and lead times |
| locations.csv | Warehouses and whether they count towards available stock |
| stock.csv | Stock per item per location at the snapshot |
| demand.csv | Monthly sales (units) and the forecast that was used |
| suppliers.csv | Supplier list |
| supplier_items.csv | Which supplier supplies which item, with lead time and cost |
| po_lines.csv | Purchase-order lines, received and open |

Dates are ISO (YYYY-MM-DD) unless stated. Money is GBP. Snapshot date: 31 October 2026. Demand history: November 2024 to October 2026 (24 months).

There is deliberately NO bom.csv and NO production_orders.csv. Analyses that must show "Not applicable": BOM, MRP, production feasibility, production attainment. Everything else must work.

Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).