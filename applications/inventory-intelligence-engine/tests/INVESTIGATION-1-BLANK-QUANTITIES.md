# Phase 3, item 1: blank and invalid supplier quantities (INVESTIGATION ONLY)

Status: **investigation only. No scoring, classification or business rule was changed. Existing behaviour is kept until you decide.**
No option is selected as "the correct fix". Evidence: `tests/investigate-blank-qty.js` (re-runnable), full results in `tests/results/blank-qty-investigation.json`, earlier characterisation in `tests/test-blank-qty.js`.
Method: real Northstar PO data, edited at cell level and round-tripped through an .xlsx file (so the reader behaves as it does for a client upload). Each treatment below was run as an in-memory patch of the supplier block, never saved into the application.

## 1. How the current code uses the quantities (js/calculations.js, line 114)
Supplier fill rate = sum of `Math.min(Received_Qty, Ordered_Qty)` divided by sum of `Ordered_Qty`, as a percentage; over-delivery = sum of `Math.max(0, Received − Ordered)`. Both are plain JavaScript arithmetic on whatever the reader supplied; there is no type check. Score = 50% on-time + 20% lead-time stability + 15% `Math.min(100, fill)` + 15% lateness. Risk class uses `>=` cut-offs (75 Low, 60 Medium). Only lines that were **received by the snapshot** are scored, so blanks on open POs are harmless (scenario S6: no change).

Elsewhere the code already treats a non-numeric received quantity as zero (lines 78 and 82, on-order and open-PO arithmetic use `isN(r.Received_Qty)?r.Received_Qty:0`). So the codebase is internally inconsistent about this today.

## 2. What actually happens today, by kind of bad value
Reference case: SUP007, Low risk, score 87.4, 20 received POs (Adequate evidence), 12 points clear of any cut-off. One received PO line (the middle one) edited.

| Kind | Example | What the engine does today | Supplier result |
|---|---|---|---|
| **Empty quantity** | empty `Received_Qty` cell | `undefined` → `Math.min(undefined, x)` = NaN; the sum, fill, score are all NaN | Score shown as "–"; class **High risk**, "Performance problem"; counted as a weak supplier |
| | empty `Ordered_Qty` cell | same, NaN | same |
| | `Received_Qty` empty string / spaces / formula returning "" | JavaScript coerces "" and "   " to 0, so the line counts as **nothing received**. No error. | 87.0, Low risk (a silent understatement of 0.4 points; larger if more lines) |
| | `Ordered_Qty` empty string | `0 + ""` turns the running sum into a **string** (concatenation), so the denominator becomes a huge number | fill ≈ 0%, score 72.4, **Medium risk**. Silent and wrong; no NaN to show it |
| **Text quantity** | "TBC", "N/A", "1,200", "120 kg", Excel error (#N/A) in either column | NaN, as for an empty cell | High risk, score "–" (identical to empty) |
| | numeric text "120" in `Received_Qty` | coerced by `Math.min`, so it **works** (87.4) | no visible effect (but see the note in section 5) |
| | numeric text "120" in `Ordered_Qty` | string concatenation, as above | fill ≈ 0%, score 72.4, **Medium risk**, silent |
| | boolean TRUE | counts as 1 | silent |
| **Invalid numbers** (finite) | negative received (−50) | accepted into the arithmetic; fill reduced | 86.5, Low risk; **High** DQ finding "Impossible quantities" is raised |
| | zero or negative ordered | zero adds nothing; negative lowers the denominator | no class change here; High DQ finding raised |
| | extreme value (1e9 ordered) | taken literally; fill ≈ 0% | 72.4, Medium; **no DQ finding** |

Consequences with the current behaviour (SUP007, one empty `Received_Qty` among 20 received POs):
- **Supplier score and class:** an 87.4 / Low-risk supplier with 80% on-time is reported as "High risk, Performance problem". The number of weak suppliers goes 6 → 7. Three blanks on three suppliers: 6 → 9.
- **PO counts / evidence:** unchanged (20 POs, "Adequate"). The evidence label therefore tells the reader the conclusion is well supported when it rests on a data fault.
- **Items:** risk classes, actions and confidence of every finished-good and raw-material item did not change in any scenario. (In this dataset every supplier has fewer than 30 POs, so every material already carries the "small or unreliable supplier sample" caution; a supplier with 30+ POs would gain that caution only because of the NaN class.)
- **Screens:** Suppliers table shows "–" for score and fill (no "NaN" text) but "High risk" and "Performance problem". Summary says "Manage weak suppliers (SUP007, …) Supplier score under 60", which is false for a supplier with no score. Client questions adds the weak-supplier question.
- **Excel export (ENG_Suppliers):** `Score`, `Fill%` and `OverDeliveredUnits` are empty (null) while `Risk` is "High risk".
- **Data quality:** an empty cell **is** reported ("Missing values in Received_Qty", Medium, with the true sheet row; corrected in this candidate). **Text, numeric-text, boolean, extreme and error-cell quantities are not reported at all.** Negative / zero-ordered / received > ordered lines are reported as the High "Impossible quantities" finding.

## 3. Treatments considered (each run on the same cases)
"Invalid" below means a scored line whose Received_Qty or Ordered_Qty is not a finite number.

| Id | Treatment | Rule in one line |
|---|---|---|
| V0 | Current behaviour | no handling |
| V1 | Blank / invalid = 0 | treat either quantity as zero |
| V2 | Skip the line for fill only | the line still counts for on-time, lead time and PO count |
| V3 | Exclude the whole PO from supplier assessment | the line is dropped from every supplier measure |
| V4 | Do not score fill when any scored line is invalid | re-weight the other 85% (50/20/15 ÷ 0.85) |
| V5 | Supplier "Not assessed (data problem)" | no score or class when any scored line is invalid |
| (presentation only) | Keep V0's numbers, add a clear "data problem" label | not run; changes no number |

### Results, SUP007 (87.4, Low risk, 20 received POs)
| Scenario | V0 now | V1 zero | V2 skip fill | V3 exclude PO | V4 no fill | V5 not assessed |
|---|---|---|---|---|---|---|
| 1 empty Received_Qty of 20 | NaN, **High** | 87.0 Low | 87.4 Low | 86.8 Low, n=19 | 85.2 Low | none, "Not assessed" |
| half the lines empty (10 of 20) | NaN, **High** | 79.7 Low | 87.4 Low | 87.0 Low, n=10 | 85.2 Low | none |
| every line empty (20 of 20) | NaN, **High** | 72.4 **Medium** (fill 0%) | 72.4 **Medium** (fill 0%) | none, n=0 "no PO received" | 85.2 Low | none |
| worst-late PO empty | NaN, **High** | 86.4 Low | 87.4 Low | 90.2 Low, n=19 | 85.2 Low | none |
| 1 empty Ordered_Qty | NaN, **High** | 87.4 Low | 87.4 Low | 86.8 Low, n=19 | 85.2 Low | none |
| limited evidence (6 POs → 5 scored), one empty | NaN, **High** ("possible problem, limited history") | 74.2 **Medium** | 75.4 **Low** | 69.6 Medium, n=4 | 71.0 Medium | none |
| SUP004 (67.4 Medium), one empty | NaN, **High** | 67.2 Medium | 67.4 Medium | 68.6 Medium | 61.7 Medium | none |
| SUP008 (60.4, 0.4 above the Medium cut-off), one empty | NaN, **High** | 60.1 Medium | 60.4 Medium | 61.2 Medium | 53.6 **High** | none |

Text ("TBC", "N/A", "120 kg", "1,200", #N/A) gives the same result as an empty cell under every treatment, because all four patched treatments test "is it a finite number".
Open (unreceived) PO with a blank: no change under any treatment (V0 to V5).

### Business-rule consequences, by treatment
| | Supplier scores | PO counts | Evidence / confidence | Risk classes | Screens & export | Data-quality reporting |
|---|---|---|---|---|---|---|
| V0 | one bad line → no score | n unchanged | evidence "Adequate" despite no score | **forced High risk** regardless of history | "–", "High risk", false "score under 60" text; export Score empty, Risk "High risk" | empty cells reported; text and numeric-text not |
| V1 | zero received makes the line a total shortfall: small drop (0.4 points), but half the lines blank → −7.7, all → −15 | unchanged | no signal that data were bad | shortfall can move a supplier down a class when many lines are blank, or when a *Received* blank is really "not recorded yet" | numbers appear everywhere, nothing marks them as estimated | needs a separate finding, otherwise invisible |
| V2 | bad line ignored for fill only; score close to the clean figure | unchanged | evidence overstates (the line is counted for on-time but not fill) | rarely changes class; with every line bad fill becomes 0% (denominator guard) unless special-cased | numbers appear | needs a finding |
| V3 | bad line removed from all four components; score moves with that PO's lateness (S5: +2.8) | **n falls**; can drop Adequate → Limited, or to none (→ "no delivery history", 3 materials gain a caution) | evidence honestly reflects fewer scored POs | changes only through score | PO count shown is lower than the PO file; needs an "excluded" note | exclusion count already exists in the model (`excl`); the finding explains it |
| V4 | removes the fill component for the whole supplier whatever the damage (1 bad line and 20 bad lines both give 85.2); can lower the score for a supplier that has a real 100% fill | unchanged | no signal | can push a supplier to High (SUP008: 60.4 → 53.6) | export Fill% empty | needs a finding |
| V5 | no score, no class | unchanged | evidence label contradictory unless relabelled | supplier leaves the risk ranking, weak-supplier count and Summary line | "Not assessed" with a reason; export Score empty | the reason is the data-quality finding |

Notes that apply whichever treatment is chosen:
1. A supplier near a cut-off (SUP008) flips class on a fraction of a point under V1, V3 and V4, so class changes are partly an artefact of cut-offs.
2. V1/V2/V3/V4 as run test "finite number", which would **change today's behaviour for numeric text** ("120" works now). A treatment therefore also needs a decision on whether numeric text is accepted as a number.
3. V1 and V2 give fill 0% when no line is valid.

## 4. Proposed corrections, by type
**Reporting-only (do not change any score; not implemented, pending your approval because this item is investigation-only):**
- R1. Add a data-quality finding for text, error-cell, boolean and numeric-text quantities in Purchase Orders (today they are silent).
- R2. Add a finding for implausibly large quantities relative to the supplier's other lines (today silent, and the cause of a 15-point score fall).
- R3. In the Suppliers table and Summary, show "Data problem" instead of "High risk / score under 60" when the score is not a number. This is a label change; the stored class would stay as it is.

**Business-rule changes (need your decision):** choose one of V1–V5 (or another), and decide whether numeric text should be accepted.

## 5. Defects found (cause, impact, proposed correction)
| # | Defect | Cause | Impact | Proposed |
|---|---|---|---|---|
| D1 | One empty or text quantity gives NaN and forces "High risk" | no numeric validation before arithmetic | a good supplier is reported as a performance problem; false weak-supplier line in Summary | decision on V1–V5; R3 as an interim label |
| D2 | Empty string / spaces / formula "" in `Received_Qty` read as zero silently | JavaScript coercion | small silent understatement | same decision; R1 |
| D3 | Numeric text, empty string or spaces in `Ordered_Qty` corrupts the denominator by string concatenation | `+` on strings | fill ≈ 0%, supplier wrongly Medium (−15 points); no error or warning | validation (any treatment fixes it); R1 |
| D4 | Text quantities produce no data-quality finding | the missing-value check looks only for blanks | the fault is invisible in the report | R1 |
| D5 | Summary text "Supplier score under 60" is applied to suppliers with no score | classification is `High risk` for NaN | misleading statement | R3 |
| D6 | Non-numeric received quantity is zero on open lines but NaN on received lines | two code paths | inconsistent | resolved by the chosen treatment |

## 6. Decisions needed from you
1. Which treatment (V1 to V5, a combination, or other) should apply to blank / text / invalid quantities? Or keep V0 and apply only R1–R3?
2. Should numeric text such as "120" be accepted as 120 (as it effectively is today for `Received_Qty`) or reported as invalid?
3. If a supplier cannot be scored, should it be "Not assessed" (V5) or scored on the remaining evidence (V2/V3/V4)?
4. Approve R1 (data-quality finding for text quantities) and R3 (label) as reporting-only changes?
