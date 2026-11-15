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

> **Correction (15 Nov 2026, owner ratification):** Original wording overstated: the seven entries were verified by Claude under the K6 instruction, and the owner's acceptance was delegated, not personal. Ratified by owner on 15 November 2026.
>
> This applies to the heading of this section ("accepted by the owner in K6") and to the entries' status "Reviewed and accepted by owner, 14 Nov 2026" in `IMPORT-V1-DIFFERENCE-REGISTER.md`. The statements above that the entries are pending the owner's review are historical: K6 recorded the delegated acceptance (14 Nov 2026), and the owner ratified it on 15 November 2026 in these words: "I confirm the K6 delegated acceptance of the difference register stands as mine, based on Claude's verification of the seven entries." No difference-register entry is now pending.

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
  *(Correction, 15 Nov 2026, C2: Proof B as at K5. Since T5 (`f0e81bb`) it reads the supplied label from disk; see the note in K6.)*
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

> **Correction (15 Nov 2026, T5 review finding C2):** this was the position at K6. Since the T5 commit `f0e81bb`, `dataset.csv` carries `Demand_Basis = shipments`, and Proof B reads the supplied Package 01 files, checks the label from disk and no longer adds it in memory. `tests/test-import-integrity.js` still sets its own label in memory, by design (`V07-TEST-RECORD.md`, Commit C section, point 6).


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
| 4 | **`Scrap_Pct` NaN.** If a BOM omits the optional `Scrap_Pct` column, production shortage figures become NaN on both direct-upload and imported routes. Pre-existing engine issue, not introduced by Stage 2. Separate engine investigation and dedicated regression tests required. Not fixed in K6. **Resolved by K7/E-1 (`d33c105`, 15 Nov 2026): a missing column or blank cell is 0% with a High warning, and an unreadable value is left out with a High warning; never NaN (see "E-1 implementation").** | MEDIUM | Separate engine task. **Resolved.** |
| 5 | **Exports: Available ≠ OnHand − Allocated** for items with negative location quantities under Option D. Stage 4 must explain it through a column heading, an explanatory note or a footnote. | Presentation | Before Stage 4. |
| 6 | **Package 01 label.** Package 01 is refused as supplied until `Demand_Basis = shipments` is added (prepared above). Every demand file must carry the label (M1 D14). **Resolved by T5 (`f0e81bb`): `dataset.csv` carries `Demand_Basis = shipments`, and Proof B imports Package 01 from its supplied files.** | Acceptance condition | With the Tag-5 approval step. **Resolved.** |
| 7 | **Direct-upload route** (not changed by Stage 2): it misreads empty-text cells (DR-4) and counts exact duplicate PO rows twice (DR-3). | Recorded | Separate engine task if wanted. |
| 8 | **E04** cannot run through the adapter (B14, no `Demand_Basis` label). Its protected £1,100 is the Option A figure; the Stage 2 value is £950. | Recorded | With B14 and the reference-calculator decision. |

## Not yet done (as at K6)

K0's planned steps K1–K6 are done. K1–K5 are in commits `e7b3d2f` and `01c565f`; K6 is this documentation commit.

**Stage 2 is not complete. It is awaiting:**

> **Correction (15 Nov 2026, T5 review finding C2):** this list is as at K6. Items 1–3 were done by the T5 commit `f0e81bb` (local pre-tag runs; post-tag CI ran the fast tier only). Item 4 remains open. See the final Status section.

1. the Package 01 `Demand_Basis = shipments` label in `dataset.csv`;
2. its protection update (`MANIFEST.sha256` and `checksums.txt`) and the matching Proof B test change, at the Tag-5 approval
   step;
3. a re-run of the fast and full tiers and CI after that change;
4. the owner's final acceptance of Stage 2.

Not authorised, and not started: Tag-5, Stage 3, and any engine change (including items 3 and 4 above).

## K7 — Integrity fixes F1 and F2 (14 Nov 2026; implemented in the working tree, NOT committed)

> **Correction (15 Nov 2026, T5 review finding C2):** "implemented in the working tree, NOT committed" was true when written. K7 was committed in `d33c10563e3da0bb5e1976418afa77992c1b727d` (15 Nov 2026), with the verification corrections and E-1; see the final Status section.

Authority: the owner's K7 brief of 14 Nov 2026 ("investigate, challenge and fix" within K7; no commit, push or tag). The design
investigation is `K7-investigation-and-plan.md` (delivered to the owner, not in the repository). Nothing in this section is
accepted: it records what was changed and the evidence, for the owner's review.

### Defects

- **F1 — blocked inputs contaminated released results.**
  - An item that Stage 1 blocks for every analysis (`blocked.all`, set only for a unit mismatch, `validate.js` line 458) is told
    to the user as "excluded from every analysis". AD1 still wrote it into every Engine View sheet. RG1 withheld only its own
    fields, so its stock (in the wrong unit) fed totals, other items' ABC, the material pool and supplier values.
  - Items blocked for one analysis (demand, purchasing or production) contaminated the totals and other items' results built
    from that analysis. F03 example: £244,837.55 of the released excess value came from 24 demand-blocked products; ABC was
    released although 56.63% of the ranked value was blocked.
  - Root cause: E3 ("blocked items stay in the run, only their own outputs are withheld") assumed that results do not cross
    items. They do: groups are ranked together, totals are summed, the BOM links products and materials, orders share a pool,
    and suppliers aggregate materials.
- **F2 — missing scrap gave false production results marked "complete".**
  - `Scrap_Pct` is optional. A missing column or blank cell reached the engine as `undefined`, so `qty × (1 + undefined)` = NaN
    (`calculations.js` lines 116 and 185).
  - The effect: every order became "Material shortage". The delay was the latest material lead time, because a NaN requirement
    is never covered by receipts, so the engine assumes a new order today (Northstar order FG003: RM031 36.85 days − 1 day
    = "~36d"). Materials looked like they had no demand.
  - An unreadable value is blanked by Stage 1 and reached the engine the same way.
- **Gaps found in RG1 while fixing F1 (new, fixed in K7):**
  - feasibility rows of withheld products were never withheld: RG1 matched `r.o.SKU`, but the engine's field is `r.o.sku`;
  - the engine's second copies of forecasts and forecast credibility (`result.fcm`, `result.fcc`) were not gated;
  - production performance (`result.pr`) was in no section, and scheduled receipts (`result.sched`, from purchase orders) were
    filed under production instead of purchasing. *(Correction, 15 Nov 2026: both were implemented in K7, but neither was
    tested until the K7 verification corrections below. Mutations M12 and M13b survived the original K7 test.)*;
  - an item's stock value (`val` = on-hand × cost) was withheld with its analysis results although no analysis block changes it.

### Solution and why

- **Adapter AD2** (`js/import/adapter.js`):
  - `blocked.all` items are left out of the Items, Inventory, Demand, Purchase Orders and Production Orders data. Their BOM rows
    are **kept**, so the engine itself marks dependent orders "Insufficient information" ("BOM references unknown SKU or
    material").
  - The report lists every excluded item: reason, "all analyses", source stock in its own unit, value "not calculated", BOM
    components and parents, and the hint "If you can supply the item's unit conversion factor, this item can be analysed."
  - Scrap is classified per BOM line:
    - a supplied value is used;
    - a missing column or blank cell is **assumed 0%** (written only into the Engine View copy, and disclosed);
    - a value Stage 1 recorded as unreadable (`FIELD_BLANKED`, `bom.Scrap_Pct`, row number) is **invalid**: it is never
      replaced by a number. *(At K7 its Engine View cell was left empty; from E-1 it holds the text marker `SCRAP_UNREADABLE`,
      see "E-1 implementation".)*
    If the Stage 1 issue list is missing or malformed, or the BOM came from more than one file (row numbers could collide), every
    blank is treated as invalid.
- **Result gate RG2** (`js/import/result-gate.js`; rules R1–R8 below): dependency-aware withholding, a cross-check against the
  engine output, a safety net for non-finite numbers, and a `disclosures` section.
- **Why both layers.**
  - The gate alone cannot take a contribution out of a total or a ranking without recalculating, which the engine-is-the-source
    rule forbids.
  - The adapter alone leaves dependants wrong. Tested before implementing:
    - with P0001 removed, M0058 (whose only parent is P0001) showed a false excess of £6,232.80;
    - with P0001's BOM rows also removed, P0018 looked feasible without its component M0028.
- **Rejected alternatives:**
  - withhold every total when any item is blocked (loses valid analysis);
  - release subtotals calculated by the gate (numbers the engine did not produce; ABC cannot be rebuilt that way);
  - withhold production when scrap is missing (many SME exports have no scrap column).

### RG2 contract (supersedes RG1)

**Specification.** RG1's fields plus:
- `excluded` (per item: reason, role, name, item unit, source stock, hint);
- `dependants` (per excluded item: its components and parents, from the canonical BOM);
- `scrap` (column `supplied` or `not-mapped`; assumed lines; invalid lines).

An RG1 specification, or any malformed field, is refused (`RESULT_GATE_SPEC_INVALID`). An engine output without its BOM is
refused (`RESULT_GATE_ENGINE_OUTPUT_INVALID`).

**Statuses.**

| Status | Meaning | How it is shown |
| --- | --- | --- |
| available | released as the engine calculated it | no marker |
| incomplete or caveated | released with a label | labels, from `reliabilityDetail`; plus `SCRAP_ASSUMED_ZERO` (caveated) |
| blocked | withheld | `{withheld: true, reason}` |

A result that depends on a withheld input is withheld (rules below). `reliabilityOf` and `reliabilityDetail` are unchanged and
still fail safe: missing or malformed reliability information gives "blocked", which the adapter turns into a withheld entry.

**Rules.**

| Rule | What it does |
| --- | --- |
| R1 cross-check | Refuses the whole result (`RESULT_GATE_SPEC_ENGINE_MISMATCH`, every difference listed) when any of these holds: an excluded item is present in the engine output; an item the BOM names was neither analysed nor declared excluded; declared dependants differ from the engine BOM; an excluded item also has item entries; item entries name an item the engine did not see; declared scrap bases do not match the Engine View BOM line by line |
| R2 dependants | Components of excluded or demand-withheld products, and components on invalid scrap lines: material and purchasing results withheld |
| R3 feasibility | Orders, in start order: withheld if the product is production-withheld, uses an excluded component, sits on an invalid scrap line, or uses a material whose shared pool was affected by an excluded parent, withheld receipts or an earlier withheld order. Its materials then count as affected for later orders |
| R4 group results | ABC class and cumulative share for the whole group, and the group's excess, shortage and annual-value totals (`exF`, `shV`, `cogsF`, or `exR`, `cogsR`; plus `exV`), withheld when any item in the group is withheld for the analysis they come from. The confidence table and client questions are withheld when any item's results are withheld. Stock-value totals (`tot`, `fgV`, `rmV`, `top`, `top10`, `fam`, `rg`) stay, because they use only on-hand and cost |
| R5 suppliers | Supplier rows of any material with withheld results are withheld. For purchasing-withheld materials: reconciliation lines, the PO summary and scheduled receipts are withheld |
| R6 assumptions | Results that use an assumed 0% scrap line are labelled caveated (`SCRAP_ASSUMED_ZERO`): feasibility, MRP, each component and product, and the materials totals and rankings. The status is "restricted", never "complete" |
| R7 safety net | Any non-finite number left in the released copy is withheld (`NON_FINITE_VALUE`) |
| R8 disclosure | `gated.disclosures`: `excluded`, `dependants`, `withheldTotals`, `ordersWithheld`, `assumptions`, `invalid`, and `text` sentences ready to display |

### Evidence (scratch runs and the new test; figures verified independently)

**Package 01 with P0001 stock in "box" and M0028 stock in "kg" (the Stage 1 rule is unchanged).** Before = clean Package 01;
after = AD2 + RG2.

| Measure | Before | After (released) | Explanation |
| --- | --- | --- | --- |
| Items analysed | 120 | 118 | P0001 and M0028 excluded (unit mismatch) |
| Total stock value | £2,318,695.70 | £2,298,987.29 | −£19,708.41 = P0001 £9,127.80 + M0028 £10,580.61 |
| Finished-goods / materials value | £1,287,688.54 / £1,031,007.16 | £1,278,560.74 / £1,020,426.55 | −P0001 / −M0028 |
| Finished-goods excess / shortage | £515,844.07 / £5,110.86 | £515,844.07 / £5,110.86 | P0001 contributed none |
| Materials excess, annual value, overall excess | £2,591.48; £5,682,226.63; £518,435.56 | withheld | they would include M0058's false £6,232.80 excess and M0058/M0064's incomplete usage |
| Top-10 share | 44.71% | 45.10% | smaller denominator |
| P0018 orders | Feasible | engine "Insufficient information"; released withheld (`USES_EXCLUDED_COMPONENT M0028`) | M0028's kg had been counted as each |
| M0058, M0064 | released | material and purchasing results withheld (`DEPENDS_ON_EXCLUDED_PARENT P0001`); stock kept | usage without P0001 is incomplete |
| Other dependants | — | P0021's order withheld (shared pool after a withheld order); suppliers S04 and S10 withheld | R3 and R5 |
| Blocked data in released results | — | none (checked field by field, test I12) | |

The disclosure sentences (excerpt):
- "2 item(s) were excluded from this analysis and from every total: M0028 (unit mismatch); P0001 (unit mismatch). Totals, value rankings and ABC classes are calculated over the analysed items only…"
- "P0001 Valve Bodie model 001: unit mismatch (item unit "each"). Source stock as supplied: 128 box at FGW, 70 box at SHEF. Stock value not calculated. If you can supply the item's unit conversion factor, this item can be analysed."
- "Orders for P0018 use M0028, so their material feasibility is not shown."
- …and sentences for the withheld component results, the orders and the suppliers.

**Fault case F18 (P0001 "box", M0001 "EA"; no BOM).**

| Measure | Before | After | Explanation |
| --- | --- | --- | --- |
| Total stock value | £2,318,695.70 | £2,307,019.10 | −£11,676.60 = P0001 198 × £46.10 = £9,127.80 + M0001 118 × £21.60 = £2,548.80 |
| ABC | P0015 C, P0017 A | P0015 B, P0017 B | ranked over the 39 analysed products. The ranked total falls by P0001's annual value, £87,105.95. The released classes equal an independent recalculation |
| Supplier S01 stock value | £95,010.93 | £92,462.13 | −£2,548.80 (M0001) |

**Materials value equals materials excess value in F18 (£1,028,458.36).** This is correct, not a copying error:
- F18 has no BOM, so no material has usage (`d = 0` for all 79);
- the engine counts stock with no usage as wholly excess (`exQty = av`, `exVal = val`);
- in Package 01, which has a BOM, the two differ (£1,031,007.16 against £2,591.48);
- the labels are accurate ("value of stock beyond 180 days of cover"; with no usage, that is all of it).

**F2, Package 01 (142 BOM lines; true scrap 0, 2% or 5%).**

| Input | Classified as | Result |
| --- | --- | --- |
| column missing | 142 lines assumed | 0 NaN; every order's status and delay equal an explicit-0% run (33 Feasible, 1 shortage, as with true scrap); restricted and labelled |
| blank cells | 142 lines assumed | the same as a missing column |
| explicit 0, "5%", 0.05 | supplied | gate complete |
| 1 (= 100%) | supplied | the line's material usage exactly doubles |
| "abc" or 1.5 | invalid (row 4) | no number written (at K7 an empty cell; from E-1 the marker `SCRAP_UNREADABLE`); P0001's orders and M0064's results withheld; no NaN released |

**F2 hand check.** On the one shortage order, each shortage with true scrap exceeds the 0%-scrap shortage by exactly
q × Qty_Per × scrap.

**F2, Northstar (200 lines, 148 at 1–3%).**
- With the scrap column removed, all 50 orders keep their true-scrap status **and delay**, including the 33 genuine shortages.
  Order FG003/211 is Feasible, not "~36d".
- All 100 material severities are unchanged.
- The assumption understates requirements by at most the true scrap rate (≤ 3% here). It can hide a marginal shortage where
  scrap is high, which is why every such result is labelled.

**Mutation check (original K7 claim, corrected 15 Nov 2026).** This section originally said that the new test "failed every
time" a safeguard was switched off. **That overstated the evidence.** The independent K7 verification (15 Nov 2026) ran 16
required mutations plus 2 extra probes, each alone in a fresh throwaway copy, against the K7 tests as they then stood:
- 14 of the 16 were detected by named assertions (87.5%), but M1 and M15 also made the test script crash part-way, so the
  assertions after the crash never ran;
- M2 (an excluded item's BOM rows dropped) was refused by the gate's own cross-check, but the test only crashed and reported
  no named failure;
- M12 (production performance, `result.pr`, released for production-blocked products) **survived**: no test checked it;
- extra probe M13b (scheduled receipts filed under production) **survived**: no test checked the filing;
- extra probe M2b was detected;
- the tests that existed before K7 caught only 1 of the 16 (M7, through adapter test case 12).

See "K7 verification corrections" below for the re-run after the corrections.

### Tests

- **New:** `tests/test-import-integrity.js` (`import-integrity`): at K7, 54 assertions per zone × 5 + 1 = **271**; the five
  zone runs repeat the same 54 assertions, so this is 54 distinct assertions, not 271 (after the verification corrections: 65 × 5 + 1
  = **326**, see below). Coverage at K7:
  - F1: I1–I9 and I12, on Package 01 and F18;
  - partial blocks: I10 (demand, F03) and I11 (purchasing and production);
  - I13: 9 tamper cases plus a control;
  - R7;
  - F2: S1–S15, on Package 01 and Northstar. At K7, S8–S10 and S11–S12 were each one combined assertion (split in the
    verification corrections).
- **Changed:** `tests/test-import-adapter.js`. The count is unchanged at 69 per zone and **346** accepted.
  - **Case 12 (a contract change):** previously "P2 (not blocked) is released exactly as the engine calculated it"; now "…except
    its ABC class and cumulative share: they are ranked across the group that includes the withheld P1, so they are withheld
    (RG2 R4)". The new assertion checks every other P2 field against the engine output, and checks that the two withheld fields
    carry exactly `DEPENDS_ON_WITHHELD_ITEMS (fg): P1`. Approval 1 added a check that P2's released record has exactly the
    engine's fields (see "K7 verification corrections").
  - The money leak test's hand-written specification moved from RG1 to RG2 form (the extra fields are empty). Its check is
    unchanged: no leaked paths.
- **Registration:** `accepted-results.json` gains the new `import-integrity` entry (271) and `check-protection` goes 433 → 434
  (one more protected file). `checksums.txt` gains a new line (`test-import-integrity.js`) and a changed line
  (`test-import-adapter.js`, a pending line). No approved line changes.
- **Precision (commit review, 15 Nov 2026).** The counts above (271, and 326 after Approval 1) were working-tree values and were
  never committed. Against the last commit (`b5e17eb`), the K7 commit contains:
  - in `accepted-results.json`: a **new** `import-integrity` entry at **386**, and `check-protection` 433 → 434;
  - in `checksums.txt`: **one changed** line (`test-import-adapter.js`, `fc87d204…` → `38ff08dc…`), **one added** line
    (`test-import-integrity.js`, `305592ee…`) and one added comment.
  - The changed line was added after Tag-4 (commit `01c565f`), so it is pending, not approved. No approved line changes: all
    339 `file`/`ref` lines of Tag-4's `checksums.txt` are present, unchanged.

**Results at K7 (14 Nov 2026, run locally in a throwaway copy of the working tree; GitHub Actions not run, because nothing was
pushed).** These figures are historical; they are superseded by the final verification in "E-1 implementation".

| Run | Result |
| --- | --- |
| Fast tier | 25 tests passed (+ pre-flight), 0 FAIL (was 24 at K5) |
| Full tier | 38 tests passed (+ pre-flight), 0 FAIL, 5 BLOCKED and 2 REDUCED (the same accepted limitations; was 37 at K5) |
| Count tests (5 zones, run directly) | `import-integrity` 271/271, `import-adapter` 346/346, `same-results` 356/356, `import-engine-map` 276/276, `import-stage1` 616, `import-mapping` 976 |
| Golden v0.5 and v0.6.0 | 10/10 each, in 5 time zones (unchanged) |
| Tag-4 guard on the working tree | 12 passed, 0 failed; 102 PENDING (K6: 100; plus the new test and its checksum line; the changed `test-import-adapter.js` line stays one entry) |
| `check-protection` | 434/0 |
| `refcalc.py` | unchanged (line 346 hash `be698a42…` matches the file) |

### E-1 — direct-upload scrap (original proposal; IMPLEMENTED 15 Nov 2026 in the working tree, see "E-1 implementation" below)

- **Reproduced.** On direct Northstar:
  - one blank `Scrap_Factor_Pct` cell gives 2 NaN values and the engine's existing "Missing values in Scrap_Factor_Pct" warning;
  - an empty column makes all 50 orders "Material shortage", with 400 NaN values and "Stock held with no demand".
- **Why the adapter cannot fix it:** the direct route never passes through the adapter.
- **Proposed change (`calculations.js` only):**
  - lines 116 and 185 use `sc(b)` instead of `b.Scrap_Factor_Pct`, where `sc` returns the value when it is a finite number,
    **0 when the cell is empty** (undefined, null or ""), and NaN for any other text;
  - a line with NaN scrap makes its order "Insufficient information" (the existing `miss` path) and is left out of material
    usage, never treated as 0;
  - line 68 adds a High warning: "Scrap missing on N BOM lines: 0% assumed in material use and feasibility", and
    "Scrap not readable on N lines".
- **Results that would change:** only direct uploads with empty or text scrap cells. Golden v0.5, v0.6.0 and confidence v0.7
  have none, so they are expected to be byte-identical; this must be proven.
- **Tests:** direct workbooks with one blank cell, an empty column, a text value, explicit 0 and valid values; all goldens and
  snapshots; and the same scenarios through the adapter, to prove both routes agree.
- *(Historical, before E-1 was implemented:)* **Until E-1 is approved and implemented:** the import route is corrected, but **the direct-upload route still produces NaN
  and false shortages when scrap cells are blank.**
- **Interaction with K7's invalid-scrap handling (found in the K7 verification, 15 Nov 2026).** K7 leaves an invalid scrap
  line (a value Stage 1 could not read) as an empty cell in the Engine View. E-1 makes the engine read an empty cell as
  "missing, 0% assumed". With E-1 alone, the engine would therefore calculate those lines at 0% and its released data-quality
  list would call them "Scrap missing … 0% assumed", although the value was unreadable. The gate would still withhold every
  dependent result (it works from the adapter's declaration), so no number would be wrong, but the released warning would
  mislead. **E-1 therefore needs a matching adapter change:** an invalid line gets a text marker in its Engine View cell, so the
  engine reports it as "not readable" and never assumes 0%.
- **Second direct-route defect found in the verification (before E-1).** A scrap value stored as text in the workbook (for
  example "0.02") was not converted, and `1 + "0.02"` makes the text "10.02", so the engine silently used 1,002% scrap: on
  Northstar, RM001's estimated average monthly use went from 386.38 to 1,909.77 with no warning. *(E-1 corrects the silent
  misreading: such text is now "not readable", left out and warned. It does not convert it, so the routes still differ: Stage 1
  reads the same text as 0.02. See "E-1 implementation".)*

### K7 verification corrections (15 Nov 2026; owner Approval 1; working tree, NOT committed)

> **Correction (15 Nov 2026, T5 review finding C2):** "working tree, NOT committed" was true when written. These corrections were committed with K7 in `d33c105` (15 Nov 2026).

Authority: the owner's approval of 15 Nov 2026 ("Approval 1 — K7 test and documentation corrections"), following the
independent K7 verification. Test and documentation changes only: no change to `adapter.js`, `result-gate.js`, the engine,
Stage 1, fixtures, golden results or any approved checksum line.

**`tests/test-import-integrity.js`** (65 assertions per zone; was 54):
- **No crash can hide an assertion.** Every assertion's condition is a function: an exception inside it is a named FAIL saying
  what threw. Each block's set-up code is guarded (a set-up failure is a named FAIL for that block), set-up values that read
  gated results are computed safely, and a final **completeness** assertion fails if any of the expected assertions did not run.
- **I0 (new):** the gate accepts the adapter's own specification for both Package 01 runs (refused = FAIL). M2 is now a named
  failure.
- **I11 production performance (new, M12):** every `result.pr` entry of a production-blocked product (P0005) is withheld
  (`ITEM_WITHHELD: production …`), and every other entry equals the engine output.
- **Scheduled receipts (2 new, M13b):** with purchasing blocked for the whole dataset, `result.sched` is withheld
  (`ANALYSIS_PURCHASING_BLOCKED`), and with production blocked instead it is released unchanged. With no purchase-order file it is
  labelled "purchasing analysis not available", not as a production result.
- **R7 (1 new):** Infinity and −Infinity are withheld (`NON_FINITE_VALUE`) as well as NaN, and the neighbouring values are
  released unchanged.
- **S8–S12 split (2 → 5 assertions):** S8 production requirement (+ q × Qty_Per × scrap per short material); S9 material
  requirement (a single-line component's usage × (1 + scrap)); S10 shortage (same materials short, same availability dates);
  S11 status; S12 delay.
- **S16, S17 (new; the scrap fallbacks):**
  - S16: with no Stage 1 issue list, a blank scrap cell is invalid (never assumed 0%) and its orders are withheld;
  - S17: a BOM named from two files is refused by Stage 1 itself (`MULTI_SOURCE`, "Must fix"), so the adapter branch is a
    second line of defence. Given such a mapping anyway, the adapter treats a blank as invalid and the gate withholds its orders.

**`tests/test-import-adapter.js` case 12:** also asserts that P2's released record has exactly the engine's fields (none added
or removed), restoring the property the old `eq()` check had. The count is unchanged (69 per zone, 346).

**Registration:** `accepted-results.json` `import-integrity` 271 → **326** (working-tree values; see the precision note under K7
"Tests"). The two pending checksum lines (both test files) are updated. No approved line changes, and `check-protection` stays 434 (no new protected file).

**Mutation matrix re-run** (the same 18 mutations; each alone in a fresh throwaway copy, UTC). The integrity counts below are
per zone, out of 65:

| # | Safeguard switched off | Integrity test | Other tests |
| --- | --- | --- | --- |
| M1 | exclusion | 20 named failures, no crash | all pass |
| M2 | excluded items' BOM rows dropped | 14 named failures (I0 first), no crash | all pass |
| M2b | M2 plus matching dependants | 10 named failures | all pass |
| M3 | invalid scrap treated as 0 | 5 | all pass |
| M4 | missing column treated as blank | 1 (S1) | all pass |
| M5 | components of excluded parents | 5 | all pass |
| M6 | shared pool | 2 | all pass |
| M7 | group rules | 7 | adapter case 12 fails |
| M8 | suppliers | 2 | all pass |
| M9 | cross-check | 6 | all pass |
| M10 | `sku` field name | 8 | all pass |
| M11 | `fcm` / `fcc` | 1 | all pass |
| M12 | production performance | **1 (I11 production performance); survived before** | all pass |
| M13 | scheduled-receipt gating | 1 | all pass |
| M13b | receipts filed under production | **2 (both sched assertions); survived before** | all pass |
| M14 | non-finite safety net | 2 (R7 NaN, R7 Infinity) | all pass |
| M15 | general disclosure | 8, no crash | all pass |
| M16 | silent scrap assumption | 4 | all pass |

Every mutation is detected by named assertions and none crashes the test (every run reports all 65). The other tests are
`import-adapter`, `same-results` and `import-engine-map`. Limits:
- the 18 mutations are a chosen set, not an exhaustive one;
- the tests and the code have the same author, so this shows that the tests are sensitive, not that the code is independently
  correct.

### E-1 implementation (15 Nov 2026; owner approval after review of the diff; working tree, NOT committed)

> **Correction (15 Nov 2026, T5 review finding C2):** "working tree, NOT committed" was true when written. E-1 was committed with K7 in `d33c105` (15 Nov 2026).

Authority: the owner's "E-1 Implementation Authorisation" of 15 Nov 2026. Developed in a throwaway copy, then transferred. Not
changed: `engine-workbook.js`, `result-gate.js`, Stage 1, fixtures, snapshots, workflows, `refcalc.py` and every approved
checksum line.

**`js/calculations.js` (engine; 3 places):**
- **Data-quality checks (after the existing "Scrap outside 0–1" check):** a scrap cell is *missing* when it is empty, holds only
  spaces, or the column is absent; it is *unreadable* when it holds any other non-number (text such as "abc", "5%" or "0.02").
  Two new High warnings:
  - "Scrap missing on N BOM line(s): 0% assumed in material use and feasibility";
  - "Scrap not readable on N BOM line(s): not converted and not assumed. Those lines are left out of material use, so material
    usage may be understated and excess stock overstated. Affected materials: … Do not rely on the usage or excess-stock
    figures of these materials until the source data is corrected. Production orders that need these lines are 'Insufficient
    information'". The materials are listed in full and sorted. As for every engine warning, the line list (`ex`) shows the
    first 6 lines.
- **Material usage (line 116 at `b5e17eb`, line 120 after E-1) and feasibility (line 185, now 189):** a finite number is used exactly as before; a missing value is 0; an
  unreadable value leaves the line out of material usage, and its order becomes "Insufficient information" (the existing
  missing-data path). Never 0 and never NaN.
- **Unchanged:** a numeric value outside 0–1 (for example 1.5) is used as before, with the existing High warning. Nothing is
  converted, clamped or normalised.

**`js/import/adapter.js` (AD2 behaviour change):** an invalid scrap line now carries the text `SCRAP_UNREADABLE` in its Engine
View cell instead of a blank. Without it, the E-1 engine would read the blank as "missing, 0% assumed". `engine-workbook.js`
writes numbers only, so the marker is placed after the build. Hard check: if the BOM sheet does not hold exactly one data row per
BOM line, the adapter refuses (`ADAPTER_INTERNAL`) rather than guess. The constant is exported (`CGImport.adapter.SCRAP_UNREADABLE`).

**Test-specification change (not by itself a count change):**
- S6 ("abc", "1.5") and S7 (mixed lines) previously expected **no Engine View value** for an invalid line. They now expect
  `SCRAP_UNREADABLE`.
- S6 also asserts that the engine marks the product's orders "Insufficient information" and reports "Scrap not readable",
  never "Scrap missing".
- These edits change what two existing assertions expect. They do not add assertions.

**New assertions (12 per zone; `import-integrity` 65 → 77 per zone, 326 → 386 accepted in the working tree; against `b5e17eb`
the entry is new, at 386).** 386 = the same 77 assertions run in each
of 5 time zones + 1 cross-zone identity check. It is 77 distinct assertions, not 386 independent tests.

1. **Eight scrap cases, direct and import routes** (Northstar BOM line 1, FG001/RM001, true scrap 0.02; RM001 = its annual
   usage; FG001 has one order):

| Case | Direct: RM001 usage / FG001 order / scrap warning | Import: RM001 usage / FG001 order / gate | Routes |
| --- | --- | --- | --- |
| 1 valid 0.02 | 4,636.6 / shortage, ~23d / none | 4,636.6 / shortage, ~23d / complete | same |
| 2 explicit 0 | 4,596.0 / shortage, ~23d / none | 4,596.0 / shortage, ~23d / complete | same |
| 3 blank cell | 4,596.0 / shortage, ~23d / "Scrap missing on 1" | the same / restricted (1 assumed, SCRAP_ASSUMED_ZERO) | same |
| 4 column missing | 4,521.3 (= all-0% run) / shortage, ~23d / "Scrap missing on 200" | the same / restricted (200 assumed) | same |
| 5 "abc" | 2,564.8 / Insufficient information / "Scrap not readable on 1" (names RM001) | the same / restricted; order withheld (SCRAP_INVALID) | same |
| 6 "0.02" stored as text | 2,564.8 / Insufficient information / "Scrap not readable on 1" | 4,636.6 / shortage, ~23d / complete | **differ (known)** |
| 7 1.5 | 7,642.7 / shortage, ~23d / existing "Scrap outside 0–1" | 2,564.8 / Insufficient information / restricted; withheld | **differ (known)** |
| 8 whitespace only | 4,596.0 / shortage, ~23d / "Scrap missing on 1" | the same / restricted (1 assumed) | same |

   No case releases NaN or Infinity on either route (direct engine output; import gated result). "Same" means identical
   feasibility (every order's status and delay) and identical material usage and severity, compared field by field. The two
   differences are asserted as differences.

2. **Incomplete-usage warning** (direct route):
   - 3 unreadable lines on 2 materials (RM001 twice, RM014 once) give "Scrap not readable on 3 BOM line(s)", name exactly
     "RM001, RM014", and list the 3 lines;
   - one unreadable line names only RM001;
   - there is no such warning for valid or blank values;
   - the import route discloses the same line through the gate (`disclosures.invalid`), and its engine warning names RM001 too.
3. **Marker placement:**
   - The Package 01 BOM sheet has a header row plus 142 data rows: `report.rows` = 142 = the number of BOM lines, so the count
     excludes the header.
   - Three invalid lines (first, middle and last; source rows 2, 72 and 143) carry `SCRAP_UNREADABLE` in Engine View rows 1,
     71 and 142. The marker appears nowhere else in the sheet.
   - The header and every other line (parent, component and scrap) are unchanged.
4. **Gate, complete route:**
   - The adapter receives "abc" and the Engine View holds the literal marker.
   - The engine reports the line as not readable and marks P0001's orders "Insufficient information".
   - The gate withholds those orders (`ORDER_WITHHELD: SCRAP_INVALID P0001/M0064`) and M0064's material and purchasing results,
     and keeps its stock.
   - The disclosure names the line, row 4 and the value "abc".
5. **Gate predicates, independent of the adapter's declaration** (R1, `result-gate.js` lines 121–122):
   - a line holding the marker that the specification does not declare invalid is refused (nothing released, so no dependent
     result can be released);
   - a declared-invalid line holding a number is refused.
   - Note: the gate's withholding itself (R2, R3) is driven by the declaration; the gate recognises the marker only through
     these two R1 predicates.

**BOM row order is a contract** (commit review, 15 Nov 2026; owner decision (b): recorded, not code-checked).
- **Preserved today.** `js/import/engine-workbook.js`, `build()`:
  - line 101 filters rows on the sheet's `select`. The BOM sheet has none (`engine-map.js` line 36), so every row is kept, in
    order;
  - lines 105–110 write row `ri` of `ds.bom` at sheet row `ri + 1`;
  - lines 113–118 only report duplicate keys.
  - There is no sort, grouping or dedupe. The adapter's marker position (`r: i + 1`) relies on this.
- **If a future change reordered the rows**, the row-count check would still pass. The marker would land on another line's
  row, and the invalid line's own cell would be blank, which the engine reads as "missing, 0%".
- **Runtime protection: R1.** The line that received the marker holds text, but the specification does not declare it
  invalid, so the gate refuses the whole result ("… has no usable scrap value and is not declared invalid") and releases
  nothing.
  - Demonstrated: rows 3 and 4 swapped, Package 01 with "abc" on line 3 → refused, nothing released.
  - The refusal names the line that received the marker, not the invalid line.
  - A swap among invalid lines only is harmless, because every invalid line still carries the marker.
- **Existing test coverage (of the tested mutation, not a guarantee).** "E-1 marker placement" compares every Engine View BOM row
  of its test case (Package 01) with its canonical line. The one row-reordering mutation tested, **Mperm** (`engine-workbook.js`
  swaps BOM rows 3 and 4), is detected by 6 named `import-integrity` failures (S6 ×2, S7, "E-1 marker placement", "E-1 complete
  route", "E-1 gate predicates"), with all 77 assertions running. `same-results` (15 assertions) and `import-engine-map` (1) fail
  as well. These tests cover that mutation on these data sets. They do not guarantee that every possible future change to the
  workbook builder would be detected; the run-time protection for that is R1, above.
- **Owner decision (option b):** recorded as a contract, not code-checked. Option (a) (adapter read-back of each marked row's
  parent and component) was considered and rejected for this round; see K7 commit-gate review notes (15 Nov 2026) for the
  comparison and the note that (a) would require hardening the S7 set-up line.

**The two known route differences (deliberate in E-1; owner decisions for Stage 3):**
- **"0.02" stored as text in a workbook cell.**
  - Direct route: unreadable, not converted; the line is left out and warned.
  - Import route: Stage 1 reads the same text as the number 0.02.
  - Before E-1, the direct route read this as 1,002% scrap (`1 + "0.02"` = "10.02"), with no warning.
  - E-1 deliberately adds no general text-to-number conversion.
- **1.5 (outside 0–1).**
  - Direct route: used as 150%, exactly as before, with the existing High warning.
  - Import route: Stage 1 rejects it, and the line is invalid and withheld.
  - E-1 does not resolve this policy.
- No test claims unconditional direct/import parity.

**Direct-route limitation (disclosed, not removed).** An unreadable line is left out of material usage, so that material's usage
is understated and its excess overstated (case 5: RM001 2,564.8 against 4,636.6). The direct route has no result gate, so these
figures are still shown. The High warning names the materials and says not to rely on their usage or excess figures. The import
route withholds them.

**Engine results unchanged for clean data.** All 17 fixture workbooks (`tests/fixtures/*/*.xlsx`) give byte-identical engine
output with and without E-1. Golden v0.5, v0.6.0 and confidence v0.7 pass at their accepted counts.

**Mutation matrix with E-1** (24 mutations: 23 from the E-1 verification plus Mperm from the commit review; final run 15 Nov 2026, each
alone in a fresh throwaway copy made from the working tree, UTC). The counts are
failed `import-integrity` assertions out of 77.

| # | Safeguard switched off | Failed |
| --- | --- | --- |
| M1–M16, M2b, M13b | the 18 of the verification matrix (M2 and M2b re-anchored to the E-1 adapter text, same edit) | M1 20, M2 14, M2b 10, M3 11, M4 2, M5 5, M6 2, M7 7 (+ adapter case 12), M8 2, M9 7, M10 11, M11 1, M12 1, M13 1, M13b 2, M14 2, M15 9, M16 7 |
| Mrow | marker row offset removed (`r: i + 1` → `r: i`) | 11, including "E-1 marker placement" |
| Mgate | R1 does not count a text value as unusable | 1: "E-1 gate predicates" |
| Mgate2 (extra) | R3 does not withhold orders on invalid lines | 1: "E-1 complete route" |
| Mmat (extra) | warning names every material | 1: "E-1 incomplete-usage warning" |
| Mzero (extra) | engine feasibility uses 0% for an unreadable line | 4 (S6 ×2, case 5, complete route) |
| Mperm (commit review) | `engine-workbook.js` swaps BOM rows 3 and 4 | 6 (see "BOM row order is a contract"); `same-results` and `import-engine-map` fail too |

All 24 are detected by named assertions. None crashes the test, and every run reports all 77 assertions. `import-adapter`,
`same-results` and `import-engine-map` pass in every run except M7 (adapter case 12) and Mperm. Limits: this is a chosen set of mutations, not an exhaustive
one, and the tests and the code have the same author.

**Final verification before the K7 commit (15 Nov 2026; throwaway copies of the final working tree; local only).**

| Check | Result |
| --- | --- |
| Fast tier | 25 tests passed (+ pre-flight), 0 FAIL |
| Full tier | 38 tests passed (+ pre-flight), 0 FAIL; 5 BLOCKED and 2 REDUCED (the same accepted limitations; not full coverage) |
| Count tests (5 zones) | `import-integrity` 386, `import-adapter` 346, `same-results` 356, `import-engine-map` 276, `import-stage1` 616, `import-mapping` 976 |
| Golden and snapshots | golden v0.5 10/10 and v0.6.0 10/10, confidence snapshot v0.7 51/51, in 5 zones; all 17 fixture workbooks give byte-identical engine output to the engine at `b5e17eb` |
| Protection | `check-protection` 434/0; Tag-4 guard 12/0 with 102 PENDING; all 339 approved Tag-4 `file`/`ref` lines unchanged; `refcalc.py` hash `be698a42…` unchanged |
| Mutations | 24/24 detected by named assertions, all 77 assertions run, no crash (table above) |

These runs used the final code and tests. The only file edited after them is this record, which no test reads. GitHub Actions
runs after the push; its result is reported to the owner, not recorded here. No Android device testing was performed.

### What the T5 acceptance record must state (from K7)

- The import-adapter contract changed (AD1 → AD2: exclusions, scrap classification). The result-gate contract changed
  (RG1 → RG2, rules R1–R8). Case 12 was revised to reflect the new dependency behaviour.
- **L3:** Stage 1's exact unit matching ("EA" is not "each") now removes such an item from the whole analysis (F18: M0001). The
  rule is unchanged; a unit-synonym table would be a separate Stage 1 decision.
- **L7:** a bare scrap number is a fraction: "0.5" means 50% and "1" means 100% (write "0.5%" for half a percent). Unchanged.
- **E-1:** implemented with its adapter marker (see "E-1 implementation"): an engine change to `calculations.js` lines 68,
  116 and 185 as numbered at `b5e17eb` (after the change: new checks on lines 69–72, usage line 120, feasibility line 189), and an AD2 behaviour change (invalid scrap lines carry `SCRAP_UNREADABLE` in the Engine View).
- **Known route differences left open by E-1 (owner decisions for Stage 3):** a number stored as text ("0.02") and an
  out-of-range number (1.5); see "E-1 implementation".
- **Test evidence:** report `import-integrity` as 77 assertions run in 5 time zones (386 with the identity check), and cite the
  corrected mutation evidence above, not the original K7 claim.
- **B14:** bought-and-sold and made-not-sold items remain a deferred capability (refused, not implemented). HIGH for Stage 3
  planning.
- **Feasibility pool (deferred; pre-existing, unchanged by E-1).** Orders marked "Insufficient information" (and orders with
  a material shortage) reserve none of their materials from the shared pool, including lines that could be read
  (`calculations.js` line 193 applies an order's needs only when it is feasible).
  - Later orders that share those materials may therefore show more material available than they would if the order's needs
    were fully known. On the import route R3 withholds such later orders; on the direct route they are shown.
  - The visible Production feasibility table can nevertheless list an insufficient order's short readable materials in its
    "Blocking materials" column, although nothing is reserved for it. Example: Northstar with FG001's last BOM line unreadable
    makes SIM14 "Insufficient information", and it still lists RM001, RM014 and RM027 as short.
  - The order's material-use figure (the engine's internal per-order list `use`) is not displayed and is not a released result;
    only the short lines (`bl`) are shown.
  - **MEDIUM** (owner, 15 Nov 2026): a display and reservation distinction for Stage 3 to consider. The feasibility policy is not
    changed in K7.
- **Negative scrap (deferred; pre-existing, unchanged by E-1). HIGH for Stage 3.**
  - On the direct route, negative finite scrap values are used at face value (with the High "Scrap outside 0–1" warning)
    rather than rejected or clamped.
  - At −1 or below, that line's material requirement becomes zero or negative, and this propagates into usage, cover,
    excess, MRP and feasibility. For example, at −1.5 RM001's annual usage falls from 4,636.6 to 1,549.2.
  - On the import route, Stage 1's existing validation rejects such values (`FIELD_BLANKED`), so the line is invalid and its
    results are withheld.
  - Required: an owner policy decision on out-of-range scrap for both routes (the same decision as 1.5). The behaviour is not
    changed in K7.
- **Direct-route incomplete-usage warning:** keep it prominent in the Stage 3 presentation. The understated usage and
  overstated excess of the named materials are shown on the direct route (the import route withholds them).
- **Stage 3 design guidance** (not built in K7):
  - show `gated.disclosures` above the totals;
  - include the unit-conversion hint;
  - mark figures that changed because of exclusions;
  - show clearly which figures are withheld, caveated or based on an assumption.

### New findings outside K7 (recorded, not changed)

- **N1 — shortages with negative delays (engine, MEDIUM).** Some "Material shortage" orders show a negative delay (for
  example "~-6d"). When no receipt covers the need, the engine measures the delay to a new order placed today
  (`calculations.js` lines 187–188 at `b5e17eb`, 191–192 after E-1); if that order would arrive before the order's start, the delay is negative, so the order
  is shown as a shortage with a meaningless delay. This affects the direct route too, and the golden results record it.
- **N2 — R3 is conservative.** A withheld order makes every later order that shares a material with it withheld. This can
  remove feasibility for many orders in a dataset with long shared-material chains. That is safer than releasing a pool
  result that is not known.
- **N3 — partial blocks remove group totals and ABC.** One demand-blocked product withholds ABC and the excess, shortage and
  annual-value totals for all finished goods (F03: 24 of 40 blocked). Labelled subtotals over the releasable items are a
  possible Stage 3 presentation feature, for the owner to decide.

### Status

> **Correction (15 Nov 2026, T5 review finding C2):** this Status is historical (written before the K7 commit). It is superseded by "Stage 2 status after K7, T5, Tag-5 and Commit C" at the end of this record.


The K7 changes are in the working tree only: not committed, pushed or tagged. Stage 2 is not complete. Outstanding:
1. the owner's review of K7, and a commit if approved;
2. the owner's review of E-1, which is implemented in the working tree with the K7 verification corrections (not
   committed); the two known scrap route differences ("0.02" as text, 1.5) stay open owner decisions for Stage 3;
3. the T5 switching commit (the Package 01 label and the hash inventory recalculated after K7);
4. Tag-5, created by the owner;
5. the owner's final acceptance.

## Stage 2 status after K7, T5, Tag-5 and Commit C (15 Nov 2026; T5 review finding C2)

*Added by Claude under the owner's authorisation "Resolve T5 Review Findings C1, C2 and C3" (15 Nov 2026). Earlier sections
are kept as written; dated correction notes mark the statements this section supersedes. Facts below were checked against Git
history and GitHub on 15 Nov 2026; no test was run for this entry.*

**What happened to the five outstanding items in the historical Status above:**

| # | Item | Position now | Evidence |
|---|---|---|---|
| 1 | K7 reviewed and committed | **Done.** Commit `d33c10563e3da0bb5e1976418afa77992c1b727d`, 8 files: `js/calculations.js`, `js/import/adapter.js`, `js/import/result-gate.js`, `tests/test-import-integrity.js` (new, 386 checks), `tests/test-import-adapter.js`, `tests/accepted-results.json`, `tests/checksums.txt`, this record | `git show --stat d33c105`; GitHub Actions run 43672617538 on `d33c105`: success, **fast tier only**, guard against Tag-4 |
| 2 | E-1 reviewed and committed | **Done**, in the same commit `d33c105`, with the K7 verification corrections | as item 1 |
| 3 | T5 switching commit | **Done.** `f0e81bb30521a4e798005b0a51b4a531b807441e`, nine files (Package 01 label, protection updates, Proof B reading the supplied files, Tag-5 switch, README) | `V07-TEST-RECORD.md`, Tag-5 Part A and the two later Tag-5 sections. Full tier run **locally, before the tag** (0 FAIL, 1 expected ERROR, 5 BLOCKED, 2 REDUCED); not independently reproduced |
| 4 | Tag-5 created by the owner | **Done.** `v0.7-tests-approved-5` → `f0e81bb`, created by the owner through GitHub Releases | post-tag GitHub Actions run 43680939374, attempt 2: success, guard 12/0 against Tag-5, **fast tier only** |
| 5 | The owner's final acceptance of Stage 2 | **Given, 15 Nov 2026** (updated: previously "**Not given. Open.**") | "Stage 2 — owner acceptance" below |

Commit C (`ca7710b`) recorded the Tag-5 creation, the post-tag CI run and nine corrections in `V07-TEST-RECORD.md` only.

**Reconciling the Commit C requirement.** The owner's T5 preparation brief required Commit C to include "the agreed
completion-status update and corrected Proof B descriptive wording", and said Stage 2 is not closed until Tag-5, green CI
and Commit C are all verified. The later Tag-5 finalisation instructions limited Commit C to `V07-TEST-RECORD.md`, so
Commit C did not update this record. That status update and Proof B wording are made here instead, in a separate
documentation-only commit after Commit C. Commit C itself is unchanged.

**Status, kept separate:**
- **Implementation completed:** yes: K1–K7, E-1 and T5.
- **Committed and pushed:** yes: K1–K5 (`e7b3d2f`, `01c565f`), K6 (`b5e17eb`), K7 (`d33c105`), T5 (`f0e81bb`), Commit C
  (`ca7710b`) and the status commit `f08a832`, on `development/v0.7` only.
- **Tests:** passed **with limitations**. GitHub Actions ran the fast tier only, before and after Tag-5. The full tier was
  run locally before the tag, with 5 BLOCKED and 2 REDUCED tests. Its raw logs were not kept in the repository.
- **T5:** technically finalised (committed, tagged, post-tag CI green on the fast tier). It was formally closed by the owner's acceptance, recorded in commit
  `6ee4409ba6576e14d2019e2ba7f1998793a56c22` (`tests/V07-TEST-RECORD.md`, "Tag-5 — owner acceptance of T5").
  *(Updated 15 Nov 2026: this sentence previously read "It has not been formally closed by the owner.")* The closure conditions from Claude's subsequent review of T5 include owner or human sign-off; that review was not independent, because Claude had previously taken part in the work it reviewed.
- **Stage 2 acceptance criteria:** of the three conditions in the T5 preparation brief, Tag-5 is verified and CI is green
  (fast tier only). Commit C is verified, but it did not contain the completion-status update and Proof B wording the brief
  required of it; those were made later, in `f08a832`. Whether that satisfies the acceptance criteria is the owner's decision.
  *(Corrected in the provenance review, 15 Nov 2026: this point originally said the three conditions "are met". That overstated the Commit C condition.)*
- **Stage 2 formally completed:** **no.** It needs the owner's final acceptance (item 5). This record does not declare
  Stage 2 complete.
  *(Updated 15 Nov 2026: the owner has since accepted Stage 2, with the limitations and Stage 3 gates in "Stage 2 — owner
  acceptance" below.)*

**Still open, not reopened here:** the two scrap route differences ("0.02" as text; 1.5) and the other items left to the
owner for Stage 3 in K7 and E-1; the authorisation of the `dataset.csv` change, classified in `V07-TEST-RECORD.md`
(Commit C section) as inferred by reference across two documents and not independently reviewed. Stage 3 is not started.

Entry made by Claude. Recorded in commit `f08a832`, whose Git commit time is 2026-11-15 14:32:54 UTC.
*(Corrected in the provenance review, 15 Nov 2026: this line originally read "Entry made by Claude, 2026-11-15 14:55 UTC". That time was typed by hand and never checked; it is later than the commit that contains it, so it is not the time the entry was made.)*

## Stage 2 — owner acceptance (15 Nov 2026)

*Recorded by Claude on the owner's explicit instruction "Final Authorisation — Stage 2 Owner Acceptance" (15 Nov 2026). The
owner approved this statement. This section records the owner's acceptance; it changes no code, test, fixture, checksum or
accepted result.*

**Owner statement on Universal Data Import v1 Stage 2 (accepted):**

I accept Stage 2 (K0–K7, E-1 and the T5 baseline) with the following limitations knowingly in place:

1. **Durable evidence is fast-tier CI.** GitHub Actions ran the fast tier only. That includes every Stage 2 test at its full
   accepted count: `import-adapter` 346, `same-results` 356 and `import-integrity` 386, each of which covers five time zones
   internally. It also includes `import-engine-map` 276, `import-stage1` 616, `import-mapping` 976, golden v0.5 and v0.6.0
   (10/10 each), the confidence snapshot 51/51 and `check-protection` 434. **Proof C's five-zone coverage exists only in the
   temporary local pre-Tag-5 full-tier run.** Durable CI runs the golden and confidence snapshots in UTC only, so a
   timezone-dependent regression in those snapshots would not be caught by the durable CI evidence.
2. **The full tier was run locally before Tag-5** (37 tests passed plus pre-flight, 0 FAIL, 1 expected ERROR). Its temporary
   logs were not kept and cannot be reproduced from them.
3. **Five BLOCKED tests** (`test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility`, `phase2-comparison`,
   `test-paging-chrome`) **and two REDUCED tests** (`test-phase1`, `test-uom`) are older engine tests, not Stage 2 tests. They
   are not Stage 2 failures, but they limit confidence in the engine as a whole.
4. **The 104 baseline items accepted at Tag-5 are protected against change, not functionally validated.**
5. **A known false warning ships with Stage 2 (MEDIUM).** Under Option D, an item with negative stock at one location can show
   a false High warning, "Allocated exceeds on-hand", which also lowers its confidence.
6. **The E-1 coverage gap.** The golden snapshots contain no missing or unreadable scrap cases; E-1's behaviour is tested only
   by the integrity test.
7. **Manufacturer-only scope.** Bought-for-resale items are refused under B14, so wholesalers, distributors and retailers cannot
   be analysed through Universal Import.
8. **Fidelity, not correctness.** Stage 2 proves the import route gives the same results as a direct upload, on synthetic test
   data. It does not prove the engine's results are correct; known engine issues (for example negative delays on shortages)
   are reproduced faithfully.

The difference register (DR-1 to DR-7) was accepted by delegation in K6, on the strength of Claude's verification, and
ratified by me on 15 November 2026. Claude's reviews of Stage 2 were not independent professional assurance: Claude did the
work it reviewed.

T5's own acceptance (commit 6ee4409) stands; this acceptance incorporates it rather than re-opening it.

**This acceptance does not mean Stage 3 is ready, or that the product is ready for production or for customers.** Before
Stage 3 planning, these gates must be decided:
- whether to revisit B14's refusal of wholesale and resale items;
- negative and out-of-range scrap handling, on both routes;
- `refcalc.py` still using Option A for negative stock, inconsistent with the engine's Option D;
- the false "Allocated exceeds on-hand" warning;
- the three remaining route differences: a scrap value stored as text ("0.02"), an out-of-range scrap value (1.5), and the
  feasibility pool's "Blocking materials" display.

Stage 3 is not started. The time of this entry is the Git commit time of the commit that adds it.
