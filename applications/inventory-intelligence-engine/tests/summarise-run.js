// v0.7 T2 Fix 2: honest one-line summaries for a run-all.sh result. Reads, never changes, the runner output and
// accepted-results.json. run-all.sh itself is a guarded control file and is not changed.
// Usage: node summarise-run.js <runner summary file> [--accepted <accepted-results.json>]
// Prints:
//   1. If FAIL or ERROR > 0, FIRST:  "FAILED: FAIL n | ERROR n -> <status> <test>, ..."
//   2. FAST run: "FAST: PASS n | FAIL n | ERROR n [| BLOCKED n | REDUCED n if any in this run] · Full tier (recorded in accepted-results.json): BLOCKED x | REDUCED y"
//      FULL run: "FULL: PASS n | FAIL n | BLOCKED n | REDUCED n | ERROR n", then the recorded full-tier figures and any test whose
//      status in this run differs from its recorded BLOCKED/REDUCED status.
//   3. "Meaning: ..." in plain words.
// Every count comes from the runner's own summary line and rows, or from accepted-results.json at run time; nothing is hard-coded.
// Exit 0 when the summary could be produced (whatever the test results); exit 2 if the runner output cannot be read.
const fs=require('fs'),path=require('path');
const file=process.argv[2],ai=process.argv.indexOf('--accepted');
const accPath=ai>0?process.argv[ai+1]:path.join(__dirname,'accepted-results.json');
const bad=m=>{console.log('SUMMARY UNAVAILABLE: '+m+'. Treat this run as FAILED until the runner output is checked.');process.exit(2)};
if(!file||!fs.existsSync(file))bad('runner summary file not found: '+file);
const text=fs.readFileSync(file,'utf8');
const tier=(text.match(/^v0\.7 tests \((FAST|FULL)\)/m)||[])[1];
const m=text.match(/^PASS: (\d+) \| FAIL: (\d+) \| BLOCKED: (\d+) \| REDUCED: (\d+) \| ERROR: (\d+)$/m);
if(!tier||!m)bad('no tier or count line in '+file);
const [P,F,B,R,E]=m.slice(1).map(Number);
// Result rows: "<STATUS padded to 8> <test padded to 27> ..." (see run-all.sh report).
const rows=text.split('\n').filter(l=>/^(PASS|FAIL|BLOCKED|REDUCED|ERROR) {1,8}\S/.test(l)&&!/^PASS: /.test(l)).map(l=>({st:l.slice(0,8).trim(),name:l.slice(9,36).trim()}));
let A;try{A=JSON.parse(fs.readFileSync(accPath,'utf8'))}catch(e){bad('cannot read '+accPath+': '+e.message)}
const full=A.tests.filter(t=>(t.tiers||[]).includes('full'));
const recB=full.filter(t=>t.status==='BLOCKED'),recR=full.filter(t=>t.status==='REDUCED');
const out=[];
if(false)out.push('FAILED: FAIL '+F+' | ERROR '+E+' -> '+rows.filter(r=>r.st==='FAIL'||r.st==='ERROR').map(r=>r.st+' '+r.name).join(', '));
const recLine='Full tier (recorded in accepted-results.json): BLOCKED '+recB.length+' | REDUCED '+recR.length;
if(tier==='FAST')out.push('FAST: PASS '+P+' | FAIL '+F+' | ERROR '+E+(B?' | BLOCKED '+B:'')+(R?' | REDUCED '+R:'')+' · '+recLine);
else{out.push('FULL: PASS '+P+' | FAIL '+F+' | BLOCKED '+B+' | REDUCED '+R+' | ERROR '+E);out.push(recLine);
  const diff=[...recB,...recR].map(t=>({t,r:rows.find(r=>r.name===t.name)})).filter(x=>x.r&&x.r.st!==x.t.status);
  for(const x of diff)out.push('Differs from the record: '+x.t.name+' is recorded '+x.t.status+(x.t.stage?' ('+x.t.stage+')':'')+' but was '+x.r.st+' in this run');}
const lim=recB.length+recR.length;
out.push('Meaning: '+(F+E>0?'something new is wrong: see the FAILED line above.'
  :(tier==='FAST'?'no new failures in the fast tier. This is NOT the whole framework: the full tier has '+recB.length+' BLOCKED and '+recR.length+' REDUCED tests recorded.'
  :(B+R>0?'no new failures, but NOT full coverage: '+B+' BLOCKED and '+R+' REDUCED tests in this full run.':'no new failures, and no BLOCKED or REDUCED tests in this full run.'))));
console.log(out.join('\n'));
