# A1 review: shared state and caches around `CGEngine.runEngine()`

**Finding: a wrapper run leaves the application exactly as it was, after success and after failure. No correction to the wrapper was needed.** Restoring `CFG`, `R` and `WB` is sufficient, for the reason explained under "Caches" below. This was checked statically and at run time, not assumed.

## What a wrapper run writes (static scan of the whole `runEngine()` path, 44 top-level items)

Every assignment, `++`/`--`, and mutating method call (`push`, `splice`, `Object.assign`, …) on the path was traced to its root variable. Only these top-level variables are ever written:

| Shared state | Written by | During the run it refers to | Afterwards |
|---|---|---|---|
| `CFG` (settings object) | Wrapper: requested overrides (`engine-api.js` line 50); the policy and supply-source switches for the comparison runs (lines 54–55) | The same object, with values changed | Each changed value put back (line 61, and the switches' own `finally`). Keys are only reassigned, never added or removed, so key order (used in the MRP cache key) is unchanged |
| `R` (current result) | Wrapper (line 53; `R.alt`, `R.altS` lines 54–55) | The wrapper's own new result object | `R` points back to the screen's result object (line 62) |
| `WB` (workbook) | Wrapper (lines 51, 62) | The requested workbook, or the same one | Restored (line 62). The workbook's contents are never written by the engine |
| `R.memo` (MRP and feasibility cache, keyed by the settings) | `memo()` (`calculations.js` line 172) | Written onto whatever `R` refers to, which is the wrapper's result | The screen result's cache is never touched |
| `R.fcm` (forecasts cache) | `fcAll()` (`forecasting.js` line 29) | As above | As above |
| `R.fcc` (forecast-credibility cache) | `fcCredAll()` (`forecasting.js` line 40) | As above | As above |
| Items inside the result (`link()` adds cross-run notes) | `link()` via local variables | Items of the wrapper's result | Not shared |

Nothing on the path writes `WBNAME`, the screen state in `app.js` (`tab`, `shown`, `fsku`, `setDraft`, `setMsg`, paging state), or the constant tables (`CFG0`, `SUP_NA`, `UOM_ALIAS`, `FM`, `CONF_TXT`).

## Caches

All three caches are properties of a result object, not separate globals. While the wrapper runs, `R` is the wrapper's new result, so every cache it fills belongs to that new object. The screen result and its caches are not reachable through `R` during the run and are never written. When `R` is restored, the screen result comes back with its caches exactly as they were. The wrapper's caches stay with the result it returns (frozen) and do not affect later calculations.

## Runtime evidence (`tests/test-a1-state.js`, 10 checks, all pass)

All 92 top-level variables of the five scripts were snapshotted by identity and content hash, along with the screen caches, after first filling those caches as a user opening the tabs would.

| Scenario | Result |
|---|---|
| (1) Successful run with overrides (`z`, `hor`) | All 92 variables and the 3 screen caches unchanged; the wrapper's caches are on its own result |
| (2) Failed runs: engine error part-way (missing sheets), and a bad setting | Nothing changed; screen results and caches give the same answers as before |
| (3) 8 repeated runs with different settings | Each equals a separate, untouched copy of the app calculated with those settings; afterwards nothing changed |
| (4) A wrapper run followed by the normal `run()` | Results equal a fresh app that never used the wrapper, and equal the results before any wrapper run; settings equal a fresh app |

Mutation checks (throwaway copies; `tests/logs/a1-review/state-mutations.txt`): a wrapper that changes `WBNAME` → 6 failures; one that clears the screen MRP cache → 3 failures; one that leaves a setting changed → 8 failures.

## Limits and rules for later checkpoints

1. **Never assign a wrapper result to `R`.** Results are frozen. If one became the screen result, a later `mrp()` with different settings would try to add a cache entry and fail. This is a rule for A2 and later; nothing in A1 does it.
2. **Dates inside results can still be changed through their own methods** (for example `setTime`), because freezing does not cover a Date's internal value. Results are to be treated as read-only.
3. **The bundled SheetJS library is not analysed.** The engine uses only its reading functions (`sheet_to_json`, `read`), which are synchronous.
4. **The analysis covers the current code.** `test-a1-state.js`, `test-a1-sync-path.js` and `test-a1-wrapper.js` must pass at every later checkpoint so that a change that breaks these findings is caught.
