# X1 registers: defects, changes, known limitations, residual risks (21 Nov 2026)

## 1. Defect register (this task; earlier issues 1–34 are in v2 Appendix C)

| ID | Problem | Root cause | Correction | Files | Tests | Result | Remaining risk |
|---|---|---|---|---|---|---|---|
| DEF-A1 | Reorder Policy "Why" said "Within ±20% of the calculated value" for items with **no** workbook ROP, and "No demand, so no calculation" for **Not Assessed** items (demand unknown, not zero) | the explanation fell through to the aligned-case text for any other verdict; it tested demand before the verdict | verdict-specific text: Not Assessed shows its reason; "No reorder point configured" says there is nothing to compare and the calculated ROP is indicative | `js/app.js` | acceptance-wording B (3 checks) | PASS; fails on `cd16dcc` | none known |
| DEF-A2 | Summary listed "Review reorder points (0 items look too low)", and could list "Secure supply for the 0 critical items ()" or "Review excess stock (0 items)" | recommendations were always listed, whatever the count | zero-count lines say what is true ("Reorder points not checked", "Reorder points: none look too low", "No critical items", "No excess stock"); non-zero wording unchanged | `js/app.js` | acceptance-wording C (4 checks) | PASS; fails on `cd16dcc` | the weak-supplier line keeps "(none)", which is pinned by protected tests and already explicit |
| DEF-A3 | Banner said "Affected items stay in every list with the status Not Assessed" when no item was Not Assessed | one fixed sentence | the sentence appears only when an item is Not Assessed; otherwise "Every item is still assessed: only the figures that need this data are withheld or shown as not configured …" | `js/app.js` | acceptance-wording A (2 checks); browser-x1-chrome (the D4 sentence kept for every scenario with Not Assessed items) | PASS | none known |

No calculation changed: `calculations.js`, `x1-integrity.js`, the adapter and every engine output are byte-identical to `cd16dcc`, and the
golden and confidence snapshots are unchanged.

## 2. Change register

- **CR-33** (this task), appended to `X1-CHANGE-RECORD.md`.
- **CR-01 to CR-32** are unchanged and cover the earlier X1 tasks.

## 3. Known limitations

| # | Limitation | Effect | Owner action |
|---|---|---|---|
| L1 | The live test site serves `cd16dcc`, not the candidate | the three wording corrections cannot be seen on a phone yet | authorise a redeploy, if wanted |
| L2 | The page and browser title still say "v0.6" | build identity on screen is out of date; the manifest is the real identity | decide a version label |
| L3 | `check-control` fails until Tag-6 | by design; not an X1 defect | Tag-6 reconciliation |
| L4 | 5 BLOCKED and 2 REDUCED tests | they predate X1 (historical trees, tags, Playwright) | none for X1 |
| L5 | `test-x1-acceptance-wording` is not registered | it is not run by `run-all.sh` until registered | approve `PROPOSED-REGISTRATION.txt` |
| L6 | Physical Android evidence is owner-reported; no screenshots retained; Chrome version unconfirmed | evidence relies on the owner's report | none required |
| L7 | Issue 8: the import gate's generic NON_FINITE_VALUE code (no screen shows it) | none for users | revisit if an import screen is built |
| L8 | Deferred decisions: D2, D3 Stage 1 part, D5 E1, Q5, text-number policy | outside this acceptance | as you decide |
| L9 | An import route refuses whole files where the direct route contains per item (§7.1) | safe, but strict | future policy |

## 4. Residual risks

| # | Risk | Likelihood / impact | Control |
|---|---|---|---|
| R1 | One unidentifiable BOM line with real parent sales makes every material Not Assessed | likely on messy files; disruptive but safe | High warning names the row; never a guess |
| R2 | Feasibility propagation is conservative (later non-shortage orders become Insufficient information) | medium; safe direction | reason shown |
| R3 | The hidden adapter list (`CGExcludedItems`) is lost if the adapter workbook is saved and reopened | low; safe direction (codes read as unknown) | documented; control test |
| R4 | Calculation correctness rests on Claude's own independent recomputations (§B of the verification record); no human review | low to medium | owner rule 13.2 kept; nothing labelled Verified |
| R5 | Workbook-policy reorder and safety-stock checks stay visible for materials whose usage is incomplete | low; they compare stock with fixed limits, not with usage | severity still Not Assessed |
