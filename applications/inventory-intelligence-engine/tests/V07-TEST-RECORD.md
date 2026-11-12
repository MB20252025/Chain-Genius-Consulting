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
