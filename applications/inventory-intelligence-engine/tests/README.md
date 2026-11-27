# tests/

## T2.1 — baseline tags, protected files and release procedure

*Updated in T3 (12 Nov 2026): baseline tag `v0.7-tests-approved-3`; 12 protected files including the confidence snapshot; check-control recorded ACTIVE. Updated for Tag-4 (13 Nov 2026): baseline tag `v0.7-tests-approved-4` on Commit 10; Commit 10 itself changes no test, accepted count or protected file list; Tag-4 accepts the 216 additions recorded in `V07-TEST-RECORD.md` Part A. Updated for Tag-5 (15 Nov 2026): baseline tag `v0.7-tests-approved-5` on the T5 switching commit. Unlike Commit 10, that commit also changes test data and a test: it labels library Package 01 `Demand_Basis = shipments` and changes Proof B in `test-same-results.js` to read the supplied files. Tag-5 accepts the additions and changes recorded in `V07-TEST-RECORD.md` "Tag-5 baseline acceptance — Part A". Updated after Tag-6 (22 Nov 2026, owner instruction "Tag-6 Final Administration"): baseline tag `v0.7-tests-approved-6` on the Tag-6 switching commit `e65600c`, created by the owner. The tag procedure below now documents the switching commit and both routes actually used (Tags 4 and 5; Tag-6).*

Recorded 12 Nov 2026. Repository `MB20252025/Chain-Genius-Consulting`, branch `development/v0.7`.

### 1. Approved baseline tags

An approved baseline tag records the exact versions of the testing-control files the owner has approved.

| Tag | Points to | Contents |
|---|---|---|
| `v0.7-tests-approved-1` | `eb3111f5d25f02678db02b35e9cf4e9ab0e23a73` | T1 baseline (kept unchanged) |
| `v0.7-tests-approved-2` | `0e461a629d0aa631c92ca6682958071cdf8388e6` | T2.1 baseline (kept unchanged) |
| `v0.7-tests-approved-3` | the T3 implementation commit (created by the owner) | T3 baseline (kept unchanged): adds the confidence snapshot; check-control ACTIVE |
| `v0.7-tests-approved-4` | Commit 10 (full hash recorded in `V07-TEST-RECORD.md` Part A2) | Tag-4 baseline (kept unchanged): accepts the 216 additions recorded in `V07-TEST-RECORD.md` Part A, with the limitations stated there |
| `v0.7-tests-approved-5` | the T5 switching commit (`f0e81bb`; full hash recorded in `V07-TEST-RECORD.md`, section "Tag-5 — Commit C corrections, Tag-5 creation and post-tag CI"; pre-tag results in "Tag-5 — pre-tag evidence and reference corrections"; created by the owner) | Tag-5 baseline (kept unchanged; superseded by Tag-6 on 22 Nov 2026): accepts Universal Import Stage 1 and Stage 2 (K1–K7) test evidence, the Package 01 label and the Proof B change, as recorded in `V07-TEST-RECORD.md` Tag-5 Part A, with the limitations stated there |
| `v0.7-tests-approved-6` | the Tag-6 switching commit `e65600cf7b74f7f25ec73ec24ef9fae1d648c619` on `candidate/tag6-20261122-r4` (created by the owner through GitHub Releases, 22 Nov 2026 05:38 UTC; lightweight tag; post-tag evidence in `V07-TEST-RECORD.md` Parts A2 and A3, and in `stage3-design/tag6/TAG6-RELEASE-RECORD.md`) | Tag-6 baseline (**current**; `development/v0.7` was fast-forwarded to it on 22 Nov 2026): the registry block assessed in `stage3-design/tag6/REGISTRY-ASSESSMENT-TAG6.md` (50 items), Stage 3 work accepted in `stage3-design/tag6/OWNER-DECISIONS-TAG6.md`, X1, and the Tag-6 changes |

**Creating a baseline tag (permanent procedure)**

*Rewritten 22 Nov 2026 (owner instruction "Tag-6 Final Administration", task 3). The previous six-step text is kept unchanged in git history (for example at `e65600c`). The procedure below records what actually happened for Tags 4, 5 and 6. **MUST** marks a mandatory step; *Recommended* marks a check that was done but is not a rule.*

**Why a switching commit is needed.** The guard always compares against one named tag. That name is written in three places:
- `.github/workflows/v07-tests.yml` (`TAG:`);
- `tests/accepted-results.json` (the `check-control` entry's `"tag"`);
- `tests/check-control.js` (the default `--tag`).

If the new tag is put on a commit that still names the old tag, nothing ever uses the new tag:
- CI and the runner keep judging every later commit against the old baseline.
- The changes the new tag was meant to approve keep failing, or showing as PENDING, for good.

The switching commit changes those three references to the new tag name **before** the tag exists. The tag is then created **on that commit**, so the tagged baseline names itself.

The precedent is three switching commits:
- Commit 10 `5f18335` for Tag-4 (`-3` → `-4`);
- `f0e81bb` for Tag-5 (`-4` → `-5`);
- `e65600c` for Tag-6 (`-5` → `-6`).

Each one changed all three references, added a row to the table above and added a "Part A" acceptance record to `V07-TEST-RECORD.md`.

**When it is created.**
- It is created last: after all the work the tag will approve is complete and verified, and after the owner has accepted the pending registry block.
- It **MUST** be the commit the tag goes on. Nothing is committed after it before the tag.

**Steps.**

1. **MUST: prepare the switching commit.**
   - Change exactly the three references above to the new tag name.
   - Add the new row to the table in section 1, and mark the previous tag "superseded".
   - Add a Part A record to `V07-TEST-RECORD.md`.
   - Do not change the guard's rules.
   - *Recommended:* the switching commit contains only these switching changes, as in Tag-4 and Tag-6. Tag-5's switching commit also carried a test-data label and a test change. That is allowed when approved, but it makes the commit harder to review.
2. **MUST: review every PENDING item first.**
   - *From Tag-8 onwards (owner decision, 27 Nov 2026):* PENDING items are accepted by the owner incrementally, at the end of each phase, and recorded in `V07-TEST-RECORD.md` then. Tag-7's block was accepted retrospectively, once; that is not to be repeated.
   - Run the **current** tag's guard against the switching commit.
   - Every `PENDING` line must be one of the items the owner accepted. Additions pass the guard without failing it, so **a passing guard is never approval of an addition** (decision recorded at M1 CP1, 12 Nov 2026).
   - Every `FAIL` must be explained.
   - `git show --name-status <commit>` must list only the reviewed files, and `git diff <commit>` against the working tree must be empty (both kept from the earlier procedure).
   - Tag-6 example: 50 PENDING items were reconciled one by one with `stage3-design/tag6/REGISTRY-ASSESSMENT-TAG6.md`, and 5 FAILs were explained, including the switching files themselves.
3. **MUST: test the switching commit before the tag exists.**
   - Run both tiers on that exact commit.
   - Expect exactly one non-pass, caused by the missing tag: the runner's `check-control` row reports ERROR, and CI's guard step fails with `couldn't find remote ref refs/tags/<new tag>`.
   - Record this as evidence. Never "fix" it with another commit.
   - Every other result must be as accepted, with BLOCKED and REDUCED unchanged.
   - Two routes have been used:
     - **Route A (Tags 4 and 5):** push the switching commit to `development/v0.7` and freeze the branch. The protected workflow's first run fails at the guard, as expected: run 43466012229 attempt 1 (Tag-4) and run 43680939374 attempt 1 (Tag-5).
     - **Route B (Tag-6):** keep the switching commit on a candidate branch (`candidate/tag6-20261122-r4`). Test it with the separate `candidate-verification.yml` workflow on a `ci/` branch, which pins the exact commit; run 44987012577 showed the expected guard ERROR. `development/v0.7` does not move until after the tag.
   - *Recommended:* before the tag is created, simulate it locally in a mirror, never on GitHub, to confirm the guard would then pass with 0 PENDING (Tag-6: `verification/tag6-switch-20261122`). A simulation is never post-tag evidence.
4. **MUST: the owner creates the tag, on the exact switching commit.**
   - Claude does not create or push a baseline tag unless the owner gives an explicit instruction for that tag (Tag-4: the D15 exception; Tag-6: delegated authority).
   - Even with that instruction, Claude sessions have been refused every time. Tags 4 and 5: the proxy refused with HTTP 403. Tag-6: the Release API refused with HTTP 403. So in practice the owner creates the tag.
   - On GitHub: Releases → Draft a new release → Choose a tag. Type the new name and pick "Create new tag on publish".
   - Set the target to the branch whose tip is the switching commit, and check that it shows that commit. Route A targets `development/v0.7`; Route B targets the candidate branch.
   - Tick "Set as a pre-release", as for Tags 4, 5 and 6, then publish.
   - The result is a lightweight tag. GitHub may also create a `release/…` branch; Tag-6 created none.
5. **MUST: verify the real tag.** Use `git ls-remote origin` and the API, never local references. The tag must resolve to the full switching-commit hash (`git cat-file -t` gives `commit`). The control files must be read from the tag. The earlier tags and every protected reference must be unchanged.
6. **MUST: run the guard against the real tag.**
   - The guard must report `12 passed, 0 failed (baseline <new tag> = <commit>)` with **0 PENDING**, and every FAIL from step 2 must have cleared.
   - Then run the fast and full tiers. Report BLOCKED and REDUCED separately: they are not passes.
   - **Route A:** re-run the failed protected run **once**, with "Re-run all jobs" or the API (Tag-4: run 43466012229 attempt 2; Tag-5: run 43680939374 attempt 2). If it fails, stop and report. Do not create another tag or commit.
   - **Route B:** run the candidate-verification workflow with its `TAG` set to the new tag (Tag-6: run 44990351755). Then, only after the owner separately approves moving `development/v0.7`, fast-forward the branch to the tagged commit; the protected workflow runs on that push (Tag-6: run 44993162485).
7. **MUST: record the post-tag evidence as an addition, never a rewrite.**
   - Add "Part A2" (and any later parts) to `V07-TEST-RECORD.md`, and complete the release record.
   - Record them on the development line, or on a records branch merged in later (Tag-6: `release-records/tag6-20261122`).

**Never, in any route:**
- weaken, skip or bypass the guard, `check-protection.js`, the rulesets or the registry to get a green run;
- move, delete or replace an existing tag (S1 enforces this);
- tag any commit other than the reviewed switching commit;
- create a second tag to hide a mistake.

**Separate approvals.** Creating a tag approves nothing else. Each of these needs its own owner approval:
- moving `development/v0.7` to a tagged commit (for Tag-6 this was a separate instruction, after the tag; in Route A the branch already carries the commit);
- merging records into the development line;
- any change to `main`, any deployment, and any publishing of the website (section 5).

Existing baseline tags are never moved or deleted; S1 enforces this.

### 2. Files the guard protects

`check-control.js` is always run **from the approved tag**, never the working copy. It checks these files byte-for-byte against the tag:

- `tests/run-all.sh`
- `tests/check-protection.js`
- `tests/check-control.js`
- `tests/test-a1-wrapper-quick.js`
- `tests/package.json`
- `tests/package-lock.json`
- `tests/requirements.txt`
- `tests/summarise-run.js` (added in T2.1)
- `.github/workflows/v07-tests.yml` (added in T2.1, written as `:/.github/workflows/v07-tests.yml`; `:/` means a path from the repository root)
- `tests/snapshots/v0.7-confidence-20261112T011814Z.json` (added in T3: the confidence snapshot)

It also checks two files for weakening:

- `tests/accepted-results.json`: no test removed, no count lowered, no new BLOCKED or REDUCED entry.
- `tests/checksums.txt`: every approved line still present.

Result: 12 checks (11 until T3). `check-protection.js` separately checks 3 references and 124 frozen v0.6 test files by SHA-256.

**Permanent protected-file maintenance rule (T3 and every later stage).** Any new workflow-adjacent file must be added to `check-control.js`'s protected list **in the same commit that creates it**. That includes test runners, summary formatters, protection-check functions and workflow files. A workflow-adjacent file added without protection is a T-level blocker, not a minor omission.

### 3. How the workflow uses the baseline

`.github/workflows/v07-tests.yml` runs on every push to `development/v0.7`. It does not run when a push changes only `applications/inventory-intelligence-engine/tests/logs/**` or `…/tests/V07-TEST-RECORD.md`.

The steps run in this order:
0. Checkout.
1. **Guard:** fetch tag `v0.7-tests-approved-6` (current since 22 Nov 2026) from GitHub and run *its* copy of `check-control.js`.
2. Node.
3. Pinned packages.
4. `run-all.sh --fast` and `summarise-run.js`.
5. Evidence artifact.

If the guard fails, steps 2–4 are skipped and the run is red. Proven in T2 and T2.1:
- an altered `run-all.sh` (run 43110161774);
- an altered `summarise-run.js` (run 43128815957);
- an altered workflow file with the guard step kept (run 43129216325).

### 4. GitHub rulesets (Settings → Rules → Rulesets; all Active; all bypass lists empty)

| Ruleset | Targets | Rules | Purpose |
|---|---|---|---|
| S1 — Approved Baseline Tag Protection (27079964) | tags `v0.7-tests-approved-*`, `v0.6` | Restrict updates, Restrict deletions | Baselines and the v0.6 tag cannot be moved or deleted. Creating new tags stays possible |
| S2 — Development Branch Protection (27080313) | `development/v0.7` | Restrict deletions, Block force pushes | History cannot be rewritten or erased, so any change, including one that bypasses the guard, stays visible |
| S3 — Protected Release Branches (27081183) | `main`, `release/v0.6` | Restrict deletions ON, Block force pushes ON. **Restrict updates OFF**, Restrict creations OFF (owner design) | The v0.6 history cannot be rewritten (force-pushed) or deleted; both remain **blocked**. Ordinary direct pushes and merges (fast-forward updates) to `main` and `release/v0.6` **remain possible** for anyone with write access |

**S2 live verification (12 Nov 2026).**
- The throwaway branch `test/s2-verification` was temporarily added to S2.
- One force-push of a non-fast-forward commit was rejected by GitHub: `GH013: Repository rule violations found … - Cannot force-push to this branch`. The branch was unchanged.
- The branch was then removed from S2 and deleted.

S1 and S3 are verified by configuration listing only. No rejection was provoked against real protected references.

### 5. S3 release procedure (Stage 5, v0.7 → `main`): documentation only, not performed

**Ordinary release: S3 is NOT disabled.** S3 has Restrict updates OFF, so an approved ordinary (fast-forward) merge or push of v0.7 into `main` is allowed with S3 active. Record the merge commit, its UTC time and its author in the Stage 5 release notes.

**Only if a separately authorised operation needs something S3 blocks** (a non-fast-forward update, i.e. a force-push, or deleting `main` or `release/v0.6`), use a temporary full disable of S3. This is preferred to adding a permanent bypass entry.

1. Obtain the owner's separate authorisation for that specific operation.
2. Temporarily disable S3, and record the exact UTC time.
3. Perform only the authorised operation.
4. Re-enable S3 immediately afterwards, and record the exact UTC time.

**Bounded audit window** (applies only when S3 is disabled):
- Keep the window as short as possible: minutes, not hours.
- Record the disable and re-enable timestamps in the Stage 5 release notes.
- Log every commit, merge or push to `main` or `release/v0.6` during the window, with its timestamp and author.

### 6. Known GitHub Free limitation

On a public repository with GitHub Free, nothing available can stop someone with push access to `development/v0.7` from removing the guard step from the workflow.
- Push rulesets that restrict file paths are not available on this plan.
- `pull_request_target` workflows run only from the default branch (`main`), which must not change.
- Required review is impossible for a solo owner.

**Mitigations:**
- The guard detects any workflow change while it still runs.
- The runner's own `check-control` row (also from the tag) catches workflow changes if `run-all.sh` still runs.
- S2 keeps any such change permanently in history.

The workflow is therefore **not** tamper-proof, and T2.1 is recorded as **PARTIALLY COMPLETE** for this reason.

### FUTURE GOVERNANCE — not actioned

Before another developer or contractor is given push access, review who can push to `development/v0.7` and how workflow integrity will be protected against collaborators.

This is a future consideration only; nothing has been investigated or changed for it.

### FUTURE GOVERNANCE — owner decisions of 13 Nov 2026 (recorded; not actioned)

**Canonical public website address (GitHub Pages).**
- The verified public address is **`https://mb20252025.github.io/Chain-Genius-Consulting/`**.
  - On 13 Nov 2026 it served the repository's root `index.html` from `main`; the latest `github-pages` deployment status was "success".
- The repository part of the path is **case-sensitive**: `https://mb20252025.github.io/chain-genius-consulting/` returns **404**.
- All external communications must use the exact canonical address, including capitalisation:
  - LinkedIn posts;
  - business cards;
  - email signatures;
  - proposals;
  - consultancy documents;
  - website links and marketing materials.
- A custom domain could be considered later if case-insensitive addressing becomes important. **No custom domain is authorised.**
- Still a manual check for the owner: Settings → Pages (source branch and the "Your site is live at" address). It could not be read from the verification session.
- The canonical repository address is `https://github.com/MB20252025/Chain-Genius-Consulting`. This cloud environment may reset the local `origin` remote to its lowercase spelling between sessions. Both spellings resolve to the same GitHub repository. The lowercase spelling may produce a cosmetic 'This repository moved' notice when pushing. No persistent local remote correction is assumed.

**Node 20 deprecation — v1 baseline requirement.**
- **Requirement:** "Upgrade GitHub Actions that still use deprecated Node 20 runtimes as part of the v1 baseline cycle. Do not make an isolated workflow upgrade mid-development unless separately authorised."
- Actions currently in `.github/workflows/v07-tests.yml` (verified 13 Nov 2026 from each version's `action.yml`):

  | Action | Current version (runtime) | Required: Node 24 or later |
  |---|---|---|
  | `actions/checkout` | v4 (node20) | v5 or later |
  | `actions/setup-node` | v4 (node20) | v5 or later |
  | `actions/upload-artifact` | v4 (node20) | **v6** or later — v5 still uses Node 20 and is **not** a completed upgrade |

  Newest releases seen on 13 Nov 2026 were v7 for all three. Every input the workflow uses still exists in v7. Breaking changes and release notes were **not** reviewed: verify current releases, compatibility and release notes when the upgrade is planned.
- **Baseline protection:**
  - The workflow file is one of the control files that `check-control.js` compares byte for byte with the approved baseline tag (section 2).
  - Any change to it is reported as **FAIL** ("CHANGED since the approved baseline (needs approval)"), not as a PENDING addition, until a new approved baseline tag contains it.
  - Therefore:
    - do not upgrade GitHub Actions during an ordinary development stage;
    - include the Node 20 upgrade in the planned v1 baseline preparation;
    - test and approve the complete workflow change, and include it in the v1 baseline/tag cycle (Option A, recommended);
    - do not create a separate intermediate tag solely for this upgrade unless the owner explicitly approves that alternative.

### OUTSTANDING BRANCH RECORD — recorded 14 Nov 2026 (not actioned)

- Branch: `claude-write-test`.
- Observed commit: `8117c72` (`8117c72f9bdb846fceff11a63a03218f01df5082`, verified on GitHub with `git ls-remote origin` on 14 Nov 2026).
- This commit matches the previously observed `main` commit (`main` was also at `8117c72` on 14 Nov 2026).
- Its origin and purpose remain unexplained. It is not part of the documented setup.
- The branch is retained pending a future owner decision.
- No deletion, modification, merge or other action is authorised.

### T3 — confidence snapshot (12 Nov 2026)

`tests/snapshots/v0.7-confidence-20261112T011814Z.json` records three things for each of the 17 fixtures:
- forecast confidence (`fcCredAll`);
- `confAreas`;
- client questions.

It was created with `bash tests/run-all.sh --emit-confidence <absolute path>`. That computes every fixture in all five time zones and writes the file only if all five results are identical.

`run-all.sh` compares the current results against it: **fast tier UTC only, full tier all five zones** (85 fixture/zone combinations). The check is 17 fixtures × 3 sections = 51 per zone. Any difference is a FAIL naming the fixture, the section and the field.

The GitHub workflow still runs the fast tier only.

`check-control` is now recorded **ACTIVE**, so the recorded full-tier figures are BLOCKED 5 and REDUCED 2. The fast-tier summary now reads BLOCKED 5, which matches the full-tier result; the T2.1 inconsistency is resolved.

### Registering a new engine module: expected test-count growth (X1, owner approval 21 Nov 2026; CR-03)

Some protected tests count one check **per file** or **per top-level name**, so a legitimate new module raises their counts. The runner fails any
count above the accepted one. When a new `js/` file is registered:

1. **Predict the growth before running.** Today these tests grow:
   - `test-a1-static`: +1 per new `.js` file under `js/` (rule 2, "does not touch CFG, R or WB");
   - `check-globals`: +1 per file added to the `index.html` load list, and +1 per new top-level name in a loaded file;
   - `check-protection`: +1 per new checksum line.
2. **Record it at registration** in the same change: raise the entry's `accepted` value and extend its `note` with the date, the new file
   or name, the old and new count and a pointer to the change record. Keep the earlier text: the note supersedes, it never replaces.
3. **Show the new check passes**, for example with `VERBOSE=1 node test-a1-static.js | grep <file>`.

Routine increments made this way need no separate owner approval. A change to a test's meaning, scope, rules or protection strength is not
routine and still needs the owner.
- (X1 task 3, 21 Nov 2026) `test-a1-sync-path` also grows: +1 per new top-level function or constant reachable from `CGEngine.runEngine`, each checked for synchronous behaviour.
