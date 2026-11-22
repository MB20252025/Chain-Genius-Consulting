# Northstar human calculation checks: five worksheets (pre-release requirement for Tag-6)

Prepared by Claude, 22 Nov 2026, against candidate commit `43b6b55`.

**Who:** someone other than Claude (the engineer who wrote the engine changes and the reference calculations).
**How:** work each check from the source data with a calculator or spreadsheet, write your figure in the "Checker"
column, and only then compare with the "Engine" column at the end of the worksheet.
**Pass rule:** a figure agrees if it matches to the rounding shown (money to 1p, quantities to 2 decimal places).
**If any figure disagrees, it is a release blocker.** Record it; do not change the expected result. Claude
investigates, and the owner decides.

Source file: `tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx` (unchanged since Tag-5).
Snapshot date: 31 Oct 2026. The 12 demand months are Nov 2025 to Oct 2026.

Engine settings used (defaults):

| Setting | Value |
|---|---|
| Service-level factor z | 1.65 |
| Days per month | 365 / 12 = 30.4167 |
| MRP horizon | 3 months |
| MRP receipts basis | open PO lines |
| ABC limits | A ≤ 80%, B ≤ 95% |

Two engine definitions to apply exactly as stated (they are recorded behaviour, not yet owner-approved rules):
- **Standard deviation is the population form** (divide by n, not n − 1). See decision record item C1.
- **Scrap_Factor_Pct is read as a fraction:** 0.02 means 2%, so the factor is 1.02.

---

## Check 1. Finished good FG001: safety stock and reorder point

**Source data**

FG001 units sold, from the Demand History sheet:

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Units | 77 | 81 | 100 | 92 | 95 | 103 | 92 | 74 | 99 | 76 | 88 | 70 |

Lead time, from the Production Orders sheet. Rule: each completed order gives Actual_Finish − Actual_Start in days,
with a minimum of 1 day; the lead time is the mean.

| Order | Actual start | Actual finish | Days |
|---|---|---|---|
| PRD0100 | 21 Jan 2026 | 23 Jan 2026 | 2 |
| PRD0050 | 21 Feb 2026 | 25 Feb 2026 | 4 |
| PRD0150 | 20 Sep 2026 | 22 Sep 2026 | 2 |

**Formulas**

| Step | Formula | Checker |
|---|---|---|
| a. Mean monthly demand m | sum of 12 months ÷ 12 | |
| b. Monthly s.d. σ | √( Σ(month − m)² ÷ 12 ) | |
| c. Daily demand d | m × 12 ÷ 365 | |
| d. Lead time L (days) | mean of the three order durations | |
| e. Safety stock SS | z × σ × √(L ÷ 30.4167) | |
| f. Reorder point ROP | d × L + SS | |

**Engine results (compare after working)**

m = 87.25 · σ = 10.7945 · d = 2.8685 · L = 2.6667 · **SS = 5.27** · **ROP = 12.92**
(The workbook's own Safety_Stock_Qty of 30 and Reorder_Point_Qty of 87 are the client's policy figures. They are
not the calculated ones and are not checked here.)

---

## Check 2. Raw material RM001: safety stock and reorder point

**Source data**

BOM rows that use RM001:

| Parent | Qty per unit | Scrap (fraction) | Factor = qty × (1 + scrap) |
|---|---|---|---|
| FG001 | 1.94 | 0.02 | 1.9788 |
| FG038 | 3.16 | 0.03 | 3.2548 |

Parent units sold (FG001 as in check 1):

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FG038 | 56 | 58 | 77 | 80 | 77 | 68 | 76 | 54 | 53 | 61 | 52 | 76 |

Lead time. Rule: all purchase-order lines of RM001's supplier **SUP001** (not only RM001's lines) that were received
on or before the snapshot date and ordered on or before it. Days = Received_Date − Order_Date. That gives 20 lines,
listed in `check2-supplier-lead-times.txt`.

**Formulas**

| Step | Formula | Checker |
|---|---|---|
| a. Usage per month | FG001 units × 1.9788 + FG038 units × 3.2548, for each of the 12 months | |
| b. Mean monthly usage m | sum ÷ 12 | |
| c. Monthly s.d. σ | population form, as in check 1 | |
| d. Daily usage d | m × 12 ÷ 365 | |
| e. Lead time L, and its s.d. σL | mean, and population s.d., of the 20 day counts | |
| f. Safety stock SS | z × √( (L ÷ 30.4167) × σ² + (d × σL)² ) | |
| g. Reorder point ROP | d × L + SS | |

**Engine results**

m = 386.3822 · σ = 45.5043 · d = 12.7030 · L = 36.85 · σL = 4.7252 · **SS = 128.99** · **ROP = 597.09**

---

## Check 3. Total stock value £2,533,596

**Source data:** the Inventory sheet, 150 rows (50 finished goods, 100 raw materials), also exported as
`check3-inventory-150-rows.csv`.

| Step | Formula | Checker |
|---|---|---|
| a. Finished-goods value | Σ On_Hand_Qty × Unit_Cost_GBP over the 50 Finished_Good rows | |
| b. Raw-material value | the same over the 100 Raw_Material rows | |
| c. Total | a + b | |

**Engine results:** FG **£922,703.94** · RM **£1,610,892.46** · Total **£2,533,596.40** (shown as £2,533,596).
Allocated stock is **included**: the figure is the value of all stock on hand, not just available stock.

---

## Check 4. One MRP shortage: RM004 over the 3-month horizon

**Source data**

| Field | Value | From |
|---|---|---|
| On_Hand_Qty | 1,614 | Inventory |
| Allocated_Qty | 426 | Inventory |
| Safety_Stock_Qty | 333 | Inventory (the client's policy figure, used by MRP) |
| On_Order_Qty | 457 | Inventory |
| Unit cost | £11.37 | Inventory |
| Minimum order quantity | 25 | Materials |
| Open purchase-order lines for RM004 | none (PO0029, PO0129, PO0229 are all Received) | Purchase Orders |
| Parents | FG033 (qty 4.01, scrap 0.01) and FG046 (qty 2.05, scrap 0.02) | BOM |

| Month | Nov 25 | Dec | Jan 26 | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FG033 | 196 | 227 | 214 | 200 | 238 | 232 | 232 | 224 | 184 | 205 | 222 | 200 |
| FG046 | 103 | 107 | 119 | 127 | 154 | 113 | 114 | 126 | 108 | 129 | 101 | 101 |

Lead time L for supplier SUP004 = 29.5238 days (rule as in check 2; its 21 lines are in the same file).

**Formulas**

| Step | Formula | Checker |
|---|---|---|
| a. Mean monthly usage m | as in check 2 (factors 4.0501 and 2.091) | |
| b. Gross requirement | m × 3 | |
| c. Available | On_Hand − Allocated | |
| d. Scheduled receipts in horizon | open PO lines due within 3 months | |
| e. Net requirement | max(0, gross + safety stock − available − receipts) | |
| f. Order quantity | net rounded **up** to a multiple of the MOQ | |
| g. Order value | f × unit cost | |
| h. Days of cover | (available + receipts) ÷ (m × 12 ÷ 365) | |
| i. Order-by margin | h − L; "Order soon" if 0 to 14 days, "ORDER NOW" if ≤ 0 | |

**Engine results**

m = 1,113.0450 · gross = 3,339.13 · available = 1,188 · receipts = 0 · **net = 2,484.13** · **order 2,500** ·
**value £28,425.00** · cover 32.47 days · margin 2.94 days → **"Order soon"**, order by 2 Nov 2026.

The engine also shows a second net figure: 2,027.13, which counts On_Order_Qty 457 as receipts. Its default
uses PO lines, and RM004 has no open lines although Inventory says 457 are on order. **The checker should note
whether that difference in the client data is reported clearly on screen.**

---

## Check 5. ABC table, with and without missing costs

**Rule:** within finished goods, and separately within raw materials:
1. Annual value = annual demand units × unit cost.
2. Rank items from the highest annual value down.
3. Cumulative % = running total ÷ group total × 100.
4. Class A if it is the first item or cumulative ≤ 80; B if ≤ 95; otherwise C.
5. An item with an unknown annual value is **Not Assessed** and left out of the ranking.

**Source:** `check5-abc-inputs-and-engine-results.csv` (150 rows: annual demand units, unit cost in the clean
run and in the faulty run, the checker's columns, then the engine's results). Annual demand units for finished goods
are units sold over the 12 months. For raw materials they are derived as in check 2, given as an input here.

**Faulty run:** the same workbook with Unit_Cost_GBP blank for FG007, RM005, RM017 and RM042. On-hand is also blank
for FG020 and RM060, and Allocated is "abc" for RM070; those three do not affect ABC. The file is
`audit-20261121/evidence/workbooks/ns-x1-faults.xlsx`.

| Step | Checker |
|---|---|
| a. Clean run: classes for all 150 items | |
| b. Faulty run: classes for all 150 items | |
| c. Items whose class changes between the runs, and why | |

**Engine results:** 8 items differ between the runs:
- 4 become Not Assessed (the items with blank cost);
- 4 move class: FG018 B → C, FG030 A → B, RM020 A → B, and RM051 C → B.

Finding F1 is whether the screen should warn that classes are provisional when items are Not Assessed.

---

## Sign-off

| Check | Checker's name | Date | Agrees? (yes / no, with figures) |
|---|---|---|---|
| 1 FG001 SS and ROP | | | |
| 2 RM001 SS and ROP | | | |
| 3 Total stock value | | | |
| 4 RM004 MRP shortage | | | |
| 5 ABC with and without costs | | | |
