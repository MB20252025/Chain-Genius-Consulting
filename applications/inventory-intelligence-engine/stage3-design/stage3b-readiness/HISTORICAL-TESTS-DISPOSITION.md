# Historical tests H1–H6: investigation and final disposition

- **Date:** 22 Nov 2026.
- **Recorded by:** Claude, under the owner's authorisation "Stage 3B Readiness — Investigation, Remediation and Verification Authority", section 3.
- **Status:** this is a new, dated record. `DEFERRED-HISTORICAL-TESTS.md`, `KNOWN-LIMITATIONS.md` entry 19 and every earlier record are unchanged. Each one gets a dated pointer to this file.

## 1. What the six tests are

All six were written during **v0.6 development (9 Nov 2026)**. Each made a *change-isolation* claim: "this one v0.6 change did what it should, and **nothing else** changed compared with the previous phase's engine".

To prove that, each test loads a second copy of the engine from an earlier phase's source tree. Those trees lived in four separate local git repositories and zip files of the v0.6 session; `tests/PROTECTED-VERSIONS.txt` lists their commits and zip hashes. They were never pushed to GitHub.

The original evidence survives:
- `tests/logs/regression-final-20261109T2300Z.log` (v0.6 final, 9 Nov 23:00) records all of them passing in full while the trees existed:
  - test-fglt-note: 105 checks;
  - test-forecast-conf: 206;
  - test-supplier-eligibility: 301;
  - test-phase1: 101 at that time;
  - test-uom: 164.
- The intermediate logs `regression-20261109T*.log` and `regression-p3*.log` hold earlier runs.

**None of the six has ever run in full against v0.7 code.** The first v0.7 full run (T1, `tests/logs/t1/full-pinned.log`) already shows them BLOCKED or REDUCED.

## 2. Reconstruction attempts (22 Nov 2026)

| Searched | Result |
|---|---|
| The four recorded commits (`5a376d8…`, `61d6c0e…`, `7664564…`, `f663295…`) in this repository's object store: all 33 branches and 7 tags fetched | **Absent.** They belong to the separate v0.6 repositories |
| Tags `c4-base`, `v0.6-candidate-3`, `v0.6-candidate-4-phase1`, `v0.6-candidate-4-phase1-final`, `v0.6-candidate-4-phase2` on GitHub | **Absent.** Only v0.6 and Tag-1 to Tag-6 exist |
| Every file ever committed (`git log --all --name-only`), looking for zips or candidate trees | One zip: `inventory-intelligence-engine.zip`, added in `2230d27` and deleted in `1ea2849` (5 Nov). It is the **v0.5 original**: SHA-256 `4893f360…`, 9 entries. It matches **none** of the four protected candidate-zip hashes, so it is not any missing tree |
| Engine file history in this repository | `calculations.js` goes from `fb9e8e5` (5 Nov) straight to `355dec0` (10 Nov, v0.6 final upload). No intermediate candidate commits exist |
| Session filesystem, all of `/` (excluding `/proc`), for `*c4-phase*`, `*candidate-4*`, `*candidate-3*`, `p3tree*` | Only copies of one performance log (`perf-c4-phase1-…log`). No source trees |
| `/mnt/user-data/uploads` and `/mnt/user-data/outputs` | Text attachments and two XML files; outputs empty. No zips |
| `tests/logs/` (810 files) and earlier verification records | Pass records only (§1). Logs are not source code |
| Not searchable from here | The owner's own devices and his ChatGPT Library. The project record says master test-data ZIP packages are kept there; those are test data, so the v0.6 *source* zips may or may not be among them |

**Conclusion:** the comparison trees cannot be reconstructed from any material available to this session.

Rebuilding them from the v0.6 final code is not a valid substitute. It would compare the engine with a different version from the one each test names, which changes what the test proves. So no tree was regenerated, and no newly generated evidence has been put in place of the original.

## 3. Disposition of each test

**Common points:**
- "Technically retired" means: the **historical-comparison part** is taken out of the active testing process. Its original pass evidence (§1) stands, but it is no longer expected to run, and no future plan relies on it.
- The registry entries stay **unchanged**: still BLOCKED or REDUCED, with the same counts. The guard treats removing an approved entry as weakening (FAIL). Removing them, or re-labelling them RETIRED, therefore needs the owner's approval at the next baseline tag (decision register D-1).
- Until then the runner keeps printing BLOCKED and REDUCED. This file is their documented disposition.

| Ref | Test | Missing | What it originally proved | Disposition (22 Nov 2026) | Replacement verification of current behaviour | Effect on Stage 3B |
|---|---|---|---|---|---|---|
| H1 | `test-fglt-note` | v0.6 Phase 2 source tree (`inventory-intelligence-engine-c4-phase2` zip) | Phase 3 item 4: the finished-goods fixed-production-time caveat was added, and every calculated value and screen was otherwise identical to Phase 2 (C0–C3) | Comparison part C0–C3 technically retired. Its three absolute checks N1–N3 were **restored** | **NEW `test-h1-fglt-note-current` (3 checks):** the protected original's N1–N3 run unchanged. The caveat is shown on the Reorder policy, Finished goods and Settings screens. Before this, **no running test checked the caveat** | None. The caveat is now covered. Stage 3B must keep showing it (blueprint, acceptance criteria) |
| H2 | `test-forecast-conf` | v0.6 Phase 3 tree (zip named in `p3tree.txt`) | Phase 3B item E: a run of two or more consecutive extreme months lowers forecast confidence by exactly one level, and nothing else changes compared with Phase 3, over 44 patterns and all fixtures. Also: the MAD = 0 informational note | Comparison part technically retired. MAD = 0 checks **restored**. Approval-spec cases **replaced** with new absolute checks | **NEW `test-h2-forecast-conf-current` (5 checks):** original lines 36 and 38–41 run unchanged; the MAD = 0 note is set, says it does not change confidence, and appears on the tab and in the export. Previously **no running test** covered it. **NEW `test-h2-level-shift-spec` (9 checks):** new checks of the *current* engine against the absolute levels in the approval (Medium, Medium, Medium, Low, High) and the level-shift wording. **Existing:** the v0.7 confidence snapshot pins confidence on every fixture, including 16 level-shift explanations | Low. **Not re-verified:** that the current levels are exactly one level below Phase 3 for all 44 synthetic patterns. A confidence change would still be caught by the snapshot (fixtures) and the spec checks (synthetic) |
| H3 | `test-supplier-eligibility` | v0.6 Phase 3 tree | Supplier metric-specific eligibility and the exact "Not Assessed — Insufficient Evidence" state (sections A–J, absolute), plus K1–K2: Northstar supplier results identical to Phase 3 | K1–K2 technically retired. Sections A–J **restored** | **NEW `test-h3-supplier-eligibility-current` (299 checks):** every original check except K1–K2 runs unchanged. These 299 checks had never run in v0.7 | None. Supplier eligibility, the Suppliers screen and the export are covered again. Northstar supplier values are also pinned by the golden snapshots |
| H4 | `phase2-comparison` (`run-regression.sh`) | tags `c4-base` and `v0.6-candidate-4-phase2` (local v0.6 repository only) | Whole-engine output identical between Phase 2 and the candidate, apart from listed changes | Technically retired. No absolute part exists | **Existing:** golden snapshots v0.5 and v0.6.0 (5 zones, 20 enumerated permitted differences) compare the whole engine output with v0.6.0 on every run | None |
| H5 | `test-phase1` | tag `c4-base`, for item 1e | Items 1a–1d and 2 onward (absolute; still run: 57 checks), plus 1e: every tab renders identically to candidate 3, apart from the Phase 3 note | Item 1e technically retired. The 57 runnable checks continue unchanged | **Existing:** the 57 checks; the browser render tests (browser-chrome 53, browser-x1-chrome 334); the golden snapshots | None. Stage 3B will change rendering on purpose; 1e could never apply after that anyway |
| H6 | `test-uom` | tag `v0.6-candidate-4-phase1-final`, for the comparison with Phase 1 final | The unit-of-measure rules (absolute; still run: 110 checks, including the accepted U5 blank-unit rule), plus results identical to Phase 1 final | Comparison part technically retired. The 110 runnable checks continue unchanged | **Existing:** the 110 checks; import-adapter 346; same-results 416 | None |

**All six remain visible.** They have not been deleted, their recorded counts have not been reduced, and none is described as passed.

**Re-opening.** If the original zips are ever supplied (`PROTECTED-VERSIONS.txt` gives their hashes), the original tests can still be run as they are: the runner checks the same blocker paths. The result would be recorded as new historical evidence. It would not be a v0.7 regression test, because v0.7 deliberately changed outputs that those comparisons expect to be identical.

## 4. How the subset tests work, and why they do not change what the originals prove

`tests/historical-subset.js` does three things.
1. **Checks the original file.** It reads the protected original and requires its SHA-256 to match **both** a pinned value **and** its `checksums.txt` line. Any edit to the original stops the subset with a FAIL.
2. **Removes only the listed comparison lines.** It removes only the listed historical-comparison lines. Each line must start with the expected text, and the number of `ok(` calls removed must equal the expected number. The only text replacements are the removal of the old-engine load and old-engine calls, and each must occur exactly once.
3. **Runs the rest unchanged.** It compiles what remains at the original file's own path, so fixtures resolve exactly as they did.

`test-h2-level-shift-spec` is different: it is **new evidence**. It reuses only H2's data generator (lines 1–17, unchanged) and adds 9 new checks written on 22 Nov 2026. Its header says this.

**Fault-planting checks (22 Nov 2026, scratch copies, nothing committed)** — each subset was shown to fail when the behaviour it tests is broken:

| Fault planted | Result |
|---|---|
| Caveat text changed | H1 subset failed 1 of 3 |
| "Not Assessed — Insufficient Evidence" wording changed | H3 subset failed 20 of 299 |
| One line appended to the protected original | H3 subset refused to run (hash mismatch) |
| MAD = 0 note text changed | H2 subset failed 3 of 5 |
| Level-shift one-point reduction removed from `forecasting.js` | H2 spec test failed 3 of 9 |

**Counts:**
- 307 original checks are restored (3 + 5 + 299), and 9 new checks are added: **316 in total**.
- The commit message of `d09a631` says "restore 316 current-engine checks". The accurate wording is "restore 307 original checks and add 9 new ones". This record corrects it; the commit was not amended.

**Registry and checksums:**
- Each of the four tests is in the full tier, runs in two time zones and has an exact accepted count: 3, 5, 9 and 299.
- The five new files have `checksums.txt` lines, and the `check-protection` count rises from 453 to 458.
- The guard (Tag-6) reports all of these as **PENDING additions**: 12 passed, 0 failed. They are not part of an approved baseline until the owner accepts them at the next baseline tag (decision register D-2).
