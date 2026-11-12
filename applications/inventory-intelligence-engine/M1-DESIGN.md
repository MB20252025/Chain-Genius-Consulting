# M1 design record — Supply Chain Intelligence Engine v0.7

The approved detailed design is the claude.ai document "M1 Final Design and Implementation Readiness" (decisions D1–D23), as amended by the owner's scope decision of 12 Nov 2026 (M1 = Stages 1–4, A1–A7; M1b deferred; package 07 deferred). This file records requirements added after that approval, the policies that implement them, and the decisions taken since. Where this file and the claude.ai document differ, this file applies.

Created in M1 pre-tag Commit 2 (12 Nov 2026). Sources are the owner's written instructions of 12 Nov 2026, cited by time (UK): the Requirement 6 brief (11:16), the owner's follow-up of 11:24 (cited by its numbered points), the Commit 1 authorisation (12:24) and the owner's replies of 12:43, 14:55, 15:02, 15:03 and 15:30.

## Requirement 6 — Business-owned input files (verbatim, Requirement 6 brief §2, 12 Nov 2026 11:16)

The Supply Chain Intelligence Engine must support two types of input:

1. Our supplied standard templates and test packages.
2. Files supplied by individual businesses, exported from their existing ERP, MRP, accounting, warehouse, purchasing, sales, production and other operational systems.

The second category is essential.

Businesses must not have to restructure all their existing spreadsheets or ERP exports to match our templates.

The design must allow for:

- Different column names for the same information (e.g. SKU, Item Ref, Product Code).
- Different column orders and worksheet arrangements.
- Different file structures and additional columns.
- Missing, optional or incomplete fields.
- Explicit user-controlled mapping between business columns and engine fields.
- Reusable mapping configurations for each business.
- Clear explanations of unsupported formats, missing fields and ambiguous mappings.
- Validation before data reaches the calculation engine.

The engine must not silently guess ambiguous mappings, invent values or discard information without reporting it.

Our supplied packages 01–06 remain the controlled test baseline. They must not become the limit of what the importer accepts.

Real business-owned exports must form part of acceptance testing before the M4 demonstration release, following the agreed local-only data protection policy.

This requirement must be included in the M1 design documentation and reflected in the Stage 2 onwards development plan. Do not expand or alter Stage 1.

Business-owned file upload – independent input requirement

The engine must provide a way for users to select and upload their own files directly from their device, rather than requiring them to use Chain Genius templates.

The user must be able to select their existing ERP/MRP exports, Excel workbooks, CSV files and other supported operational data files.

The importer must then guide the user through:

- Identifying file roles.
- Selecting worksheets where applicable.
- Mapping their columns to the engine's canonical fields.
- Resolving validation issues.
- Confirming the import.

The engine must retain the original source data during the import process and must not overwrite or modify the user's original files.

This must ultimately be available through the engine's user interface.

Stage 2 may use manually authored mapping files. The user-facing upload and mapping interface must be planned for the appropriate later stage (M1b), not silently omitted.

## Implementation notes (the six clarifications of the Requirement 6 brief §3, summarised accurately; later qualifications marked with their sources)

1. **Mapping without a screen in Stage 2** (§3, Clarification 1). "User-controlled" does not require a graphical mapping screen in Stage 2. In Stage 2 the user or consultant writes the mapping file by hand. Its format is designed so the later M1b screens can create, save, load and reuse it without redesign. The mapping screen stays deferred to M1b unless separately authorised.
2. **Required/optional field matrix** (§3, Clarification 2). Stage 2 produces a matrix for every field of every relevant canonical table: required or optional; whether blank is allowed; what blank means; what happens if the field is missing entirely; whether that is a validation failure, a warning or a reduced-confidence result; and whether a relationship or calculation becomes invalid. A missing relationship key (for example a Supplier ID where a supplier relationship is required) is a broken relationship, not an ordinary blank. Validation rules and user explanations follow the matrix. Its effort is estimated and reported separately.
3. **Documented fallbacks are not guessing** (§3, Clarification 3). Documented, reported fallbacks remain allowed; undocumented inference is prohibited: mapping fields because their names look similar; inferring mappings from codes or values; choosing silently between ambiguous candidate fields; inventing missing values; discarding information silently. Every mapping decision and fallback has a documented basis and appears in the import report.
   *Qualifications recorded since:* (a) the brief named the lead-time chain "Item → supplier_items → supplier standard → missing"; the engine's actual chain differs (item → supplier standard → supplier PO history → 7-day default; see `KNOWN-LIMITATIONS.md` entry 14), and which chain applies is an open decision (A1–A3, below); the owner's follow-up of 11:24 also directs that the approved design is not changed and no different chain is selected without the owner's approval. (b) The brief referred to "the existing date-format detection". The owner's follow-up of 11:24, point 3, corrects this to match the implementation: the date format is selected per file; UK format is the default; ambiguous dates are reported; conflicting dates are rejected; this is not to be described as automatic date-format detection (see also D6, D7).
4. **Supported and recognised-but-unsupported inputs** (§3, Clarification 4). "Supported" means handled by the existing implementation and verified by tests. Currently supported: CSV text (comma-separated, UTF-8 with or without byte-order mark, headings in the first non-blank row) and Excel `.xlsx` worksheets with one heading row and one table per sheet. Recognised but not yet supported, each to produce a clear explanation and, where possible, a next step, never a silent failure or an empty dataset: title rows above the headings; one column per period (wide layout); semicolon or tab separators; encodings other than UTF-8; `.xls`, `.xlsb`, `.ods`; password-protected files; merged or multi-row headings; several tables on one sheet; JSON (reader deferred, D15).
5. **Standard template versus test packages** (§3, Clarification 5). The *standard template* is the canonical reference input structure supplied by Chain Genius Consulting: the canonical CSV set represented by Package 01. Packages 01–06 are controlled test packages that verify importer behaviour under different data conditions and structures. They are not the complete list of layouts the importer may accept; the importer works from canonical business meaning and explicit mappings.
6. **Real-file acceptance before M4** (§3, Clarification 6). The acceptance process is defined in Stage 2/3 planning, before the M4 gate. Minimum criteria: (1) the file is read, or a clear reason is given why not; (2) the relevant business fields are correctly identified and mapped; (3) required fields, optional fields and relationships are validated; (4) agreed sample figures reconcile to the source file; (5) missing, rejected, ambiguous, changed and unmapped information is reported; (6) there is evidence that nothing was silently invented, altered or discarded; (7) validated data reaches the correct canonical structures; (8) acceptance or rejection is recorded with reasons and outstanding issues. Opening without an error is not acceptance. Technical verification (Chain Genius Consulting or its authorised technical reviewer) and business validation (an authorised representative of the supplying business) are recorded separately; where no business representative is involved, the record names who reviewed and states the limitations. The number and variety of real-file tests are defined in the Stage 2/3 plan (Clarification 6).
   *Qualifications recorded since* (owner's follow-up of 11:24, point 6): use three files from at least two different operational systems as a proposed minimum before M4, subject to review; they should represent meaningfully different structures, not merely three similar exports; technical verification is kept separate from business validation, and where there is no external business representative the record states who performed the technical review and clearly states that business sign-off has not occurred. No real-file result is claimed until it has happened.

## Agreed policies

**Conflicting duplicates** (Requirement 6 brief §4, an existing decision, not open): never silently resolved; the affected import stops until the user explicitly identifies the record to retain through the mapping/configuration process; the first record is never kept automatically; neither record is silently discarded; the conflict and what the user must resolve are reported.

**Duplicate principles** (Commit 1 authorisation §5, 12:24): a row number is a locator, not a duplicate identity; duplicate fingerprints consider the whole source row, including unmapped fields; a changed source invalidates a saved duplicate resolution; cross-file conflicts follow the same stop-and-resolve principle; differences such as bin location may represent genuinely separate stock records and are not silently collapsed; two apparently identical order lines may be separate transactions, and where the data cannot distinguish them the import stops and asks.

**Identical duplicates.** The Requirement 6 brief §4 records the handling of Package 02 I08 and I19 as "keep one and report the removal". The Commit 1 authorisation §5 adds that identical duplicates need separate, documented, table-specific rules and are not assumed always safe to remove. The table-specific rules are open (A6, below).

**Package 06 E08 — interpretation (a)** (owner, 12:43): in canonical input, a conflicting duplicate stops the affected import, and the E08 test must assert the stop. The mechanism for resolving it is deferred to M1b. This is a requirement for a future implementation, not a capability that exists now: Stage 1 only detects duplicate keys.

**Status of the duplicate corrections.** M1 pre-tag Commit 1 (`fb6c5ee`) replaced the contradictory keep-first wording in Package 02 (I09, I16, I12) and Package 06 E08 and in the generator. Package 02's expected figures were not changed: they assume an explicit resolution keeping the row with QOH 95 (I09) and the row with Qty Sold 94 (I16).

**Known gap in Package 02's expected results** (Finding 1, approved 15:02): Package 02's expected import report (`expected-import-report.json`) shows both imports stopping, while `expected-results.json` and `expected-canonical/` show the figures after an explicit resolution (QOH 95; Qty Sold 94) that is stated only in `DATA-ISSUES`. The report has no field showing which resolution was applied. Stage 2 defines that field together with the mapping format, and the expected report changes only through a separately approved change. `expected-results.json` also contains stock figures that depend on the I09 resolution (the row with QOH 95) and demand figures (for example the demand row count and the 12-month units total) that depend on the I16 resolution (the row with Qty Sold 94). Neither resolution is identified in a machine-readable field, so these stock and demand figures must not be treated as reliable post-resolution expected outcomes until Stage 2 records the resolutions that produced them in machine-readable fields.

**Unmapped columns** (Requirement 6 brief §5): the import report identifies every unmapped column and the file and worksheet where it occurs, makes clear its contents were not imported, and distinguishes potentially important columns (heading matches a canonical field name or a documented synonym) from ordinary additional columns, all of which are still listed. A non-matching heading is not proof that a column is harmless; uncertainty is reported. The user or consultant decides whether further mapping is needed. Nothing is presented as imported when it was not.

**Real-file data protection** (Requirement 6 brief §6, mandatory): real business-owned files are processed locally. Confidential employer data is not used without explicit permission; anonymisation alone is not permission. Real files never enter the public repository or its test packages. Mapping configurations written against a real business's files are potentially identifiable and never enter the repository; only a data-free description of a mapping's shape may be recorded (for example "header row 3, two worksheets, one unmapped column"). A defect found with a real file is reproduced with a newly created synthetic fixture; a redacted copy of a real file is never used as a regression fixture. Any proposal to use an anonymised copy needs a separate review confirming it cannot identify the business, people, products, suppliers or transactions, and even if approved it stays outside the repository.

**Permitted content of repository summaries of real-file tests** (§6): number of files tested; table row counts; pass/fail for each check; test duration; existing documented issue codes from `DATA-ISSUES.csv`. Never: item or product codes; supplier or customer names; quantities; prices or financial values; order-specific dates; business-specific mapping configurations; or other details, or combinations of details, that could identify a business or transaction.

**Private working folder** (owner, 15:02): real files, mappings written for a real business, and any logs or evidence from real-file runs are kept only in a folder **outside** the repository clone. There is no in-repository private folder and therefore no `.gitignore` entry for one. Reasoning: a folder outside the clone cannot be committed by any Git command, whereas a `.gitignore` rule is bypassed by `git add -f`, by a mistyped folder name and by files uploaded through the GitHub website or mobile app; the app opens files through the browser's file picker from any location, so nothing requires them inside the repository. Any future script that reads real files must require an explicitly supplied external path and must never default to a location inside the repository, including `tests/logs`.

**Protected packages** (§9): packages 01–06 are the controlled test baseline and are not changed to fit real-world layouts or defects found later. New coverage is additive: a new synthetic fixture, its checksum entry, its test registration and acceptance evidence, submitted for review and explicit approval.

**Mapping configurations** (§7, a design consideration for a later stage, not Stage 1 or Stage 2 scope): versioning; detecting that a saved mapping no longer matches the source (renamed or re-meant columns, added or removed worksheets, a change of system, a canonical schema change); reporting incompatible or outdated configurations; review and confirmation of changes by the user; updates that never silently change meaning. An outdated mapping is never silently reused when the source structure has materially changed.

**Upload and mapping interface:** the user-facing upload, worksheet selection, mapping, issue resolution and confirmation screens are planned for M1b. They are not part of M1 Stages 1–4 and are not omitted.

**Engine file protection (decision, recorded 12 Nov 2026).** Files under `js/` are protected by behaviour tests — golden snapshots, confidence snapshots, characterisation tests, and structural checks (`test-a1-static`, `check-globals`) — not by entries in `checksums.txt`. This is the agreed protection approach: the R5 checksum scope covers test files, snapshots and fixtures, while T3 demonstrated behaviour protection on `forecasting.js`. Adding `js/` files to `checksums.txt` would lock every engine change to a checksum update and, once tagged, a tag-move cycle, conflicting with the planned v0.7 modularisation. Future maintainers should not treat the absence of `js/` entries as an oversight.

## Test-data library: repository content and delivered ZIPs

- The library in `tests/fixtures/library/` keeps its internal label **"M1 test-data library v1.0"** (owner, 15:02). Changing the label would rewrite the header of nearly every generated file.
- Repository content = v1.0 as generated, plus the Commit 1 corrections (generator and six generated files), plus two pieces of hand-written text that the generator does not produce: the post-generation notes in `MASTER-INDEX.md` (since `ca1e800`, unchanged) and the E08 `EXPECTED.md` clarification (Commit 2).
- Delivered ZIPs are named **v1.0.2** (owner, 15:02): `01-…` to `06-…` and `00-Generator-Scripts`, all with the suffix `-v1.0.2`. The name v1.0.1 is not reused: `00-Generator-Scripts-v1.0.1.zip` already exists and contains the `ca1e800` generator with the old keep-first wording.
- Every file in the v1.0.2 ZIPs is byte-identical to the repository at the commit recorded in `tests/V07-TEST-RECORD.md`; against fresh generator output the only difference is E08 `EXPECTED.md`. `MANIFEST.sha256` and `MASTER-INDEX.md` are repository-only and are not in any ZIP. The v1.0 ZIPs are superseded: their Package 02 and E08 files contain the old keep-first wording.

## Decisions

### Decided (only those the owner has explicitly approved)

| Decision | Source |
| --- | --- |
| Conflicting duplicates stop the affected import; never keep-first | Requirement 6 brief §4 (11:16), an existing decision |
| Duplicate principles: row number is a locator; whole-row fingerprint including unmapped fields; changed source invalidates a saved resolution; cross-file conflicts stop the same way; bin-location and indistinguishable order lines stop and ask | Commit 1 authorisation §5 (12:24) |
| Pre-tag duplicate and I12 wording correction (A9), done as Commit 1 `fb6c5ee` | Commit 1 authorisation (12:24) |
| Package 06 E08: interpretation (a); resolution for canonical input deferred to M1b | Owner, 12:43 |
| Commit 1 stays local and unchanged (no amend) | Owner, 12:43 |
| Documentation in this commit (A10), within the six-file scope | Owner, 14:55, 15:02, 15:03 |
| Finding 1 wording; E08 `EXPECTED.md` clarification | Owner, 15:02 |
| Private working folder outside the repository; no `.gitignore`; scripts require an explicit external path (A14, as modified) | Owner, 15:02 |
| Library label stays v1.0; ZIPs named v1.0.2 | Owner, 15:02 |
| Three-problem framing for lead times in `KNOWN-LIMITATIONS.md` | Owner, 15:02 |
| `ca1e800` is preserved as an untagged historical checkpoint; tag `v0.7-tests-approved-4` was not to be created during the Commit 1 task. Nothing further about tag -4 is decided | Commit 1 authorisation §1 (12:24); confirmed open by the owner, 15:30 |

### Open (recorded, not decided; DECISION-DOCUMENT-v3 recommendations are not approvals)

| # | Decision |
| --- | --- |
| A1 | Lead-time behaviour when there is no evidence (labelling and warnings within the L3 boundary; L2 "cannot assess") |
| A2 | Order of lead-time sources when they disagree |
| A3 | Purchase-order-history rule and small samples |
| A4 | Lateness for bought-in products, and whether and when the H1 correction is made |
| A5 | Any detail of record identity beyond the principles decided above |
| A6 | Table-specific rules for identical duplicates; treatment of unmapped-column differences |
| A7 | Detail of the cross-file rule (declared partitions or ordered sources) |
| A8 | Reconciliation specification and adjustment ledger |
| A11 | General issue-type vocabulary |
| A12 | Constant-value mapping and case-only reporting in Stage 2 |
| A13 | When title rows and wide layouts are built |
| A15 | Tag -4: whether, on which commit and when it is created. No tag is created or assigned until separately authorised (owner, 15:30) |
| — | Characterisation test (Commit 3) and H1 correction (Commit 4): each needs its own authorisation |

## Cross-reference

The M1 acceptance statement is recorded in `tests/V07-TEST-RECORD.md`, section "M1 — acceptance scope statement". A change to that statement or to Requirement 6 in this file must change both files in the same commit, so the cross-document change is visible for review.
