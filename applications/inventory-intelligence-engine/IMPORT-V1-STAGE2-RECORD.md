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

## Difference register — pending review

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

## Not yet done (as recorded at K0; superseded by the sections below)

K1–K6 are planned but unauthorised:

- K1 — engine map (`js/import/engine-map.js`);
- K2 — cell writing (`js/import/engine-workbook.js`);
- K3 — adapter (`js/import/adapter.js`);
- K4 — result gate and statuses (`js/import/result-gate.js`; `reliabilityDetail()` in `validate.js`);
- K5 — proof harness, difference register and test registration;
- K6 — Stage 2 record of results and the implementation commit.

- K0 is the only authorised step.
- K1–K6 have not been authorised by the K0 brief.
- The approval of `reliabilityDetail()` is not permission to begin K4.
- No implementation work may begin until the owner explicitly authorises the next step.

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

## Status

- Stage 2 K3, K4 and K5 are implemented. **Stage 2 is not accepted**: the difference register and the items above await the
  owner's review.
- No Tag-5. Stage 3 has not started.
