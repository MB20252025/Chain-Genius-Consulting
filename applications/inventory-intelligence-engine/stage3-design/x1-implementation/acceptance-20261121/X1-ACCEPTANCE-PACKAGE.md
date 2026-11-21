# X1 acceptance package and formal decision (21 Nov 2026, version 2)

*Version 1 (19:00, "ready with explicitly disclosed exceptions") is kept unchanged in `history-v1-1900/`. This version records the final
candidate and the formal decision under the owner's master authorisation "Complete X1, preserve the accepted baseline, close Stage 2 …"
(21 Nov 2026, 19:25).*

## 1. FORMAL DECISION: X1 ACCEPTED

| Item | Record |
|---|---|
| Decision | **ACCEPTED** |
| Date | 21 November 2026 |
| Made by | **Claude, under the owner's explicitly delegated authority** (master authorisation, Part B). It was **not** made through the owner's personal review at the time; the owner will audit it afterwards |
| Candidate | §2 below: `cd16dcc` + `js/app.js` + `index.html` (runtime), with the full candidate tree preserved in the baseline (`X1-ACCEPTED-BASELINE.md`) |
| Criteria applied | the 22 acceptance criteria, verbatim from §16 of the owner's X1 implementation brief (`b09f4b21`), plus the policies, owner decisions and later requirements (`X1-REQUIREMENTS-MATRIX.md`) |
| Result against the criteria | all 22 met. 21 met outright; criterion 19 met under the owner's regression-acceptance rule, with the listed known gaps stated in numbers (matrix row 19) |
| Accepted non-blocking limitations | `X1-REGISTERS.md` §3: L1 live site still `cd16dcc`; L3 `check-control` pending Tag-6; L4 4 BLOCKED + 2 REDUCED historical-tree tests (68 + 54 checks); L6 Android evidence owner-reported; L7 issue 8; L8 owner-deferred decisions; L9 route differences |
| Outstanding requirements | none within the X1 criteria. Tag-6 (owner), and the historical zips (owner, if held), are outside X1 |
| Scope of the decision | **X1 only** (numeric integrity: the 22 criteria and the X1 decisions). The candidate also contains the earlier Stage 3 engineering-completion and Round 2 work (16–19 Nov 2026, `STAGE3-CHANGE-REGISTER.md`). **That work is not accepted by this decision**: its own acceptance steps (Tag-6, owner review of each item, an Android check, formal written acceptance) are outstanding |
| Restrictions that remain | not a release and not production-ready; not deployed; not committed; no Stage 3A development started; the original repository is unchanged |
| Correction note | *21 Nov 2026, after the first preservation:* the "Restrictions" row first read "Stage 3 not started", which was inaccurate. The scope row was added. Both baseline revisions are kept (`X1-ACCEPTED-BASELINE.md`) |

**Why acceptance is legitimate, and not a waiver:**
- Every mandatory criterion is met on evidence produced by this candidate.
- No unresolved defect undermines a requirement: DEF-A1 to A4 are fixed and the material-integrity issues 27–34 are fixed.
- Every remaining exception predates X1, or depends on an owner-only action (Tag-6) or on an external artefact (the historical zips).
- Each exception is recorded with its numbers.

## 2. The exact accepted candidate

| Item | Value |
|---|---|
| Reference build | `cd16dcc` (temporary repository `MB20252025/chain-genius-x1-android-test`, `main`) |
| Runtime | `cd16dcc` + `js/app.js` (sha256 `6bf0223a71f09138…`) + `index.html` (`fd6bfe3582087afd…`); the other 8 runtime files are byte-identical to `cd16dcc`. `CANDIDATE-RUNTIME-MANIFEST.sha256` |
| Full candidate tree | the application folder in the temporary repository's working tree, preserved exactly in `X1-ACCEPTED-BASELINE.md` (full SHA-256 manifest) |
| Commit identifier | **none.** The candidate is uncommitted, and no commit ID is claimed |
| Lineage | original `development/v0.7` `eddf09b` + the uncommitted Stage 3 + X1 tree that passed the final X1 regression (= `cd16dcc` runtime) + CR-33 and CR-34 |

## 3. Changes since `cd16dcc` (diff: `evidence-files/runtime-changes-since-cd16dcc.diff`)

| ID | Change | File |
|---|---|---|
| DEF-A1 | Reorder Policy "Why" is verdict-specific | `js/app.js` |
| DEF-A2 | Summary has no zero-count contradictions | `js/app.js` |
| DEF-A3 | Banner says "Not Assessed" only when an item is | `js/app.js` |
| DEF-A4 | Title and header: "v0.7 development build · X1 candidate · not a release" (was "v0.6") | `index.html` |
| CR-34 | `test-x1-acceptance-wording` registered prospectively (accepted 12; protection 451 → 452; one new checksum line) | `tests/accepted-results.json`, `tests/checksums.txt` |

No calculation changed (`X1-VERIFICATION-RECORD.md` §D).

## 4. Results summary (details in `X1-VERIFICATION-RECORD.md`)

- **Full tier:** 52 tests passed (+ pre-flight), 0 ERROR. 1 FAIL (`check-control`, pending Tag-6), 5 BLOCKED and 2 REDUCED, all listed.
- **test-paging-chrome:** 59/59 on genuine Chrome, outside the runner.
- **Performance:** `analyse()` 1,132 ms at 5,100 items; worst tab switch 217 ms.
- **Calculations:** every independent recalculation matches. The snapshots are unchanged.
- **Android:** the four owner-reported tests stay valid for what they recorded. The later text changes were verified by automation and
  emulation only.

## 5. Deviations from the original implementation authorisation

- **Accepted by delegation, not by the owner personally** (by the owner's instruction).
- **`test-paging-chrome`** was run with the environment's Playwright 1.63 and its Chrome for Testing, not the pinned 1.65. The test file is
  unchanged.
- **The registry and checksum additions** (CR-34) were made in the candidate tree only. The original repository is unchanged.
- **Formal "accepted result" status of the run** (V07 rule 1: from a named commit) is not achievable without a commit. The run is evidence
  for this decision, not a new reference run.

## 6. Build and verification instructions

1. **Runtime:** serve `applications/inventory-intelligence-engine/` as static files and open `index.html`. There is no build step.
2. **Runtime identity:** from that folder, run `sha256sum -c stage3-design/x1-implementation/acceptance-20261121/CANDIDATE-RUNTIME-MANIFEST.sha256`.
3. **Whole tree:** follow `X1-ACCEPTED-BASELINE.md` §4.
4. **Tests:** use a throwaway copy of the original working tree (the Git tags it needs exist there), lay the candidate tree on top, then run
   `NODE_PATH=<pinned testdeps> bash tests/run-all.sh --full`. The full tier needs Python 3 with the packages in `tests/requirements.txt`.
5. **Paging test:** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=<playwright 1.63>:<testdeps> node tests/test-paging-chrome.js`.

## 7. Package contents

| File | Contents |
|---|---|
| `X1-ACCEPTANCE-PACKAGE.md` | this file |
| `X1-REQUIREMENTS-MATRIX.md` | the 22 criteria, policies and decisions |
| `X1-VERIFICATION-RECORD.md` | tests and calculations |
| `X1-REGISTERS.md` | defects, limitations and risks |
| `X1-ACCEPTED-BASELINE.md` | the preserved baseline |
| `CANDIDATE-RUNTIME-MANIFEST.sha256` | the runtime identity |
| `PROPOSED-REGISTRATION.txt` | the version-1 proposal; now applied as CR-34 |
| `evidence-files/` | outputs, diffs, timings, screenshot |
| `history-v1-1900/` | version 1 of every document |
