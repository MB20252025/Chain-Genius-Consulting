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

## Not yet done

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
