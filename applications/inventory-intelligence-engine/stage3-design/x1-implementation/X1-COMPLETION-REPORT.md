# X1 — Final completion report (21 Nov 2026)

*Prepared by Claude under the owner's "X1 Final Completion Authorisation" (21 Nov 2026, 09:13). This is a self-review, not
independent verification. No commit, push, merge, tag, publish or deployment. No Stage 3A work. No Stage 2 closure. Formal X1
acceptance is the owner's. `stage3-design/evidence/` was excluded from every command, hash, copy and test run.*
*Earlier reports (`X1-VERIFICATION-REPORT.md` and before) are kept unchanged as history.*

## A. Executive conclusion

- **X1 is complete within this authorisation, except items that need you** (physical Android test, owner acceptance, Tag-6) or
  that you deferred (D2, D5/E1, Q5, D3 Stage 1 part, text-number policy).
- **Owner-required corrections done:** issue 26 fixed; blank/unknown `Material_ID` handled (decision in §E).
- **Three further defects found and fixed** in this review: false structural 0 for a trailing-space code at the shared record
  (identifier trimming), "Exposed £/mo" reading unknown demand as 0, and the word "null" printed in on-screen reasons.
- **Every evidence gap from the verification report is now closed by an automated test** (`test-x1-completion.js`, 48 checks,
  with independent recalculations).
- **Full regression: 50 tests passed (+ pre-flight), 1 FAIL, 5 BLOCKED, 2 REDUCED.** The FAIL is `check-control`, the expected
  Tag-5 guard; its content is identical to the verification run (same 9 approved lines). Golden v0.5, v0.6.0 and the confidence
  snapshot pass unchanged.
- **Performance:** `analyse()` at 5,100 items 1.22–1.33 s (budget 2 s): **met**. Tab switching: **met** at Northstar size
  (worst 254 ms); at 5,100 items one tab is **borderline** (worst 309 ms; one earlier run 451 ms; start-of-task code 180 ms on the
  same machine; run-to-run noise is large). See §F.

## B. Matrices

### B1. The seven field policies (v2 §5.1–§5.7; verification scope, not an approved requirements list)

| Policy | Direct route | Import route | New evidence this task | Status |
|---|---|---|---|---|
| §5.1 On_Hand_Qty | blank/invalid/negative → Not Assessed; column absent → all 150 Not Assessed, total not a number | negative/invalid → row quarantined (D1(a)); column absent → Stage 1 refuses (REQUIRED_UNMAPPED) | column-absent tests, both routes | **COMPLETE** (Stage 1 column-level part of D3 DEFERRED by owner) |
| §5.2 Allocated_Qty | blank = 0 by policy; invalid → Not Assessed | quarantine | kept (existing tests) | **COMPLETE** |
| §5.3 Unit_Cost_GBP | negative → value withheld, quantities assessed; zero → suspicious; column absent → all values withheld, statuses unchanged | quarantine | negative and column-absent tests; partial total checked against an independent sum | **COMPLETE** |
| §5.4 Units_Sold | missing months unknown (D6); column absent → all items Not Assessed, no forecast | per-cell | column-absent test | **COMPLETE** |
| §5.5 BOM quantity | zero/negative/invalid → line invalid; column absent → every material Not Assessed, every order "Insufficient information" | zero → materials Not Assessed (D1(b)) | column-absent and import-zero tests | **COMPLETE** |
| §5.6 On_Order_Qty | blank with sup = 1 → Not Assessed; with sup = 0 → unaffected | negative → quarantine (D1(d)) | sup = 1 blank test; import negative test | **COMPLETE** |
| §5.7 Reorder_Point_Qty | blank/absent → "No reorder point configured" (assessed); invalid → Not Assessed | negative → quarantine (D1(d)) | issue 26 fix; absent and invalid tests; import negative test | **COMPLETE** |

### B2. Owner decisions D1–D7

| Decision | What it says | Status |
|---|---|---|
| D1(a) | quarantine identified stock rows (minimum Stage 2 adapter change) | **IMPLEMENTED** (task 4), re-tested here |
| D1(b) | BOM zero quantity is invalid on both routes | **IMPLEMENTED**; import route now tested |
| D1(d) | negative On_Hand / On_Order / Reorder_Point on both routes | **IMPLEMENTED**; import negative On_Order and Reorder_Point now tested |
| D2 | per-figure input IDs | **DEFERRED** (owner) |
| D3 | missing columns contained | **IMPLEMENTED** on the direct route; Stage 1 column-level part **DEFERRED** (import refuses, which is safe) |
| D4 | Not Assessed severity/health | **IMPLEMENTED**, verified |
| D5 | 90-day rule; E1 | 90-day rule **IMPLEMENTED**; E1 **DEFERRED** |
| D6 | missing months unknown; calendar-aligned usage | **IMPLEMENTED**; usage independently recalculated for all 100 materials |
| D7 | (preserved as decided) | **COMPLETE**, unchanged |
| Q5 | quarantine not extended to unmatched codes / suggested links / TOTAL rows | **DEFERRED** (owner); not touched |
| Q6 | structural 0 only with a complete valid BOM | **COMPLETE**; all listed cases tested |

### B3. Issue register (v2 Appendix C, current status)

| Issue | Status |
|---|---|
| 1–7, 9–25 | as recorded in v2 Appendix C (resolved, implemented or owner-decided) |
| 8 — import route shows generic NON_FINITE_VALUE | **Kept, documented.** It is internal to the Stage 2 gate and shown on no screen; every user-facing reason comes from `reasonsFor`, which is specific. Changing it would be Stage 2 gate work outside this authorisation. |
| 26 — absent ROP column overstated in record and notice | **FIXED** (CR-24) |
| 27 — blank/unknown Material_ID could give false structural 0 | **FIXED** (CR-25, §E) |
| 28 — "Exposed £/mo" read unknown demand as 0 | **FIXED** (CR-25) |
| 29 — reasons printed "null" | **FIXED** (CR-25) |
| Text-number policy (e.g. "3" stored as text) | **Existing behaviour preserved** (engine reads it as 3; the record flags it invalid). Test pins both. Owner policy pending. |
| v2 §7.1 route differences | Documented: a missing required column and a blank/unknown BOM component refuse the **whole import** on the import route, but are contained per item on the direct route. Both are safe (no false figure). |
| No import screen | Not built (by instruction). Import route is tested in Node only. |
| Physical Android | Not done. Checklist: `ANDROID-CHECKLIST-FINAL.md`. |

## C. Defect corrections (this task)

1. **Issue 26.** `x1-integrity.js` `assess()`: column-level absence now honours `accepts`. Result: ROP absent → risk-status withheld 0
   (was 150); reorder comparison 150; banner and MRP notice name only the comparison.
2. **Blank/unknown Material_ID** (§E). `calculations.js` (inline, 217 lines kept) and `x1-integrity.js`.
3. **Identifier trimming.** The record trimmed direct-route IDs, the engine does not. "RM050 " was "RM050" to the record only, so the
   two disagreed. The direct route now keys records exactly as the engine matches them.
4. **Exposed £/mo.** Unknown parent demand gave a 0 contribution (an understated £). Now unknown ("–"). Price handling unchanged.
5. **"null" in reasons.** A reason without a source row printed "null". Fixed in `reasonsFor`; a test proves it fails without the fix.

No owner decision conflicted with these changes. No protected baseline was found corrupted.

## D. Test evidence

- **New `tests/test-x1-completion.js`: 48 checks, all pass** (5 time zones in the runner). Contents:
  - independent recalculations (not calling production formulas): calendar-month usage for all 100 materials from the raw BOM and
    demand sheets; FG001 average demand by hand; inventory value from the sheet; partial value total after a negative cost; exposed £
    for RM001;
  - §5.1 On_Hand column absent (direct + import); §5.3 negative cost, cost column absent; §5.4 Units_Sold column absent;
    §5.5 BOM quantity column absent, zero via import; §5.6 blank On_Order with sup = 1 and sup = 0, negative via import;
    §5.7 issue 26 (absent), invalid "abc", negative via import;
  - Q6: complete BOM with no use → 0; missing parent, quantity column absent, invalid, zero → unknown; BOM sheet missing and invalid
    scrap → refused;
  - Material_ID: blank, whitespace-only, unknown code, trailing-space code, mixture, valid code, otherwise-unused material affected,
    unrelated materials and all products unchanged, import refusal;
  - text-number behaviour pinned; exposed £; no "null"/"undefined"/"NaN" in reasons;
  - every case checks the unaffected items are identical to clean data, and that engine and shared record agree.
- **Existing X1 tests unchanged and passing:** foundation 40, containment 41, wp5 56, browser-x1-chrome 334.
- **Registration:** `accepted-results.json` (new entry, accepted 48); `checksums.txt` one new line with a dated comment;
  `check-protection` 449 → 450. No protected test, snapshot or expected result was changed or weakened.
- **Full regression** (throwaway copy, evidence folder excluded): `browser-evidence-20261121-final/full-regression-20261121-final.txt`.
  - 50 tests passed (+ pre-flight).
  - 1 FAIL: `check-control` (Tag-5 guard; identical 3 sub-failures to the verification run; the new checksum line shows as PENDING).
  - BLOCKED (5, unchanged): test-fglt-note, test-forecast-conf, test-supplier-eligibility, phase2-comparison, test-paging-chrome.
  - REDUCED (2, unchanged): test-phase1 57/125, test-uom 110/164.

## E. Data integrity — blank/unknown Material_ID decision record

**Decision** (made by Claude under the authorisation; owner may revisit):

| Situation | Treatment | Principle |
|---|---|---|
| BOM line with blank, whitespace-only or unknown Material_ID (direct route) | not used; never mapped, trimmed or guessed | 1 |
| The line | High data-quality warning with sheet row and parent | 2, 3, 4, 10 |
| Its parent's production orders | "Insufficient information", reason names the blank/unknown material | 4, 7 |
| A material with no valid BOM line | Not Assessed: "usage unknown, not zero …" plus the bad codes | 5, 9 |
| A material with valid lines | unchanged (assessed) | 6, 8 |
| Import route | Stage 1 rejects the line and refuses the import (existing, safe; Q5 unchanged) | 7 |

**Residual risk:** if the bad line was meant for an already-assessed material, that material's usage is understated. The High
warning is the control. The alternative (withholding all 100 materials) would break principle 6.

**Other integrity checks this task:** no unknown read as 0 found in sums other than issue 28 (scan of every `||0` / `??0` site);
supplier totals, family totals and ABC already handle unknowns (earlier tasks); totals with any unknown part stay non-finite.

## F. Browser and performance

**Browser** (headless Chrome, desktop 1366×900 and Pixel 5 emulation; not a physical phone; no import screen exists):
- `browser-x1-chrome` 334/334 and `browser-chrome` 53/53 in the regression.
- New `final-browser` check, 18/18: Not Assessed row and reason for RM050; Data quality warning names the row; feasibility reason;
  export row carries the reason; issue 26 notice; no page overflow; 0 console errors. Screenshots in `browser-evidence-20261121-final/`.

**Performance** (this container; Node and headless Chrome; machine noise is large):

| Measure | Budget | Measured | Result |
|---|---|---|---|
| `analyse()`, 5,100 items | < 2 s | 1.22–1.33 s median (1.28 s start-of-task code) | **Met** |
| Whole `runEngine` incl. forecasts and X1, 5,100 items | none set | 4.5–5.0 s (X1 part ~0.4 s) | for information |
| Tab switch, Northstar 150 items, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 254 / 213 ms | **Met** |
| Tab switch, 5,100 items, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 309 / 249 ms (earlier run 451 / 291; start-of-task code 189 / 218) | **Borderline** on desktop (Finished goods, Materials) |

No measurable slowdown from this task's changes (`analyse()` and `runEngine` within noise of the start-of-task code).

## G. Android checklist

`ANDROID-CHECKLIST-FINAL.md`: three files, three short tests, what to expect, what screenshots to send.

## H. Working-tree inventory (against `start-state-5`)

HEAD `eddf09b` unchanged; index empty; 0 stashes; 0 files removed; evidence folder not in any hash list.

| Changed (6) | Why |
|---|---|
| `js/calculations.js` | Material_ID, exposed £ (still 217 lines) |
| `js/validation/x1-integrity.js` | issue 26, Material_ID rule, exact keys, "null" fix |
| `tests/accepted-results.json` | new test entry; check-protection 450 |
| `tests/checksums.txt` | one new line + comment |
| `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md` | §13.4, revision row 13, issues 27–29, status update |
| `x1-implementation/X1-CHANGE-RECORD.md` | CR-24 to CR-27 |

New (25): `tests/test-x1-completion.js`; this report; `ANDROID-CHECKLIST-FINAL.md`; `start-state-5/` (3 files);
`browser-evidence-20261121-final/` (screenshots, results, timing, scripts, 2 workbooks, regression output, end hashes).
Test runs created artefacts only in `/tmp` copies.

## I. Remaining work

| Kind | Item |
|---|---|
| Complete | seven policies; D1, D3 (direct), D4, D6, D7; Q6; issue 26; Material_ID; evidence gaps |
| Deferred by owner | D2 per-figure IDs; D3 Stage 1 column level; D5 E1; Q5; text-number policy |
| Needs you (physical / approval) | Android checklist on your phone; formal X1 acceptance; Tag-6 and the check-control/PENDING approvals; commit |
| Future policy | import route per-item containment instead of whole-import refusal (§7.1); issue 8 gate wording if an import screen is built; tab speed at 5,000+ items |

### Documentation package map (the owner's 16 items)

| # | Item | Where |
|---|---|---|
| 1 | updated design | v2 §13.4 |
| 2–4 | policy matrix, D1–D7 matrix, Q5/Q6 | §B1, §B2 |
| 5 | Material_ID decision | §E, v2 §13.4 |
| 6 | issue register | §B3, v2 Appendix C |
| 7 | production-file inventory | §H |
| 8–10 | tests, fixtures, register, results, regression | §D; `accepted-results.json`; regression output |
| 11 | snapshot and protection | §D (snapshots unchanged; 450/450) |
| 12 | performance | §F |
| 13 | browser evidence | `browser-evidence-20261121-final/` |
| 14 | Android checklist | `ANDROID-CHECKLIST-FINAL.md` |
| 15 | technical review | this report |
| 16 | limitations and deferred work | §I |

---
**Superseded in part, 21 Nov 2026 (later the same day).** §E's rule "a material with valid lines stays assessed" and its residual-risk
note were replaced under the owner's "X1 Final Material Integrity Correction". See `X1-MATERIAL-INTEGRITY-REPORT.md` and v2 §13.5. Everything
above is kept unchanged as the record of that task.
