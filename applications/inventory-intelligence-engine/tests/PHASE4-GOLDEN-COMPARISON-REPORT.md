# Phase 4 golden comparison report
Tools: tests/regress.js (10 sections: items, sup, mrp, feas, fc, pr, tot, fga, po, dq) and tests/compare-snapshots.js; tests/compare-trees.js (all 17 screens, export sheets, confidence areas, result objects). Logs: tests/logs/regression-p4-20261109T2200Z.log, logs/p4-golden/, logs/p4-compare-*.txt.
## 1. Baselines
Primary: Phase 2 (tag v0.6-candidate-4-phase2). Historical context: v0.5 golden (snapshots/v0.5-golden-20261105T101953Z.json), original v0.6 baseline (snapshots/v0.6.0-baseline-20261109T152050Z.json). Protected: Phase 3B (tag v0.6-candidate-4-phase3b, commit e265f8b). No snapshot was overwritten.
## 2. Northstar golden snapshots (the stored snapshots are Northstar only)
Time zones UTC, Europe/London, America/New_York, Asia/Kolkata, Pacific/Auckland x 3 baselines (v0.5, v0.6 baseline, Phase 2): **15 of 15 comparisons "ALL SECTIONS IDENTICAL"** (10 sections each). Expected: yes. Unexpected differences: none.
## 3. Phase 2 vs Phase 4 over every fixture workbook (17 files; tests/logs/p4-golden/per-workbook-phase2-vs-phase4.txt)
| Workbooks | Result | Primary cause |
|---|---|---|
| 11 (all 9 edge, Northstar, willow) | all 10 sections identical | none |
| scenario-s0, three, unknown | all 10 sections identical | none |
| scenario-allfuture, nohist, nopo | 1 section (sup) differs: only the class text "Not assessed" -> "Not Assessed — Insufficient Evidence" (1, 15 and 1 supplier rows; scores null in both, same counts) | Phase 3B decision 3 (exact state string): **reporting/label change, expected** |
Items changed: 0 in all 17. Values changed: 0 numeric. Labels changed: 17 supplier class labels in the 3 files above. Data-quality section (kind/severity/sheet): identical in all 17 (the willow missing-value reclassification changes message text only; it shows in compare-trees, not in this section).
## 4. Phase 2 vs Phase 4 by compare-trees (23 workbooks = 17 files + 6 Northstar unit variants): all 23 differ, as follows
| Category (primary cause) | What differs | Workbooks | Expected? |
|---|---|---|---|
| Reporting/display (Phase 3, finished-goods note) | Finished goods, Reorder policy, Settings, Overview text | 23 | yes |
| Reporting/display (Phase 3B, supplier evidence wording, level-shift wording) | Overview, Suppliers, Forecast accuracy, Data confidence, Settings; Summary and Client questions in 3 supplier scenarios | 23 | yes |
| Supplier object (secondary: reporting) | 7 new fields (nOtd, nLt, nFill, invQ, invD, reason, dpNote) and the label change; no score/class/evidence change in any of 246 rows except the label | 23 | yes |
| Forecast confidence (Phase 3B decision 5) | ENG_ForecastCredibility Confidence/ConfidenceWhy and the Forecast accuracy screen where a level-shift warning exists | 22 | yes |
| Export (secondary of the above) | ENG_Suppliers (+3 columns), ENG_Confidence (wording), ENG_ForecastCredibility | 22-23 | yes |
| Data Quality (Phase 3, missing-value correction) | willow: "Missing values in Notes" replaced by "Column Notes contains no values"; Data quality tab and ENG_DataQuality | 1 | yes |
**Calculations (items, risk classes, reorder points, MRP, totals, PO reconciliation) differ in none of the 23.** No recommendation changed. Each difference is counted once under its primary cause.
## 5. Phase 3B vs Phase 4 (compare-trees): 0 of 23 workbooks differ (Phase 4 changed no application code).
## 6. Retained limitation (Phase 3B documentation addition 2)
**Forecast-confidence changes are covered by dedicated tests (test-forecast-conf, 206 checks; verify.py, 17 checks) but are NOT fully represented in the historical golden snapshots**: the snapshot sections contain no forecast confidence level or wording, so the snapshot comparisons above cannot detect confidence changes. Full golden coverage of forecast-confidence wording has not been implemented or verified.
## 7. Unexpected differences: none. Unresolved differences: none.

## Final hardening addendum (primary baseline: Phase 4 RC, tag v0.6-candidate-4-rc)
Both fixes are UI-only, so every analytical output must equal the RC. Result: Northstar snapshot ALL SECTIONS IDENTICAL in 5 time zones (logs/final-golden/northstar-5tz-rc-vs-final.txt); 17 of 17 fixture workbooks ALL SECTIONS IDENTICAL (logs/final-golden/per-workbook-rc-vs-final.txt); compare-trees RC vs final 0 of 23 workbooks differ across calculations, risk classes, supplier classes, forecasts, all 17 screens and all export sheets (logs/final-compare-rc-vs-final.txt). Phase 3B vs final identical too (logs/final-compare-phase3b-vs-final.txt, logs/final-golden/northstar-5tz-phase3b-vs-final.txt). v0.5, v0.6 baseline and Phase 2 remain 15 of 15 identical (regression log). Unexpected differences: none. The forecast-confidence golden-coverage limitation is retained unchanged.
