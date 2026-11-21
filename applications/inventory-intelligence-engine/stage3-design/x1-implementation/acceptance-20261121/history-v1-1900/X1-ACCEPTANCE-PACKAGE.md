# X1 owner acceptance package (21 Nov 2026)

*Prepared by Claude under the owner's master authorisation. X1 is **not** accepted: that is the owner's decision. No commit, push, merge, tag,
publication or deployment was made. The original repository is unchanged. This is a self-assessment, not independent review.*

## 1. Recommendation: READY WITH EXPLICITLY DISCLOSED EXCEPTIONS

**Why:**
- 21 of the 22 acceptance criteria PASS. The policies, owner decisions and later requirements all PASS (`X1-REQUIREMENTS-MATRIX.md`).
- The physical Android results stay valid for everything they recorded (`X1-VERIFICATION-RECORD.md` §E).
- Your two Test 3 wording observations were genuine, and both are now fixed.

**The exceptions** (none is a defect in the candidate):
1. **Criterion 19 is PARTIAL.** Every runnable regression test passes. `check-control` fails by design until Tag-6, and 5 tests are BLOCKED
   and 2 REDUCED. All of these predate X1.
2. **The three wording corrections are verified by automation and emulation only.** The live test site still serves `cd16dcc`.
3. **The new wording test is not registered,** because this authorisation forbids changing accepted results and checksums. The proposed
   lines are ready.
4. **The page still says "v0.6".** No version has been approved for this build.

## 2. The exact candidate

| Item | Value |
|---|---|
| Reference build | `cd16dcc` (temporary repository `MB20252025/chain-genius-x1-android-test`, `main`; live test site) |
| Candidate | `cd16dcc` plus **one changed runtime file**, `js/app.js` (sha256 `6bf0223a71f09138…`, was `a55c24ecd8370f3d…`). It is uncommitted in the temporary repository's working tree |
| Runtime identity | `CANDIDATE-RUNTIME-MANIFEST.sha256` (10 files the page loads). The other 9 are byte-identical to `cd16dcc` |
| Commit identifier | **none.** The candidate is not committed, and no commit ID is claimed or invented |
| Source lineage | original `development/v0.7` `eddf09b` + the uncommitted Stage 3 + X1 working tree that passed the final X1 regression (= `cd16dcc` runtime), + CR-33 |

## 3. Changes since `cd16dcc` (all in `js/app.js`; diff in `evidence-files/`)

| ID | Change | Why | Verified by |
|---|---|---|---|
| DEF-A1 | Reorder Policy "Why" is verdict-specific | Test 3 observation 1; Not Assessed materials said "No demand" | acceptance-wording B; rendering comparison |
| DEF-A2 | Summary: no "(0 items look too low)" or other zero-count contradiction | Test 3 observation 2 | acceptance-wording C |
| DEF-A3 | Banner: "Not Assessed" sentence only when an item is Not Assessed | earlier sanity-check finding | acceptance-wording A; browser-x1-chrome |

No calculation changed. With clean data, every tab's text is identical to `cd16dcc`.

## 4. Release notes (candidate against `cd16dcc`)

- Reorder Policy now explains items with no workbook reorder point ("No workbook reorder point to compare; the calculated ROP is
  indicative"), and shows the actual reason for Not Assessed items.
- The Summary no longer recommends acting on zero items. It says "Reorder points not checked" when none were supplied, "Reorder points: none
  look too low" when they were compared, and "No critical items" or "No excess stock" when there are none.
- The missing-data banner says "Every item is still assessed …" when no item is Not Assessed (for example, an absent reorder-point column).
- No change to any figure, status, export value or calculation.

## 5. Build and verification instructions

1. **Runtime:** serve the folder `applications/inventory-intelligence-engine/` over any static web server, then open `index.html`. There is no
   build step and no dependencies beyond the files in the manifest.
2. **Check the identity:** from that folder, run `sha256sum -c CANDIDATE-RUNTIME-MANIFEST.sha256`. Use the copy in this package; the paths
   are relative to the application folder.
3. **Tests:** use a throwaway copy of the original working tree (the Git tags it needs exist only there), and lay the candidate's `js/app.js`
   and the new test on top. Then run:
   - `NODE_PATH=<pinned node_modules> bash tests/run-all.sh --full`
   - `node tests/test-x1-acceptance-wording.js`

   The full tier needs Python 3 with pandas and openpyxl at the versions in `tests/requirements.txt`. Expected results are in
   `X1-VERIFICATION-RECORD.md` §A.

## 6. Package contents

| File | Contents |
|---|---|
| `X1-ACCEPTANCE-PACKAGE.md` | this file |
| `X1-REQUIREMENTS-MATRIX.md` | the 22 criteria, the policies, the decisions, deferred items |
| `X1-VERIFICATION-RECORD.md` | tests, calculation checks, regression, browser, performance, Android reconciliation |
| `X1-REGISTERS.md` | defects, changes, known limitations, residual risks |
| `PROPOSED-REGISTRATION.txt` | the lines to register the new test, if you approve them |
| `CANDIDATE-RUNTIME-MANIFEST.sha256` | the candidate's identity |
| `evidence-files/` | regression output, wording-test outputs (candidate and `cd16dcc`), the `app.js` diff, timings |

## 7. Your decision

- **Accept X1** (as this candidate, with the disclosed exceptions), **or reject it with the corrections you want.**
- After acceptance, Phase G preserves this exact candidate as a local baseline package with its manifest. That needs no Git operation.
- **Optional separate permissions** (only if you want them):
  1. Approve `PROPOSED-REGISTRATION.txt`, so `run-all.sh` runs the new test.
  2. Authorise redeploying the temporary test site with the candidate's `js/app.js`. That would be a commit and push to the temporary
     repository's `main`; GitHub Pages republishes automatically. It would let you see the wording on your phone.
  3. Choose a version label to replace "v0.6".
