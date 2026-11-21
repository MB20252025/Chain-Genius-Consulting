# X1 — Android phone checklist (final, 21 Nov 2026)

No physical Android test has been done by Claude. Everything below is for you to run on your phone in Chrome.
The earlier `MANUAL-ANDROID-TEST.md` stays as history; this list replaces it for the X1 sign-off.

**You need:** the app open in Android Chrome (served the usual way), and these three files on the phone:

| File | Where |
|---|---|
| Northstar (clean) | `tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx` |
| Blank Material_ID | `x1-implementation/browser-evidence-20261121-final/workbooks/blank-material-id.xlsx` |
| No reorder-point column | `x1-implementation/browser-evidence-20261121-final/workbooks/no-rop-column.xlsx` |

## Test 1 — clean Northstar (nothing should be "Not Assessed")

1. Load Northstar. **Expect:** "Analysed." within a few seconds. No red error box.
2. Open each tab once (swipe the tab row). **Expect:** each opens in well under a second; no blank screen.
3. Materials tab. **Expect:** no row says "Not Assessed"; the "Exposed £/mo" column shows £ figures.
4. Rotate the phone, then back. **Expect:** the page fits the width; only tables scroll sideways.

## Test 2 — blank Material_ID

1. Load `blank-material-id.xlsx`.
2. Data quality tab. **Expect:** a High item "BOM lines with a blank or unknown Material_ID", naming "row … (FG001 / blank)".
3. Materials tab, find **RM050** (tap "Show all" if needed). **Expect:** "Not Assessed – … usage unknown, not zero …".
   No "null" anywhere in the text.
4. Materials tab, **RM001**. **Expect:** a normal status (it has valid BOM lines, so it is still assessed).
5. Production feasibility. **Expect:** FG001 orders "Insufficient information", with "blank Material_ID" in the reason.
6. Tap Export. **Expect:** a file downloads; open it; RM050's row says Not Assessed with the reason.

## Test 3 — no reorder-point column (issue 26)

1. Load `no-rop-column.xlsx`.
2. **Expect:** the notice names `Reorder_Point_Qty` but does **not** say risk status is withheld.
3. Materials and Finished goods tabs. **Expect:** no "Not Assessed"; statuses say "No reorder point configured".

## What to send back

- One screenshot each of: Test 2 step 2, step 3, step 5; Test 3 step 2.
- Phone model and Android/Chrome version (Chrome menu → Settings → About Chrome).
- Anything that looked wrong, cut off, slow (over about 1 second) or confusing, with the tab name.

---
## Addendum, 21 Nov 2026 (material-integrity correction): this replaces Test 2 step 4 and adds Test 4

**Test 2 step 4 (changed).** In `blank-material-id.xlsx`, **RM001** now shows **Not Assessed – … usage incomplete …**, and its "Est use/mo"
reads **"at least … (incomplete: not used in any calculation)"**. (Before, it showed a normal status. That was the residual risk you
rejected.)

**Test 4 — blank line beside a complete BOM.** File: `x1-implementation/browser-evidence-20261121-material/workbooks/blank-line-full-bom.xlsx`.
1. Materials tab, find RM001. **Expect:** Not Assessed, "usage incomplete", "at least 386 (incomplete: not used in any calculation)".
   The grey note above the table explains that no material's usage can be shown as complete.
2. MRP tab. **Expect:** RM001 Not Assessed, with no gross or net figure.
3. Production feasibility. **Expect:** FG002 orders "Insufficient information". Every order after it is either "Material shortage" or
   "Insufficient information", with the reason "an earlier order's material use is unknown". Nothing says "Feasible" after it.
4. Finished goods tab. **Expect:** normal statuses (products do not depend on the BOM).
5. Export, open the file, find RM001. **Expect:** "Not Assessed" and a reason ending "known part of usage: at least 386.4/mo, incomplete,
   not used in any calculation".
6. Anywhere: the words "null", "undefined" or "NaN" must not appear.

**Extra screenshots to send:** Test 4 steps 1, 3 and 5.

---
## Addendum 2, 21 Nov 2026, 15:55 sanity check (wording only, no behaviour change)

Every expectation above was re-checked against the final code in headless Chrome with Pixel 5 emulation, which is not a real phone.
All pass, with one wording correction:

**Test 3 step 3 (corrected).** "No Not Assessed" means **no item row**. Every row's status reads "No reorder point configured". The yellow
banner at the top still contains its general sentence "Affected items stay in every list with the status **Not Assessed** …", although here no
item is Not Assessed. That sentence is a known wording issue, reported to the owner and not yet fixed; it is not a failure of this test.

**The four workbooks** (all paths under `applications/inventory-intelligence-engine/`):

| Test | File | Status |
|---|---|---|
| 1 | `tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx` | existing accepted fixture, unchanged |
| 2 | `stage3-design/x1-implementation/browser-evidence-20261121-final/workbooks/blank-material-id.xlsx` | made in the completion task; file unchanged, **expectation for RM001 changed** (Addendum 1) |
| 3 | `stage3-design/x1-implementation/browser-evidence-20261121-final/workbooks/no-rop-column.xlsx` | made in the completion task; unchanged |
| 4 | `stage3-design/x1-implementation/browser-evidence-20261121-material/workbooks/blank-line-full-bom.xlsx` | **new** in the material-integrity task |

**Before you start:** the X1 changes are not yet on GitHub (they are uncommitted in Claude's workspace). A copy opened from GitHub, or from
a checkout of `development/v0.7` or `main`, is the pre-X1 version, and these tests will not show the expected results on it. If you have opened
an X1 build at the same address before, reload the page fully so new script files load.
