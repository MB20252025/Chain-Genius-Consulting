// v0.7 A1 review: shared state and caches around CGEngine.runEngine().
// Run from tests/: NODE_PATH=<node_modules with acorn, xlsx> node test-a1-state.js
// Every top-level variable of the five scripts (92 names, including CFG, R, WB, WBNAME and the screen state in app.js)
// is snapshotted: same object (identity) and same contents (hash). The screen result's caches (R.memo for MRP and
// feasibility, R.fcm for forecasts, R.fcc for forecast credibility) are filled first, as they are after a user opens the tabs.
// Scenarios: (1) a successful wrapper run, (2) failed runs, (3) repeated runs with different settings, each checked
// against a separate untouched copy of the app, (4) a wrapper run followed by the application's normal run().
const acorn=require('acorn'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..'),FILES=['js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js','js/engine/engine-api.js'];
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;if(!c||process.env.VERBOSE)console.log((c?'PASS ':'FAIL ')+m)};
const src=FILES.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
const NAMES=[];for(const f of FILES){acorn.parse(fs.readFileSync(path.join(ROOT,f),'utf8'),{ecmaVersion:2022}).body.forEach(s=>{if(s.type==='FunctionDeclaration')NAMES.push(s.id.name);if(s.type==='VariableDeclaration')s.declarations.forEach(d=>d.id.type==='Identifier'&&NAMES.push(d.id.name))})}
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
// a fresh, isolated copy of the app (its own globals), with the minimal document stub the existing tests use
const makeApp=()=>{const ctx=vm.createContext({XLSX,console,document:{querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]}});
 vm.runInContext(src+`;globalThis.__api={names:${JSON.stringify(NAMES)},
  val:n=>{try{return eval(n)}catch(e){return '<tdz>'}},setWB:w=>{WB=w},getCFG:()=>CFG,getR:()=>R,run:()=>run(),
  mrp:()=>mrp(),feas:()=>feas(),fcAll:()=>fcAll(),fcCredAll:()=>fcCredAll(),qs:()=>qs(),confAreas:()=>confAreas(),E:CGEngine}`,ctx);
 return vm.runInContext('__api',ctx)};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const safeJSON=v=>{try{return JSON.stringify(v,(k,x)=>typeof x==='function'?'[fn]':x)}catch(e){return '<unserialisable:'+e.message+'>'}};
const snap=A=>{const o={};for(const n of A.names){const v=A.val(n);o[n]={ref:v,hash:sha(String(safeJSON(v)))}}
 const R=A.getR();o['R.memo']={ref:R&&R.memo,hash:sha(String(safeJSON(R&&R.memo)))};o['R.fcm']={ref:R&&R.fcm,hash:sha(String(safeJSON(R&&R.fcm)))};o['R.fcc']={ref:R&&R.fcc,hash:sha(String(safeJSON(R&&R.fcc)))};return o};
const diff=(a,b)=>Object.keys(a).filter(k=>a[k].ref!==b[k].ref||a[k].hash!==b[k].hash);
const CACHE=new Set(['memo','fcm','fcc']);const serR=r=>JSON.stringify(r,function(k,v){return CACHE.has(k)&&this&&typeof this==='object'&&'fg' in this?undefined:v});
const results=(A)=>({r:serR(A.getR()),mrp:JSON.stringify(A.mrp()),feas:JSON.stringify(A.feas()),fc:JSON.stringify(A.fcAll()),fcc:JSON.stringify(A.getR().hasF?A.fcCredAll():null),qs:JSON.stringify(A.qs()),conf:JSON.stringify(A.confAreas())});
const outRes=o=>({r:serR(o.result),mrp:JSON.stringify(o.mrp),feas:JSON.stringify(o.feas),fc:JSON.stringify(o.forecasts),fcc:JSON.stringify(o.forecastCredibility),qs:JSON.stringify(o.clientQuestions),conf:JSON.stringify(o.confidence)});
const eq=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]),which=(a,b)=>Object.keys(a).filter(k=>a[k]!==b[k]).join(',')||'none';

const A=makeApp(),wb=XLSX.readFile(NS,{cellDates:true});A.setWB(wb);A.run();
const before=results(A); // fills the screen caches R.memo, R.fcm, R.fcc, as opening the tabs does
const memoKeys=Object.keys(A.getR().memo||{});
ok(NAMES.length>=90&&memoKeys.length>=2&&A.getR().fcm&&A.getR().fcc,`baseline: ${NAMES.length} top-level names watched; screen caches filled (memo keys ${memoKeys.length}, fcm, fcc)`);
const S0=snap(A);

// (1) successful run
{const o=A.E.runEngine({settings:{z:2.1,hor:6}});const d=diff(S0,snap(A));
 ok(d.length===0,'(1) successful run with overrides: every top-level variable and the screen caches unchanged ('+(d.join(', ')||'no differences')+')');
 ok(o.result.memo&&o.result.memo!==S0['R.memo'].ref&&o.result.fcm!==S0['R.fcm'].ref,'(1) the wrapper\'s caches live on its own result object, not on the screen result')}

// (2) failed runs: engine error part-way, bad settings, nested call
{const broken={SheetNames:['Products'],Sheets:{Products:XLSX.utils.json_to_sheet([{SKU:'X'}])}};
 let e1=null;try{A.E.runEngine({workbook:broken,settings:{z:2.5}})}catch(e){e1=e}
 let e2=null;try{A.E.runEngine({settings:{z:'x'}})}catch(e){e2=e}
 const d=diff(S0,snap(A));ok(e1&&e2&&d.length===0,'(2) failed runs (missing sheets mid-run; bad setting): nothing changed ('+(d.join(', ')||'no differences')+')');
 ok(eq(before,results(A)),'(2) after failures, the screen results and caches give the same answers ('+which(before,results(A))+' differ)')}

// (3) repeated runs with different settings, each compared with a separate untouched copy of the app
{const SETS=[{z:1.28},{z:2.33,excess:60},{hor:3},{hor:12,z:1.65},{late:0},{excess:180,hold:25},{}, {z:1.28}];
 const B=makeApp();B.setWB(XLSX.readFile(NS,{cellDates:true}));let allSame=true,bad=[];
 for(const s of SETS){const o=outRes(A.E.runEngine({settings:s}));
  const cfgB=B.getCFG(),saved={};for(const k in s){saved[k]=cfgB[k];cfgB[k]=s[k]}B.run();const ref=results(B);for(const k in s)cfgB[k]=saved[k];
  if(!eq(o,ref)){allSame=false;bad.push(JSON.stringify(s)+':'+which(o,ref))}}
 ok(allSame,'(3) '+SETS.length+' repeated runs with different settings: each equals a fresh app calculated with those settings ('+(bad.join('; ')||'all identical')+')');
 const d=diff(S0,snap(A));ok(d.length===0,'(3) after the repeated runs: every top-level variable and the screen caches unchanged ('+(d.join(', ')||'no differences')+')')}

// (4) wrapper run followed by the normal run()
{A.E.runEngine({settings:{z:2.4,excess:30}});A.run();const after=results(A);
 const C=makeApp();C.setWB(XLSX.readFile(NS,{cellDates:true}));C.run();const fresh=results(C);
 ok(eq(after,fresh),'(4) wrapper run then run(): results equal a fresh app that never used the wrapper ('+which(after,fresh)+' differ)');
 ok(eq(after,before),'(4) and equal the results before any wrapper run ('+which(after,before)+' differ)');
 ok(A.getCFG().z===C.getCFG().z&&JSON.stringify(A.getCFG())===JSON.stringify(C.getCFG()),'(4) settings equal a fresh app (no override left behind)')}

console.log(`test-a1-state: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
