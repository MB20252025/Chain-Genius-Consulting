# Stage 3 — Engineering completion change register (18 Nov 2026)

*Recorded by Claude under the owner's approval of 18 Nov 2026 (modified approach, four safeguards). Approval to implement is not
acceptance. Nothing here is committed, tagged or formally accepted. Tag-5 (`v0.7-tests-approved-5`, f0e81bb) and its evidence are
untouched. Tag-6 is prepared, not created.*

## Baseline

- Branch `development/v0.7`, HEAD `eddf09b` (= remote). Working tree at the start: 19 modified + 8 new files (the 16 Nov D1–D4 work).
- Recoverable copy, outside the repository: `/home/claude/stage3-baseline-20261118/` — `working-tree.patch`, an archive of the 27
  files, `MANIFEST.sha256`, `BASELINE-INFO.txt`, and `restored-tree/` (clean clone at eddf09b + patch; all 27 hashes verified). It is the
  "before" tree for every old-versus-new comparison below.

## Changes in the working tree

| ID | File / function | Original behaviour | Problem | New behaviour | Tests | Accepted behaviour changed? | Historical evidence affected? | Recommendation |
|---|---|---|---|---|---|---|---|---|
| C-NUM | `js/calculations.js` `analyse()`, line 65 (inline) | Text, NaN or ±Infinity in a numeric engine column (Products costs/price, Materials cost/lead time/MOQ, BOM qty, Demand units/forecast, Inventory quantities and cost, Suppliers lead time, PO unit cost, Production Orders quantities) passed silently. | Silent corruption: Northstar with On_Hand "abc" → 78 non-finite output values, no warning; NaN → 87; Allocated Infinity → 57; BOM qty "two" → 2; cost "£5" → no warning at all. (The usable-stock and PO-quantity columns were already checked.) | One **High** Data quality warning per sheet, naming every affected column and the first 8 cells (`column row N value`), "+ N more", and saying the cells may be misread (JavaScript still coerces some text, e.g. "120") or produce invalid figures. Blank and spaces-only cells are missing values (unchanged); 0 is a value. The analysis still runs, so invalid values can still reach totals (e.g. exV NaN). | `test-stage3-quality.js` C-NUM (13 checks, 11 of 18 columns exercised); golden v0.5 identical; confidence snapshot identical (no fixture contains such values). | No: adds a warning where there was none. | No. | **KEEP** (detection only; it does not stop invalid values reaching totals). Stopping them is experiment X1 (**REVIEW**). |
| D5 | `js/calculations.js` line 56 | Message "Allocated exceeds on-hand". | Since B6 Option D the check compares with usable on-hand; the wording named the wrong basis. | "Allocated exceeds usable on-hand" (same check, same rows). | `test-allocated-usable.js` (23, message constant updated); no snapshot contains the text. | Wording only, as authorised (D5). | No. | **KEEP** |
| C-STK | `js/calculations.js` lines 150, 151, 165 (`stockB` defined inside `analyse()`; no new global) | "No recorded demand", "Potentially obsolete" and the no-demand warning tested physical `On_Hand_Qty > 0`. | Under Option D availability uses usable on-hand. An item whose locations net to ≤ 0 but which holds usable stock (FG050: physical −2, usable 10, no demand) was "Active" and not warned. | **Revised after the independent review:** the flags test stock held on *either* basis, `max(On_Hand_Qty, usable)` > 0. The first version used usable alone, which stopped flagging physical stock with none usable (held/quarantined: FG050 10/0 → "Active", £749.60 dropped from the dead-stock view); the revision keeps every item the old rule flagged and adds the Option D case. Stock value stays on physical On_Hand_Qty. | C-STK (11 checks: 6 no-demand + 4 obsolete cases + valuation unchanged); catches the reviewer's mutation (obsolete on physical only). No fixture has usable ≠ physical, so golden and confidence are identical. | Yes, narrowly: items with usable > 0 but physical ≤ 0 are now flagged. A superset of the old flags. | No. | **REVIEW** (business rule: which stock counts as "held"; the dead-stock view's Qty/Value still show physical stock, so the newly flagged Option D item displays negative values — F-STK2). |
| C-RG3 | `js/import/result-gate.js` (`VERSION`, `SPEC_VERSION`, `validSpec`, export, header) | Output labelled RG2 although it can now contain partial-total objects (D4). | Consumers could not tell from the version that a total may be an object. | Output contract **RG3**; the input specification stays **RG2** (`SPEC_VERSION`), so the adapter is unchanged; any other spec version (RG1, RG3) is refused. `SPEC_VERSION` exported. Contract text below and in the file header. | C-RG3 (2 checks); `test-import-integrity` 396, `test-import-adapter`, `test-partial-totals` 8 unchanged. | No numbers change. Version label only. | No. | **KEEP** |
| C-CMP | `tests/compare-snapshots.js` difference printer | `JSON.stringify(undefined).slice` crashed when a section was missing or emptied (exit was still 1). | Crash hid the diagnostic. | `String(...)` around both; prints "undefined", reports the section as DIFFERENT, exit 1. | C-CMP (1 check, both sides temporary copies so the golden file's permitted N1 differences do not apply). | No. | Re-hashed protected line (`tests/compare-snapshots.js`). | **KEEP** |
| T-S3Q | `tests/test-stage3-quality.js` (new, 28), `accepted-results.json` (+ `stage3-quality` 28; check-protection 442 → 443, note annotated), `checksums.txt` (2 re-hashed lines, 1 added) | — | — | Registered fast + full, two zones. Passes 28/28; fails 18/28 on the pre-change tree (the 10 that pass there are unchanged-behaviour cases). Each of the reviewer's two undetected mutations now fails 1 check. | — | No test removed or weakened. | Re-hash of `test-allocated-usable.js` (D5 constant). | **KEEP** |

## Experiments (separate copies, not in the working tree)

| ID | Location | Change | Old vs new | Tests | Recommendation |
|---|---|---|---|---|---|
| X1 | `/home/claude/stage3-experiments/X1-cnum-refuse/` | C-NUM refuses the analysis ("Invalid numbers in the <sheet> sheet, so the analysis was not run…") instead of warning, matching the scrap policy. | `X1-old-vs-new.txt`: clean data identical; On_Hand "abc" → main runs with 78 non-finite values, X1 refuses; Allocated Infinity 57 → refused; BOM "two" 1 → refused; cost "£5" 0 → refused. | Fast tier: only the 9 C-NUM warning checks fail (they would become refusal checks). | **REVIEW / EXPERIMENTAL** — owner decision. Note it would also refuse "120" stored as text, which the import route accepts (finding F-XR1). |
| X2 | `/home/claude/stage3-experiments/X2-k7-exclusion-partial/` | Partial-total objects also when a group only has items **excluded** from the Engine View (no withheld items). | Changes accepted K7 behaviour: exclusion-only totals become `{value, partial, excludedItems}` objects instead of plain numbers with disclosure. | Fast tier: `import-integrity` 381/396 — I6, I9, F18 fail in all five zones. | **EXPERIMENTAL** — not recommended without a new owner decision; the accepted K7 form already discloses the exclusion. |

## Output contract RG3 (result gate)

RG3 = RG2 plus, for the six group totals `exF, exR, exV, shV, cogsF, cogsR`: where RG2 withheld a total because items of its group were
withheld, RG3 releases a frozen `{ value, partial: true, excludedItems: [{ id, reason }] }` summed over the released items, naming every
withheld and every Engine-View-excluded item of the group; with no eligible item it stays withheld (`NO_ELIGIBLE_ITEMS`), never 0.
Consumers must test with `resultGate.isPartial(v)`; arithmetic, comparison and string use throw. `disclosures.partialTotals` lists them;
each is labelled `PARTIAL_TOTAL`. Totals of groups with excluded-only items keep the K7 form (plain number + disclosure). The input
specification (`spec.version`) remains `'RG2'`.

## Outstanding defects and findings (not fixed in this pass)

| ID | Severity | Finding | Why not fixed |
|---|---|---|---|
| F-STK2 | Medium | The dead-stock view (`js/app.js` line 35) shows Qty and Value from physical On_Hand_Qty; an item flagged only because of usable stock (physical −2, usable 10) shows −2 and −£149.92 and reduces the view's subtotal. | Display change in another file; owner decision with C-STK. |
| F-STK3 | Low | Dead-stock flags ignore allocations (on-hand 10, usable 10, allocated 10 → flagged, excess 0). | Pre-existing rule; owner decision. |
| F-NUM2 | Low | On the import route C-NUM row numbers refer to the generated Engine View sheet, not the client's file (rarely reached: Stage 1 already rejects invalid numbers). | Low impact; record only. |
| F-XR1 | Medium | Cross-route difference: the import route cleans "120", "£5", "1,200", "(25)" into numbers (Stage 1 D8) and rejects only true junk; the direct route converts none of them (now warned by C-NUM). | Converting on the direct route changes accepted results; owner decision (could be paired with X1). |
| F-A1 | Medium | Negative `Planned_Qty` on Production Orders: no warning. | New user-visible warning beyond the identified issues: stop-and-report rule. |
| F-A2 | Low | `Completed_Qty` > `Planned_Qty`: no warning. | Same. |
| F-A3 | Low | Negative material lead time is reported only as "differs from supplier standard". | Same. |
| F-A4 | Low | The BOM qty ≤ 0 message still reads "Scrap outside 0–1 (percent vs fraction?) or qty<=0", although invalid scrap now refuses. | Wording change to an accepted message; owner decision. |
| F-CTL | — | `check-control` FAIL (Tag-5 guard) until Tag-6: run-all.sh changed, confidence reference added, approved checksum lines re-hashed. | By design. |

## Protection count reconciliation

Tag-5: 434 = 3 refs + 431 files. 16 Nov D1–D4: +8 files, 7 re-hashed → 442. 18 Nov Stage 3: +1 file (`test-stage3-quality.js`),
2 more approved lines re-hashed (`compare-snapshots.js` again, `test-allocated-usable.js`) → **443 = 3 + 440**. Nothing removed.
`js/calculations.js` and `js/import/result-gate.js` are not checksum-protected; their protection is the golden and confidence snapshots
and the registered tests, all of which still pass.

## Snapshot integrity

No snapshot file changed. Golden v0.5 (`ALL SECTIONS IDENTICAL` after the 20 permitted N1 differences) and the v0.7 confidence
snapshot are reproduced exactly by the changed code.

## Independent review and reconciliation (18 Nov 2026)

A fresh general-purpose reviewer received only the baseline tree, the approved scope, the specifications, the fast-tier log and the
diff, and was barred from this register and the other Stage 3 notes. It ran the new test on both trees, the fast tier, a globals and
line-count check, a full checksum re-hash, all 18 non-fault fixtures through both trees (identical), a K7 exclusion-only gate run
(plain totals kept), and mutation tests.

| Reviewer finding | Reviewer verdict | Engineer's assessment | Resolution |
|---|---|---|---|
| D5 wording | KEEP | Agree | Kept |
| C-STK: physical 10 / usable 0 no longer flagged anywhere | REVIEW, MEDIUM | **Agree — my first version was a regression** | Revised to either-basis; test expectation changed from "Active" to flagged |
| C-STK: physical −2 / usable 10 shows negative value in dead-stock view | MEDIUM | Agree | Recorded F-STK2; C-STK classified REVIEW |
| C-STK tests: obsolete-on-physical mutation undetected | LOW | Agree | 4 obsolete cases added; mutation now caught |
| C-NUM: detection only, NaN still reaches totals | MEDIUM | Agree; already the subject of X1 | KEEP detection; refusal remains REVIEW (X1) |
| C-NUM: "not converted" wording inaccurate ("120" coerced) | LOW | Agree | Wording corrected |
| C-NUM: Suppliers removal undetected (8 of 18 columns tested) | LOW | Agree | 3 more columns (Suppliers, Materials MOQ, PO cost) tested; mutation now caught |
| C-NUM import-route row numbers | LOW | Agree | Recorded F-NUM2 |
| C-RG3 label only; R4 text in Stage 2 record still says "withheld" | KEEP | Agree | Dated RG3 amendment appended to `IMPORT-V1-STAGE2-RECORD.md` |
| C-CMP | KEEP | Agree | Kept |
| Registry/checksums consistent | KEEP | Agree | Re-hashed after the test revision |
| Allocations ignored by dead-stock flags | finding | Agree, pre-existing | Recorded F-STK3 |
| File count at the five-file limit | LOW | Five code/test files plus the two registry files that any test change requires; no single change exceeds five | Recorded; no change stopped |

No disagreement remains open. The revisions above were made after the review and were not re-reviewed by the same reviewer; they are
covered by the re-run tests listed below.

## Remaining steps before Tag-6 (owner actions; nothing done)

1. Decide C-STK (either-basis rule) and F-STK2 (dead-stock view on physical stock); decide X1 (refuse invalid numbers) and F-XR1 (text-number conversion on the direct route); confirm X2 is not wanted.
2. Approve the PENDING items `check-control` lists: run-all.sh change, the v0.7 confidence reference, the re-hashed approved checksum lines, the new protected lines, and the raised accepted counts (check-protection 434 → 443, same-results 356 → 416, import-integrity 386 → 396, new allocated-usable 23, empty-text 46, shortage-delay 19, scrap-rules 71, tz-boundaries 71, partial-totals 8, stage3-quality 28).
3. Authorise a commit of the working tree on `development/v0.7` (no trailers), then a push.
4. Re-run the full tier on a fresh clone of the pushed commit; confirm the only FAIL is `check-control`.
5. Authorise and create Tag-6 on that commit; update `tests/README.md` / the guard's approved tag; re-run the full tier to confirm `check-control` PASS and CI green.

## Remaining steps before Stage 3 acceptance

1. Tag-6 steps above complete, with full tier and CI green.
2. Owner review of this register: each KEEP / REVIEW / REVERT / EXPERIMENTAL item accepted or rejected.
3. Owner manual check on Android Chrome: upload Northstar and one fault workbook; confirm the new High numeric warning, the D5 wording and the dead-stock tab (no physical Android testing has been done by Claude).
4. Decide whether F-A1–F-A4, F-STK3 and F-NUM2 are fixed in Stage 3 or deferred (record in `KNOWN-LIMITATIONS.md` if deferred).
5. Formal written acceptance of Stage 3 by the owner, recorded in `tests/V07-TEST-RECORD.md`.

## Final test evidence (18 Nov 2026, revised tree, throwaway copies under /tmp; the working repository was not used for runs)

- **Full tier:** 44 tests passed (+ pre-flight), FAIL 1 (`check-control`, the Tag-5 guard, expected until Tag-6), BLOCKED 5 and REDUCED 2 (historical trees, a tag not on GitHub and the Playwright browser download: unchanged from Tag-5), ERROR 0. Golden v0.5 and v0.6.0 10/10 and confidence v0.7 51/51 in all five zones; check-protection 443/443; same-results 416; import-integrity 396; stage3-quality 28/28 in two zones.
- **Fast tier:** 32 PASS, 1 FAIL (`check-control`).
- **Pre-change tree:** stage3-quality fails 18/28.
- **Experiments:** X1 fast tier: only the 9 C-NUM warning checks fail; X2 fast tier: import-integrity 381/396 (I6, I9, F18 × 5 zones).

---

# Round 2 (18 Nov 2026) — engineering completion, Round 2

*Recorded by Claude under the owner's Round 2 brief of 18 Nov 2026. Uncommitted. Technical verification only: nothing here is owner
approval or formal Stage 3 acceptance. Tag-5 untouched; Tag-6 not created.*

## R2.1 Baselines

| | Baseline A — Tag-5 (historical reference) | Baseline B — start of Round 2 (Round 1 result) |
|---|---|---|
| Definition | `v0.7-tests-approved-5` → commit f0e81bb (tree on GitHub, `ls-remote` confirms) | complete working tree of `development/v0.7` at HEAD eddf09b plus 19 modified + 12 untracked files (31 entries in `git status`), 1,829 files |
| Mechanism | the Git tag itself (immutable, on the remote) + `git archive` copy with every blob hash: `/home/claude/stage3-baseline-A-tag5/` (`tag5-tree.tar.gz`, `TREE-BLOBS.txt`) | verified archive outside the repository: `/home/claude/stage3-round2-baseline-B/` (`worktree-full.tar.gz`, `working-tree.patch`, `INVENTORY.sha256` of all 1,829 files, `STATUS.txt`, `HEAD.txt`) and a portable 216 KB bundle `stage3-round2-baseline-B-bundle.tar.gz` (patch + untracked files + inventory + `RESTORE.md`), also sent to the owner so it survives this session. No branch: a branch cannot hold uncommitted files without a commit, and committing is not authorised |
| Restore | `git archive v0.7-tests-approved-5` (or the tarball) into an empty folder | (1) extract `worktree-full.tar.gz`; or (2) clone, `git checkout eddf09b`, `git apply --binary working-tree.patch`, copy the untracked files; or (3) the bundle's `RESTORE.md` |
| Verification | every restored file's Git blob hash equals the tag's tree: 1,819 of 1,819 | all three routes: `sha256sum -c INVENTORY.sha256` 0 mismatches; file list identical to the inventory (no missing or extra file); routes 2 and 3: `git status` identical to `STATUS.txt` |

Every Round 2 change below modifies Baseline B (attribution **B**). None modifies Tag-5 state, so nothing is attributed to A. Diff of the
working tree against B: `/home/claude/stage3-round2/diffs/ROUND2-vs-baselineB.diff` (6 files: `js/calculations.js`, `js/app.js`,
`tests/test-stage3-quality.js`, `tests/test-stage3-round2.js`, `tests/accepted-results.json`, `tests/checksums.txt`; plus this register and
the records). Experiments are separate patches against B in `/home/claude/stage3-round2/patches/`. Each applies to B and reproduces its
experiment tree byte for byte, and reverses to B byte for byte (all five verified).

## R2.2 Reconciliation of the previous independent review (item by item)

The Round 1 reviewer's report held 13 distinct points (the earlier "12" miscounted). Each with its substance, the action taken and the evidence:

| # | Reviewer's finding (substance) | Action | Evidence | Status |
|---|---|---|---|---|
| 1 | D5: the new wording "usable on-hand" also appears when no usable column was supplied (then it means plain on-hand); invisible to users | Dead-stock view note now states "Usable = usable on-hand where supplied, otherwise equal to physical". The 3A warning text itself is unchanged | `js/app.js` view note; R2-VIEW checks | **Outstanding (LOW)**: the 3A message does not say so itself |
| 2 | Dead-stock v1: physical 10 / usable 0 no longer flagged anywhere (held stock disappears) | Round 1 v2 (either basis); kept in v3 | `test-stage3-round2.js` "physical 10 held …: still listed" | Resolved |
| 3 | Physical −2 / usable 10 flagged but the view shows Qty −2 and value −£149.92 | View now shows physical −2 beside usable 10 and unallocated usable; value stays physical (Option D valuation, accepted) | R2-VIEW row check; mock-ups | **Partly resolved**: negative value still shown; interface decision pending (R2.7) |
| 4 | Mutation (obsolete flag on physical only) undetected | Round 1 added 4 obsolete cases; Round 2 adds obsolete-with-allocation | `stage3-quality` 28, `stage3-round2` 24 | Resolved |
| 5 | C-NUM is detection only: NaN still reaches headline totals | Investigated as X1 with five policies and a 21-case matrix (R2.3) | `matrix.json` | **Outstanding (MEDIUM)**: owner decision (X1 REVIEW) |
| 6 | C-NUM message said "not converted" although JavaScript coerces "120" | Round 1 wording fix | `js/calculations.js` line 65 | Resolved |
| 7 | Removing Suppliers from the C-NUM list undetected (8 of 18 columns tested) | Round 1 added Suppliers, Materials MOQ, PO cost (11 of 18 columns) | mutation now fails 1 check | **Partly resolved**: 7 columns still untested individually (LOW) |
| 8 | On the import route C-NUM row numbers refer to the Engine View, not the client's file | Not changed (Stage 1 rejects such values first, so the warning is practically unreachable there) | probe: import refuses or blanks them | **Outstanding (LOW)** |
| 9 | RG3 label only; the Stage 2 record still says totals are "withheld" | Round 1: dated RG3 amendment in `IMPORT-V1-STAGE2-RECORD.md` | that section | Resolved |
| 10 | `compare-snapshots.js`: non-array sections (e.g. `tot`) report a difference without detail lines (pre-existing) | Not changed | — | **Outstanding (LOW)**, pre-existing |
| 11 | Registry and checksums consistent | Re-verified after Round 2 | check-protection 444/444 | Resolved |
| 12 | Dead-stock flags ignore allocations (10 on hand, 10 allocated → flagged with £0 excess) | Round 2 rule v3: uncommitted = max(physical, usable) − allocated | R2-STK checks; FG050/FG014 comparisons | Resolved |
| 13 | Five-file trigger reached (registry files included) | Round 2 delta: 2 code + 2 test + 2 registry files; no single change above five files | diff list above | Noted |

## R2.3 Numeric validation (X1) — investigated, **REVIEW**

**Evidence.** The same 21 cases, Northstar row 2 (and rows 3–4 for the mixed cases), through Baseline B, five experiment policies, and the import
route (`/home/claude/stage3-round2/matrix.js`, raw output `matrix.json`). Outcome per case (BROKEN = a headline total, stock value or excess,
non-finite; ok* = headlines finite but some item-level figures non-finite; REFUSED = analysis not run, cells named; WITHHELD = import route runs
but withholds money totals):

| Case | B (now) | XC | X1R | X1T | XCT | XCRT | Import |
|---|---|---|---|---|---|---|---|
| On_Hand "abc" | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED | REFUSED |
| On_Hand "120" | ok | ok | REFUSED | REFUSED | ok | ok | ok |
| On_Hand "£5" (quantity field) | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED | REFUSED |
| On_Hand "1,200" | BROKEN | ok | REFUSED | REFUSED | ok | ok | ok |
| On_Hand "(25)" | BROKEN | ok | REFUSED | REFUSED | ok | ok | ok |
| On_Hand NaN / ∞ / −∞ | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED | REFUSED |
| On_Hand blank | BROKEN | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED |
| Unit_Cost "£5" (money field) | BROKEN | ok | REFUSED | REFUSED | ok | ok | ok |
| Unit_Cost "120" | ok | ok | REFUSED | REFUSED | ok | ok | ok |
| Unit_Cost "$5" / "abc" / blank | BROKEN | BROKEN | REFUSED (blank: BROKEN) | REFUSED | REFUSED | REFUSED | WITHHELD |
| Units_Sold blank | ok* | ok* | ok* | REFUSED | REFUSED | REFUSED | ok |
| Allocated ∞ | ok* | ok* | REFUSED | REFUSED | REFUSED | REFUSED | REFUSED |
| Selling_Price "abc" (non-critical) | ok* | ok* | REFUSED | ok* | ok* | REFUSED | ok |
| Selling_Price blank | ok | ok | ok | ok | ok | ok | ok |
| MOQ NaN | ok* | ok* | REFUSED | ok* | ok* | REFUSED | ok |
| Unit_Cost "(25)" (money) | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED | WITHHELD |
| Mixed: "120", "abc", "£5" | BROKEN | BROKEN | REFUSED | REFUSED | REFUSED | REFUSED | REFUSED |
| Mixed valid: "120", "£5" | BROKEN | ok | REFUSED | REFUSED | ok | ok | ok |

Policies (patches against B): **XC** Option C cleaning only (warn otherwise); **X1R** refuse any non-blank invalid value (Round 1 X1); **X1T** refuse
invalid or blank values in the 7 headline-critical columns (On_Hand, Allocated, On_Order, Reorder_Point, Inventory Unit_Cost, Units_Sold,
BOM Qty: the columns whose blank or invalid value was shown to produce non-finite results, `probe-blanks.js`); **XCT** XC + X1T; **XCRT** XC +
refuse any invalid value + refuse critical blanks.

**New findings.** (1) **F-BLK (HIGH)**: a single blank On_Hand_Qty, Allocated_Qty, Inventory Unit_Cost_GBP or Units_Sold makes the stock value,
the excess value or 574 item figures non-finite on the direct route, behind only a Medium "Missing values" warning. (2) **Import-route design
constraint**: the adapter deliberately writes a blank Unit_Cost_GBP where Stage 1 could not read a money value, and the gate then withholds
money; an engine-wide blank refusal broke `import-adapter` (all five zones). The blank rule in the experiments therefore applies only to
workbooks without the adapter's `cgEngineView` marker (direct uploads), a two-file change (`calculations.js`, `engine-workbook.js`). After the
independent review the marker exempts **blanks only** (the first version also exempted invalid values under T), and money (`_GBP`) columns no
longer convert negatives or brackets ("(25)" is withheld by the import route). The marker is an in-memory property: a workbook written to a file
and read back loses it and is treated as a direct upload (refused if a critical value is blank). That is a design trade-off for the owner; the
alternative is for the adapter to write a visible marker sheet. XC/XCT/XCRT also update the Suppliers note in `js/app.js`, which said numeric text
"is not converted".

**Test impact (fast tier on each rebuilt experiment).** XC, X1T, XCT, XCRT, X1R: every test passes except `check-control` (Tag-5 guard) and the
`stage3-quality` checks that assert today's warn-only behaviour (XC 2, X1R 12, X1T 8, XCT 9, XCRT 13), which would be rewritten to assert the
adopted policy. (X1R's first run, made with five tiers in parallel, also showed a `check-protection` ERROR "no summary line"; run alone it
passes 443/443, and the standalone fast-tier rerun `/home/claude/stage3-round2/fast-X1R-rerun.log` gives 31 PASS with only the guard and the
12 warn-only checks failing; the reviewer reran it independently with the same result.) No golden or confidence snapshot changes (no fixture contains such values).

**Options and trade-offs.**
- *Warn only (current, KEEP as detection)*: never blocks a user; 16 of 21 cases end BROKEN or ok*. Fails the principle that invalid data must not
  produce apparently valid headline results.
- *X1R*: strict and simple, but refuses "120" and "£5" that the import route accepts, and still lets blanks break headlines.
- *XCT*: matches the import route on every quantity case; non-critical invalid values still leave some item figures non-finite.
- *XCRT* (**engineer's preferred candidate**): never BROKEN or ok*; matches the import route on every quantity and "£" case; differs only where the
  import route can *withhold* money or blank a non-critical field (the direct route has no gate, so it refuses instead). Cost: a user with one
  bad Selling_Price cell is refused, where the import route would run.
- *Isolate* (not built): exclude the affected item from analysis and totals with disclosure, as the import route does. Closest to the import route,
  but needs gate-like disclosure on the direct route: a larger change.

**Status: REVIEW.** Nothing adopted. The working tree keeps the Round 1 warning (C-NUM, KEEP as detection).

## R2.4 Cross-route normalisation — Option C recommended, **REVIEW**

The import route already implements Option C. It accepts plain numbers stored as text, thousands separators and bracket negatives in any numeric
field, accepts "£" only in money fields (field metadata), and refuses or withholds anything else ("$5", "5 units", "1.200,50", junk). The direct
route converts nothing and lets JavaScript coerce "120" by accident. Recommendation: **Option C on the direct route** (experiment XC: the
Stage 1 D8 grammar, "£" only in columns whose names end `_GBP`, one Medium warning listing every converted cell), because it aligns the routes
without changing the import route or its accepted tests. Option A (clean currency everywhere) would accept "£5" in a quantity field, which
Stage 1 deliberately refuses. Option B (neither cleans) would reverse the accepted Stage 1 D8 behaviour and its tests. **Status: REVIEW**, not
adopted. Patch `EXP-XC.patch` (or `EXP-XCRT.patch` combined with the X1 candidate).

## R2.5 Dead stock — implemented in the working tree (rule KEEP-candidate, view REVIEW)

| ID | File / place | Original (B) | New | Classification |
|---|---|---|---|---|
| R2-STK | `js/calculations.js` lines 150–151 (`stockB` and the class chain, inline) | flags used `max(physical, usable) > 0`, ignoring allocations | **v3.1**: every listed class (No recorded demand, Potentially obsolete, Excess stock, Slow-moving) requires **uncommitted stock = max(physical, usable) − allocated > 0**. Physical or usable that is blank or unreadable is ignored (a blank On_Hand no longer hides usable stock); allocation is read as available stock reads it (text "10" = 10; a negative allocation adds, as in available stock, and is flagged High). v3 (first Round 2 version) let a fully allocated item fall through to "Slow-moving" and stay listed, and read allocation differently from available stock: both found by the independent review and fixed. Valuation (physical) and potential excess (unallocated usable above 90 days' demand) unchanged | **KEEP** (implements the owner's accepted direction; no snapshot change) |
| R2-VIEW | `js/app.js` line 35 (dead-stock view) | one "Qty" column (physical) | Physical, Allocated, Usable, Unallocated usable side by side; a note explains each and the listing rule; summary says "physical stock value" | **REVIEW** (direction accepted; final layout deferred to the owner's choice among the mock-ups) |
| T-R2 | `tests/test-stage3-quality.js` C-STK scenarios | left Northstar's real FG050 allocation (51) in place | set `Allocated_Qty` 0 explicitly; same 28 checks, same expectations | **KEEP** (not weakened; original file kept at `/home/claude/stage3-round2/test-stage3-quality.round1.js`; under v3 the old inputs gave 8 failures because 51 allocated exceeded every stock figure tested) |

**Before and after on identical inputs** (`deadstock-compare.txt`; A = Tag-5, B = Round 2 start, Now):

| Item and input | A (Tag-5) | B | Now |
|---|---|---|---|
| FG050 no demand, 10/10/0 (physical/usable/allocated) | No recorded demand, excess £749.60 | same | same |
| FG050 no demand, 10/10/**10** (all allocated) | No recorded demand, warned | No recorded demand, warned | **Active, not warned**, excess £0 |
| FG050 no demand, 10/10/4 | No recorded demand, excess 6 / £449.76 | same | same |
| FG050 no demand, −2/10/0 | **Active** (missed) | No recorded demand | No recorded demand, excess £749.60 |
| FG050 no demand, 10/0/0 (held) | No recorded demand, excess £0 | same | same |
| FG050 no demand, 10/0/10 | No recorded demand | No recorded demand | **Active** |
| FG014 real data | Excess stock, 422 units / £60,481.04 | same | same |
| FG014 demand removed, all 882 allocated | No recorded demand | No recorded demand | **Active**, excess £0 |
| RM009 real data | Excess stock, 1,618 units / £1,116.18 | same | same |
| RM009 all 4,060 allocated | Active | Active | Active |

Excess value was already net of allocations in A and B; only the classification and the listing change.

**Mock-ups for review** (Design canvas "Dead-stock view: four stock quantities, mock-ups for review"): A four columns (the working tree);
B a stock-composition bar per item; C summary cards plus one "uncommitted stock" column with the quantities on demand. Same real figures in
each. Interface finalisation: **deferred to the owner**.

## R2.6 Genuinely excess stock — proposal only, **REVIEW** (not implemented)

**Existing definition (unambiguous in code, `js/calculations.js` line 156):** excess quantity = unallocated usable stock − 90 days
(setting `excess`) × average daily units sold over the last 12 months (setting `basis`); with no demand, all unallocated usable stock.
Valued at unit cost. It ignores stock on order, safety stock, the forecast and held (unusable) stock, so an item listed as dead because of held
stock shows £0 excess.

Inputs a better definition needs, none of them decided today: assessment horizon; demand basis (history, forecast or the larger); whether open
supply (on order) adds to the stock judged; whether safety stock is protected; what counts as committed (allocations only, or also firm
production and customer orders); treatment of held/quarantined stock; treatment of no-demand and slow-moving items.

| | Definition | Assumptions | Implications |
|---|---|---|---|
| E0 (current) | unallocated usable − horizon × historical demand | history predicts the next 90 days; nothing arriving | simple, explainable; overstates excess when demand is rising, understates it when large orders are inbound |
| E1 (engineer's proposal) | unallocated usable + on order − (forecast demand over the horizon + safety stock), floored at 0; no-demand items: all uncommitted stock, held included | forecast credible (the engine already rates forecast credibility); safety stock is policy, not excess | catches over-ordering; ties to MRP; needs a rule when the forecast is not credible (fall back to E0 and say so) |
| E2 | stock above a maximum level = reorder point + order quantity (or MOQ) | the client's reorder points are maintained | matches how buyers think; depends on data quality the engine already flags as often stale |
| E3 | ageing tiers: dead (no demand 12 months), obsolete (no demand 6 months), excess (cover above horizon) | months-since-demand is reliable | clearest client message; no money figure for slow movers without E0/E1 underneath |

Recommendation for the owner's decision: E1, with E0 as the stated fallback, held stock counted for no-demand items, and the horizon and safety-stock
treatment as Settings. A broader forecasting and inventory-policy exercise is a **separate future work item** (FW-EXCESS), not Round 2.

## R2.7 Remaining findings F-A1..F-A4 — implemented in the working tree

| ID | File / line | Original (B) | New | Classification |
|---|---|---|---|---|
| F-A1 | `js/calculations.js` line 79 | negative Planned_Qty / Completed_Qty: no warning | High "Negative planned or completed quantity …", naming orders | **KEEP** (detection only) |
| F-A2 | line 79 | Completed > Planned: no warning | Medium "Completed quantity exceeds planned quantity (over-production, or a keying error): please check", naming order and both figures | **KEEP**. Willow (real fixture) gains it on 3 orders (WO501 1,802 of 1,787 …): intended |
| F-A3 | line 74 | negative lead time only reported as "differs from supplier standard" | High "Negative lead times …" naming Materials/Suppliers rows and values | **KEEP** |
| F-A4 | line 68 | "Scrap outside 0–1 (percent vs fraction?) or qty<=0" | "BOM quantity per finished unit is zero, negative or not a number"; same rows, same severity (invalid scrap already stops the analysis earlier: tested) | **KEEP** |

None feeds the `flagged` set behind confidence ratings, so no rating can move.

## R2.8 Wider implications (Baseline B vs Now, identical inputs: 17 fixtures + 5 Round 2 scenarios compared = 22; 3 further files, F19, F20 and L2, are not engine workbooks and are refused with the same message by both trees, so they were not compared)

`wider.js` compared 13 areas. **No difference on any of the 22 inputs** in: production attainment, MRP, production feasibility, inventory valuation,
stock availability (available, position, cover), excess quantities and values, forecasting and forecast credibility, supplier performance,
item risk and health, recommendations/client questions, confidence ratings. **Intended differences only**: classification (FG050 fully allocated →
Active); data-quality messages (the four new or reworded warnings; Willow's over-production warning; the no-demand warning no longer lists a fully
allocated item). Import validation: `same-results` 416 and `import-integrity` 396 pass unchanged (both routes run the same engine, so the new
warnings appear on both). Client-facing explanations: the dead-stock view note and the four warning texts above. A first run of this comparison
showed differences everywhere; cause: workbooks read with one context's SheetJS and passed to another context's engine (dates not recognised).
Fixed in the harness; no engine defect.

## R2.9 Tests (Round 2)

- New `tests/test-stage3-round2.js`: 35 checks (two zones, fast and full); passes 35/35; fails 19/35 on Baseline B (the 16 that pass there are
  unchanged-behaviour cases). Eleven checks were added in response to the independent review: fully allocated obsolete item not listed; allocation
  as text, negative, above stock and unreadable; blank On_Hand with usable stock; physical 10 / usable 4 / allocated 6; no stock with stopped demand;
  and the import-route counterparts of F-A1..F-A3 (Stage 1 rejects a negative-planned row, blanks a negative lead time, and the engine gives the
  same over-production warning).
- `stage3-quality` 28/28 (inputs made explicit, T-R2).
- Fast and full tier results, per zone: see R2.10.

## R2.11 Outstanding REVIEW decisions for the owner

1. **X1 numeric validation policy**: remains REVIEW (R2.3). Candidate XCRT.
2. **Cross-route normalisation**: Option C recommended, remains REVIEW (R2.4).
3. **Dead-stock interface**: deferred pending the mock-up choice (R2.5).
4. **Genuinely excess stock definition**: remains REVIEW; E1 proposed (R2.6).
5. **F-BLK** (blank critical values break headlines on the direct route): fixed only inside the X1 candidates; a decision on X1 decides it.
6. **Negative physical value** in the dead-stock view (point 3 above): decide with the interface.

## R2.12 Remaining defects, limitations and risks

| ID | Severity | Item |
|---|---|---|
| F-BLK | HIGH | blank critical numeric values make headline figures non-finite on the direct route (Medium warning only) — awaits X1 |
| C-NUM gap | MEDIUM | invalid numeric values still reach totals (detection only) — awaits X1 |
| F-XR1 | MEDIUM | the routes still differ for text-stored numbers — awaits Option C decision |
| R1-#1 | LOW | the 3A message does not say "usable = physical" when no usable column is supplied |
| R1-#7 | LOW | 7 of 18 numeric columns not individually exercised by tests |
| F-NUM2 | LOW | import-route C-NUM row numbers refer to the Engine View |
| C-CMP-2 | LOW | compare-snapshots prints no detail lines for non-array sections (pre-existing) |
| F-EXC-HELD | LOW | an item listed as dead because of held stock shows £0 potential excess (definition question, R2.6) |
| R2-ALLOC | LOW | an unreadable or blank Allocated_Qty counts as 0 for listing while available stock is unknown (kept visible beside its warning; reviewer would prefer "unknown") |
| R2-ASSUME | LOW | physical above usable with allocation between them (10 / 4 / 6) is listed although unallocated usable is negative: follows the stated rule; settle with R2.6 |
| RISK-UI | — | the dead-stock view is checked by rendering its HTML in the engine context (`stage3-round2` R2-VIEW) and by the full tier's `browser-chrome` check (passes); the paging browser test `test-paging-chrome` stays BLOCKED (Playwright browser download blocked); no physical Android test has been done |

## R2.13 Round 2 independent review: findings and responses

A fresh general-purpose reviewer received the complete final diff (code and tests; documents withheld), the Round 1 diff it had seen before,
the Round 2 delta, the experiment patches, the owner's Round 2 brief as the specification, and raw evidence (scripts and their outputs). It was
barred from this register and the engineer's record sections. It reviewed three times: the Round 2 delta, then the corrections
(`DELTA-since-review.diff`), then the last comment-and-test delta (`DELTA-since-rereview.diff`), each time on fresh copies, running code.

| Reviewer finding (first pass) | Severity | Response | Evidence after correction | Status |
|---|---|---|---|---|
| D1 fully allocated obsolete item drops to "Slow-moving" and stays listed, contradicting the view note | MEDIUM | every listed class now requires uncommitted stock | FG050 10/10/10 obsolete → Active, not in view (test) | Fixed, reviewer confirmed |
| D2 classification and available stock read allocation differently (text "10", −5) | MEDIUM | one numeric reading of allocation for both | "10" → Active; −5 → 15 everywhere (tests) | Fixed, reviewer confirmed |
| D3 blank On_Hand hides usable stock (NaN) | MEDIUM | blank or unreadable physical/usable ignored in the maximum | blank On_Hand + usable 10 → listed (test) | Fixed, reviewer confirmed |
| D4 physical 10 / usable 4 / allocated 6 listed while unallocated usable shows −2 | LOW | documented as the rule's stated assumption; tested | test pins it | Owner decision with the excess definition (R2.6) |
| D5 dead scrap conditions after the F-A4 rewording | LOW | removed | filter now tests quantity only | Fixed, reviewer confirmed |
| Experiments: marker exempted invalid values under T | — | blank-only exemption | marked workbook with "abc" refused by X1T, XCT, XCRT | Fixed, reviewer confirmed |
| Experiments: marker lost on write/read | — | documented as design trade-off | matrix marker checks | **REVIEW** (owner decision) |
| Experiments: XC converted money "(25)" (import withholds) | — | negatives and brackets not converted in `_GBP` columns | matrix row "(25)" | Fixed, reviewer confirmed |
| Experiments: `_GBP` suffix weaker than explicit currency confirmation | — | recorded; the engine's column names are its field contract | — | **REVIEW** with Option C |
| Experiments: XC contradicts the Suppliers note | — | XC patch now updates the note | `EXP-XC.patch` (2 files) | Fixed, reviewer confirmed |
| Experiments: no X1R fast-tier log | — | standalone rerun: only the guard and the expected warn-only checks fail | `fast-X1R-rerun.log` | Fixed (reviewer reran it too) |
| Experiments: R skips Usable_On_Hand_Qty | — | description corrected: usable is optional and already checked separately | `apply-numeric.py` | Fixed |
| Evidence: "no difference on any of 25 inputs" overstated (3 inputs error on both trees) | — | corrected to 22 compared | R2.8 | Fixed |
| Missing tests (allocation edge cases, view listing, blank On_Hand, import parity) | — | 11 checks added | `stage3-round2` 35 | Fixed |
| Second pass: unreadable allocation counted as 0 while available stock is unknown | LOW | kept deliberately (stock stays visible beside its warning); comment corrected; tested | check "unreadable allocation" | Documented limitation |
| Second pass: no-stock item with stopped demand now Active (intended, untested) | — | tested | check "no stock at all …" | Fixed |
| Experiments are built on Baseline B, not combined with the Round 2 changes | — | true; any adopted experiment must be re-based and its tests rewritten | — | Tag-6 step |
| `check-control` reports the confidence reference "changed" against Tag-5 | — | Round 1 re-emitted reference; by design until Tag-6 | — | Tag-6 step |

**Reviewer's final recommendations** (after the second pass): R2-STK KEEP; R2-VIEW REVIEW; F-A1/A2, F-A3, F-A4 KEEP; test amendment and new test
KEEP; registry KEEP; EXP-XC, X1R, X1T, XCT EXPERIMENTAL; EXP-XCRT REVIEW. Nothing to revert. **No disagreement** with the engineer's
classifications. The one difference of emphasis: the reviewer would fix the unreadable-allocation case; the engineer keeps the item listed (showing
stock is safer than hiding it) and documents it. Left to the owner (R2.12).

## R2.10 Final test results (working tree after all corrections; throwaway copies; the repository was not used for runs)

**Full tier (combined):** 45 tests passed (+ pre-flight); **FAIL 1** `check-control` (Tag-5 guard, by design until Tag-6: run-all.sh changed,
confidence reference added since Tag-5, approved checksum lines changed); **BLOCKED 5**: `test-fglt-note`, `test-forecast-conf`,
`test-supplier-eligibility` (historical Phase 2/3 trees not present), `phase2-comparison` (tag `v0.6-candidate-4-phase2` not on GitHub),
`test-paging-chrome` (Playwright browser download blocked); **REDUCED 2**: `test-phase1` 57 of 125, `test-uom` 110 of 164 (historical comparison
inputs missing); **ERROR 0**. The success floor (44 tests passed, 1 guard FAIL, snapshots exact) is met: 45 = 44 + `stage3-round2`. Same
BLOCKED and REDUCED set as at Tag-5. The full tier's `browser-chrome` check (53) passes.

**Per zone** (UTC, Europe/London, America/New_York, Asia/Kolkata, Pacific/Auckland):

| Test | UTC | London | New York | Kolkata | Auckland | Combined |
|---|---|---|---|---|---|---|
| stage3-round2 | 35/35 | 35/35 | 35/35 | 35/35 | 35/35 | registered in 2 zones; all 5 run explicitly |
| stage3-quality | 28/28 | 28/28 | 28/28 | 28/28 | 28/28 | registered in 2 zones; all 5 run explicitly |
| same-results | 83/83 | 83/83 | 83/83 | 83/83 | 83/83 | 416 (incl. "identical in all 5 zones") |
| import-integrity | 79/79 | 79/79 | 79/79 | 79/79 | 79/79 | 396 (incl. identity) |
| golden v0.5 / v0.6.0 | 10 sections identical | same | same | same | same | 10/10 each |
| confidence v0.7 | identical | same | same | same | same | 51/51 |
| characterisation-lead-time | registered 5 zones | | | | | 28/28 |
| all other tests | registered in 1 or 2 zones (see the full-tier table) | | | | | all at their accepted counts |

**Regression:** golden v0.5 and v0.6.0 and the confidence snapshot reproduce exactly in every zone; Baseline B vs Now on 22 identical inputs shows
only the intended differences (R2.8); no existing test was weakened (the one changed test, `stage3-quality`, keeps its 28 checks and expectations,
inputs made explicit: T-R2). **Original vs revised for the deliberate behaviour changes** is in R2.5 (dead stock, A/B/Now) and R2.7.

## R2.14 Protection reconciliation

| | References | Protected files | Total |
|---|---|---|---|
| Tag-5 (A) | 3 | 431 | 434 |
| Round 2 start (B) | 3 | 440 | 443 |
| Now | 3 | 441 | **444** (`check-protection` 444/444) |

B → Now: **added** `tests/test-stage3-round2.js`; **re-hashed** `tests/test-stage3-quality.js` (T-R2); **removed** none. A → Now: added 10 files
(2 snapshot files: `permitted-differences.json`, `v0.7-confidence-20261116T034921Z.json`; 8 tests); re-hashed 7 approved lines
(`compare-snapshots.js`, `snapshots/README.md`, `test-import-integrity.js`, `test-import-stage1.js`, `test-same-results.js`, `test-uom.js`,
`reverse-eight-sheet.js`); removed none. Engine `js/` files are protected by behaviour tests, not checksums.
**Historical snapshots unchanged:** `v0.5-golden-20261105T101953Z.json`, `v0.6.0-baseline-20261109T152050Z.json` and
`v0.7-confidence-20261112T011814Z.json` are byte-identical in A, B and Now; B's and Now's snapshot folders are identical.

## R2.15 Tag-6 preparation and remaining steps (none done; owner actions)

**Must be completed before Tag-6**
1. Owner decisions (R2.11): X1 policy; cross-route option; dead-stock interface choice; excess definition (or confirm deferral to FW-EXCESS);
   R2-ALLOC and R2-ASSUME; whether the experiment marker design is acceptable if XCRT is chosen.
2. Any adopted experiment: re-base its patch onto the current tree, rewrite the `stage3-quality` C-NUM checks to assert the adopted policy (with
   original and revised results recorded), add its own regression tests, and re-run the full tier and an independent review of that change.
3. Approve the PENDING items `check-control` lists: `run-all.sh`; the v0.7 confidence reference; the re-hashed approved lines; the new protected
   lines; the raised counts (check-protection 434 → 444, same-results 356 → 416, import-integrity 386 → 396; new tests allocated-usable 23,
   empty-text 46, shortage-delay 19, scrap-rules 71, tz-boundaries 71, partial-totals 8, stage3-quality 28, stage3-round2 35).
4. Authorise one commit of the working tree on `development/v0.7` (no trailers), then the push.
5. Full tier on a fresh clone of the pushed commit: only `check-control` may FAIL.
6. Authorise Tag-6 on that commit; update `tests/README.md` and the guard's approved tag; re-run the full tier (expect `check-control` PASS) and
   CI.

**Must be reviewed:** this register (Round 1 and Round 2); the mock-up canvas; the experiment patches and the numeric matrix.

**Evidence to preserve** (outside the repository unless committed): `/home/claude/stage3-baseline-20261118/` (pre-completion baseline),
`/home/claude/stage3-round2-baseline-B/` and the bundle sent to the owner (Baseline B), `/home/claude/stage3-baseline-A-tag5/`,
`/home/claude/stage3-round2/` (patches, experiment trees, matrix, wider, dead-stock comparison, logs), `/home/claude/stage3-review-package-r2/`
(what the reviewer saw). This workspace does not outlive the session: anything to keep must be committed (on approval) or downloaded.

**Before formal Stage 3 acceptance:** the Tag-6 steps above complete with full tier and CI green; the owner's review of every KEEP / REVIEW /
REVERT / EXPERIMENTAL item; a manual check on Android Chrome (Northstar plus one fault workbook: the new warnings, the D5 wording, the dead-stock
tab with four quantities); a decision on the outstanding LOW items (fix now or record in `KNOWN-LIMITATIONS.md`); the owner's written
acceptance recorded in `tests/V07-TEST-RECORD.md`.

---

*19 Nov 2026: the Round 2 evidence has been reconciled against seven discrepancies raised in an external review; corrections to the figures and wording above are recorded in `stage3-evidence/ROUND2-EVIDENCE-RECONCILIATION.md` (documentation only; no engineering change).*
