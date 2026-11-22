# Owner decision record for Tag-6 (22 Nov 2026)

Candidate: `43b6b55` (branch `candidate/tag6-20261121-r2`). Prepared by Claude. **Nothing here is decided**:
recommendations are not acceptances. Links point at the exact candidate commit.

`C` = https://github.com/MB20252025/chain-genius-consulting/blob/43b6b5587cef0e63aa9c4faaa955cc3ff1f228f6/applications/inventory-intelligence-engine
`T5` = the same path at accepted Stage 2 `eddf09b` (Tag-5 lineage):
https://github.com/MB20252025/chain-genius-consulting/blob/eddf09b/applications/inventory-intelligence-engine
Whole diffs: Stage 3 https://github.com/MB20252025/chain-genius-consulting/compare/eddf09b...0d71aab ·
X1 https://github.com/MB20252025/chain-genius-consulting/compare/0d71aab...a4e05e8 ·
everything after Tag-5 https://github.com/MB20252025/chain-genius-consulting/compare/eddf09b...43b6b55

Key: **In 43b6b55?** yes = implemented and tested in the candidate · no = not implemented · doc = documentation only.
**Changes**: Calc = calculations · Rule = business rule · Data = how input data is read · Pres = presentation ·
Test = tests and registry · Doc = documentation.

**Candidate invalidation rule.** Rejecting or changing any item marked "yes" invalidates `43b6b55`. The
replacement gets the full verification again: both tiers, the guard, counts, baselines and CI.

---

## A. Calculation and business-rule changes

### A1. Dead-stock rule (C-STK / R2-STK)
- **Current (43b6b55: yes):** an item is listed as dead or slow stock only while it holds **uncommitted** stock,
  max(physical, usable) − allocated > 0. Code: `C/js/calculations.js#L150` (`stockB`, `dead`).
  - Tag-5 listed any item with physical > 0: `T5/js/calculations.js#L150`. The class test changed from
    `x.oh>0&&(x.fND||L<0)` to `stockB(x)>0&&(x.fND||L<0)`.
- **Proposed position:** keep the candidate rule (C), plus an added note for no-demand items that are fully allocated (D: **no**, not implemented).
- **Changes:** Rule, Pres. Classification only; stock value and excess £ are unchanged.
- **Probe** (FG050, no demand, on hand 10):

  | Allocated | Class now | Tag-5 class |
  |---|---|---|
  | 0 | No recorded demand | No recorded demand |
  | 10 | **Active** | No recorded demand |

- **Impact:** fewer false "dead stock" items for clients with allocations. Risk: a fully allocated item with no demand disappears from the list.
- **Entanglement:** X1 code calls `stockB`. Rule A or B needs a targeted rework of those lines, not a revert.
- **Decision:** A Tag-5 rule / B usable basis only / **C keep (recommended for Tag-6)** / D C plus the note (separate small change, after Tag-6 or before it with a rebuild).
- **Tag-6:** yes, if C is accepted.

### A2. R2-ALLOC: blank or unreadable Allocated_Qty
- **Current (yes):** the item is Not Assessed (X1) and available stock is withheld, but for the dead-stock listing a
  blank allocation counts as 0 (`stockB`: `(isFinite(A)?A:0)`, `C/js/calculations.js#L150`). Probe: blank or "abc" →
  "No recorded demand", while the same item says Not Assessed.
- **Proposed:** class "Not Assessed" when Allocated is unknown (**no**, not implemented).
- **Changes:** Rule, Data. **Impact:** removes a contradiction a client would notice; affects only rows with an unknown allocation.
- **Decision:** **B Not Assessed (recommended)** / A keep / C treat blank as 0 everywhere.
- **Tag-6:** if B is chosen, a one-line change plus 2 tests and a rebuild. That invalidates `43b6b55`. Alternatively keep A for Tag-6 and do B after it.

### A3. R2-ASSUME: physical above usable, allocation between them (e.g. 10 / 4 / 6)
- **Current (yes):** listed, because max(10, 4) − 6 = 4 > 0, although unallocated *usable* stock is 4 − 6 = −2.
- **Proposed:** use usable stock when a usable column is supplied, and flag the mismatch (**no**).
- **Changes:** Rule, Data. Rare; affects listing only. **Decision:** A keep / **B + flag (recommended, after Tag-6)**.
- **Tag-6:** keep A in Tag-6, recorded as a known limitation.

### A4. Empty-text handling (DR-4)
- **Current (yes):** a null cell, or text that is empty after trimming spaces, is read as an empty cell. Code:
  `C/js/excel-import.js#L12`. Diff against Tag-5: one condition added before the date handling in `rows()`:
  `if(r[k]===null||(typeof r[k]==='string'&&r[k].trim()===''))delete r[k];`.
- **Effect:** the willow test file now reports "11 POs received short" instead of "19". A separate recount from the raw
  sheet gives 11.
- **Changes:** Data, Test (confidence snapshot). **Impact:** stops blank text being treated as a value.
- **Decision:** **accept (recommended)** / reject. **Tag-6:** yes.

## B. Presentation and warnings

### B1. Dead-stock view (R2-VIEW)
- **Current (yes, option A):** four columns: Physical, Allocated, Usable, Unallocated usable. Code: `C/js/app.js#L42`. Current note text:
  > "Four stock quantities are shown separately (Stage 3 Round 2): Physical = On_Hand_Qty; Allocated = committed to
  > orders (never treated as excess or obsolete); Usable = usable on-hand where a usable figure is supplied,
  > otherwise equal to physical; Unallocated usable = usable − allocated (the basis of cover and potential excess)…"
- **Proposed (C, no):** summary cards plus one column, "Uncommitted stock", with the four quantities kept in the export.
  Proposed card wording: **"Uncommitted stock: stock not promised to orders (larger of physical and usable, minus
  allocated). Only items with uncommitted stock are listed."**
- **Changes:** Pres only. **Decision:** **A for Tag-6 (as built)**, then C as a later presentation change / C now (rebuild).
- **Tag-6:** yes, as A.
- **Negative physical stock (F-STK2):** currently shown as a negative figure. Proposed wording for a flag: **"Negative on-hand recorded:
  check the stock record"**. Not implemented; after Tag-6.

### B2. F1: ABC note when items are Not Assessed
- **Current (yes):** items with unknown annual value are Not Assessed and left out of the ranking (`C/js/calculations.js#L163`).
  Other items can change class as a result: in the probe, FG018 moves B→C, FG030 A→B, RM020 A→B and RM051 C→B. No warning is shown.
- **Proposed (no):** a note above the ABC table when any item is Not Assessed:
  **"ABC classes are based on N of M items. K items could not be valued and are excluded, so classes near the 80% and
  95% limits may change once their values are known."**
- **Changes:** Pres only. **Decision:** add before Tag-6 (rebuild) / **add after Tag-6 (recommended)** / do not add.

### B3. Wording and invalid-number fixes
- **D5 (yes):** `C/js/calculations.js#L56`, wording changed from "Allocated exceeds on-hand" to "Allocated exceeds usable on-hand". The check now uses usable on-hand where it is supplied, which removes the false Stage 2 warning.
- **C-NUM (yes):** `C/js/calculations.js#L65`. A High warning names each cell with text, NaN or Infinity in a numeric column.
- **X1 wording fixes (CR-33 to CR-35):** already accepted under X1.
- **Decision:** accept D5 / accept C-NUM. **Recommended: accept both. Tag-6:** yes.

### B4. D1–D4 and the four new data warnings
- D1 permitted snapshot differences (`C/tests/compare-snapshots.js#L1`); D2 scrap rules (`C/js/import/clean.js#L55`);
  D3 duplicate PO rows; D4 partial totals (`C/js/import/result-gate.js#L80`). All yes; they implement your decisions of 16 Nov.
- F-A1 negative production quantity (High) and F-A2 completed above planned (Medium): `C/js/calculations.js#L79`.
  F-A3 negative lead time (High): `#L74`. F-A4 BOM message wording: `#L68`. All yes, detection only.
- **Decision:** accept each. **Recommended: accept all. Tag-6:** yes.

## C. Existing behaviour to document (no code change proposed for Tag-6)

| Item | Behaviour (all in 43b6b55, unchanged since Tag-5 unless noted) | Changes | Decision |
|---|---|---|---|
| C1. F2 standard deviation | Population form: `sd=a=>Math.sqrt(mean((x−m)²))` (`C/js/calculations.js#L15`). Sample form would give about 4.4% higher safety stock with 12 months of data | Doc | **Document as the engine's definition (recommended)** / change to sample form later (Calc change, own release) |
| C2. 90-day excess rule | excess = available − 90 × daily demand; no demand → all available (`#L156`). Ignores on-order stock and forecast | Doc | **Document as current definition (recommended)** |
| C3. Route differences | Import route converts "1,200", "(25)", "£5" (money columns); the direct route marks them Not Assessed and warns | Doc | **Document, align later (recommended)** |
| C4. Historical test files | 4 BLOCKED and 2 REDUCED tests need v0.6 zips that are not available; you may hold them | Doc, Test | Upload the zips / **keep BLOCKED with explanation for Tag-6, then retire (recommended)** |

All four go in Tag-6 as documentation only: `KNOWN-LIMITATIONS.md` entries 16–19. The wording is ready on branch
`prep/known-limitations-20261122` (`40730de`, append-only): https://github.com/MB20252025/chain-genius-consulting/compare/43b6b55...40730de

## D. Deferred work (not in Tag-6)

| Item | Status | Why deferred |
|---|---|---|
| D1. Forecast-based excess (E1) | no | Changes £ figures for many items; needs its own tests and review |
| D2. Direct/import alignment (F-XR1 option C) | no | Changes direct-route results for text numbers |
| D3. Forecasting expansion (Stage 3C) | no | Not started, by instruction |
| D4. Visualisation and Demo Centre (Stage 3B) | no | Not started, by instruction |
| D5. Calculation Integrity System (CIS) | no | Not started; the reference checks and human worksheets are its natural start |

**Decision:** confirm these stay out of Tag-6.

---

## Approval 1 (separate): test-registry amendments

Tag-6 approves the registry as a whole. It cannot approve half of it. So every amendment must match the
behaviour you accept. If you reject an item, its test and count change first.

| Group | Exact change | Effect on expectations | Tag-6? |
|---|---|---|---|
| Raised counts (6) | check-protection 434→452, check-globals 116→124, test-a1-static 29→30, same-results 356→416, import-integrity 386→396, test-a1-sync-path 74→76 | more checks expected; none removed | yes |
| New tests (15) | Stage 3: allocated-usable 23, empty-text 46, shortage-delay 19, scrap-rules 71, tz-boundaries 71, partial-totals 8, stage3-quality 28, stage3-round2 35. X1: x1-foundation 40, x1-containment 41, browser-x1-chrome 334, x1-wp5 56, x1-completion 48, x1-material-integrity 42, x1-acceptance-wording 12 | new protected expectations | yes, only for accepted behaviour (stage3-quality and stage3-round2 contain the A1/A3 assertions) |
| New protected lines (27) | checksum lines for the files above and two snapshot files | protects them | yes |
| Changed protected lines (9) | re-hashes of 9 existing protected test files (originals kept as comments) | approves the edits | yes |
| Confidence reference | `v0.7-confidence-20261112…` → `…20261121T075533Z.json`. Two values changed, each documented: 19→11 POs (A4) and 4→3 items (X1 D6) | one expected value changes each time | yes, if A4 is accepted |
| `run-all.sh` | Stage 3: five-zone snapshot runs; 22 Nov: an added "Tests: N passed (+ pre-flight)" line | runner only | yes |

Total: the guard lists **48 PENDING items** (6 + 15 + 27) and 3 FAILs (`run-all.sh`, confidence reference,
9 changed lines). This corrects my earlier "51 PENDING" and "28 new protected lines": the right figures are 48 and 27.

**Decision:** approve these as part of Tag-6, once A and B are settled / not yet.

## Approval 2 (separate): paging proposal, branch `proposal/paging-count-20261121` (`872470f`)

Diff against the candidate (2 files, +2 −1):
https://github.com/MB20252025/chain-genius-consulting/compare/43b6b55...872470f

```
accepted-results.json, test-paging-chrome:  + "accepted": 59, + "note": "PROPOSED 21 Nov 2026 …"
run-all.sh, judge():  + if(typeof t.accepted!=='number') return {st:'ERROR', …'no accepted count recorded…'}
```

- **Why 59:** the test has 59 checks, and it ran 59/59 locally and on GitHub's runner (Playwright 1.63.0, Chrome for
  Testing 153.0.8010.12). It is also the historical count.
- **What changes:**

  | Run result | Today (`43b6b55`) | With the proposal |
  |---|---|---|
  | 59 checks | PASS | PASS |
  | 58 checks | **PASS** (the count is not checked) | FAIL "COUNT DROPPED: expected 59, actual 58" |
  | No accepted count recorded | PASS | ERROR |

  Exercised directly on 21 Nov; full tier of `872470f`: 53 passed (+ pre-flight), the same rows as the candidate.
- Where no browser is installed it stays BLOCKED, as now.
- **Recommendation: approve, but as its own change after Tag-6.** It is a test-status change, so it should not ride inside
  the release approval, and Tag-6 does not need it. If you prefer it in Tag-6, it becomes a new candidate and needs full re-verification.
- **Decision:** approve after Tag-6 / approve into Tag-6 / reject / defer. Not merged.

---

## Your decisions, in one list

1. A1 dead-stock rule: A / B / **C** / D.
2. A2 R2-ALLOC: **B, after Tag-6** / B before Tag-6 (rebuild) / keep A.
3. A3 R2-ASSUME: keep A for Tag-6 / **B + flag after**.
4. A4 empty-text: **accept** / reject.
5. B1 view: **A for Tag-6**, C later / C now.
6. B2 ABC note: before / **after** / no.
7. B3 D5 wording and C-NUM: **accept** / reject (each).
8. B4 D1–D4 and F-A1 to F-A4: **accept** / reject (each).
9. C1–C4 documented as current behaviour: **yes** / change instead.
10. D1–D5 stay out of Tag-6: **yes**.
11. Approval 1, registry amendments: **approve with Tag-6** / not yet.
12. Approval 2, paging proposal: **after Tag-6** / into Tag-6 / reject / defer.

If you choose the recommended options, the final candidate is `43b6b55` plus the documentation commit `40730de`. That one
commit is documentation only, but it is still a new commit: it gets the full verification before Tag-6.
