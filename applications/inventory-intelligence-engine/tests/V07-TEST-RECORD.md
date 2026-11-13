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
