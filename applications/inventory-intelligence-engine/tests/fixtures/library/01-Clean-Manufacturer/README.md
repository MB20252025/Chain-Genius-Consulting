# 01 — Clean Manufacturer

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Business:** Harbour Valve Engineering Ltd (fictional): makes 40 valve and actuator products from 80 purchased materials; 12 suppliers; three stock locations (raw-material stores and two finished-goods stores).

**Used to test:** M1 canonical import and Engine View (must analyse with today's engine, all Make), M2 findings and money rules, M3 screens, M4 report, M5 scenarios.

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
| bom.csv | Bill of materials (Make items only) |
| production_orders.csv | Works orders (Make items only) |

Dates are ISO (YYYY-MM-DD) unless stated. Money is GBP. Snapshot date: 31 October 2026. Demand history: November 2024 to October 2026 (24 months).

Clean: canonical column names, ISO dates, no deliberate errors. It is the "truth" from which 02 Messy Manufacturer is derived.

Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).