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
