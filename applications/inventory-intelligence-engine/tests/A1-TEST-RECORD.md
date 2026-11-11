# A1 test record (v0.7 checkpoint A1)

Run 10 Nov 2026 on an exported copy of `development/v0.7` at commit `1a4438d2b8ebe5af93d0303d0a92c9e7346cb002` (`git archive … | tar -x -C /home/claude/a1-run`), with the same environment as `A1-BASELINE.md`. Raw outputs are in `tests/logs/a1/`.

## Results

| Command (from `tests/`, `NODE_PATH=/home/claude/testdeps/node_modules`) | Exit | Result | Same as baseline? |
|---|---|---|---|
| `bash run-regression.sh 20261110T-a1` | 1 | Every suite that ran in the baseline passes with the same counts; golden snapshots 10 of 10 identical; scenarios 16 of 16 PASS | Yes. The only line that differs: check-globals 116 passed (5 files) instead of 114 (4 files), because the wrapper file was added to its list |
| `node browser-chrome.js` | 0 | `summary 53 pass 0 fail` | Yes |
| `bash run-a1.sh` (new) | 0 | UTC and Europe/London: test-a1-static 20/20, test-a1-wrapper 117/117, test-a1-escaping 46/46 | New tests |
| `node test-paging-chrome.js` | 1 | NOT RUN: `Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1254/…` | Same as baseline (blocked) |

The comparison was made with `diff` on both regression outputs after removing only run timestamps, timing lines and Node stack-trace lines.

## Still NOT RUN / ENVIRONMENT BLOCKED (never reported as passed)

Same five as in `A1-BASELINE.md`: `test-fglt-note.js`, `test-forecast-conf.js`, `test-supplier-eligibility.js`, the Phase 2 comparison in `run-regression.sh`, and `test-paging-chrome.js`.

Also not run, in the baseline or here, because they need Playwright's browser too: `check-standalone.js`, `test-final-chrome.js`, `test-p4-chrome.js`, `test-responsive-chrome.js`, `test-suppliers-export-chrome.js`, and the performance scripts `perf-chrome.js` and `perf-chrome-p4.js`. They are not part of `run-regression.sh`; they are listed here so they are not forgotten.

## Mutation checks (showing the new tests can fail)

Each was run on a throwaway copy outside the repository.

| Fault planted | Test | Result |
|---|---|---|
| Wrapper skips `link()` | test-a1-wrapper | 50 failed |
| Wrapper does not restore CFG | test-a1-wrapper | 4 failed |
| Wrapper does not restore R | test-a1-wrapper | 37 failed |
| `cv_()` stops escaping table cells | test-a1-escaping | 9 failed |
| Bad code samples (async, await, timer, promise, `.then`, generator; references to R, CFG, WB) | test-a1-static | Detected (built into the test) |

---

# A1 review re-run (11 Nov 2026)

Run on an exported copy of `development/v0.7` at `62c9d9cbdd5c11aebbdb70dee8a2ff85b2b98bf9`, same environment. Raw outputs: `tests/logs/a1-review/`. The record above (first A1 run at `1a4438d`) is kept unchanged as history, except for the test7 note below.

**Correction to the record above:** where it says the regression suites match the baseline, test7's count is 118 checks (its summary line prints 111 before the last 7 checks). See `A1-BASELINE.md` and `A1-DEVIATIONS.md` D4.

| Command (from `tests/`) | Exit | Result | Compared with baseline |
|---|---|---|---|
| `bash run-regression.sh 20261111T-a1review` | 1 (only the NOT RUN items) | All suites pass with baseline counts; golden snapshots 10 of 10 ALL SECTIONS IDENTICAL; supplier and edge scenarios 16 of 16 PASS; Python verifier 17/17 | `diff` identical apart from check-globals: 116 checks for 5 files instead of 114 for 4 |
| FAIL-line counts for the suites without exit codes (D4), UTC and London | — | test7 118, test8 47, domtest 30, domtest2 18 PASS lines; 0 FAIL lines | Same as baseline |
| `node browser-chrome.js` | 0 | 53 pass, 0 fail | Same |
| `bash run-a1.sh`, UTC and Europe/London | 0 | test-a1-static 20, test-a1-sync-path 74, test-a1-wrapper 117, test-a1-state 10, test-a1-escaping 46: **267 passed, 0 failed** in each zone | New tests |
| `node test-paging-chrome.js` | 1 | NOT RUN: Playwright browser missing | Same (blocked) |

The wrapper still produces the same results as the application's own calculation sequence: test-a1-wrapper on all 17 fixtures, and test-a1-state comparing with separate untouched copies of the app.

**Not run / environment blocked (unchanged):** `test-fglt-note.js`, `test-forecast-conf.js`, `test-supplier-eligibility.js`, the Phase 2 comparison in `run-regression.sh`, `test-paging-chrome.js`; and, outside the recorded suite, the seven other Playwright scripts listed in `A1-DEVIATIONS.md` D3.

**Outstanding:** physical Android testing of the 17 tabs (D2); exit-code fix for four v0.6 suites (D4, needs approval).

---

# D4 fix and checks (11 Nov 2026, commit `27d6313`)

Change: `test7.js`, `test8.js`, `domtest.js` and `domtest2.js` set `process.exitCode=bad?1:0` after their summary (existing counters). test7's summary line moved to the end. No check changed. Evidence: `tests/logs/a1-d4/`.

| Check | Command | Result |
|---|---|---|
| Genuine run after D4 (UTC and London) | `TZ=… NODE_PATH=… node <suite>.js` from `tests/` | test7 118, test8 47, domtest 30, domtest2 18 pass; exit 0; summaries now match PASS-line counts |
| One planted fault per suite (throwaway copy `/home/claude/d4-fault`, one check's condition inverted; for test7 its last check) | `TZ=UTC node <suite>.js` | Each exits 1, summary shows 1 fail, FAIL line printed |
| Same test7 fault on pre-D4 code (`41ef293`) | `TZ=UTC node test7.js` | exit 0, "summary 111 pass 0 fail" while a FAIL line is printed: the gap D4 closes |
| Runner on the planted copy | `bash run-regression.sh 20261111T-d4fault` | Overall exit 1; each of the four listed as `exit 1` with its FAIL line, in UTC and London |
| Genuine runner after D4 (export of `27d6313`) | `bash run-regression.sh 20261111T-d4` | Same as the pre-D4 run except test7's summary: 118 instead of 111 (both zones). Exit 1 only from the five NOT RUN items |
