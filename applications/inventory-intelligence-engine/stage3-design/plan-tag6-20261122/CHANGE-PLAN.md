# SCIE controlled change plan for Tag-6 readiness (22 Nov 2026)

Branch `plan/tag6-20261122`. Prepared by Claude as technical lead under the owner's "Controlled change plan" brief of
22 Nov 2026. **Phase 1 only: nothing in this plan has been implemented.** The candidate `43b6b55`, the baselines, Tag-5,
the guard, the registry and all evidence are unchanged. My own checks are engineering evidence, not independent verification.

Evidence base:
- Fresh clone at `43b6b55`, with a clean working tree. Same commit IDs as listed in the brief.
- The 22 Nov verification: `verification/tag6-20261122` (`af8eb6d`), `…/verification-20261122/`.
- New investigation for this plan: `plan-tag6-20261122/evidence/` (fixture scan, warning lists).

Links: `C` = `https://github.com/MB20252025/chain-genius-consulting/blob/43b6b5587cef0e63aa9c4faaa955cc3ff1f228f6/applications/inventory-intelligence-engine`.

---

## A. Executive assessment

**Candidate status.** `43b6b55` is a clean, traceable commit: Stage 2 (`eddf09b`) → unaccepted Stage 3 (`0d71aab`) →
accepted X1 (`a4e05e8`) → records-only commits. It is **not release-ready**:
- 48 registry items and 3 guard FAILs are unapproved;
- the Stage 3 rules are not accepted;
- your five checks are not done;
- if the recommended changes below are approved, a new candidate will be needed.

**Verified (by Claude):**
- The guard figures (48 / 27 / 3).
- 14 registry counts, each re-run.
- The full fast and full tiers on GitHub's runners for the exact commit: 38 and 53 tests passed (+ pre-flight); 1 FAIL (the guard); 4 BLOCKED and 2 REDUCED.
- The real application in Chrome on Northstar, clean and faulty: 44 of 44 worksheet figures agree, using worksheet v2.
- The 8 ABC changes on the faulty workbook.
- D6 arithmetic, reproduced from the raw Willow sheets.

**Not verified:**
- Anything by a person other than Claude; your five checks are still to come.
- Physical Android for the current candidate (your earlier Android Test 3 was on the X1 build).
- The six historical comparison tests (their v0.6 files are missing).
- Multi-zone results beyond the 21 Nov CI runs.
- Whether D6's "missing month = unknown" is the right business meaning (a policy question).

**Main strengths:**
- Unknown values are never silently turned into zero (X1), and the reference arithmetic agrees.
- The Tag-5 guard does its job: every protected change is visible and needs approval.
- Clean separation in Git between Stage 2, Stage 3, X1 and the records.

**Main risks:**
1. Three on-screen totals still show "£–" when one item is unknown. The app's own banner says totals "say how many items they cover", so this contradicts it (finding E-1).
2. A fully allocated item with no demand is labelled "Active", with no prompt to investigate (A1).
3. An unknown allocation still allows the item to be listed as dead stock (A2).
4. The dead-stock view and the export do not give the uncommitted figure clearly (B1).
5. The Tag-6 approval must cover the whole registry block; it cannot approve part of it.

**Recommended route.** Approve this plan. I then build one new candidate on `43b6b55` containing:
- the small changes in A1, A2, A3, B1, B2 and E-1;
- the limitations documentation;
- one new test file.

I re-verify it in full, prepare your worksheet, you do the five checks, and then you decide on Tag-6. The paging
proposal and the guard diagnostics stay separate, after Tag-6.

---

## B. Decision register

Status column: all items were awaiting owner approval when the plan was written. **Owner decisions of 22 Nov 2026 are recorded in `OWNER-DECISIONS-TAG6.md`** (A1–A6, B1–B5, E-1, E-9, E-13 approved; A3 approved as a departure; A6 approved as a business rule; R2, G1, E-6, E-7 deferred). "Rebuild" means the change requires a new candidate commit.

| ID | Current behaviour (43b6b55) | Evidence | Recommended approach | Alternatives considered | Reason | Operational impact | Files affected | Rebuild | Classification | Departure from recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| **A1** Allocated stock and dead stock | Dead-stock listing uses uncommitted stock = max(physical, usable) − allocated (`C/js/calculations.js#L150`). A no-demand item whose stock is fully allocated is classed **"Active"** and is not mentioned anywhere | `dead-stock-allocation-probes.txt`: FG050, 10 on hand, 10 allocated → Active. Fixture scan: 0 such items in 17 fixtures | **Option D**. Keep the uncommitted rule, so committed stock is never dead stock. Add one Medium data-quality warning: **"Stock fully allocated to orders but no recorded demand: check the allocations"**, naming the items | A: Tag-5 rule (physical > 0; lists committed stock as dead). B: usable basis only. C: as now, silent | Committed stock is not disposable, so it must not be listed (C/D). But allocations with no demand behind them usually mean a stale reservation or a data error, which a planner should see (D) | Users stop seeing promised stock as write-off candidates, and get a prompt to clean up stale allocations | `js/calculations.js` (one `add(…)` next to the existing "Stock held with no demand" warning); new test | yes | **ACCEPT** | Reject D → keep C (accepted behaviour is silence; no rebuild for this item). Choose A → C-STK/R2-STK reworked inside X1 code, two Stage 3 tests changed; large rebuild |
| **A2** Unknown allocation in dead stock | A blank or unreadable Allocated_Qty makes the item **Not Assessed** (X1), but `stockB` counts the allocation as 0 for listing, so it can still be **"No recorded demand"** (probe: FG050 blank/"abc" → listed) | `#L150` `(isFinite(A)?A:0)`; probes; X1 wp5 already makes RM001 "Not Assessed" on its path | **Option B**: where the allocation is unknown and stock is held, the stock class is **"Not Assessed"** with reason "Allocated_Qty blank/invalid", never a dead-stock class | A: keep (two signals disagree). C: blank = 0 everywhere (contradicts X1 D1) | One item must not be both "cannot be assessed" and "dead stock". This matches X1's rule that unknown is never 0 | Removes a contradiction a client would notice; only rows with unknown allocations change (none in the fixtures) | `js/calculations.js` line 150 (class ternary only; `stockB` unchanged); new test | yes | **ACCEPT** | Reject → behaviour stays as now; documented as a known limitation |
| **A3** Usable vs physical stock | Availability already uses usable stock where it is a valid number, otherwise physical (`const risk`, D5 note at `#L56`). Dead-stock listing uses the **larger** of the two. "Allocated exceeds usable on-hand" (High) already fires when allocation is above usable. No warning when usable > physical | Code `#L56`, `#L150`; no fixture has a usable column (scan) | **Option B for availability, already in place: no change.** Keep the max() basis for dead-stock listing. Add a warning only for the impossible case: **"Usable on-hand exceeds physical on-hand: check the stock record"** (Medium) | Switch dead stock to usable-only (owner's B taken literally). Flag every physical ≠ usable difference | Physical above usable is normal (quarantine, damage, inspection). Warning on it would be noise. Listing on usable-only would hide quarantined no-demand stock, the stock most likely to need writing off | Unusable stock stays visible for review; impossible records are flagged; no noise | `js/calculations.js` (one `add(…)`); new test | yes (warning only) | **ACCEPT** | **This recommendation is itself a departure from the owner's earlier preferred approach (Option B: use usable stock and flag every physical/usable disagreement).** Agreed resolution (owner, 22 Nov 2026, 02:40): availability keeps using valid usable stock; dead-stock assessment keeps max(physical, usable) − allocated; warn when usable exceeds physical; physical, usable, allocated and uncommitted stay visible. See `OWNER-DECISIONS-TAG6.md`. Had the earlier approach been kept instead: quarantined stock would drop out of the dead-stock list, and normal quarantine stock would raise warnings |
| **A4** Empty and whitespace-only text | Empty or whitespace-only cells are missing on the direct route (`C/js/excel-import.js#L12`); blank units are missing, not "unrecognised" (test-uom U5). Willow: 19 → 11 POs received short (8 open or cancelled POs had empty-text receipt cells) | `snapshots/README.md`; `test-empty-text` 46 (re-run 22 Nov); willow recount 11 | **Accept as implemented**: matches your stated rule and the import route (Stage 1) | Reverse: empty text counts as a value | Blank means "no value" on both routes; counting open orders as received short was wrong | The PO figures clients see are now correct | none | no | **ACCEPT** | Reject → load-bearing: `43b6b55` is invalid. `excel-import.js`, test-uom, test-empty-text and the confidence reference revert; full rebuild and re-verification |
| **A5** Willow and other differences | Remaining differences on Willow: (1) engine ROP vs the workbook's own ROP (24 "possibly excessive", 3 "insufficient", 4 aligned, 5 "–"); (2) the 19 → 11 PO count; (3) ing 017's verdict | `verification-20261122/d6/`; Willow has no external calculated figures (its "Pivot (old)" sheet says "ignore") | **No engine change.** (1) is a different, valid methodology: the workbook's ROP is the client's own policy, and the comparison is the product's purpose. (2) is A4. (3) is A6 | Force the engine to match workbook ROPs | No external reference method exists to match; the differences are the findings a consultant would present | None | none | no | **ACCEPT** (no change) | — |
| **A6** Missing demand month (D6) | A month with no usable demand row is **unknown**, not zero. Raw-material usage is by calendar month. Implemented in X1 (`C/js/calculations.js` WP6). Willow: 20 items have at least one unknown month; ing 017 has 4 of 10, so its ROP calc falls from 2,890 to 2,429 (workbook 2,083) | D6 arithmetic reproduced from the raw sheets (`d6/13-ing017-raw-check.txt`) | **Confirm "unknown"** for Tag-6. Treating a missing parent month as zero distorts both directions. It understates mean demand: for ing 017, 1,957 a month against 2,111 on the known months. It also creates false dips (one month falls to 1,061), which inflate variability. The pre-X1 calculation, which has the same total, gave an ROP calc of 2,890 against 2,429 now; the exact zero-treatment ROP was not computed. So it causes under-forecasting and over-stated safety stock at the same time | Zero: simple, but it invents sales that never happened as "no sales". Average-fill: a hidden estimate | A missing record is not evidence of zero sales. Leaving it unknown keeps the figures honest, and the "SKUs with missing months" warning tells the user. It is the safer direction for stock-outs | Some ROPs change; affected items are explained | none | no | **ACCEPT** (separate explicit decision) | Choose zero → X1 WP6 reworked (accepted X1 changes), confidence reference, wp5 and completion tests change: major rebuild, and the X1 acceptance must be revisited |
| **B1** Dead-stock presentation | Four columns: Physical, Allocated, Usable, Unallocated usable, plus a long note (`C/js/app.js#L42`). Header totals show "£–" if any listed item's value is unknown (E-1). The Excel export has OnHand, Allocated and Available, but **no Usable or Uncommitted column** | tab text, faulty run: "32 items, physical stock value £–, potential excess £–"; export column list in `js/excel-import.js` | **Option C**. Summary cards ("Items listed", "Uncommitted stock value", "Potential excess value", each partial-aware), and one principal column, **"Uncommitted"**. Physical, Allocated and Usable stay in the table's detail and are **added to the export** (Usable, Uncommitted). Negative physical shows the flag **"Negative on-hand recorded: check the stock record"** instead of a negative £ value | A: as now. B: stock bar | One number to act on, the rest for detail, and nothing hidden from the export | Clearer action list, and exports allow full reconciliation | `js/app.js` line 42; `js/excel-import.js` (2 export columns); `test-stage3-round2` R2-VIEW check amended (original kept as comments) | yes | **ACCEPT** | Reject → keep A; E-1 is still fixed in the current layout |
| **B2** ABC transparency | Unvalued items are "Not Assessed" and left out (`#L163`); the ABC table shows a Not Assessed row (`C/js/app.js#L40`) but no note. Faulty run: 4 excluded, and 4 other items change class | `07-worksheet-comparison.txt` | Add above the table, only when K > 0: **"ABC classes are based on N of M items. K items could not be valued and are excluded, so classes near the 80% and 95% limits may change once their values are known."** N, M and K are counted per group (finished goods, materials). Faulty Northstar: FG 49 of 50 (1 excluded); RM 97 of 100 (3 excluded) | No note | Users must know the classes are provisional | Prevents over-confident ABC decisions on incomplete data | `js/app.js` line 40; new test | yes | **ACCEPT** | Reject → no note (documented limitation) |
| **B3** Warnings | D5 "Allocated exceeds usable on-hand" (`#L56`); C-NUM High warning for text, NaN or Infinity in numeric columns (`#L65`); F-A1 negative planned or completed quantity (High), F-A2 completed > planned (Medium), F-A3 negative lead time (High), F-A4 BOM quantity wording (`#L68`, `#L74`, `#L79`) | Warning lists (`evidence/dq-lists.txt`): clean Northstar shows none of them; faulty shows C-NUM correctly; Willow shows F-A2 on 4 orders over-produced by 0.4–1.1% | **Accept all six.** Each is accurate and none implies a calculation error. **F-A2 note:** small over-runs are normal in production, so on real data it is borderline noise. Keep it for Tag-6 unchanged (changing it would churn tests) and add a tolerance as later work (E-6) | Downgrade F-A2 to Low now | Detection only; no figure changes | Real data errors become visible | none | no | **ACCEPT** | Reject any one → that warning removed; its test checks (stage3-quality or stage3-round2) amended; rebuild |
| **B4** D1–D4, F-A1–F-A4 provenance | Implemented as recorded | `tests/V07-TEST-RECORD.md` line 1294: "Owner-approved decisions (16 Nov 2026): D1 option A, D2 option A, D3 option 1, D4 with six safeguards", recorded by Claude. F-A1–F-A4 were **not** 16 Nov decisions: they were implemented under your Round 2 brief of 18 Nov (`STAGE3-CHANGE-REGISTER.md` R2.7) | **Accept D1–D4** as matching the recorded choices. **Accept F-A1–F-A4 separately** (as B3), on their own merits | — | **Uncertainty:** the repository records the option labels and implementations, not your original wording. The "six safeguards" of D4 are not listed anywhere. I can show what was built, not prove it equals what you approved | — | none | no | **ACCEPT**, uncertainty noted | Reject D1 → golden comparisons fail on N1 (a Stage 3 calculation fix): rebuild. D2 → scrap rules revert. D3 → same-results 416 reverts. D4 → partial totals revert. Each invalidates `43b6b55` |
| **B5** Methodology | (a) Population s.d. (`#L15`). (b) Excess = available − 90 × daily demand. (c) Lead time = Materials.Lead_Time_Days + max(0, mean supplier lateness); σL = population s.d. of order-to-received; fallbacks are supplier standard, then supplier history, then the default (`#L136–138`). (d) Display: money to £1, quantities to 0–1 dp; calculations unrounded. (e) UoM: aliases recognised; fractional "each" flagged. (f) Currency: GBP only, no conversion. (g) Missing and invalid data: X1. (h) Tabs, export and calculations use the same `R` values (verified for 44 figures) | code; `verification-20261122/app/08`, `09`; my 21 Nov worksheet text was the only misleading lead-time description found (the Materials tab is accurate; the backlog note is accurate for the fallback case) | **Document, don't change:** `KNOWN-LIMITATIONS.md` entries 16–19 (`40730de`) plus a 20th for lead-time provenance, GBP-only and display rounding. Worksheet corrected (v2). **New test dataset** where promise ≠ order + lead time, to pin the lead-time rule (E-7) | Sample s.d. (+4.4% safety stock); forecast-based excess now | No evidence the calculations are wrong; changing them would move client figures without a defect | None now | `KNOWN-LIMITATIONS.md` | docs only | **ACCEPT** | Choose sample s.d. or new excess rule now → calculation change, golden and confidence snapshots change; major rebuild |
| **R1** Registry block | 48 PENDING + 3 FAIL (Section C) | guard re-run 22 Nov | **Approve as one block with Tag-6**, plus the items added by approved changes (one new test, its checksum line, one re-hash of test-stage3-round2) | — | Tag-6 approves the registry as a whole | — | registry, checksums | — | **ACCEPT** at the Tag-6 gate | Reject any item → the behaviour it protects must change first |
| **R2** Paging proposal | see Section E | | **DEFER**: land as its own change after Tag-6 | | | | | no | **DEFER** | Approve into Tag-6 → new candidate, full re-verification |
| **G1** Guard diagnostics | Message lists only the first 3 of 9 changed lines (`gone.slice(0,3)`) | `check-control.js` | **DEFER** until after Tag-6 (see D) | | | | | no | **DEFER** | Change now → the guard is itself protected; needs its own approval and baseline |
| **H1** Your worksheet | v2 shows engine results inline and states the total in its title | `worksheet-v2/…v2.md` | Produce an **owner edition of the corrected v2**: answers sealed in a separate file (Section I) | | | | docs | no | **ACCEPT** | — |

---
## C. Protection registry (48 pending items)

The guard was re-run on 22 Nov (`verification-20261122/03-guard-raw.txt`): **48 PENDING = 6 raised counts + 15 new
tests + 27 new protected lines**, plus 3 FAILs.

The groups do not overlap: they are three kinds of registry object.
- A count is an `accepted` value in `accepted-results.json`.
- A new test is a new entry in `accepted-results.json`.
- A protected line is a line in `checksums.txt`.

A new test's file also gets its own protected line (P-31…P-48 cover the 15 new test files, plus 3 new snapshot
references); that is the same file protected two ways, not a duplicate item. The 9 re-hashed lines (P-22…P-30) are the
current hashes of the 9 changed files behind FAIL 3; they are explained in C-1…C-9, not counted again.

Assessment method:
- I read each change.
- I ran 14 of the 21 count-bearing items individually on 22 Nov (UTC). The other 7 passed in the 21 Nov CI full tier, which ran all zones.
- I judged each against the decision it implements.

"Accept" here means: recommended for approval as part of the Tag-6 registry block, and conditional on the behaviour it
protects being accepted in Section B.

### Appendix C1. Six raised counts

| ID | Test | Tag-5 → proposed | What the extra checks test | Re-run 22 Nov | Weakens? | Recommendation |
|---|---|---|---|---|---|---|
| P-1 | check-protection | 434 → 452 | +18 net protected files (27 new lines − 9 replacing approved lines): the new tests and references | 452 ✓ | strengthens | **ACCEPT** |
| P-2 | check-globals | 116 → 124 | x1-integrity.js in the load order (+1); 7 new top-level names each declared once (INTEG, x1Banner, gapSeg, gapTxt, x1Why, x1Sum, x1Money) | 124 ✓ | strengthens (rules unchanged) | **ACCEPT** |
| P-3 | test-a1-static | 29 → 30 | the rule-2 check (no free CFG, R or WB reference) now also covers x1-integrity.js | 30 ✓ | strengthens | **ACCEPT** |
| P-4 | same-results | 356 → 416 | 83 per zone × 5 + 1 (was 71). The 4 workbooks Stage 1 used to refuse because of the invented Line_No are now compared route-to-route (D3) | 416 ✓ | strengthens: more workbooks compared | **ACCEPT** (with B4 D3) |
| P-5 | import-integrity | 386 → 396 | 79 per zone × 5 + 1 (was 77). D2 rejection policy replaces the E-1 withholding assertions (S7 split, +1 adapter defence); D4 partial totals restate I6, I9, I10; X1 Q1 restates M0058 under D6 | 396 ✓ | neutral-to-stronger: assertions replaced to follow approved decisions, originals kept as comments | **ACCEPT** (with B4 D2, D4 and A6) |
| P-6 | test-a1-sync-path | 74 → 76 | 2 newly reachable helpers on the runEngine path (gapSeg, gapTxt) checked synchronous | 76 ✓ | strengthens | **ACCEPT** |

A larger count is not taken as better coverage on its own. P-1, P-2, P-3 and P-6 grow because the code grew and the
same rules now cover it. P-4 grows because coverage really widened. P-5 grows by 2 per zone, but 45 assertions changed
meaning, so it is accepted only together with the decisions it encodes.

### Appendix C2. Fifteen new tests

| ID | Test (accepted count) | What it protects | Run evidence | Depends on | Recommendation |
|---|---|---|---|---|---|
| P-7 | allocated-usable (23) | D5: the "Allocated exceeds…" warning uses the same stock basis as available stock | CI 21 Nov | B3 D5 | **ACCEPT** |
| P-8 | empty-text (46) | DR-4: blank in any form is "no value" on the direct route | 46 ✓ 22 Nov | A4 | **ACCEPT** |
| P-9 | shortage-delay (19) | N1: feasibility never shows a negative "delay" | CI | B4 D1 | **ACCEPT** |
| P-10 | scrap-rules (71) | D2 scrap rules on both routes | 71 ✓ | B4 D2 | **ACCEPT** |
| P-11 | tz-boundaries (71) | date handling in the five time zones | CI (5 zones) | — | **ACCEPT** |
| P-12 | partial-totals (8) | D4 partial totals in the import result gate | 8 ✓ | B4 D4 | **ACCEPT** |
| P-13 | stage3-quality (28) | C-STK, D5, C-NUM and other Round 1 corrections | CI | A1, B3 | **ACCEPT** |
| P-14 | stage3-round2 (35) | R2-STK, R2-VIEW, F-A1–F-A4 | 35 ✓ | A1, B1, B3 | **ACCEPT**. If B1 is approved, its R2-VIEW check is amended (original kept as a comment) and re-hashed |
| P-15 | x1-foundation (40) | X1 field states, provenance, dependencies | 40 ✓ | X1 (accepted) | **ACCEPT** |
| P-16 | x1-containment (41) | MRP crash containment; integrity record | CI | X1 | **ACCEPT** |
| P-17 | browser-x1-chrome (334) | X1 in real Chrome, desktop and Pixel 5 emulation | 334 ✓ | X1 | **ACCEPT** |
| P-18 | x1-wp5 (56) | unknown, invalid and prohibited inputs; calendar demand | CI | X1, A6 | **ACCEPT** |
| P-19 | x1-completion (48) | X1 evidence gaps closed (independent expectations where marked) | CI | X1 | **ACCEPT** |
| P-20 | x1-material-integrity (42) | unidentifiable BOM materials | 42 ✓ | X1 | **ACCEPT** |
| P-21 | x1-acceptance-wording (12) | the three wording fixes from your Android Test 3 | 12 ✓ | X1 | **ACCEPT** |

### Appendix C3. Twenty-seven new protected lines

| ID | File | New hash (first 16) | Kind | Reason | Protection effect | Recommendation |
|---|---|---|---|---|---|---|
| P-22 | `tests/check-globals.js` | `1a51855a9727c5fb…` | re-hashed existing protected file | X1 P1: x1-integrity.js added to the expected load order (CR-02). See C-1. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-23 | `tests/compare-snapshots.js` | `923fc38da580e92c…` | re-hashed existing protected file | Stage 3 D1: applies the enumerated permitted differences to the in-memory expected copy; C-CMP crash fix. See C-2. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-24 | `tests/snapshots/README.md` | `ee3ce5fe1e3fb848…` | re-hashed existing protected file | Stage 3 + X1: documents the two new confidence references and the permitted differences (text only). See C-3. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-25 | `tests/test-uom.js` | `89c09b68fd547161…` | re-hashed existing protected file | Stage 3 DR-4: blank units moved from "unrecognised" to a new U5 "missing" check. See C-4. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-26 | `tests/test-import-stage1.js` | `5a5229936a67ea71…` | re-hashed existing protected file | Stage 3 scrap rules: invalid scrap rejects the row (RJ) instead of blank-and-flag (BF). See C-5. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-27 | `tests/test-import-mapping.js` | `c764216615193f8c…` | re-hashed existing protected file | X1 D1(a)/Q4: a bad stock row of an identified item is quarantined, not rejected (CR-19); originals kept as comments. See C-6. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-28 | `tests/test-same-results.js` | `2c06aaed52ff22ed…` | re-hashed existing protected file | Stage 3 D3: the four previously refused workbooks are now compared; DR-3 restated as route equality. See C-7. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-29 | `tests/tools/import-v1/reverse-eight-sheet.js` | `43ba6fd6235a4f46…` | re-hashed existing protected file | Stage 3 D3: the comparison tool no longer invents Line_No "1". See C-8. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-30 | `tests/test-import-integrity.js` | `4b56ca43ed09f0ae…` | re-hashed existing protected file | Stage 3 D2/D4 and X1 Q1: rejection policy, partial totals, and M0058 under D6. See C-9. | justified; replaces the Tag-5 hash, so the protection level is unchanged (pairs with guard FAIL 3) | **ACCEPT** with Tag-6 |
| P-31 | `tests/test-allocated-usable.js` | `121a914bfb4f20a5…` | new protected file | new Stage 3 test (D5 basis) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-32 | `tests/test-empty-text.js` | `66410a63795f66b2…` | new protected file | new Stage 3 test (DR-4) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-33 | `tests/snapshots/v0.7-confidence-20261116T034921Z.json` | `8b3fdf2a7842a8ad…` | new protected file | new Stage 3 confidence reference (DR-4), superseded but kept | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-34 | `tests/test-shortage-delay.js` | `a54a1204535402eb…` | new protected file | new Stage 3 test (N1) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-35 | `tests/test-scrap-rules.js` | `8a87a7c9f514b768…` | new protected file | new Stage 3 test (D2) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-36 | `tests/test-tz-boundaries.js` | `c5d6f2bdec7cfba0…` | new protected file | new Stage 3 test (5-zone dates) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-37 | `tests/test-partial-totals.js` | `52ed11f4f680ada6…` | new protected file | new Stage 3 test (D4) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-38 | `tests/snapshots/permitted-differences.json` | `ff1b71abad3532ab…` | new protected file | new Stage 3 reference: the 20 enumerated D1 differences | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-39 | `tests/test-stage3-quality.js` | `7491f2894730135c…` | new protected file | new Stage 3 test (C-STK, D5, C-NUM ...) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-40 | `tests/test-stage3-round2.js` | `643874226a483fb8…` | new protected file | new Stage 3 test (R2-STK, R2-VIEW, F-A1..A4) | justified; strengthens (protects the file as approved) | **ACCEPT**, re-hashed again if B1 is approved (its R2-VIEW check follows the view) |
| P-41 | `tests/test-x1-foundation.js` | `ac424fc5d61c181e…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-42 | `tests/test-x1-containment.js` | `aa7f0124c38cbdda…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-43 | `tests/browser-x1-chrome.js` | `739e4f9c0801ff3c…` | new protected file | new X1 real-browser test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-44 | `tests/test-x1-wp5.js` | `e704b317bcf24d1f…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-45 | `tests/snapshots/v0.7-confidence-20261121T075533Z.json` | `cf27c4fd7a9cd970…` | new protected file | new X1 confidence reference (D6; current registry reference) | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-46 | `tests/test-x1-completion.js` | `573d8c56528e34ef…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-47 | `tests/test-x1-material-integrity.js` | `888f0603fa8d0cdc…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |
| P-48 | `tests/test-x1-acceptance-wording.js` | `8981043384340809…` | new protected file | new X1 test | justified; strengthens (protects the file as approved) | **ACCEPT** with Tag-6 |

### C4. The nine changed protected files (guard FAIL 3), with cross-references to P-22…P-30

Taken from `git diff f0e81bb 43b6b55`. In every case the previous protected content is the file at Tag-5; for test files the
superseded assertions are kept as comments in the file.

| Ref | File | Diff | Change | Changes test behaviour or only expected evidence? | Weakens? | Recommendation |
|---|---|---|---|---|---|---|
| C-1 (P-22) | tests/check-globals.js | +1 −1 | adds `js/validation/x1-integrity.js` to the expected load order | expected list only; rules unchanged | no | **ACCEPT** |
| C-2 (P-23) | tests/compare-snapshots.js | +10 −2 | applies `permitted-differences.json` (exactly 20 listed changes, each must match once) to the in-memory expected copy; a printing crash fixed | behaviour: comparison now allows the 20 enumerated N1 differences and nothing else; golden files unchanged | **narrows tolerance precisely**, does not weaken: an unlisted difference still fails | **ACCEPT** with D1 |
| C-3 (P-24) | tests/snapshots/README.md | +23 | documents the new confidence files and the permitted differences | text only | no | **ACCEPT** |
| C-4 (P-25) | tests/test-uom.js | +5 −1 | `''` and `'   '` moved from the "unrecognised" list to a new U5 "missing" check | expected evidence, following A4 (count unchanged, 110) | no | **ACCEPT** with A4 |
| C-5 (P-26) | tests/test-import-stage1.js | +1 −1 | BOM Scrap_Pct rule: invalid now rejects the row (RJ) instead of blank-and-flag (BF) | expected rule follows D2 | stricter | **ACCEPT** with D2 |
| C-6 (P-27) | tests/test-import-mapping.js | +35 −10 | bad stock row of an identified item: quarantined (ROW_QUARANTINED), not rejected | follows X1 D1(a), Q4 (CR-19) | no: the row is still never imported; the item is Not Assessed | **ACCEPT** (X1) |
| C-7 (P-28) | tests/test-same-results.js | +22 −10 | REFUSED list emptied; DR-3 restated: both routes keep all 303 PO rows and warn | follows D3 | strengthens | **ACCEPT** with D3 |
| C-8 (P-29) | tests/tools/import-v1/reverse-eight-sheet.js | +4 −2 | stops inventing Line_No "1" | test tool behaviour (D3) | no | **ACCEPT** with D3 |
| C-9 (P-30) | tests/test-import-integrity.js | +88 −77 | D2 rejection, D4 partial totals, X1 Q1 (M0058 under D6) | expected evidence follows decisions; superseded checks kept as comments | no | **ACCEPT** with D2, D4, A6 |

---

## D. Guard and CI assessment

**The three FAILs** (Tag-5 `check-control.js`, re-run 22 Nov, exit 1):
1. `run-all.sh` changed. The changes are the five-zone snapshot runs (Stage 3) and the "Tests: N passed (+ pre-flight)" line (22 Nov). Recommend accepting both.
2. The confidence reference was replaced. It is flagged "WEAKENED" because the expected file changed. Each replacement changes exactly one documented value: 19 → 11 (A4) and 4 → 3 (A6). Recommend accepting, with A4 and A6.
3. Nine approved checksum lines changed (C4).

**Why the message names only 3 of the 9.** `check-control.js` builds the message from `gone.slice(0,3)`. This is a
deliberate brevity limit in the message, not a detection fault: the count ("9 approved line(s)") and the FAIL are correct,
and every line is still checked.
- *Classification:* reporting limitation.
- *Recommendation (G1):* after Tag-6, list all names. The guard is protected, so changing it in Tag-6 would make the
  release approve its own guard change. Keep it separate.

**CI.**
- `v07-tests.yml` (unchanged, protected) runs on pushes to `development/v0.7` and stops at the guard. It cannot test a candidate until the tag exists.
- `candidate-verification.yml` (on `ci/` branches only) pins an exact SHA, records the guard result without stopping, and runs both tiers. It stays red unless everything passes.
- Results for `43b6b55` (run 44954005216): 38 and 53 tests passed (+ pre-flight); guard FAIL; 4 BLOCKED; 2 REDUCED.

**Required for a valid authorised state:**
1. A frozen final candidate, verified.
2. Your Tag-6 approval naming its SHA.
3. You create `v0.7-tests-approved-6` on it.
4. CI with the guard reading Tag-6: the guard PASSes with 0 PENDING, and the tiers give the same results.

Nothing may be done to the guard or registry to turn CI green before step 3.

---

## E. Paging proposal (`proposal/paging-count-20261121`, `872470f`)

- **Is 59 correct?** Yes. Historical records give `test-paging-chrome (real Chrome, 5 widths: 360, 412, 600, 601, 1280 px) | 59 pass` (`CHANGELOG.md`, v0.6 era), and it ran 59/59 locally and on GitHub's runner (Playwright 1.63.0, Chrome for Testing 153).
- **Should 58 fail?** Yes. A dropped check is exactly what accepted counts exist to catch. Today 58 passes, because a BLOCKED test whose blocker clears has no accepted count.
- **Should a missing count be ERROR?** Yes. A result that cannot be judged must not be reported as PASS.
- **Effect on accepted behaviour:** only on BLOCKED tests that run (today, only paging-chrome). In environments without the browser it stays BLOCKED.
- **Recommendation: DEFER**, landing it as a separate change immediately after Tag-6. It is a test-status change, and Tag-6 does not need it. Putting it in Tag-6 would add a runner change and a new count to the approval block for no release benefit.

---
## F. Wider engineering findings (focused audit)

Classification: 1 Essential for Tag-6 · 2 Recommended for Tag-6 · 3 Phase 2 or later · 4 Known limitation to document ·
5 No change required.

| ID | Area | Finding (evidence) | Practical impact for a user | Class | Action |
|---|---|---|---|---|---|
| E-1 | Totals and X1 consistency | Three on-screen totals sum item values without the X1 partial rule, so one unknown value blanks the whole total to "£–": dead-stock "physical stock value" and "potential excess" (`app.js` line 42), and the data-quality "gap value" (line 47). Faulty run: "32 items, physical stock value £–, potential excess £–". The banner says totals "say how many items they cover"; elsewhere `x1Money` shows "£X partial: N of M items" | A user loses the whole figure because of one blank cost, and the screen contradicts its own banner. Not a wrong number | **1 Essential** (it contradicts accepted X1 wording) | Use the existing `x1Money` in the three places. Test on the faulty workbook. Presentation only |
| E-2 | Dead stock | A1 (fully allocated, no demand → "Active", silent) | Stale reservations go unnoticed | 2 | A1 |
| E-3 | Dead stock | A2 (Not Assessed and listed at once) | Contradictory signals | 2 | A2 |
| E-4 | Export | Export lacks Usable and Uncommitted (B1) | The dead-stock basis cannot be reconciled from the export | 2 | B1 |
| E-5 | ABC | B2 | Provisional classes shown as final | 2 | B2 |
| E-6 | Warnings | F-A2 flags 0.4–1.1% over-runs (Willow, 4 orders) | Mild noise on real production data | 3 | A tolerance setting (your choice of value), later |
| E-7 | Lead time | The rule is right and the Materials tab explains it accurately, but Northstar cannot distinguish it from "order-to-receipt" (every promise = order + Materials lead time) | A wrong explanation could go unnoticed | 3 | A fixture where promised dates differ; pin the rule in a test |
| E-8 | Procurement | Correction to my 22 Nov finding: an Inventory on-order figure without matching POs **is** already warned. It is the High "Inventory vs POs" reconciliation warning, shown on Northstar and Willow, and MRP shows the alternative net figure | Covered | 5 | none; my earlier claim is withdrawn |
| E-9 | Test coverage | Since X1, the R2-STK "no demand" checks remove the demand rows, so they now test *unknown* demand. The recorded-zero-demand path is covered only by my probes, not by a registered test | A regression there could pass unnoticed | 2 | Add zero-demand cases in the new Tag-6 test file |
| E-10 | Historical tests | 4 BLOCKED and 2 REDUCED need v0.6 zips you may hold | Known gap | 4 | Keep BLOCKED; documented (`40730de` entry 19). Do not retire them without your decision |
| E-11 | Currency and UoM | GBP only, no conversion; UoM aliases handled; fractional "each" flagged | A non-GBP client would get wrong £ labels | 4 | Document (KNOWN-LIMITATIONS entry 20) |
| E-12 | Rounding | Screens round money to £1 and quantities to 0–1 dp; calculations are unrounded; the export carries full precision | None if documented | 4 | Document (entry 20) |
| E-13 | Candidate record | `43b6b55`'s own reconciliation record ends "§9 … (appended below when the run finishes)" and was never completed in that commit (the results are on `audit/scie-20261121-pass2`) | A reader of the candidate alone finds a dangling placeholder | 2 | One added note in the new candidate pointing to the CI evidence (no rewrite) |
| E-14 | Performance | 5,100-item analyse() 1,039–1,132 ms; worst tab 217 ms (X1 acceptance evidence); no engine change since | Adequate on a laptop; not measured on a physical phone for this candidate | 4 | Re-measure on the final candidate (Section H) |
| E-15 | Browser | Real Chrome desktop and Pixel 5 emulation pass. Your physical Android Test 3 covered the X1 build, not `43b6b55` | Phone behaviour after B1 and B2 not yet seen | — | Your optional Android check at the deployment gate |
| E-16 | Calculation consistency | 44 figures agree between the tabs, `R` and the worksheet; the export uses the same `R` fields | — | 5 | none |
| E-17 | Maintainability | `calculations.js` is dense (218 lines, very long lines) but line-stable and well-commented | Harder review, but restructuring would put verified behaviour at risk | 5 | none now |
| E-18 | Universal import, mapping, normalisation | same-results 416 and import-integrity 396 pass; route differences for text numbers are known (C3 in the 22 Nov record) | Known | 4 | Document (entry 18); alignment later |

No new calculation defect was found.

---

## G. Candidate and release-readiness assessment

| Question | Answer (evidence) |
|---|---|
| Exact candidate | `43b6b5587cef0e63aa9c4faaa955cc3ff1f228f6` on `candidate/tag6-20261121-r2` |
| Working tree clean | yes (fresh clone, 0 status lines) |
| Differs from Stage 2 | yes: 289 files, +27,861 −274 since `eddf09b` |
| X1 present | yes (`a4e05e8` is an ancestor) |
| Unaccepted Stage 3 present | yes (`0d71aab` is an ancestor; awaiting Section B decisions) |
| Contains the evidence it claims | yes, except the dangling §9 placeholder (E-13) |
| Protected files changed | yes: 9 approved lines, `run-all.sh`, the confidence reference (Section C) |
| Unapproved changes | all 48 PENDING items and 3 FAILs, until Tag-6 |
| Stale deployment branches | `deploy-candidate/dc16902` is STALE (marked). `deploy-rehearsal/43b6b55` is a rehearsal, not a release build |
| Needs rebuilding | **yes, if A1, A2, A3, B1, B2 or E-1 is approved** (all recommended) |

**Conclusion.** `43b6b55` is a valid **parent** for the next candidate; it should not itself go to Tag-6 if the
recommended changes are approved.

**Blockers to Tag-6:**
1. Your decisions in Section J.
2. The new candidate built and fully re-verified.
3. Your five checks against it.
4. Your Tag-6 approval.

---

## H. Implementation sequence (Phase 2, after your approval)

Parent: `43b6b55`. New branch `candidate/tag6-20261122-r3`. One commit per item, so each can be reverted alone.

1. **Docs:** cherry-pick `40730de` (KNOWN-LIMITATIONS 16–19); add entry 20 (lead-time provenance, GBP only, rounding); add the E-13 note.
2. **E-1:** `x1Money` in `app.js` lines 42 and 47.
3. **A2:** class "Not Assessed" when the allocation is unknown (`calculations.js` line 150, class ternary only).
4. **A1:** "Stock fully allocated to orders but no recorded demand" warning.
5. **A3:** "Usable on-hand exceeds physical on-hand" warning.
6. **B1:** dead-stock view (summary cards, Uncommitted column, negative on-hand flag); export columns Usable and Uncommitted; amend the R2-VIEW check in test-stage3-round2 (original kept as a comment).
7. **B2:** ABC note with per-group N, M and K.
8. **Tests:** one new file, `tests/test-tag6-changes.js`, covering items 2–7 (each change, plus its "unchanged elsewhere" check) and E-9's zero-demand cases. Register it, add its checksum line and re-hash test-stage3-round2. These join the Tag-6 registry block.

**Predicted impact:**
- 0 of 17 fixtures contain a fully allocated no-demand item, an unknown allocation, a usable column or negative on-hand (`evidence/fixture-scan.txt`).
- So golden snapshots and the confidence reference should not change. Phase 2 confirms this; if anything does change, that item stops and is reported.

**Verification of the final commit:**
- Targeted tests.
- Fast tier, and full tier (all zones), locally on a clean clone.
- Candidate-verification CI pinned to the SHA.
- Guard run: the same 3 FAILs, and PENDING = 48 + the new items, each listed.
- Real Chrome on clean and faulty Northstar and on Willow: tab text, live `R`, no console errors.
- 412 px phone width.
- Export download, opened and its columns checked.
- Performance re-measured at 5,100 items.
- Baselines r1/r2 and every remote ref re-checked.
- BLOCKED and REDUCED results reported as such.

**If you reject an item:**
- Its step is skipped, and the accepted behaviour stays.
- Dependencies: B1 includes E-1's dead-stock header (if B1 is rejected, E-1 is still applied to the current layout). The new test file covers only approved items.
- A1, A2, A3 and B2 are independent of each other.

---

## I. Human-check preparation

Status: **Not prepared** (to the standard in your brief). The corrected worksheet v2 exists, but it shows the engine
results inside each check and the total in its title, so it does not keep the answers hidden.

In Phase 2 I will prepare an **owner edition of the corrected v2** (`NORTHSTAR-HUMAN-CHECK-WORKSHEETS-v2-OWNER.md`; v1 and
v2 kept unchanged). It will contain:
- the source data first, with each relevant sheet named;
- the methods;
- the lead-time rule and the Northstar ambiguity (promise dates equal order date + Materials lead time, so the data cannot separate the two interpretations);
- the cover-days method, (available + receipts) ÷ daily usage, and the margin method, cover − lead time, both internal to MRP;
- rounding rules;
- a blank result column;
- clean and faulty ABC inputs as separate files, **without** engine columns.

The engine answers go in a separate file, `…-ANSWERS-SEALED.md`, for the comparison step after your calculations. The
worksheet is rebuilt against the final candidate; if the new candidate changes nothing those checks use (as predicted), its
inputs stay the same.

---

## J. Final approval schedule

Reply **APPROVE ALL**, or list the IDs you reject, change or defer.

**Calculation and business rules:**
- A1: Option D, the fully allocated warning.
- A2: Option B, Not Assessed.
- A3: availability unchanged; dead-stock basis kept; usable > physical warning.
- A4: accept empty-text (load-bearing).
- A5: no change.
- **A6: D6 "missing month = unknown" (separate explicit decision).**

**Presentation and warnings:**
- B1: Option C view plus export columns.
- B2: ABC note.
- B3: accept D5, C-NUM and F-A1–F-A4 (the F-A2 tolerance later).
- B4: accept D1–D4 as recorded (uncertainty noted).

**Methodology and documentation:**
- B5: document population s.d., the 90-day excess rule, lead-time provenance, GBP only and rounding.

**Engineering:**
- E-1: X1 partial totals in the three places.
- E-9: zero-demand test cases.
- E-13: note on the dangling §9 placeholder.

**Registry:**
- R1: approve the 48 items plus the Phase 2 additions as one block **at the Tag-6 gate**. It is listed here for planning; approving the plan is not approving the tag.

**Separate, after Tag-6 (recommended DEFER):**
- R2: paging proposal.
- G1: guard diagnostics.
- E-6: F-A2 tolerance.
- E-7: lead-time fixture.

**Human checks:**
- H1: owner edition of worksheet v2.

Approving this plan is **not** approval to create Tag-6 or deploy; both stay separate decisions.
