# Owner decisions on the Tag-6 change plan (recorded 22 Nov 2026)

Source: the owner's message of 22 Nov 2026, 02:40 (Europe/London), "APPROVE THE CONTROLLED CHANGE PLAN, subject to the
explicit decisions below", in reply to `plan/tag6-20261122` (`83a2e13`), `CHANGE-PLAN.md`. Recorded by Claude.

This approves the implementation scope only. It is **not** approval of Tag-6, the registry block, deployment or publication.

| ID | Decision |
|---|---|
| A1 | Approved as recommended (Option D): committed stock is never dead stock; new warning for fully allocated stock with no recorded demand |
| A2 | Approved as recommended (Option B): unknown allocation → stock class "Not Assessed" |
| **A3** | **Approved, as a departure from the owner's earlier preferred approach** (see below) |
| A4 | Approved and **load-bearing**: empty and whitespace-only text is missing; blank units are missing, not unrecognised. Its behaviour is not to be reversed or silently altered |
| A5 | Approved: no engine change; the remaining Willow differences are explained as methodology, A4 or A6 |
| **A6** | **Approved business-rule decision** (see below) |
| B1 | Approved (Option C view, export columns, negative on-hand flag) |
| B2 | Approved (ABC note) |
| B3 | Approved: D5, C-NUM and F-A1–F-A4 accepted as implemented |
| B4 | Approved: D1–D4 accepted as recorded, with the noted uncertainty about the original wording and the D4 safeguards |
| B5 | Approved: document population s.d., the 90-day excess rule, lead-time provenance, GBP only and rounding |
| E-1 | Approved: X1 partial totals in the three places |
| E-9 | Approved: zero-demand test cases |
| E-13 | Approved: note on the dangling §9 placeholder |
| R2, G1, E-6, E-7 | **Deferred** as proposed (paging proposal, guard diagnostics, F-A2 tolerance, lead-time fixture) |
| Tag-6, deployment, publication, guard | Not approved; separate decisions. The guard is not to be weakened |

## A3: usable versus physical stock (owner-approved departure)

- **Earlier preferred approach (owner's brief, Option B):** where a valid usable figure exists, use it rather than physical stock, and flag wherever physical and usable disagree.
- **Approved resolution (Claude's recommendation, accepted):**
  1. Operational availability keeps using valid usable stock (already the case).
  2. Dead-stock assessment keeps the **max(physical, usable) − allocated** basis.
  3. A warning is raised when usable stock **exceeds** physical stock.
  4. Physical, usable, allocated and uncommitted quantities stay clearly visible: in the view's detail and in the export.
- **Why it differs:** a usable-only dead-stock basis would hide quarantined stock with no demand, the stock most likely to need writing off. Flagging every physical ≠ usable difference would warn on normal quarantine and inspection stock (noise).
- This is recorded as a departure; it is not described as the earlier preference.

## A6: missing demand months (owner-approved business rule)

**Rule:** a demand month with no usable demand evidence is **unknown, not zero**. Raw-material usage is aligned by calendar month,
and a month in which any parent product has no demand row is unknown for that material.

**Evidence:** Willow's `ing 017`.
- Its six parent products have no demand row in December 2025, April, May and June 2026: four of ten months. This was reproduced from the raw sheets (`verification-20261122/d6/13-ing017-raw-check.txt`).
- The old row-position method produced a false final-month value of 265.67.

**Impact on ing 017:**

| | Mean monthly usage | Calculated ROP | Verdict |
|---|---|---|---|
| Under the rule (six known months) | 2,111 | 2,429 | "Broadly aligned" |
| Before X1 | 1,957 | 2,890 | "Existing ROP insufficient" |

The workbook ROP is 2,083. The willow "reorder points too low" count goes from 4 to 3. Across Willow, 20 items have at least one unknown month.

**Consequence of the alternative (zero):** understated mean demand and false dips that inflate variability.
