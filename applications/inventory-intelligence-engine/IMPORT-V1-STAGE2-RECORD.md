# Universal Data Import v1 — Stage 2 record

## K0 — Owner decisions and approvals (recorded 14 Nov 2026)

Authority: the owner's brief of 14 Nov 2026, "TASK: Stage 2 decisions — record K0 and stop" (private; SHA-256 92ddd158…26e79c77).
The decisions answer the Stage 2 Solution Design Report of 14 Nov 2026 (private claude.ai document), section D.
The brief authorises this documentation-only record (K0) and nothing else.

Starting point, verified 14 Nov 2026 before any change:
- branch `development/v0.7`, tip `46636edb79c2edc2e79dad783131bfa1fb4bc21a`, working tree clean;
- `v0.7-tests-approved-4` → `5f18335`, unchanged; no Tag-5;
- guard (`check-control.js` from Tag-4): 12 passed, 0 failed, 93 PENDING lines.

Text in quotation blocks below is copied verbatim from the owner's brief.

### B1 — Which stock locations count

> B1 = Option A
>
> Use the "Include_In_Available" flag in the locations file.
>
> A blank flag counts as included. Locations marked N are excluded from available stock; locations marked Y (or with a blank flag) are summed into the Engine View available figure.

### B6 — Negative stock at a location

> B6 = Option A, with mandatory per-item reporting
>
> The rule: for each item, treat any negative stock at each location as 0 before summing across locations.
>
> The source negative value is preserved in provenance; only the Engine View "available" figure is clamped.
>
> This is consistent with M1 Part 3 ("kept, flagged, treated as 0 available") and test E04.
>
> Mandatory reporting requirement: for every item where any included location has negative stock, the adapter report must include:
>
> - item ID
> - the location ID
> - the negative quantity as entered
> - the text: "treated as 0 for available stock. Please investigate."
>
> This reporting requirement is not optional and is not a "nice to have". It is a required part of the adapter's output so that a legitimate in-transit or timing issue is visible to the customer and not silently corrected.
>
> On the 14 Nov boundary rule: clamping per-location negatives before summing is treated as a field-definition ("usable stock") rather than a value transformation. The source value is preserved.
>
> If this interpretation is contested at any point, raise it and stop. Do not resolve the disagreement yourself.

**Mandatory adapter output requirement.** The per-item negative-stock report above is a required output of the adapter, not an optional one. An adapter that omits it does not meet Stage 2.

### B20 — Universal Import v1 and M1 Stages 2–4

> B20 = Option A
>
> Universal Import v1 supersedes M1 Stages 2–4.

Supersession wording, exactly as supplied:

> «Where Universal Import v1 covers work that M1 Stages 2–4 also addressed, M1 Stages 2–4 are superseded. The Engine View, round-trip proof and any equivalent M1 work are consolidated into Universal Import v1 stages 2, 5 and 6 as appropriate. The part-received PO correction (SUP011 on-time from 31.3% to approximately 27.8%, with its own snapshot approval) moves to a new dedicated stage.»

SUP011 stage assignment, exactly as supplied:

> SUP011 stage assignment: Stage 5.5 — Part-Received Purchase Order Correction and Snapshot Approval.
>
> This stage covers correcting the part-received PO treatment, including the SUP011 on-time result changing from 31.3% to approximately 27.8%, and requires its own snapshot approval. It must be completed as a dedicated stage, not silently absorbed into another stage.
>
> Do not leave this work without a defined place in the roadmap.

### Approval 1 — `reliabilityDetail()`

> Approve the "reliabilityDetail()" addition to "validate.js".
>
> Add it alongside the existing "reliabilityOf()" without changing "reliabilityOf()"'s behaviour.
>
> It must preserve the full set of statuses per item and per analysis rather than collapsing to the worst status.
>
> The display layer may still show only the worst status, but the underlying detail must survive so that "caveated" cannot silently hide "incomplete".
>
> This approval authorises the addition as K4 work only. It does not authorise touching "validate.js" during K0.

Constraint recorded: `reliabilityOf()` behaviour remains unchanged. `validate.js` is not touched by K0.

### Approval 2 — K0

> Approve K0 (the decision-record commit) as specified below.
>
> This is the only work authorised by this prompt.

## Deferred decisions

B2–B5, B7–B19 and B21 remain open.

- The adapter will refuse the affected cases with a clear reason until those decisions are made.
- This refusal is a technical safeguard, not a policy choice.
- No unresolved business decision may be silently assumed or implemented.

## Difference register (accepted by the owner in K6, 14 Nov 2026: see `IMPORT-V1-DIFFERENCE-REGISTER.md`)

Copied verbatim from the Stage 2 Solution Design Report, section G. All five entries are **pending the owner's review before Stage 2 acceptance**. None is resolved or accepted by this record.

- **DR-1.** Notes sheets (`START HERE`, `QA NOTES`) are not part of the canonical model, so `demo`, `declared` and `notes` are empty. *Cause:* by design.
- **DR-2.** `Production_Line_ID` is not carried in raw production rows. The engine never reads it.
- **DR-3.** `dupexact`: 3 exact duplicate PO rows are removed under A6, which changes reconciliation counts.
- **DR-4.** Willow: empty-text cells become missing values. The direct route then misreads open POs as short-received with invalid dates (19 short vs 11). The import route reads them correctly.
- **DR-5.** Willow: the unmapped empty `Notes` column is not carried, so the engine's "column contains no values" warning disappears.

**Update at K5 (14 Nov 2026).** The full register, with the evidence for each entry, is now kept in `IMPORT-V1-DIFFERENCE-REGISTER.md`. It adds:
- the explanation of DR-5 from the K1/K2 finding: the engine inspects every column supplied to it, reads 42 column names by name, and some of its warnings depend on columns it does not otherwise use;
- **DR-6.** Import-route item records carry the new key `ua` (usable on-hand, B6 Option D); it equals on-hand in every fixture;
- **DR-7.** Willow: two data-quality warnings appear in a different order, because the engine follows the sheet's column order.

All seven entries remain pending the owner's review.

## Not yet done (as recorded at K0)

K0 listed K1–K6 as planned but unauthorised. All six have since been authorised and done; the list is in the history
of this file (commit `07ca45d`). The current outstanding work is under "Not yet done (as at K6)" at the end of this file.

## Observations recorded with K0 (not decisions; nothing resolved)

1. **B6 wording and the engine's input.** The engine takes on-hand stock and calculates available stock itself. Clamping a location's negative on-hand to 0 before summing therefore also affects the engine's on-hand and stock-value figures for that item, not only "available". This is consistent with test E04 (stock value excludes the negative row). The exact field the adapter writes must be confirmed at K3 against this decision.
2. **`M1-DESIGN.md` is now partly superseded.** Its scope line ("M1 = Stages 1–4, A1–A7") predates B20. It was not edited, because K0 authorises one file only.

## B6 clarification (14 Nov 2026)

Authority: the owner's replies of 14 Nov 2026 choosing Option A, listing negative stock in excluded locations, and authorising this one documentation-only commit. K0 above is unchanged.

**Finding.** The engine has one stock input per item (`On_Hand_Qty`). It calculates available stock (`oh − allocated`) and stock value (`oh × cost`) from it (`js/calculations.js` line 149). So the adapter cannot clamp available stock alone: the engine's on-hand and stock value always move with it. Shifting the difference into `Allocated_Qty` was tested and rejected: it writes allocated figures that no source contains, and in one case it silently replaced an allocation of 19 with 4.

**Owner decision: Option A.** For each item, negative stock at each included location is treated as 0 before summing. The Engine View on-hand, available and stock value all use the clamped figure. No engine calculation changes. This is consistent with M1 Part 3, test E04 (£1,100) and the reference calculator.

**Disclosure (mandatory, in addition to the B6 report).** For every affected item, the adapter report also shows:
- on-hand as entered and on-hand used;
- the resulting stock-value difference in £.

The change is therefore never silent.

**Excluded locations (owner decision).** Negative stock in excluded locations is also listed in the adapter report, for information only. It does not affect any engine figure.

**Correction to the K0 observation 1.** It described this as a point to confirm at K3. It was a conflict with the B6 wording and should have been raised as one.

K1–K6 remain unauthorised.

## History reconciliation (verified 14 Nov 2026, before K3)

`development/v0.7` is linear from the Stage 1 closure; there are no other commits in between:

| Commit | What it is |
| --- | --- |
| `46636ed` | Stage 1 closure (record and `tests/README.md`). |
| `07ca45d` | K0: owner decisions B1, B6 (Option A), B20 and the `reliabilityDetail()` approval recorded in this file. Documentation only. |
| `8ae201a` | B6 clarification addendum (section above). Documentation only. It was HEAD when K1/K2 began. |
| `e7b3d2f` | K1 + K2: `js/import/engine-map.js`, `js/import/engine-workbook.js`, `tests/test-import-engine-map.js`, test registration. CI passed. |

At the start of K3: HEAD = remote = `e7b3d2f`, working tree clean, `v0.7-tests-approved-4` → `5f18335`, no Tag-5.

## K1 + K2 (commit `e7b3d2f`, 14 Nov 2026)

Not recorded here at the time; recorded now.
- `engine-map.js` (map version EM1): the 60 columns the engine's eight sheets carry, and for each column the canonical field that
  fills it, or the reason none does. **Finding:** the engine inspects every column supplied to it, reads 42 column names by name,
  and some of its warnings depend on other columns. This is the explanation for DR-5.
- `engine-workbook.js`: writes the Engine View workbook cell by cell from the canonical dataset; no engine call.
- Owner decisions applied: `Active_YN` is mapped; `Location` is not mapped.
- `tests/test-import-engine-map.js`: 246 checks (49 per zone × 5 + 1).

## B6 revised to Option D (owner brief of 14 Nov 2026, "Complete Universal Import Stage 2 — K3, K4 and K5")

Option A (K0) and the B6 clarification above are kept unchanged as history. The owner's brief replaces them with Option D:
- **Physical on-hand** = the sum of the signed quantities at the eligible locations. It is the valuation basis.
- **Usable stock** = the sum over eligible locations of each quantity floored at 0.
- **Available** = usable stock − genuine allocated stock. The final result is not clamped.
- **Allocated** is unchanged. **Direct uploads** are unchanged.
- Excluded locations contribute to nothing.
- Every negative location is reported per item (mandatory fields, ending with the text "treated as 0 for available stock. Please
  investigate.").

### Engine contract (the controlled engine correction)

Option D needs one figure the engine did not accept: usable stock. The change is in `js/calculations.js` only (3 places):
1. Both item builders keep an optional `Usable_On_Hand_Qty` from the Inventory sheet as `ua`, **only when the column is present**.
2. `risk()`, the single place available stock is calculated: available = `ua` − allocated when `ua` is a number; otherwise
   on-hand − allocated, as before.
3. A non-numeric `Usable_On_Hand_Qty` raises a High data-quality warning and is not used (that item falls back to on-hand − allocated).

Unchanged by design: on-hand (`oh`), allocated (`al`), valuation (`val = oh × cost`) and everything calculated from them
(classification, no-demand list, dead-stock quantity, the "Negative quantities" and "Allocated exceeds on-hand" checks).
Everything calculated from available stock follows the corrected figure (position, cover, safety-stock checks, excess, shortage,
severity, MRP need and days, the material pool, forecasting, the Avail columns).

**Backward compatibility.** A workbook without the column gives exactly the earlier results: proven on all 17 fixture workbooks ×
5 time zones (old engine vs new engine, all sections, including item key lists), by golden v0.5 and v0.6.0 and confidence v0.7
(unchanged, passing), and by `test-import-adapter.js` (a column equal to on-hand everywhere gives an identical result).

**Owner-approved extension of K1/K2** (answer "Approve as proposed"): `engine-map.js` → map version EM2, with
`Usable_On_Hand_Qty` as an adapter-calculated (`derived`) Inventory column; `engine-workbook.js` writes it only when the adapter
passes `options.derived`; `tests/test-import-engine-map.js` extended (246 → 276 checks).

### Mandatory example (run through the engine; `test-import-adapter.js`)

| Case | Physical on-hand | Usable | Allocated | Available | Value |
| --- | --- | --- | --- | --- | --- |
| W1 60, W2 −15, allocated 0 | 45 | 60 | 0 | 60 | 45 × cost |
| W1 60, W2 −15, allocated 19 | 45 | 60 | 19 | 41 | 45 × cost |

With the synthetic cost of £50: value £2,250 in both cases. On Northstar item FG001 (cost £54.98): available 45 → 60 → 41, value
£2,474.10 in every case, total stock value unchanged. Against the same 45 units held in one location, physical on-hand, allocated,
item value and total stock value are identical; only available differs.

## K3 — Adapter (`js/import/adapter.js`, version AD1)

`CGImport.adapter.build(stage1Result, mapping)` → frozen `{status, workbook, gate, report}`; status `refused`, `restricted` or
`complete`. Pure function: no engine call, no asynchronous code, network, storage or engine globals (checked by AST in tests). It
refuses an unfrozen Stage 1 result and any option (none is approved).

Gates, in order:
0. **Input contract** (`ADAPTER_INPUT_INVALID`, `ADAPTER_INPUT_NOT_FROZEN`, `ADAPTER_MAPPING_INVALID`, `ADAPTER_OPTION_UNKNOWN`).
1. **Acceptance** (`IMPORT_NOT_ACCEPTED`, `DATASET_NOT_ALLOWED`, `REQUIRED_TABLE_UNAVAILABLE`). Placeholder rows (`__placeholder`)
   are excluded and counted; held tables are listed.
2. **Item roles**: bought-and-sold and made-not-sold items are refused (`POLICY_UNDECIDED_B14`).
3. **Stock** (B1, M1 D5, B6 Option D): eligibility from `Include_In_Available` (N excludes; Y, blank or unknown location counts;
   no location = UNASSIGNED). Refusals for undecided policies: allocated or on-order stock in an excluded location (B4), different
   unit costs (B7), more than one reorder point or safety stock (B9); refusals for data it will not guess: on-hand missing,
   allocated or on-order blank at some locations only, different snapshot dates. Engine row: signed on-hand sum; usable stock;
   summed allocated and on-order; the single reorder point and safety stock; source-row provenance. Per-item reconciliation, and
   a hard check that the written Inventory cells equal the rows (`ADAPTER_RECONCILIATION_FAILED`).
4. **Demand** (M1 D14, E6): demand file and sales lines together refused (B18). A demand file must be labelled
   `Demand_Basis = shipments`: `orders` refused (B19), no label refused (`DEMAND_BASIS_NOT_LABELLED`). Rows of one item-month are
   summed only across different locations; rows without a location pass through unchanged (kept duplicates are never merged or
   doubled); mixed or repeated locations are refused. Sales lines: shipped quantity by month of `Last_Ship_Date`; open quantities
   become commitments (cancelled lines none); shipped without a date, negative quantities and missing months (B17) are refused.

Undecided policies refused with a code: B4, B7, B9, B14, B17, B18, B19 (and the D14 label). The others cannot reach the adapter
in a form that needs a decision, checked against the design report's section D:
- B2, B3, B5: the canonical model has no field for quarantine, blocked or in-transit quantities; such columns stay unmapped, and a
  quarantine location is decided by B1 (owner §2.6). B2 remains formally open.
- B8: Stage 1 stops the stock table when an item has several rows in one location, so the adapter refuses
  (`REQUIRED_TABLE_UNAVAILABLE` or `IMPORT_NOT_ACCEPTED`).
- B15 and B16 apply only to items excluded under B14 Option B; B14 is refused, so no item is excluded.
Nothing is assumed for any of them.

## K4 — Result gate and statuses

**`reliabilityDetail(result, item, analysis)`** added to `js/import/validate.js` only; `reliabilityOf()` is unchanged.
It returns frozen `{status, statuses, reasons}`; `status` always equals `reliabilityOf()` (checked on a 30-case grid); `statuses`
keeps the full set, worst first, so "caveated" no longer hides "incomplete"; an analysis that was not supplied carries
`TABLE_NOT_SUPPLIED` beside `blocked` (no fifth status: F-9 #4 and B21 remain open).

**`js/import/result-gate.js`** `CGImport.resultGate.apply(engineOut, spec)` → frozen `{status, withheld, labelled, notes, result}`.
It never rewrites a number: an output is released unchanged, withheld (replaced by `{withheld: true, reason}`), or labelled.
- Money: every money-derived output is withheld when financial permission is not allowed or any included item lacks a cost.
  On the evidence (costs scaled per item on Northstar), this includes health category, score, confidence and ABC as well as
  values; after the gate no value differs (0 leaks among over 1,000 changed raw values).
- Client questions are withheld with `POLICY_UNDECIDED_B11` when financial permission is not allowed.
- Blocked items and blocked or unknown analyses are withheld; caveated and incomplete are labelled, never treated as blocked;
  an analysis whose table was not supplied is labelled.
- The engine's internal cache (`result.memo`) is never released.
- A malformed specification or engine output is refused and releases nothing. There is no bypass option.

## K5 — Proofs and tests

All proofs run the bundled SheetJS, the import modules and the engine in one JavaScript context; every run first checks that
direct Northstar gives its 5 data-quality warnings.

- **Proof A** (`tests/test-same-results.js`): 17 workbooks × 5 time zones. 13 give identical results apart from the register
  entries; each entry appears exactly where registered, and DR-3, DR-4 and DR-5 disappear when their cause is removed. The four
  refused workbooks stay refused.
- **Proof B**: Package 01 is refused as supplied (no `Demand_Basis` label). With the label added in memory (test assumption):
  complete; 120 items; on-hand 55,276; on-hand by location FGW 5,623, MAIN 46,598, SHEF 3,055; stock value £2,318,695.70;
  stock-out risk M0012, P0007, P0019, P0031; dead stock P0038, P0039 — all as expected.
- **Proof C**: the adapter-built Northstar workbook, read by `regress.js`, is identical to golden v0.5 and v0.6.0 in all 10
  sections. Confidence v0.7: 11 of 13 accepted workbooks identical; `dupexact` (DR-3) and `willow` (DR-4) differ only in the
  registered sections. No snapshot file was changed.
- **Proof D** (`tests/test-import-adapter.js`): the 19 cases (negative stock with positive, multiple, allocated, on-order, all
  negative and excluded locations; valuation; available; direct uploads; money and currency; blocked, incomplete and caveated;
  duplicates; roles; optional tables; malformed reliability; frozen input; sales lines; undecided policies), the engine contract,
  `reliabilityDetail`, the money leak check, and the four mandatory Stage 2 tests.
- Test-only tool: `tests/tools/import-v1/reverse-eight-sheet.js` (eight-sheet workbook → canonical CSV text and an identity
  mapping, in memory; assumes `Demand_Basis = shipments`).

New tests registered: `import-adapter` 346 (69 × 5 + 1), `same-results` 356 (71 × 5 + 1); `import-engine-map` 246 → 276;
`test-a1-static` 27 → 29; `check-protection` 430 → 433 (3 new protected files: the two tests and the tool). All are PENDING the
owner's tag move.

### Regression, before and after (14 Nov 2026, run in throwaway copies of the repository)

| Run | Before (`e7b3d2f`) | After (K3–K5, uncommitted tree) |
| --- | --- | --- |
| Fast tier | 22 tests passed (+ pre-flight), 0 failed | 24 tests passed (+ pre-flight), 0 failed |
| Full tier | 35 tests passed (+ pre-flight), 5 BLOCKED, 2 REDUCED (the K1/K2 run of the same content) | 37 tests passed (+ pre-flight), 5 BLOCKED, 2 REDUCED (the same accepted limitations) |
| Guard (`check-control.js` from Tag-4) | 12 passed, 0 failed, 95 PENDING lines | 12 passed, 0 failed, 100 PENDING lines |

Every existing test kept its accepted count except the three raised by this work (`check-protection`, `test-a1-static`,
`import-engine-map`). Golden v0.5, golden v0.6.0 and confidence v0.7 passed unchanged in 5 time zones; no snapshot file changed.

## B6 revision history (note dated 14 Nov 2026)

1. **Option A (K0, 14 Nov 2026).** The owner chose to treat negative stock at an included location as 0 before summing.
2. **Why Option A was superseded.** The B6 clarification (above) established that the engine has one stock input per item
   (`On_Hand_Qty`), from which it calculates both available stock and stock value. Clamping on-hand therefore also changed
   physical on-hand and stock valuation, not only available stock. That crosses the boundary that stock value is based on
   physical stock.
3. **Option D (owner brief of 14 Nov 2026 for K3–K5).**
   - Physical on-hand is the sum of the original signed location quantities, and it drives stock valuation.
   - Usable on-hand is calculated separately, with a zero floor applied to each location before summing.
   - Available stock = usable on-hand − genuine allocations.
   - Direct uploads without the new optional column keep their previous behaviour.
4. **Implementation (commit `01c565f`).** The optional Inventory column `Usable_On_Hand_Qty` is used in `js/calculations.js`
   (3 places, see "Engine contract" above). The adapter calculates it (`js/import/adapter.js`, gate 3), and the Engine View
   writes it (`engine-map.js` EM2, `engine-workbook.js` `options.derived`).
5. **Proof that physical on-hand and valuation are preserved.** `tests/test-import-adapter.js`:
   - S1 checks the mandatory example through the engine;
   - S2 cases 1, 3, 7 and 8 compare against the same stock held in one location: physical on-hand, allocated, item value and
     total stock value are identical, and only available stock differs.
6. **Backward compatibility.** K6 Test 1 (below): the old engine (`e7b3d2f`) and the new engine give byte-identical output on
   all 17 fixture workbooks. Golden v0.5, golden v0.6.0 and confidence v0.7 pass unchanged.

## K6 — Final verification and decisions (14 Nov 2026)

Authority: the owner's K6 brief and replies of 14 Nov 2026 (basis "shipments"; "go ahead with K6 documentation only"; DR-1 and
DR-4 wording approved). K6 is one documentation-only commit containing this file and `IMPORT-V1-DIFFERENCE-REGISTER.md`. No
engine, test, snapshot, fixture, checksum or manifest file was changed. The checks below were run from scratch scripts outside
the repository and in throwaway copies of it. Those scripts are not committed.

### Why K6 stopped once

The first K6 attempt stopped before committing, for two reasons:
- **The fixtures are protected.** The E04 and Package 01 files are protected three ways: by `checksums.txt`, by the library's
  `MANIFEST.sha256` (checked by `test-import-stage1`) and by the Tag-4 guard. A trial edit of E04 in a throwaway copy turned
  the fast tier red: `check-protection` and `import-stage1` both failed.
- **Package 01's demand basis could not be established from its files.** The owner then decided the two items below.

### E04 — arithmetic and decision

Source: `tests/fixtures/library/06-Edge-Cases/E04-negative-stock/input/` (stock, items and locations files).

| Item | W1 | W2 | Unit cost | Allocated / on order |
| --- | --- | --- | --- | --- |
| A1 | 60 | −15 | £10 | 0 / 0 |
| A2 | 100 | — | £5 | 0 / 0 |

Both locations are flagged Y (included). The unit cost is the same in the stock file and the items file. No other valuation,
allocation or item rule affects the value.

- **Option A:** physical on-hand = sum of max(0, quantity).
  - A1: 60 + 0 = 60, × £10 = £600.
  - A2: 100 × £5 = £500.
  - **Total £1,100**, which matches the protected E04 expectation.
- **Option D:** physical on-hand = sum of the signed quantities.
  - A1: 60 − 15 = 45, × £10 = £450.
  - A2: £500.
  - **Total £950.** A1's usable on-hand is 60, so its available stock is 60.

**Owner decision.** All Stage 1 files, checksums, the manifest and `refcalc.py` are left untouched.
- Under B6 Option D, the correct Stage 2 value for E04 is **£950**.
- The £1,100 in the protected E04 files (`EXPECTED.md` and `expected-results.json`) is the original Option A result, kept as
  Stage 1 history.
- E04 cannot currently pass through the adapter. Its items are bought and sold (B14 undecided), and its demand file has no
  `Demand_Basis` label.
- The Option D arithmetic is exercised through the engine by `test-import-adapter.js` S2 case 1, which uses the same quantities
  (60 and −15).

### Package 01 — demand basis and decision

- **Evidence.**
  - The package README describes `demand.csv` only as "Monthly sales (units)".
  - The generator (`tests/tools/library/model.py`, `gen_demand`) produces synthetic monthly units with no notion of shipped
    versus ordered.
  - The files alone cannot establish the basis (outcome c).
- **Owner decision (14 Nov 2026).** The owner, as the author of this synthetic data, explicitly defines Package 01's monthly
  demand quantities as **shipments**.
- **Not changed in K6.** `dataset.csv`, `checksums.txt`, `MANIFEST.sha256` and every other protected package file are unchanged.
- **Current result.**
  - As supplied, the package passes Stage 1 but the adapter refuses it (`DEMAND_BASIS_NOT_LABELLED`).
  - Proof B (`tests/test-same-results.js`) still adds `Demand_Basis = shipments` in memory. With that label, every expected
    figure matches: on-hand 55,276; stock value £2,318,695.70; stock-out risk M0012, P0007, P0019, P0031; dead stock P0038,
    P0039.
  - **Package 01 does not yet import cleanly from its supplied files.**

**Prepared change for the Tag-5 approval step (notes only; not committed).**
- `tests/fixtures/library/01-Clean-Manufacturer/dataset.csv`: add the `Demand_Basis` column after `Currency`, with value
  `shipments`. This changes the header line and the data line, and nothing else:
  ```
  Format_Version,Business_Name,Business_Type,Snapshot_Date,Currency,Demand_Basis,Date_Format_By_File,Source_Files,Mapping_Name
  CDv1,Harbour Valve Engineering Ltd,Manufacturer,2026-10-31,GBP,shipments,ISO (all files),canonical CSVs,canonical (no mapping needed)
  ```
- SHA-256 of `dataset.csv`: `ff64d39d102de33c46ec012639161a32e63959339a15d009ae2378a68ee90662` →
  `0dbaea1cbc229ed5f3fff336c5c2b3a0a5fea156e1d92740f4c0d8716d4cce21`. It must change in two places:
  - `tests/fixtures/library/MANIFEST.sha256` (the `./01-Clean-Manufacturer/dataset.csv` line);
  - `tests/checksums.txt` (the `tests/fixtures/library/01-Clean-Manufacturer/dataset.csv` line).
- SHA-256 of `MANIFEST.sha256` after that edit: `94047192a3dd2b2c7a46ed77caf0d0c1957558b54ced42d314417d44ce4a4c33` →
  `cd8111855aaf079481b68115191fcc312282acf9a87eb8517d9ff74986377e3c`. Its line in `tests/checksums.txt` must change too.
- `tests/test-same-results.js`, Proof B, must change at the same time:
  - the as-supplied check expects a refusal now, and would then expect a complete import;
  - the in-memory label must be removed.
  - Its line in `tests/checksums.txt` changes as well. This is a test change and needs the owner's approval at that step.
- **Trial in a throwaway copy, with the three hash edits applied:**
  - `import-stage1` 616/0 and `import-mapping` 976/0 pass;
  - `check-protection` passes only once the `MANIFEST.sha256` line is updated;
  - `same-results` gives 1 failure until Proof B is updated (expected).
- **Guard.** The Tag-4 guard reports two approved lines changed (`dataset.csv` and `MANIFEST.sha256`) until the tag is moved.
  That is why the change belongs with the Tag-5 approval step.

### Both-routes verification (Northstar; scratch script, UTC)

| Comparison | Result | Explanation |
| --- | --- | --- |
| Direct upload against pre-change baseline | Identical | The old engine (`calculations.js` at `e7b3d2f`) and the new engine, each in its own context, give byte-identical serialised output on all 17 workbooks. Northstar: 2,762,709 bytes, 5 data-quality warnings. |
| Universal Import against direct upload | Registered differences | Stage 1 → adapter → engine → result gate: import accepted, adapter complete, gate complete (0 withheld, 0 labelled). The only differences are DR-1 (notes text), DR-2 (`Production_Line_ID`) and DR-6 (`ua`), plus the engine's internal cache, which the gate never releases. All 150 items match on 9,450 item fields apart from `ua`. Stock value is £2,533,596.40 by both routes. |
| Final cross-check | Pass | With the notes sheets and the 151 `Production_Line_ID` cells removed from the direct workbook, only DR-6 remains; `ua` equals on-hand for every item. |

The first comparison reported 50 "unexplained" `feas.rows[].sd` differences. These were formatter functions, compared by object
identity. Compared by source text they are identical, so they are not a data difference.

### Allocated-exceeds-on-hand warning (investigation only; nothing changed)

- **Example.** Northstar FG001 with physical on-hand 45, usable 60 and allocated 50 (`Usable_On_Hand_Qty` supplied).
- **Result.** Available is 10, which is correct. Stock value is still 45 × cost.
- **Current behaviour.** The High warning "Allocated exceeds on-hand" fires for FG001. The check (`js/calculations.js`,
  data-quality checks) compares `Allocated_Qty` with the physical `On_Hand_Qty`.
- **This is a genuine false positive under Option D.** Usable stock (60) covers the allocation (50).
- **Customer-facing impact.**
  - A High data-quality warning appears.
  - The item's confidence drops: FG001 shows Low, with the reason "data-quality flag on this item".
  - No client question is raised.
- **Without the column** (on-hand 45, allocated 50), available is −5 and the warning is correct.
- **Recommendation.** Compare allocated stock with `Usable_On_Hand_Qty` when it is present, and with `On_Hand_Qty` otherwise.
- **Tests needed:**
  - the example gives no warning;
  - allocated 65 against usable 60 gives a warning;
  - a direct upload without the column is unchanged (golden snapshots);
  - item confidence follows the warning.
- **Deferred.** This needs an engine change (see the deferred items).

### Difference register — review outcome

All seven entries were checked against the evidence and the implemented code. `IMPORT-V1-DIFFERENCE-REGISTER.md` holds the full
text.

| Entry | Verified by | Outcome |
| --- | --- | --- |
| DR-1 | Northstar: the notes sheets deleted from the direct workbook remove the difference. | Wording corrected (the full sheet list; `Read me` belongs to Willow only). Accepted. |
| DR-2 | All 13 accepted workbooks carry the column; removing it removes the difference. | Evidence replaced with this K6 check. Accepted. |
| DR-3 | Proof A: 3 exact duplicate PO rows; removing them removes the difference. | Accepted. |
| DR-4 | Cell inspection: 8 POs (7 Open, 1 Cancelled) with empty-text received quantity and date; 19 − 11 = 8. | Wording corrected. Accepted. |
| DR-5 | Proof A: with the cause removed, DR-4 and DR-5 disappear. | Accepted. |
| DR-6 | `ua` equals on-hand on every item; no direct-route item has it. | Accepted. |
| DR-7 | In `result`, `alt` and `altS`: the same 10 warnings, identical in every field; only positions 0 and 1 swap; every other section identical. | Accepted. |

**DR-4.** The direct-upload route has a known bug in handling empty-text cells. Universal Import treats empty text as missing
and reads correctly. This is an improvement. The direct-upload bug is separate and remains unfixed at the engine level.

### Proofs and tests (K5 results; not re-run for this documentation-only commit)

- **Proof A.** 13 workbooks identical apart from the register. The 4 refusals stay refused.
- **Proof B.** As above (with the in-memory label).
- **Proof C.** Golden v0.5 and v0.6.0 are identical in all 10 sections. Confidence v0.7: 11 of 13 identical, 2 differ only in
  their registered sections.
- **Proof D.** 19 cases and the 4 mandatory tests pass.
- **Test runs.**
  - At K5 (commit `01c565f`): fast tier 24 tests passed (+ pre-flight); full tier 37 tests passed (+ pre-flight), 5 BLOCKED,
    2 REDUCED; guard 12 passed, 0 failed, 100 PENDING; CI succeeded.
  - Re-run on `01c565f` during K6: fast tier 24 passed (+ pre-flight), 0 failed, 100 PENDING.
  - **No tests were run for the K6 commit itself.** It changes documentation only: no code, test, snapshot or fixture.

## Known limitations (Stage 2, as at K6)

| # | Item | Priority | When it must be dealt with |
| --- | --- | --- | --- |
| 1 | **B14: bought-for-resale items are refused.** The adapter refuses files with bought-and-sold or made-not-sold items, so wholesalers, distributors and retailers (for example library packages 03 and 04, and E04) cannot be analysed through Universal Import. The refusal must not be changed silently. | HIGH | Must be decided before Stage 3 planning begins. |
| 2 | **`refcalc.py` still uses Option A.** It clamps stock value and floors available stock at 0, and Stage 1 tests compare it with every package's `expected-results.json`. Any future package with negative stock will get Option A reference figures. | HIGH | Owner decision before more negative-stock fixtures are added. |
| 3 | **Allocated-exceeds-on-hand false positive** under Option D, which also lowers the item's confidence (see above). Engine change and tests based on physical versus usable stock required. Not fixed in K6. | MEDIUM | Later engine refinement. |
| 4 | **`Scrap_Pct` NaN.** If a BOM omits the optional `Scrap_Pct` column, production shortage figures become NaN on both direct-upload and imported routes. Pre-existing engine issue, not introduced by Stage 2. Separate engine investigation and dedicated regression tests required. Not fixed in K6. | MEDIUM | Separate engine task. |
| 5 | **Exports: Available ≠ OnHand − Allocated** for items with negative location quantities under Option D. Stage 4 must explain it through a column heading, an explanatory note or a footnote. | Presentation | Before Stage 4. |
| 6 | **Package 01 label.** Package 01 is refused as supplied until `Demand_Basis = shipments` is added (prepared above). Every demand file must carry the label (M1 D14). | Acceptance condition | With the Tag-5 approval step. |
| 7 | **Direct-upload route** (not changed by Stage 2): it misreads empty-text cells (DR-4) and counts exact duplicate PO rows twice (DR-3). | Recorded | Separate engine task if wanted. |
| 8 | **E04** cannot run through the adapter (B14, no `Demand_Basis` label). Its protected £1,100 is the Option A figure; the Stage 2 value is £950. | Recorded | With B14 and the reference-calculator decision. |

## Not yet done (as at K6)

K0's planned steps K1–K6 are done. K1–K5 are in commits `e7b3d2f` and `01c565f`; K6 is this documentation commit.

**Stage 2 is not complete. It is awaiting:**
1. the Package 01 `Demand_Basis = shipments` label in `dataset.csv`;
2. its protection update (`MANIFEST.sha256` and `checksums.txt`) and the matching Proof B test change, at the Tag-5 approval
   step;
3. a re-run of the fast and full tiers and CI after that change;
4. the owner's final acceptance of Stage 2.

Not authorised, and not started: Tag-5, Stage 3, and any engine change (including items 3 and 4 above).
