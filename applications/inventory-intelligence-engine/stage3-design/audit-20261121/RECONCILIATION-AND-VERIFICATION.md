# Reconciliation and verification record (21 Nov 2026, second pass)

Owner authorisation: "Comprehensive issue resolution, CI verification and Tag-6 readiness", 21 Nov 2026.
Written by Claude. This is Claude's own work: none of it is independent external verification.

## 1. Corrections to my own earlier figures (records are not rewritten; this section corrects them)

| Record | Says | Correct | Why |
|---|---|---|---|
| `SCIE-AUDIT-20261121.md` §2 and `tests/PLAYWRIGHT-ENVIRONMENT.md` | 54 tests passed (+ pre-flight) | **53 tests passed (+ pre-flight)** | the runner's "PASS: 54" includes the pre-flight row |
| final report of the first audit | candidate fast tier: 39 tests passed (+ pre-flight) | **38 tests passed (+ pre-flight)** | same cause ("PASS: 39") |

The runner now prints an explicit line, "Tests: N passed (+ pre-flight PASS), of T tests" (§6), so the figure
cannot be misread again.

## 2. Test counts, reconciled

| Run | Commit | Tests in tier | Passed (+ pre-flight) | FAIL | BLOCKED | REDUCED | ERROR |
|---|---|---|---|---|---|---|---|
| Stage 2 full tier (21 Nov) | `eddf09b` | 45 | 38 | 0 | 5 | 2 | 0 |
| X1 final candidate full tier (21 Nov, before acceptance) | working tree = r2 | 60 | 52 | 1 | 5 | 2 | 0 |
| X1 branch full tier (21 Nov, after push) | `a4e05e8` | 60 | **53** | 1 | 4 | 2 | 0 |
| Candidate fast tier (21 Nov) | `dc16902` | 39 | **38** | 1 | 0 | 0 | 0 |
| Candidate CI, fast and full | `dc16902` | see §3 | | | | | |

Why they differ:
- 45 → 60 full-tier tests: 15 new tests (Stage 3: allocated-usable, empty-text, shortage-delay, scrap-rules,
  tz-boundaries, partial-totals, stage3-quality, stage3-round2; X1: foundation, containment, wp5, completion,
  material-integrity, acceptance-wording, browser-x1-chrome).
- 52 → 53: `test-paging-chrome` moved from BLOCKED to PASS (59 checks) because the run used Playwright 1.63, which
  finds the installed browser. Nothing else changed: the two runs have identical rows otherwise.
- 60 full vs 39 fast: the fast tier leaves out 21 full-only tests (browser tests, Python verifier, scenarios, the
  1,000-call wrapper, the BLOCKED and REDUCED historical tests, and others listed in `accepted-results.json` "tiers").
- FAIL 1 in every run after Stage 2: `check-control` (§4).
- 59/59 paging is a count of **checks inside one test**, not a number of tests.

## 3. CI on the exact candidate

Workflow `candidate verification` (`.github/workflows/candidate-verification.yml`, branch
`ci/candidate-verification-20261121`, commit `c9e32de`). Why it was needed: `v07-tests.yml` runs only on pushes to
`development/v0.7`, and its first step runs the Tag-5 guard, which fails on any commit carrying unapproved
protected changes, so no tests would run. The new workflow checks out the pinned commit `dc16902` (not its own
commit), records the guard result without stopping, then runs both tiers. It stays red unless everything passes.
Results: filled in at the end of this pass (§9).

## 4. Criterion 19 and `check-control`

The Tag-5 guard (`check-control.js` taken from the tag) fails on three checks:

1. `run-all.sh` changed since Tag-5 (Stage 3: fast tier runs the snapshot tests in five zones; one comment, one
   function, one summary line).
2. `accepted-results.json` "WEAKENED": the confidence-snapshot reference file was replaced (twice). Each replacement
   changes **exactly one value**, documented in the registry note: willow "19 POs received short" → "11" (DR-4), and
   "4 items" → "3 items" (X1 D6). The historical files are kept unchanged and still checksum-protected. A separate
   recount from the raw willow sheet gives 11 (`evidence/outputs/willow-po-short-recount.txt`).
3. 9 approved checksum lines changed: protected test files edited by Stage 3 and X1 (originals kept as comments).

Plus 51 PENDING items (raised counts, new tests, new protected lines).

Finding: **the guard is behaving correctly.** Each FAIL is a real, unapproved change to protected test material.
It cannot be cleared without the owner's approval, and clearing it any other way (editing the guard, the
registry or the checksums to match) would weaken the protection. So criterion 19 is **qualified, not passed**:
"no unexpected regressions; one expected guard FAIL that only the owner's next approved tag can clear;
4 BLOCKED and 2 REDUCED historical tests not run."

## 5. X1 criteria, reclassified (owner's three classes)

Independently verified = evidence separate from the engineer's implementation and tests. Only Git/GitHub records and
the owner's own actions qualify. The new reference calculations (§7) are separate code but written by Claude,
so they count as **separate checks by the same engineer**, not independent verification.

| # | Criterion | Class | Evidence and gap |
|---|---|---|---|
| 1 | Seven fields, explicit states | Partially verified | engineer's tests; reference checks blank/invalid on-hand, cost, allocated (3 of 7 fields) |
| 2 | Provenance retained | Uncontradicted | engineer's tests only |
| 3 | Dependency mechanism | Partially verified | reference: unaffected fields of affected items unchanged |
| 4 | Dependent results withheld | Partially verified | reference: value/available withheld for faulty inputs |
| 5 | Independent results continue | Partially verified | reference: 143 unaffected items identical except the cross-item ABC ranking (see finding F1) |
| 6 | Missing not zero | Partially verified | reference: no blank became 0 |
| 7 | Recorded zero distinguishable | Uncontradicted | engineer's tests only |
| 8 | Invalid values do not propagate | Partially verified | reference: "abc" allocation withheld, item Not Assessed |
| 9 | Calendar structure kept | Partially verified | reference recomputes calendar-month BOM usage for all 100 materials: agrees |
| 10 | Absent history not zero demand | Uncontradicted | engineer's tests only |
| 11 | MRP allocation issue no longer stops the run | Uncontradicted | engineer's tests; fault workbook ran to completion |
| 12 | Affected allocation outputs withheld | Partially verified | reference (RM070) |
| 13 | Missing cost not misleading totals | Partially verified | reference: headline total withheld; partial sum and coverage agree |
| 14 | Missing on-order not zero | Uncontradicted | not probed |
| 15 | Shared rules on both routes | Uncontradicted | route difference F-XR1 open (decision register 4) |
| 16 | Route differences represented | Uncontradicted | engineer's tests only |
| 17 | Reporting explains withheld results | Partially verified | wording tests; temporary site still shows old wording |
| 18 | X1 tests pass | Partially verified | pass in today's runs and CI (§3); tests are the engineer's own |
| 19 | Unaffected functionality regression | Partially verified, qualified | §4 |
| 20 | Nothing protected overwritten | Partially verified | **Git (independent):** no file deleted since Tag-5; golden and confidence snapshot files, fixtures and 1,323 historical logs byte-identical. Gap: 9 protected test files changed pending approval |
| 21 | Changes traceable | Independently verified (structure) | Git history separates Stage 2 / Stage 3 / X1 / corrections; content still the engineer's |
| 22 | Decisions documented | Partially verified | registers plus `STAGE3-DECISION-REGISTER.md` |

No criterion is contradicted.

## 6. Low-risk corrections made in this pass

| Change | Before | Defect | After | Test | Rollback |
|---|---|---|---|---|---|
| `run-all.sh` adds one summary line | only "PASS: N" (includes pre-flight) | count misreported twice | adds "Tests: N passed (+ pre-flight PASS), of T tests" | fast tier re-run; `summarise-run.js` still parses (its pattern is anchored to the unchanged line) | revert one line |
| This record and the decision register | — | earlier counts wrong | corrected here | — | — |
| Reference calculations (`audit-20261121/reference/`) | none for stock value, safety stock, ROP, ABC, X1 containment | gap | new, not registered as tests | outputs in `evidence/outputs/` | delete folder |
| Candidate CI workflow | no CI on candidates | gap | §3 | its own run | delete the workflow file |

Not changed, because they change classifications or figures (isolated for the owner): R2-ALLOC, R2-ASSUME, dead-stock
rule and view, excess definition, route alignment, sample vs population standard deviation (finding F2).

Proposed, not in the candidate (needs the owner's test-status authorisation): branch `proposal/paging-count-20261121`.

## 7. Separate calculation checks (Claude's reference code, not the engine's)

| Check | Dataset | Result |
|---|---|---|
| Item value, available stock, monthly and annual demand, daily demand, safety stock, reorder point (FG and RM, calendar-month BOM usage with scrap), FG/RM/total inventory value | Northstar, commit `dc16902` | **1,103 of 1,103 agree** (tolerance 1e-6 relative) |
| Same, sample s.d. instead of population | Northstar | 350 differ (all s.d., safety stock, ROP) → engine uses population s.d. (finding F2) |
| X1 containment: partial value and coverage, withheld headline, no blank → 0, unaffected items unchanged, ABC recomputed | Northstar with 7 seeded faults | **495 of 495 agree** |
| Willow "POs received short" | willow fixture | 11, agrees with the current snapshot |

Inputs taken from the engine, not recomputed: lead time and lead-time s.d. (covered by `verify.py` section 3).
Not covered by any separate check: MRP shortage quantities, supplier ranking beyond `verify.py`, forecast confidence,
the import route. **Human review still needed:** a person other than the engineer should check, on Northstar,
(a) one FG and one RM safety stock and reorder point by hand, (b) the stock value total, (c) one MRP shortage, and
(d) the ABC table with and without missing costs.

## 8. Repository reconciliations

### 8.1 File counts 730 / 726 / 725
- r2 holds **730** files = **726** application files + 4 files of the temporary test site (`.nojekyll`, `README.md`,
  `SOURCE-MANIFEST.sha256`, top-level `index.html`).
- The X1 commit holds **725** of the 726: `stage3-design/x1-v2-protection/start-tree.sha256` was left out on purpose
  (it lists names and hashes of files in the protected evidence folder). It is a record, not runtime.
- The 726 is not the whole application folder: r2 also left out `tests/logs/` (1,323 historical logs). These are in
  the branches from `eddf09b`, byte-identical to accepted Stage 2. The baseline did not state this scope; it does now
  (this record). The protected evidence folder is in neither.
- Runtime and acceptance evidence: unaffected. All 725 match r2 by SHA-256; r1 and r2 tars and manifests re-verified
  today (730/730 each).

### 8.2 The 11 shared files (line-level diff, `evidence/outputs/shared-files.txt`)

| File | Stage 3 content | X1 content | Separable? |
|---|---|---|---|
| `js/calculations.js` | C-NUM, D5, C-STK/R2-STK `stockB()`, F-A1..A4, N1 guard | NaN containment; **calls and changes `stockB()`** (lines 150, 151, 165); ABC Not Assessed; MRP Not Assessed | **No**: X1 builds on the Stage 3 dead-stock function |
| `js/app.js` | R2-VIEW (line 35) | X1 rewrote line 35 (Not Assessed rows in the dead-stock view) and 17 other places | **No** for line 35; yes elsewhere |
| `js/excel-import.js` | DR-4 | 1 separate hunk | yes |
| `js/import/adapter.js` | D2 scrap | 5 separate hunks | yes |
| `js/import/validate.js` | D2 | 1 separate hunk | yes |
| `tests/accepted-results.json`, `tests/checksums.txt` | Stage 3 entries | X1 entries; X1 re-edited 2 and 4 Stage 3 lines | registry only: re-derivable |
| `tests/snapshots/README.md` | D1 notes | 1 added line | yes |
| `tests/test-import-integrity.js` | D2 expectations | 1 line on a Stage 3 line | mostly |
| `tests/test-stage3-quality.js`, `tests/test-stage3-round2.js` | Stage 3 tests | X1 updated assertions for Not Assessed | no (tests follow both) |

Recommended treatment: keep the files as they are; decide the Stage 3 rules (decision register 1, 2, 5, 6); if the
owner rejects R2-STK or R2-VIEW, rework those lines inside the X1 code rather than reverting files.

### 8.3 Historical test files
Missing: the four v0.6 zips and their tags (`5a376d8`, `61d6c0e`, `7664564`, `f663295`). Searched today again:
uploads, all local folders, GitHub (no other repositories reachable). Past chats show they were made on 9-10 Nov in
the chat "Inventory engine v0.1 build" and **sent to the owner as downloads** (at least the phase 1 final and phase 2
zips). So the owner may hold them. Identification: `tests/PROTECTED-VERSIONS.txt` records the first 24 hex digits of
each zip's SHA-256.

Even with the zips, these six tests compare today's code with v0.6-era code and assert "nothing else changed". Since
then Stage 2, Stage 3 and X1 changed results on purpose, so they would very likely fail as written; and the zips
exclude `.git`, so `phase2-comparison` (needs the git tag) stays blocked. Proposed strategy (owner decision): keep
them BLOCKED/REDUCED with this explanation; if the zips are supplied, verify their hashes, run the tests once, and
record the result as a historical comparison; long term, mark them RETIRED (file kept, reason recorded) because the
golden and confidence snapshots now cover the same ground. Nothing was substituted.

## 9. Candidate CI results
(appended below when the run finishes)

**Note added 22 Nov 2026 (owner decision E-13; the text above is unchanged).** The candidate CI results were never
appended here. They are recorded on branch `audit/scie-20261121-pass2` (`7ecc03e`):
- `stage3-design/audit-20261121/evidence/ci/ci-44952372282-dc16902.log`;
- `ci-44954005216-43b6b55.log`.

Both runs: fast tier 38 tests passed (+ pre-flight) and full tier 53 tests passed (+ pre-flight). FAIL 1 (the Tag-5
guard), BLOCKED 4, REDUCED 2, ERROR 0. The verification of 22 Nov is on `verification/tag6-20261122` (`af8eb6d`).
