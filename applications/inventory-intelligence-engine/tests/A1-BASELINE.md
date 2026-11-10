# Pre-A1 baseline record (v0.7 development)

Recorded 10 Nov 2026, before any v0.7 code change. Protected baseline: `main`, `release/v0.6` and tag `v0.6` at commit `8117c72f9bdb846fceff11a63a03218f01df5082`. `development/v0.7` was created from that commit.

The suite ran on an untouched copy of the v0.6 tree (`git archive 8117c72… applications/inventory-intelligence-engine | tar -x -C /home/claude/baseline-run`), so no logs were written into the repository during the baseline run. Raw outputs are in `tests/logs/a1-baseline-20261110/`.

Environment: Node v22.23.4, Python 3.13.18 with pandas 3.0.5, Linux, headless Chrome. Test packages were installed outside the repository (`NODE_PATH=/home/claude/testdeps/node_modules`). Because `tests/package.json` uses `*` for several packages, the installed versions may differ from the originals: xlsx 0.18.5, jsdom 31.0.0, acorn 8.19.0, pdf-parse 1.1.1, puppeteer-core 25.17.0, @sparticuz/chromium 153.0.0, playwright 1.65.0 (playwright is not listed in `tests/package.json`).

## Commands and results

| Command (from `tests/`) | Exit | Result |
|---|---|---|
| `bash run-regression.sh 20261110T-baseline` | 1 | See breakdown below; exit 1 is caused only by the NOT RUN items |
| `node browser-chrome.js` | 0 | `summary 53 pass 0 fail` (headless Chrome, desktop and Pixel 5 emulation, not a physical device) |
| `node test-paging-chrome.js` | 1 | NOT RUN: environment blocked (see below) |

`run-regression.sh` breakdown, identical in UTC and Europe/London:

| Suite | Result |
|---|---|
| test7 / test8 / test9 / domtest / domtest2 | 111 / 47 / 57 / 30 / 18 pass, 0 fail |
| test-failed-import / test-export-nohistory / test-timezones / test-po-edge / test-structure / test-paging | 18 / 19 / 15 / 35 / 34 / 23 pass, 0 fail |
| test-fillcap / test-export-repeat / test-cache / test-phase1 / test-blank-qty / test-uom / test-missing-values / test-na-constraints | 276 / 24 / 15 / 57 / 19 / 110 / 63 / 88 pass, 0 fail |
| check-globals | 114 pass, 0 fail |
| verify.py (independent Python verifier, Northstar) | 17 pass, 0 fail |
| Supplier and edge scenarios | 16 of 16 PASS |
| Golden snapshots v0.5 and v0.6.0 baseline, 5 time zones | 10 of 10 ALL SECTIONS IDENTICAL |

## NOT RUN / ENVIRONMENT BLOCKED (never to be reported as passed)

These must stay on the list of unresolved verification items until they can be run as written.

| # | Test | Why it cannot run here |
|---|---|---|
| 1 | `test-fglt-note.js` | Needs the candidate-4 Phase 2 tree at `/mnt/user-data/outputs/inventory-intelligence-engine-c4-phase2/` (original build environment; not in the repository) |
| 2 | `test-forecast-conf.js` | Needs `/home/claude/p3tree.txt` and the Phase 3 tree it points to (original build environment) |
| 3 | `test-supplier-eligibility.js` | Same as 2 |
| 4 | Phase 2 comparison inside `run-regression.sh` (5 time zones) | Needs tag `v0.6-candidate-4-phase2` (and `c4-base`, `v0.6-candidate-4-phase1-final`), which are not in the GitHub repository; `git archive` produced nothing |
| 5 | `test-paging-chrome.js` | Needs Playwright's own browser; its download is refused in this environment (`npx playwright install chromium` → `Download failure, code=1`) |

These tests have not been removed, weakened, redirected or rewritten.

## Documentation discrepancy (not a failure)

`TEST-RECORD.md` line 57 says test7 has 118 checks and calls 111 a miscount; lines 73 and 141 say 111. The baseline run reports 111 passing.
