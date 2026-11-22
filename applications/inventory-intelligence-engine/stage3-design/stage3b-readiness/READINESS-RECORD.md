# Stage 3B readiness record (22 Nov 2026)

- **Recorded by:** Claude, under the owner's "Stage 3B Readiness — Investigation, Remediation and Verification Authority" (22 Nov 2026, 18:37) and its section 12 (planning).
- **Status:** a new record. No earlier record was rewritten. Amendments to earlier records are dated and appended.

## 1. Starting baseline (pinned before any change)

| Item | Verified value |
|---|---|
| Intended Stage 3B starting branch | `development/v0.7` (the active development line; it advanced to Tag-6 and its records on 22 Nov) |
| **Pinned starting commit** | `6b732549824d09c93aa6c9937b73fa0227df8785` (`6b73254`), the tip of `development/v0.7` at 18:37 |
| Tags | v0.6 `8117c72`; Tag-1 `eb3111f`; Tag-2 `0e461a6`; Tag-3 `9eb578b`; Tag-4 `5f18335`; Tag-5 `f0e81bb`; **Tag-6 `e65600c`** (current baseline) |
| Protected branches | `main` `8117c72`; `release/v0.6` `8117c72`; `x1/accepted-20261121` `a4e05e8`; `recovery/stage3-unaccepted-20261116-19` `0d71aab` |
| Remote | 33 branches and 7 tags, the same as the previous report. No workflow run since 14:00 |
| Last CI on the starting commit | Protected "v0.7 tests" run 45030475462: success (guard against Tag-6 12/12, 0 PENDING; fast tier 40 of 40) |
| Deployment | Last GitHub Pages deployment 10 Nov 2026, from `main` |
| Working tree | Clean |
| **Full tier on `6b73254`** (fresh clone, `run-all.sh --full`) | **55 tests passed (+ pre-flight) of 61; 0 FAIL; 0 ERROR; 4 BLOCKED; 2 REDUCED.** Evidence: `evidence-20261122/start-6b73254-full-tier.txt` |
| Protection check on `6b73254` | `verify-protection.sh 6b73254`: all passed. 11 references; Stage 2, X1 and Tag-6 history present; all 450 Tag-6 protected files at their Tag-6 SHA-256. Evidence: `evidence-20261122/start-6b73254-*.txt` |

**Readiness branch:** `readiness/stage3b-20261122`, created from `6b73254`. It is temporary.

## 2. Problems found, root causes and corrections

| # | Problem | Root cause | Correction | Commit |
|---|---|---|---|---|
| P1 | **307 checks of current behaviour never ran in v0.7.** Affected: the finished-goods production-time caveat (H1, 3 checks), the MAD = 0 forecast note (H2, 5) and supplier eligibility sections A–J (H3, 299) | Each check sits in a test file that also compares with an unavailable v0.6 tree, and the runner blocks the **whole file** when the tree is missing | Hash-pinned subset tests run the protected originals unchanged, minus the comparison lines. A new H2 approval-spec check (9). Fault-planting checks prove each one can fail. All four are in the full tier with exact accepted counts (PENDING) | `d09a631` |
| P2 | Known Limitations entry 19 said the snapshots "cover the same ground" as the blocked tests | Written without checking which behaviours each blocked file uniquely covered | Dated correction appended; the original text kept | `bc75600` |
| P3 | Six historical tests without a final disposition | The v0.6 comparison trees were never pushed to GitHub | Reconstruction attempted and failed (search record kept); comparison parts technically retired; registry unchanged pending the owner's decision (D-1) | `bc75600` (`HISTORICAL-TESTS-DISPOSITION.md`) |
| P4 | The guard labels any status change other than NORMAL→* or REDUCED→BLOCKED as "status improved". Shown on 22 Nov: BLOCKED→"RETIRED" and REDUCED→"SKIPPED" both appear only as PENDING | `check-control.js` line 48 treats unknown status words as an improvement | **Not corrected.** `check-control.js` is a protected control file: any change is a guard FAIL until a new baseline tag, and CI always runs the tag's copy. Mitigation in force: every PENDING line must be reviewed before a tag (`tests/README.md` step 2). Decision D-3 | none |
| P5 | Commit message of `d09a631` says "restore 316 checks"; correct is 307 restored plus 9 new | Wording error | Corrected in `HISTORICAL-TESTS-DISPOSITION.md` §4; the commit was not amended | none |

**Calculation-layer changes:** **none.** No file in `js/` was changed: `git diff 6b73254 <final> -- js/` is empty. No reconciliation is needed. No calculation defect was found that met the "proven wrong" test.

**Interface:** no UI, CSS, navigation or chart change.

**Workflows:** none changed, and no `ci/` branch was created.

## 3. Historical tests: final disposition

See `HISTORICAL-TESTS-DISPOSITION.md`. In short:
- **H1–H4:** BLOCKED entries unchanged. The comparison parts are technically retired.
- **H5 and H6:** REDUCED, 57 of 125 and 110 of 164. The comparison parts are technically retired; their runnable checks continue.
- **Replacement verification:** 307 original checks restored and 9 new checks added, all in the full tier.
- None is described as passed, deleted or reduced.

## 4. Protected assets: how to reproduce the check

Anyone can repeat the check without writing code. In Git Bash on Windows, or any terminal:

```
git clone https://github.com/MB20252025/chain-genius-consulting scie-check
cd scie-check
bash applications/inventory-intelligence-engine/stage3-design/stage3b-readiness/verify-protection.sh
```

The last line is `RESULT: ALL PROTECTION CHECKS PASSED` or `RESULT: n CHECK(S) FAILED`. To check another commit, add its hash, for example `… verify-protection.sh 6b73254`.

It checks:
1. the 11 protected references in `protected-refs-expected.txt`, by full hash;
2. that Stage 2 `eddf09b`, X1 `a4e05e8` and Tag-6 `e65600c` are in the checked commit's history;
3. that every one of the 450 files listed in **Tag-6's own** `checksums.txt` has its Tag-6 SHA-256;
4. which protected files were added after Tag-6.

It only reads. A planted-fault run against Tag-5 (`f0e81bb`) correctly reports FAIL lines.

The full per-file list at the start is in `evidence-20261122/start-6b73254-protected-files-sha256.txt`. All 450 measured hashes equal `checksums.txt`.

**Engineering check, same result:** `node tests/check-protection.js --remote origin` (458 entries after this work) and the Tag-6 guard (`git show v0.7-tests-approved-6:applications/inventory-intelligence-engine/tests/check-control.js > cc6.js`, then from `tests/`: `node cc6.js --dir . --tag v0.7-tests-approved-6 --remote origin`).

## 5. Decision register (owner-level decisions; none is accepted on the owner's behalf)

| ID | Decision | Options | Recommendation | Consequence | Evidence |
|---|---|---|---|---|---|
| D-1 | What should happen to the six historical registry entries (H1–H6) at the next baseline tag? | (a) Keep them as BLOCKED/REDUCED permanently. (b) Remove the four BLOCKED entries and record H5/H6 as NORMAL at their runnable counts (57, 110), with the retirement record as justification. (c) Supply the v0.6 zips and run them once as historical evidence, then (b) | **(b).** Reconstruction failed. Their current-behaviour checks now run as subsets. Their comparisons can never apply to v0.7, which changed outputs on purpose | (a) "4 BLOCKED, 2 REDUCED" is printed for good, which hides any new limitation among them. (b) A clean "0 BLOCKED, 0 REDUCED" full tier; the history stays in logs and records. (c) As (b), plus a one-off historical record, at the cost of finding the zips | `HISTORICAL-TESTS-DISPOSITION.md`; `regression-final-20261109T2300Z.log` |
| D-2 | Accept the readiness test additions into the next baseline? | (a) Accept at the next tag (Tag-7), with the Stage 3B Phase 0 work. (b) Create a small readiness-only tag now. (c) Do not accept; remove them | **(a).** They are already running and passing. A tag only adds protection; it does not change results | (a) Until then they show as 10 PENDING lines; they run and are reported, but are not yet protected against removal. (b) Protected sooner, at the cost of one extra release cycle now. (c) 307 current checks go back to not running | Guard output: 12 passed, 0 failed, 10 PENDING |
| D-3 | Correct the guard so an unknown status word, such as RETIRED or SKIPPED, is a FAIL instead of "status improved"? | (a) Fix it in the next tag's switching cycle (only NORMAL, REDUCED and BLOCKED allowed; any other word FAILS). (b) Leave it; rely on the PENDING review rule | **(a).** It is a small, testable change that closes a mislabel | (a) Needs a protected-file change and a new tag; until then the review rule is the safeguard. (b) A status relabel stays visible only as a PENDING line | P4 above; demonstration on 22 Nov |
| D-4 | Approve the Stage 3B navigation structure? | (a) The six areas plus Settings & Data, as in the blueprint, with Production conditional. (b) The original proposal unchanged. (c) Another structure | **(a).** It merges four overlapping tab pairs and hides Production for distributors | It decides the shell built in Phase 1 | `STAGE3B-BLUEPRINT.md` A–B |
| D-5 | Which chart library? | (a) Chart.js (MIT), vendored. (b) Hand-written SVG only. (c) Apache ECharts. (d) uPlot | **(a)**, behind a thin wrapper | (a) Fastest to build; adds a vendored file of about 200 KB. (b) No dependency but slower to build. (c) Heavier. (d) Line-only strengths | Blueprint F |
| D-6 | Keep the old 17-tab views after Stage 3B? | (a) Retire them in Phase 6, once every fact is reachable. (b) Keep them as an "Advanced" view | **(b)** at first, then decide after real use | (b) More to maintain, but a safe fallback for consultants | Blueprint E and H |
| D-7 | Should Stage 3B include scenario comparison, or leave it to M5? | (a) Recommendations only; scenarios in M5. (b) Include scenarios now | **(a)** | (b) Roughly doubles Phase 5 and mixes in M5 scope | Blueprint B and E |
| D-8 | Do the "master test-data ZIP packages" in your ChatGPT Library include the four v0.6 source zips (`PROTECTED-VERSIONS.txt`)? | Check, or don't check | Check only if D-1 (c) is wanted | If they are found, the original tests can be re-run once as historical evidence | `HISTORICAL-TESTS-DISPOSITION.md` §2 |

## 6. Remaining limitations and risks

- The H1–H6 comparison claims (v0.6 phase isolation) are unverified in v0.7. Original evidence exists for 9 Nov.
- The 10 readiness additions are not protected until a baseline tag accepts them (D-2).
- Guard mislabel P4 (D-3).
- No physical Android test in this exercise. The browser tests are Chrome emulation.
- All verification is Claude's engineering verification, not independent third-party verification.
- The full tier runs in CI only through the candidate-verification workflow, which needs a hand-edited `ci/` branch. That improvement is deferred by the owner; this exercise ran the full tier locally in fresh clones instead.

## 7. Recommendation

The engine baseline is stable. The starting and final full tiers have no FAIL and no ERROR. No calculation changed. Protected assets are verified. Every historical limitation has a documented disposition. There is a blueprint to start from.

**Stage 3B can start with Phase 0 (foundations: view-models, data contract, contract tests),** which needs no visual decisions. Decisions D-4 to D-6 are needed before Phase 1, and D-1 to D-3 at the next baseline tag.

Final-commit verification results are recorded in the readiness report and on the evidence branch `verification/stage3b-readiness-20261122`. They are not in this file: a commit cannot contain the results of a test run on itself.
