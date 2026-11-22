# Tag-6 verification checks: results (22 Nov 2026)

Fresh execution by Claude against candidate `43b6b5587cef0e63aa9c4faaa955cc3ff1f228f6`, using a new clone from GitHub
(`/home/claude/w8/cand`, clean, 0 status lines). Tests and the application ran in a throwaway copy (`/home/claude/w8/copy`).
Every figure below is taken from a file in this folder, and each file holds the command and its output. This is Claude's
work, not independent verification. Nothing in the candidate, registry, baselines, Tag-5 or the original worksheet was changed.

Environment (`00-environment.txt`):
- Node v22.23.4, npm 10.9.9, Python 3.13.18;
- test packages from `/home/claude/testdeps` (xlsx 0.18.5, pinned Playwright ^1.65 not used for the browser);
- global Playwright 1.63.0 with Chrome for Testing build chromium-1243.

## 1. Protection guard

The pending, new-line and FAIL counts come from the **Tag-5 guard** `check-control.js`, taken from the tag. Its SHA-256
equals the candidate's copy (`02-guard-script-hash.txt`). `check-protection.js` is the checksum test, which is spot-check 1.

Command (`03-guard-raw.txt`):
`node check-control-from-tag5.js --dir . --tag v0.7-tests-approved-5 --remote origin`, run in `tests/` of the fresh clone. Exit status **1**.

| Figure | Documented | Actual |
|---|---|---|
| PENDING items | 48 | **48** (6 raised counts + 15 new tests + 27 new protected lines) |
| New protected lines | 27 | **27** |
| FAIL | 3 | **3** |
| Guard checks | — | 9 passed, 3 failed |

The three FAILs:
1. `run-all.sh: CHANGED since the approved baseline (needs approval)`.
2. `accepted-results.json: WEAKENED: confidence snapshot v0.7: snapshot changed`.
3. `checksums.txt: 9 approved line(s) REMOVED or CHANGED`. The guard's message names only the first three files. The full 9, from comparing the Tag-5 and candidate `checksums.txt` (`04-changed-protected-lines.txt`), are: check-globals.js, compare-snapshots.js, snapshots/README.md, test-uom.js, test-import-stage1.js, test-import-mapping.js, test-same-results.js, tools/import-v1/reverse-eight-sheet.js, test-import-integrity.js. Their new hashes are 9 of the 27 new protected lines.

All documented figures match. No discrepancy.

### Spot-checks (14 tests, run individually)

Script: `spot/run-spot.sh`.
- It runs `TZ=UTC NODE_PATH=/home/claude/testdeps/node_modules node <file>` in `tests/` of the throwaway copy at `43b6b55`.
- It takes the **last** "N passed, M failed" line of the output, the runner's own parse rule (`run-all.sh` line 37).
- Raw output for each test: `spot/<test>.out`. Results: `spot/05-spot-check-results.txt`. Tag-5 and candidate registry counts: `spot/06-raised-counts-registry.txt`.

| Test | Command file | Tag-5 count | Recorded count | Actual | Failed | Exit | Result |
|---|---|---|---|---|---|---|---|
| check-protection | check-protection.js | 434 | 452 | 452 | 0 | 0 | MATCH |
| check-globals | check-globals.js | 116 | 124 | 124 | 0 | 0 | MATCH |
| test-a1-static | test-a1-static.js | 29 | 30 | 30 | 0 | 0 | MATCH |
| same-results | test-same-results.js | 356 | 416 | 416 | 0 | 0 | MATCH |
| import-integrity | test-import-integrity.js | 386 | 396 | 396 | 0 | 0 | MATCH |
| test-a1-sync-path | test-a1-sync-path.js | 74 | 76 | 76 | 0 | 0 | MATCH |
| empty-text (new, Stage 3) | test-empty-text.js | — | 46 | 46 | 0 | 0 | MATCH |
| scrap-rules (new, Stage 3) | test-scrap-rules.js | — | 71 | 71 | 0 | 0 | MATCH |
| partial-totals (new, Stage 3) | test-partial-totals.js | — | 8 | 8 | 0 | 0 | MATCH |
| stage3-round2 (new, Stage 3) | test-stage3-round2.js | — | 35 | 35 | 0 | 0 | MATCH |
| x1-foundation (new, X1) | test-x1-foundation.js | — | 40 | 40 | 0 | 0 | MATCH |
| x1-material-integrity (new, X1) | test-x1-material-integrity.js | — | 42 | 42 | 0 | 0 | MATCH |
| x1-acceptance-wording (new, X1) | test-x1-acceptance-wording.js | — | 12 | 12 | 0 | 0 | MATCH |
| browser-x1-chrome (new, X1, real Chrome) | browser-x1-chrome.js | — | 334 | 334 | 0 | 0 | MATCH |

Limitation: these spot-checks ran in UTC only. The registry runs test-a1-static, test-a1-sync-path and the four Stage 3
tests in two zones, and the three X1 node tests in five zones. Multi-zone results come from the full-tier CI runs of
21 Nov (44952372282, 44954005216), not from this pass.

## 2. Northstar: the actual application

- **Method:** the candidate's own `index.html`, served from the throwaway copy (`python3 -m http.server 8766`), opened in
  Chrome (Playwright 1.63.0, 1280 × 900). The workbook was uploaded through the page's file input, exactly as a user does.
- **Captured:** the visible text of all 17 tabs (`app/<run>/tab-*.txt`), and the live result object the page computed
  (`R`, `mrp()`) read from the page (`app/<run>/engine-live-R.json`). Script: `app/run-app.js`; commands in
  `app/command-*.txt`. Both runs: exit 0, 0 console errors, title "Chain Genius – Inventory Intelligence Engine (v0.7
  development build: X1 candidate, not a release)".
- **Workbooks:** `tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx`, SHA-256 `55a57bc7…` before
  and after; same Git blob as at Tag-5. `stage3-design/audit-20261121/evidence/workbooks/ns-x1-faults.xlsx`, `229f95e9…`
  before and after (`app/workbooks-sha256-after.txt`).

### Comparison with the worksheet's "Engine results" (`app/07-worksheet-comparison.txt`, script `app/compare.py`)

44 figures compared. Tolerance: half a unit of the worksheet's printed rounding. **43 agree, 1 disagrees.**

| Worksheet | Figures | Candidate fields | Result |
|---|---|---|---|
| 1 FG001 | m 87.25, σ 10.7945, d 2.8685, L 2.6667, SS 5.27, ROP 12.92 | `R.fg[FG001].m, sg, d, lt, ssR, ropR`; the Reorder policy tab shows SS calc 5 and ROP calc 13 | 6/6 agree |
| 2 RM001 | m 386.3822, σ 45.5043, d 12.7030, L 36.85, σL 4.7252, SS 128.99, ROP 597.09 | `R.rm[RM001].*` | 7/7 agree |
| 3 Total | FG £922,703.94, RM £1,610,892.46, total £2,533,596.40 | `R.fgV, R.rmV, R.tot`; the Overview tab shows "£2,533,596" | 4/4 agree |
| 4 RM004 MRP | m, gross 3,339.13, available 1,188, receipts 0, net 2,484.13, order 2,500, value £28,425.00, margin 2.94, "Order soon", order by 2026-11-02, alternative net 2,027.13, MRP tab row | `mrp()[RM004].gross, rq, net, qty, val, st, by, netU`; the MRP tab row shows 2,484 / 2,500 / £28,425 / Order soon | 11/12 agree |
| | **cover 32.47 days** | `(av + rq) / d` = **32.464996…** | **disagrees** |
| 5 ABC | the 8 class changes listed below | `R.*[].abc`, clean run vs faulty run | 15/15 agree |

Limitation: days of cover and the order-by margin are intermediate values inside `mrpCalc` (`days`, `ob`); they are not
returned. They were computed from the candidate's own returned values (`av`, `rq`, `d`, `lt`) with the code's expressions.
The returned outputs that depend on them all agree: the status, the order-by date 2026-11-02 and the stock-out date 2026-12-02.

### Discrepancies, categorised

1. **Cover days, 32.47 vs 32.464996: category (a), worksheet error.** It is a rounding transcription error: 32.464996
   rounds to 32.46. The worksheet's derived margin of 2.94 and the engine's status and dates are unaffected.
2. **Lead-time rule in checks 2 and 4: category (a), worksheet error.** It was found while tracing the figures; the numbers
   agree. The worksheet says L is the supplier's mean order-to-received days. The candidate's code (`js/calculations.js`
   lines 136-138, `app/08-rm-leadtime-code.txt`) and its Materials tab ("Materials.Lead_Time_Days = 35.0 d plus 1.9 d average
   supplier lateness") use **Materials.Lead_Time_Days + mean lateness (received − promised)**.
   - On Northstar the two rules give identical results, because every promised date is exactly Lead_Time_Days after the order date (`app/09-leadtime-rule-check.txt`).
   - A checker following the old wording would agree here only by coincidence.
   - σL is correctly described: the population s.d. of order-to-received days (`ltS: s.ltS`, line 141).

**Correction:** `worksheet-v2/NORTHSTAR-HUMAN-CHECK-WORKSHEETS-v2.md`. The original is preserved as `worksheet-v2/ORIGINAL-3f86d9d.md`
and is unchanged on its branch; the diff is `worksheet-v2/v1-to-v2.diff`. A new source file,
`worksheet-v2/check2-supplier-lead-times-v2.txt`, adds the promised dates. Re-run against v2:
**44/44 agree**, and the candidate's `lt0` (base) is 35 and 28 as the corrected rule states (`app/07b-worksheet-v2-comparison.txt`).

**No engine error found.** No category (b) or (c) items.

### Faulty-workbook ABC: actual candidate output

| Item | Clean | Faulty | Worksheet says | Match |
|---|---|---|---|---|
| FG007 | C | Not Assessed | Not Assessed | yes |
| RM005 | A | Not Assessed | Not Assessed | yes |
| RM017 | B | Not Assessed | Not Assessed | yes |
| RM042 | B | Not Assessed | Not Assessed | yes |
| FG018 | B | C | B → C | yes |
| FG030 | A | B | A → B | yes |
| RM020 | A | B | A → B | yes |
| RM051 | C | B | C → B | yes |

Exactly these 8 items differ between the two runs, and no others.

## 3. X1 D6: confidence reference "4 items" → "3 items"

- **What D6 is:** the X1 decision on the meaning of a missing demand month (`X1-NUMERIC-INTEGRITY-DESIGN.md` line 32). As
  implemented (`js/calculations.js`, X1 WP6 comment "D6 + Q1 (owner, 21 Nov 2026)"):
  - a missing month is unknown, not zero;
  - raw-material usage is derived from parent units sold by **calendar month**;
  - a month in which any parent has no demand row is unknown.
  Before X1, usage was aligned by row position.
- **The value:** willow `clientQuestions[6].ev` asks "How are reorder points and safety stocks set…". The count is the
  number of items whose verdict is "Existing ROP insufficient" (`js/calculations.js` line 205). Snapshot diff:
  `d6/10-snapshot-diff.txt`, exactly one value changed.
- **Affected items** (`d6/12-willow-rop-by-commit.txt`, actual engine via `CGEngine.runEngine` at each commit, TZ=UTC):

  | Commit | Count | Items |
  |---|---|---|
  | `eddf09b` (Stage 2) | 4 | WF-D656, WF-E110, ing 009, ing 017 |
  | `0d71aab` (Stage 3, before X1) | 4 | same |
  | `43b6b55` | 3 | WF-D656, WF-E110, ing 009 |

- **Why ing 017 left the list:** its six parent products are missing demand rows in four of the ten months:
  - WF-D656 in Dec 2025;
  - WF-K343 in Apr 2026;
  - WF-N525 in May 2026;
  - WF-E110 in Jun 2026.

  Before X1 these gaps were mixed in by row position, producing a spurious final value of 265.67. Under D6 those four months are unknown. Usage is now based on the six known months, mean 2,110.57.

  | | ROP calc | Workbook ROP | Verdict |
  |---|---|---|---|
  | Before X1 | 2,890.42 | 2,083 | Existing ROP insufficient |
  | Candidate | 2,429.06 | 2,083 | Broadly aligned |

  ing 009 also changed (ROP calc 1,278.35 → 1,227.55) but stays insufficient.
- **Check against the raw data** (`d6/13-ing017-raw-check.txt`, a reference script, not candidate output): rebuilding
  ing 017's monthly usage from the raw BOM and Demand History sheets under the D6 rule gives the same four unknown months
  and the same six values as the candidate's `hc` array, to 6 decimals.
- **Is 3 correct?** Under the D6 rule as implemented, yes: the candidate's count, its item list and the raw-data rebuild agree.
- **Registry and records:**
  - The registry note and `X1-CHANGE-RECORD.md` CR-20 describe exactly this change (one value, ing 017, D6/WP6). The guard still reports it as FAIL "WEAKENED", because replacing the confidence reference needs approval through the next approved tag.
  - The code comment and the X1 records label D6/Q1 as an owner decision of 21 Nov, and the registry note says "X1 Q3 (owner approval 21 Nov 2026)". This pass did not verify any owner act. The registry change is **not** approved: it is still in the Tag-6 registry approval block.
- **Remaining uncertainty:** whether "unknown" (D6) is the right business meaning for a missing month is a policy question, outside arithmetic. This check only establishes that the candidate applies the rule consistently.

## 4. Unresolved items

- Multi-zone spot-checks were not run in this pass (UTC only); see §1 limitation.
- Cover days and the order-by margin cannot be read directly from the application, as explained in §2.
- The human checks themselves are still required, by someone other than Claude, using worksheet v2.

## 5. Candidate validity

**NO.** No verification in this pass establishes an engine or integrity failure in `43b6b55`:
- the guard figures are as documented;
- all 14 spot-checked counts match;
- all worksheet figures agree with the actual application once two worksheet errors (category (a)) are corrected;
- the faulty-workbook ABC changes match;
- D6 is explained and consistent with the raw data.

This is **not** release validation. Still outstanding:
- the owner's decisions;
- the human checks;
- freezing the final commit, with full re-verification;
- Tag-6 approval;
- the registry approval, including D6's snapshot change.
