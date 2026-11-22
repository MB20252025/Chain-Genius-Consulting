// H2 current-behaviour subset (Stage 3B readiness, 22 Nov 2026). See stage3-design/stage3b-readiness/HISTORICAL-TESTS-DISPOSITION.md.
// Runs the MAD = 0 checks of the protected test-forecast-conf.js that use only the current engine (lines 36, 38-41):
// the informational "Outlier detection was not applied" note is set, says it does not change confidence, is shown on
// the Forecast accuracy tab and in the ENG_ForecastCredibility export, and is absent for perfectly constant demand.
// Before this subset, no running test checked that note.
// Removed (they need the unavailable v0.6 Phase 3 tree, and their expectations are computed FROM it): the Phase 3 load
// (line 7, OLD only), the 44-pattern comparison and the approval "spec" cases (lines 18-33), the Phase 3 run inside the
// MAD = 0 block (line 35, OLD calls only), the MAD = 0 "unchanged" comparison (line 37) and the fixture comparison
// (lines 42-44). Those remain unverified historical evidence. Level-shift confidence on real fixtures is pinned by the
// v0.7 confidence snapshot (confidence-snapshot-v0.7). Expected: 5 checks.
require('./historical-subset.js')({
  file:'test-forecast-conf.js',
  sha256:'7d9da09a9c3176081c84e4e917640291c5de72ed865121c3f466ec348a7a981c',
  remove:[[18,33,["function run(mk,cut,idx,col,tag){const r", " const same=['n','nV','dq','out','shift'", " ok(same,tag+': accuracy, bias, directio", " const want=o.shift>0?down(o.conf):o.con", " const screen=strip(NEW.html('Forecast a", " if(o.shift>0){ok(n.conf!=='High','level", "  ok((row.match(/level shift/gi)||[]).le", " else ok(!/level shift/i.test(n.confWhy)", " return {n,o}}", "for(const [hl,mk,cut] of [['12m',base12,", "// specific expectations stated in the a", "{const r2=run(base36,36,[5,6],'Units_Sol", " const r3=run(base36,36,[5,6,7],'Units_S", " const rs=run(base36,36,[5,7],'Units_Sol", " const rm=run(base36,36,[2,3,8],'Units_S", " const rn=run(base36,36,[],'Units_Sold',"]],[37,37,[" ok(n.conf===o.conf&&n.dq===o.dq&&n.acc="]],[42,44,["// every fixture: nothing else in foreca", "const FX=[];(function w(d){for(const f o", "for(const fx of FX){const wb=XLSX.readFi"]]],
  removedOk:13,
  replace:[["const NEW=load(path.join(__dirname,'..')),OLD=load(process.env.P3_TREE||fs.readFileSync('/home/claude/p3tree.txt','utf8').trim());","const NEW=load(path.join(__dirname,'..'));"],["NEW.go(wb);OLD.go(wb);const n=NEW.cred()[SKU],o=OLD.cred()[SKU];","NEW.go(wb);const n=NEW.cred()[SKU];"]],
  label:'test-h2-forecast-conf-current'
});
