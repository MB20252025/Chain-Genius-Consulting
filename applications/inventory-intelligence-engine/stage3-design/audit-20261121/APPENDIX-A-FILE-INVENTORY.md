# Appendix A: file-by-file inventory (21 Nov 2026)

Layers: eddf09b = accepted Stage 2 (Tag-5 lineage). 0d71aab = unaccepted Stage 3 (16-19 Nov). a4e05e8 = accepted X1. Every application file not listed is unchanged since eddf09b (accepted Stage 2).
Recommendations are Claude's, for the owner. None is a decision: nothing was accepted, rejected or reverted.

## A1. Files changed by the unaccepted Stage 3 work

| File | Stage 3 | Also changed by X1 | Recommendation |
|---|---|---|---|
| `CHANGELOG.md` | M | no | ACCEPT as record; owner reviews content with the register. |
| `IMPORT-V1-DIFFERENCE-REGISTER.md` | M | no | ACCEPT as record; owner reviews content with the register. |
| `IMPORT-V1-STAGE2-RECORD.md` | M | no | ACCEPT as record; owner reviews content with the register. |
| `STAGE3-CHANGE-REGISTER.md` | A | no | ACCEPT as record; owner reviews content with the register. |
| `js/app.js` | M | yes (mixed) | DEFER (owner): R2-VIEW dead-stock view awaits mock-up choice; X1 changes depend on this file. |
| `js/calculations.js` | M | yes (mixed) | DEFER (owner): holds D5 wording (ACCEPT), C-NUM detection (ACCEPT; X1 builds on it), F-A1..F-A4 checks (ACCEPT-candidate: new warnings), C-STK/R2-STK dead-stock rule (owner business rule). Not separable without re-engineering X1. |
| `js/excel-import.js` | M | yes (mixed) | ACCEPT: DR-4 empty text read as missing; mixed with X1. |
| `js/import/adapter.js` | M | yes (mixed) | ACCEPT: D2 scrap (owner decision D2); mixed with X1. |
| `js/import/canonical.js` | M | no | ACCEPT: D2 Scrap_Pct reject-row. |
| `js/import/clean.js` | M | no | ACCEPT: D2 scrap rules (owner decision D2). |
| `js/import/result-gate.js` | M | no | ACCEPT: D4 partial totals (owner decision D4) and C-RG3 label (KEEP). |
| `js/import/validate.js` | M | yes (mixed) | ACCEPT: D2 PERCENT_CONVERTED; mixed with X1. |
| `stage3-evidence/RAW-EVIDENCE.sha256` | A | no | ACCEPT as evidence record (no behaviour). |
| `stage3-evidence/ROUND2-EVIDENCE-RECONCILIATION.md` | A | no | ACCEPT as evidence record (no behaviour). |
| `stage3-evidence/ROUND2-IMPACT-INPUT-INVENTORY.csv` | A | no | ACCEPT as evidence record (no behaviour). |
| `stage3-evidence/ROUND2-PROTECTION-INVENTORY.csv` | A | no | ACCEPT as evidence record (no behaviour). |
| `tests/V07-TEST-RECORD.md` | M | no | ACCEPT as record; owner reviews content with the register. |
| `tests/accepted-results.json` | M | yes (mixed) | CORRECT later: owner approves raised counts via the next tag; mixed with X1. |
| `tests/checksums.txt` | M | yes (mixed) | Owner approval of re-hashed and new lines via the next tag; mixed with X1. |
| `tests/compare-snapshots.js` | M | no | ACCEPT: D1 permitted differences and C-CMP crash fix. |
| `tests/run-all.sh` | M | no | ACCEPT, then owner approval through the next approved tag (check-control PENDING). |
| `tests/snapshots/README.md` | M | yes (mixed) | ACCEPT as record; owner reviews content with the register. |
| `tests/snapshots/permitted-differences.json` | A | no | ACCEPT: D1 option A (owner decision). |
| `tests/snapshots/v0.7-confidence-20261116T034921Z.json` | A | no | ACCEPT: v0.7 confidence reference; owner approval via tag. |
| `tests/test-allocated-usable.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-empty-text.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-import-integrity.js` | M | yes (mixed) | ACCEPT: D2 expectations, originals kept as comments; mixed with X1. |
| `tests/test-import-stage1.js` | M | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-partial-totals.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-same-results.js` | M | no | ACCEPT: D3 duplicate PO rows. |
| `tests/test-scrap-rules.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-shortage-delay.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-stage3-quality.js` | A | yes (mixed) | ACCEPT except C-STK checks, which follow the owner's dead-stock decision. |
| `tests/test-stage3-round2.js` | A | yes (mixed) | ACCEPT except R2-STK/R2-VIEW checks (owner decision). |
| `tests/test-tz-boundaries.js` | A | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/test-uom.js` | M | no | ACCEPT: new test for an owner decision D1-D4 or a Round 2 item; count approval via the next tag. |
| `tests/tools/import-v1/reverse-eight-sheet.js` | M | no | ACCEPT (minor tooling change). |
| `stage3-evidence/raw/` (21 files) | A | no | ACCEPT as evidence record (no behaviour). |

## A2. Files changed only by X1 (accepted 21 Nov 2026)

| File | X1 |
|---|---|
| `index.html` | M |
| `js/engine/engine-api.js` | M |
| `js/forecasting.js` | M |
| `js/validation/x1-integrity.js` | A |
| `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md` | A |
| `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN.md` | A |
| `stage3-design/x1-evidence-claude-20261120/EVIDENCE.sha256` | A |
| `stage3-design/x1-evidence-claude-20261120/README.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/lib.js.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/out-p1-itv.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/out-p2-allocated-absent-A-B.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/out-p2-import-absent.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/out-p3-values.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/out-p4-units-sold.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/p1-itv.js.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/p2-import-absent.js.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/p3-values.js.txt` | A |
| `stage3-design/x1-evidence-claude-20261120/p4-units-sold.js.txt` | A |
| `stage3-design/x1-implementation/ANDROID-CHECKLIST-FINAL.md` | A |
| `stage3-design/x1-implementation/MANUAL-ANDROID-TEST.md` | A |
| `stage3-design/x1-implementation/P3-PREPARED-CHECKSUM-LINES.txt` | A |
| `stage3-design/x1-implementation/SNAPSHOT-IMPACT-INVENTORY.md` | A |
| `stage3-design/x1-implementation/STAGE3A-PROPOSAL-test-paging-chrome.md` | A |
| `stage3-design/x1-implementation/X1-CHANGE-RECORD.md` | A |
| `stage3-design/x1-implementation/X1-COMPLETION-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-IMPLEMENTATION-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-MATERIAL-INTEGRITY-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-TASK2-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-TASK3-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-TASK4-REPORT.md` | A |
| `stage3-design/x1-implementation/X1-VERIFICATION-REPORT.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/CANDIDATE-RUNTIME-MANIFEST.sha256` | A |
| `stage3-design/x1-implementation/acceptance-20261121/PROPOSED-REGISTRATION.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/X1-ACCEPTANCE-PACKAGE.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/X1-ACCEPTED-BASELINE.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/X1-REGISTERS.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/X1-REQUIREMENTS-MATRIX.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/X1-VERIFICATION-RECORD.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/analyse-timing-5100-items.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/app.js-changes-since-cd16dcc.diff` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/checklist-final.out` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/full-regression-20261121-acceptance.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/full-regression-final-candidate.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/paging-final.out` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/perf-final.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/runtime-changes-since-cd16dcc.diff` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/tab-final.json` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/tab-timing.json` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/test-x1-acceptance-wording-on-cd16dcc-app.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/test-x1-acceptance-wording-output.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/evidence-files/version-label-pixel5.png` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/CANDIDATE-RUNTIME-MANIFEST.sha256` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/PROPOSED-REGISTRATION.txt` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/X1-ACCEPTANCE-PACKAGE.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/X1-REGISTERS.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/X1-REQUIREMENTS-MATRIX.md` | A |
| `stage3-design/x1-implementation/acceptance-20261121/history-v1-1900/X1-VERIFICATION-RECORD.md` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/desktop-data-quality-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/desktop-feasibility-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/desktop-materials-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/desktop-mrp-no-rop-column.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/end-tree.sha256` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/full-regression-20261121-final.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/pixel5-data-quality-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/pixel5-feasibility-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/pixel5-materials-blank-material-id.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/pixel5-mrp-no-rop-column.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/results.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/scripts/final-browser.cjs` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/scripts/make-5100-item-workbook.cjs` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/scripts/tabperf3.cjs` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/tab-timing-current-run1.json` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/tab-timing-current.json` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/tab-timing-start-of-task-5100-items.json` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/workbooks/blank-material-id.xlsx` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-final/workbooks/no-rop-column.xlsx` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/RECONCILIATION.md` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/desktop-data-quality-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/desktop-feasibility-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/desktop-materials-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/desktop-mrp-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/full-regression-20261121-material.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/perf-node.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/pixel5-data-quality-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/pixel5-feasibility-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/pixel5-materials-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/pixel5-mrp-incomplete-usage.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/results.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/scripts/mi-browser.cjs` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/scripts/tabperf3.cjs` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/tab-timing-after.json` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/tab-timing-before.json` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-material/workbooks/blank-line-full-bom.xlsx` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/SHA256SUMS.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/browser-x1-chrome-run.log` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-blank-several-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/desktop-invalid-mixed-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-blank-several-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task3/mobile-invalid-mixed-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/SHA256SUMS.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/browser-x1-chrome-run.log` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-blank-several-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/desktop-invalid-mixed-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-blank-several-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Excessdeadstock.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Finishedgoods.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Health.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Materials.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Overview.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121-task4/mobile-invalid-mixed-Summary.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/SHA256SUMS.txt` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/browser-x1-chrome-run.log` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/desktop-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/desktop-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/desktop-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/desktop-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/desktop-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/mobile-blank-one-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/mobile-blank-several-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/mobile-clean-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/mobile-column-absent-MRP.png` | A |
| `stage3-design/x1-implementation/browser-evidence-20261121/mobile-invalid-mixed-MRP.png` | A |
| `stage3-design/x1-implementation/candidate-snapshot-Q3/v0.7-confidence-CANDIDATE-X1-D6-20261121.json` | A |
| `stage3-design/x1-implementation/design-history/README.md` | A |
| `stage3-design/x1-implementation/design-history/X1-NUMERIC-INTEGRITY-DESIGN-v2.PART1-AS-DELIVERED-20261120.md` | A |
| `stage3-design/x1-implementation/design-history/v2-part1-to-current.diff` | A |
| `stage3-design/x1-implementation/start-state-2/STATE.txt` | A |
| `stage3-design/x1-implementation/start-state-2/status-all-files.txt` | A |
| `stage3-design/x1-implementation/start-state-2/tree.sha256` | A |
| `stage3-design/x1-implementation/start-state-3/STATE.txt` | A |
| `stage3-design/x1-implementation/start-state-3/status-all-files.txt` | A |
| `stage3-design/x1-implementation/start-state-3/tree.sha256` | A |
| `stage3-design/x1-implementation/start-state-4/STATE.txt` | A |
| `stage3-design/x1-implementation/start-state-4/status-all-files.txt` | A |
| `stage3-design/x1-implementation/start-state-4/tree.sha256` | A |
| `stage3-design/x1-implementation/start-state-5/STATE.txt` | A |
| `stage3-design/x1-implementation/start-state-5/status-all-files.txt` | A |
| `stage3-design/x1-implementation/start-state-5/tree.sha256` | A |
| `stage3-design/x1-implementation/start-state/STATE.txt` | A |
| `stage3-design/x1-implementation/start-state/remote.txt` | A |
| `stage3-design/x1-implementation/start-state/status-all-files.txt` | A |
| `stage3-design/x1-implementation/start-state/tree.sha256` | A |
| `stage3-design/x1-v2-protection/START-FILES.sha256` | A |
| `stage3-design/x1-v2-protection/start-remote.txt` | A |
| `stage3-design/x1-v2-protection/start-state.txt` | A |
| `stage3-design/x1-v2-protection/start-status.txt` | A |
| `tests/README.md` | M |
| `tests/browser-x1-chrome.js` | A |
| `tests/check-globals.js` | M |
| `tests/snapshots/v0.7-confidence-20261121T075533Z.json` | A |
| `tests/test-import-mapping.js` | M |
| `tests/test-x1-acceptance-wording.js` | A |
| `tests/test-x1-completion.js` | A |
| `tests/test-x1-containment.js` | A |
| `tests/test-x1-foundation.js` | A |
| `tests/test-x1-material-integrity.js` | A |
| `tests/test-x1-wp5.js` | A |

Totals: Stage 3 58 files; X1 223 files; mixed 11.
