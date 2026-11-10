// v0.7 checkpoint A1: tests for the Phase 1 engine wrapper (js/engine/engine-api.js).
// Run from tests/: NODE_PATH=<node_modules with xlsx> node test-a1-wrapper.js
// Checks:
//  1. The five scripts load with no page at all (no document), and CGEngine exists.
//  2. On every fixture workbook (17), runEngine() gives the same result, MRP, feasibility, forecasts, forecast credibility,
//     client questions and confidence areas as the existing app.js run() path.
//  3. CFG, R and WB are exactly as before after every call (same values, same objects), and the workbook is not changed.
//  4. Settings overrides are applied only inside the call and give the same result as setting CFG and calling run().
//  5. Errors (bad settings, a broken workbook, a calculation that throws) leave CFG, R and WB untouched.
//  6. A second call while one is running is refused (ENGINE_BUSY) and nothing is left changed.
//  7. Results are frozen.
//  8. 1,000 random valid setting overrides on a small fixture: globals and the source workbook never change.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),FILES=['calculations','forecasting','app','excel-import','engine/engine-api'];
const src=FILES.map(n=>fs.readFileSync(path.join(ROOT,'js',n+'.js'),'utf8')).join('\n');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;if(!c||process.env.VERBOSE)console.log((c?'PASS ':'FAIL ')+m)};
const XLSX=require('xlsx');

// 1. no page at all, in a fresh context
{const ctx=vm.createContext({XLSX,console});let err=null;try{vm.runInContext(src,ctx)}catch(e){err=e}
 ok(!err,'all 5 scripts load with no document'+(err?': '+err.message:''));
 ok(!err&&vm.runInContext("typeof CGEngine==='object'&&typeof CGEngine.runEngine==='function'&&CGEngine.version==='v0.7-a1'",ctx),'CGEngine.runEngine exists without a page')}

// the existing test harness pattern: shared global scope, minimal document stub so app.js run()/show() can be used as the reference
global.XLSX=XLSX;global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
(0,eval)(src+`;globalThis.__h={
 get:()=>({CFG,R,WB}),setWB:w=>{WB=w},run:()=>run(),mrp:()=>mrp(),feas:()=>feas(),fcAll:()=>fcAll(),fcCredAll:()=>fcCredAll(),qs:()=>qs(),confAreas:()=>confAreas(),
 CFG0:()=>CFG0,SETDEF:()=>SETDEF,engine:()=>CGEngine,getLink:()=>link,setLink:f=>{link=f}}`);
const H=globalThis.__h,E=H.engine();
const CACHE=new Set(['memo','fcm','fcc']);
const ser=(o,dropCache)=>JSON.stringify(o,function(k,v){return dropCache&&CACHE.has(k)&&this&&typeof this==='object'&&'fg' in this?undefined:v});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const state=()=>{const g=H.get();return {cfg:JSON.stringify(g.CFG),r:g.R,rHash:sha(ser(g.R,false)),wb:g.WB,wbHash:sha(JSON.stringify(g.WB.Sheets))}};
const same=(a,b)=>a.cfg===b.cfg&&a.r===b.r&&a.rHash===b.rHash&&a.wb===b.wb&&a.wbHash===b.wbHash;
const load=f=>XLSX.readFile(f,{cellDates:true});

// 2-3. every fixture
const FX=['fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx',...['edge','structure','suppliers'].flatMap(d=>fs.readdirSync(path.join(__dirname,'fixtures',d)).filter(f=>f.endsWith('.xlsx')).map(f=>'fixtures/'+d+'/'+f))];
ok(FX.length===17,'17 fixture workbooks found ('+FX.length+')');
for(const f of FX){const name=path.basename(f);H.setWB(load(path.join(__dirname,f)));H.run();
 const ref={result:ser(H.get().R,true),mrp:JSON.stringify(H.mrp()),feas:JSON.stringify(H.feas()),fc:JSON.stringify(H.fcAll()),fcc:H.get().R.hasF?JSON.stringify(H.fcCredAll()):'null',qs:JSON.stringify(H.qs()),conf:JSON.stringify(H.confAreas())};
 const before=state();const t0=Date.now();const out=E.runEngine();const ms=Date.now()-t0;const after=state();
 ok(ser(out.result,true)===ref.result,name+': result identical to run() (R without caches)');
 ok(JSON.stringify(out.mrp)===ref.mrp&&JSON.stringify(out.feas)===ref.feas,name+': MRP and feasibility identical');
 ok(JSON.stringify(out.forecasts)===ref.fc&&JSON.stringify(out.forecastCredibility)===ref.fcc,name+': forecasts and forecast credibility identical');
 ok(JSON.stringify(out.clientQuestions)===ref.qs&&JSON.stringify(out.confidence)===ref.conf,name+': client questions and confidence areas identical');
 ok(same(before,after),name+': CFG, R and WB unchanged (same objects, same contents)');
 ok(out.result!==H.get().R,name+': wrapper result is a separate object from the screen result R');
 if(process.env.VERBOSE)console.log('   '+name+' runEngine '+ms+' ms')}

// 4. settings overrides
{H.setWB(load(path.join(__dirname,FX[0])));H.run();const base=state(),z0=H.get().CFG.z,x0=H.get().CFG.excess;
 const out=E.runEngine({settings:{z:1.9,excess:120}});const after=state();
 ok(same(base,after)&&H.get().CFG.z===z0,'override z=1.9, excess=120: CFG, R and WB unchanged afterwards');
 // reference: set CFG directly and use run(), then put everything back
 const g=H.get();g.CFG.z=1.9;g.CFG.excess=120;H.run();const ref=ser(H.get().R,true),refM=JSON.stringify(H.mrp());g.CFG.z=z0;g.CFG.excess=x0;H.run();
 ok(ser(out.result,true)===ref&&JSON.stringify(out.mrp)===refM,'override result identical to setting CFG and calling run()');
 ok(ser(out.result,true)!==ser(H.get().R,true),'override result differs from the baseline result (the override took effect)')}

// 5. errors leave everything untouched
{const base=state();const tryIt=(fn,code)=>{let e=null;try{fn()}catch(x){e=x}return e&&(!code||e.code===code)};
 ok(tryIt(()=>E.runEngine({settings:{notASetting:1}}),'BAD_ARGS')&&same(base,state()),'unknown setting refused (BAD_ARGS), nothing changed');
 ok(tryIt(()=>E.runEngine({settings:{z:NaN}}),'BAD_ARGS')&&tryIt(()=>E.runEngine({settings:{z:'2'}}),'BAD_ARGS')&&tryIt(()=>E.runEngine({settings:[1]}),'BAD_ARGS')&&same(base,state()),'non-numeric, NaN and array settings refused, nothing changed');
 ok(tryIt(()=>E.runEngine({workbook:null}),'NO_WORKBOOK')&&same(base,state()),'missing workbook refused (NO_WORKBOOK), nothing changed');
 const broken={SheetNames:['Products'],Sheets:{Products:XLSX.utils.json_to_sheet([{SKU:'X'}])}};
 let msg='';try{E.runEngine({workbook:broken,settings:{z:2.2}})}catch(e){msg=e.message}
 ok(/Missing sheet/.test(msg)&&same(base,state()),'engine error mid-run ("'+msg.slice(0,40)+'"): CFG (including the override), R and WB restored');
 ok(!E.isBusy(),'not left busy after an error')}

// 6. re-entrancy
{const base=state(),orig=H.getLink();let inner=null;
 H.setLink(function(){try{E.runEngine()}catch(e){inner=e.code}return orig.apply(this,arguments)});
 let outer=null;try{E.runEngine({settings:{z:2}})}catch(e){outer=e}finally{H.setLink(orig)}
 ok(inner==='ENGINE_BUSY'&&!outer,'a second call during a run is refused with ENGINE_BUSY; the first completes');
 ok(same(base,state())&&!E.isBusy(),'after the refused nested call: CFG, R, WB unchanged and not busy')}

// 7. frozen results
{const out=E.runEngine();let threw=false;try{(function(){'use strict';out.result.fg[0].oh=-1})()}catch(e){threw=e instanceof TypeError}
 ok(threw&&Object.isFrozen(out)&&Object.isFrozen(out.result.fg)&&Object.isFrozen(out.mrp),'results are frozen (writing to them throws in strict mode)')}

// 8. 1,000 random calls on a small fixture
{const small=FX.find(f=>/scenario-s0/.test(f));H.setWB(load(path.join(__dirname,small)));H.run();const base=state();
 const defs=H.SETDEF().filter(d=>typeof H.CFG0()[d[0]]==='number');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 let changed=0,errors=0;const t0=Date.now();
 for(let i=0;i<1000;i++){const s={};const n=1+Math.floor(rnd()*3);for(let j=0;j<n;j++){const [k,,min,max,step]=defs[Math.floor(rnd()*defs.length)];let v=min+rnd()*(max-min);v=step>=1?Math.round(v):Math.round(v*100)/100;s[k]=v}
  try{E.runEngine({settings:s})}catch(e){errors++}
  if(!same(base,state()))changed++}
 ok(changed===0,'1,000 random setting overrides on '+path.basename(small)+': CFG, R and WB unchanged after every call ('+changed+' changed, '+errors+' calls threw, '+(Date.now()-t0)+' ms)')}

console.log(`test-a1-wrapper: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
