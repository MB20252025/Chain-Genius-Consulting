# Northstar human calculation checks: corrected worksheet v2, OWNER EDITION

**Identity.** This is the owner edition of the corrected worksheet **v2**, prepared 22 Nov 2026 for candidate
`candidate/tag6-20261122-r3`. It contains no engine answers.
- Preserved and unchanged: the original worksheet (`release-prep-tag6-20261122/human-checks/NORTHSTAR-HUMAN-CHECK-WORKSHEETS.md`, v1) and the corrected v2 (`verification-20261122/worksheet-v2/NORTHSTAR-HUMAN-CHECK-WORKSHEETS-v2.md`).
- v2 corrected two worksheet errors: the lead-time rule, and a rounding slip in days of cover.
- The engine's answers are in a separate file, `SEALED-ENGINE-ANSWERS.md`. **Do not open it until you have finished all five checks.**

**How to use it.**
1. Work each check from the source data with a calculator or spreadsheet.
2. Write your figures in the "Your result" column.
3. Only then open the sealed file and copy the engine figures into the comparison table at the end.
4. If any figure disagrees, send me both figures. I will investigate both sides; neither is assumed right.

**Source workbook:** `applications/inventory-intelligence-engine/tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx`
(unchanged since Tag-5).
- Sheets used: Inventory, Demand History, BOM, Materials, Purchase Orders and Production Orders.
- Snapshot date (Inventory.Snapshot_Date): **31 Oct 2026**.
- Demand months used: the 12 calendar months **Nov 2025 to Oct 2026**.

The extracted CSV files in this folder are copies of rows from those sheets, for convenience. Each file names its sheet.

**Engine settings (defaults):**

| Setting | Value |
|---|---|
| Service-level factor z | 1.65 |
| Days per month | 365 ÷ 12 = 30.4167 |
| MRP horizon | 3 months |
| MRP receipts | open purchase-order lines only |
| ABC limits | A ≤ 80%, B ≤ 95% |

**Definitions used throughout:**
- **Standard deviation:** the population form. Divide by n (here 12, or the number of lead-time lines), **not** n − 1.
- **Scrap_Factor_Pct is a fraction:** 0.02 means 2%, so the usage factor is qty × (1 + 0.02).

**Rounding.** Work unrounded and round only your final figures:
- money to 1p;
- safety stock, reorder point and MRP quantities to 2 decimal places;
- days to 2 decimal places.

Screens show money to £1 and quantities to 0–1 decimal places; the comparison uses the unrounded figures.

---

## Check 1. FG001: safety stock and reorder point

**Source data**

FG001 Units_Sold, from the Demand History sheet:

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Units | 77 | 81 | 100 | 92 | 95 | 103 | 92 | 74 | 99 | 76 | 88 | 70 |

Completed production orders for FG001, from the Production Orders sheet:

| Order | Actual start | Actual finish |
|---|---|---|
| PRD0100 | 21 Jan 2026 | 23 Jan 2026 |
| PRD0050 | 21 Feb 2026 | 25 Feb 2026 |
| PRD0150 | 20 Sep 2026 | 22 Sep 2026 |

**Method.** Finished-goods lead time is the mean of (actual finish − actual start) in days over the completed orders,
counting each order as at least 1 day.

| Step | Calculation | Your result |
|---|---|---|
| 1a | Mean monthly demand m = sum of the 12 months ÷ 12 | |
| 1b | Monthly s.d. σ = √( Σ(month − m)² ÷ 12 ) | |
| 1c | Daily demand d = m × 12 ÷ 365 | |
| 1d | Lead time L (days) | |
| 1e | **Safety stock** SS = z × σ × √(L ÷ 30.4167) | |
| 1f | **Reorder point** ROP = d × L + SS | |

The Inventory sheet's own Safety_Stock_Qty and Reorder_Point_Qty for FG001 are the client's policy figures, not the
calculated ones. Do not use them here.

---

## Check 2. RM001: safety stock and reorder point

**Source data**

BOM rows that use RM001:

| Parent | Qty_Per_Finished_Unit | Scrap_Factor_Pct | Usage factor = qty × (1 + scrap) (your result) |
|---|---|---|---|
| FG001 | 1.94 | 0.02 | |
| FG038 | 3.16 | 0.03 | |

FG001 units as in check 1. FG038 Units_Sold:

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FG038 | 56 | 58 | 77 | 80 | 77 | 68 | 76 | 54 | 53 | 61 | 52 | 76 |

Materials sheet: RM001 Lead_Time_Days = **35**; Default_Supplier_ID = **SUP001**.

Lead-time lines: `leadtime-lines-SUP001.csv`. These are **all** of supplier SUP001's purchase-order lines (any
material) that were received on or before 31 Oct 2026 and ordered on or before it: 20 lines, with order, promised and
received dates.

**Method (the engine's actual rule):**
- L = Materials.Lead_Time_Days + the supplier's average lateness. Lateness = Received_Date − Promised_Date in days, averaged over the 20 lines, and added only if the average is positive.
- σL = the population s.d. of (Received_Date − Order_Date) over the same 20 lines.

*Known ambiguity:* on Northstar every Promised_Date is exactly Order_Date + the Materials lead time. So "Lead_Time_Days +
lateness" and "average order-to-receipt time" give the same number here, and this data cannot tell the two
interpretations apart. Use the stated rule. A test file that separates them is planned (E-7).

| Step | Calculation | Your result |
|---|---|---|
| 2a | Usage per month = FG001 units × factor(FG001) + FG038 units × factor(FG038), for each of the 12 months | |
| 2b | Mean monthly usage m | |
| 2c | Monthly s.d. σ (population) | |
| 2d | Daily usage d = m × 12 ÷ 365 | |
| 2e | Average lateness over the 20 lines, then L = 35 + max(0, lateness) | |
| 2f | σL = population s.d. of order-to-receipt days over the 20 lines | |
| 2g | **Safety stock** SS = z × √( (L ÷ 30.4167) × σ² + (d × σL)² ) | |
| 2h | **Reorder point** ROP = d × L + SS | |

---

## Check 3. Total stock valuation

**Source data:** the Inventory sheet, 150 rows (50 Finished_Good, 100 Raw_Material); copy in `check3-inventory-150-rows.csv`.

**Valuation rule:**
- Stock value of a row = On_Hand_Qty × Unit_Cost_GBP.
- **All** stock on hand is valued, including allocated stock: this is the value of stock held, not of stock available.
- Finished goods and raw materials are each summed; the total is their sum.

| Step | Calculation | Your result |
|---|---|---|
| 3a | Finished-goods stock value (50 rows) | |
| 3b | Raw-material stock value (100 rows) | |
| 3c | **Total stock value** = 3a + 3b | |

---

## Check 4. RM004: MRP shortage over the 3-month horizon

**Source data**

| Field | Value | Sheet |
|---|---|---|
| On_Hand_Qty | 1,614 | Inventory |
| Allocated_Qty | 426 | Inventory |
| Safety_Stock_Qty | 333 (the client's policy figure; MRP uses it) | Inventory |
| On_Order_Qty | 457 | Inventory |
| Unit_Cost_GBP | 11.37 | Inventory |
| Minimum_Order_Qty | 25 | Materials |
| Lead_Time_Days, Default_Supplier_ID | 28, SUP004 | Materials |
| RM004 purchase-order lines | `check4-RM004-purchase-orders.csv` (all of them, with status) | Purchase Orders |
| Parents | FG033 (qty 4.01, scrap 0.01) and FG046 (qty 2.05, scrap 0.02) | BOM |
| Lead-time lines | `leadtime-lines-SUP004.csv`: SUP004's 21 lines received and ordered by the snapshot | Purchase Orders |

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FG033 | 196 | 227 | 214 | 200 | 238 | 232 | 232 | 224 | 184 | 205 | 222 | 200 |
| FG046 | 103 | 107 | 119 | 127 | 154 | 113 | 114 | 126 | 108 | 129 | 101 | 101 |

**Method:**
- Receipts are **open** purchase-order lines due within the 3 months. On_Order_Qty in the Inventory sheet is not a receipt unless purchase-order lines support it; the engine shows a second net figure that does count it.
- **Days of cover** = (available + receipts) ÷ daily usage.
- **Order-by margin** = days of cover − L.

These two are internal MRP steps: they are not shown as numbers on screen, but they decide the status ("ORDER NOW" if
the margin is ≤ 0, "Order soon" if it is 0 to 14 days, otherwise "Plan") and the order-by date (snapshot + margin).

| Step | Calculation | Your result |
|---|---|---|
| 4a | Mean monthly usage m (as in check 2) | |
| 4b | Gross requirement = m × 3 | |
| 4c | Available = On_Hand − Allocated | |
| 4d | Receipts in the horizon (open PO lines) | |
| 4e | **Net requirement** = max(0, gross + safety stock − available − receipts) | |
| 4f | **Order quantity** = net rounded **up** to a multiple of 25 | |
| 4g | **Order value** = order quantity × 11.37 | |
| 4h | L for RM004 (rule as in check 2, base 28) | |
| 4i | Days of cover | |
| 4j | Order-by margin, then the status and the order-by date | |
| 4k | Alternative net, counting On_Order_Qty 457 as receipts | |

---

## Check 5. ABC classification: clean and faulty datasets

**Rule:**
1. Work within finished goods, and separately within raw materials.
2. Annual value = annual demand units × unit cost.
3. Rank from the highest annual value down.
4. Cumulative % = running total ÷ group total × 100.
5. Class **A** for the first item or cumulative ≤ 80; **B** if ≤ 95; otherwise **C**.
6. An item whose annual value is unknown (blank cost) is **Not Assessed** and left out of the ranking and the totals.

**Inputs** (two separate files, no engine classes):
- `check5-abc-inputs-CLEAN.csv`: the clean Northstar workbook.
- `check5-abc-inputs-FAULTY.csv`: workbook `stage3-design/audit-20261121/evidence/workbooks/ns-x1-faults.xlsx`. It is Northstar with Unit_Cost_GBP blank for FG007, RM005, RM017 and RM042; On_Hand_Qty blank for FG020 and RM060; and Allocated_Qty "abc" for RM070. The last three do not affect ABC, because annual value does not use on-hand or allocation.

Each file gives, per item: group, item, annual demand units and unit cost. Finished-goods annual demand units =
Units_Sold summed over the 12 months, which you can check from the Demand History sheet. Raw-material annual demand
units are derived through the BOM as in check 2; they are given as an input here.

| Step | Your result |
|---|---|
| 5a | Clean: class of every item (you can add a column to the CSV) | |
| 5b | Faulty: class of every item | |
| 5c | Items whose class differs between 5a and 5b, and why | |

---

## Comparison (fill in after opening `SEALED-ENGINE-ANSWERS.md`)

| Check | Figure | Your result | Engine | Agree? |
|---|---|---|---|---|
| 1 | SS | | | |
| 1 | ROP | | | |
| 2 | SS | | | |
| 2 | ROP | | | |
| 3 | FG value | | | |
| 3 | RM value | | | |
| 3 | Total | | | |
| 4 | Net requirement | | | |
| 4 | Order quantity | | | |
| 4 | Order value | | | |
| 4 | Status and order-by date | | | |
| 5 | Clean classes (all 150) | | | |
| 5 | Faulty classes (all 150) | | | |
| 5 | Items that changed | | | |

Sign-off: name ______  date ______
