# X1 v2 design history (clarification A, 21 Nov 2026)

`X1-NUMERIC-INTEGRITY-DESIGN-v2.PART1-AS-DELIVERED-20261120.md` is the v2 Part 1 **exactly as delivered** on 20 Nov 2026, before the
C1–C6 clarifications and Part 2 were added.

- SHA-256 `7f7ba2965c0eadb386ed6c94d51667f03d6cf877ce8ae1acc6e97a8b83e662ff`.
- That is the hash recorded for `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md` in `../start-state/tree.sha256`, taken at
  2026-11-20T22:54:00Z, before any amendment. The copy was made at 22:58 the same evening into a working folder outside the repository and is
  placed here byte-identical. Recoverable: **yes**, and proven by the hash.
- `v2-part1-to-current.diff` is a unified diff from that copy to the v2 document as it stood on 21 Nov 2026 at 01:4x UTC. It shows:
  - C1–C6, each still labelled C1 … C6 in the current document;
  - Part 2 as additions;
  - the passages the amendment **replaced**, not only extended: the Part 1 delivery status, the start-state paragraph, §6.2 "Containment
    design" (replaced by the C1 order of controls) and §8.3 "Allocation unknown: integrity rules" (replaced by the C5 output-class table).

  The replaced §8.3 rules (unknown allocation never treated as zero; shown as unknown; excluded from confirmed totals; partial totals with
  coverage) remain valid design intent. They are carried forward in the WP5 plan (`../X1-TASK2-REPORT.md` §8).
- v1 (`../../X1-NUMERIC-INTEGRITY-DESIGN.md`, SHA-256 starting `db1790fd`) is unchanged.

Nothing in this folder is approved design. v2 remains a draft.
