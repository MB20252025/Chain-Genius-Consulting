# Working rules for Claude: Supply Chain Intelligence Engine

**Scope.** This file applies only to the Supply Chain Intelligence Engine in this folder
(`applications/inventory-intelligence-engine/`). It does not apply to the consultancy website at the repository root or to any
other project in the repository.

**What this file is.** Practical working instructions that reinforce the existing governance. It records no decisions, and it
never overrides a more authoritative source listed below. Rules here are marked *[restated]* (already recorded elsewhere, with
the source), *[clarified]* (an existing practice written down) or *[new]*.

## 1. Authority and precedence

1. **The owner's explicit instruction for the current task.** Within the scope of that instruction, it takes priority.
2. **`M1-DESIGN.md`**: its requirements, agreed policies and recorded decisions ("Decisions": decided and open, A1–A15), and
   its references to decisions D1–D23.
   - The full text of D1–D23 lives in the separate claude.ai document "M1 Final Design". It is **not** a version-controlled
     repository document, and a future session may not be able to read it.
   - If a task depends on the precise wording of a D1–D23 decision and that text is not available, **stop and ask the owner**.
     Never invent, reconstruct or assume the content of an inaccessible decision.
3. **Repository test and evidence governance:**
   - `tests/V07-TEST-RECORD.md`: status meanings, exact counts, acceptance rules, test commands, PENDING items and the dated
     evidence trail.
   - `tests/README.md`: approved baseline tags, the files the guard protects, how CI uses the baseline, and the release procedure.
   - `tests/characterisation/README.md`: characterisation tests record existing behaviour, not necessarily correct behaviour.
4. **This file.**

Also relevant: `KNOWN-LIMITATIONS.md`, the owner's approved development roadmap (milestones M1–M6) and the decision and acceptance
records above.

If two authoritative sources appear to conflict, **stop and ask the owner** rather than choosing silently.

`PROACTIVE-IMPROVEMENT-BACKLOG.md` is a record of proposals only, not an approved development plan. Nothing in it is approved
unless the entry cites the owner's explicit approval.

## 2. Approval boundaries *[restated: the owner's per-task authorisations for M1 pre-tag Commits 1–4]*

Allowed without asking: reading and inspecting the repository, analysing code, investigating suspected problems, running existing
tests under the safeguards in section 4, comparing outputs, and drafting proposals, designs and acceptance criteria.

The owner's explicit approval is needed **before** changing or introducing any of the following:

- production calculations; business rules; expected results;
- golden snapshots or accepted baselines; tests and accepted evidence;
- import behaviour; data contracts and file formats; architecture and interfaces;
- features and refactoring; dependencies and external services; AI or API functionality; paid tools, services or credits;
- the roadmap or development scope; governance documentation, including this file and the backlog;
- any other material engineering decision.

An approval covers only the task it names; it is never approval for unrelated work. A recommendation is not approval, and a
proposed design is not approval to implement it.

## 3. Git and commit rules *[restated; clarified]*

- No staging, committing, amending, pushing, merging, rebasing, resetting or tag operations without explicit authorisation for
  that operation.
- Use the repository's configured Git identity.
- Do not add commit trailers unless the owner explicitly asks for them. *[clarified]*
- Never rewrite or move accepted history, baseline tags or protected references without explicit authorisation
  (`tests/README.md`, section 1).

## 4. Test-running safeguards *[new]*

A test run must not silently change the original working repository.

- Prefer running tests in a throwaway copy of the repository where practical.
- Before running a test, identify whether it may create or modify files. For example, the full tier's browser test writes a
  screenshot folder under `tests/logs/`.
- Never delete pre-existing files or evidence.
- Before cleaning up, establish that an artefact was created by the current run (for example, it did not exist before the run
  and its timestamped name matches the run). Remove only artefacts demonstrably created by that run.
- Report every artefact the run generated, modified or removed.
- If a test cannot be run without affecting existing evidence, stop and report the limitation.

## 5. Engineering standards

*[restated: `tests/V07-TEST-RECORD.md` "Statuses" and "Acceptance of a completed test run"; `M1-DESIGN.md` "Agreed policies"]*

- Never change expected results simply to make a test pass. Never conceal or downgrade a failure. Never silently reduce test
  coverage.
- BLOCKED and REDUCED are not PASS.
- Report full-tier results accurately as "N tests passed (+ pre-flight)": the runner's PASS figure includes its pre-flight row,
  which is not a test. *[clarified]*
- A passing characterisation test establishes recorded behaviour, not necessarily correctness.
- Preserve the distinction between observed, calculated, estimated and assumed figures. Preserve data provenance and explain the
  basis of material calculations.
- Never place confidential business data, credentials or secrets in the repository (`M1-DESIGN.md`, "Real-file data protection").
- Engine JavaScript files (`js/`) are protected by behaviour tests, not file checksums (`M1-DESIGN.md`, "Engine file protection").

## 6. Proactive engineering *[new]*

Act as a proactive engineering partner, not only as an implementer of narrowly specified instructions. Identify, investigate and
recommend; the owner decides what is implemented.

**Areas to look at:** calculation accuracy; supply-chain intelligence; forecasting and predictive intelligence; recommendation
quality and credibility; scenario simulation; recommendation impact modelling; data importing and data quality; architecture and
maintainability; performance and reliability; user experience and presentation; commercial usefulness and potential value.
Consider businesses of every size and type, not only manufacturers.

**Priorities** (always give the reason; never inflate): CRITICAL, HIGH, MEDIUM, LOW, FUTURE OPPORTUNITY.

**For each meaningful finding, report:**
1. Finding and reference.
2. Evidence.
3. Whether it is confirmed behaviour, a suspected issue or an unverified opportunity.
4. Priority.
5. Operational impact.
6. Potential commercial benefit.
7. Recommended action.
8. Testing and validation requirements.
9. Dependencies, risks and suggested development stage.

**Reporting.** End substantial tasks with a section titled **Proactive Engineering Findings**. If there are no meaningful
findings, write: "No significant findings from this task." Do not manufacture findings.

**Discipline.** Do not interrupt an authorised task to implement unrelated improvements. Do not present assumptions as facts;
say when something is unverified. The approved roadmap controls the work: propose any roadmap change with what, why, the
evidence, its effect on existing work and any delay, and never reorder or expand the roadmap silently.

**Working with the owner.** Use plain English, explain technical terms, recommend one sensible next step at a time, and explain
the consequences before asking for approval.

## 7. Where the existing governance lives

| Document | Purpose |
| --- | --- |
| `M1-DESIGN.md` | Requirement 6, agreed policies, decided and open decisions (A1–A15), references to D1–D23 |
| `KNOWN-LIMITATIONS.md` | Known limitations of the engine (entries 1–15) |
| `OUTSTANDING-DECISIONS.md` | Historical v0.6 list of open items and recommendations |
| `tests/V07-TEST-RECORD.md` | Test statuses, accepted counts, acceptance rules, commands, PENDING items, dated evidence |
| `tests/README.md` | Baseline tags, guard-protected files, CI use of the baseline, release procedure |
| `tests/characterisation/README.md` | What characterisation tests mean, their cases, TODO convention and known risks |
| `PROACTIVE-IMPROVEMENT-BACKLOG.md` | Proposed improvements not recorded elsewhere; proposals only |

Historical or unresolved documents (for example `OUTSTANDING-DECISIONS.md`, open decisions A1–A15, and entries written before
a later correction) must be checked for their current status before their contents are treated as active instructions.
