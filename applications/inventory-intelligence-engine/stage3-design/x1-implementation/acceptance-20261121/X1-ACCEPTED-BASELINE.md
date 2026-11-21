# X1 accepted reference baseline (preserved 21 Nov 2026)

*Local preservation only: no commit, push, tag, publication or deployment. The original repository is unchanged.*

## 1. What is preserved

- **Content:** the complete working tree of the temporary repository `MB20252025/chain-genius-x1-android-test`, exactly as accepted on
  21 Nov 2026 (decision: `X1-ACCEPTANCE-PACKAGE.md` §1).
- **Included:**
  - the four top-level test-site files (landing page, README, `.nojekyll`, `cd16dcc` source manifest);
  - the full `applications/inventory-intelligence-engine/` folder: source, tests, fixtures, test data, records, registers, this acceptance
    package and its evidence.
- **Excluded:** `.git`, `tests/logs` (run artefacts), the protected evidence folder (never present in this tree) and its listing file
  (never copied).

## 2. Identity

| Item | Value |
|---|---|
| Git `HEAD` of the temporary repository | `cd16dcca63ec4fa1ad94167c8b3cb7eb366bca95` (`main`, the live test site) |
| Tracked files changed against `HEAD` | `js/app.js`, `index.html` (both uncommitted) |
| Untracked files | the rest of the application folder (copied from the original working tree for the full X1 environment) |
| Accepted commit identifier | **none exists.** The accepted state is uncommitted; its identity is the manifest below |

## 3. Location

`/home/claude/chain-genius-x1-android-test/x1-accepted-baseline-20261121/` holds two revisions.

- **`r1/`** (19:52 UTC): the first preservation. It is kept unchanged.
- **`r2/`** (current): it corrects one row of the decision record (scope; see `X1-ACCEPTANCE-PACKAGE.md`, correction note) and adds
  this paragraph. Every source, test, fixture and evidence file is identical in both revisions; `r2/R1-R2-DIFFERENCES.txt` lists
  the differences.

Each revision contains:

| File | Contents |
|---|---|
| `x1-accepted-tree.tar` | the preserved tree |
| `MANIFEST.sha256` | SHA-256 of every preserved file, relative paths |
| `BASELINE-IDENTITY.txt` | hashes of the tar and the manifest, file count, Git `HEAD`, `git status`, date |
| `runtime-changes-since-cd16dcc.diff` | the two runtime changes against `HEAD` |

## 4. How to verify independently

1. `sha256sum -c` the two lines in `BASELINE-IDENTITY.txt`. This checks the tar and the manifest.
2. Extract the tar into an empty folder and run `sha256sum -c MANIFEST.sha256` there. Every file must say OK, and the number of lines must
   equal the file count recorded.
3. Optionally, compare against the live working tree: `sha256sum -c` from the repository root.
4. To re-run the tests, follow `X1-ACCEPTANCE-PACKAGE.md` §6 using the extracted tree.
