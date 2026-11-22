# Verification of Tag-6 candidate r4 (22 Nov 2026)

**Frozen candidate:** `3822045a33ddd5b25ba4fef33ffa8925bf7b4f87` (`candidate/tag6-20261122-r4`).
Chain: `3822045` ← `7d558be` ← `df17371` ← `e9ee139` ← `2b820c7` ← `1cf81bb` ← `b1d2db9` (r3) ← … ← `43b6b55`.
Claude's engineering evidence; not independent verification. The owner's five human checks (22 Nov 2026, all passed) are
recorded separately in `../OWNER-DECISIONS-TAG6-ROUND2.md`.

| Check | Result | File |
|---|---|---|
| Identity | fresh clone, detached at the SHA, 0 status lines | `00-identity.txt` |
| Full tier, local, all zones | **54 tests passed (+ pre-flight)** of 61; FAIL 1 (`check-control`, Tag-5 guard); BLOCKED 4; REDUCED 2; ERROR 0 | `full-summary.txt`, `full.log` |
| Fast tier, local | **39 tests passed (+ pre-flight)** of 40; FAIL 1 (guard) | `fast-summary.txt`, `fast.log` |
| CI run **44984759951**, GitHub runner, pinned SHA | fast 39 (+ pre-flight), full 54 (+ pre-flight); guard FAIL; 4 BLOCKED; 2 REDUCED; 0 ERROR | `ci/ci-44984759951-3822045.log` |
| Targeted | tag6-changes 30/30 in 5 zones (r4 checks fail on b1d2db9: 6 of 7) | `full-summary.txt` |
| Snapshots | golden v0.5 10, golden v0.6.0 10, confidence 51, in 5 zones: unchanged | `full-summary.txt` |
| Stage 2 | import-adapter 346, same-results 416, import-integrity 396, and the rest at accepted counts | `full-summary.txt` |
| X1 | foundation 40, containment 41, wp5 56, completion 48, material-integrity 42, acceptance-wording 12, browser-x1-chrome 334 | `full-summary.txt` |
| Chrome paging | test-paging-chrome 59 (local and CI; Playwright 1.63.0, chromium-1243) | `full-summary.txt`, CI log |
| Guard | script byte-identical to Tag-5's; exit 1; **3 FAIL** (as before); **50 PENDING** = 6 + 16 + 28. Guard, check-protection, summarise-run and v07-tests.yml unchanged since Tag-5 | `guard.txt`, `guard-identity.txt`, `history-protection.txt` |
| Real Chrome, 1280 × 900 and 412 × 915 | clean, faulty and Willow, all 17 tabs, export downloaded and opened: **0 console errors** (the Willow chart error is gone); **0 NaN cells** in every export (the faulty-workbook NaN is gone); load 159–367 ms; slowest tab ≤ 292 ms; no sideways scrolling | `app/run-summary.txt`, `app/<wb>-<w>/` |
| Owner-checked figures | the whole live engine result (every item and field, totals, MRP, warnings) is identical to b1d2db9 for all three workbooks; the five checks' figures are listed | `human-check-figures.txt` |
| Performance, 5,100 items (`perf-node.js`, same workbook and machine) | analyse() median: b1d2db9 1,336 ms, 3822045 1,338 ms (under 2 s). Full recalculation run() = 3 analyses: 3,894 → 3,963 ms. Slowest view: MRP 264 → 287 ms | `perf/` |
| Baselines | r1 730/730, r2 730/730, recovery copy verified | `baselines.txt` |
| Git history | no file deleted since Tag-5; no snapshot JSON, fixture or log modified; r4 changes only the 10 listed files; no accepted Stage 2 or X1 record changed | `history-protection.txt` |
| Remote refs | only `candidate/tag6-20261122-r4` and its CI branch added; Tag-5, the approved tags 1–5, v0.6, `development/v0.7`, `x1/accepted-20261121` and `main` unchanged; temporary site `main` still `cd16dcc` | `remote-refs.txt` |
