# 05 — Performance Dataset

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Business:** Ouse Valley Industrial Supply Ltd (fictional): 5,000 sold SKUs, 40 suppliers, three locations.

**Used to test:** Import and analysis speed, memory on Android, paging of large tables.

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

Not intended for checking individual findings; check totals and timing. Existing known limitation: about 1 s analysis at 5,000 items on desktop; tab switching slower on low-power devices.

Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).