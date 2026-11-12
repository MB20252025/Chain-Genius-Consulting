# Expected results — 01 Clean Manufacturer

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

A clean, internally consistent manufacturer. Every figure here should be reproduced exactly by the importer + reference rules.

Figures below were calculated by an independent reference calculator (`refcalc.py`) that reads only the CSV files in this package, using the formulas listed at the end. They are the agreed reference for M1–M6 tests. Where the engine uses a different, documented method (for example its own safety-stock or excess rules), engine figures may differ; any difference must be explained, not ignored.

## 1. What the importer should load

| Table | Rows |
| --- | --- |
| items | 120 |
| locations | 3 |
| stock | 160 |
| demand | 960 |
| suppliers | 12 |
| supplier_items | 80 |
| po_lines | 741 |
| bom | 142 |
| production_orders | 414 |

Items: 120 in total — 40 Make, 0 Buy (sold), 80 purchased materials/components, 0 inactive.

Integrity (all should be empty for a clean dataset):

- stock rows unmatched item: none
- demand rows unmatched item: none
- po lines unmatched item: none
- bom unmatched: none
- po lines for make items: none

## 2. Stock and reconciliation

| Location (included) | On hand |
| --- | --- |
| FGW | 5,623 |
| MAIN | 46,598 |
| SHEF | 3,055 |

- Business-wide on hand (negatives counted as 0): **55,276**
- Rows in excluded locations: 0
- Items with negative stock: none
- Stock value at cost: **£2,318,695.70**
- Items excluded from value (no cost): none

## 3. Demand

- Months of history: 24
- Units sold in the last 12 months: **40,334**
- Sold items with no demand history: none

## 4. Operational findings the engine should identify

### Seeded situations (deliberately built in)

- **P0007, P0019, P0031** — demand rising about 60% over two years and forecasts 15% low; stock covers less than the production lead time → stock-out risk
- **P0011, P0022, P0028, P0035** — more than 300 days of cover → excess stock (cash tied up)
- **P0038, P0039** — no sales in the last 12 months but stock on hand → dead stock
- **M0012** — material stock below its purchase lead time of demand → material shortage risk for its parent products
- **S07 Kestrel Castings** — unreliable supplier: about 45% on time historically, plus overdue and part-received open orders
- **S03 Ridgeway Seals** — middling supplier: about 72% on time, one overdue open order per item

### Reference stock-out risk list (cover below lead time)

| Item | Cover days | Lead time | Lead-time source |
| --- | --- | --- | --- |
| M0012 | 14.6 | 49 | supplier_items |
| P0007 | 2.5 | 5 | item production lead time |
| P0019 | 3.0 | 10 | item production lead time |
| P0031 | 4.5 | 14 | item production lead time |

### Reference excess (cover above 180 days)

| Item | Cover days | Excess qty | Excess value |
| --- | --- | --- | --- |
| P0011 | 338.4 | 762 | £127,106.83 |
| P0022 | 342.7 | 168 | £29,306.81 |
| P0028 | 402.4 | 725 | £159,395.37 |
| P0035 | 336.6 | 110 | £16,330.65 |

- Total excess value: **£332,139.67** (cash tied up, not a loss)
- Dead stock (stock but no sales in 12 months): P0038, P0039 — value **£21,397.12**
- Items with no usable lead time: none

## 5. Purchase orders and suppliers

| Line state | Lines |
| --- | --- |
| fully_received | 640 |
| open_not_due | 73 |
| overdue_open | 28 |

- Outstanding quantity (ordered − received, open lines): **51,480**
- Value of overdue outstanding quantity: **£313,893.70** (financial exposure, not a loss)
- Suppliers referenced but not listed: none

| Supplier | Fully received | On time | Overdue open | OTD received-only | OTD incl. overdue |
| --- | --- | --- | --- | --- | --- |
| S01 | 56 | 43 | 0 | 76.8% | 76.8% |
| S02 | 56 | 51 | 0 | 91.1% | 91.1% |
| S03 | 56 | 37 | 7 | 66.1% | 58.7% |
| S04 | 56 | 53 | 0 | 94.6% | 94.6% |
| S05 | 56 | 50 | 0 | 89.3% | 89.3% |
| S06 | 56 | 46 | 0 | 82.1% | 82.1% |
| S07 | 56 | 22 | 21 | 39.3% | 28.6% |
| S08 | 56 | 45 | 0 | 80.4% | 80.4% |
| S09 | 48 | 45 | 0 | 93.8% | 93.8% |
| S10 | 48 | 46 | 0 | 95.8% | 95.8% |
| S11 | 48 | 43 | 0 | 89.6% | 89.6% |
| S12 | 48 | 45 | 0 | 93.8% | 93.8% |



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
