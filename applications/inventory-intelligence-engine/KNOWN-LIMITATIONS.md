# Known limitations (v0.6 candidate 4 final)
Verified facts are marked (V); things not tested are marked (NT).
1. **Supplier on-time delivery (OTD) is measured on received deliveries only.** Purchase orders that are overdue but not yet received at the snapshot are NOT counted in OTD or any other supplier metric (final v0.6 business rule). A supplier with many overdue open orders can therefore look better than it is. Quantified example: Northstar SUP011 has 2 such lines; counting them would move its OTD from 31.3% to 27.8% and its score about 2 points (it is already High risk). (V) Revisit in v0.7.
2. **Forecast-confidence changes are covered by dedicated tests but are not fully represented in the historical golden snapshots.** The snapshots contain no confidence level or wording; test-forecast-conf (206) and verify.py (17) are the evidence. (V)
3. Numeric text quantities such as "120" are invalid in v0.6: excluded from the metrics they cannot support and flagged High in Data quality. No safe parsing until v0.7. (V)
4. Suppliers with no valid evidence for a metric are "Not Assessed — Insufficient Evidence"; weights are never renormalised; where every metric has some valid lines but fewer than the evidence minimum, the existing formula is used unchanged. (V)
5. ~~Unapplied Settings edits lost on tab switch~~ **RESOLVED in final hardening** (in-memory draft; kept across tab switches, rotation and a new import; cleared by Apply and Reset). (V)
6. ~~Summary 12 px sideways scroll at 360 px with a long file name~~ **RESOLVED in final hardening** (heading wraps; file name shown in full). (V)
7. Performance (accepted): analyse() at 5,000 items about 1.05 s (target 2 s met) but about 20% slower than Phase 2 since the Phase 3 missing-value check; this is a known v0.6 characteristic and a possible v0.6.1 optimisation candidate; tab switching meets 300 ms on desktop but not under the 4x CPU simulation (MRP, Forecast accuracy); 15,000 items are slow on the simulation (analysis plus first render 43 s). (V)
8. **No physical Android device has been used.** All browser results are headless desktop Chrome, resized or CPU-throttled. File picker, touch, memory and real phone speed are unverified. (NT)
9. Duplicate PO rows are flagged, not removed; received above ordered is flagged High; the importer needs the eight documented sheet names and columns; one-line-per-PO assumptions as documented in earlier candidates. (V, unchanged)
10. Finished-goods safety stock excludes production-time variability (a note explains this; formula unchanged by decision). (V)
11. The Suppliers screen has fixed ordering and no interactive sort/filter control. (V)
12. The Git history from before the earlier recovery is not recoverable (historical, see CHANGELOG).
13. Code is monolithic (global scope, one large analyse()); modularisation is v0.7. (V)

## v0.7 additions (12 Nov 2026, M1 pre-tag Commit 2; the entries above are unchanged)

14. **Lead times: three known problems.** H1 was corrected in M1 pre-tag Commit 4 (`893e9a9`). The small-sample evidence-quality issue and the seven-day assumed-data limitation remain open. Outstanding lead-time decisions are recorded in `M1-DESIGN.md`:
    - **Arithmetic defect (H1)** — **corrected in Commit 4 (`893e9a9`)**: when a material's lead time came from the supplier's purchase-order history, average supplier lateness was added on top, although the history already contains it, so the lateness was counted twice (synthetic case: 26 days of history, 6 days late, used as 32 days; 26 days since Commit 4). Lateness is now added only to a stated lead time or a supplier standard; the supplier's observed lateness is still reported on the supplier. (V)
    - **Evidence-quality defect (small samples)**: a lead time calculated from one or two purchase orders is labelled "Calculated" like one from many, and its variability comes from one or two points. (V)
    - **Assumed-data limitation (7-day fallback)**: a purchased item with no stated lead time and no supplier delivery history is given the 7-day production default, labelled "Assumed (default setting)", and the "Lead times" confidence area is rated Low. The default is used only when the material's default supplier has no received purchase orders at all, so no lateness is ever added to it; a material with no history of its own whose supplier has history for other materials gets that supplier's purchase-order average instead (see `PROACTIVE-IMPROVEMENT-BACKLOG.md` P-004). (V)
15. **Duplicate stop-and-resolve is a requirement, not yet built.** The agreed policy is that a conflicting duplicate stops the affected import until an explicit resolution is supplied (see `M1-DESIGN.md`). Stage 1 only detects duplicate keys; the stop belongs to Stage 2, and resolution for canonical input to M1b. No current code stops an import, applies a resolution or detects that a changed source cancels one. (NT)

## Tag-6 additions (22 Nov 2026, owner decision B5 of the Tag-6 change plan; the entries above are unchanged)

16. **Standard deviation is the population form** (divide by n). Demand and lead-time variability, and therefore
    safety stock and reorder points, use it. With 12 months of data the sample form (n − 1) would give about 4.4%
    higher safety stock. Recorded behaviour, not yet reviewed as a policy.
17. **Excess stock uses a 90-day rule:** unallocated usable stock above 90 days of average daily demand (12 months);
    with no demand, all unallocated usable stock. Stock on order, safety stock and the forecast are not considered.
    A forecast-based definition is planned as separate work.
18. **The two input routes read text numbers differently.** The import route converts "1,200", "(25)" and "£5" (money
    columns) into numbers. The direct workbook route does not: those cells are Not Assessed with a reason, and a
    High warning names them. The same workbook can therefore give different results by route.
19. **Six historical comparison tests cannot run in full.** Four are BLOCKED and two REDUCED because the v0.6
    zips and tags they compare against (`tests/PROTECTED-VERSIONS.txt`) are not available. They compare with v0.6-era
    code; golden and confidence snapshots now cover the same ground.
    *(22 Nov 2026, after Tag-6:)* formally deferred by the owner. Each test, its reason and the conditions for revisiting it
    are in `stage3-design/tag6/DEFERRED-HISTORICAL-TESTS.md` (H1–H6). They do not block Stage 3B.
    The six, as recorded at Tag-6 (none passed, deleted, retired or reduced; counts unchanged):
    - H1 `test-fglt-note`: BLOCKED. Missing: the v0.6 Phase 2 source tree (`inventory-intelligence-engine-c4-phase2` zip).
    - H2 `test-forecast-conf`: BLOCKED. Missing: the v0.6 Phase 3 tree (historical zip, named in `p3tree.txt`).
    - H3 `test-supplier-eligibility`: BLOCKED. Missing: the same Phase 3 tree.
    - H4 `phase2-comparison`: BLOCKED. Missing: the git tag `v0.6-candidate-4-phase2`, not on GitHub.
    - H5 `test-phase1`: REDUCED, 57 of 125 checks. Missing: the tag `c4-base`, needed for item 1e.
    - H6 `test-uom`: REDUCED, 110 of 164 checks. Missing: the tag `v0.6-candidate-4-phase1-final`, needed for the comparison
      with Phase 1 final.
    They can be revisited if the material becomes available or the owner makes a separate decision.
    *(Amendment, 22 Nov 2026, Claude, Stage 3B readiness authorisation; original text above unchanged.)*
    - **Final disposition:** reconstruction failed. Searches covered the four recorded commits, all branches and tags, all of
      git history, the session filesystem and the uploads folder; the only zip found is the v0.5 original, whose hash
      matches none of the four. The historical-comparison parts of H1–H6 are technically retired from the active
      process, with their original 9 Nov pass evidence kept.
    - **Correction:** the statement above that "golden and confidence snapshots now cover the same ground" was incomplete.
      Three current behaviours were in fact untested in v0.7: the finished-goods production-time caveat (H1), the MAD = 0
      note (H2) and supplier-eligibility sections A–J (H3).
    - **Restored and added:** 307 original checks restored and 9 new checks added, in `test-h1-fglt-note-current`,
      `test-h2-forecast-conf-current`, `test-h2-level-shift-spec` and `test-h3-supplier-eligibility-current` (PENDING the
      next baseline tag).
    - **Registry:** the six entries stay unchanged until the owner decides at the next tag.
    - **Details:** `stage3-design/stage3b-readiness/HISTORICAL-TESTS-DISPOSITION.md`.
20. **Lead time, currency and display precision.** Raw-material lead time is Materials.Lead_Time_Days plus the
    default supplier's average lateness (received − promised, over lines received and ordered by the snapshot date,
    added only if positive). When no lead time is stated, the fallback order is: the supplier's standard lead time,
    then the supplier's average order-to-receipt time, then the default setting. Its variability (σLT) is the population s.d. of
    order-to-receipt days. Finished-goods lead time is the mean of completed production orders' actual durations
    (minimum 1 day). The test data cannot tell the stated rule from "order-to-receipt", because every promised date
    equals order date + Materials lead time; a dedicated test file is planned (E-7). All money is read and shown as
    GBP: there is no currency column or conversion. Screens round money to £1 and quantities to 0–1 decimal places;
    calculations and the Excel export use full precision.
21. **No genuine non-production workbook has been tested in the new screens.** Stage 3B shows the Production area only
    when the workbook has production data (spec v1 §10). The rule is tested with synthetic workbooks in
    `test-view-contract`, but no real workbook from a business without production (a distributor or retailer) has
    been run through the new screens. **Outstanding validation:** obtain such a workbook (anonymised) and check that
    Production is hidden, that no screen refers to production, and that every other area still works.
22. **Duplicate-month decisions are kept in one browser only.** (Stage 3B Phase 3, 25 Nov 2026.) They are stored in
    the browser's site storage for the dataset. They do not travel to another browser or device, and they are lost
    if the site data is cleared. When storage is blocked they last only until the page is closed (the screen says so).
    Renaming or adding any product, material or supplier changes the dataset fingerprint and returns every decision to
    review. Two identical records cannot be told apart (either gives the same value).
23. **Two gap-related forecast rules are not yet calendar-aware.** (Stage 3B Phase 3, 25 Nov 2026.)
    - The forecast-credibility outlier / level-shift rule treats months either side of a missing month as adjacent.
    - A product still needs 6 usable months for any forecast (the existing gate), although the average method alone
      needs 3.

    Both are recorded for the owner and Stage 3C; neither was changed without approval.

