# Expected results — 05 Performance

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

Totals for a large distributor; used to confirm nothing is lost at scale.

Figures below were calculated by an independent reference calculator (`refcalc.py`) that reads only the CSV files in this package, using the formulas listed at the end. They are the agreed reference for M1–M6 tests. Where the engine uses a different, documented method (for example its own safety-stock or excess rules), engine figures may differ; any difference must be explained, not ignored.

## 1. What the importer should load

| Table | Rows |
| --- | --- |
| items | 5000 |
| locations | 3 |
| stock | 15000 |
| demand | 120000 |
| suppliers | 40 |
| supplier_items | 5000 |
| po_lines | 20120 |
| bom | 0 |
| production_orders | 0 |

Items: 5000 in total — 0 Make, 5000 Buy (sold), 0 purchased materials/components, 0 inactive.

Integrity (all should be empty for a clean dataset):

- stock rows unmatched item: none
- demand rows unmatched item: none
- po lines unmatched item: none
- bom unmatched: none
- po lines for make items: none

## 2. Stock and reconciliation

| Location (included) | On hand |
| --- | --- |
| DONC | 384,535 |
| HULL | 632,570 |
| YORK | 1,520,617 |

- Business-wide on hand (negatives counted as 0): **2,537,722**
- Rows in excluded locations: 0
- Items with negative stock: none
- Stock value at cost: **£76,645,551.27**
- Items excluded from value (no cost): none

## 3. Demand

- Months of history: 24
- Units sold in the last 12 months: **12,469,407**
- Sold items with no demand history: none

## 4. Operational findings the engine should identify

### Seeded situations (deliberately built in)

- **X00250, X00750 ... every 500th from 250** — stock-out risk (10 items)
- **X00400, X00900 ... every 500th from 400** — excess (10 items)
- **X00450, X01450, X02450, X03450, X04450** — dead stock (5 items)
- **S07 Wessex Industrial** — unreliable supplier with overdue and part-received open orders
- **Scale** — 5,000 sold SKUs, 3 locations, 120,000 demand rows; performance target: import + analysis under the agreed time on a laptop, and a usable result on Android

### Reference stock-out risk list (cover below lead time)

| Item | Cover days | Lead time | Lead-time source |
| --- | --- | --- | --- |
| X00250 | 7.4 | 28 | supplier_items |
| X00750 | 9.0 | 35 | supplier_items |
| X01250 | 11.6 | 28 | supplier_items |
| X01750 | 7.5 | 35 | supplier_items |
| X02250 | 13.4 | 28 | supplier_items |
| X02750 | 9.2 | 35 | supplier_items |
| X03250 | 11.6 | 28 | supplier_items |
| X03750 | 13.9 | 35 | supplier_items |
| X04250 | 5.4 | 28 | supplier_items |
| X04750 | 11.0 | 35 | supplier_items |

### Reference excess (cover above 180 days)

| Item | Cover days | Excess qty | Excess value |
| --- | --- | --- | --- |
| X00400 | 406.2 | 1,714 | £25,812.01 |
| X00900 | 373.3 | 1,443 | £59,429.51 |
| X01400 | 315.4 | 1,192 | £43,549.58 |
| X01900 | 345.5 | 891 | £20,830.62 |
| X02400 | 416.9 | 2,009 | £55,460.17 |
| X02900 | 359.2 | 1,650 | £75,735.63 |
| X03400 | 344.0 | 2,153 | £109,195.30 |
| X03900 | 353.2 | 2,035 | £104,842.61 |
| X04400 | 328.6 | 1,017 | £13,754.64 |
| X04900 | 406.8 | 608 | £20,460.03 |

- Total excess value: **£529,070.09** (cash tied up, not a loss)
- Dead stock (stock but no sales in 12 months): X00450, X01450, X02450, X03450, X04450 — value **£18,000.24**
- Items with no usable lead time: none

## 5. Purchase orders and suppliers

| Line state | Lines |
| --- | --- |
| fully_received | 15000 |
| open_not_due | 4870 |
| overdue_open | 250 |

- Outstanding quantity (ordered − received, open lines): **2,105,315**
- Value of overdue outstanding quantity: **£2,299,336.95** (financial exposure, not a loss)
- Suppliers referenced but not listed: none

| Supplier | Fully received | On time | Overdue open | OTD received-only | OTD incl. overdue |
| --- | --- | --- | --- | --- | --- |
| S01 | 375 | 348 | 0 | 92.8% | 92.8% |
| S02 | 375 | 358 | 0 | 95.5% | 95.5% |
| S03 | 375 | 316 | 0 | 84.3% | 84.3% |
| S04 | 375 | 327 | 0 | 87.2% | 87.2% |
| S05 | 375 | 351 | 0 | 93.6% | 93.6% |
| S06 | 375 | 353 | 0 | 94.1% | 94.1% |
| S07 | 375 | 177 | 250 | 47.2% | 28.3% |
| S08 | 375 | 309 | 0 | 82.4% | 82.4% |
| S09 | 375 | 334 | 0 | 89.1% | 89.1% |
| S10 | 375 | 320 | 0 | 85.3% | 85.3% |
| S11 | 375 | 367 | 0 | 97.9% | 97.9% |
| S12 | 375 | 337 | 0 | 89.9% | 89.9% |
| S13 | 375 | 314 | 0 | 83.7% | 83.7% |
| S14 | 375 | 353 | 0 | 94.1% | 94.1% |
| S15 | 375 | 331 | 0 | 88.3% | 88.3% |
| S16 | 375 | 329 | 0 | 87.7% | 87.7% |
| S17 | 375 | 356 | 0 | 94.9% | 94.9% |
| S18 | 375 | 330 | 0 | 88.0% | 88.0% |
| S19 | 375 | 327 | 0 | 87.2% | 87.2% |
| S20 | 375 | 319 | 0 | 85.1% | 85.1% |
| S21 | 375 | 350 | 0 | 93.3% | 93.3% |
| S22 | 375 | 356 | 0 | 94.9% | 94.9% |
| S23 | 375 | 307 | 0 | 81.9% | 81.9% |
| S24 | 375 | 301 | 0 | 80.3% | 80.3% |
| S25 | 375 | 357 | 0 | 95.2% | 95.2% |
| S26 | 375 | 362 | 0 | 96.5% | 96.5% |
| S27 | 375 | 340 | 0 | 90.7% | 90.7% |
| S28 | 375 | 333 | 0 | 88.8% | 88.8% |
| S29 | 375 | 306 | 0 | 81.6% | 81.6% |
| S30 | 375 | 353 | 0 | 94.1% | 94.1% |
| S31 | 375 | 337 | 0 | 89.9% | 89.9% |
| S32 | 375 | 317 | 0 | 84.5% | 84.5% |
| S33 | 375 | 332 | 0 | 88.5% | 88.5% |
| S34 | 375 | 322 | 0 | 85.9% | 85.9% |
| S35 | 375 | 340 | 0 | 90.7% | 90.7% |
| S36 | 375 | 306 | 0 | 81.6% | 81.6% |
| S37 | 375 | 326 | 0 | 86.9% | 86.9% |
| S38 | 375 | 330 | 0 | 88.0% | 88.0% |
| S39 | 375 | 357 | 0 | 95.2% | 95.2% |
| S40 | 375 | 317 | 0 | 84.5% | 84.5% |

## Performance expectations (to be agreed)

- Import + analysis on a laptop: target under 10 seconds.
- Android: completes without crashing; first screen usable.
- Totals above must match exactly at scale.

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
