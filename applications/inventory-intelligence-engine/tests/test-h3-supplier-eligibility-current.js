// H3 current-behaviour subset (Stage 3B readiness, 22 Nov 2026). See stage3-design/stage3b-readiness/HISTORICAL-TESTS-DISPOSITION.md.
// Runs every check of the protected test-supplier-eligibility.js EXCEPT K1-K2 (lines 101-104), which compare supplier
// results with the unavailable v0.6 Phase 3 tree. Sections A-J test the current engine against fixed expectations.
// Expected: 299 checks (the original's 301 at v0.6 final, less K1 and K2). K1-K2 remain unverified historical evidence.
require('./historical-subset.js')({
  file:'test-supplier-eligibility.js',
  sha256:'bbaf1ac47bebe5a88b5a764159a048118f6965cb2418915449deac439aaebc17',
  remove:[[101,104,["// valid data: every score, class and ev", "{const P3=require('fs').readFileSync('/h", " ok(R3.sup.every((p,i)=>{const n=Rn.sup.", " ok(JSON.stringify(R3.supRisk.map(s=>s.i"]]],
  removedOk:2,
  label:'test-h3-supplier-eligibility-current'
});
