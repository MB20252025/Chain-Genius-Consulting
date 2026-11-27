# Tag-7 registry assessment

Prepared 27 Nov 2026 for the owner's review before `v0.7-tests-approved-7` is created. Source: the **Tag-6 guard**
(`check-control.js` taken from `v0.7-tests-approved-6` = `e65600c`), run against the work commit that precedes the
switching commit.

**Acceptance.** The owner accepted this complete block retrospectively ("Phase 3 Completion – Prepare Tag-7", 27 Nov
2026, item 1), including the changes that test7 and the gap-warning correction require. From Tag-8, acceptance is per
phase (V07-TEST-RECORD, "Phase 3 completion").

**Guard result on the work commit:** 11 passed, 1 failed, 28 PENDING.
- The FAIL is the two approved checksum lines changed by owner-approved supersessions (table C).
- After the switching commit and the real Tag-7, the guard must report 12 passed, 0 failed, **0 PENDING**.

## A. Registry (`tests/accepted-results.json`): 12 PENDING; 62 → 69 entries

| # | Guard line | Tag-6 | Tag-7 | Origin | Reason |
|---|---|---|---|---|---|
| 1 | check-protection: count raised | 453 | 467 | readiness +5; Phase 0 +1; Phase 2 completion +2; Phase 3 +6 | 14 new protected files (table B) |
| 2 | check-globals: count raised | 124 | 132 | N-4 +1 (`CGShared`); Phase 1 UI +1 (`SCIE_UI`); Phase 3 +6 | new top-level engine names, each declared once |
| 3 | test-a1-static: count raised | 30 | 36 | Phase 0 +2; Phase 1 UI +4 | view and screen files checked never to read engine state directly |
| 4 | test-a1-sync-path: count raised | 76 | 91 | Phase 0 +2, N-4 +3, Phase 1 +1, Phase 2 +1, Phase 2 completion +2, Phase 3 +6 | functions newly reachable by the engine, each checked synchronous |
| 5 | test7: count raised | 118 | 120 | Phase 3 completion | one obsolete gate check → the three-boundary test (owner-approved) |
| 6 | test-h1-fglt-note-current: new | – | 3 | readiness | current-behaviour subset of a BLOCKED historical test |
| 7 | test-h2-forecast-conf-current: new | – | 5 | readiness | same |
| 8 | test-h2-level-shift-spec: new | – | 9 | readiness | the level-shift rule (backlog P-009 plans a Stage 3C change) |
| 9 | test-h3-supplier-eligibility-current: new | – | 299 | readiness | current-behaviour subset of a BLOCKED historical test |
| 10 | test-view-contract: new | – | 762 | Phases 0–3 | data contract of the new screens; §9 reviewed 27 Nov (no protection weakened) |
| 11 | phase3-demand-calendar: new | – | 168 | Phase 3, follow-up, completion | duplicates, calendar, forecasting rules, saved decisions, gap warning |
| 12 | browser-phase3-chrome: new | – | 40 | Phase 3, follow-up | Duplicates & gaps screen end to end, desktop and phone emulation |

No other registry field changed: no test removed, no tier, time zone, file, label, snapshot, BLOCKED or REDUCED change.
The switching commit adds one more change, which the guard reports as a FAIL against Tag-6 and which is expected: the
`check-control` entry's `"tag"`, from `-6` to `-7`.

## B. New protected files (`tests/checksums.txt`): 14 lines; 450 → 464 files (+ 3 references = 467)

| File | Origin |
|---|---|
| `tests/historical-subset.js` | readiness (22 Nov) |
| `tests/test-h1-fglt-note-current.js` | readiness |
| `tests/test-h2-forecast-conf-current.js` | readiness |
| `tests/test-h2-level-shift-spec.js` | readiness |
| `tests/test-h3-supplier-eligibility-current.js` | readiness |
| `tests/test-view-contract.js` | Phase 0 (22 Nov), re-hashed in each later phase |
| `tests/fixtures/forecast-gaps/forecast-gaps.xlsx` | Phase 2 completion (24 Nov) |
| `tests/fixtures/forecast-gaps/make-forecast-gaps.js` | Phase 2 completion |
| `tests/test-phase3-demand-calendar.js` | Phase 3 (25 Nov), re-hashed 27 Nov |
| `tests/fixtures/phase3/phase3-duplicates.xlsx` | Phase 3 (synthetic) |
| `tests/fixtures/phase3/make-phase3.js` | Phase 3 |
| `stage3-design/stage3b/phase3/baseline-bd61ae7/calculations.js` | Phase 3, reference engine copy (approved 27 Nov) |
| `stage3-design/stage3b/phase3/baseline-bd61ae7/forecasting.js` | Phase 3, reference engine copy (approved 27 Nov) |
| `tests/browser-phase3-chrome.js` | Phase 3 |

## C. Approved protected lines changed (the guard's FAIL): 2

| File | Tag-6 hash | Tag-7 hash | Approval |
|---|---|---|---|
| `tests/test-x1-wp5.js` | `e704b317bcf2…` | `3eb06c6c7933…` | lines 86 and 90 superseded one-for-one ("Phase 3 – Outstanding Decisions and Completion", item 1); 56 checks, unchanged |
| `tests/test7.js` | `e27012c390a3…` | `73c4405a618b…` | line 124 replaced by the three-boundary test ("Phase 3 Completion – Prepare Tag-7", item 1); 118 → 120 |

Both previous hashes are kept as comments in `checksums.txt`.

## D. Switching changes (the switching commit only)

- `.github/workflows/v07-tests.yml` `TAG:`;
- `tests/accepted-results.json` `check-control` `"tag"`;
- `tests/check-control.js` default `--tag`.

All three change from `v0.7-tests-approved-6` to `v0.7-tests-approved-7`. The switching commit also adds the Tag-7 row to
`tests/README.md` (marking Tag-6 superseded) and the Tag-7 Part A record to `V07-TEST-RECORD.md`. It changes no guard
rule.
