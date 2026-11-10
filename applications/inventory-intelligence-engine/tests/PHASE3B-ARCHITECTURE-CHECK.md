# Phase 3B: mandatory architecture and scoring check (written BEFORE any code change)
Base: tag v0.6-candidate-4-phase3 (commit 9a6656bd). All line numbers are in `js/calculations.js` unless stated.

## 1. Supplier object and score (lines 112-118)
- Scored set `a` = PO lines with a valid Received_Date on or before the snapshot and Order_Date on or before the snapshot. `n = a.length`. Lines not received by the snapshot are never scored; they are counted in `excl` ("Outstanding at snapshot"). This is stated on the Suppliers tab.
- Metrics (all computed over the whole set `a`): `otd` = share of lines with `dd(Promised, Received) <= grace`; `late` = mean of `dd(Promised, Received)`; `ltA`, `ltS` = mean and standard deviation of `dd(Order, Received)`; `fill` = sum of `min(Received_Qty, Ordered_Qty)` over sum of `Ordered_Qty`; `over`, `overN`, `shortN` from Received vs Ordered.
- Score = 0.5 x otd + 0.2 x stab + 0.15 x `Math.min(100, fill)` + 0.15 x ls (`stab` from ltS/ltA, `ls` from `late`). Class: >= supLow (75) Low, >= supMed (60) Medium, else High.
- Suppliers with no scored PO (`n = 0`) are created at line 117 with `score:null`, `cat:'Not assessed'`.
- `evid` (line 118) = None if n = 0, Limited if n < `supMinPO` (10), else Adequate. `supMinPO` is used only here (and in Summary, below). `assess` is derived from `cat` and `evid`.

## 2. Exactly how a missing or bad value affects the score today
No metric has an eligibility test. Every metric is plain arithmetic over `a`, so one bad value spreads through the whole supplier. Measured on SUP007 (87.0, Low risk, 20 scored POs; one received line edited):
| Edit | otd | late | fill | score | class |
|---|---|---|---|---|---|
| none | 80.0 | -0.45 | 97.4 | 87.0 | Low risk |
| Received_Qty blank | 80.0 | -0.45 | **NaN** | **NaN** | **High risk** |
| Promised_Date blank or text "TBC" | **75.0** (line counted as late) | **NaN** | 100 | **NaN** | **High risk** |
Mechanisms (all JavaScript arithmetic, none deliberate):
1. A missing or text quantity gives `Math.min(undefined, x) = NaN`, so fill and the score are NaN. `NaN >= 75` and `NaN >= 60` are both false, so the class falls through to **High risk**.
2. An empty string or whitespace in Received_Qty is read as 0 (a silent shortfall); in Ordered_Qty, `sum + ""` turns the running total into a string, so fill collapses to about 0% (a silent 15-point penalty, score 87 to 72, no NaN to reveal it). Numeric text "120" in Ordered_Qty does the same.
3. A missing or text Promised_Date makes `dd` NaN: `NaN <= grace` is false, so the line is silently counted as **late** (an artificial on-time penalty), and the lateness average and the score become NaN.
So a missing metric is either NaN (whole score lost, class High risk) or silently zero-like (up to 15 points off), never a visible "unknown".

## 3. Where the supplier state is consumed (every place the new state must be handled)
| Place | Current logic | Needs |
|---|---|---|
| `R.sup` sort (line 157) | `(b.score ?? -1) - (a.score ?? -1)` | works for null; broken for NaN. No change once NaN cannot occur |
| `R.supRisk` sort (line 157) | at-risk count, then `(score ?? 1e9)` | same |
| Overview supplier card, Suppliers tab (app.js 26, 36) | prints `x.cat`, `x.evid + (n POs)`, `x.assess`, `f(score)` | show the new state string; evidence text must show valid-record counts; note text |
| Summary weak-supplier list (app.js 54, 58) | `cat === 'High risk'`; "not assessed" count = `evid === 'None'` | list unchanged (state string is not 'High risk'); wording of the unassessed count |
| Client questions (lines 191-192) | High-risk list shows `otd`; unassessed list = `evid === 'None'` ("no PO received by the snapshot") | separate "no delivery history" from "data problem" |
| Material confidence (line 133) | warns `supplier has no delivery history` if `n === 0`; adds the "small or unreliable sample" warning if `n < ltMinSup` or `cat === 'High risk'` | unscored supplier with history must also count as unreliable |
| `confAreas()` Supplier performance (app.js 188-194) | counts by `evid`; text says rows "are still counted in the supplier scores" | counts by valid-record evidence; text must say invalid quantities are now excluded from fill only |
| MRP risk (line 175) | uses `otd` only | unchanged (valid OTD stays available) |
| Export ENG_Suppliers (excel-import.js 22) | Score, Fill%, Risk columns | null must export blank; state string in Risk |
| Tests | match 'Not assessed' (test9, test-export-nohistory) | update for the new exact string |

## 4. Can the required v0.6 rule be supported without wider refactoring? YES (no blockers)
- Required metrics: on-time, lateness (both need a valid Promised_Date and Received_Date), lead-time stability (valid Order_Date and Received_Date), fill (valid Ordered_Qty and Received_Qty).
- Each metric is computed from its own eligible lines using the unchanged formulas. If all four have at least one eligible line, the existing score formula is applied with the existing weights, unchanged, no renormalisation. If any has none, `score = null` and the state is "Not Assessed — Insufficient Evidence"; every metric that still has evidence stays visible.
- Fewer than `supMinPO` eligible lines: the existing formula computes safely from the lines that exist (means and ratios over fewer lines; nothing is treated as zero), so no new partial-scoring formula is needed. The existing Limited/Adequate labels already express this; they will be applied to the smallest eligible count across the four metrics. No new threshold.
- With valid data every eligible set equals `a`, so scores, classes and evidence are identical to today.
- Over-delivery cap `Math.min(100, fill)` and the per-line `min(Received, Ordered)` stay.

## 5. One item deliberately NOT implemented (decision needed)
The brief asks that "overdue open orders must be assessed using reliable commitment-date and receipt evidence". Today every line not received by the snapshot is excluded from all metrics (documented on the Suppliers tab as "Outstanding at snapshot"), including lines already past their promised date. Counting overdue open lines as late would change scores on **valid** data (in Northstar, SUP011 has 2 such lines), which is a business-rule change to existing results, not an invalid-data fix. I kept the current behaviour and will quantify the alternative in the report so you can decide. Future-due open orders are not failures (unchanged).
