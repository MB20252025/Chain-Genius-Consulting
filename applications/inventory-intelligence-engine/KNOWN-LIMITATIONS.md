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

14. **Lead times: three known problems.** Engine behaviour is unchanged; each correction needs separate authorisation (decisions A1–A4 remain open):
    - **Arithmetic defect (H1)**: when a material's lead time comes from the supplier's purchase-order history, average supplier lateness is added on top, although the history already contains it, so the lateness is counted twice (synthetic case: 26 days of history, 6 days late, used as 32 days). (V)
    - **Evidence-quality defect (small samples)**: a lead time calculated from one or two purchase orders is labelled "Calculated" like one from many, and its variability comes from one or two points. (V)
    - **Assumed-data limitation (7-day fallback)**: a purchased item with no stated lead time and no supplier delivery history is given the 7-day production default, labelled "Assumed (default setting)", and the "Lead times" confidence area is rated Low. (V)
15. **Duplicate stop-and-resolve is a requirement, not yet built.** The agreed policy is that a conflicting duplicate stops the affected import until an explicit resolution is supplied (see `M1-DESIGN.md`). Stage 1 only detects duplicate keys; the stop belongs to Stage 2, and resolution for canonical input to M1b. No current code stops an import, applies a resolution or detects that a changed source cancels one. (NT)
