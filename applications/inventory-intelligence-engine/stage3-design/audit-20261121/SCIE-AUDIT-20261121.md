# SCIE audit, baseline protection and Stage 3 reconciliation (21 Nov 2026)

Written by Claude under the owner's master authorisation of 21 Nov 2026. This is Claude's own review. It is **not**
independent external verification. Where a status below says "verified", it means re-checked today by Claude from the
commits pushed to GitHub, by re-running the tests or reading the repository; the tests themselves were written by the same
engineering process and have not been reviewed by anyone else.

Nothing in this audit accepts, rejects or reverts Stage 3 work. Recommendations are for the owner.

## 1. Git layout created today (nothing existing was moved, rewritten or deleted)

| Branch (pushed to GitHub) | Commit | Contents | Status |
|---|---|---|---|
| `development/v0.7` (unchanged) | `eddf09b` | accepted Stage 2 | accepted; Tag-5 `f0e81bb` is its ancestor, unchanged |
| `recovery/stage3-unaccepted-20261116-19` | `0d71aab` | Stage 3 work of 16-19 Nov, exactly as at X1 start | **not accepted** |
| `x1/accepted-20261121` | `a4e05e8` | X1 on top of `0d71aab`, equal to baseline r2 (725 of 726 app files) | X1 accepted (delegated); parent not accepted |
| `corrections/x1-20261121` | `11d2944` | paging environment note; 451/452 erratum (new files only) | technical correction |
| `audit/scie-20261121` | this commit | this audit and its appendix | record |
| `candidate/tag6-20261121` | same as the audit branch | the Tag-6 candidate | **blocked**, see §7 |

Verification: every file of the Stage 3 commit matches the X1-start SHA-256 record (0 mismatches, 0 missing); every
file of the X1 commit matches the r2 manifest (725 match, 0 mismatch). Excluded on purpose: `stage3-design/evidence/`
(protected, never read) and `stage3-design/x1-v2-protection/start-tree.sha256` (lists evidence-folder names and hashes;
kept only in the local baseline). Baselines r1 and r2 are unchanged on disk.

**Separation limit.** X1 is built on the Stage 3 code: 11 files were changed by both (Appendix A). X1 cannot be placed
on the accepted Stage 2 commit without re-engineering it, which would change calculation behaviour. So any release that
contains X1 also contains the unaccepted Stage 3 work.

## 2. Full tier of the pushed X1 commit (21 Nov 2026)

Clean worktree of `a4e05e8`, with the Playwright environment in `tests/PLAYWRIGHT-ENVIRONMENT.md`:
**54 tests passed (+ pre-flight), 1 FAIL, 4 BLOCKED, 2 REDUCED, 0 ERROR.**

- FAIL: `check-control` (3 checks: run-all.sh changed, confidence reference added, approved lines re-hashed). This is the
  Tag-5 guard refusing changes that only a new owner-approved tag can approve. Expected, but it is a FAIL, not a PASS.
- BLOCKED: test-fglt-note, test-forecast-conf, test-supplier-eligibility, phase2-comparison (historical trees or tags
  that are not reachable anywhere: commits `5a376d8`, `61d6c0e`, `7664564`, `f663295` were searched for and not found).
- REDUCED: test-phase1 57 of 125, test-uom 110 of 164 (same cause).
- Previously BLOCKED `test-paging-chrome` now PASS 59 (environment correction, no code change).
- X1 tests: foundation 40, containment 41, wp5 56, completion 48, material-integrity 42, acceptance-wording 12,
  browser-x1-chrome 334. Protection 452. Golden v0.5 10, v0.6.0 10, confidence 51. All PASS.
- CI: GitHub Actions did not run on the new branches (the workflow runs on `development/v0.7`). Latest CI: success on
  `eddf09b` (run 43739044445).

## 3. X1 re-audit: the 22 criteria

Statuses: Verified = re-checked today by Claude as described above. Partially verified = some evidence re-checked, some
not, or the evidence is the engineer's own tests only. Not verified. Contradicted.

| # | Criterion (short) | Status | Basis and gaps |
|---|---|---|---|
| 1 | Seven fields, explicit states | Partially verified | Tests pass today; tests are self-authored, no external review |
| 2 | Provenance retained | Partially verified | Same |
| 3 | Generic dependency mechanism | Partially verified | Same |
| 4 | Dependent results withheld | Partially verified | Same; browser 334 passes on desktop Chrome only |
| 5 | Independent results continue | Partially verified | Same |
| 6 | Missing not turned into zero | Partially verified | Same |
| 7 | Recorded zero distinguishable | Partially verified | Same |
| 8 | Invalid values do not propagate | Partially verified | Same |
| 9 | Demand calendar structure kept | Partially verified | Same |
| 10 | Absent history not zero demand | Partially verified | Same |
| 11 | MRP allocation issue no longer stops the run | Partially verified | Same |
| 12 | Affected allocation outputs withheld or marked | Partially verified | Same |
| 13 | Missing cost not misleading totals | Partially verified | Same |
| 14 | Missing on-order not zero | Partially verified | Same |
| 15 | Shared rules on both routes | Partially verified | Same; route differences F-XR1 remain an owner decision |
| 16 | Route differences represented | Partially verified | Same |
| 17 | Reporting explains withheld results | Partially verified | Wording tests pass; **the live test site still serves the wording before the fix** (§6) |
| 18 | X1 tests pass | Verified | All seven X1 tests PASS in today's run of the pushed commit |
| 19 | Unaffected functionality passes regression | Partially verified (contestable) | 54 passed, but `check-control` FAILs, 4 BLOCKED and 2 REDUCED. BLOCKED and REDUCED are not PASS. Acceptable only under the "fails by design" reading |
| 20 | Nothing protected overwritten | Partially verified | 452/452 today; snapshots only added; record quoted 451 (erratum). "Evidence folder never read" is a claim that cannot be proven from the repository |
| 21 | Changes traceable | Verified | Change record CR-01 to CR-35 plus, now, separate Git commits per layer |
| 22 | Decisions and limitations documented | Partially verified | Registers exist; an earlier draft wrongly said "Stage 3 not started" (corrected in r2) |

No criterion was found **contradicted**. The X1 acceptance stands, with criterion 19 the weakest.

Physical Android testing: none by Claude. Android figures in the X1 records come from emulation or the owner.

## 4. Stage 2 closure re-audit (8 conditions)

| # | Condition | Status today |
|---|---|---|
| 1 | K1-K7, E-1, T5 committed and pushed | Verified: all eight cited commits are ancestors of `origin/development/v0.7` |
| 2 | Tag-5 by the owner | Verified: `v0.7-tests-approved-5` -> `f0e81bb` on GitHub |
| 3 | Green CI after the tag | Verified: runs 43680939374 and 43739044445 success |
| 4 | Commit C and its missing content | Partially verified: commits present; content not re-read today |
| 5 | Owner's final acceptance | Partially verified: recorded in the repository; Claude cannot confirm the owner's act itself |
| 6 | DR-1 to DR-7 accepted | Partially verified: recorded as ratified by the owner on 15 Nov |
| 7 | Stage 2 tests at accepted counts | Verified earlier today: 38 tests passed (+ pre-flight), 0 FAIL, on `eddf09b` |
| 8 | Stage 2 functions intact in the current tree | Verified: import-adapter 346, same-results 416, import-integrity 396 PASS on `a4e05e8` |

Open Stage 2 items carried forward (not closure requirements): fast-tier-only CI evidence; 4 BLOCKED + 2 REDUCED; 104
Tag-5 items protected but not functionally validated; false "Allocated exceeds on-hand" warning (fixed only in the
unaccepted Stage 3 work, D5); E-1 golden-snapshot gap; manufacturer-only scope (B14, a Stage 3 gate); fidelity, not
correctness.

## 5. Stage 3 reconciliation (summary; file by file in Appendix A)

| Item | What it does | Recommendation |
|---|---|---|
| D1 permitted snapshot differences | golden files unchanged; 20 listed differences applied in memory | ACCEPT (owner decision D1 A) |
| D2 scrap rules, both routes | unverifiable or invalid scrap refuses | ACCEPT (owner decision D2 A) |
| D3 duplicate PO rows | comparison tool stops inventing a line number | ACCEPT (D3 option 1) |
| D4 partial totals (RG3) | totals become `{value, partial, excludedItems}` | ACCEPT (D4 with safeguards) |
| DR-4 empty text = missing | `excel-import.js` | ACCEPT |
| D5 wording "usable on-hand" | fixes the false Stage 2 warning | ACCEPT |
| C-NUM invalid-number warning | detection only | ACCEPT as detection; X1 now contains the values |
| C-STK / R2-STK dead-stock rule | uncommitted stock basis | **DEFER: owner business rule** |
| R2-VIEW dead-stock view | four quantities | **DEFER: owner's mock-up choice** |
| F-A1..F-A4 new data-quality checks | new warnings | ACCEPT-candidate; owner confirms new user-visible warnings |
| Raised counts, re-hashed lines, run-all.sh, confidence reference | `check-control` PENDING | owner approval through the next approved tag |
| Experiments X1R, X1T, XC, XCT, XCRT | not in the tree | no action (EXPERIMENTAL, not adopted) |

Nothing recommended for REVERT. CORRECT: none needed in code; records corrected by the erratum.

## 6. Live and temporary sites

- Main site (`main`, `release/v0.6`, tag `v0.6` at `8117c72`): untouched.
- Temporary test site `chain-genius-x1-android-test` (commit `cd16dcc`): titled "TEMPORARY TEST … not the live site".
  Its engine files equal the X1 branch, but `js/app.js` and `index.html` are the versions **before** the three wording
  fixes and the version label. Recommendation: keep it until a verified replacement exists; do not delete. No deployment
  was made today.

## 7. Tag-6: not created

Tag-6 would approve the whole tree, including unaccepted Stage 3 work. The register lists owner actions that must come
first: decisions on C-STK/F-STK2, cross-route F-XR1, dead-stock view, excess definition, R2-ALLOC, R2-ASSUME; and approval
of the PENDING `check-control` items. These are owner-reserved. A Tag-6 now would be misleading, so none was created.
`candidate/tag6-20261121` marks the exact commit a Tag-6 would point at once the owner decides.

## 8. Evidence that is independent of the engineer

Only: GitHub's own records (commits, tags, CI runs) and the owner's own actions (Tag-5, repository creation, Pages).
Everything else, including this audit, is Claude's work.
