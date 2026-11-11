# A1 accepted deviations

## D1. `confAreas()` and `CONF_TXT` remain in `js/app.js` (module separation incomplete)

**Status: DEFERRED TO v0.8 — Option B approved by the owner on 11 Nov 2026, with binding conditions.** Full separation of business logic from the interface file has **not** been achieved, and `confAreas()` has **not** been moved. No move is to be attempted in v0.7.

**Binding conditions (the owner's, 11 Nov 2026):**

1. The shared test loader must be the first task in v0.8.
2. The move of `confAreas()` and `CONF_TXT` out of `app.js` must happen in that same work.
3. At the end of v0.7.1, written confirmation must be given that both items remain in the v0.8 plan.
4. Any new A2 work that adds a dependency on `app.js` must be reported explicitly.

(Earlier history: on 11 Nov this record was corrected from "accepted" to "pending the owner's decision", because the owner had not accepted D1 at that point.)

**Measured cost of moving now (trial in a throwaway copy, `tests/logs/a1-d1-trial/`):** with `confAreas()` and `CONF_TXT` moved to `js/engine/confidence.js` and nothing else changed, 10 runnable regression suites fail with "confAreas is not defined" or "CONF_TXT is not defined": test7, test8, test9, test-po-edge, test-fillcap, test-export-repeat, test-blank-qty, test-uom, test-missing-values, test-na-constraints. (The three blocked tests fail in any case, so the trial says nothing about them; they also use the fixed list.) The supplier and edge scenario runs fail too (through `dump_sup.js`). The golden snapshots are unaffected. 26 files in `tests/` load the app through the same fixed four-file list (`loaders-with-fixed-file-list.txt`).

**Planned in Stage 2:** move `confAreas()` and `CONF_TXT` unchanged to a new `js/engine/confidence.js`.

**Why it was not done:** about 25 test harnesses in `tests/` load the application by joining a fixed list of four files (`calculations`, `forecasting`, `app`, `excel-import`). Moving the function to a fifth file would make `confAreas()` undefined in every one of them that reaches it (directly, through the Excel export, or through the views). Making the move would mean editing those harnesses' file lists. Three of them (`test-fglt-note.js`, `test-forecast-conf.js`, `test-supplier-eligibility.js`) are the environment-blocked tests that must not be rewritten.

**What the A1 page-binding guards achieve:**

- The four v0.6 scripts and the wrapper now load without a page (no `document`), for example in Node or a Web Worker. Before A1 they failed with "document is not defined".
- So `confAreas()`, `SETDEF` and the rest of `app.js`'s logic can be called without a page. The wrapper relies on this.
- In the browser nothing changes, because `document` always exists.

**What they do not achieve:**

- `app.js` still mixes screen code and business logic: `confAreas()`, `CONF_TXT`, `SETDEF`, `applySettings()` and the 17 views share one file.
- Screen functions such as `show()` and the views still need a page when they are *called*; only *loading* is guarded.
- `exportWorkbook()` still needs a browser to save the file.
- The engine still communicates through shared globals (`CFG`, `R`, `WB`). That is Phase 2/3 work, deferred to v0.8.

**Proposed resolution for a later version (not implemented):** in v0.8, together with Phase 3 (retiring the globals):

1. Add one shared loader for the test harnesses (`tests/load-app.js`) that reads the script list from `index.html`. Every harness then loads the same files as the page.
2. Switch the harnesses to that loader in one reviewed commit. The environment-blocked tests are switched only once they can be run as written, or with your explicit approval.
3. Then move `confAreas()`, `CONF_TXT` and `SETDEF` unchanged into `js/engine/`, with the golden snapshots and the Data confidence and Excel export outputs compared before and after.

## D2. Physical Android testing of the 17 tabs not done

**Status:** outstanding. Browser emulation results (`browser-chrome.js`, 53 checks: headless Chrome at desktop size and with Pixel 5 emulation) are retained. They do not prove behaviour on a physical Android phone. GitHub Pages serves only `main`, and a preview deployment is not authorised, so the A1 code cannot be opened on the owner's phone yet.

## D3. Playwright-based browser tests not run

**Status:** NOT RUN / ENVIRONMENT BLOCKED. Playwright's browser download is refused in this environment, and downloading it was not authorised. Affected: `test-paging-chrome.js` (part of the recorded suite) and, outside `run-regression.sh`, `check-standalone.js`, `test-final-chrome.js`, `test-p4-chrome.js`, `test-responsive-chrome.js`, `test-suppliers-export-chrome.js`, `perf-chrome.js`, `perf-chrome-p4.js`. None of them is reported as passed.

## D4. Four v0.6 test suites do not report failures through their exit code (found in the A1 review)

**Status:** RESOLVED in commit `27d6313` (approved by the owner on 11 Nov 2026). Evidence: `tests/logs/a1-d4/`. The text below describes the problem as found.

`test7.js`, `test8.js`, `domtest.js` and `domtest2.js` never call `process.exit`, so they exit with 0 even if a check fails. `run-regression.sh` decides pass or fail from the exit code alone. A FAIL inside these four suites would therefore be printed but would not fail the regression run. In addition, `test7.js` prints its summary line before its last 7 checks, so a failure among those 7 would not appear in the summary either.

Today all their checks pass: test7 118, test8 47, domtest 30, domtest2 18 PASS lines and 0 FAIL lines (`tests/logs/a1-review/test7-count.txt`). Until this is fixed, every A1 and later test record reads their FAIL-line counts as well as the summary.

**Proposed fix (needs approval):** at the end of each of the four files, add `process.exit(bad?1:0)`, using the existing counter names. In `test7.js`, also move the summary line to the end. This strengthens the tests and removes no check. The only visible change is that test7's summary would then read 118 instead of 111.

## D5. Five environment-blocked tests — DEFERRED (owner's instruction, 11 Nov 2026)

**Status: DEFERRED.** Not removed, weakened, bypassed or fixed. Never reported as passed. Carried into the A2 report.

| # | Test | Purpose | Why blocked | Needed to run | A2 gap? | Compensating evidence |
|---|---|---|---|---|---|---|
| 1 | `test-fglt-note.js` (7 asserts) | Phase 3: the finished-goods fixed-production-time note appears and nothing else changes, compared with the Phase 2 source | Needs the Phase 2 source tree `/mnt/user-data/outputs/inventory-intelligence-engine-c4-phase2/` | That historical zip (named in `PROTECTED-VERSIONS.txt`), unpacked at that path | None if A2 does not change engine code | v0.6.0 golden snapshot (items, mrp, feas, fc…); A1 wrapper equality on 17 fixtures |
| 2 | `test-forecast-conf.js` (18 asserts) | Phase 3B forecast-confidence correction, checked against the Phase 3 tree over 44 patterns plus fixtures | Needs `/home/claude/p3tree.txt` (Phase 3 file listing) | The Phase 3 zip and its tree listing | **Yes — real gap.** `fcCredAll()` and `confAreas()` are not in the golden snapshot, so a silent change to forecast confidence would not be caught by a snapshot diff | Partial: test8, test9 (confAreas ×5), test-cache, A1 wrapper/state tests (equality only, not change detection). **Proposed at A2 start:** freeze `fcCredAll()` + `confAreas()` for the 17 fixtures as a new snapshot and compare it on every run (needs approval) |
| 3 | `test-supplier-eligibility.js` (57 asserts) | Supplier metric eligibility and the "Not Assessed" state, re-derived independently | Needs `/home/claude/p3tree.txt` | As for #2 | Small | Golden `sup` section; 16 supplier/edge scenarios against expected JSON; test-phase1 "Not Assessed" checks |
| 4 | Phase 2 comparison inside `run-regression.sh` | Compares snapshots with tag `v0.6-candidate-4-phase2` across 5 time zones | That tag (and `c4-base`, `phase1-final`) is not on GitHub | The historical repository or zip containing those tags | None | Superseded by the v0.6.0 baseline comparison, which runs and passes |
| 5 | `test-paging-chrome.js` (15 asserts) | Real-Chrome paging at phone width | Playwright browser download is blocked (see D3) | Approval to download Playwright's browser, or a machine that has one | None for A2 (A2 adds no screens) | jsdom `test-paging` (23); `browser-chrome.js` (53, Pixel 5 emulation); the owner's physical Android test (D2, still outstanding) |
