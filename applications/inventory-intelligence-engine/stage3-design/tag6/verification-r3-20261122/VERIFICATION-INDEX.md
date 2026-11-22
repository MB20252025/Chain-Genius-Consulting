# Verification of Tag-6 candidate r3 (22 Nov 2026)

**Frozen candidate:** `b1d2db93239d883fd002d2a45d1ed86277d995a6` (`candidate/tag6-20261122-r3`); parent `43b6b55`.
Claude's engineering evidence. It is **not** independent verification, and the owner's five checks are separate.

| Check | Command / method | Result | File |
|---|---|---|---|
| Identity | fresh clone from GitHub, detached at the SHA, 0 status lines | as stated | `00-identity.txt` |
| Full tier, local (all zones) | `run-all.sh --full` in a throwaway copy, Playwright 1.63.0 first on NODE_PATH | **54 tests passed (+ pre-flight)** of 61; FAIL 1 (`check-control`, the Tag-5 guard); BLOCKED 4; REDUCED 2; ERROR 0 | `full-summary.txt`, `full.log` |
| Fast tier, local | `run-all.sh --fast` | **39 tests passed (+ pre-flight)** of 40; FAIL 1 (guard) | `fast-summary.txt`, `fast.log` |
| CI, GitHub runner | `candidate verification` workflow pinned to the SHA, run **44979924410** | fast 39 (+ pre-flight), full 54 (+ pre-flight); guard FAIL; 4 BLOCKED, 2 REDUCED, 0 ERROR; test-paging-chrome 59 | `ci/ci-44979924410-b1d2db9.log` |
| Guard (Tag-5 check-control) | `node check-control-from-tag5.js --dir . --tag v0.7-tests-approved-5 --remote origin` | exit 1: **3 FAIL** (same as the parent); **PENDING 50** = 6 raised + 16 new tests + 28 new lines (the parent's 48, plus tag6-changes and its checksum line; check-protection raised 434 → 453) | `guard.txt` |
| check-protection | `node check-protection.js` | 453/453 | `guard.txt` context; in both tiers |
| Snapshots | in both tiers, 5 zones | golden v0.5 10/10, golden v0.6.0 10/10, confidence 51/51: **unchanged** | `full-summary.txt` |
| Stage 2 regression | in both tiers | import-adapter 346, same-results 416, import-integrity 396 and the rest at accepted counts | `full-summary.txt` |
| X1 regression | in both tiers, 5 zones | x1-foundation 40, containment 41, wp5 56, completion 48, material-integrity 42, acceptance-wording 12, browser-x1-chrome 334 | `full-summary.txt` |
| New test | test-tag6-changes, 5 zones | 23/23; fails 13 of 23 on the parent | `full-summary.txt` |
| Real Chrome, desktop 1280 × 900 and 412 × 915 (touch emulation) | `app/run-app.js`, serving the candidate's own `index.html`; upload through the file input; all 17 tabs; export through the Settings button | Northstar, faulty Northstar and Willow at both widths: load 132–283 ms, slowest tab ≤ 273 ms, no sideways scrolling. Console errors: **0** on Northstar and faulty; **1 on Willow, pre-existing** (identical on the parent; see findings) | `app/<workbook>-<width>/` (`meta.json`, tab text, screenshots, `engine-live-R.json`, `export.xlsx`) |
| Export | downloaded file opened with SheetJS | 10 ENG_ sheets (9 on Willow); ENG_FG columns `Item, Name, Group, OnHand, Allocated, Usable, Uncommitted, Available, …`; 50 FG and 100 RM rows. NaN cells: 0 on clean; **3 on faulty, pre-existing** (identical on the parent; see findings) | `app/*/export.xlsx`, `meta.json` |
| Performance, 5,100 items | `gen-large-workbook.js … 34`; `perf-node.js`, same machine, parent then candidate | analyse() median: parent 1,265 ms, candidate 1,326 ms (5 runs each; within run-to-run spread 1,236–1,412). run() = 3 analyses: 3,925 → 3,784 ms. Dead-stock view 36 → 38 ms | `perf/` |
| Baselines and recovery copy | tar → manifest checks | r1 730/730, r2 730/730, recovery copy verified | `baselines.txt` |
| Remote refs | `git ls-remote` against the record | only the new branches added, plus `plan/` advanced by the decision record; Tag-5 and every accepted ref unchanged; temporary site `main` still `cd16dcc` | `remote-refs.txt` |

## Stopped item: evidence (`a8c0323-stopped/`)

The first head, `a8c0323`, contained the A3 "usable exceeds physical" warning.
- Local full tier, local fast tier and CI run 44977789934 all failed **import-adapter** (accepted Stage 2) at 341/346, in 5 zones.
- Cause: the accepted Stage 2 decision B6. The warning was reverted (`83da66f`); see `../IMPLEMENTATION-RECORD.md`.

## Pre-existing findings seen during verification (not introduced by r3; identical on `43b6b55`; not fixed: out of the approved scope)

1. **Export NaN, faulty Northstar.** `ENG_POReconciliation.GapValueGBP` holds `NaN` for RM005, RM017 and RM042 (blank cost). This breaks the X1 export rule (an unknown is exported as an empty cell, never NaN) on one sheet.
2. **Willow chart.** One SVG chart receives `NaN` points (`<polyline> … NaN`) for items with unknown demand months (D6). The browser logs an error and draws that line incompletely.
