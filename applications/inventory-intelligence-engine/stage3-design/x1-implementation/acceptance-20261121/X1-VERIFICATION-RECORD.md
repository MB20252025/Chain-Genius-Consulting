# X1 verification record: final candidate (21 Nov 2026, version 2)

*Self-verification by Claude, not independent review. Version 1 (19:00) is kept in `history-v1-1900/`. Desktop and mobile results are
headless or real Chrome with device emulation, not a physical phone. Nothing is labelled "Verified" in the governance sense (v2 §13.2).*

## A. Full regression on the final candidate

**How it was run:**
- A throwaway copy of the original working tree, with the evidence folder excluded and the complete candidate tree laid on top. The copy
  was checked identical to the candidate (only the evidence-folder listing absent, by design).
- Command: `NODE_PATH=<pinned testdeps> bash tests/run-all.sh --full`.
- Output: `evidence-files/full-regression-final-candidate.txt`.

| Result | Count | Detail |
|---|---|---|
| Tests passed | **52** (+ pre-flight) | runner header "PASS: 53" includes the pre-flight row; one more than version 1 because the wording test is now registered |
| FAIL | 1 | `check-control`; see §B |
| BLOCKED | 5 | the listed known gaps; see §C |
| REDUCED | 2 | the listed known gaps; see §C |
| ERROR | 0 | |

**Key rows (all PASS):**

| Area | Tests |
|---|---|
| Snapshots | golden v0.5 and v0.6.0 (five zones), confidence v0.7 |
| Protection | check-protection **452**; check-globals 124 |
| Stage 2 | import-adapter 346; same-results 416; import-integrity 396 |
| X1 | x1-foundation 40; x1-containment 41; x1-wp5 56; x1-completion 48; x1-material-integrity 42; **x1-acceptance-wording 12**; browser-x1-chrome 334 |
| Independent checks and browser | python-verifier 17; scenarios 16 (each checked by `verify_sup.py`); browser-chrome 53 |

## B. `check-control`: why it fails and what completes it

- **The guard's rule** (its own code): approval exists only when your approved-baseline tag `v0.7-tests-approved-5` (Tag-5, `f0e81bb`) on
  the remote is moved to a reviewed commit. "A local tag is not an approval."
- **What it reports:**
  - FAIL: 3 checks over 9 approved lines (`run-all.sh`, `check-globals.js`, `compare-snapshots.js`, `snapshots/README.md`, and the
    confidence-snapshot reference). All were changed under earlier owner authorisations (16 Nov D1–D4 work, X1 Q3).
  - PENDING: every new test and count growth since Tag-5, including this task's `x1-acceptance-wording` and protection 452.
- **What completes it:** Tag-6, meaning you review the changes, commit them to the original repository and move the approved tag.
- **Why that is outside this authorisation:** it needs a commit, a tag and a push to the original repository, all prohibited here. The
  guard was not disabled, edited or bypassed.

## C. The listed BLOCKED and REDUCED tests

| Test | Needs | Investigation result | Status |
|---|---|---|---|
| test-fglt-note (D5 #1) | Phase 2 source tree | the tree exists only as zip `…candidate-4-phase2.zip` / commit `f663295` in a separate local repository from an earlier session. It is not in the original repository's objects, on GitHub (owner's repositories searched), in uploads or on this machine | BLOCKED (external: historical zip) |
| test-forecast-conf (D5 #2) | Phase 3 tree | same; no Phase 3 tree is recorded anywhere reachable | BLOCKED (external) |
| test-supplier-eligibility (D5 #3) | Phase 3 tree | same | BLOCKED (external) |
| phase2-comparison (D5 #4) | tag `v0.6-candidate-4-phase2` (`f663295`) | the commit is not in any reachable repository | BLOCKED (external) |
| test-paging-chrome (D5 #5) | Playwright's browser | **resolved by running it:** genuine Chrome for Testing 153 is installed with Playwright 1.63 (`/opt/pw-browsers`). The unchanged test (hash `3f1a68a0…`, matching its protected checksum line) ran with that Playwright instead of the pinned 1.65 (deviation: environment only) | **59/59 PASS outside the runner** (= the historical count in TEST-RECORD.md). The runner still shows BLOCKED because its pinned Playwright has no browser; the accepted entry was not changed |
| test-phase1 | `C3_TREE` (tag `c4-base`) | the historical tree is unavailable (as above) | REDUCED 57/125: 68 checks not run |
| test-uom | `P1_TREE` (tag `v0.6-candidate-4-phase1-final`, `7664564`) | unavailable. The U5 Option A checks (blank and whitespace-only UoM are missing, not unrecognised) are among the 110 that **do** run, and pass | REDUCED 110/164: 54 checks not run |

**What would unblock the remaining six:** the four protected zips recorded in `tests/PROTECTED-VERSIONS.txt` (SHA-256 recorded there),
plus the Phase 3 tree, if you still hold copies. They cannot be rebuilt from other sources with verifiable fidelity, and no test was weakened
or replaced.

## D. Calculation verification

Independent recomputations, from the raw sheets, by separate code that never calls a production formula:

| Check | Scope | Tolerance | Result |
|---|---|---|---|
| `python-verifier` (pandas, `verify.py`) | 17 recalculations on Northstar | as coded | 17/17 |
| `scenarios` (`verify_sup.py` per scenario) | 16 supplier and edge scenarios | as coded | 16/16 |
| Calendar-month raw-material usage | all 100 materials × 12 months | 1e-6 relative | match |
| FG001 average demand; inventory value; partial value total; RM001 exposed £ | as named | 1e-9 / 1e-6 | match |
| Material known part with an unidentifiable BOM line | 100 of 100 materials | 1e-6 relative | match (RM001 386.3822/mo) |
| Workbook-policy reorder and safety-stock checks, RM001 | from the Inventory sheet | exact / 1e-6 | match |

**The three wording fixes and the label change do not alter calculations:**
- `calculations.js`, `x1-integrity.js`, the adapter and `engine-api.js` are byte-identical to `cd16dcc`.
- The golden and confidence snapshots pass unchanged.
- With clean data, every tab's text is identical to `cd16dcc`.

**Limit:** these are Claude's own independent checks. No person has reviewed calculation correctness (owner rule, v2 §13.2).

## E. Browser, mobile and performance (final candidate)

- **Browser:**
  - browser-x1-chrome 334;
  - browser-chrome 53;
  - test-paging-chrome 59 on genuine Chrome (phone 360/412 px, 600/601 px, 1280 px);
  - every checklist expectation for Tests 1–4: 19/19.
- **Version label:** shows correctly on desktop and Pixel 5 with no overflow (`evidence-files/version-label-pixel5.png`).
- **Console:** no console errors.

| Measure | Budget | Result (this container, Node v22.23.4) |
|---|---|---|
| `analyse()`, 5,100 items | < 2 s | **1,132 ms** median (902–1,259, 7 runs); 1,039 ms with a blank BOM line |
| Tab switch, Northstar, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 88 / 164 ms |
| Tab switch, 5,100 items, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 155 / 217 ms |

## F. Android physical evidence

- **The four tests** (owner-reported, 21 Nov 2026, Samsung Galaxy S24, Android 16, Chrome version not confirmed, build `cd16dcc`) remain
  valid for everything they recorded.
- **What changed afterwards:** text on the Summary and Reorder Policy tabs, the banner sentence when no item is Not Assessed, and the
  header label. None of the owner-recorded checks involved those texts.
- **How the changes were verified:** automation and emulation only. They were not seen on a physical phone, because the live site serves
  `cd16dcc` and redeployment is not authorised.
- **Is a physical check needed for acceptance?** No: the changes are static text, verified for content and layout (no overflow) on Pixel 5
  emulation.
- **Retained evidence:** no phone screenshots were found.
