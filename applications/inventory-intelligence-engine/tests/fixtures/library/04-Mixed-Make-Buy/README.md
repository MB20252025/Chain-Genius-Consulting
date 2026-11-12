# 04 — Mixed Make/Buy Business

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Business:** Calder Pump Systems Ltd (fictional): manufactures 20 pump products (P-items) from 40 materials and also buys 12 finished products for resale (R-items).

**Used to test:** Per-item Make/Buy replenishment (the Option B engine change), PO matching to bought-in products, manufacturing-only analysis limited to Make items.

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

R-items have POs and supplier lead times of 21–42 days; P-items have production lead times of 5–14 days.

Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).