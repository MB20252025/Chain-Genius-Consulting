// H1 current-behaviour subset (Stage 3B readiness, 22 Nov 2026). See stage3-design/stage3b-readiness/HISTORICAL-TESTS-DISPOSITION.md.
// Runs checks N1-N3 of the protected test-fglt-note.js: the finished-goods fixed-production-time caveat is shown on the
// Reorder policy, Finished goods and Settings screens. Before this subset, no running test checked that caveat.
// Removed: the Phase 2 engine load (line 6, OLD only) and the comparison loop C0-C3 (lines 9-19), which need the
// unavailable v0.6 Phase 2 tree. C0-C3 remain unverified historical evidence. Expected: 3 checks.
require('./historical-subset.js')({
  file:'test-fglt-note.js',
  sha256:'9d4742876316032c56a7c9693bf5b6554998fc65cbae86941a976c554e1d7bc3',
  remove:[[9,19,["const strip=h=>SENT.reduce((s,t)=>s.spli", "const vals=R=>JSON.stringify({fg:R.fg,rm", "let shown=0;", "for(const fx of FX){const wb=XLSX.readFi", " for(const pol of [0,1]){try{a=NEW.go(wb", "  ok(vals(a)===vals(b),'C1 '+nm+' policy", "  {const dn=JSON.stringify(a.dq),do_=JSO", "   ok(dn===do_||(/willow/.test(nm)&&[...", "  const tabs=NEW.tabs();let same=0,diff=", "  ok(!diff.length,'C2 '+nm+' policy '+po", " if(err)ok(true,'C0 '+nm+': does not ana"]]],
  removedOk:4,
  replace:[["const NEW=load(path.join(__dirname,'..')),OLD=load(process.env.PHASE2||'/mnt/user-data/outputs/inventory-intelligence-engine-c4-phase2');","const NEW=load(path.join(__dirname,'..'));"]],
  label:'test-h1-fglt-note-current'
});
