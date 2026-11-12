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
