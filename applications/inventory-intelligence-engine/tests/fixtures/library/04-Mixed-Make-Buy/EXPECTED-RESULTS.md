# Expected results — 04 Mixed Make/Buy

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

Validates replenishment logic at item level.

Figures below were calculated by an independent reference calculator (`refcalc.py`) that reads only the CSV files in this package, using the formulas listed at the end. They are the agreed reference for M1–M6 tests. Where the engine uses a different, documented method (for example its own safety-stock or excess rules), engine figures may differ; any difference must be explained, not ignored.

## 1. What the importer should load

| Table | Rows |
| --- | --- |
| items | 72 |
| locations | 2 |
| stock | 104 |
| demand | 768 |
| suppliers | 8 |
| supplier_items | 52 |
| po_lines | 451 |
| bom | 71 |
| production_orders | 208 |

Items: 72 in total — 20 Make, 12 Buy (sold), 40 purchased materials/components, 0 inactive.

Integrity (all should be empty for a clean dataset):

- stock rows unmatched item: none
- demand rows unmatched item: none
- po lines unmatched item: none
- bom unmatched: none
- po lines for make items: none

## 2. Stock and reconciliation

| Location (included) | On hand |
| --- | --- |
| DC | 2,369 |
| WORKS | 24,984 |

- Business-wide on hand (negatives counted as 0): **27,353**
- Rows in excluded locations: 0
- Items with negative stock: none
- Stock value at cost: **£1,245,374.81**
- Items excluded from value (no cost): none

## 3. Demand

- Months of history: 24
- Units sold in the last 12 months: **33,093**
- Sold items with no demand history: none

## 4. Operational findings the engine should identify

### Seeded situations (deliberately built in)

- **P0004 (Make)** — rising demand, stock below its production lead time → stock-out risk
- **R0003, R0006 (Buy, resale)** — about 14 days of cover against supplier lead times of 35–42 days → stock-out risk. **Key control:** if the engine wrongly used the 7-day production lead time for these bought-in products, they would NOT be flagged. This is the main test of Make/Buy replenishment.
- **R0007 (Buy) and P0009 (Make)** — excess stock
- **P0015 (Make)** — dead stock
- **MRP / production** — BOM explosion and production feasibility apply to P-items only; R-items must show "not applicable"

### Reference stock-out risk list (cover below lead time)

| Item | Cover days | Lead time | Lead-time source |
| --- | --- | --- | --- |
| P0004 | 1.8 | 5 | item production lead time |
| R0003 | 14.0 | 42 | supplier_items |
| R0006 | 13.8 | 35 | supplier_items |

### Reference excess (cover above 180 days)

| Item | Cover days | Excess qty | Excess value |
| --- | --- | --- | --- |
| P0009 | 368.0 | 446 | £86,582.06 |
| R0007 | 315.3 | 615 | £66,632.25 |

- Total excess value: **£153,214.31** (cash tied up, not a loss)
- Dead stock (stock but no sales in 12 months): P0015 — value **£11,034.02**
- Items with no usable lead time: none

## 5. Purchase orders and suppliers

| Line state | Lines |
| --- | --- |
| fully_received | 392 |
| open_not_due | 52 |
| overdue_open | 7 |

- Outstanding quantity (ordered − received, open lines): **23,550**
- Value of overdue outstanding quantity: **£63,086.40** (financial exposure, not a loss)
- Suppliers referenced but not listed: none

| Supplier | Fully received | On time | Overdue open | OTD received-only | OTD incl. overdue |
| --- | --- | --- | --- | --- | --- |
| S01 | 46 | 44 | 0 | 95.7% | 95.7% |
| S02 | 52 | 42 | 7 | 80.8% | 71.2% |
| S03 | 46 | 40 | 0 | 87.0% | 87.0% |
| S04 | 52 | 47 | 0 | 90.4% | 90.4% |
| S05 | 52 | 50 | 0 | 96.2% | 96.2% |
| S06 | 46 | 41 | 0 | 89.1% | 89.1% |
| S07 | 52 | 48 | 0 | 92.3% | 92.3% |
| S08 | 46 | 44 | 0 | 95.7% | 95.7% |



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
