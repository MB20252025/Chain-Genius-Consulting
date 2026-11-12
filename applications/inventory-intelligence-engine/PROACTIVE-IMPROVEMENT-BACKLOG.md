# Proactive improvement backlog: Supply Chain Intelligence Engine

## Purpose and authority

This backlog records potential improvements, issues and opportunities identified by Claude or the owner that are **not already
recorded** in another governance document. It does **not** authorise development work and it is not an approved development
plan. The approved roadmap and `M1-DESIGN.md` remain the controlling records (see `CLAUDE.md`, section 1).

**Nothing in this backlog is approved unless the entry cites the owner's explicit approval.**

- Claude may propose new entries or status changes in its task reports. Claude must not modify this file independently.
- Changes to this file, including status changes, are made only in documentation changes the owner has explicitly authorised.
- Completed, rejected and deferred entries are kept, with their history. They are never deleted.

## Statuses

| Status | Meaning |
| --- | --- |
| Identified | Noticed and recorded with initial evidence |
| Investigating | Being examined further (read-only) |
| Proposed | A specific solution has been put forward |
| Awaiting approval | Waiting for the owner's decision |
| Approved | The owner has approved it; the entry cites the approval |
| In development | Being implemented under that approval |
| Testing | Implemented; being verified |
| Completed | Done and verified; the entry cites the commit |
| Deferred | Postponed by the owner |
| Rejected | Not to be done; the reason is kept |

Identified, Investigating, Proposed and Awaiting approval grant **no** permission to implement anything.

## Cross-reference index (existing records: not repeated here)

| Topic | Where it is recorded | Note |
| --- | --- | --- |
| Lead-time no-evidence behaviour, source order, PO-history rule and small samples, lateness | `M1-DESIGN.md` "Decisions", open A1–A4 | Open decisions, not backlog items |
| Record identity, identical-duplicate rules, cross-file rule, reconciliation | `M1-DESIGN.md` open A5–A8 | Duplicate principles already decided are listed in "Decided" |
| Issue vocabulary, constant mapping, wide and title-row layouts | `M1-DESIGN.md` open A11–A13 | |
| Tag -4 | `M1-DESIGN.md` open A15 | |
| Three lead-time problems (H1, small samples, 7-day fallback) | `KNOWN-LIMITATIONS.md` entry 14 | Entry 14 was written before H1 was corrected in M1 pre-tag Commit 4 (`893e9a9`) and still says engine behaviour is unchanged. Small samples (Stage 4) and the 7-day fallback (A1) remain open |
| Duplicate stop-and-resolve not yet built | `KNOWN-LIMITATIONS.md` entry 15 | |
| v0.6 items: performance, tab switching, 15,000 items, Android, overdue POs in OTD, numeric-text quantities, snapshot coverage, modularisation | `OUTSTANDING-DECISIONS.md` items 3–10 | Historical v0.6 list; status not re-checked since v0.6 (see P-008). Its entries are not approved development work |
| Test statuses, accepted counts, PENDING items, evidence | `tests/V07-TEST-RECORD.md` | |
| Lead-time characterisation cases and TODOs | `tests/characterisation/README.md` | |

## Entry fields

Reference · Date identified · Area and files · Problem or opportunity · Evidence · Confirmed behaviour, suspected issue or
unverified opportunity · Priority (with reason) · Operational benefit · Commercial benefit · Recommended action · Testing ·
Dependencies and risks · Suggested stage · Status

## Entries

### P-001 — Characterisation test comments describe the pre-fix state
- **Identified:** 12 Nov 2026, during Commit 4.
- **Area:** `tests/characterisation/characterisation-lead-time-fallbacks.js`, H1 block.
- **Problem:** the four comment lines above the `CORRECTED(H1, Commit 4)` note still describe the pre-fix behaviour (lead time
  used = 32 d), while the current accepted assertions record 26 d. The CORRECTED note explains the transition.
- **Evidence:** the Commit 4 diff (`893e9a9`) changed the TODO and the two assertions only, as authorised.
- **Status of evidence:** confirmed.
- **Priority:** LOW. Comment wording only; no assertion or behaviour is affected.
- **Recommended action:** review the comments during an appropriate future test-documentation change. Any change to the test
  file must update its `tests/checksums.txt` line in the same commit.
- **Testing:** characterisation test 28/28 in five time zones; protection check.
- **Stage:** next authorised characterisation change.
- **Status:** Identified.

### P-002 — Workspace-only comparison workbooks
- **Identified:** 12 Nov 2026, during Commit 4.
- **Area:** comparison evidence for engine changes.
- **Problem:** the 22-workbook comparison used for Commit 4 cannot be rerun from a fresh clone. Five workbooks existed only in
  the working environment: `lt.xlsx`, `h-cases.xlsx` and three package-conversion workbooks (from packages 01, 03 and 04).
- **Known provenance:**
    - the H1 cases (`h-cases.xlsx` data) are rebuilt in memory by the Commit 3 characterisation test;
    - `lt.xlsx` has a generator script outside the repository;
    - the three package conversions were made by a temporary prototype script that is no longer available.
- **Status of evidence:** confirmed.
- **Priority:** MEDIUM. Future engine changes need repeatable comparison evidence.
- **Investigation required:**
    1. what inputs were used;
    2. which generation or conversion steps were performed;
    3. which steps can be reproduced from existing repository material;
    4. which steps need reconstruction;
    5. whether reproducible synthetic fixtures can give equivalent coverage.

  It is not established that all five workbooks can be reproduced, or that the Stage 2 import process will recreate them.
- **Constraints:** any replacement synthetic fixtures must be additive to existing coverage (`M1-DESIGN.md`, "Protected
  packages"), documented and separately authorised. No confidential business data.
- **Stage:** to be decided; probably alongside Stage 2.
- **Status:** Identified.

### P-003 — ML1 explanation wording
- **Identified:** 12 Nov 2026, during the Commit 4 verification.
- **Area:** `js/calculations.js` line 135, the lead-time basis text.
- **Problem:** for a PO-history lead time with 1–29 supplier POs, the text says "no supplier lateness added; supplier history is
  under 30 POs, so the lateness adjustment is an estimate". The two halves contradict each other.
- **Evidence:**
    - the phrase depends only on the supplier's PO count, not on whether lateness was added;
    - since Commit 4, ML1 (`h-cases`) shows it, and ML3–ML5 showed it before Commit 4;
    - it appears in none of the three protected snapshots.
- **Status of evidence:** confirmed wording inconsistency. Numbers are unaffected.
- **Priority:** LOW. Explanation text only, but it can mislead a reader.
- **Recommended action:** clarify the wording within the L3 boundary (decision A1). No calculation change.
- **Testing:** golden and confidence snapshots unchanged; a characterisation assertion on the text.
- **Stage:** Stage 4.
- **Status:** Identified.

### P-004 — Lead time from PO history is a supplier-wide average
- **Identified:** 12 Nov 2026, during the proactive engineering assessment.
- **Area:** `js/calculations.js` lines 118 and 131.
- **Behaviour:** when a material has no stated lead time and no supplier standard, its lead time is the **default supplier's**
  average order-to-receipt time across all that supplier's materials, not the material's own purchase-order history.
  Line 118 groups POs by `Supplier_ID`; line 131 uses `sup[m.Default_Supplier_ID]`.
- **Status:** **confirmed behaviour. Whether it is a defect remains an owner decision.**
- **Potential consequences:** if one supplier provides materials with widely differing lead times, a single supplier-wide
  average could:
    - make short-lead-time materials appear riskier than they are, prompting unnecessarily early purchasing and tying up cash;
    - make long-lead-time materials appear safer than they are, risking late replenishment and stockouts.
- **Limits of the evidence:**
    - the Northstar fixture does not exercise this pathway (all 100 materials have stated lead times);
    - the impact on other business data is unverified;
    - the correct business rule has not been decided by the owner.
- **Priority:** MEDIUM. A potential material effect on imported files without stated lead times; not yet shown on real data.
- **Recommended action:** investigate alongside A2/A3 in Stage 4. A characterisation test recording the current behaviour must
  precede any implementation change.
- **Status:** Identified.

### P-005 — Full-tier PASS count includes the pre-flight row
- **Identified:** 12 Nov 2026, during the Commit 4 verification.
- **Area:** `tests/run-all.sh` reporting (lines 91 and 138) and how results are recorded.
- **Problem:** the runner's PASS figure counts its pre-flight row, which is not a test. The Commit 4 full tier is accurately:
    - 40 distinct tests: 33 PASS, 5 BLOCKED, 2 REDUCED;
    - plus 1 pre-flight PASS row;
    - so 34 PASS rows when the pre-flight row is included.

  The Commit 3 record and commit message report "34 passed".
- **Status of evidence:** confirmed.
- **Priority:** LOW. Reporting clarity; no test result is wrong.
- **Recommended action:**
    - report results as "N tests passed (+ pre-flight)" (`CLAUDE.md`, section 5);
    - do not rewrite historical accepted records; any clarification of the record must be an append-only entry in a future,
      separately authorised documentation change;
    - `run-all.sh` is a guarded control file and is not to be changed for this.
- **Status:** Identified.

### P-006 — README out of date
- **Identified:** 12 Nov 2026.
- **Area:** `README.md`.
- **Problem:** it still describes the engine as v0.6 and does not list the current module structure (`js/engine/`,
  `js/import/`).
- **Status of evidence:** confirmed.
- **Priority:** LOW. A documentation review opportunity.
- **Recommended action:** review in a future authorised documentation change.
- **Status:** Identified.

### P-007 — D1–D23 decision text is outside the repository
- **Identified:** 12 Nov 2026.
- **Area:** governance traceability.
- **Problem:** the full text of D1–D23 exists only in the claude.ai document "M1 Final Design", not as a version-controlled
  repository document. `M1-DESIGN.md` refers to it, but future sessions may be unable to read it.
- **Status of evidence:** confirmed.
- **Priority:** MEDIUM. Decisions that govern the code are not stored or versioned with it.
- **Recommended action:** a future reconciliation should establish which decisions remain authoritative, which have been
  superseded and which need permanent repository documentation. No decision register is to be created, and no decision text
  copied, without separate authorisation.
- **Stage:** before Stage 2 is suggested.
- **Status:** Identified.

### P-008 — Review of the historical v0.6 decisions list
- **Identified:** 12 Nov 2026.
- **Area:** `OUTSTANDING-DECISIONS.md` (v0.6 candidate 4 final).
- **Proposal:** review items 3–10 to establish which are resolved, superseded, still open or now recorded elsewhere (for
  example, item 7 relates to decision D3 in M1). Then decide how the file should be marked.
- **Not implied:** this proposal does not make the old entries approved development work, and they are not copied into this
  backlog.
- **Priority:** LOW. Clarity of records.
- **Status:** Identified.
