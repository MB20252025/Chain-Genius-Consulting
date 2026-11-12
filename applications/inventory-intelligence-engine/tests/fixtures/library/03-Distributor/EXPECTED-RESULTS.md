# Expected results — 03 Distributor

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

A clean distributor: every item is Buy; no manufacturing data exists.

Figures below were calculated by an independent reference calculator (`refcalc.py`) that reads only the CSV files in this package, using the formulas listed at the end. They are the agreed reference for M1–M6 tests. Where the engine uses a different, documented method (for example its own safety-stock or excess rules), engine figures may differ; any difference must be explained, not ignored.

## 1. What the importer should load

| Table | Rows |
| --- | --- |
| items | 120 |
| locations | 3 |
| stock | 243 |
| demand | 2880 |
| suppliers | 10 |
| supplier_items | 120 |
| po_lines | 850 |
| bom | 0 |
| production_orders | 0 |

Items: 120 in total — 0 Make, 120 Buy (sold), 0 purchased materials/components, 0 inactive.

Integrity (all should be empty for a clean dataset):

- stock rows unmatched item: none
- demand rows unmatched item: none
- po lines unmatched item: none
- bom unmatched: none
- po lines for make items: none

## 2. Stock and reconciliation

| Location (included) | On hand |
| --- | --- |
| BRIS | 27,457 |
| LEEDS | 41,056 |

- Business-wide on hand (negatives counted as 0): **68,513**
- Rows in excluded locations: 3
- Items with negative stock: none
- Stock value at cost: **£2,233,573.16**
- Items excluded from value (no cost): none

## 3. Demand

- Months of history: 24
- Units sold in the last 12 months: **309,546**
- Sold items with no demand history: none

## 4. Operational findings the engine should identify

### Seeded situations (deliberately built in)

- **D0005, D0017, D0042** — rising demand; stock below the supplier lead time → stock-out risk (lead time comes from the supplier, not a production setting)
- **D0009, D0033** — excess stock, over 300 days of cover
- **D0060, D0061** — dead stock: no sales for 12 months
- **S04 Tamar Fixings** — unreliable: about 50% on time, two overdue open lines per item supplied
- **S09 Severn Adhesives** — part-received orders that are now overdue
- **QUAR location** — quarantine stock for D0003, D0018, D0044 must be excluded from available stock but shown in the location detail

### Reference stock-out risk list (cover below lead time)

| Item | Cover days | Lead time | Lead-time source |
| --- | --- | --- | --- |
| D0005 | 10.5 | 35 | supplier_items |
| D0017 | 13.4 | 42 | supplier_items |
| D0042 | 8.0 | 35 | supplier_items |

### Reference excess (cover above 180 days)

| Item | Cover days | Excess qty | Excess value |
| --- | --- | --- | --- |
| D0009 | 302.8 | 1,061 | £26,716.24 |
| D0033 | 445.6 | 3,089 | £176,573.85 |

- Total excess value: **£203,290.09** (cash tied up, not a loss)
- Dead stock (stock but no sales in 12 months): D0060, D0061 — value **£4,592.61**
- Items with no usable lead time: none

## 5. Purchase orders and suppliers

| Line state | Lines |
| --- | --- |
| fully_received | 720 |
| open_not_due | 94 |
| overdue_open | 36 |

- Outstanding quantity (ordered − received, open lines): **53,380**
- Value of overdue outstanding quantity: **£364,180.20** (financial exposure, not a loss)
- Suppliers referenced but not listed: none

| Supplier | Fully received | On time | Overdue open | OTD received-only | OTD incl. overdue |
| --- | --- | --- | --- | --- | --- |
| S01 | 72 | 70 | 0 | 97.2% | 97.2% |
| S02 | 72 | 66 | 0 | 91.7% | 91.7% |
| S03 | 72 | 66 | 0 | 91.7% | 91.7% |
| S04 | 72 | 42 | 24 | 58.3% | 43.8% |
| S05 | 72 | 68 | 0 | 94.4% | 94.4% |
| S06 | 72 | 61 | 0 | 84.7% | 84.7% |
| S07 | 72 | 60 | 0 | 83.3% | 83.3% |
| S08 | 72 | 71 | 0 | 98.6% | 98.6% |
| S09 | 72 | 62 | 12 | 86.1% | 73.8% |
| S10 | 72 | 57 | 0 | 79.2% | 79.2% |

## Analyses that must be unavailable

BOM, MRP, production feasibility and production attainment must show "Not applicable: no manufactured items" — not errors, zeros or empty tables.

## 6. Regression use

- The machine-readable copy of every figure is in `expected-results.json`. Future tests compare against it; any change must be explained and approved.
- Re-running `refcalc.py` on these CSVs must reproduce this file exactly.

## Formulas used

```
Reference calculator: reads a Canonical Dataset v1 folder of CSVs and computes expected results
with simple, documented formulas. It does NOT import the generator, so it checks the files as written.

Formulas (also printed in each EXPECTED-RESULTS.md):
  available(item)      = max(0, sum of On_Hand over included locations, negatives counted as 0) - allocated, floored at 0
  stock value          = sum over stock rows (included locations) of max(0, On_Hand) x cost
                         cost = row Unit_Cost if present, else item Standard_Cost, else excluded (counted)
  avg daily demand     = sold items: units in last 12 months / 365
                         materials: sum over BOM parents of parent last-12m units x Qty_Per x (1 + Scrap_Pct) / 365
  lead time            = Make: Production_Lead_Time_Days; Buy: preferred supplier_items lead time, else item
                         Purchase_Lead_Time_Days, else supplier Standard_Lead_Time_Days, else missing
  cover days           = available / avg daily demand (none when demand is zero)
  stock-out risk       = demand > 0 and cover days < lead time
  excess               = cover days > 180; excess qty = available - 180 x avg daily; valued at cost
  dead stock           = on hand > 0 and zero units in last 12 months (sold items only)
  PO line state        = per Deliverable 1 (fully received / partial / open not due / overdue open / cancelled)
  outstanding          = max(0, Ordered - Received) for non-cancelled lines
  OTD received-only    = fully received lines with Last_Receipt_Date <= Promised_Date / fully received lines
  OTD incl. overdue    = same on-time count / (fully received lines + overdue open lines)
```
