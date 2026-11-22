# v0.7 test record

The running record for v0.7 testing. It follows the approved v0.7 Testing Framework (approved by the owner on 11 Nov 2026). The A1 records (`A1-*.md`) are kept unchanged as history.

## Purpose

To establish a reliable testing framework around the existing engine, so that any change that breaks something which previously worked is detected, and so that known limitations stay visible instead of looking like full coverage. The framework does not change engine functionality.

## Statuses

Statuses are counted per test, with time zones folded in: a test passes only if every time zone passes.

| Status | Meaning |
|---|---|
| **PASS** | The test ran, every check passed, and its count **equals** the accepted count. |
| **FAIL** | The test ran and at least one check failed, **or** its count differs from the accepted count in either direction, **or** it ran at a reduced count without its documented reason. |
| **BLOCKED** | The test cannot run because of a known, documented blocker that is listed in `accepted-results.json`, and that blocker is still present. |
| **REDUCED** | The test ran with every check passing, but without its full coverage. Its count equals the accepted reduced figure, **and** its documented reason is confirmed: the environment variable named in `reduced_condition` is unset, and the skip message, where one is recorded, is printed. |
| **ERROR** | The test could not run correctly. This covers: a crash, a timeout, a missing summary, a summary saying 0 failed with a non-zero exit, a missing test file (even for a BLOCKED test), a missing prerequisite or a wrong package version that is not an accepted blocker, or a protected remote that cannot be read. |

**Counts are exact (correction R2).** A count above the accepted figure is a FAIL until `accepted-results.json` is raised in a commit, and that raise shows as PENDING until the owner approves it. Otherwise a later silent skip back down to the old figure would go unnoticed.

A blocker that is no longer present produces a **WARNING**, and the test then runs and is judged normally.

## Control files and the approved baseline (correction R1)

**Control files:**
- `run-all.sh`, `check-protection.js`, `check-control.js`, `test-a1-wrapper-quick.js`, `package.json`, `package-lock.json` and `requirements.txt` must be byte-identical to the approved baseline.
- `accepted-results.json` and `checksums.txt` may grow but not weaken.

**The approved baseline** is the git tag `v0.7-tests-approved-1`, then `-2` and so on. It is created or moved only on the owner's instruction, and only for a commit on `development/v0.7`.

**How it is enforced:**
- `run-all.sh` runs `check-control.js` **as it is in the tag**, so an edited working copy cannot judge itself.
- **Weakening is a FAIL:** a removed test; a lowered count; a new BLOCKED or REDUCED entry; a changed file, label, blocker or reduced-coverage condition; a dropped tier, time zone or scenario; a removed or changed protected line; any change to a byte-identical control file.
- **Growth is allowed but shown as PENDING** until the tag is moved: new tests, raised counts, cleared limitations, new protected lines.
- A tag that exists only locally, or that differs from GitHub's, is a FAIL.

**Until the owner approves T1 the tag does not exist,** so `check-control` is BLOCKED. That is an accepted, listed blocker, and the commit that creates the tag removes the entry.

**Residual risk:**
- An edited `run-all.sh` could skip the guard or misreport its own exit code. The guard reports the edit only when it runs, so T2 should call the approved `check-control.js` directly.
- Someone with push rights could move the tag. The owner is the only one with push rights.

## Exit-code policy

- **Exit 0:** no FAIL and no ERROR. Accepted BLOCKED and REDUCED items are allowed and are always listed. The summary then says "this is NOT full coverage".
- **Exit 1:** at least one FAIL or ERROR. The summary names each one.

Every run prints these lines first:

```
v0.7 tests (FAST|FULL) - green means no NEW failures, NOT full coverage
PASS: n | FAIL: n | BLOCKED: n | REDUCED: n | ERROR: n
Scope: ...
```

## Commands

Run these from the application folder, with `NODE_PATH` pointing to the pinned test packages.

- **Install the packages OUTSIDE the repository (correction R11).** Never run `npm ci` inside `tests/`. It would create `tests/node_modules`, and the repository has no `.gitignore`, so it could be committed by accident.
  ```
  mkdir -p ~/cg-testdeps && cp tests/package.json tests/package-lock.json ~/cg-testdeps/
  (cd ~/cg-testdeps && npm ci) && export NODE_PATH=~/cg-testdeps/node_modules
  python3 -m venv ~/cg-pyvenv && ~/cg-pyvenv/bin/pip install -r tests/requirements.txt && export PATH=~/cg-pyvenv/bin:$PATH
  ```
- **Recorded environment:** Node v22.23.4, npm 10.9.9, Python 3.13.18, and the package versions in `accepted-results.json` → `environment`. The pre-flight prints the environment on every run.
  - A package version that differs from the record is ERROR.
  - A different Node, npm or Python version is a WARNING.
  - Verified 11 Nov 2026: `npm ci` from the lockfile, and a clean Python virtual environment from `requirements.txt` (`tests/logs/t1/r-env-proof.txt`).
- **Fast tier (every commit):** `bash tests/run-all.sh --fast`
  - 17 tests plus the pre-flight, UTC only, using the quick 100-call wrapper.
  - Measured: about 30–50 s.
- **Full tier (checkpoints, pre-release):** `bash tests/run-all.sh --full`
  - 37 tests: the Node suites in 2 time zones, the golden snapshots in 5, and the **full 1,000-call wrapper**.
  - Measured: about 7 min (see the run entries).
- **Optional `--remote <name or URL>`:** the remote checked by `check-protection` and `check-control`. The default is `origin`.
- **Keep every command's output:** add `--log <file>` to either command.
- **Protection check alone:** `node tests/check-protection.js [--remote <name or URL>]`.
- **Control guard alone:** `node tests/check-control.js --dir tests [--tag v0.7-tests-approved-1] [--remote origin]`.
- **The existing runners are unchanged:** `run-regression.sh` and `run-a1.sh`.

## Accepted counts

The source of truth is `tests/accepted-results.json`, verified at reference commit `40d35598feed5ded9d6cb52f8508ceb070c3cfbb`. The figures match the A1 record.

- **test-a1-wrapper.js: 117** checks. This is the full 1,000-call test, unchanged, and runs in the full tier only.
- **test-a1-wrapper-quick.js: 117** checks. This is the separate 100-call copy, and runs in the fast tier only.
- **test7: 118** checks. This is a separate suite; 118 since D4 (`27d6313`).
- **The other suites:** test8 47, test9 57, domtest 30, domtest2 18, test-failed-import 18, test-export-nohistory 19, test-timezones 15, test-po-edge 35, test-structure 34, test-paging 23, test-fillcap 276, test-export-repeat 24, test-cache 15, test-blank-qty 19, test-missing-values 63, test-na-constraints 88.
- **A1 suites:** static 20, sync-path 74, state 10, escaping 46.
- **Other checks:** check-globals 116; golden v0.5 and v0.6.0 10 sections each; Python verifier 17; scenarios 16; browser-chrome 53.
- **check-protection: 127.** That is 3 references and 124 files. It was 40 in the first T1 pass; the owner widened the scope (R5) on 11 Nov 2026.
- **check-control: 9.** BLOCKED until the approved tag exists.

**Protected scope (R5):**
- Every file in `tests/` tracked at `40d3559`. That is the frozen v0.6 test net: suites, verifiers, helpers, v0.6 records, A1 records and `tools/`.
- The snapshot README, the 2 golden snapshots, and the 17 fixture workbooks with their 17 JSON outputs.
- **Not protected by checksum:**
  - `package.json`, which is guarded by check-control instead.
  - The living v0.7 records `V07-PERF-BASELINE.md` and `V07-PREVIEW-LOG.md`.
  - `logs/`, `results/` and the stray `A` files.

## Known BLOCKED and REDUCED tests

| Test | Status | Detail |
|---|---|---|
| test-fglt-note | BLOCKED | D5 #1: needs the Phase 2 source tree (historical zip) |
| test-forecast-conf | BLOCKED | D5 #2: needs the Phase 3 tree. Its gap is to be compensated by T3 (not yet authorised) |
| test-supplier-eligibility | BLOCKED | D5 #3: needs the Phase 3 tree |
| phase2-comparison | BLOCKED | D5 #4: needs git tag `v0.6-candidate-4-phase2` |
| test-paging-chrome | BLOCKED | D5 #5 / D3: Playwright's browser is not installed |
| check-control | BLOCKED | R1 guard: the approved tag `v0.7-tests-approved-1` does not exist until the owner approves T1 |
| test-phase1 | REDUCED | 57 of 125 run; 68 need C3_TREE. Reason checked: C3_TREE unset and "(C3_TREE not set" printed |
| test-uom | REDUCED | 110 of 164 run; 54 need P1_TREE. Reason checked: P1_TREE unset (the test prints no skip message) |

**122 checks are not running.** They are not restored, and nothing replaces them. They stay REDUCED until the historical trees are recovered and a full run shows 125 and 164, separately verified and approved.

## Cadence

| Level | Runs | Status |
|---|---|---|
| Every commit | `run-all.sh --fast` | Runs locally. Running it automatically on GitHub (T2) is **not yet authorised** |
| Development checkpoint | `run-all.sh --full`, plus the Android core set and changed tabs | In use |
| Before release | Full tier, the 5,000-item performance baseline (`V07-PERF-BASELINE.md`) and the full Android checklist | In use |
| Weekly | — | DEFERRED |

## Evidence required for each run entry

- Date, commit, command, tier and environment (Node and package versions).
- The summary line, every non-PASS line and the exit code.
- The evidence path: a `--log` file, or summaries stored under `tests/logs/`.

**Each failure entry also records:**
- the ID and the symptom;
- the classification: application, test or environment;
- the root cause and the fix commit;
- the regression test added.

## Acceptance of a completed test run

A run is an **accepted result** only when all four hold:

1. It came from a named commit, by a recorded command, in a recorded environment.
2. Every test is PASS, or is BLOCKED or REDUCED as listed above, with its missing coverage stated in numbers.
3. Its evidence is stored in the repository.
4. The owner has approved it in writing.

It then becomes the reference and is never edited; a change needs a new dated reference.

## Automated checks versus physical Android testing

- `browser-chrome.js` uses headless Chrome with **Pixel 5 emulation**. That is automated emulation, **not** physical Android testing.
- Physical testing is done only by the owner, on his phone, against a named preview commit, using `V07-ANDROID-CHECKLIST.md`.
- **D2 remains OPEN.** The full physical checklist has not been done yet. The owner's preview check of 11 Nov (`V07-PREVIEW-LOG.md`) confirmed deployment and initial loading only.

## A2 settings validation (recorded, not implemented)

The A2 requirements stay in `A1-SETTINGS-VALIDATION.md`, including the nine examples accepted today. A2 is not authorised. If A2 adds screens, they are added to the Android checklist; if it adds none, the core set is enough for that stage.

---

## Run entries

### 11 Nov 2026 — T1 implementation (uncommitted working tree on `development/v0.7` at `40d3559`)

Environment: Node 22.23.4, npm 10.9.9, Python 3.13.18. Evidence: `tests/logs/t1/`.

| # | Run | Command | Result | Exit |
|---|---|---|---|---|
| 1 | Full, original packages (`/home/claude/testdeps`) | `NODE_PATH=…/testdeps/node_modules bash tests/run-all.sh --full --log …` | PASS 30, FAIL 0, BLOCKED 5, REDUCED 2, ERROR 0; 428 s | 0 |
| 2 | Full, pinned packages (`npm ci` from `tests/package-lock.json`) | `NODE_PATH=…/pindeps/node_modules bash tests/run-all.sh --full --log …` | Identical status and count on all 37 rows to run 1; 423 s | 0 |
| 3 | Fast, pinned | `bash tests/run-all.sh --fast` | PASS 17 (16 tests + pre-flight), all at accepted counts; 30 s | 0 |
| D1 | Broken assertion (disposable copy: one condition in test-cache.js inverted) | `bash tests/run-all.sh --fast` | test-cache FAIL, 14 of 15, with its FAIL line shown | 1 |
| D2 | Removed check (disposable copy: one check deleted from test-po-edge.js) | `bash tests/run-all.sh --fast` | test-po-edge FAIL: "COUNT DROPPED: expected 35, actual 34" | 1 |
| D3 | Missing prerequisite not on the accepted list (disposable copy: compare-snapshots.js deleted) | `bash tests/run-all.sh --fast` | golden v0.5 and v0.6.0 ERROR ("Cannot find module"), not BLOCKED | 1 |
| P1 | Altered protected file (disposable copy: one byte appended to a fixture JSON) | `node check-protection.js`, then `run-all.sh --fast` | FAIL naming the file and both hashes; runner FAIL | 1 |
| P2 | Moved protected reference (local stand-in remote; GitHub untouched) | `node check-protection.js --remote /tmp/fake-remote.git` | Control 40/40 exit 0; after moving the stand-in `main` to `40d3559`: FAIL on `refs/heads/main` | 1 |
| P3 | Unreachable remote | `node check-protection.js --remote /tmp/does-not-exist.git` | ERROR, no summary, exit 2, which the runner reports as ERROR | 2 |

Disposable copies were deleted after the demonstrations; the working tree contains no planted fault. Protected references were still at `8117c72` after the runs, and the snapshot SHA-256 values were unchanged (`7f38bc56…`).

### Physical Android tests

None recorded yet. D2 is open.

### 11 Nov 2026 — T1 correction pass (owner's review: R1, R2, R3, R4, R5, R9/R10, R11, R12, R13)

Still uncommitted on `development/v0.7` at `40d3559`. Evidence: `tests/logs/t1/r-*` and `tests/logs/t1/r-demos/`. The first-pass evidence above is kept unchanged.

**Changes**
- **R1:** new `check-control.js`, run by the runner from the approved tag. The tag does not exist yet, so the guard is BLOCKED.
- **R2:** counts are exact in both directions.
- **R3:** a missing test file is ERROR, even when the test is blocked.
- **R4:** REDUCED requires its documented reason.
- **R5:** `checksums.txt` now covers 124 files, with hashes taken from commit `40d3559` itself.
- **R9/R10:** the environment is recorded in `accepted-results.json` and checked by the pre-flight. Python was verified in a clean virtual environment.
- **R11:** install commands moved outside the repository.
- **R12:** the fifth core item removed from the Android checklist.
- **R13:** missing-package demonstration added.

| # | Run | Result | Exit |
|---|---|---|---|
| F | Full: final runner, pinned Node packages, clean Python venv (`r-full-final.txt`, `.log`) | PASS 30, FAIL 0, BLOCKED 6, REDUCED 2, ERROR 0; 506 s. Against first-pass `full-pinned.txt`, the only differences are check-protection 40 → 127 (R5) and the new check-control row, BLOCKED (`r-compare-with-first-pass.txt`) | 0 |
| Q | Fast, final (`r-fast-final.txt`) | PASS 17, BLOCKED 1 (check-control); 39 s | 0 |
| E | Environment (`r-env-proof.txt`) | Node v22.23.4, npm 10.9.9, the six Node packages at their pinned versions; Python 3.13.18 venv from `requirements.txt` holding exactly the six pinned packages | — |

A preliminary full run with the same runner (exit 0, 534 s, the same statuses and counts) was made before a one-field edit to `accepted-results.json` (adding `file` to phase2-comparison). Its output files were overwritten by run F and are not preserved.

**Demonstrations** (`r-demos/`). Each ran in its own disposable copy at a demo-only commit in which the approved tag was simulated on a local stand-in remote. Each file records the copy path, the planted diff, the command, the output, the exit code and that the copy was deleted.

| Demo | Planted | Result | Exit |
|---|---|---|---|
| 00-control | nothing | 18 PASS including check-control 9/9 | 0 |
| D1 | inverted assertion (test-cache) | test-cache FAIL 14/15; check-protection FAIL (protected file) | 1 |
| D2 | check removed (test-po-edge) | FAIL "COUNT DROPPED 35 → 34"; check-protection FAIL | 1 |
| D3 | helper deleted (compare-snapshots.js) | golden ERROR ×2, not BLOCKED; check-protection FAIL | 1 |
| D4 | acorn missing from NODE_PATH (R13) | pre-flight ERROR naming acorn; 4 suites ERROR | 1 |
| D5 | xlsx labelled 0.18.4 (R9) | pre-flight ERROR "xlsx 0.18.4 (recorded 0.18.5)" | 1 |
| R1a | test7 accepted count lowered 118 → 117 | check-control FAIL "LOWERED"; test7 FAIL "count above accepted" | 1 |
| R1b | test-cache marked REDUCED | check-control FAIL "status weakened"; test-cache FAIL "no documented reason" | 1 |
| R1c | protected line removed from checksums.txt | check-control FAIL; check-protection FAIL "COUNT DROPPED 127 → 126" | 1 |
| R1d | runner edited to always exit 0 | check-control row FAIL, but the edited runner exits 0. This is the **residual risk** | 0 |
| R1d-direct | same edit; approved guard run directly | check-control FAIL naming run-all.sh | 1 |
| R1e | approved tag only local | check-control FAIL "a local tag is not an approval" | 1 |
| R2a-v2 | one check added to test7, count not updated | test7 FAIL "COUNT ABOVE ACCEPTED 118 → 119" | 1 |
| R2b-v2 | check added and count raised to 119 | test7 PASS 119; check-control PASS with PENDING warning; exit 1 only because test7.js is a protected file | 1 |
| R3 | blocked test file deleted | test-fglt-note ERROR "file MISSING", not BLOCKED | 1 |
| R4 | test-phase1 skip message removed | test-phase1 FAIL "REDUCED count without its documented reason" | 1 |
| P1 | one byte added to A1-TEST-RECORD.md (R5 scope) | check-protection FAIL naming the file | 1 |
| P2 | stand-in `main` moved to 40d3559 | check-protection FAIL on refs/heads/main | 1 |
| P3 | unreachable remote | check-protection ERROR and check-control ERROR | 1 |

**Superseded attempts, kept:**
- `R2a-count-rise.SUPERSEDED…` and `R2b-approved-growth.SUPERSEDED…`: the planted check did not apply, because test7 uses `chk(`, not `ok(`. They were redone as v2.
- `R1d-direct….FIRST-ATTEMPT-wrong-exit-capture`: it recorded an echo's exit code instead of node's.

---

## Mandatory T2 requirements (owner, T1 approval, 11 Nov 2026)

1. **Guard enforcement.**
   - `check-control` stays **STAGED (BLOCKED until T2)** in `accepted-results.json`.
   - T2 must invoke `check-control.js`, the approved tag's copy, **before any other test or runner activity**.
   - T2's acceptance criteria must demonstrate that an edited runner is caught by the guard **before the runner executes**.
   - The guard is not treated as fully operational until this is demonstrated.
   - Until then, `run-all.sh` runs the guard as an ordinary row, because the approved tag now exists. That is the owner's decision.
2. **Append-only records.**
   - Test records and evidence logs must be append-only.
   - Every execution gets a unique run ID and its own timestamped directory under `tests/logs/`.
   - No run may overwrite another run's output. Superseded runs stay preserved and are referenced by their IDs.
   - The current T1 record is accepted as it stands; this applies from T2 onwards.
3. **Demonstration quality.**
   - Each demonstration must be verified in a controlled run before it is accepted into the evidence record.
   - A failed demonstration is marked **INVALID**, its evidence is preserved, the issue is corrected and a new demonstration is run.
   - Initial attempts are clearly distinguished from valid demonstrations.

**Authorship (owner decision, 11 Nov 2026):** commits keep the existing repository identity `MB20252025`, with no Co-Authored-By line unless the owner authorises one.

---

## T2 — GitHub Actions workflow (11 Nov 2026)

Workflow: `.github/workflows/v07-tests.yml`. It runs on every push to `development/v0.7`. The `paths-ignore` list skips commits that change only `tests/logs/**` or `tests/V07-TEST-RECORD.md`; the entries are written as repository-root paths. Steps run in this order: checkout → **guard** (`check-control.js` from tag `v0.7-tests-approved-1`) → Node → pinned packages → `run-all.sh --fast` → honest summary (`tests/summarise-run.js`) → evidence artifact. If the guard fails, the job stops.

| Event | Commit | GitHub run | Result |
|---|---|---|---|
| Workflow added | 7d37acf | 43095658340 | Stuck at GitHub (queued, 0 jobs). Cancel refused with HTTP 409. Kept as evidence |
| Single authorised retry (evidence-only commit) | 399c627 | 43099063927 | success; guard first |
| Fix 1: paths-ignore | f3ea28a | 43102251435 | success; guard first |
| Evidence-only commits | fc62b59, 28a5218, 5d31652 | none | Latest run ID unchanged 60 s after each push |
| Fix 2 part 1, mixed commit (summarise-run.js + evidence) | 272c7f4 | 43102755252 | success; guard first; waited about 11 min for a runner |
| Fix 2 part 2: workflow summary | 0228528 | 43106057363 | success; `FAST: PASS 18 \| FAIL 0 \| ERROR 0 · Full tier (recorded in accepted-results.json): BLOCKED 6 \| REDUCED 2` |
| **Fix 3: intentional altered-runner demonstration** | cd37a8a | 43110161774 | **failure**: guard FAIL `run-all.sh: CHANGED`; steps 2–4 skipped; no tests run |
| Restore by `git revert` | a5ca366 | 43110459273 | success; guard first; run-all.sh SHA-256 matches the tag (`5cce88ba…`) |

Local full run with the formatter: `FULL: PASS 31 | FAIL 0 | BLOCKED 5 | REDUCED 2 | ERROR 0`. check-control is recorded BLOCKED (STAGED) but now runs and passes, so the observed BLOCKED count is 5 while the recorded count is 6. The summary states this difference.

Incident (my error): an over-broad pattern moved ten tracked screenshot folders out of the repository. They were restored byte-identical and never committed (`tests/logs/t2/t2-20261111T214643Z-incident-screens-glob/`).

Evidence: `tests/logs/t2/` (one folder per run ID, append-only). The first opening-check run is marked INVALID.

---

## T2.1 — Final protection hardening (11–12 Nov 2026)

**Status: PARTIALLY COMPLETE.** On GitHub Free, nothing can enforce the presence of the workflow guard against someone with push access. See `tests/README.md` §6.

**Change:** commit 0e461a6. The guard now also protects `summarise-run.js` and `.github/workflows/v07-tests.yml` (11 checks). Its baseline is tag `v0.7-tests-approved-2` (created by the owner, pointing to 0e461a6).

**Rulesets** (owner, all active, no bypass):
- S1: tags, restrict updates and deletions.
- S2: `development/v0.7`, restrict deletions and block force pushes. Live-tested: GH013 rejection.
- S3: `main` and `release/v0.6`, restrict deletions and block force pushes.

**Tests:**
- Test A, formatter tampering: e373e4e → run 43128815957 FAIL; revert e58974a → run 43128885652 PASS.
- Test B, workflow tampering: e2b8cd7 → run 43129216325 FAIL; revert 96980fd → run 43129281435 PASS.

**T2 regression:** confirmed. Full tier: PASS 31, BLOCKED 5, REDUCED 2. The evidence-only commit started no run, and the README commit started one.

**Evidence:** `tests/logs/t2/T21-EVIDENCE-INDEX.md`.

### T2.1 closure note (12 Nov 2026): CLOSED as PARTIALLY COMPLETE, accepted by the owner

- **Limitation (accepted):** on GitHub Free, nothing can enforce the presence of the workflow guard against someone with push access to `development/v0.7`. See `tests/README.md` §6.
- **Guard status still recorded as STAGED; the change is deferred.**
  - `check-control` still reads STAGED (BLOCKED until T2) in `accepted-results.json`. The change to ACTIVE is deferred to T3's first commit, which needs a new approved baseline tag anyway.
  - As a result, the fast-tier summary reports the recorded full-tier figure **BLOCKED 6**, while the full-tier local result reports **BLOCKED 5**, because check-control now runs and passes.
  - This is a known reporting inconsistency, not a test failure. **The correct blocked count for the current full-tier result is 5.**
- **Commit authorship:**
  - From the T1 commit `eb3111f` onwards, commits carry no `Co-Authored-By` trailer. This follows the owner's T1 approval instruction: no trailer for Claude without explicit authorisation.
  - The 22 earlier commits (up to `40d3559`) carried one.
  - Existing commits are not rewritten.
- **S3:** Restrict updates OFF (owner design). Ordinary merges to `main` are allowed with S3 active. The temporary disable window applies only to a separately authorised operation that S3 blocks. README §5 was corrected in commit `c9b220d`.
- **Evidence:** `tests/logs/t2/T21-EVIDENCE-INDEX.md`, including its closure addendum.

---

## T3 — confidence snapshot and guard ACTIVE (12 Nov 2026)

- **New snapshot:** `tests/snapshots/v0.7-confidence-20261112T011814Z.json`, 582,470 bytes, SHA-256 `4cf73b07…`. It covers 17 fixtures × 3 sections (forecast confidence, confAreas, client questions). It is identical in all 5 zones, and contains no timestamps or environment data.
- **Runner:** test type `confsnap`, with accepted count 51 per zone. Fast tier UTC; full tier 5 zones.
- **Guard:** `check-control` protects 12 files (the snapshot is the 12th). Baseline tag `v0.7-tests-approved-3`.
- **Records:** `check-control` is now recorded ACTIVE, so the recorded full tier is BLOCKED 5 and REDUCED 2, and the fast-tier summary reports BLOCKED 5. This resolves the T2.1 reporting inconsistency.
- **Evidence:** `tests/logs/t3/`. Results are appended below as they are verified.

### T3 results (12 Nov 2026, appended at evidence packaging; the entries above are unchanged)

- **Implementation:** commit `9eb578b`. Run 43134754886 attempt 1 failed at the guard, as expected, because tag `v0.7-tests-approved-3` did not yet exist. The owner created the tag (lightweight, → 9eb578b). One API re-run (attempt 2) passed: guard 12/12, `FAST: PASS 19 | FAIL 0 | ERROR 0`, confidence snapshot 51/51.
- **Planted-change demonstration:** commit `cb7e3a8` changed `js/forecasting.js` line 38 from `n<24` to `n<12` (not a protected file). Run 43136342170 failed at the fast tier only; the guard passed 12/12. The confidence snapshot reported 19/51 with 32 failed, naming `forecastCredibility.FG001.conf: expected "Medium", actual "High"`. No other test failed.
- **Revert and recovery:** commit `e9efe31`, a normal revert and the exact inverse of `cb7e3a8`. Run 43136962684 passed: guard 12/12, `FAST: PASS 19 | FAIL 0 | ERROR 0`, confidence snapshot 51/51.
- **Final verification (pre-packaging committed state, `e9efe31`):** all 12 protected files and the committed tree are identical to `v0.7-tests-approved-3`. The evidence commit differs from the tag by exactly the 20 evidence changes (19 files in `tests/logs/t3/` and this appended section). `main`, `release/v0.6`, `v0.6` and tags `-1`, `-2`, `-3` are unchanged. `check-protection`: 127/127.
- **Accepted results:** unchanged. **Status:** T3 evidence packaged; awaiting the owner's formal closure. A2 not started.
- **Evidence:** `tests/logs/t3/T3-EVIDENCE-INDEX.md`.

## M1 Stage 1 — CP1 decisions (12 Nov 2026, recorded before commit; the entries above are unchanged)

- **Library protection:** option (a), protect the complete library. Every file of `tests/fixtures/library/` and `tests/tools/library/` has its own line in `checksums.txt`. No separate checksum lifecycle and no guard redesign.
- **PENDING rule:** the guard lets additions pass as `PENDING` (new `checksums.txt` lines, raised counts, new tests) without failing. Every `PENDING` addition must therefore be reviewed before a baseline tag is moved. A passing guard is not approval of an addition.
- **CI:** option (b). The Stage 1 test is registered in `accepted-results.json` (`import-stage1`, 616 = 123 checks × 5 time zones + 1 cross-zone check). No change to `run-all.sh`. A failure in any time zone is counted, and a non-zero exit is reported as ERROR by `run-all.sh`.
- **Python cache:** `test-import-stage1.js` runs Python with `-B`; `tools/library/build.py` sets `sys.dont_write_bytecode` before importing its own modules.
- **Test gap closed:** field-policy and structural tests for all 12 canonical tables, with independently written expected rules and synthetic `sales_lines` and `po_headers` data.

## M1 — acceptance scope statement (recorded 12 Nov 2026; takes effect at CP5)

**Not yet in effect.** M1 has not been accepted. This statement takes effect only when the CP5 acceptance entry is recorded below, and that entry must repeat it unchanged or record why it changed:

"M1 acceptance used synthetic packages 01–06 only; no real-world export was tested at M1; first real-file acceptance is planned before the M4 demonstration release under the local-only policy."

M1 does not prove compatibility with arbitrary business-owned exports. Requirement 6 and its policies are in `../M1-DESIGN.md`. A change to this statement or to Requirement 6 must change both files in the same commit.

## M1 pre-tag corrections — Commits 1 and 2 (12 Nov 2026; the entries above are unchanged)

**Commit 1 (`fb6c5ee`, local, owner-authorised 12:24; kept unchanged at the owner's instruction, 12:43).** Duplicate-policy corrections only: Package 02 I09, I16 (a conflicting duplicate stops the import; no implicit first or last row), I12 (TOTAL rejected by the ordinary unmatched-item rule), the 02 README note, the expected import report (`*_conflicts_requiring_resolution`), Package 06 E08, `build.py`, 6 `MANIFEST.sha256` lines, 8 `checksums.txt` lines. Package 06 E08: interpretation (a), approved by the owner at 12:43 — the canonical fixture expects the demand import to stop; resolution is deferred to M1b. Scratch regeneration: deterministic, exactly the 6 intended generated files changed. Stage 1 616/616; full tier PASS 33, FAIL 0, ERROR 0, 5 BLOCKED, 2 REDUCED (unchanged). Stop-and-resolve is a requirement, not yet built; Commit 1 changed wording and expectations only.

**Commit 2 (documentation; this entry).** `M1-DESIGN.md` (new), this append, `KNOWN-LIMITATIONS.md` entries 14–15 (three-problem lead-time framing; duplicate stop-and-resolve not yet built), the E08 `EXPECTED.md` clarification added by hand (not produced by the generator), its `MANIFEST.sha256` line, and three `checksums.txt` lines (E08 hash, manifest hash, the reworded library comment). No file under `js/` and no engine behaviour changed.

**Protection of the two changed library files.** E08 `EXPECTED.md` and `MANIFEST.sha256` are protected through `checksums.txt`; both entries were updated in this commit (with the reworded library comment, line 136). `MANIFEST.sha256` also lists E08 `EXPECTED.md`, and `test-import-stage1.js` checks every library file against it. E08 `EXPECTED.md` is also included in `06-Edge-Cases-v1.0.2.zip`. Results: `check-protection` 337/337; `MANIFEST.sha256` verification passed; ZIP verification 208 files, 0 differing from the repository.

**Which tests read E08 `EXPECTED.md`.** Search: `grep -rn --exclude-dir=fixtures --exclude-dir=logs --exclude-dir=node_modules "EXPECTED.md" tests/`. Hits: this record; a comment in `test-import-stage1.js` (line 84); `checksums.txt` entries; `tools/library/build.py`, which writes the file and never reads it. No test parses its content. Two tests read its bytes: `test-import-stage1.js` (`MANIFEST.sha256` hash check and unlisted-file check, lines 44–50) and `check-protection.js` (via `checksums.txt`). Both pass (616/0; 337/337).

**Commit 2 test results** (12 Nov 2026, UTC; test-only Node packages installed outside the repository from the pinned `tests/package-lock.json`, as CI does). These were run on the Commit 2 working tree **before** the text-only adjustments of 12 November 2026 (owner's review of 15:30 and 15:36). Those adjustments changed only `M1-DESIGN.md`, `KNOWN-LIMITATIONS.md` and this record, which no test executes or reads, so they do not affect test-executed content:

| Check | Result |
| --- | --- |
| Stage 1 import tests (`import-stage1`, 5 time zones) | 616 passed, 0 failed |
| `check-protection` | 337/337 |
| Guard (`check-control`) | 12/12 |
| Fast tier (`run-all.sh --fast`) | exit 0 |
| Full tier (`run-all.sh --full`) | exit 0: 33 passed, 0 failed, 0 errors, 5 blocked, 2 reduced |
| Golden v0.5 / v0.6.0 (5 zones) | 10/10 each |
| Confidence snapshot v0.7 (5 zones) | 51/51 |

The 5 blocked and 2 reduced entries are **not passed tests**. They are the existing accepted limitations (a blocked test did not run; a reduced test ran with reduced coverage), unchanged from the previous runs, so the full tier is not full coverage. `PENDING` warnings from Stage 1 (raised `check-protection` count; new `import-stage1` test; new protected `checksums.txt` lines) remain for the owner's review before any baseline tag is moved.

**Two verification rounds.** (1) Fixture and checksum round, which covers every change that tests read: `check-protection` 337/337; `MANIFEST.sha256` verification; Stage 1 616 passed, 0 failed; ZIP verification 208 files, 0 differing; and the fast and full tiers above. (2) Documentation round, after the text-only adjustments: only `M1-DESIGN.md`, `V07-TEST-RECORD.md` and `KNOWN-LIMITATIONS.md` changed, so the fast and full tiers did not need rerunning. `check-protection`, the guard, `MANIFEST.sha256` verification, Stage 1 and the ZIP hashes and contents were rechecked and are unchanged.

**Delivered ZIPs v1.0.2** (built from the repository files of Commit 2; internal library label still v1.0; the name v1.0.1 is not reused because `00-Generator-Scripts-v1.0.1.zip` already exists with the `ca1e800` generator). Verification, file by file, read back from the ZIPs: 208 files; 0 differ from the repository; against fresh generator output exactly one difference, `06-Edge-Cases/E08-duplicate-records/EXPECTED.md` (the Commit 2 clarification); `MANIFEST.sha256` and `MASTER-INDEX.md` are repository-only and in no ZIP; the file list of every ZIP is the same as v1.0. A ZIP's own hash depends on how it was packed, so the delivered files are identified by these hashes:

| SHA-256 | Bytes | File |
| --- | --- | --- |
| `4a17a601468bdc00bb7cdc04533b1ff6c1b09f163db21b415b82793da668f529` | 26288 | `00-Generator-Scripts-v1.0.2.zip` |
| `409e388d3f9fbc7bb521197182dfc90ab29fa35833869c9729893c317e22628f` | 30718 | `01-Clean-Manufacturer-v1.0.2.zip` |
| `59ef3a9a6cf458240468bacec473e7515af16d5e59baa8480b5450117dba82a8` | 61001 | `02-Messy-Manufacturer-v1.0.2.zip` |
| `ee1c2e71bc455ba329cc4f6843739d89604e704a101626795bd8b5e4da5b9e3c` | 40299 | `03-Distributor-v1.0.2.zip` |
| `510b7109d3d7dc978dfc2df158ad05b2f325f5d1dff24f11e607c4362b1d6e2c` | 22492 | `04-Mixed-Make-Buy-v1.0.2.zip` |
| `62f8c0fba4a2fa2d75d908c4b3212b262c9b9677714ee1d0d83c1d1be71934cf` | 1217619 | `05-Performance-Dataset-v1.0.2.zip` |
| `0ab8682380926a05492b0897d09b7e08995f676fc62dfb70f31199c74fab2a3d` | 50703 | `06-Edge-Cases-v1.0.2.zip` |

The v1.0 ZIPs are superseded (their Package 02 and E08 files contain the old keep-first wording).

## M1 pre-tag Commit 3 — characterisation test for lead-time fallbacks (12 Nov 2026; the entries above are unchanged)

**What was added.** `tests/characterisation/characterisation-lead-time-fallbacks.js` (28 assertions) and `tests/characterisation/README.md`. The test records the engine's **current** lead-time behaviour, including known defects. **A pass means the recorded behaviour is unchanged; it does not mean the behaviour is approved or correct.** Approved future behaviour is set by the owner's decisions in `../M1-DESIGN.md` and changes only through separately authorised commits.

| Case | Recorded current behaviour | Status |
| --- | --- | --- |
| H1 | PO-history base 26 d + 6 d lateness added again = 32 d | Known defect (double count); `TODO(H1, Commit 4)`: lt becomes 26; the supplier's observed 6-day average lateness stays, it is no longer added on top |
| H2 | Supplier standard 20 d + 6 d lateness = 26 d | Control case; Commit 4 must not change it |
| H3, H4 | One PO (40 d, spread 0) and two POs (30 d, spread 20) labelled "Calculated"; `enough` false | Known defect (small samples); `TODO(small samples, Stage 4)` |
| H5 | Early deliveries: lateness floored at 0, lt 25 d | Current behaviour; no change planned (decision A4 open) |
| F7 | No evidence: 7-day production default, "Assumed (default setting)" | Known limitation; `TODO(7-day fallback, decision A1)` |

Case numbering follows the H1-assessment evidence: the small-sample cases are H3/H4; H5 is early delivery (the Commit 3 brief's reference to "H5 small-sample variance" does not match the evidence).

**Registration and protection.** `accepted-results.json`: new entry `characterisation-lead-time` (fast and full tiers; full tier in five time zones; accepted 28) whose existing `note` field marks it as CHARACTERISATION; `check-protection` accepted count 337 → 338 (its note updated to match). `checksums.txt`: one comment line and one `file` line for the test, added in the same change. The README is not checksum-protected. No file under `js/`, no existing test, package or generator changed.

**Results (12 Nov 2026, UTC; test-only Node packages installed outside the repository from the pinned `tests/package-lock.json`).**

| Check | Result |
| --- | --- |
| Characterisation test, run directly in UTC, Europe/London, America/New_York, Asia/Kolkata, Pacific/Auckland | 28 passed, 0 failed in each zone; outputs byte-identical |
| `check-protection` | 338 passed, 0 failed (3 references, 335 files) |
| Guard (`check-control.js` from tag `v0.7-tests-approved-3`) | 12 passed, 0 failed. PENDING: `characterisation-lead-time: new test, accepted 28`; `checksums.txt new protected line … tests/characterisation/characterisation-lead-time-fallbacks.js`; `check-protection: accepted count raised 127 -> 338`; plus the earlier Stage 1 items (`test-a1-static` 20 → 23, `import-stage1` new test, 210 library/tool checksum lines) |
| Fast tier (`run-all.sh --fast`, UTC only) | exit 0; PASS 21, FAIL 0, ERROR 0; `characterisation-lead-time` 28 of 28 |
| Full tier (`run-all.sh --full`) | exit 0; PASS 34, FAIL 0, ERROR 0, 5 blocked, 2 reduced; `characterisation-lead-time` 28 in each of 5 zones (140 assertions); golden v0.5 and v0.6.0 10/10 each; confidence snapshot 51/51 |

The 5 blocked and 2 reduced entries are **not passed tests**: they are the existing accepted limitations, unchanged. These results were obtained before this record entry was written; this record is not read by any test.

**Sequencing rule.** No baseline tag may be moved between Commit 3 and Commit 4: the guard would then treat Commit 3's checksum line as approved, and Commit 4's corrected line would fail it (demonstrated in a throwaway copy during the Commit 3 preflight). Commit 4, if authorised, changes the H1 assertions and the test's checksum line in the same commit as the engine correction.

## M1 pre-tag Commits 4–7 and CI run 43285464866 (12 Nov 2026; the entries above are unchanged)

**Commit 4 (`893e9a99445a4dfd9b20bcfd3e8f4be76b7a4b4f`).** Corrected the H1 lead-time double counting in `js/calculations.js` with a one-line change (line 133): average supplier lateness is no longer added to a lead time that already comes from purchase-order history; it is now added only to a stated lead time or a supplier standard. In the same commit the two H1 characterisation assertions changed from 32 to 26 days (and the label no longer ends " + calculated lateness"), `TODO(H1, Commit 4)` became a `CORRECTED(H1, Commit 4)` note, the test's line in `checksums.txt` was updated, and `M1-DESIGN.md` gained the "Engine file protection" paragraph. The committed characterisation test expects H1 = 26 days and passes. Unchanged golden and confidence snapshots show that no other recorded output changed; they do not prove that the calculation is correct. A 22-workbook whole-engine comparison before and after the change (UTC and Pacific/Auckland) was produced at the time as additional workspace-only evidence; it is not stored in the repository (backlog P-002).

**Commit 5 (`c9e58bcd0fe69fe444217be23af900c9c70aa752`).** Created `CLAUDE.md` and `PROACTIVE-IMPROVEMENT-BACKLOG.md`. Documentation only.

**Commit 6 (`68c60d1fdefa982676bea205209e65fe159ec9a4`).** Updated `KNOWN-LIMITATIONS.md` entry 14 to record H1 as corrected in Commit 4. Documentation only.

**Commit 7 (`5a06010eb47d323ea83c161b6c2fb762166f16b7`).** Extended backlog item P-004 with the missing characterisation-coverage finding. Documentation only.

**CI fast tier — GitHub Actions run 43285464866** (workflow "v0.7 tests", push of `5a06010`; completed, success):

| Check | Result |
| --- | --- |
| Guard (`check-control.js` from tag `v0.7-tests-approved-3`) | 12 passed, 0 failed |
| Fast tier (`run-all.sh --fast`, UTC only) | exit 0: 20 tests passed (+ pre-flight); 0 FAIL, 0 ERROR, 0 BLOCKED, 0 REDUCED |
| Characterisation (`characterisation-lead-time`) | 28/28 |
| `check-protection` | 338/338 |
| `import-stage1` | 616/616 |
| Golden v0.5 / v0.6.0 | 10/10 each |
| Confidence snapshot v0.7 | 51/51 |

The fast tier does not run the full tier's BLOCKED or REDUCED tests, so this run does not cover them.

**Full tier — run locally, not in CI.** During the Tag-4 audit the full tier was run at `5a06010` in a temporary copy of the repository on Claude's workspace, not by the GitHub Actions workflow (12 Nov 2026, `run-all.sh --full`): exit 0 in about 482 s; 40 distinct tests: 33 passed (+ pre-flight), 5 BLOCKED, 2 REDUCED, 0 FAIL, 0 ERROR. The 5 BLOCKED and 2 REDUCED tests are the existing accepted limitations and are **not passed tests**. The run's log is not stored in the repository.

**PENDING notices: 215, all still PENDING.** None has been accepted or approved.

| Notices | Count |
| --- | --- |
| Checksum notices: library and tool lines (`tests/fixtures/library/`, `tests/tools/library/`) | 210 |
| Checksum notices: characterisation test line | 1 |
| Non-checksum: `check-protection` accepted count 127 → 338 | 1 |
| Non-checksum: `test-a1-static` accepted count 20 → 23 | 1 |
| Non-checksum: `import-stage1` new test, accepted 616 | 1 |
| Non-checksum: `characterisation-lead-time` new test, accepted 28 | 1 |
| **Total** (211 checksum + 4 non-checksum) | **215** |

The earlier total of 213 (210 library and tool lines plus the `check-protection`, `test-a1-static` and `import-stage1` notices) became 215 in Commit 3, which added one characterisation test notice and one characterisation checksum notice. The `check-protection` notice is a single notice whose reported number changed (127 → 337 after Stage 1, 127 → 338 after Commit 3), not two notices. The guard compares with tag -3, so it always reports from 127.

**The PENDING window.** (1) Files and counts already in the tag -3 approved baseline are protected automatically: the guard fails if any of them is removed, changed or weakened. (2) Changes introduced after tag -3 sit in a PENDING window: they are reported as PENDING but are not enforced. The Tag-4 audit demonstrated, in a temporary copy, that coordinated changes to such files (a file together with its checksum line, or a test together with its accepted count) pass every automatic check. At this checkpoint the safeguard is therefore the owner's review of the PENDING notices, which is an owner-governance safeguard, not an automatic technical control. (3) Once the new baseline is correctly established at tag -4 (created on the baseline-switch commit), the files and counts the owner accepts become part of the automatically protected baseline.

## M1 pre-tag Commit 9.5 — documentation corrections before the baseline switch (12 Nov 2026; the entries above are unchanged)

**Status when recorded:** implemented in the working tree on top of Commit 9 (`2d2559a`) and verified there. At the time of this entry no commit or push had been made; the commit needs the owner's separate approval.

**Scope.** Documentation only, so that the files reviewed for tag -4 are accurate. No engine code, import or test logic, assertions, expected values or accepted counts changed.

- `tests/fixtures/library/MASTER-INDEX.md`: the reproducibility statement now matches the rebuild evidence and states its limits; the Package 02 sentence now discloses the fixture assumptions (I09 and I16 resolutions; identical duplicates I08, I19 and E08 under open decision A6); the obsolete "Transferring to your ChatGPT Library" section is replaced by "Delivered copies". The "Check against today's engine" section is unchanged (1,156 bytes before and after, byte-identical).
- `tests/fixtures/library/MANIFEST.sha256`: the `MASTER-INDEX.md` entry updated.
- `tests/checksums.txt`: the `MASTER-INDEX.md` and `MANIFEST.sha256` lines updated, and the comment on the M1 Stage 1 block updated (comment lines are not checked by either checker).
- `M1-DESIGN.md`: "Identical duplicates" records the A6 fixture assumption (A6 stays open); "Known gap in Package 02's expected results" corrects the I16 statement, with a correction note; "Test-data library" updated for `MASTER-INDEX.md`.

**Checksum changes.**

| File | Before | After |
| --- | --- | --- |
| `tests/fixtures/library/MASTER-INDEX.md` | `d57a2e39ec545cb5a1ddea5d06088358ef4d8ab76b47e00eb53d22df91aa8e17` | `cb3a2ea6d84dc789dad0ef20038835718d857f078ecba62c1627b753b6779a65` |
| `tests/fixtures/library/MANIFEST.sha256` | `a05e0129a7dde2a383cbda6862bbab84e9e6856d8fd80289243389c32749d548` | `cc64b44afa1399c297338bd9853f0b2545b41cbb77792235f2102e0ab8d3f65e` |

**Evidence from this implementation run** (12 Nov 2026, Python 3.13.18, Linux 6.18):

- Rebuild: `cd applications/inventory-intelligence-engine/tests/tools/library && python3 -B build.py /tmp/commit95-regen-1794520832` (output directory outside the repository; it did not exist before the run). Of the 206 library files: 203 byte-identical; 2 differ because they contain hand-written text (`MASTER-INDEX.md`, `06-Edge-Cases/E08-duplicate-records/EXPECTED.md`); 1 not produced by the generator (`MANIFEST.sha256`). The generator also wrote `summary.json` and the ZIPs, which are not part of the library. The rebuild shows the files match the generator, not that the expected results are correct.
- I16 and I09: `refcalc.py` re-run on disposable copies of Package 02 `expected-canonical/`. The unchanged copy reproduces the committed `expected-results.json` exactly. Changing I16 to Qty Sold 103 changes no figure (`refcalc.py` lines 84–85: `months` sorted, `last12 = set(months[-12:])`, which covers 2025-11 to 2026-10; 2024-11 is outside it). Changing I09 to QOH 132 changes exactly three figures: FGW on hand 5,551 to 5,588; business-wide on hand 53,731 to 53,768; stock value at cost £2,271,511.45 to £2,275,161.13 (37 × £98.64 = £3,649.68).
- I08 and I19 (re-checked in this run): each pair of source rows is byte-identical in every column (`StockByWarehouse.csv` lines 10 and 161; `PO_Lines.csv` lines 12 and 743). Whether such rows may be removed is open decision A6.

**Checks run in this implementation run** (working tree, UTC):

| Check | Result |
| --- | --- |
| Guard (`check-control.js`, tag `v0.7-tests-approved-3`) | 12 passed, 0 failed |
| PENDING | 216 = 212 checksum + 4 non-checksum, unchanged in number. Exactly two notices changed (the `MASTER-INDEX.md` and `MANIFEST.sha256` lines, same paths, new hashes); the other 214 are byte-identical |
| `check-protection` | 339 passed, 0 failed |
| `import-stage1` | 616 passed, 0 failed (including the library manifest check: 205 files, 0 changed; no unlisted files) |
| Fast tier (`run-all.sh --fast`) | exit 0: 20 tests passed (+ pre-flight), 0 FAIL, 0 ERROR, 0 BLOCKED, 0 REDUCED; characterisation 28/28, golden v0.5 10/10, golden v0.6.0 10/10, confidence snapshot 51/51 |
| Full tier | NOT RUN (documentation-only change) |
| GitHub Actions CI | NOT RUN (no push has been made) |

## M1 pre-tag Commit 9.6 — two MASTER-INDEX wording clarifications before the baseline switch (13 Nov 2026; the entries above are unchanged)

**Status when recorded:** implemented in the working tree on top of Commit 9.5 (`ebffe2e`) and verified there. At the time of this entry no commit or push had been made; the commit needs the owner's separate approval.

**Scope.** Documentation only: two passages of `tests/fixtures/library/MASTER-INDEX.md`, the matching `MANIFEST.sha256` entry and the two `checksums.txt` hash lines. No engine code, test logic, assertions, fixture data, expected values or accepted counts changed. `M1-DESIGN.md`, `accepted-results.json` and the `checksums.txt` comment lines (including line 136) are unchanged.

- Package 02 note: separates the decided rule (conflicting duplicates stop the affected import until the user names the row to keep; `M1-DESIGN.md`, "Conflicting duplicates") from the fixture's assumed row choices (I09: QOH 95, not 132; I16: Qty Sold 94, not 103). "The import" becomes "the affected import" in two places, matching the decided rule's wording. Whether an affected import means one table or the whole package is not decided here; it remains open for the Stage 2 design. The identical-duplicates text (open decision A6) is unchanged.
- "Delivered copies": the ZIPs are kept unchanged as a record of what was delivered at M1 pre-tag Commit 2; for the test-data library the current repository is the source of truth and is authoritative where the two differ. No ZIP was changed.
- The "Check against today's engine" section is byte-identical (1,156 bytes before and after).

**Checksum changes.**

| File | Before | After |
| --- | --- | --- |
| `tests/fixtures/library/MASTER-INDEX.md` | `cb3a2ea6d84dc789dad0ef20038835718d857f078ecba62c1627b753b6779a65` | `472ed20b50ea46879a4cecd539e661290d627cbe25b705f2ca32c2501a8cb08a` |
| `tests/fixtures/library/MANIFEST.sha256` | `cc64b44afa1399c297338bd9853f0b2545b41cbb77792235f2102e0ab8d3f65e` | `94047192a3dd2b2c7a46ed77caf0d0c1957558b54ced42d314417d44ce4a4c33` |

All 205 manifest entries verify; no duplicate or missing entries; `checksums.txt` has 3 references and 336 file lines.

**Checks run in this implementation run** (13 Nov 2026, working tree, UTC; Python 3.13.18, Linux 6.18):

| Check | Result |
| --- | --- |
| Guard (`check-control.js`, tag `v0.7-tests-approved-3`) | 12 passed, 0 failed |
| PENDING | 216 = 212 checksum + 4 non-checksum, before and after. Exactly two notices replaced (`MASTER-INDEX.md` and `MANIFEST.sha256`: same paths, new hashes); the other 214 are byte-identical; no duplicates |
| `check-protection` | 339 passed, 0 failed |
| `import-stage1` | 616 passed, 0 failed (library manifest: 205 files, 0 changed; no unlisted files) |
| Fast tier (`run-all.sh --fast`) | exit 0: 20 tests passed (+ pre-flight), 0 FAIL, 0 ERROR, 0 BLOCKED, 0 REDUCED; characterisation 28/28, golden v0.5 10/10, golden v0.6.0 10/10, confidence snapshot 51/51 |
| Rebuild (`cd applications/inventory-intelligence-engine/tests/tools/library && python3 -B build.py /tmp/c96i-regen-1794532983`; new directory outside the repository) | 206 library files: 203 byte-identical; 2 differ because they contain hand-written text (`MASTER-INDEX.md`, `06-Edge-Cases/E08-duplicate-records/EXPECTED.md`); 1 not produced by the generator (`MANIFEST.sha256`) |
| Full tier | NOT RUN (documentation-only change) |
| GitHub Actions CI | NOT RUN (no push has been made) |

**Observations carried forward:** the scope of "affected import" (one table or the whole package) is not recorded as an open question in `M1-DESIGN.md`; it should be added in the Stage 2 design phase. The package-level "keep one" wording (`02-Messy-Manufacturer/DATA-ISSUES.md`, E08 `EXPECTED.md`) and A6 remain open. The PENDING inventory CSV must be regenerated after this change.

---

## Tag-4 baseline acceptance — Part A (pre-tag acceptance record; inside Commit 10)

Recorded by Claude on the owner's instruction. Part A is not changed after Commit 10 exists; any correction is a separate, dated entry. Parts A2 (Commit 10 identification and pre-tag results) and B (Tag-4 approval, creation and post-tag verification) are added after Tag-4 exists. **Tag-4 does not exist when this Part A is written.**

### Reviewed plan and review

| Field | Entry |
|---|---|
| Reviewed plan | `TAG4-BASELINE-RECORD-DRAFT-v11-7850891.md`, 163,509 bytes, SHA-256 `d383917c8549b353bc0918c62603e2821d2936fd259b3d4cdc4305ebc5635a19` (held privately by the owner) |
| Review (D9) | **Owner's decision: accepted.** Claude drafted the plan and carried out the review and verification. This is not independent human verification, and shared mistakes may survive an AI reviewing its own work. Evidence was checked against the repository, Git, GitHub's read-only API and executed tests wherever possible. The owner retains final approval authority. No human reviewer was used |
| Owner's decisions message | 13 Nov 2026, 16:20 UTC, in the owner's Claude conversation |

### Owner decisions (as given, 13 Nov 2026 16:20 UTC)

| Decision | Owner decision |
|---|---|
| D1a Commit 2 implementation and scope evidence at category 6 (commit and push stay category 4) | Accept |
| D1b Commits 9, 9.5 and 9.6 at category 4 | Accept |
| D2 `ca1e800` at category 3 | Accept, with the limitation recorded: the authorisation for `ca1e800` (213 of the 233 recorded changes) rests on the owner's report, held only in summary form, with no wording or time recorded. Its file integrity is independently confirmed (plan Section 5.8); its prior authorisation is not |
| D3a N01 `check-protection` 127 → 339 | Accept |
| D3b N02 `test-a1-static` 20 → 23 | Accept |
| D4 Rule A (block pushes to `main`) | Decline for now; may be reconsidered before commercial release. Risk remains that any credential with write access could change the live site |
| D5 Rule B (restrict creation of approved tags) | Decline for now; may be reconsidered before commercial release. Risk remains that any credential with write access could create a tag matching the approved pattern |
| D6 Shared identity | Accept: owner and agents all act as MB20252025, so Git history cannot show who performed an action |
| D7 `claude-write-test` | Retain |
| D14 Test limitations | Accept as known gaps, **not** as passing tests (listed below) |
| D15 Who creates Tag-4 | **Approved exception:** Claude may create and push Tag-4, but only under a separate, explicit written instruction from the owner given after Commit 10's actual results have been reviewed. This departs from the README rule that Claude does not create or push baseline tags. Reason: the owner works mainly from an Android phone and has no convenient local Git workflow. The exception applies to this closeout only. The README should be reviewed in a later documentation change. **Tag-4 creation has not been instructed at the time of this entry** |

### D8 — owner security checks

| Check | Status |
|---|---|
| 1. Authorised GitHub Apps | Not performed. **Owner decision (13 Nov 2026, 16:30 UTC): proceed towards Commit 10 with this check outstanding.** Not passed, not completed; the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7) |
| 2. Authorised OAuth Apps | Not performed. **Owner decision (13 Nov 2026, 16:30 UTC): proceed towards Commit 10 with this check outstanding.** Not passed, not completed; the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7) |
| 3. Repository collaborators | Not performed. **Owner decision (13 Nov 2026, 16:30 UTC): proceed towards Commit 10 with this check outstanding.** Not passed, not completed; the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7) |
| 4. Deploy keys | Not performed. **Owner decision (13 Nov 2026, 16:30 UTC): proceed towards Commit 10 with this check outstanding.** Not passed, not completed; the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7) |
| 5. Two-factor authentication | Not performed. **Owner decision (13 Nov 2026, 16:30 UTC): proceed towards Commit 10 with this check outstanding.** Not passed, not completed; the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7) |

### D13 — evidence publication

- **Public (in `tests/logs/tag4/`, after a final scan):** guard summary, fast-tier summary, rollback guard summary, CI result summaries. These are added with Parts A2 and B.
- **Full-tier summaries kept private (owner decision, 13 Nov 2026, 16:30 UTC):** the pre-tag full-tier summary, because its BLOCKED lines name folders in the assistant's cloud workspace. The post-Tag-4 full-tier summary contains the same lines and is also kept private. Their results are stated in Parts A2 and B, and their SHA-256 values are recorded there.
- **Private (held by the owner, not deleted):** listed below with SHA-256. They are not published. The two reconciliation CSVs are not published.

| Private file | SHA-256 |
|---|---|
| `reconcile.py` | `df93e94c7141325a445c6e9514b9fc25189e1d726a799121cb03382aae40da40` |
| `RECONCILIATION-216.csv` | `685f8545cd3da694322b38515af71d90fbdfc9a200a826efde501371afce8951` |
| `PENDING-INVENTORY-7850891.csv` | `9493ef0902d32bdef0171ae31156bb14c0fbe24e5ecda08c86f37c6d77d90a02` |
| `per-notice-breakdown.csv` | `5ffcd3145858432e4974ba9dfe8ee37be7bdece9e1e3fcb5754008454422e983` |
| `GATE3-APPROVAL-REGISTER.csv` | `cc00f29281b83a161904261c353cb642d3cd668e88857307804335055938ab8b` |
| `files-by-commit.csv` | `9ec0f47bf21a8f0dd97d56c991319bf18bb6d8b56139469a4f4f23c2487ef99a` |
| Library rebuild log | `d0f70ba1656012b575baac426f566fd7316c0613d733df2c2332b5d60a67b9f3` |
| Guard-limitation test outputs | `d8f08cbbf53eaf3075ec76178dcc0779267df498d7e93fe68ea310d307a413f4` (reason-text and full-removed tests; identical outputs), `a8f00c001aabaa1e22248eccef36cc665f544a458f55bda25c88bb7533fba0e7` (timeout test) |
| Candidate detailed logs (disposable copy) | fast `4055d891a43189d216bc0c554a6ea949d3fd15f3923deb1d0e6909969f02fe47`, full `e1efbd61d219c443af76e7cedd7f8aba996d8c3bd7dbfc77137935d4f13d3a2f` |
| `CP1-Final-Review.zip` (contains the owner's email address) | `dc494357867407763b945f62a82971a627117a0ca2339011dc6cae5d30ffd33a` |

### The 216 PENDING notices

- **Reconciled (plan Section 5.8):** 216 of 216, against Tag-3's guard output, `checksums.txt` at Tag-3 and HEAD, Git, the files on disk, the tests, and a fresh rebuild of the test-data library. 0 unexplained; 0 approved Tag-3 lines removed or changed.
  - 212 are new protected files, all tracked and matching their hashes. 203 rebuild byte-identical; 2 differ only by documented hand-written notes; the manifest checks 205 of 205; the other 6 are generator and test files.
  - N01 = 3 references + 336 protected files = 339.
  - N02 = 20 + one check per new importer file = 23.
  - N03 `import-stage1` passes at 616; N04 `characterisation-lead-time` passes at 28.
- **Not established:** that the synthetic test data or the characterisation test describes correct business behaviour (N04 records known defects H3, H4 and F7); that every historical change was authorised beforehand (D2).
- **When they become formally resolved:** only when (a) Commit 10's pre-tag checks pass as recorded in Part A2, (b) the owner separately instructs Tag-4's creation, recorded in Part B, and (c) Tag-4 is verified on the Commit 10 hash and the guard against Tag-4 reports 12 passed, 0 failed and 0 PENDING. Until then they remain PENDING.

### Commit 10

| Field | Entry |
|---|---|
| Files | `.github/workflows/v07-tests.yml` (TAG line); `tests/accepted-results.json` (check-control `tag` value only); `tests/check-control.js` (default tag only); `tests/README.md` (Tag-4 reference updates only); this record (Part A) |
| Control-change fingerprint F1 (four non-record files) | `c20ae85725ef6a22d65084919cec209a49d23a4941ea2e3f1c1441be87af7344` |
| Test record before Commit 10 (H0, at `7850891`) | SHA-256 `3f97a4c5c5b5aa0e85726d8fd794bec808802bff3ddd027357182f199c686313`, blob `493661670dedd893fa5daaa3fa8c586137806035` |
| Expected guard against Tag-3 | 10 passed, 2 failed (`check-control.js` and the workflow, both intended); 216 PENDING identical to the inventory |
| Rollback | Full revert of all five files (plan Section 14.1.1), tested in a throwaway copy: files byte-identical to `7850891`; Tag-3 guard 12 passed, 0 failed, 216 PENDING |

### Known limitations accepted with this baseline (D14)

- Five BLOCKED tests:
  - `test-fglt-note`, `test-forecast-conf` and `phase2-comparison`: historical comparisons.
  - `test-supplier-eligibility`: current supplier scoring unverified.
  - `test-paging-chrome`: real-browser paging at phone width untested.
- Two REDUCED tests: `test-phase1` (57 of 125), `test-uom` (110 of 164).
- No physical Android testing.
- `characterisation-lead-time` records known defects H3, H4 and F7.
- Guard limitations (plan Section 12.3): some `accepted-results.json` fields are not compared; timeout and environment changes are PENDING only.

### Acceptance (D10)

**Owner decision (13 Nov 2026, 16:32 UTC), verbatim:** "Accept d10 of you think its best". Claude's recommendation, given before this entry: accept, because the wording is conditional and limited. The owner's acceptance of the wording below is recorded on that basis; its conditions (a) and (b) still apply.

> I, the owner of MB20252025/Chain-Genius-Consulting, accept, subject to the conditions below, the test-control state of the commit recorded in Part A2 of this record as the Tag-4 target (Commit 10, or an approved corrective commit; its full hash is recorded afterwards in Part A2, because a commit cannot contain its own hash) as the v0.7 protected test baseline, to be identified by the tag `v0.7-tests-approved-4` attached to that exact commit.
>
> Conditions: this acceptance takes effect only if (a) the pre-tag checks in the reviewed plan, Section 10, pass on that commit as recorded in Part A2, and (b) I then separately and explicitly approve the creation of Tag-4, as recorded in Part B with the evidence I reviewed. If either condition is not met, this acceptance has no effect.
>
> What I am accepting: (1) that specific snapshot; (2) that the 216 additions listed in `PENDING-INVENTORY-7850891.csv`, each reconciled in `RECONCILIATION-216.csv`, become, collectively, part of the baseline that the guard will protect from now on; (3) the pre-tag and post-tag test evidence as it is recorded in Parts A2 and B once it exists; (4) the test limitations, historical authorisation limitations and risks set out in the reviewed plan; and (5) the unresolved matters recorded there.
>
> What I am not accepting or stating: this acceptance does not retrospectively approve any historical change; does not individually approve or review each of the 216 notices; does not state that any historical change was authorised before it was made; does not remove any known test limitation; does not turn any BLOCKED or REDUCED test into a pass; does not state that physical Android testing has been done; does not state that the software is free of defects; does not approve the known defects recorded by characterisation tests; does not establish a personal or cryptographic signature merely because the repository account created the tag; and does not prevent every possible unauthorised future change.

Entry made by Claude, 2026-11-13 16:34 UTC.

---

## Tag-4 baseline acceptance — Part A2 (Commit 10 identification and pre-tag results; evidence-only entry)

Added after Tag-4 existed, in an evidence-only commit. Part A above is unchanged.

| Field | Entry |
|---|---|
| Commit 10 (Tag-4 target) | `5f18335ff66cb151760abf495cf82920f7b290b3`, parent `7850891bc68b2501a7e72639abd548d185a2df47`, branch `development/v0.7`, author and committer MB20252025, committed 2026-11-13 16:34:23 UTC, pushed 16:45:58 UTC. Commit message has no trailer lines |
| Scope | Exactly the five approved files. Test record: 104 lines added, 0 removed. `accepted-results.json`: only the check-control tag value changed. `checksums.txt` unchanged. No binary files |
| F1 control-change fingerprint | `c20ae85725ef6a22d65084919cec209a49d23a4941ea2e3f1c1441be87af7344`, equal to Part A |
| F2 whole-commit fingerprint | `408aa05238c6bf8c5f86dc26371620de12946c7a34daaaa3f9993bf7b97cb322` |
| Test record hashes | Before (H0, at `7850891`): `3f97a4c5c5b5aa0e85726d8fd794bec808802bff3ddd027357182f199c686313`. After (H1, at Commit 10): `ac98f011be53b6ffb904f53866b2a6419184db5cbbd8768bd9ed0da332a3cfc6` (blob `76879f1f8d4fd3e3d63289da844c1b864048bb48`) |
| Guard against Tag-3 (run on Commit 10 before push) | `check-control: 10 passed, 2 failed (baseline v0.7-tests-approved-3 = 9eb578b)`. The two FAIL lines are exactly the intended `check-control.js` and workflow changes; `accepted-results.json`: no weakening; `checksums.txt`: every approved line present; 216 PENDING lines identical to the reconciled inventory |
| Fast tier (Commit 10, before push) | 20 PASS, 0 FAIL, 1 ERROR (`check-control`: cannot read Tag-4, which did not yet exist — expected) |
| Full tier (Commit 10, before push) | 33 PASS, 0 FAIL, 5 BLOCKED, 2 REDUCED, 1 ERROR (the same expected `check-control` error). BLOCKED and REDUCED exactly as documented. Summary kept private (D13) |
| Rollback test (throwaway copy, revert staged only, never committed) | Full revert of Commit 10: the five files byte-identical to `7850891`; Tag-3 guard 12 passed, 0 failed, 216 PENDING identical |
| First CI run | Run 43466012229, attempt 1, commit `5f18335`: guard step failed with `fatal: couldn't find remote ref refs/tags/v0.7-tests-approved-4`; Node, packages and fast tier skipped. Expected |
| Branch | Frozen at Commit 10 from the push until Tag-4 was verified; no other commit was made in that time |
| Entry made by | Claude, 2026-11-13 17:38 UTC. Sources: Git on the commit, test runs in disposable copies of it, GitHub's API and the run logs |

## Tag-4 baseline acceptance — Part B (Tag-4 approval, creation and post-tag verification; evidence-only entry)

**Pre-tag evidence versus post-tag confirmation.** The pre-tag evidence in Part A2 was produced and reported to the owner before the Tag-4 decision. The post-tag confirmation below shows that the tag and CI behave as intended. Neither replaces the other.

| Field | Entry |
|---|---|
| Owner's Tag-4 instruction (verbatim, 2026-11-13 17:01 UTC, owner's Claude conversation) | "Create Tag-4. I explicitly authorise you to create and push "v0.7-tests-approved-4" against exactly commit "5f18335ff66cb151760abf495cf82920f7b290b3"." |
| Evidence the owner reviewed before instructing | The Commit 10 results in Part A2, reported to the owner after the push and before the 17:01 UTC instruction: commit hash, scope, F1, guard against Tag-3, fast and full tiers, rollback test, first CI run |
| D15 exception — what happened | Approved by the owner (Claude may create and push Tag-4 under a separate explicit instruction; departs from the README rule that Claude does not create or push baseline tags; reason: the owner's phone-first working without a convenient local Git workflow; applies to this closeout only). **Claude's tag push was refused:** at 17:02:02 UTC the connection was cut, and a single retry at 17:02:17 UTC returned HTTP 403. The tag never reached GitHub (no ruleset evaluation was recorded for it). Read-only investigation (owner-authorised, 17:13 UTC) found no cause in the repository's rulesets, tag protection, account permissions or credential expiry; the most likely cause is the Claude session's own network gateway blocking tag pushes (inferred, not provable from read-only checks). Claude removed its unpushed local tag. **The exception was therefore not used in the end.** |
| Who created Tag-4 | **The owner**, on GitHub's release page: pre-release "v0.7-tests-approved-4 (Tag-4 test baseline)", tag `v0.7-tests-approved-4`, target branch `development/v0.7` (then frozen at Commit 10), published 2026-11-13 17:22:37 UTC; GitHub's ruleset log records the tag creation as "pass" at 17:22:36 UTC. The release entry is kept |
| README | The README rule ("Claude does not create or push baseline tags") was upheld in practice. Reviewing that rule remains a later documentation item |
| Tag verification (read-only, 17:25:19 UTC) | `git ls-remote origin 'refs/tags/v0.7-tests-approved-4*'` returned exactly one line: `5f18335ff66cb151760abf495cf82920f7b290b3	refs/tags/v0.7-tests-approved-4` (a lightweight tag; no `^{}` line). The API reports the tag as pointing directly at commit `5f18335ff66cb151760abf495cf82920f7b290b3`, the Commit 10 hash in Part A2. The release and the tag reference the same commit |
| S1 read-back (17:25 UTC) | Active; includes `refs/tags/v0.7-tests-approved-*` and `refs/tags/v0.6`; no exclusions; rules `deletion` and `update`; no bypass actors; last updated 2026-11-12 00:03:28 UTC (unchanged). Three rulesets in total |
| Rule B | Not adopted (D5); no toggle needed |
| CI re-run | Run 43466012229, attempt 2, commit `5f18335`, branch `development/v0.7`, 17:25:52–17:27:12 UTC: every step succeeded. Guard: `check-control: 12 passed, 0 failed (baseline v0.7-tests-approved-4 = 5f18335)`, **0 PENDING**. Fast tier: `EXIT 0: no FAIL and no ERROR` |
| Guard against Tag-4 (local, Tag-4's own copy) | `check-control: 12 passed, 0 failed (baseline v0.7-tests-approved-4 = 5f18335)`; 0 FAIL; 0 PENDING |
| Post-tag full tier (local, Commit 10) | 34 PASS, 0 FAIL, **0 ERROR** (`check-control` now PASS 12), 5 BLOCKED, 2 REDUCED (exactly as documented), `EXIT 0`. Summary kept private (D13) |
| The 216 notices | **Resolved through the approved process:** the conditions of Part A's acceptance are met (pre-tag checks passed as recorded in Part A2; the owner separately instructed Tag-4; Tag-4 is verified on the Commit 10 hash), and the guard against Tag-4 reports 0 PENDING |
| New comparison baseline | `v0.7-tests-approved-4` → `5f18335ff66cb151760abf495cf82920f7b290b3`. CI's guard and the test runner both now compare against Tag-4 |
| Freeze end | Tag-4 verified at 17:25 UTC; the freeze ends with this evidence-only commit |
| Deviations | Only the D15 deviation above (Claude's tag push refused; the owner created the tag). No other deviation |
| Still open | D8 security checks outstanding by the owner's decision; all D14 limitations; guard limitations (plan Section 12.3); README rule review |
| Entry made by | Claude, 2026-11-13 17:38 UTC |

### Evidence (D13)

**Public, in `tests/logs/tag4/` (scanned before commit: no email addresses, credentials, IP addresses or local paths):**

| File | SHA-256 |
|---|---|
| `TAG4-01-guard-vs-tag3-5f18335.txt` | `586b3d9a1640d0cbe481967b33abb34c44982e9327c34adefff5fca0e9b99d65` |
| `TAG4-02-fast-5f18335.txt` | `c920d83801ffa97afe75fb7fbad4c1bf9e684775ade2d6aee062d8878dfbdd4f` |
| `TAG4-05-ci-attempt1-summary.txt` | `989d5c88d21d9444f96f43c4986453b2832e809a8c5b4001e74f867510cc9c42` |
| `TAG4-08-guard-vs-tag4-5f18335.txt` | `94dd781ffba01f716b6e8c81ed55b3d922f216e25114799eaa8f2290722ee767` |
| `TAG4-09-ci-attempt2-summary.txt` | `f64eb37225f798a3a6bdc29abeba1fcc43b17a70f3f7d4ba1bd5c56e0d95c42c` |
| `TAG4-rollback-guard-5f18335.txt` | `c95ed3b5ea3af57b297850f625feb515d3655efa5cc147c8a522b48ddd181868` |

**Private (held by the owner, not published):**

| File | SHA-256 |
|---|---|
| Pre-tag full-tier summary `TAG4-03-full-5f18335.txt` | `ab040352d94cba5214428a0f5619529a1fea3fac752220fdd1cbd21e00d343f8` |
| Post-tag full-tier summary `TAG4-10-posttag-full-5f18335.txt` | `0d7ba8e77f9a97ae402a00eed298e5cf52ff201efb625b6c253830776d8331fd` |
| Scope record `TAG4-04-commit10-scope.txt` | `265a66674483b32c8ccd9ee5349f9aa75b0abdfe10c6478f5fb32c63e1685adf` |
| CI log archives: attempt 1, attempt 2 | `fa051daa3d872404c1ecac92a793338f27394595953e8da445f03a4e4aa7f6e5`, `64d24e74a000da3e5ea4b1701f079811f2180820d12f9ee4bde9d3a5a3c6a861` |
| Detailed test logs: fast, full, post-tag full | `5e3017f31b5da798369296839c3c6fd8d88ca963f35102bca5705c824c5c0078`, `8cc2dbb5ca8437785734996be4c87d316bdd55b65752be0bb8aba4a41c4cb078`, `f165577f57ac3718be7259d9fcd051a9910fe812d9a29677de0d2d86858f82ee` |
| Private files listed in Part A | As recorded there |

---

## Correction and clarification entry — v0.7 closeout verification (2026-11-13 18:10 UTC)

Added after Tag-4, in an evidence-only commit. Parts A, A2 and B above are unchanged; this entry corrects omissions in them without rewriting them. Tag-4 still points to `5f18335ff66cb151760abf495cf82920f7b290b3`. No decision, test, count or protected file is changed.

**1. D8 security risks were not stated in this record** (relates to Part A, "D8 — owner security checks", which says "the related security risks remain as documented in the plan (Sections 15.2, 15.6, 15.7)", and Part B, "Still open"). Those plan sections are in a private document, so the risks were not visible here. They are stated now.

None of the five owner checks was performed, and none is passed:
- Authorised GitHub Apps
- Authorised OAuth Apps
- Repository collaborators
- Deploy keys
- Two-factor authentication

The owner decided at 16:30 UTC on 13 Nov 2026 to proceed with them outstanding. Until they are done, the following remain **UNKNOWN**:
- **(a)** the permissions of the GitHub connector route used in Claude sessions, which acts as MB20252025;
- **(b)** whether ChatGPT/OpenAI or any other app has, or had, access to this account or repository;
- **(c)** whether anyone besides the owner has collaborator access;
- **(d)** whether any deploy key, especially one with write access, exists;
- **(e)** whether two-factor authentication is enabled.

Known and unchanged:
- The Claude GitHub App has read/write access to code, workflows and Actions, and read-only Administration (OWNER-REPORTED).
- All actors appear as MB20252025 (D6).
- The holder of the SSH signing key on the commits is unknown.

**Consequence:** it cannot be ruled out that another app, person or key could push to this repository or create tags.

**2. D9 acceptance wording** (relates to Part A, row "Review (D9)", which records "Owner's decision: accepted"). The owner's decision, verbatim from the decisions message of 13 Nov 2026 at 16:20 UTC, was: "Accept the AI-led review process and its disclosed limitations." The owner therefore accepted, as a known limitation, that there was no independent human review. Errors shared by the drafting and reviewing AI may remain undetected. This is a remaining limitation alongside those listed in Part B, "Still open".

**3. Who created Tag-4** (relates to Part B, row "Who created Tag-4", which says "The owner"). This is **OWNER-REPORTED**. GitHub records the release author as MB20252025, which by itself cannot distinguish the owner from an agent (D6). What is verified: Claude's own tag push was refused, with no tag reaching GitHub, and the tag points to the correct commit.

**4. Where the private evidence is held** (relates to Part A, private-evidence table, "held by the owner"). The private files are in the following bundles, all delivered to the owner:
- **Final closeout bundle:** `TAG4-CLOSEOUT-EVIDENCE.zip`, 287,290 bytes, SHA-256 `96b6798feabb231cdd395d2e788dd52452d2ae34210052abccbda66c1b2ae9bc`. It holds `reconcile.py`, `RECONCILIATION-216.csv`, `PENDING-INVENTORY-7850891.csv`, the build log, the guard-limitation outputs, all pre- and post-tag logs, and the private full-tier summaries.
- **Earlier D9 handover bundle:** `D9-HANDOVER-v10-7850891.zip`, 273,258 bytes, SHA-256 `5d15aef757272e9e8d58ba55c98355b07d0c55c7217b7014582380f8f5bef193`. It holds `per-notice-breakdown.csv`, `GATE3-APPROVAL-REGISTER.csv` and `files-by-commit.csv`.
- **`CP1-Final-Review.zip`** (SHA-256 `dc494357867407763b945f62a82971a627117a0ca2339011dc6cae5d30ffd33a`). It was in neither bundle, so it was delivered to the owner separately when this entry was made.

Whether the owner has stored these files permanently is the owner's responsibility, and Claude does not verify it.

Entry made by Claude, 2026-11-13 18:10 UTC. Sources: the committed record at `5f18335` and `3686905`, Git, GitHub's read-only API, and the evidence files themselves.

---

## Correction entry — D9 quotation (2026-11-13 18:29 UTC)

The correction entry above (item 2) quotes the owner's D9 decision as "Accept the AI-led review process and its disclosed limitations." with a full stop inside the quotation marks. Checked character for character against the original, the owner's wording has **no full stop**. The original is the table row `D9| Accept the AI-led review process and its disclosed limitations` in the owner's decisions document, uploaded to the owner's Claude conversation at 16:20:10 UTC on 13 Nov 2026. An identical copy, with the same SHA-256 `8770c13467bf167b3f17f2158be7580c7d046d862b03ae054365b2e56a6904d3`, was uploaded again at 16:26:13 UTC.

The exact verbatim wording is: Accept the AI-led review process and its disclosed limitations

Only the punctuation inside the quotation is corrected. The substance of the owner's acceptance is unchanged.

Entry made by Claude, 2026-11-13 18:29 UTC.

---

## Tag-5 baseline acceptance — Part A (pre-tag acceptance record; inside the T5 switching commit)

Recorded by Claude on the owner's instruction ("T5 — Full Preparation Authority, With Owner-Controlled Commit Gate", 15 Nov
2026). Part A is not changed after the T5 commit exists; any correction is a separate, dated entry. Parts A2 (T5 commit
identification, the owner's commit approval and pre-tag results) and B (Tag-5 creation and post-tag verification) are added
afterwards, in Commit C. **Tag-5 does not exist when this Part A is written.** The owner creates Tag-5; Claude never creates or
moves it.

### Scope

| Field | Entry |
|---|---|
| Starting point | `development/v0.7` at `d33c105` (K7, closed), remote equal, working tree clean; Tag-4 `v0.7-tests-approved-4` → `5f18335`; no Tag-5 |
| What Tag-5 will approve | Everything in `checksums.txt` and `accepted-results.json` at the T5 commit. A baseline tag approves the whole state of its commit; it cannot approve part of one |
| Evidence covered | Universal Import v1 Stage 1 (`ec8def9`, `3b94ceb`) and Stage 2 K1–K7 (`e7b3d2f`, `01c565f`, `d33c105`), plus the T5 changes. Listed below in two parts, so the Stage 1 and Stage 2 evidence can be read and judged separately |
| Not covered | Stage 2 closure (needs Tag-5, green CI and Commit C); Stage 3 (unauthorised); engine correctness beyond what the tests show |
| Review | Prepared and reviewed by Claude. This is not independent human verification; shared mistakes can survive an AI reviewing its own work. Evidence was checked against Git, the files on disk and executed tests |

### The T5 switching commit: 8 files

| # | File | Change | Why |
|---|---|---|---|
| 1 | `tests/fixtures/library/01-Clean-Manufacturer/dataset.csv` | adds the field `Demand_Basis` = `shipments` after `Currency` (header and data line) | the owner's data definition (14 Nov 2026): Package 01's monthly demand quantities are shipments |
| 2 | `tests/fixtures/library/MANIFEST.sha256` | the `./01-Clean-Manufacturer/dataset.csv` line takes the new hash | the library-wide manifest must match the file |
| 3 | `tests/checksums.txt` | 3 lines: `dataset.csv` and `MANIFEST.sha256` (approved Tag-4 lines, changed) and `test-same-results.js` (a pending line, changed) | `check-protection` must match the files |
| 4 | `tests/test-same-results.js` | Proof B reads the supplied Package 01 files unchanged (no in-memory label). Its first check verifies, from the file on disk, that `dataset.csv` carries `Demand_Basis = shipments` exactly once, and that Stage 1 and the adapter use it. If the adapter refuses Package 01, the six figure checks each fail by name instead of the test crashing. The Proof B count is unchanged (7) | Proof B tests the real files |
| 5 | `.github/workflows/v07-tests.yml` | `TAG: v0.7-tests-approved-4` → `-5` | CI's guard uses the new baseline |
| 6 | `tests/accepted-results.json` | check-control `"tag"` `-4` → `-5`; no count changes | `run-all.sh` guard row |
| 7 | `tests/check-control.js` | default `--tag` `-4` → `-5` | a manual run without `--tag` judges against the current baseline (Tag-4 precedent) |
| 8 | `tests/V07-TEST-RECORD.md` | this Part A | the record of what Tag-5 approves |

**Eight, not nine.** An earlier list named nine files because it counted the manifest twice. There is one library-wide
`tests/fixtures/library/MANIFEST.sha256` and no separate Package 01 manifest. `tests/README.md` is a ninth file only if the owner
approves its diff with the others.

**Departure from the README procedure, step 1** ("the change to the control files is … committed … on its own"): this commit also
carries the Package 01 label and the Proof B change. A separate data commit before it would fail CI at the Tag-4 guard, because
two approved checksum lines change, and would stay red until Tag-5 (investigation of 14 Nov 2026). The single switching commit
was the agreed route.

### Evidence categories

| Category | What | Count |
|---|---|---|
| Approved (Tag-4) | `file`/`ref` lines in Tag-4's `checksums.txt` (3 references + 336 files) | 339 |
| … unchanged at T5 | present, byte-identical | 337 |
| … changed by T5 | `dataset.csv`, `MANIFEST.sha256`: approved lines whose hash changes (the guard FAILs them until Tag-5) | 2 |
| Pending before T5 | checksum lines added after Tag-4, at `d33c105` | 95 |
| … of which hash changed after introduction | `test-import-mapping.js` (`3b94ceb`), `test-import-engine-map.js` (`01c565f`), `test-import-adapter.js` (`d33c105`), and `test-same-results.js` (in T5) | 4 |
| Pending `accepted-results.json` changes | 5 new tests, 2 raised counts | 7 |
| New T5 evidence | the Package 01 label (files 1 and 2) and the Proof B change (file 4), with their 3 checksum lines | 3 lines |
| Tag-reference switches | workflow `TAG:`, `accepted-results.json` check-control `"tag"`, `check-control.js` default | 3 |

At the T5 commit, `checksums.txt` has 434 `file`/`ref` lines (3 references + 431 files = 336 approved + 95 added); none is removed.

### Reconciliation of the historical figures

| Figure | Where it appeared | What it counts | Check |
|---|---|---|---|
| 93 | Stage 1 record, end of Stage 1 | Tag-4 guard PENDING: 90 new checksum lines + 3 `accepted-results.json` changes | consistent |
| 94 | Tag-5 investigation (14 Nov), at `b5e17eb` | new checksum lines: 90 Stage 1 + 4 Stage 2 | consistent |
| 100 | the same, at `b5e17eb` | Tag-4 guard PENDING: 94 lines + 6 `accepted-results.json` changes | consistent |
| 102 (before K7) | the same, predicted for a switching commit on `b5e17eb` | 100 + the 2 changed approved lines' new versions | superseded by K7 |
| 102 (K7) | K7 record and fast tier at `d33c105` | 100 + `test-import-integrity.js` line + the `import-integrity` test | consistent; equal to the figure above by coincidence |
| 96 | Tag-5 investigation | lines to list at tagging (94 + 2) | now **97** (95 + 2), after K7 |
| **104** | Tag-4 guard on the T5 tree (15 Nov) | 97 checksum lines (95 new + 2 changed approved lines' new versions) + 7 `accepted-results.json` changes | **matches the inventory below, line by line** |

The guard prints PENDING lines cut at 120 characters, so this inventory was built from `checksums.txt` and
`accepted-results.json` at Tag-4 and at T5 directly, and every new hash was recomputed from the file on disk.

### Pending inventory, part 1: Stage 1 evidence (90 checksum lines)

| # | Path (under the application folder) | Previous hash | New hash | Introduced | Hash changed later | Purpose |
|---|---|---|---|---|---|---|
| 1 | `tests/fixtures/import-v1/faults/F01-stock-bad-row/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F01-stock-bad-row) |
| 2 | `tests/fixtures/import-v1/faults/F01-stock-bad-row/stock.csv` | new | `49797f383f0d9b7de3cd670dd9b912d6fb8992239a7b6c2727244b66079dedae` | ec8def9 | - | Stage 1 fault fixture (F01-stock-bad-row) |
| 3 | `tests/fixtures/import-v1/faults/F02-demand-2pct/demand.csv` | new | `9ea5689d949a93288573adeb88eb47634ab668a6b582cff2557a35739f23d0c6` | ec8def9 | - | Stage 1 fault fixture (F02-demand-2pct) |
| 4 | `tests/fixtures/import-v1/faults/F02-demand-2pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F02-demand-2pct) |
| 5 | `tests/fixtures/import-v1/faults/F03-demand-10pct/demand.csv` | new | `a1faac16f768972f64767cf44224daa61673809cb2cf2e5a2e5f303e5b0573d5` | ec8def9 | - | Stage 1 fault fixture (F03-demand-10pct) |
| 6 | `tests/fixtures/import-v1/faults/F03-demand-10pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F03-demand-10pct) |
| 7 | `tests/fixtures/import-v1/faults/F04-item-months/demand.csv` | new | `b22549cbe6fe0e86c5bd7fb1f45380dbed11f128e24c40752464c9924ff1df02` | ec8def9 | - | Stage 1 fault fixture (F04-item-months) |
| 8 | `tests/fixtures/import-v1/faults/F04-item-months/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F04-item-months) |
| 9 | `tests/fixtures/import-v1/faults/F05a-small-table-5pct/demand.csv` | new | `cbe577335e8716c74bf75a9902332730cb1ddcd58ce34640c621c3e4e9455662` | ec8def9 | - | Stage 1 fault fixture (F05a-small-table-5pct) |
| 10 | `tests/fixtures/import-v1/faults/F05a-small-table-5pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F05a-small-table-5pct) |
| 11 | `tests/fixtures/import-v1/faults/F05b-small-table-4pct/demand.csv` | new | `460827113fe1637b0ebd08be0720098f40a7b85536f4a39fee5fcb50fbdb1c72` | ec8def9 | - | Stage 1 fault fixture (F05b-small-table-4pct) |
| 12 | `tests/fixtures/import-v1/faults/F05b-small-table-4pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F05b-small-table-4pct) |
| 13 | `tests/fixtures/import-v1/faults/F06-no-po-table/mapping.json` | new | `1a70b8b91685359f44ceb004917d2c4c53345ff5f116d8ad234827765cea1472` | ec8def9 | - | Stage 1 fault fixture (F06-no-po-table) |
| 14 | `tests/fixtures/import-v1/faults/F07-cost-tbc/items.csv` | new | `1d23f07e95fa7a66e504877df05606f1828bec7757bc714aada925e04a3e6a5b` | ec8def9 | - | Stage 1 fault fixture (F07-cost-tbc) |
| 15 | `tests/fixtures/import-v1/faults/F07-cost-tbc/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F07-cost-tbc) |
| 16 | `tests/fixtures/import-v1/faults/F08-dup-demand-identical/demand.csv` | new | `c0bb69f2eaf0b75d7681e78c55ff9abab5266ce59c03a4ffc918339a63c384c2` | ec8def9 | - | Stage 1 fault fixture (F08-dup-demand-identical) |
| 17 | `tests/fixtures/import-v1/faults/F08-dup-demand-identical/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F08-dup-demand-identical) |
| 18 | `tests/fixtures/import-v1/faults/F09-dup-differs-unmapped/mapping.json` | new | `015df4a1bafe8d61b81f603806a3e6709382c3ab575e353356b8926aeb767f51` | ec8def9 | - | Stage 1 fault fixture (F09-dup-differs-unmapped) |
| 19 | `tests/fixtures/import-v1/faults/F09-dup-differs-unmapped/stock.csv` | new | `0c2782047b6c65082ab5949aaa3457824a793b8f55d48b3cd06e576d14f73255` | ec8def9 | - | Stage 1 fault fixture (F09-dup-differs-unmapped) |
| 20 | `tests/fixtures/import-v1/faults/F10-dup-po-with-id/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F10-dup-po-with-id) |
| 21 | `tests/fixtures/import-v1/faults/F10-dup-po-with-id/po_lines.csv` | new | `0c06201017b202d7f4ba71995e451be3296021abf7a768b68e9ce7ff67f1c6b4` | ec8def9 | - | Stage 1 fault fixture (F10-dup-po-with-id) |
| 22 | `tests/fixtures/import-v1/faults/F11-dup-po-no-id/mapping.json` | new | `9bcb4a357c9792fbcb7c37702072fa9e572a09969e7779294319aab7e1c5679d` | ec8def9 | - | Stage 1 fault fixture (F11-dup-po-no-id) |
| 23 | `tests/fixtures/import-v1/faults/F11-dup-po-no-id/po_lines.csv` | new | `bcf8ccbb70f604224575f3438a0b477b26161325b1ff5cb7a8bdf0b9a6bf5d2a` | ec8def9 | - | Stage 1 fault fixture (F11-dup-po-no-id) |
| 24 | `tests/fixtures/import-v1/faults/F12-dup-item-conflict/items.csv` | new | `7d98bb9bf3e7ffb28f369407de60905317cbb15fcc287054b49ebdd982e41748` | ec8def9 | - | Stage 1 fault fixture (F12-dup-item-conflict) |
| 25 | `tests/fixtures/import-v1/faults/F12-dup-item-conflict/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F12-dup-item-conflict) |
| 26 | `tests/fixtures/import-v1/faults/F13-currency-usd/mapping.json` | new | `bdc6a525bdcfc1567b744cb1583fbfa3088bec1e24c5e07044863a7a42703f85` | ec8def9 | - | Stage 1 fault fixture (F13-currency-usd) |
| 27 | `tests/fixtures/import-v1/faults/F14-currency-dollar-value/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F14-currency-dollar-value) |
| 28 | `tests/fixtures/import-v1/faults/F14-currency-dollar-value/stock.csv` | new | `9d232f001ffc88f96fc472f9b6ab426b74ef3fa522c0c1fa4db00c78242130b5` | ec8def9 | - | Stage 1 fault fixture (F14-currency-dollar-value) |
| 29 | `tests/fixtures/import-v1/faults/F15-currency-unconfirmed/mapping.json` | new | `e52abe683fc18b9e79db100c70bec0cb910e22ed0ad3e2820ad927fc68851ff8` | ec8def9 | - | Stage 1 fault fixture (F15-currency-unconfirmed) |
| 30 | `tests/fixtures/import-v1/faults/F16-currency-undeclared/mapping.json` | new | `a7c56f7c223b7ca752d30b0a3f070c6e783d161f449f83a6a3f33e3ed6f6b378` | ec8def9 | - | Stage 1 fault fixture (F16-currency-undeclared) |
| 31 | `tests/fixtures/import-v1/faults/F17-no-money-no-currency/mapping.json` | new | `e779dcc09f924d5e8b2bf5765b38fd0a45b1956e76eb325565f2627a7709620d` | ec8def9 | - | Stage 1 fault fixture (F17-no-money-no-currency) |
| 32 | `tests/fixtures/import-v1/faults/F18-unit-mismatch/mapping.json` | new | `b7641672c1d11d335c4ceaabf306acdd623d9cf1a7b7e5c10552eb7c10d3554e` | ec8def9 | - | Stage 1 fault fixture (F18-unit-mismatch) |
| 33 | `tests/fixtures/import-v1/faults/F18-unit-mismatch/stock.csv` | new | `6ab23d543ae962c8d0a6e856ffff99db7c679c67886a50638654f6ef3cf3d5ed` | ec8def9 | - | Stage 1 fault fixture (F18-unit-mismatch) |
| 34 | `tests/fixtures/import-v1/faults/F19-corrupt-xlsx/items.xlsx` | new | `e7af8d80d95c0188eba07b92abbc8772a53823180dd2bd48f99c8292f9ee15b4` | ec8def9 | - | Stage 1 fault fixture (F19-corrupt-xlsx) |
| 35 | `tests/fixtures/import-v1/faults/F19-corrupt-xlsx/mapping.json` | new | `6717b3323aaa44b29e9aa3af72a1865cf4a0885d1f64d12ffe270b9d8efe2395` | ec8def9 | - | Stage 1 fault fixture (F19-corrupt-xlsx) |
| 36 | `tests/fixtures/import-v1/faults/F20-not-a-zip-xlsx/items.xlsx` | new | `a58cd5181f1c9dbca2673b3e4c5882a32634ace840af81a741c1bf4bc693b973` | ec8def9 | - | Stage 1 fault fixture (F20-not-a-zip-xlsx) |
| 37 | `tests/fixtures/import-v1/faults/F20-not-a-zip-xlsx/mapping.json` | new | `6717b3323aaa44b29e9aa3af72a1865cf4a0885d1f64d12ffe270b9d8efe2395` | ec8def9 | - | Stage 1 fault fixture (F20-not-a-zip-xlsx) |
| 38 | `tests/fixtures/import-v1/faults/F21-wrong-type/items.pdf` | new | `77d362fcea673ea6274e4471021c59d418a386adfe0df95c26a6b71216c9bb59` | ec8def9 | - | Stage 1 fault fixture (F21-wrong-type) |
| 39 | `tests/fixtures/import-v1/faults/F21-wrong-type/mapping.json` | new | `b479a3753e3485ba9f7ab96d0d3adefed4ef012c5bdc9ebcc573b297721d0048` | ec8def9 | - | Stage 1 fault fixture (F21-wrong-type) |
| 40 | `tests/fixtures/import-v1/faults/F22-empty-file/items.csv` | new | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | ec8def9 | - | Stage 1 fault fixture (F22-empty-file) |
| 41 | `tests/fixtures/import-v1/faults/F22-empty-file/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F22-empty-file) |
| 42 | `tests/fixtures/import-v1/faults/F23-headings-only/items.csv` | new | `d88b076c7d6fdccef6b8d7ae6bd227980e57243b681ee7a9e58d1e0aec66fcd7` | ec8def9 | - | Stage 1 fault fixture (F23-headings-only) |
| 43 | `tests/fixtures/import-v1/faults/F23-headings-only/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F23-headings-only) |
| 44 | `tests/fixtures/import-v1/faults/F24-missing-column/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F24-missing-column) |
| 45 | `tests/fixtures/import-v1/faults/F24-missing-column/stock.csv` | new | `4667a783552a974e30288786a0161bdaa414911a9dadb85dab352dd5abf09788` | ec8def9 | - | Stage 1 fault fixture (F24-missing-column) |
| 46 | `tests/fixtures/import-v1/faults/F25-currency-gbp-codes/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F25-currency-gbp-codes) |
| 47 | `tests/fixtures/import-v1/faults/F25-currency-gbp-codes/stock.csv` | new | `43194b1004cb252df881c3c23dc98b4e9802603ab1389b24083de3540383605d` | ec8def9 | - | Stage 1 fault fixture (F25-currency-gbp-codes) |
| 48 | `tests/fixtures/import-v1/faults/F26-currency-code-after/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F26-currency-code-after) |
| 49 | `tests/fixtures/import-v1/faults/F26-currency-code-after/stock.csv` | new | `e967d8e63f9821c225cf6cea307791203730406d5e3da891d693a412baa0f532` | ec8def9 | - | Stage 1 fault fixture (F26-currency-code-after) |
| 50 | `tests/fixtures/import-v1/faults/F27-currency-ordinary-text/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F27-currency-ordinary-text) |
| 51 | `tests/fixtures/import-v1/faults/F27-currency-ordinary-text/stock.csv` | new | `2dc08521ed562f0c24594924c73ace6115ead3925e537e59d657f25f27340580` | ec8def9 | - | Stage 1 fault fixture (F27-currency-ordinary-text) |
| 52 | `tests/fixtures/import-v1/faults/F28-currency-separate-files/items.csv` | new | `35d45e97040bdc3c8af0d0c65d7afce7acb383711c0f4aef5cc67009d2749f8b` | ec8def9 | - | Stage 1 fault fixture (F28-currency-separate-files) |
| 53 | `tests/fixtures/import-v1/faults/F28-currency-separate-files/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F28-currency-separate-files) |
| 54 | `tests/fixtures/import-v1/faults/F29-currency-contradictory/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F29-currency-contradictory) |
| 55 | `tests/fixtures/import-v1/faults/F29-currency-contradictory/stock.csv` | new | `89bd3c935a8a307cf154ff0c3b82ca7a3e4ec6ffb3eda98b9add8c2a73168409` | ec8def9 | - | Stage 1 fault fixture (F29-currency-contradictory) |
| 56 | `tests/fixtures/import-v1/faults/F30-history-suggested-code/demand.csv` | new | `1156f38ab39afe345d54223169f0f79a449cc0d798c5760762e2c661b03ad8c0` | ec8def9 | - | Stage 1 fault fixture (F30-history-suggested-code) |
| 57 | `tests/fixtures/import-v1/faults/F30-history-suggested-code/items.csv` | new | `c445c0ccfd0593dbb2d89dedcc353721dda7d1453ded266d357363f755d6e28c` | ec8def9 | - | Stage 1 fault fixture (F30-history-suggested-code) |
| 58 | `tests/fixtures/import-v1/faults/F30-history-suggested-code/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F30-history-suggested-code) |
| 59 | `tests/fixtures/import-v1/faults/F31-history-unlinked-6pct/demand.csv` | new | `8a3ca1dd3ecae722d4b76e4d88d9c74adab15bbf3d209a7be63164f3a7e64a89` | ec8def9 | - | Stage 1 fault fixture (F31-history-unlinked-6pct) |
| 60 | `tests/fixtures/import-v1/faults/F31-history-unlinked-6pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F31-history-unlinked-6pct) |
| 61 | `tests/fixtures/import-v1/faults/F32-history-unlinked-4pct/demand.csv` | new | `9b1b6d4e91d6d06229795223a0072c83d665601f27b4bf73ec6f04bd22d70953` | ec8def9 | - | Stage 1 fault fixture (F32-history-unlinked-4pct) |
| 62 | `tests/fixtures/import-v1/faults/F32-history-unlinked-4pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F32-history-unlinked-4pct) |
| 63 | `tests/fixtures/import-v1/faults/F33-future-dated/demand.csv` | new | `1ff14df30854ed86bd0c8af59a38397d653605623c05e7265e92d9ecfd94e746` | ec8def9 | - | Stage 1 fault fixture (F33-future-dated) |
| 64 | `tests/fixtures/import-v1/faults/F33-future-dated/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F33-future-dated) |
| 65 | `tests/fixtures/import-v1/faults/F34-stock-date-mismatch/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F34-stock-date-mismatch) |
| 66 | `tests/fixtures/import-v1/faults/F34-stock-date-mismatch/stock.csv` | new | `344d666999dcfd0d18493f560f7dd6cc412b479a66e0b3cffb83d32fa33b860f` | ec8def9 | - | Stage 1 fault fixture (F34-stock-date-mismatch) |
| 67 | `tests/fixtures/import-v1/faults/F35-history-unlinked-5pct-exact/demand.csv` | new | `9ec6ac54893a51247293b74679677efc2e4de0a16e4085bae5184f2b6a4bdb17` | ec8def9 | - | Stage 1 fault fixture (F35-history-unlinked-5pct-exact) |
| 68 | `tests/fixtures/import-v1/faults/F35-history-unlinked-5pct-exact/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F35-history-unlinked-5pct-exact) |
| 69 | `tests/fixtures/import-v1/faults/F36-history-linked-6pct/demand.csv` | new | `1cc6f9ce064f87fbffd884de8f6c80de8f00d69cff32de442d12e5a460e1b11a` | ec8def9 | - | Stage 1 fault fixture (F36-history-linked-6pct) |
| 70 | `tests/fixtures/import-v1/faults/F36-history-linked-6pct/mapping.json` | new | `3e0c43030b4c074fc4ad95e263c38f8bf9c1c0bbb19d2a2a535a9f06b9a0e485` | ec8def9 | - | Stage 1 fault fixture (F36-history-linked-6pct) |
| 71 | `tests/fixtures/import-v1/faults/base/demand.csv` | new | `1814ae340b07f16b6684ce55c7141a9c16a84d050e82fada451ee9a2f94ceac3` | ec8def9 | - | Stage 1 fault fixture (base) |
| 72 | `tests/fixtures/import-v1/faults/base/items.csv` | new | `556007d1a9e1297f7ccd83a1ff55d9f70c345b3816c056f385e0841c540da364` | ec8def9 | - | Stage 1 fault fixture (base) |
| 73 | `tests/fixtures/import-v1/faults/base/po_lines.csv` | new | `df893702b50a609562f7ceeec9c26f697fcabcd9f89641df3e0417b945c14d1a` | ec8def9 | - | Stage 1 fault fixture (base) |
| 74 | `tests/fixtures/import-v1/faults/base/stock.csv` | new | `fd146f707c8ad7e0288eac14c950899927766ae3e17c4d13499583742a7e3a9e` | ec8def9 | - | Stage 1 fault fixture (base) |
| 75 | `tests/fixtures/import-v1/faults/base/suppliers.csv` | new | `af0b443944471a611f2b5fbb63050d94dee43c9524c2140ca1df62b026c7dd7b` | ec8def9 | - | Stage 1 fault fixture (base) |
| 76 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Jobs.csv` | new | `7f7f320cb8e368ef8ae18e521471fbeb115670f08358bfa189e5fd23d5e083f6` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 77 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Monthly_Sales.csv` | new | `4206b729fed9541992d527e0b35de8414af24c0e0fbd23b58b74af6c345745b5` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 78 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Products.csv` | new | `8d9861f449473a81531741d450366f02e6dbc76a5d8d98cd1f0dee47c02ba6e0` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 79 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Purchase_Orders.csv` | new | `ee9c02d95b03dd32f81640a489f627cddc762ec1b9cb47ec51783b15e2b665ad` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 80 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Recipes.csv` | new | `50a06ce6a16b6fb1317072fb55abbd81dec7db5070f3a8be9217e4a1e3107582` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 81 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Sites.csv` | new | `c81bd291238a20c5271bc53184e334cab4200b0f742cf2d4d753ee1979e7219d` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 82 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Stock_Report.csv` | new | `0632a2592430a796f771029d6b921995306b2aa656f385dd9d78c5daa2e4446e` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 83 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Vendor_Parts.csv` | new | `0de5b926aa5d673ea70bec8b1172c5a2348b9086362a738422e01b03a404d98a` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 84 | `tests/fixtures/import-v1/layouts/L1-alt-headings/Vendors.csv` | new | `48d1e67894730973e9e61a7f0ec7cf03d6ee9db963dad7a477ecb73028448e1a` | ec8def9 | - | Stage 1 layout fixture (L1-alt-headings) |
| 85 | `tests/fixtures/import-v1/layouts/L2-erp-workbook/ERP_Extract.xlsx` | new | `78fbcab13261db96b16beb225de47f816e1e2da7d545838010ac0613f94a3f2c` | ec8def9 | - | Stage 1 layout fixture (L2-erp-workbook) |
| 86 | `tests/fixtures/import-v1/mappings/L1-alt-headings.mapping.json` | new | `6842d0006a3bc3ed8c6be94b1b977c6ecc22491e8c5ebfd7a86a57e8b94fcba8` | ec8def9 | - | Stage 1 saved mapping |
| 87 | `tests/fixtures/import-v1/mappings/L2-erp-workbook.mapping.json` | new | `5d087bb3ff3af9c7fe75f8535aa8567b4a430511de388ec4c7b71e4e7228c719` | ec8def9 | - | Stage 1 saved mapping |
| 88 | `tests/fixtures/import-v1/mappings/package-02.mapping.json` | new | `5af4dbb9a50224f1a492d0df769b5f701d5aba9dcd762a554e00779de0260da8` | ec8def9 | - | Stage 1 saved mapping |
| 89 | `tests/test-import-mapping.js` | new | `5fbf3e3f62e27e44626ef0bc6b4bfa9913506b53d6796fd93702dd1df28d0703` | ec8def9 | 3b94ceb | Stage 1 mapping and validation test (import-mapping) |
| 90 | `tests/tools/import-v1/make-stage1-fixtures.js` | new | `ed5e24e2e7f96a0ba17737546f300b9c41e6d38ba710205bb20ae64676c560c6` | ec8def9 | - | Stage 1 fixture generator |

### Pending inventory, part 2: Stage 2 evidence (5 checksum lines)

| # | Path (under the application folder) | Previous hash | New hash | Introduced | Hash changed later | Purpose |
|---|---|---|---|---|---|---|
| 1 | `tests/test-import-engine-map.js` | new | `7a4836b4ed4c37f65789ff80ce37d0f003154afc42358603f1aa71f47ddbdd34` | e7b3d2f | 01c565f | Stage 2 engine-map and cell-writing test (import-engine-map) |
| 2 | `tests/test-import-adapter.js` | new | `38ff08dcd743db4ec03bf91ea14bd374ca2a60b5c9d4366c04d7d5f9821d51f6` | 01c565f | d33c105 | Stage 2 adapter and result-gate test (import-adapter) |
| 3 | `tests/test-same-results.js` | new | `9e9c0264356dff0606c48a48088ba4afcb7ff3cfaa133683694031353af07d59` | 01c565f | T5 | Stage 2 same-results proofs A, B, C (same-results) |
| 4 | `tests/tools/import-v1/reverse-eight-sheet.js` | new | `4685961bfc83a0ded57a95deeccb054151c75c97c5705798b91c1440de207ec7` | 01c565f | - | Stage 2 test-only reverse converter (Proof A) |
| 5 | `tests/test-import-integrity.js` | new | `305592ee32b2a8f5763b0d82c09f8273658cc8cdebef9beced847cd85bed97bd` | d33c105 | - | Stage 2 K7 integrity test (import-integrity) |

### Pending inventory, part 3: T5 changes to approved lines (2)

| # | Path (under the application folder) | Previous hash | New hash | Introduced | Hash changed later | Purpose |
|---|---|---|---|---|---|---|
| 1 | `tests/fixtures/library/01-Clean-Manufacturer/dataset.csv` | `ff64d39d102de33c46ec012639161a32e63959339a15d009ae2378a68ee90662` | `0dbaea1cbc229ed5f3fff336c5c2b3a0a5fea156e1d92740f4c0d8716d4cce21` | (Tag-4) | T5 | Package 01 dataset file: Demand_Basis = shipments (T5) |
| 2 | `tests/fixtures/library/MANIFEST.sha256` | `94047192a3dd2b2c7a46ed77caf0d0c1957558b54ced42d314417d44ce4a4c33` | `cd8111855aaf079481b68115191fcc312282acf9a87eb8517d9ff74986377e3c` | (Tag-4) | T5 | Library manifest: dataset.csv line (T5) |

`test-same-results.js` (part 2) changes in T5 to `9e9c0264356dff0606c48a48088ba4afcb7ff3cfaa133683694031353af07d59`. That hash was recalculated
from the file; the pre-K7 note's value (`c79be62e…`) is not reused.

### Pending inventory, part 4: `accepted-results.json` (7 changes; the tag field is a switch, not a pending item)

| # | Test | Tag-4 | T5 | Introduced and changed | Stage |
|---|---|---|---|---|---|
| 1 | `check-protection` | 339 | 434 | `ec8def9` 429 (+90), `e7b3d2f` 430, `01c565f` 433, `d33c105` 434: one per new protected file | Stage 1 + Stage 2 |
| 2 | `test-a1-static` | 23 | 29 | `ec8def9` 25, `e7b3d2f` 27, `01c565f` 29: one per new `js/import` module | Stage 1 + Stage 2 |
| 3 | `import-mapping` | — | 976 | new in `ec8def9` (761); 976 in `3b94ceb` | Stage 1 |
| 4 | `import-engine-map` | — | 276 | new in `e7b3d2f` (246); 276 in `01c565f` (EM2) | Stage 2 |
| 5 | `import-adapter` | — | 346 | new in `01c565f` | Stage 2 |
| 6 | `same-results` | — | 356 | new in `01c565f`; Proof B changes in T5, count unchanged | Stage 2 |
| 7 | `import-integrity` | — | 386 | new in `d33c105` (K7) | Stage 2 |

No test is removed and no count is lowered.

### Expected guard and CI behaviour

- **Tag-4 guard on the T5 commit:** `check-control: 9 passed, 3 failed (baseline v0.7-tests-approved-4 = 5f18335)`. The three FAIL
  lines are the intended changes: `check-control.js` changed; `.github/workflows/v07-tests.yml` changed; `checksums.txt` 2 approved
  lines changed (`dataset.csv`, `MANIFEST.sha256`). Plus 104 PENDING. The `accepted-results.json` tag switch is not reported,
  because that check looks only for weakening.
- **First CI run of the T5 commit:** expected to fail at the guard step with `couldn't find remote ref
  refs/tags/v0.7-tests-approved-5`. That is the transition failure; it is recorded and not fixed with another commit.
- **After the owner creates Tag-5 on the T5 commit:** the CI re-run is expected to pass, with the guard against Tag-5 reporting
  12 passed, 0 failed and 0 PENDING.

### Stage 2 statements required by the K7 record

The Stage 2 record (K7, "What the T5 acceptance record must state") requires these to be stated here:
- **Contract changes:** the import adapter changed from AD1 to AD2 (exclusions of items blocked for every analysis, scrap
  classification) and the result gate from RG1 to RG2 (rules R1–R8). `test-import-adapter.js` case 12 was revised for the new
  dependency behaviour (P2's ABC class and cumulative share are withheld; every other field equals the engine's, with the same
  field set).
- **Engine change (E-1, in K7):** `calculations.js`: blank, whitespace-only or missing scrap is 0% with a High warning; unreadable
  scrap is left out and its orders are "Insufficient information", with a High warning naming the affected materials. The adapter
  writes `SCRAP_UNREADABLE` for invalid lines. Engine JavaScript is protected by behaviour tests, not checksums, so Tag-5 does not
  checksum `calculations.js`; the golden and confidence snapshots and all 17 fixture workbooks are unchanged by it.
- **L3:** Stage 1's exact unit matching ("EA" is not "each") removes such an item from the whole analysis (F18: M0001). The rule
  is unchanged.
- **L7:** a bare scrap number is a fraction: "0.5" means 50% and "1" means 100%. Unchanged.
- **Route differences left open:** a scrap number stored as text ("0.02") and an out-of-range number (1.5); owner decisions.
- **Test evidence:** `import-integrity` is 77 assertions run in 5 time zones (386 with the identity check). The mutation evidence
  is the corrected one in the Stage 2 record (24 mutations, each detected by named assertions), not the original K7 claim.
- **Stage 3 design guidance (not built):** show `gated.disclosures` above the totals; include the unit-conversion hint; show
  clearly which figures are withheld, caveated or based on an assumption. For figures affected by exclusions, the K7 review
  recommended an "analysed items only" marker rather than a "changed" marker computed from contaminated data.

### Known limitations accepted with this baseline

- Five BLOCKED tests (`test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility`, `phase2-comparison`,
  `test-paging-chrome`) and two REDUCED (`test-phase1` 57 of 125, `test-uom` 110 of 164): known gaps, not passes.
- GitHub Actions runs the **fast tier only**; the full tier is local-only unless separately configured.
- No physical Android testing.
- `characterisation-lead-time` records known defects (H3, H4, F7).
- Guard limitations: pending lines are not protected between tags (a pending file and its line can change together without
  notice); the guard cuts PENDING lines at 120 characters; some `accepted-results.json` fields are not compared.
- D5, D6 and the D8 security checks remain as recorded for Tag-4.
- After T5, `test-import-integrity.js` still adds `Demand_Basis` to its in-memory copy of Package 01, so its Package 01 input
  carries the column twice. Stage 1 renames the second one `Demand_Basis_2` and reports it as not imported ("Please check"). No
  result changes (386/386 pass); the in-memory step is now redundant.
- Deferred findings, recorded in the Stage 2 record (K7, "What the T5 acceptance record must state"):
  - negative finite scrap: zero or negative requirements on the direct route; the import route rejects it (HIGH);
  - B14: bought-and-sold items refused (HIGH for planning);
  - out-of-range scrap (1.5) and "0.02" stored as text: route differences, owner decisions;
  - feasibility pool: insufficient orders reserve nothing, but the "Blocking materials" column can list their short lines
    (MEDIUM);
  - N1 negative delays (MEDIUM); L3 unit aliases; L7 percentage input;
  - the direct-route incomplete-usage warning to stay prominent;
  - BOM row order recorded as a contract (option (a) not adopted).

### Stage 3 programme (planning frame only; Stage 3 is not authorised)

These are grouped planning areas, not a task list.

- **(a) Data-quality corrections:** L7 percentage input, N1 negative delays and warning prominence.
- **(b) Scrap policy:** investigate the engine's gross-requirement formula, including the additive calculation
  "quantity × (1 + scrap)" against division by yield, "quantity ÷ (1 − scrap)". Propose one consistent policy for both upload
  routes before any change (it includes the out-of-range, negative and text-number cases above).
- **(c) Bought-and-sold capability:** B14, a substantial data-model and logic extension.
- **(d) Feasibility display and unit handling:** L3 unit aliases, and the distinction between displayed blocking materials
  and actual material reservation.

### Acceptance

The owner's approval of the T5 commit (the words "commit T5 approved", verbatim, with its time) and the owner's creation of
Tag-5 are recorded in Parts A2 and B, because this Part A is written before both. Approving the commit approves this record of
what Tag-5 will contain; Tag-5 itself takes effect only when the owner creates it on the T5 commit and it is verified there.

What approval does not state: that any historical change was authorised beforehand; that the synthetic test data or the
characterisation test describes correct business behaviour; that BLOCKED or REDUCED tests pass; that physical Android testing
was done; that the software is free of defects; or that every possible unauthorised future change is prevented.

Entry made by Claude, 2026-11-15 04:40 UTC.

### Tag-5 Part A — dated correction (15 Nov 2026, T5 self-audit; working tree, not committed)

Part A is not changed after the T5 commit (`f0e81bb30521a4e798005b0a51b4a531b807441e`). These corrections are a separate entry,
found in Claude's self-audit of T5 (not an independent review):

1. **Nine files, not eight.** Part A's table, "The T5 switching commit: 8 files", lists eight files and says `tests/README.md` is
   a ninth only if the owner approves its diff. The owner approved it ("Tag-5 — Final Commit and Push Authorisation", 15 Nov
   2026), and the T5 commit contains **nine files**: the eight in the table plus `tests/README.md` (applied exactly from the
   prepared diff). The other statements of Part A are unchanged by the ninth file: `tests/README.md` is not checksum-protected
   and no test reads it.
2. **The approval wording.** Part A says Parts A2 and B will record "the words 'commit T5 approved', verbatim". The owner's
   approval was instead given by that instruction, which authorised the commit and push of the nine files. Part A2 records the
   approval as it was actually given, not the anticipated phrase.
3. **What the PENDING items are.** The 104 PENDING items listed in Part A are inventory and protection coverage: each is a file
   or count that Tag-5 will protect against unnoticed change. Being in the inventory is not approval before Tag-5 exists, and
   being protected by Tag-5 is not functional validation of the file or of the behaviour it tests (see Part A, "What approval
   does not state").
4. **README wording before the tag.** At `f0e81bb`, `tests/README.md` calls Tag-5 "current" and says it "accepts" the
   evidence. That is true only once the owner creates Tag-5 on `f0e81bb`; until then Tag-4 is the approved baseline. Tag-4's
   switching commit (`5f18335`) used the same anticipatory wording. It is not changed, because it becomes accurate when the tag
   is created on that commit.
5. **Guard truncation, precisely.** Part A says the guard "cuts PENDING lines at 120 characters". Precisely: `check-control.js`
   (line 58) cuts the text of each new `checksums.txt` line to 120 characters before printing it, so long paths are cut; the
   printed PENDING lines are up to about 163 characters. The inventory was built from the files, not from these lines.

### Tag-5 — Commit C corrections, Tag-5 creation and post-tag CI (15 Nov 2026)

*Added in Commit C, after Tag-5. Part A above is the original pre-tag record and is unchanged; the dated correction entry
above (points 1–5) was written in the T5 self-audit and is committed here unchanged. Where this section and Part A differ, this
section is authoritative.*

**Tag-5 and post-tag CI (verified facts):**
- Tag `v0.7-tests-approved-5` was published by the owner through GitHub Releases (pre-release), targeting `development/v0.7`. An
  earlier attempt by Claude to push the tag from its session was refused by the session's network proxy (HTTP 403) and was not
  retried. `git ls-remote origin` and the GitHub API show the tag as a lightweight tag whose object is the commit
  `f0e81bb30521a4e798005b0a51b4a531b807441e` (no separate tag object). Tag-4 is unchanged at `5f18335`; `main` is unchanged at
  `8117c72`.
- Post-tag CI: run 43680939374, attempt 2 (the single re-run under `tests/README.md` step 6), workflow "v0.7 tests", commit
  `f0e81bb30521a4e798005b0a51b4a531b807441e`, https://github.com/MB20252025/Chain-Genius-Consulting/actions/runs/43680939374,
  14:10:56–14:15:24 UTC: **success**, every step succeeded. Guard: `check-control: 12 passed, 0 failed (baseline
  v0.7-tests-approved-5 = f0e81bb)`, 0 PENDING. Fast tier: 25 tests passed (+ pre-flight), 0 FAIL, 0 ERROR, 0 BLOCKED,
  0 REDUCED; `EXIT 0`. Evidence artifact `t2-evidence-ci-43680939374-2-20261115T141104Z` (36,414 bytes; zip SHA-256 per the log
  `49903e44988feaa14a6aaab8b1839224534e854117c431b940f83b18a0b2a01d`).
- Against the pre-tag T5 evidence: `check-control` changed from ERROR (Tag-5 did not exist) to PASS, as expected; no
  previously passing test failed. CI runs the fast tier only; the five BLOCKED and two REDUCED tests are full-tier items, so
  this run does not report on them (point 5).

**Eight-file correspondence (verified before Tag-5 was created).** The eight files named in the T5 preparation instruction
(document `f85d1fa1`, lines 63–70) were compared with the files of commit `f0e81bb` (`git show --name-status`). The commit has
nine files; its eight non-README files correspond exactly to the eight named, with none missing, substituted or added
(`dataset.csv` and `MANIFEST.sha256` each occur once in the commit, so the short names are unambiguous). Paths are under
`applications/inventory-intelligence-engine/` except the workflow:
1. `tests/fixtures/library/01-Clean-Manufacturer/dataset.csv`
2. `tests/fixtures/library/MANIFEST.sha256`
3. `tests/checksums.txt`
4. `tests/test-same-results.js`
5. `.github/workflows/v07-tests.yml`
6. `tests/accepted-results.json`
7. `tests/check-control.js`
8. `tests/V07-TEST-RECORD.md`

The ninth file is `tests/README.md`.

**Corrections (in the owner's required order):**

1. **Dataset authorisation.** K6 (`b5e17eb`) documented the rationale (the owner's definition of Package 01's demand as
   shipments) and prepared the exact change, but explicitly did not commit it ("Prepared change for the Tag-5 approval step
   (notes only; not committed)") and left it to the owner's approval at the Tag-5 step. T5 applied it following the owner's
   later instructions. The repository's pre-T5 evidence is therefore not Explicit. Classification: **Inferred — by reference
   across two documents, not explicit in a single document.** (Claude's earlier statement that the change was "authorised in
   writing before T5" overstated this.)
2. **The approval, verbatim.** The owner accepted (15 Nov 2026) that these two quotations together constitute the approval:
   - Document `f85d1fa1`, "T5 — Full Preparation Authority, With Owner-Controlled Commit Gate", which named and agreed the
     change and authorised preparation:
     > 1. "dataset.csv" — Package 01, "Demand_Basis = shipments".
   - Document `67326345`, "Tag-5 — Final Commit and Push Authorisation", which authorised committing the eight prepared files:
     > The approved change consists of exactly nine files:
     >
     > - The eight files already prepared for Tag-5.
     > - "tests/README.md", using the previously prepared "README-proposed.diff".

   Authorisation was by reference across these two documents. These quotations are the durable evidence of the actual
   authorisation. This authorisation chain was identified during a self-audit of the T5 approval process. The cross-document interpretation has not been independently reviewed.
3. **K6 clarification.** "Documentation only" in K6's commit message describes what K6 committed (two Markdown records). It does
   not mean K6 lacked the recorded rationale or decision: both are in K6's Stage 2 record.
4. **File count.** Part A's statement "The T5 switching commit: 8 files" is kept as originally written. T5 actually changed
   **nine** files (the eight above plus `tests/README.md`). This correction is authoritative.
5. **Test limitations.** The 104 PENDING items are now protected inventory coverage under Tag-5, not functional validation. The
   five BLOCKED tests (`test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility`, `phase2-comparison`,
   `test-paging-chrome`) and the two REDUCED tests (`test-phase1`, `test-uom`) keep their limitations; passing the full tier
   does not resolve them.
6. **K7 label redundancy.** `test-import-integrity.js` still adds `Demand_Basis` to its in-memory Package 01, now duplicating
   the column. The fix is non-blocking (no result changes) and is deferred to the next tag cycle.
7. **CI artefact.** The artifact of run 43680939374 attempt 1 is corroborating, not primary, evidence: the run log is the
   primary record and contains its `guard.txt` content. Its zip's SHA-256 as recorded in the log is
   `68d57b1bb18175417b399e05d1c33f3fdcb67b8b4318869c30cd8183b86a1294`. That zip was not downloaded, because its download host
   was blocked by the session's network allowlist; Claude has not verified its contents.
8. **Independence.** The T5 audits were self-audits by Claude. The post-tag CI run is externally executed automation, not
   independent human review. Independent human review remains outstanding before the next baseline change.
9. **Deferred proposals (all unapplied):**
   - Proposal 1, the K7 integrity-test label fix: deferred to the next tag cycle, because after Tag-5 it changes an approved
     checksum line.
   - Proposal 2, a `checksums.txt` comment explaining T5's three changed lines: deferred, because this commit is limited to this
     record.
   - The Stage 2 record's Proof B wording (it still describes the in-memory label): deferred, for the same reason.

**Governance lesson (standing observation for future tag cycles):** Commit-gate instructions should enumerate every protected
file and substantive change explicitly rather than approving batches by reference to previously prepared files.

Entry made by Claude. Recorded in Commit C, `ca7710b`, whose Git commit time is 2026-11-15 14:16:32 UTC.
*(Corrected in the provenance review, 15 Nov 2026: this line originally read "Entry made by Claude, 2026-11-15 14:20 UTC". That time was typed by hand and never checked; it is later than the commit that contains it, so it is not the time the entry was made. The Git commit time above is the only verified time.)*

### Tag-5 — pre-tag evidence and reference corrections (15 Nov 2026; T5 review findings C1 and C3)

*Added by Claude under the owner's authorisation "Resolve T5 Review Findings C1, C2 and C3" (15 Nov 2026), after Tag-5 and
Commit C (`ca7710b`). The sections above are unchanged, except Commit C's closing "Entry made by" line, corrected later in the
provenance review. This is a documentation correction; no test was run for it.*

**C3 — "Part A2" and "Part B".** No sections with those names exist for Tag-5. Part A ("Parts A2 … and B … are added
afterwards, in Commit C"), correction point 2 of the dated entry ("Part A2 records the approval") and, until this commit,
`tests/README.md` refer to them. The material they describe is in two sections:
- "Tag-5 — Commit C corrections, Tag-5 creation and post-tag CI": the T5 commit `f0e81bb30521a4e798005b0a51b4a531b807441e`, the
  owner's approval (both quotations), Tag-5 creation and the post-tag CI run;
- this section: the pre-tag results.

**C1 — pre-tag evidence.** Part A promised the pre-tag results; Commit C recorded only the post-tag CI run. The pre-tag runs below
were executed **locally by Claude, in throwaway copies of the repository in its cloud session**, not by GitHub Actions. Their
raw output exists only as temporary files in that session, outside the repository: it is **not committed and will not
survive the session**. The results below are transcribed from those files on 15 Nov 2026. They were not independently
reproduced.

Configuration (all local runs): `tests/run-all.sh` (`--fast` or `--full`), Node v22.23.4, npm 10.9.9 and the test packages
installed outside the repository, Python 3.13.18; time zones as each test defines for runs 1–3; **UTC only** for runs 4 and 5.
*(Corrected in the provenance review, 15 Nov 2026: the packages were described as installed "from the pinned `tests/package-lock.json`". How they were installed is not recorded; what was checked is that their installed versions match that file, 86 of 86. Times in the table are the modification times of each run's output file in the session, not separately recorded start or finish times. Runs 4 and 5 set `TZ=UTC` in their scripts, so they ran in one time zone.)*

| # | Run | Tree | Time (UTC) | Result (as printed) |
|---|---|---|---|---|
| 1 | Full tier, local | a clone checked out at `f0e81bb` (corrected: its commit and unchanged tracked files were confirmed during the provenance review, after the run; no record survives of a check before the run) | output written 07:01 | runner header `PASS: 38 \| FAIL: 0 \| BLOCKED: 5 \| REDUCED: 2 \| ERROR: 1` (the 38 includes the pre-flight row, so 37 tests passed); scope 45 tests |
| 2 | Fast tier, local | the same clone | output written 06:51 | 24 tests passed (+ pre-flight), 0 FAIL, 1 ERROR |
| 3 | Tag-4 guard (Tag-4's own `check-control.js`), local | the same clone | output written 06:51 | `check-control: 9 passed, 3 failed (baseline v0.7-tests-approved-4 = 5f18335)`; 104 PENDING lines |
| 4 | T5 mutations (7 runs: 1 control + 6), local | the uncommitted nine-file working tree, the script's source (corrected: its 1,820 tracked files were compared with `f0e81bb` during the C1 correction, after the runs, and are identical; that shows its contents then, not at run time) | output written 05:24:00, 12 s before the T5 commit | all 6 detected by named assertions, no crash (table below) |
| 5 | K7 mutation matrix (24 mutations), local | **unable to verify** (corrected): an eight-file tree from before the README change. The script reads its source copy from a setting that was not recorded, so which copy it used cannot be established. One surviving copy matches `f0e81bb` in the engine folder except `tests/README.md`, but it is not proven to be the one used | output written 04:55 | 24/24 detected by named assertions; all 77 `import-integrity` assertions ran in every run; no crash |
| 6 | Simulated Tag-5 guard, local | a throwaway commit on a throwaway local remote, **not GitHub** | 04:36 | `check-control: 12 passed, 0 failed`; superseded by the real post-tag CI run |

The same full tier and Tag-4 guard were also run on the uncommitted nine-file working tree before the T5 commit (output written
05:21 and 05:10), with the same results.
*(Corrected in the provenance review, 15 Nov 2026: this sentence originally also listed the fast tier. No output of a fast-tier run on that tree survives (the surviving fast-tier outputs are from earlier trees, 04:03 and 04:36), so that part is withdrawn.)*

**What each status means in run 1** (preserved, not merged):
- **Passed:** 37 tests, including `check-protection` 434, `same-results` 356, `import-integrity` 386, golden v0.5 and v0.6.0
  (10/10 each) and the confidence snapshot (51/51) in 5 zones, and `browser-chrome` 53.
- **Expected ERROR (1):** `check-control`: "cannot read check-control.js from approved tag v0.7-tests-approved-5", because
  Tag-5 did not yet exist. The runner exits 1 on any ERROR.
- **BLOCKED (5):** `test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility` (historical source trees not
  available), `phase2-comparison` (tag `v0.6-candidate-4-phase2` not on GitHub), `test-paging-chrome` (Playwright's browser
  not installed).
- **REDUCED (2):** `test-phase1` 57 of 125, `test-uom` 110 of 164.
- **PENDING:** not a test status. The 104 PENDING lines are run 3's guard output against Tag-4; since Tag-5 they are
  protected inventory, not validated behaviour.

**T5 mutations (run 4; counts in UTC, the only time zone run):**

| # | Mutation | check-protection | import-stage1 | same-results | import-integrity |
|---|---|---|---|---|---|
| T5m0 | control: the T5 tree unchanged | 434/0 | 123/0 | 71/0 | 77/0 |
| T5m1 | label removed from `dataset.csv`; checksums and manifest not updated | 1 failed | 1 failed | 7 failed | 0 failed |
| T5m2 | label changed to "orders"; manifest and checksums updated to match | 0 failed | 0 failed | 7 failed | 0 failed |
| T5m3 | label removed; manifest and checksums updated to match | 0 failed | 0 failed | 7 failed | 0 failed |
| T5m4 | Proof B reverted to adding the label in memory; checksum updated | 0 failed | 0 failed | 1 failed | 0 failed |
| T5m5 | `test-same-results.js` checksum line left at its pre-T5 hash | 1 failed | 0 failed | 0 failed | 0 failed |
| T5m6 | manifest line left at the pre-T5 dataset hash | 0 failed | 1 failed | 0 failed | 0 failed |

`import-integrity` is unaffected by design: it sets its own in-memory label (Commit C section, point 6).

**After Tag-5:** only GitHub Actions ran: run 43680939374 attempt 2, the **fast tier only** (25 tests passed + pre-flight;
guard 12/0 against Tag-5; 0 PENDING). No full-tier run exists after Tag-5. In the Commit C section, point 5's "passing the full
tier" refers to run 1 above (0 FAIL, 1 expected ERROR), which was local and pre-tag.

Entry made by Claude. Recorded in commit `f08a832`, whose Git commit time is 2026-11-15 14:32:54 UTC.
*(Corrected in the provenance review, 15 Nov 2026: this line originally read "Entry made by Claude, 2026-11-15 14:45 UTC". That time was typed by hand and never checked; it is later than the commit that contains it, so it is not the time the entry was made.)*

### Tag-5 — owner acceptance of T5 (15 Nov 2026)

*Recorded by Claude on the owner's explicit instruction "T5 Owner Acceptance — Final Documentation Commit" (15 Nov 2026). The
statement is the proposed acceptance statement from Claude's T5 review (section 11), which the owner adopted, with the
owner's additional sentence appended verbatim. This section accepts T5 only.*

**Owner statement on T5 (accepted):**

I accept T5 with the following limitations knowingly in place:
1. No independent human technical review was available. I consciously waive it, understanding that an AI review is not
   equivalent to professional independent assurance.
2. Claude's review was not wholly independent: Claude had done the work it reviewed, although it checked its claims against
   the repository and GitHub.
3. After Tag-5, GitHub Actions ran the fast tier only: run 43680939374, attempt 2.
4. The full-tier results were obtained locally, before Tag-5. The original temporary logs are not kept in the repository, so
   they cannot be reproduced from those logs.
5. Five tests remain BLOCKED and two remain REDUCED.
6. The 104 items listed as PENDING before Tag-5 are now in Tag-5's protected baseline. That means changes to them are
   detected. It does not mean their behaviour has been functionally validated.
7. The `dataset.csv` authorisation remains an inferred reading across two documents, not explicit approval in one document.
8. This acceptance refers to the record as corrected in commit `b6e26bf95dfc7e660a0f2223a50834dec36db8bf`.

This accepts T5 only. It does not accept Stage 2.

This acceptance is of the record as it stands at commit b6e26bf. It does not claim the record is complete or error-free; it claims the record accurately discloses the state of T5's evidence at that commit.

**Scope:** Stage 2 is not accepted or completed by this statement; its acceptance remains a separate, open owner decision
(`IMPORT-V1-STAGE2-RECORD.md`, "Stage 2 status after K7, T5, Tag-5 and Commit C"). Tag-5 stays on `f0e81bb`. No test was run
for this entry. Its time is the Git commit time of the commit that adds it.

## Stage 3 — implementation record (16 Nov 2026; uncommitted; for the owner's review and the Tag-6 decision)

*Recorded by Claude under the owner's mandate "Stage 3 – Controlled Autonomous Execution". Nothing here is committed, tagged or
owner-accepted except where stated. 3A's implementation was accepted by the owner on 16 Nov 2026; everything else is technically
verified only. All runs were local, in throwaway copies or Git clones of the working tree (origin = GitHub), not GitHub Actions.*

**Changes (working tree):**

| Task | Code | Test (assertions; result on the old code) | Status |
|---|---|---|---|
| 3A | `js/calculations.js` line 56: "Allocated exceeds on-hand" uses the availability basis (usable on-hand when finite, else On_Hand_Qty) | `test-allocated-usable.js` (23; fails 4) | implementation owner-accepted; warning wording still "on-hand" (follow-up) |
| DR-4 | `js/excel-import.js` `rows()`: null and empty-after-trim text read as missing | `test-empty-text.js` (46; fails 13) | verified |
| N1 | `js/calculations.js` feasCalc: a non-positive delay reads "No delay if ordered today (arrives ~N d before start)"; an open order with no valid start date is "Insufficient information" (it made the whole run throw) | `test-shortage-delay.js` (19; fails 12) | verified; golden treatment pending owner decision |
| Scrap rules | direct: `js/calculations.js` line 68 (`scrapParse` inside `analyse`); import: `js/import/clean.js` cleanPercent, `canonical.js` Scrap_Pct reject-row, `validate.js` PERCENT_CONVERTED | `test-scrap-rules.js` (71, both routes; fails 40) | verified; `test-import-integrity.js` amendment pending owner decision |
| Time zones | `tests/run-all.sh`: tests marked `fast_zones: "five"` (golden v0.5, golden v0.6.0, confidence v0.7) run in all five zones in the fast tier, so CI covers them | `test-tz-boundaries.js` (71; fails 41 without the reader's date correction) | verified |

**Protected records changed:** `accepted-results.json` (5 new tests; check-protection 434 → 440; confidence reference → the 16 Nov
snapshot; `fast_zones` on three snapshot tests), `checksums.txt` (changed approved lines: `test-uom.js`, `test-same-results.js`,
`snapshots/README.md`, `test-import-stage1.js`; new lines for the 5 tests and the 16 Nov snapshot), `test-same-results.js` (Willow:
both routes 11), `test-uom.js` (U5 blank units: missing, owner option (a)), `test-import-stage1.js` (Scrap_Pct policy RJ),
`run-all.sh`, `snapshots/README.md`, the new snapshot `snapshots/v0.7-confidence-20261116T034921Z.json` (one difference from the
12 Nov file: Willow Q3 19 → 11), and `IMPORT-V1-DIFFERENCE-REGISTER.md` (DR-4 note). No historical snapshot was changed.

**Final local results (fresh Git clone of the final working tree):**
- Fast tier: 25 tests passed (+ pre-flight; runner header "PASS: 26"), 5 FAIL, 0 BLOCKED, 0 REDUCED, 0 ERROR. Golden and confidence ran
  in 5 zones. New tests all pass: allocated-usable 23, empty-text 46, shortage-delay 19, scrap-rules 71, tz-boundaries 71;
  check-protection 440/440; import-stage1 616/616; confidence snapshot 51/51 in 5 zones.
- Full tier (before the last change, moving `scrapParse` inside `analyse`, which restored check-globals 116 and
  test-a1-sync-path 74, both re-run and passing): 36 passed, 8 FAIL, 5 BLOCKED, 2 REDUCED, 0 ERROR.
- Every remaining FAIL is declared and decision-dependent:
  - `check-control`: the Tag-5 guard fails on every approved change until the owner approves and creates Tag-6 (run-all.sh
    changed; approved checksum lines changed; the confidence reference change is labelled "WEAKENED" by the guard, which cannot
    tell an equally strict replacement from a weakening);
  - `golden v0.5`, `golden v0.6.0`, `test-timezones` and `same-results` Proof C: N1's 20 intended delay-text changes against the
    historical golden files (nothing else differs) — owner decision on the golden-test treatment;
  - `import-integrity`: 45 failures in the accepted E-1/F2 assertions superseded by the scrap rules — owner decision on the E-1
    withhold mechanism.

Entry made by Claude; its time is that of the commit that eventually records it.

### Stage 3 — owner decisions D1–D4 implemented (16 Nov 2026; uncommitted; technically verified, not formally accepted)

*Recorded by Claude. Owner-approved decisions (16 Nov 2026): D1 option A, D2 option A, D3 option 1, D4 with six safeguards. The
implementation and verification are Claude's; nothing here is formally accepted, committed or tagged. D5 (the 3A warning wording)
is not changed.*

| Decision | Implementation | Verification |
|---|---|---|
| D1 golden snapshots | `snapshots/permitted-differences.json` lists the 20 N1 changes (order, original text, new text, reason); `compare-snapshots.js` applies exactly those to its in-memory copy of the two golden files; snapshot files unchanged | golden v0.5 and v0.6.0 10/10 in 5 zones, test-timezones 15, same-results Proof C pass; still fails on the pre-N1 output, on an unlisted status change, on a wrong N and on a changed section |
| D2 scrap | E-1 SCRAP_UNREADABLE marker and gate withholding retired (adapter, result-gate, engine); a blank that cannot be verified now refuses (SCRAP_BLANK_UNVERIFIABLE, K7 safeguard kept); a blanked scrap from Stage 1 refuses (SCRAP_INVALID_UPSTREAM) | import-integrity 396 (79 per zone): 45 E-1/F2 assertions replaced by rejection-policy assertions; fails 9 per zone on the pre-D2 adapter and gate |
| D3 duplicate PO rows | the comparison tool no longer invents `Line_No "1"` | dupexact: both routes keep 303 rows, DUP_EXACT_KEPT + High "Duplicate records", identical results; combined, multiline, posupconflict, splitline now imported and identical to direct; same-results 416 (83 per zone) |
| D4 partial totals | result-gate R4: frozen `{ value, partial: true, excludedItems }` where totals used to be withheld; NO_ELIGIBLE_ITEMS when none is eligible; PARTIAL_TOTAL labels, `disclosures.partialTotals`, a "not complete totals" sentence; `isPartial` exported; arithmetic and string use throw | partial-totals 8 (fails 7 on the pre-D4 gate); import-integrity I6, I9, I10 restated with values recomputed from the engine's item values |

**Full tier, fresh Git clone of the final working tree (origin = GitHub), Node v22.23.4:** PASS 44 (43 tests + pre-flight), FAIL 1,
BLOCKED 5, REDUCED 2, ERROR 0. The only FAIL is `check-control` (the Tag-5 guard), by design until the owner approves and creates
Tag-6: run-all.sh changed; the confidence reference change is labelled "WEAKENED" by the guard; 7 approved checksum lines changed (none
removed). check-protection 442 = 3 references + 439 files (Tag-5: 434 = 3 + 431; 8 added, 7 re-hashed, 0 removed).

Entry made by Claude; its time is that of the commit that eventually records it.

### Stage 3 — engineering completion (18 Nov 2026; uncommitted; technically verified, not formally accepted)

*Recorded by Claude under the owner's approval of 18 Nov 2026. Full detail, old-versus-new evidence, experiments and outstanding
findings: `STAGE3-CHANGE-REGISTER.md`. Approval to implement is not acceptance.*

| ID | Change | Verification |
|---|---|---|
| C-NUM | High warning for text, NaN or Infinity in numeric engine columns (direct route), naming column and row | `stage3-quality` C-NUM 13 checks |
| D5 | 3A wording "Allocated exceeds usable on-hand" | `allocated-usable` 23 (message constant updated, same 23 checks) |
| C-STK | Dead-stock flags test stock held on either basis, physical or usable (revised after independent review); valuation unchanged | `stage3-quality` C-STK 11 checks |
| C-RG3 | Gate output contract RG3; input spec stays RG2 | `stage3-quality` C-RG3 2; `import-integrity` 396 unchanged |
| C-CMP | `compare-snapshots.js` no longer crashes on an emptied section | `stage3-quality` C-CMP 1 |

New test `stage3-quality` (28, fast + full, two zones): 28/28 now, 18/28 fail on the pre-change tree. An independent reviewer's findings and their reconciliation are in the change register. check-protection 443 = 3 references
+ 440 files (442 + `test-stage3-quality.js`; `compare-snapshots.js` and `test-allocated-usable.js` re-hashed; none removed). No
snapshot changed: golden v0.5 and the v0.7 confidence snapshot reproduce exactly. The only expected FAIL remains `check-control`
(Tag-5 guard) until Tag-6. Experiments X1 (C-NUM refusal) and X2 (K7 exclusion-only partial totals) are kept outside the repository
and are not part of these results.

Full tier (revised tree, throwaway copy): 44 tests passed (+ pre-flight), FAIL 1 (`check-control`), BLOCKED 5, REDUCED 2, ERROR 0.

Entry made by Claude; its time is that of the commit that eventually records it.

### Stage 3 Round 2 (18 Nov 2026; uncommitted; technically verified, not formally accepted)

*Recorded by Claude under the owner's Round 2 brief. Details, baselines, experiments and the independent review: `STAGE3-CHANGE-REGISTER.md`,
Round 2. Approval to implement is not acceptance.*

| ID | Change | Verification |
|---|---|---|
| R2-STK | Dead-stock classes require uncommitted stock = max(physical, usable) − allocated (allocated stock is never excess or obsolete) | `stage3-round2` (35) |
| R2-VIEW | Dead-stock view shows Physical, Allocated, Usable, Unallocated usable (layout pending the owner's mock-up choice) | `stage3-round2` R2-VIEW |
| F-A1..F-A4 | Negative planned/completed quantity (High), completed above planned (Medium), negative lead times (High), BOM quantity wording | `stage3-round2` |
| T-R2 | `stage3-quality` scenarios state allocation 0 explicitly (same 28 checks and expectations) | 28/28 |

Full tier (throwaway copy): 45 tests passed (+ pre-flight), FAIL 1 (`check-control`), BLOCKED 5, REDUCED 2, ERROR 0. Golden v0.5 and v0.6.0
and confidence v0.7 identical in all five zones. check-protection 444 = 3 references + 441 files. Numeric-validation and cross-route options
are experiments outside the repository (REVIEW / EXPERIMENTAL), not part of these results.

Entry made by Claude; its time is that of the commit that eventually records it.

## Tag-6 baseline acceptance — Part A (pre-tag acceptance record; inside the Tag-6 switching commit; 22 Nov 2026)

*Recorded by Claude. The entries above are unchanged. This follows the Tag-4 and Tag-5 precedent (`5f18335`, `f0e81bb`): the
commit to be tagged switches the guard's baseline to the new tag. It has no effect until the owner creates the tag.*

**The commit to be tagged** is the switching commit on `candidate/tag6-20261122-r4`. Its full hash is in the final
release-readiness report; Part A2 will record it after the tag exists. Its parent `3822045` carries all Tag-6 work and was
verified in full (`stage3-design/tag6/verification-r4-20261122/` on branch `verification/tag6-r4-20261122`).

### Switching changes (5 files)

| # | File | Change |
|---|---|---|
| 1 | `.github/workflows/v07-tests.yml` | `TAG: v0.7-tests-approved-5` → `-6` (CI's guard uses the new baseline) |
| 2 | `tests/accepted-results.json` | check-control `"tag"` `-5` → `-6`; no count changes |
| 3 | `tests/check-control.js` | default `--tag` `-5` → `-6` (the rules are unchanged) |
| 4 | `tests/README.md` | Tag-6 row added; Tag-5 row says "current until Tag-6 is created"; step 1 names `-6` |
| 5 | `tests/V07-TEST-RECORD.md` | this Part A |

### What Tag-6 would approve

- The registry block: the 50 PENDING items, each assessed in `stage3-design/tag6/REGISTRY-ASSESSMENT-TAG6.md` ("ACCEPT" = prepared for this approval, not approved). Also the three guard FAILs that only a new tag clears:
  - `run-all.sh` changed;
  - the confidence reference replaced (19 → 11 POs, A4; 4 → 3 items, A6);
  - 9 approved checksum lines re-hashed;
  - and, from this commit, the three control-file changes above.
- The Stage 3 work as decided by the owner (`stage3-design/tag6/OWNER-DECISIONS-TAG6.md` and `OWNER-DECISIONS-TAG6-ROUND2.md`).
- X1 (accepted 21 Nov) and the Tag-6 changes (E-1, A1, A2, A3 remainder, B1, B2, E-9, defects A and B).

### What approval does not state

- That unexecuted tests passed. Four tests are BLOCKED and two REDUCED (KNOWN-LIMITATIONS 19).
- That D1–D4 match their original full wording. Only the option labels are recoverable.
- That Claude's tests are independent verification. The owner's five human checks (22 Nov 2026, all passed) are the human verification.
- That a physical Android device was tested for this candidate.

### Expected state before the tag exists

- `run-all.sh`'s check-control row cannot read `check-control.js` from the not-yet-existing tag `-6`, so it reports an ERROR, not a pass.
- CI on `development/v0.7` would stop at the guard for the same reason.
- Run explicitly against Tag-5 (`--tag v0.7-tests-approved-5`), the guard reports the earlier 3 FAILs plus FAILs for the changed control files (`check-control.js`, the workflow, the registry's tag field). All of these clear only when the owner creates Tag-6 on this commit.
