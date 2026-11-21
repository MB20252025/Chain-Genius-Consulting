# Erratum to the X1 acceptance records of 21 Nov 2026: protection count

Added 21 Nov 2026. The accepted records are not edited; this note corrects them.

| Record | Says | Correct |
|---|---|---|
| `X1-REQUIREMENTS-MATRIX.md` v2, criterion 20 | "protection 451/451" | **452/452** |

Why: registering `test-x1-acceptance-wording` (CR-35) added one protected line, raising `check-protection` from 451 to
452. `accepted-results.json` already records 452, with a note. The full tier of commit `a4e05e8` (21 Nov 2026) reports
`check-protection` PASS 452/452.

Effect on the acceptance: none. Criterion 20 is about nothing protected being overwritten or erased, and that still
holds. Only the quoted count was out of date.
