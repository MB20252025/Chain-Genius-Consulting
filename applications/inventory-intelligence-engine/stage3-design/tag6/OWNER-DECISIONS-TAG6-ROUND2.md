# Owner decisions and confirmations, round 2 (recorded 22 Nov 2026)

Source: the owner's instruction "SCIE – Authorised Engineering Completion, Registry Reconciliation and Tag-6 Release
Preparation" (22 Nov 2026, 04:17 Europe/London). Recorded by Claude. It complements `OWNER-DECISIONS-TAG6.md`, which is
unchanged.

## Owner-completed human verification

| Field | Record |
|---|---|
| Who | the owner (not Claude) |
| Completion date | 22 November 2026 |
| Worksheet | `NORTHSTAR-HUMAN-CHECK-WORKSHEETS-v2-OWNER.md` (branch `human-checks/tag6-r3-owner-20261122`, `599750c`) |
| Candidate the worksheet was prepared for | `b1d2db9` |
| Checks | 1 FG001 safety stock and reorder point; 2 RM001 safety stock and reorder point; 3 total stock valuation; 4 RM004 MRP shortage and ordering calculations; 5 clean and faulty workbook ABC classification |
| Outcome (owner's statement) | **All five passed and produced the expected results, with no discrepancies reported by the owner.** |

This is human verification by the owner. It is separate from Claude's engineering tests. Claude did not perform it and
does not claim it as its own.

**Staleness guard.** The checks remain valid only while no later change alters a figure they cover. Every change after
`b1d2db9` is assessed against this in `stage3-design/tag6/IMPLEMENTATION-RECORD-R4.md`.

## A3: usable stock above physical stock (owner-approved Tag-6 decision)

- No usable-above-physical warning is introduced in Tag-6.
- The accepted Stage 2 B6 behaviour is preserved: negative stock at a location is clamped to 0 for usable stock, so usable can legitimately exceed physical; the importer's diagnostics are unchanged.
- Operational availability keeps using valid usable stock.
- Dead stock keeps max(physical, usable) − allocated.
- Physical, usable, allocated and uncommitted stay visible in the dead-stock presentation and the export.
- Not to be reopened unless new evidence shows a genuine integrity problem that the existing rules cannot handle.

## Other confirmations in the same instruction

- **D1–D4 provenance:** the recorded option labels D1(a), D2(a), D3(1) and D4 are authoritative. Their original full wording, and the D4 safeguards as originally worded, cannot be recovered from the repository. That gap is documented, not filled in.
- **The partial-total safeguards to preserve** are listed by the owner as:
  1. a visible partial flag for every consumer;
  2. excluded items and reasons exposed;
  3. partial never presented as complete;
  4. ABC and cumulative shares withheld where required;
  5. no eligible items → unavailable, not zero;
  6. consistent propagation through all consumers.
- **Defects A and B** (export NaN; Willow chart NaN points): authorised to fix, with regression tests.
- **The 50 registry items:** technical assessment delegated to Claude. ACCEPT means prepared for the Tag-6 block approval, not approved.
- **UoM:** blank and whitespace-only units are missing, not unrecognised (unchanged rule).
- **Deferred:** R2, G1, F-A2 tolerance (E-6), E-7, broader forecasting, major refactoring, new engines or dashboards, unrelated features.
- **Not authorised here:** Tag-6, deployment, publishing, changes to the live site.
