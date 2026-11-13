# Universal Data Import v1 — Stage 1 record

Stage 1 = mapping and validation core. No screens, no adapter, no engine change.
Authority: owner's Stage 1 brief of 13 Nov 2026 (private; SHA-256 15cbb6b9…a2470a), approving the revised design (private, `UNIVERSAL-IMPORT-V1-DESIGN-REVISED.md`, SHA-256 90013b96…68ad76).
Starting point, verified 13 Nov 2026 before any change: branch `development/v0.7`, tip `b341ab0`, working tree clean; `v0.7-tests-approved-4` → `5f18335` locally and on GitHub. Tag-4 is not changed by this stage, and no Tag-5 is created.

## Part A — Approved decisions (recorded before implementation)

**A6 Duplicates (approved).** Rules are per table, and none of them is universal.

| Table | Exact duplicate (every source cell equal after trimming, mapped and unmapped columns) | Same key, different values |
|---|---|---|
| Items, suppliers, locations, supplier-items, BOM | Removed; each removal reported with its source row | Conflict: table stopped |
| Stock | Removed, using the full-row comparison | Conflict: table stopped |
| PO lines, PO headers, production orders | Removed **only** when the ID fields are present (PO + line; PO; order number). Without the ID: kept and flagged for review | Conflict: table stopped |
| Demand, sales lines | **Kept** and flagged (identical sales can be real transactions) | Conflict: table stopped |

A conflict never selects a row. Keys and comparisons are listed in `validate.js` (`DUP_RULES`) and are tested.

> **Amended 13 Nov 2026 (owner decision Q5; implemented, Part F):** sales lines with both order number and line number follow the PO-line rule: identical rows with matching identifiers are removed and reported; otherwise they are retained and flagged. Monthly demand remains subject to Q4.

**A11 Issue categories (approved).**
- Must fix: the problem could create an incorrect or misleading dataset.
- Please check: processing can continue, but the user needs to review it.
- For information: reported, with no data or meaning lost or changed.
- When unsure, use the more serious category. An issue is never downgraded because it is frequent.

**Partial imports (approved).** Two separate decisions: (1) whether the import can be accepted; (2) whether an item can be included in a given analysis.
- An item is blocked from the relevant analysis if **either** threshold is crossed:
  - 5% of the relevant history table rejected;
  - more than one month of that item's demand lost.
- Both thresholds are always applied. Neither may be chosen as the more lenient.
- No other universal threshold is introduced.

**Currency (approved, with the added requirement).**
- Currency must be declared for every file containing financial fields.
- GBP may be pre-selected but must be **actively confirmed**. A pre-filled GBP that the user has not confirmed is treated as undeclared.
- Unknown, mixed or unsupported currency withholds the financial values from financial analysis. Quantity analysis continues where it is otherwise safe.
- Plain numbers are never assumed to be GBP, and currencies are never converted.
- The importer cannot detect the true currency of plain numbers; the user must confirm it.
- **This binds the later UI stages:** no stage may implement a silent GBP default.

**Acceptance criterion (approved).** Per package, stating exactly what each test proves (Part C).
- Package 02: unaffected tables are compared with `expected-canonical/`. Blocked tables and the import report are tested against expected behaviour.
- No resolved-output claim is made before Stage 6.
- Packages 01, 03, 04 and 05 prove identity (pass-through) only.
- Mapping itself is proved with new synthetic layouts.

**Stage sequence (approved).** Reordering needs a reason and owner approval.
1. Mapping and validation core.
2. Adapter, safety gate and same-results proof.
3. Column suggestions.
4. Screens and CSP.
5. Bought-for-resale engine capability.
6. Mapping files, saved mappings and duplicate resolution.
7. Real-file acceptance and release.

**Mandatory conditions for later stages.**
1. **Stage 2 difference register.**
   - The register lists every original-vs-rebuilt difference for the edge fixtures, each with the affected data, the reason and the responsible component.
   - The owner reviews it before Stage 2 is accepted.
   - A difference is legitimate only when the importer rejected the row or field under the approved rules.
   - A difference caused by the adapter is a defect.
   - If a difference can't be resolved in the adapter, Stage 2 stops and the owner chooses one of: a separately scoped engine change; accepting the difference with a documented reason; or reducing v1 scope.
2. **Client-data policy.**
   - It must be written and approved before Stage 4, and before Stage 3 is tested with real client data or real client headings.
   - It must cover: local processing; external services, analytics, fonts, CDNs and AI; written permission; access; retention and deletion; evidence; and the limits of privacy claims.
   - Stage 4 includes the CSP plus tests that verify it.
   - No real client data is used in Stage 1.
3. **Fixtures protected immediately.**
   - Every new Stage 1 fixture is added to `checksums.txt` when it is introduced.
   - Any later change needs a reason, an impact note, test updates, owner approval and a new accepted baseline.

## Part B — Assessment before implementation (findings, not new scope)

1. **Two claims in my design were wrong.**
   - The existing static test (`test-a1-static.js`) does **not** apply its no-async/no-network rule to `js/import/` files. It only checks them for engine globals.
   - The global-variable audit only covers files that `index.html` loads.
   - Both files are protected, so the new test applies the same two checks to the new modules itself.
2. **Package 02's expected output needs features outside Stage 1:**
   - constant values (A12): items `Unit_of_Measure` = each, suppliers `Active` = Y;
   - a supplier-items table derived from the item master, using a constant `Preferred`;
   - a locations table and a dataset row that the source files do not contain.

   These columns and tables are therefore not compared in Stage 1 (Part C lists exactly which).
3. **Code mapping is part of mapping.** Package 02 requires explicit, user-written value maps (FG → Make/sold, RM → Buy, Obsolete → Active N; issues I03 and I04).
   - Stage 1 supports an explicit `values` map per column.
   - A value with no entry is invalid. Nothing is guessed.
   - **Approved by the owner (see E1).**
4. **Currency vs. "Must fix".**
   - A11 lists unsafe currency as Must fix, while the currency decision lets quantity analysis continue.
   - Reconciled by giving every Must fix a stated scope: dataset, table, item or financial.
   - Financial-scope Must fix withholds money values and blocks financial analysis only.
   - The import is accepted only when no Must fix has dataset or table scope.
   - Nothing is downgraded. **Approved by the owner (see E1).**
5. **The 5% boundary** counts as crossed at 5% or more (the same convention as the existing date rule D6). "More than one month" means 2 or more months. Both boundaries are tested. **Approved by the owner (see E1).**
6. **Partial-import leniency applies only to history tables** (demand, sales lines, PO lines, production orders). A rejected row in items, stock or any other master table is Must fix, with dataset scope.
   - Consequence: a stock export with a TOTAL row, or a code missing from the item master, must be corrected in the file.
   - **Approved by the owner (see E1).**
7. **Placeholder suppliers** for PO lines with unlisted suppliers (I18, E07) follow the documented expected action. Each one is reported as Please check.
8. **Unmapped-column flags:** Stage 1 flags only columns whose name equals a standard field name, ignoring case, spaces and underscores. A synonym list is Stage 3.
9. **Currency confirmation can only be enforced at data level here.** Stage 1 withholds the money values of a file whose GBP is not marked confirmed (the file itself is still imported; wording corrected, see E3). Proving that the screen sets `confirmed` only on a user action needs a Stage 4 journey test (recorded as a Stage 4 requirement).
10. **Units:** the standard model has no unit field on stock, demand or PO tables. Stage 1 adds check-only unit targets (`@Unit`) that are compared with the item's unit and kept as provenance (`__unit`) only.

## Part C — Exact Stage 1 file list (fixed before implementation)

**New:**
- `js/import/mapping.js`
- `js/import/validate.js`
- `tests/test-import-mapping.js`
- `tests/tools/import-v1/make-stage1-fixtures.js` (generator, protected)
- `tests/fixtures/import-v1/…` (mapping files, synthetic layouts, fault cases; all protected)
- this record

**Changed (additions only):**
- `tests/accepted-results.json`: one new test entry; `check-protection` and `test-a1-static` counts raised.
- `tests/checksums.txt`: new protected lines.

**Not changed:**
- engine files, `index.html`, `app.js`, `excel-import.js`;
- `read.js`, `clean.js`, `canonical.js`;
- library packages 01–06, the workflow, the guard, all existing tests and snapshots.

## Part D — Results (13 Nov 2026; nothing committed)

**What was built.**
- `mapping.js` (227 lines):
  - the mapping format v1;
  - safe file loading (it never throws; reports wrong type, empty, unreadable or damaged files);
  - mapping checks;
  - column profiles for later repair;
  - applying a mapping, including explicit value maps;
  - unmapped-column reporting.
- `validate.js` (407 lines):
  - cleaning with the existing rules;
  - the A6 duplicate rules;
  - item, supplier and location references;
  - placeholder suppliers;
  - key conflicts;
  - the two partial-import thresholds;
  - currency declaration and withholding;
  - unit checks;
  - the issue report (A11 categories with scope);
  - completeness;
  - analysis permissions.
- Both modules are pure functions with no asynchronous code, network access or storage. They return deeply frozen results, and `index.html` does not load them.

**Changed files, exact list.** This matches Part C. Additions only to existing files.
- Added:
  - `js/import/mapping.js`
  - `js/import/validate.js`
  - `tests/test-import-mapping.js`
  - `tests/tools/import-v1/make-stage1-fixtures.js`
  - `tests/fixtures/import-v1/` (63 files)
  - this record
- Changed: `tests/accepted-results.json` and `tests/checksums.txt` (66 lines added: 65 protected-file entries and 1 comment header; 0 removed or changed). *These are the Part D figures; the correction pass totals are in Part F.*

**Fixtures (condition 3).** All 65 new protected files are in `checksums.txt`, comprising 63 fixtures, 1 test file (`tests/test-import-mapping.js`) and 1 fixture generator (`tests/tools/import-v1/make-stage1-fixtures.js`).
- 62 fixtures are generator output from Package 01. The test regenerates them in every time zone and checks they match byte for byte.
- `package-02.mapping.json` is hand-written.

**Tests.** Commands are run from the application folder, with `NODE_PATH` set to the pinned test packages:
- `node tests/test-import-mapping.js` → **581 passed, 0 failed**:
  - 116 checks × 5 time zones, plus 1 check that the results are identical across zones;
  - Package 05 timing: 5.7–6.6 s per run in the final fast and full runs (limit stated in the test: 60 s).
- `bash tests/run-all.sh --fast` → **21 tests passed (+ pre-flight), 0 FAIL, 0 ERROR.**
- `bash tests/run-all.sh --full` → **34 tests passed (+ pre-flight), 0 FAIL, 0 ERROR.** 5 BLOCKED and 2 REDUCED (122 checks not running), all pre-existing and documented.
- Golden v0.5 and v0.6.0, the confidence snapshot and the characterisation tests pass in all 5 zones. No snapshot, engine file or library file changed.
- Both tiers were run in a disposable copy. The only artefact was the full tier's `tests/logs/screens-…` folder, created in that copy, not in the working repository.

**Accepted-results changes.** Each was verified by running, not assumed:
- `check-protection` 339 → 404 (+65 protected files);
- `test-a1-static` 23 → 25 (one engine-globals check per new file; the rule itself is unchanged);
- new entry `import-mapping` with 581 checks.

**Guard (`check-control` from Tag-4).**
- **12 passed, 0 failed**, and **68 PENDING**: 65 new checksum lines plus the 3 accepted-results changes above.
- The brief expected "two PENDING for the two source files". That does not happen: by M1 policy, `js/` files are protected by behaviour tests, not checksums. The 68 items are growth, not weakening.
- They stay PENDING until the planned v1 baseline. Tag-4 is untouched, and no Tag-5 was created.

**Rollback.** Tested in a second disposable copy: Stage 1 committed, then reverted. The tree was byte-identical to `b341ab0`, and the guard went back to 12/0 with 0 PENDING.

**What each package proves.**
- **Package 02 (source → standard):**
  - `po_lines`, `bom` and `production_orders` equal `expected-canonical/` value for value.
  - `items` and `suppliers` match on every column except the one needing an A12 constant.
  - Stock and demand are stopped (I09, I16). Their rows outside the conflict equal the expected rows.
  - The report matches `expected-import-report.json` item by item.
  - Not compared: `supplier_items`, `locations` and `dataset`.
  - No resolved-output claim is made (that is Stage 6).
- **Packages 01, 03, 04, 05:** identity only. Output equals input, with 0 Must fix and the expected row counts.
- **Mapping proof:**
  - L1 (renamed and shuffled CSV columns, UK dates, £, Yes/No, extra columns) reproduces all 9 Package 01 tables.
  - L2 (multi-sheet `.xlsx`, ERP codes via value maps, US text dates, Excel date cells) also reproduces all 9 tables.
  - Further checks: reversed column order, a wrong date format, and missing value-map codes.
- **Package 06:** all 11 cases give their EXPECTED.md import outcome. E08 stops demand and removes 3 exact duplicates.

**How the decisions were implemented.**
- **A6:** `DUP_RULES` in `validate.js`, tested against a reference statement of the rules (see F-4, Correction B).
  - Identical demand rows are kept (F08).
  - Rows that differ only in an unmapped column are a conflict (F09).
  - PO lines are removed only when they have an ID (F10, F11).
- **A11:** every issue carries a category and a scope. Must fix with dataset, table or file scope blocks the import. Nothing is downgraded.
- **Thresholds:** both are always applied. Each is tested on its own:
  - F04: the item threshold alone (2 months → blocked; 1 month → incomplete only).
  - F05a/b: the table threshold alone on a 120-row table (exactly 5.0% → crossed; 4.2% → not crossed).
  - F02 and F03: both on a 960-row table.
  - Import acceptance and item permissions are reported separately.
- **Currency:**
  - USD declared (F13), a `$` value (F14), GBP not confirmed (F15) and no declaration (F16) each withhold that file's money values (null) and block financial analysis. Quantities continue.
  - No conversion, and no plain number is assumed to be GBP.
  - **Recorded for Stage 4:** the screen may pre-fill GBP, but must set `confirmed` only on a user action, and a journey test must prove it.
- **Acceptance criterion:** as in "What each package proves" above.

**Limitations and risks.**
- The exact-duplicate rule removes repeated stock rows only when every cell matches. Stock split across bins (same item and warehouse, different bin and quantity) stops the stock table, because adding bins together has not been approved.
- A TOTAL row, or a code missing from the item list, in stock blocks analysis until the file is corrected.
- Unmapped column values are not kept.
- Units are checked only where a unit column is mapped.
- `sales_lines` and `po_headers` are tested only with small inline data; the library has none.
- Package 05 takes about 6 s in Node on the test machine. Phone performance is untested (Stage 4).
- The new test adds about 65 s to each tier.
- This is AI-led implementation and review. Shared assumptions may survive it, and it is not independent human verification.

**Stage size.** Stage 1 is within its expected size. No split is proposed.

**Owner decisions since Part D:**
- Part B items 3–6 were approved by the owner (see E1).
- Q1–Q14 were decided and the approved corrections implemented (Part F).
- Committing remains the owner's separate decision.

**Commit:** none yet.

## Part E — Pre-commit review (13 Nov 2026; documentation only, no implementation change)

Authority: the owner's pre-commit review brief of 13 Nov 2026 (private; SHA-256 30043185…5d1fab). It authorises review and record updates only. Nothing below is approved unless it says so.

**E1. Owner decisions approved in the review brief.** The brief refers to "the four approved owner decisions". These are recorded as the four interpretations listed for confirmation in Part B, items 3–6:
1. Explicit value maps (source code → standard value) are part of mapping. A code without an entry is invalid; nothing is guessed.
2. Every Must fix carries a scope. The import is accepted only when no Must fix has dataset, table or file scope. A currency Must fix withholds financial values only; a unit Must fix excludes only that item.
3. The 5% table threshold is crossed at 5% or more. "More than one month" means two or more months.
4. Partial import applies only to history tables (demand, sales lines, PO lines, production orders). A rejected row in items, stock or any other master table blocks analysis.

*If the owner meant a different four, this entry must be corrected before commit.*

**E2. Corrected description of the protected files.** 65 new lines in `checksums.txt` = **63 fixtures + 1 test file (`tests/test-import-mapping.js`) + 1 fixture generator (`tests/tools/import-v1/make-stage1-fixtures.js`)**.
- Of the 63 fixtures, 62 are generator output and 1 (`mappings/package-02.mapping.json`) is hand-written.
- Part D's wording "65 new test files" means these 65 files.

**E3. Corrections to earlier wording (found in this review).**
- Part B, item 9 says Stage 1 "refuses" a file whose GBP is not confirmed. More precisely: the file is still imported, but **its money values are not placed in the dataset (null)**, financial analysis is marked withheld, and quantities continue (`validate.js` currency pass; `buildTable`).
- When one file's currency is unsafe, money values from *other, confirmed* files remain in the standard tables, while `permissions.financial.status` is `withheld`. Enforcing "withhold all financial figures" is therefore a **Stage 2 adapter duty**, as the design states. Stage 1 records it but cannot enforce it.
- The 60 s limit in the Package 05 test is a test guard I set, **not an owner-agreed performance target**. The design still requires a target agreed before Stage 4.

**E4. Defects and gaps found in this review** (status at the time of the review; current status: D1 and D3–D6 corrected, D2 deferred as Q9, D7 a Stage 2 requirement — see Part F).

| # | Finding (probe evidence) | Severity | Blocks commit? |
|---|---|---|---|
| D1 | **Currency codes written after the number are not recognised.** In a GBP-confirmed file, "46.10 USD" is blanked as "number with text attached" (Please check), but the file is not marked mixed currency, so its other values stay in financial analysis (`clean.js` line 42 recognises `$ € ¥` anywhere and a 3-letter code only *before* the number). "GBP 46.10" is wrongly treated as a foreign currency (safe direction, misleading message) | MEDIUM | **Owner decision** (brief: stop on a currency defect) |
| D2 | **Windows-1252 CSVs are silently damaged.** `loadFile` decodes bytes as UTF-8 without checking, so "Café" becomes "Caf�" and "£5.50" becomes invalid. UTF-16 files give garbage headings (they do fail, but with a misleading message). Windows Excel "CSV (Comma delimited)" files commonly use Windows-1252 | MEDIUM | No (no byte-reading screen until Stage 4); fix before Stage 3 tests with real headings |
| D3 | **Lost history under an unmatched code is not attributed to the item.** Three months of "P-0001" (suggestion P0001) are rejected, but P0001 is not marked incomplete or blocked; only HISTORY_UNATTRIBUTED is reported | MEDIUM | No; resolve before Stage 2 (Q2) |
| D4 | **The table threshold can be crossed with no item blocked.** 6.25% of demand rejected because of unknown codes: demand analysis stays "available" and 0 items are blocked | MEDIUM | No; resolve before Stage 2 (Q3) |
| D5 | **Identical demand rows are kept without marking the item.** No permission entry is created, so the doubled month would reach analysis unless the user acts | MEDIUM | No; resolve before Stage 2 (Q4) |
| D6 | **Future-dated demand and sales rows are accepted silently** (a 2027 row produced no issue) | LOW–MEDIUM | No; Stage 2 or a small Stage 1 follow-up (Q6) |
| D7 | `dataset.Currency` is always "GBP", even when every money value is withheld (CDv1 allows only GBP). Downstream code must rely on `permissions.financial`, not this label | LOW | No; Stage 2 adapter must use the permissions |

**E5. Future requirements recorded (binding on later stages once approved; proposed here).**
- **Stage 4, duplicate acknowledgement** (proposed):
  - identical sales/demand sets are shown individually, with source rows and the quantity effect;
  - the user chooses "both are real" or "these are copies" for each set;
  - nothing is pre-selected, and there is no single "accept all" without showing the total quantity effect and a second confirmation;
  - until the user decides, the affected items keep analysis available with the caveat `based_on_possibly_duplicated_rows` (owner's revised Q4; Part F);
  - each decision is recorded by row content (not row number), with the date, in the saved mapping/session (Stage 6 format).
  - Must fix can never be dismissed, only fixed.
- **Stage 4, currency:** a pre-filled GBP becomes `confirmed: true` only on a user action, proved by a journey test (already in Part A).
- **Before Stage 4, original files:** decided — Q7 (approach A + a bounded session copy; no IndexedDB in v1; see E8).
- **Stage 2, explainability:** decided — Q8 (see E8 and Part F).
- **Stage 4, Android:** a performance test on the owner's phone with Package 05 against an agreed target.
- **Stage 7:** independent human review of the import and adapter code and the rules before the v1 release.

**E6. Open questions at the time of the first review** — *superseded: all decided; see Part F, F-1.*
- **Q1 (D1):** fix the currency-suffix gap now, before commit (recommended: a small `validate.js` check that treats a money value with any currency code or symbol, before or after the number, as foreign, plus fixtures), or record it as a known limitation for Stage 2?
- **Q2 (D3):** attribute a rejected history row to an item when its code has exactly one suggested match, **for permissions only** (the row is still not imported)?
- **Q3 (D4):** when a history table crosses 5% and some rejected rows can't be linked to an item, block the whole related analysis (recommended under "when unsure, use the more serious"), or only report it?
- **Q4 (D5):** treat items with identical demand/sales rows as "pending confirmation" (excluded from demand analysis until the user confirms)?
- **Q5 (A6 challenge):** sales lines that have an order *and* line number and are identical are almost certainly copies, as are identical rows of a *monthly* demand table. Should A6 apply the PO-line rule to sales lines with IDs (remove only when the IDs prove a copy)?
- **Q6 (D6):** flag demand or sales dated after the snapshot date (Please check), and keep them out of history?
- **Q7:** original-file approach (A / B / C).
- **Q8:** the explainability approach (deterministic replay with version and hash stamps instead of stored per-cell history).
- **Q9 (D2):** fix encoding detection in Stage 1 before commit, or before Stage 3?

**E7. Re-verified in this review (actual results, 13 Nov 2026)** — *figures before the correction pass; current results in Part F.*
- `node tests/test-import-mapping.js` → 581 passed, 0 failed (116 per zone × 5 + 1); results identical in all 5 zones.
- `test-a1-static` → 25/0.
- `check-protection` → 404/0.
- `check-control` (Tag-4) → 12/0, with 68 PENDING (65 checksum lines + 3 accepted-results changes).
- The fast-tier (21 passed + pre-flight) and full-tier (34 passed + pre-flight; 5 BLOCKED and 2 REDUCED, pre-existing) results are from runs on the current implementation files; no implementation file has changed since.
- Probes D1–D7 were scratch scripts outside the repository.

### Part E (continued) — Owner decisions Q2–Q9 and D1 scope (13 Nov 2026, second review brief)

Authority: the owner's brief "Owner Decisions and Currency Fix Scope Clarification" of 13 Nov 2026 (private; SHA-256 59fb3d8b…d65594). It authorises recording decisions and documentation corrections only. **None of Q2–Q9 is implemented yet.**

**E8. Owner-approved decisions** (recorded in the second review; Q2–Q6 implemented in the correction pass, Q4 revised by the owner — see Part F).

**Q2: rejected history with one suggested item match.** *Approved.*
- When a rejected history row's item code has **exactly one** suggested match, the row counts against that item's completeness and analysis permissions.
- Restrictions:
  - permissions and completeness only;
  - the row is never mapped automatically and never imported as valid history;
  - with several candidates, the row is not attributed;
  - the original code, the suggested code and the rejection reason are recorded.
- Where: `validate.js` (Stage 1 module; timing is Q10).

**Q3: table threshold crossed with unlinked rows.** *Approved.*
- If a history table reaches 5% rejected and some rejected rows cannot be linked to an item, the **whole related analysis is blocked**.
- Import acceptance stays separate.
- Where: `validate.js` (Q10).

**Q4: identical demand and sales rows.** *Approved; revised by the owner on 13 Nov 2026 (the earlier "excluded from demand analysis" rule is withdrawn).*
- Items with retained identical demand/sales rows stay in the dataset with analysis available, marked `based_on_possibly_duplicated_rows`.
- The import report names the items, the rows and the possible extra quantity where it can be calculated; Stage 4 must show the caveat prominently.
- The report shows the reason, the source rows and the potential quantity effect.
- Nothing is assumed either way.
- Where:
  - the marking goes in `validate.js` (Q10);
  - the user decision goes in Stage 4 (screen) and Stage 6 (saved decisions), per E5.

**Q5: sales-line duplicates with identifiers.** *Approved with a restriction.*
- The PO-line rule applies to sales lines **only when both** order number and line number are present.
- Matching IDs plus fully identical source rows → removed and reported.
- Missing or incomplete IDs → kept and flagged, never removed automatically.
- Monthly demand rows are excluded from this rule and stay under Q4.
- Where: `validate.js` (`DUP_RULES.sales_lines`; Q10). **This amends A6 for sales lines.** The A6 table in Part A remains the historical record, and this entry supersedes it for sales lines with both IDs.

**Q6: future-dated demand and sales.** *Approved.*
- Rows dated after the established snapshot date are flagged **Please check**, excluded from history analysis and identified in the report.
- The snapshot date must be established explicitly and applied consistently, **never from the device clock**.
- How it is obtained today (verified in code):
  - from `mapping.dataset.Snapshot_Date` (required, YYYY-MM-DD; a missing or invalid value is Must fix `SNAPSHOT_DATE_MISSING`);
  - or from a mapped dataset file;
  - recorded in the dataset row (`buildDatasetRow`).
- Where: `validate.js` (Q10).

**Q7: original-file preservation.** *Approved: approach A plus a bounded, session-only in-memory copy.*
- The customer keeps the original. The application never modifies it.
- A temporary in-memory copy may support remapping, undo, reprocessing and rebuilding the report during the session.
- **No IndexedDB or persistent local storage in v1.**
- Recoverability principle: given the original file and the mapping, the application reproduces the same standard dataset and report, subject to the recorded importer version and rules.
- Unmapped columns and excluded information must be visible.
- The source-file hash is computed in the **Stage 4 screen/application layer** (asynchronous browser hashing allowed there), not in the pure import modules.
- Stage: 4.

**Q8: explainability and provenance.** *Approved: deterministic replay with version and hash stamps.*
- The future provenance design includes:
  - importer version;
  - mapping hash;
  - source-file hash per file;
  - file, sheet and row references;
  - the mapping and cleaning rules used;
  - reasons for exclusions, transformations and rejected values.
- No per-cell history unless replay is shown to be insufficient.
- Stage: 2.

**Q9: CSV encoding.** *Approved: defer.*
- Must be addressed **before Stage 3 is tested with real client headings or data**.
- Cover: UTF-8, UTF-8 with BOM, Windows-1252, UTF-16 variants, clear errors for unsupported or damaged encodings, and preservation of names, symbols and currency text.
- Common UK Excel CSV content must never be silently corrupted.
- Stage: before Stage 3 real-heading tests.

**E9. Q1 (D1 currency defect)** — *approved (validate.js only) and implemented in the correction pass; see Part F.*

*Verified facts:*
- `validate.js` keeps each source value's raw text and calls the cleaner itself: the currency check at line 83 (`CL.cleanNumber(raw)`) and row building at line 317 (`CL.cleanValue`). A fix confined to `validate.js` can therefore see "46.10 USD" and tell it apart from "46.10 apples".
- `clean.js` is not in `checksums.txt`. Its behaviour is pinned by 46 cleaning cases in the protected `test-import-stage1.js`; none involves a currency code or a trailing symbol.
- Traced today, in a GBP-confirmed file:

  | Value | Result |
  |---|---|
  | "46.10 USD", "46.10 GBP", "46.10 apples", "£46.10 USD" | blanked as "text attached"; financial **allowed** |
  | "GBP 46.10", "USD 46.10", "THB 46.10", "$46.10", "US$46.10", **"BOX 12"** | foreign; file withheld |
  | "£46.10" | cleaned to 46.1 |

**Proposed scope:**
- Change `validate.js` only (in the Stage 1 file list).
- Add one pure, synchronous currency classifier for money fields. It recognises £ and dollar/euro/yen/rupee-type symbols, and listed ISO 4217 codes before or after the amount.
- GBP indicators are removed and the rest is cleaned by the unchanged `cleanNumber`. Any foreign or conflicting indicator marks the file unsafe.
- Unlisted words stay "text attached" (Please check).
- Quantity fields are untouched, and `clean.js`, `read.js` and `mapping.js` stay unchanged.
- D8: investigated, not a defect, deferred (see E10).

**E10. D8 — not a defect (investigated; deferred).**
- D8 — not a defect. Investigation showed that built-in Excel currency formats carry no currency information the reader can reliably trust. Their display text depends on the reading machine's locale, and their stored format code may contain no explicit currency. Custom formats that explicitly name a currency are the only potentially detectable signal and are uncommon. Under the approved declaration rule, this is expected behaviour: plain numeric cells require explicit currency declaration. The investigation confirms that the approved design is correct, rather than identifying a defect requiring correction.
- Evidence (scratch probes, 13 Nov 2026): a cell using Excel's built-in currency format 7 is read with no format code and display text "$46.10"; custom formats (`"£"#,##0.00`, `[$€-1809]`, `#,##0.00 [$USD]`) are visible to SheetJS but `read.js` passes only the number.
- Status: investigated; not a defect under the approved design; deferred from Stage 1; not in the Stage 1 file list; `read.js` unchanged.
- Possible future safeguard: advisory (Please check) warnings for custom currency formats, before Stage 3, if real client files show they would give useful protection. Never a reason to withhold values on its own; the declaration stays the authority.

**E11. Proposed corrections to earlier entries** — *applied on 13 Nov 2026 under the correction brief (F1–F4); see Part F.*
- Part D, "Changed files": says `checksums.txt` had "65 lines added". The diff shows **66** (65 protected-file lines + 1 comment header).
- Part E, E2, last bullet: refers to Part D's earlier wording "65 new test files". That sentence in Part D was corrected on 13 Nov 2026 under the second review brief (authorised), so E2's note is now historical.
- Part A, A6 table: superseded for sales lines with both IDs by Q5 (see E8).

**E12. Open questions requiring owner approval** — *superseded: all decided (Q11 = D8 deferred); see Part F, F-1.*
- **Q1:** approve the D1 scope (validate.js only, as in E9) — yes or no.
- **Q11:** include the D8 fix (`read.js` metadata + `validate.js` check) in the same correction, or defer it to before Stage 3 real-file tests?
- **Q10:** implement Q2–Q6 now, within Stage 1 before commit (recommended: they are rules of the Stage 1 module, and committing without them leaves permissions known to be incomplete), or as the first task of Stage 2?
- **Q12:** money-field currency words: recognise only a fixed ISO 4217 list (recommended), or also treat any other 3-letter word next to an amount as a suspected currency (more cautious, more false alarms)?
- **Q13:** an item's suggested match under Q2: counts as "linked" for Q3 (recommended: yes)?
- **Q14:** stock `Snapshot_Date` values that differ from the dataset snapshot date: flag as Please check (recommended) or Must fix?

## Part F — Stage 1 correction pass (13 Nov 2026; owner-approved scope; nothing committed)

Authority: the owner's brief "Stage 1 correction implementation — Final approved scope" of 13 Nov 2026 (private; SHA-256 d21f5e07…ed668d). Start state verified first: `development/v0.7` at `b341ab0` (same on GitHub); Tag-4 → `5f18335` locally and on GitHub; no Tag-5; a fingerprint of 1,783 files identical to the end of the previous investigation.

**F-1. Decision status.**

- **Owner-approved and implemented in this pass** (`validate.js`):
  - D1 currency classification (`validate.js` only; `clean.js` unchanged);
  - Q2/Q13 suggested links;
  - Q3 Option A;
  - Q4 (revised);
  - Q5;
  - Q6;
  - Q14;
  - the `reliabilityOf()` helper;
  - Q10 (Q2–Q6 done before commit);
  - Q12 (a defined ISO list).
- **Owner-approved earlier:** Part B items 3–6 (E1); Q7, Q8, Q9 (E8).
- **Mandatory future-stage requirements:**
  - **Q7 (Stage 4):** a bounded in-memory session copy; no IndexedDB or other persistent storage in v1; the source-file hash computed in the Stage 4 screen layer, not in the pure modules.
  - **Q8 (Stage 2):** deterministic replay with provenance stamps (importer version, mapping hash, a hash per source file, file/sheet/row references, the rules used, reasons).
  - **Q9 (before Stage 3 real-file tests):** encoding investigation and correction (UTF-8, UTF-8 with BOM, Windows-1252, UTF-16; clear errors; no silent corruption).
  - **Q4 (Stage 4):** a prominent caveat banner for `based_on_possibly_duplicated_rows`, and a workflow to resolve each duplicate set individually.
  - **D1 currency journey:** *implemented in Stage 1* (`test-import-mapping.js`, S12). Later stages must not remove or weaken it.
  - **Stage 2:** decide the `incomplete` vs `not_applicable` distinction (F-9 #4) and how it is shown to users; tests that (1) the `reliabilityOf()` result is available to the adapter; (2) a caveated item's caveat reaches the adapter's output; (3) a blocked analysis can never be represented as available; (4) unknown statuses stay fail-safe. The adapter must use `permissions.financial`, not `dataset.Currency` (D7).
  - **Stage 4:** a journey test proving a pre-filled GBP becomes `confirmed: true` only on a user action; an Android performance test against an agreed target.
  - **Stage 7:** independent human review before release.
  - **Before Stage 2:** verify the currency list against the official SIX file (F-2).
- **Deferred (not part of this pass):**
  - D8 (E10);
  - Q3 Option B (judging whether unlinked rows could belong to particular items), only if real-world evidence justifies it;
  - Q9 (above).
- **Unresolved, for owner review:** see F-9.

**F-2. Currency code list — source and verification status: UNVERIFIED AGAINST OFFICIAL SOURCE.**
- **Official source:** `https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml`. The triple "r" is SIX's own spelling, confirmed by independent references.
- **It could not be retrieved in this session:** the shell's network proxy refused the site (HTTP 403, not retried), and the web tool reported the URL is not on its allowlist. **The list is therefore not verified against the official file, and no SHA-256 of it exists.**
- **The list was built from public mirrors** (retrieved 13 Nov 2026; untrusted data, parsed in isolation; not authoritative):

  | Mirror | Description | SHA-256 |
  |---|---|---|
  | `github.com/adesurirey/fresh-currency-codes` `src/data.json` | States it is refreshed weekly from SIX `list-one.xml`; reports SIX publication date (`Pblshd`) **2026-09-17**; 178 active codes, 13 inactive | c808bf6d39a48503992051c81e2a2e5db829672a2ba5133fc7b839e95a61de3c |
  | `github.com/datasets/currency-codes` `data/codes-all.csv` | 178 current codes, identical to the above | c4b6829a966f0564e77dc6c2d100d268cce61b30f7637bf3d5ec626b0393407f |
  | Same repository, `archive/table_a1.xml` | A copy of SIX List One XML, `Pblshd` 2024-06-25, 179 codes | 2dea9812978172e5d3aa7b1edc71560b3f3fd465b9edde1acc8f07e765771b8b |

  The 2024 copy differs from the 2026 data only by later amendments: XAD and XCG added; ANG, BGN and CUC withdrawn.
- **Derivation:**
  - 178 active codes;
  - minus precious metals (XAU, XAG, XPT, XPD);
  - minus fund codes (BOV, CHE, CHW, CLF, COU, MXV, USN, UYI, UYW);
  - minus testing codes (XTS, XXX);
  - = 163;
  - plus the approved withdrawn codes ANG, BGN, CUC, HRK, SLL and ZWL;
  - = **169 codes**.
- **Units of account** (XDR, XAD, XSU, XUA, XBA–XBD) are **kept**, because the approved exclusion covers only metal, fund and testing codes. The earlier investigation's example list wrongly placed XDR among the exclusions. Keeping these codes can only make detection more cautious.
- **Pinning:** the list's SHA-256 (codes joined by single spaces) is `079aaabfde8b326f4c25e3ed6ec745cf52aa0eba3f2f2fb1647c6df3b6f22f75`, pinned in the test, so any change to the list is deliberate.
- **Mandatory before Stage 2:**
  1. The owner downloads `list-one.xml` from SIX and supplies it.
  2. Its publication date and SHA-256 are recorded.
  3. The 169-code list is reconciled against it.
  4. This entry is updated to "verified".

**F-3. What was implemented** (all in `js/import/validate.js`; `read.js`, `clean.js`, `mapping.js` and `canonical.js` are unchanged).

- **D1: one shared currency check, `moneyCurrency(raw)`.** It gives GBP, foreign or none, used for money fields only (the `MONEY` list in `mapping.js`).
  - It's called through `cleanMoney()` by both the file-level currency check and row building, so they cannot disagree.
  - **GBP:** £, or "GBP" before or after the amount. "gbp", "eur" and "usd" count in any case; every other code only in capitals.
  - **Foreign:** the 169 codes, the 23 approved symbols and the 8 approved words. A contradiction (GBP plus foreign) counts as foreign.
  - **GBP values the unchanged cleaner already reads** (e.g. "£1,234.56") get exactly the cleaner's result. Otherwise the GBP indicator is removed and the rest cleaned by the unchanged cleaner.
  - **None:** the unchanged cleaner decides. If it says "currency other than £" (its rule that any 3 letters before a number are a currency, e.g. "BOX 12"), the reason is replaced by "text attached", the value is blanked (Please check), and the file is not treated as foreign.
  - **Foreign:** the value is withheld and the file marked unsafe. No conversion anywhere; quantity fields still use the unchanged cleaner.
- **Q2/Q13: suggested links for rejected history rows.** A rejected history row whose code is not in the item list but has exactly one candidate (ignoring dashes and spaces) is linked to that item for permissions only.
  - The row stays rejected, and its original code, the suggested item and the reason are recorded (`linkedItem`, `linkReason`).
  - It's reported as HISTORY_SUGGESTED_LINK ("P-0001 → P0001 (3 rows)").
  - With two or more candidates, the row is not linked. Master tables are never linked.
  - A linked row counts as linked for Q3.
- **Q3 Option A: blocking a whole analysis.** When a history table reaches 5% rejected and at least one rejected row is unlinked, the related analysis gets the status **"blocked"** (distinct from "incomplete").
  - It's reported as HISTORY_ANALYSIS_BLOCKED (Please check, scope `analysis`), with the reason, also in `permissions.analysisReasons`.
  - Import acceptance and the dataset permission are unaffected.
  - The share = rejected rows ÷ history rows, where history rows = rows read minus rows excluded as future-dated (Q6).
  - **Known limitation (acknowledged):** Option A can block clean items because of unrelated unlinked rows. For example, 11 unknown rows in a 200-row table block demand analysis even if the other 189 rows all belong to one clean item. Option B may be investigated later.
- **Q4: caveats for kept identical rows.** For identical demand rows, and identical sales lines kept for lack of an order or line number, the item gets `caveats.demand = "based_on_possibly_duplicated_rows"`.
  - Details are recorded per set (`caveatDetails`): rows, copies, period, quantity, and the possible extra quantity Σ(copies − 1) × Units, given only when the quantity is a valid number and the same in every copy.
  - The DUP_EXACT_KEPT report says in plain English that the rows were kept, analysis is available, results may be overstated, and the user should investigate. It names each item, the rows and the possible extra quantity.
  - The analysis stays available.
- **Q5: sales-line duplicates.** `DUP_RULES.sales_lines` = removed only when SO_ID and Line_No are both present and the whole source row is identical. The same IDs with different values is a conflict and stops the table. Otherwise the rows are kept, flagged and caveated (Q4).
- **Q6: future-dated history.** The snapshot date is established first: from the mapping's `dataset.Snapshot_Date` (YYYY-MM-DD) or a mapped dataset file, never the clock.
  - Demand rows with `Period_Start` after it, and sales rows with `Order_Date` after it, are excluded **before** any required-field check. They're listed (FUTURE_DATED, Please check), not counted as rejected and not in the 5% share.
  - With no snapshot date, the existing Must fix stands and FUTURE_CHECK_NOT_RUN is reported.
- **Q14: stock dates.** A stock row dated differently from the snapshot date → STOCK_DATE_DIFFERS (Please check). The row is kept with its own date and value, and the stock table is not rejected.
- **`reliabilityOf(result, item, analysis)`:** exported on `CGImport.validate`.
  - It returns exactly one of `available`, `incomplete`, `caveated` or `blocked`. The most conservative status wins (blocked > caveated > incomplete > available).
  - It gives `blocked` when: the dataset isn't allowed; the analysis isn't `available`; the item wasn't imported; or anything missing, unknown or malformed is found (unknown analysis, item key, caveat value or status).
  - `noDemandHistory` → `incomplete` for demand.

**F-4. Deliberate expected-result changes (F8).**
- **Correction to the owner's list:** *three* existing assertions were affected, not two. All three changed in the same change as the code, each marked in the test with a comment:
  1. **`test-import-mapping`, inline sales-lines test.** Identical SO1/10 with matching order and line numbers is now **removed** (previously retained). Reason: Q5.
  2. **`test-import-mapping`, F08 duplicate-demand case.** Now also expects `caveats.demand = "based_on_possibly_duplicated_rows"` and the report text (previously no caveat marker). Reason: Q4. The original F08 assertion is unchanged and still passes; new assertions were added.
  3. **`test-import-mapping`, S6 reference statement of the approved duplicate rules** (described as "independent" until Correction B; its independence as a test has reduced because the approved Q5 rule and the reference statement were updated together). `sales_lines` changed from `keep` to `remove-if-id:SO_ID+Line_No`. Reason: Q5. This assertion is a written-out copy of the approved A6 decision, which Q5 amends.
- No other existing assertion changed, and none was removed, skipped or weakened. All 116 previous checks still run, so the per-zone count went from 116 to 152.

**F-5. Test results (actual, 13 Nov 2026).**
- **`node tests/test-import-mapping.js`:** **761 passed, 0 failed** (152 per zone × 5 + 1); results identical in all 5 zones.
  - New checks cover:
    - the currency list and symbols;
    - 85 raw values through `moneyCurrency()` and the full import journey;
    - no-drift checks;
    - the cleaner-cannot-override checks;
    - 10 quantity-field regression values;
    - F25–F36;
    - sales lines with and without IDs;
    - future sales;
    - the missing snapshot date;
    - 28 direct `reliabilityOf()` cases plus real-result cases.
  - Package 05: 5.4–6.8 s per run across the five-zone, fast and full runs (the 60 s limit is a test guard, not an owner target).
- **`bash tests/run-all.sh --fast`** (disposable copy): **21 tests passed (+ pre-flight), 0 FAIL, 0 ERROR.**
- **`bash tests/run-all.sh --full`** (disposable copy): **34 tests passed (+ pre-flight), 0 FAIL, 0 ERROR.** 5 BLOCKED and 2 REDUCED, all pre-existing and documented.
  - Golden v0.5 and v0.6.0, the confidence snapshot and the characterisation tests pass in all 5 zones.
  - `test-import-stage1`: 616 (unchanged).
  - `browser-chrome`: 0 console errors on desktop and Pixel 5 emulation. This is emulation, **not** physical Android testing.
- **Counts:** `test-a1-static` 25 (unchanged in this pass); `check-protection` **429**.
- **Generator:** all 62 previously generated fixtures regenerate byte-identical; 25 new files. The test regenerates all 87 generated fixtures in each time zone.
- **Artefacts:** the full tier created one `tests/logs/screens-…` folder inside the disposable copy only. Both copies were deleted after use.

**F-6. Guard and baselines.**
- `check-control` from Tag-4: **12 passed, 0 failed; 93 PENDING** = 90 new checksum lines + 3 accepted-results changes:
  - `check-protection` 339 → 429;
  - `test-a1-static` 23 → 25;
  - new test `import-mapping` with 761.
- The earlier estimate was about 86 PENDING. The difference is because Q3 needed four fixture cases (exactly 5%, above, below, and all rows linked) rather than two, plus the extra suggested-code fixture file.
- No Tag-4-approved line in `checksums.txt` was removed or changed.
- `accepted-results.json` changed only for `import-mapping` (581 → 761) and `check-protection` (404 → 429), plus their notes.
- **Rollback** (tested in a disposable copy): committing then reverting leaves the tree byte-identical to `b341ab0`, and the guard returns to 12/0 with 0 PENDING.

**F-7. Files changed in this pass.**
- `js/import/validate.js`: the corrections above (now 605 lines).
- `tests/test-import-mapping.js`: new sections S12–S15; the three expectation changes in F-4.
- `tests/tools/import-v1/make-stage1-fixtures.js`: 12 new fault cases.
- 25 new generated fixtures in `tests/fixtures/import-v1/faults/`:
  - F25–F29: currency;
  - F30: suggested code;
  - F31, F32, F35, F36: Q3;
  - F33: future dates;
  - F34: stock date.
- `tests/checksums.txt`: the Stage 1 block regenerated; 91 lines now, against 66 before (90 files + 1 unchanged comment header).
- `tests/accepted-results.json`: two counts and their notes.
- This record.
- Nothing else changed.

**F-8. Limitations and risks.**
- Q3 Option A can over-block clean items (above).
- Q2 can link a rejected row to the wrong item when a code variant is really a different item, for example a discontinued code. That only over-blocks, which is visible in the report; it never creates false completeness.
- The currency list is a list. A currency written only as a word not on it, or as a lower-case code other than gbp, eur or usd, blanks that value without withholding the file.
- "ALL", "TOP", "TRY" and similar in capitals next to an amount in a money field count as currency codes.
- Pence ("46p") are blanked, never converted.
- Q4 caveats exist only as data and report text until Stage 2 and Stage 4 carry them through. The engine has no caveat concept, so the Stage 2 tests in F-1 are essential.
- Q14 compares only with the dataset snapshot date. A whole stock file with a different date produces one issue listing the rows.
- This is AI-led implementation and review, not independent human verification.

**F-9. Points for owner review (interpretations made within the approved scope).**
1. **Q3 issue category and scope.** "Please check", with scope `analysis`, so import acceptance is unaffected as the brief requires. A Must fix with table scope would have blocked the import.
2. **Q3 when a table is already stopped.** If a conflict already stopped the analysis, it stays "stopped" (also treated as blocked by `reliabilityOf`).
3. **Q6 share.** Future-dated rows are excluded from both sides of the 5% share.
4. **Item with no demand history.** `reliabilityOf` returns `incomplete` for demand. *Correction A (owner, 13 Nov 2026):* `incomplete` is retained as the Stage 1 status, but it is **not** the final design. The distinction between:
   - **`incomplete`**: relevant data exists, but some is missing, rejected or otherwise incomplete; and
   - **`not_applicable`**: no relevant data exists, so that analysis does not apply,

   remains an **open Stage 2 design decision**. Stage 2 must revisit it and decide how it is represented to users. No fifth status is added in Stage 1, and the helper and its interface are unchanged.
5. **Currency list.** The units-of-account codes are kept (F-2).
6. **Correction to F8.** Three expected-result changes, not two (F-4).
