# tests/

## T2.1 — baseline tags, protected files and release procedure

*Updated in T3 (12 Nov 2026): baseline tag `v0.7-tests-approved-3`; 12 protected files including the confidence snapshot; check-control recorded ACTIVE. Updated for Tag-4 (13 Nov 2026): baseline tag `v0.7-tests-approved-4` on Commit 10; Commit 10 itself changes no test, accepted count or protected file list; Tag-4 accepts the 216 additions recorded in `V07-TEST-RECORD.md` Part A.*

Recorded 12 Nov 2026. Repository `MB20252025/Chain-Genius-Consulting`, branch `development/v0.7`.

### 1. Approved baseline tags

An approved baseline tag records the exact versions of the testing-control files the owner has approved.

| Tag | Points to | Contents |
|---|---|---|
| `v0.7-tests-approved-1` | `eb3111f5d25f02678db02b35e9cf4e9ab0e23a73` | T1 baseline (kept unchanged) |
| `v0.7-tests-approved-2` | `0e461a629d0aa631c92ca6682958071cdf8388e6` | T2.1 baseline (kept unchanged) |
| `v0.7-tests-approved-3` | the T3 implementation commit (created by the owner) | T3 baseline (kept unchanged): adds the confidence snapshot; check-control ACTIVE |
| `v0.7-tests-approved-4` | Commit 10 (full hash recorded in `V07-TEST-RECORD.md` Part A2) | Tag-4 baseline (current): accepts the 216 additions recorded in `V07-TEST-RECORD.md` Part A, with the limitations stated there |

**Creating a baseline tag (permanent procedure)**

1. The change to the control files is reviewed, committed and pushed to `development/v0.7` on its own, as one commit. Claude does not create or push baseline tags.
2. Before the tag is created:
   - `git show --name-status <commit>` lists only the reviewed files;
   - `git diff <commit>` (against the working tree) is empty;
   - every `PENDING` line printed by the guard has been reviewed one by one. Additions (new `checksums.txt` lines, raised counts, new tests) pass the guard without failing it, so **a passing guard is never approval of an addition** (decision recorded at M1 CP1, 12 Nov 2026).
3. The workflow run for that commit is expected to fail at the guard with `couldn't find remote ref refs/tags/<new tag>`. This is recorded as evidence and is not fixed with another commit.
4. The owner creates the tag on GitHub, on the phone:
   - Releases → Draft a new release → Choose a tag;
   - type the new name and pick "Create new tag on publish";
   - set the target to `development/v0.7`, check it shows the reviewed commit, then publish. The release entry may be deleted afterwards; the tag stays.
5. Verification, using `git ls-remote origin` only (never local references):
   - `git cat-file -t <tag>` and the commit it dereferences to;
   - the control files are read from the tag;
   - every protected reference is unchanged.
6. The failed run is re-run **once**, through the API or "Re-run all jobs". It must show all guard checks passing before Node setup, and every later step succeeding. If it fails, stop and report; do not create another tag or commit.

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
1. **Guard:** fetch tag `v0.7-tests-approved-4` (`-3` until Tag-4) from GitHub and run *its* copy of `check-control.js`.
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
