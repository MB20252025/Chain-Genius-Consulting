Evidence for X1-NUMERIC-INTEGRITY-DESIGN.md (20 Nov 2026), produced by Claude in this design task.
Read-only probes: each loads the engine (and, where named, the import modules) in a node vm context from a throwaway copy of the
frozen Round 2 working tree (/tmp/x1-final, copied from the repository's tracked and untracked files) or from the Tag-5 copy
(/tmp/rA) and the Baseline B copy (/tmp/rB1), and runs Northstar with one change. No code, test or baseline was changed.
Scripts are stored as .txt so no test runner or scanner picks them up. Run with NODE_PATH=/home/claude/testdeps/node_modules.
  p1-itv               source of "Invalid time value" (whole On_Hand_Qty / Allocated_Qty column removed, direct route)
  p2-import-absent     one whole column absent from the source, import route (final tree; Allocated/On_Order also on Tag-5 and B)
  p3-values            0, -5, whitespace, 1e12, "abc", blank in row 2 of each of the seven fields, both routes
  p4-units-sold        FG001 month row absent vs blank cell vs zero, both routes
This folder is separate from ../evidence/, which existed before this task, was not created in this conversation, and was neither
modified nor used (owner instruction of 20 Nov 2026).
