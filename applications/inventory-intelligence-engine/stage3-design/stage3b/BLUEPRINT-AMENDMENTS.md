# Amendments to the Stage 3B blueprint

These amendments are dated and added here. `stage3-design/stage3b-readiness/STAGE3B-BLUEPRINT.md` itself stays as it was written.

- **A-1 (22 Nov 2026): owner decisions applied.**
  - D-4 fixes the navigation as in blueprint B.
  - D-5 fixes the chart library as Chart.js, vendored at a pinned version (blueprint F, first option).
  - D-6: the 17 tabs stay as an Advanced view. Blueprint phase 6 is the intended retirement point, and retirement then needs its own owner decision (ARCHITECTURE-DECISIONS AD-6).
  - D-7: scenarios stay in M5, and Stage 3B Phase 5 covers recommendations only.
  - There is no conflict with the blueprint's technical requirements.
- **A-2 (22 Nov 2026): no-arithmetic check made specific.**
  - The blueprint allowed "counting items in a class, and summing values the engine already provides, only with the X1 status".
  - In the implementation, sums are not done in the view layer at all; they go through the existing `x1Sum`.
  - The allowed block contains only counting and sort order.
  - This is stricter than the blueprint, and nothing is lost.
- **A-3 (22 Nov 2026): forecast-month labels.**
  - Calendar labels for forecast months are deferred to Phase 4, using an engine-provided label list, because the view layer may not do date arithmetic.
  - Phase 0 uses relative labels instead.
