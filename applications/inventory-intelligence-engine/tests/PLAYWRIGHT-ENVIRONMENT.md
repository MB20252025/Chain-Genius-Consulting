# Chrome paging test (`test-paging-chrome`): how to run it (21 Nov 2026)

Status: technical correction, environment only. **PENDING owner approval** of the registry change described at the end.
No test file, runner code, protected count or checksum was changed.

## The problem

`accepted-results.json` registers `test-paging-chrome` as BLOCKED ("Playwright's browser is not installed (download
blocked)"). The runner's blocker check asks the `playwright` package that Node resolves first for its Chromium path.

- The pinned test tooling (`/home/claude/testdeps`) resolves Playwright 1.65, which expects browser build chromium-1254.
- This environment ships Chrome for Testing 153 as chromium-1243 under `/opt/pw-browsers`, which Playwright 1.63 expects.
- So with the default settings the blocker is "present" and the test is reported BLOCKED, although a working browser exists.

## The correction (no code change)

Run the full tier with a global Playwright 1.63 first on `NODE_PATH` and the shipped browsers:

```
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
NODE_PATH=/home/claude/.npm-global/lib/node_modules:/home/claude/testdeps/node_modules \
bash run-all.sh --full
```

The runner then finds the browser, prints "documented blocker is no longer present: running the test", runs the
original, unchanged `test-paging-chrome.js`, and reports PASS with 59 checks (the historical count).

Evidence: full tier of commit `a4e05e8` (branch `x1/accepted-20261121`, worktree of the pushed commit), 21 Nov 2026:
54 tests passed (+ pre-flight), 1 FAIL (`check-control`, by design until Tag-6), 4 BLOCKED, 2 REDUCED, 0 ERROR.
`test-paging-chrome` PASS 59. Package versions matched the recorded environment (pre-flight PASS).

## Still needed (owner decision, not done)

Changing the registry entry from BLOCKED to an accepted count of 59 raises a protected count. Under the guard that is
a PENDING item that only the owner's next approved tag can approve. Until then the entry stays BLOCKED, and the runner
already runs the test automatically whenever the browser is found. Playwright 1.63 is not one of the recorded
environment packages; recording it is part of the same decision.
