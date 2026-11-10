// Candidate 3 (A4): cached MRP, production feasibility, Summary and Forecast accuracy must always equal a fresh calculation.
const fs=require('fs'),path=require('path'),crypto=require('crypto');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__T={load:w=>{WB=w;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link()},views,mrp,feas,mrpCalc,feasCalc,fcCredAll,fcAll,CFG,CFG0,set tab(v){tab=v},get R(){return R}}');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};const H=s=>crypto.createHash('md5').update(s).digest('hex');
const J=o=>JSON.stringify(o,(k,v)=>v instanceof Date?+v:v),T=__T;
T.load(XLSX.readFile(path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),{cellDates:true}));
const v=k=>{T.tab=k;return H(T.views[k]())};
ok(T.mrp()===T.mrp(),'mrp(): second call returns the cached result');ok(T.feas()===T.feas(),'feas(): second call returns the cached result');
ok(J(T.mrp())===J(T.mrpCalc()),'mrp(): cached result equals a fresh calculation');ok(J(T.feas())===J(T.feasCalc()),'feas(): cached result equals a fresh calculation');
ok(T.fcCredAll()===T.fcCredAll()&&T.fcAll()===T.fcAll(),'forecast accuracy results cached');
const base={};['MRP','Summary','Production feasibility','Forecast accuracy'].forEach(k=>base[k]=v(k));
ok(['MRP','Summary','Production feasibility','Forecast accuracy'].every(k=>v(k)===base[k]),'views render identically on repeated visits');
// the MRP view sorts its rows: that must not reorder the cached list
const order=T.mrp().map(r=>r.x.id).join();T.views.MRP();ok(T.mrp().map(r=>r.x.id).join()===order,'MRP view sorting does not reorder the cached list');
// changing a setting that feeds the calculation gives a different, correct result (cache is keyed on the settings)
const hor0=T.CFG.hor;T.CFG.hor=hor0===6?3:6;const m2=T.mrp();ok(J(m2)===J(T.mrpCalc()),'mrp(): result after changing the planning horizon equals a fresh calculation');
T.CFG.hor=hor0;ok(J(T.mrp())===J(T.mrpCalc()),'mrp(): result after restoring the horizon equals a fresh calculation');
const sup0=T.CFG.sup;[0,1,2].forEach(s=>{T.CFG.sup=s;ok(J(T.feas())===J(T.feasCalc())&&J(T.mrp())===J(T.mrpCalc()),'feas()/mrp() correct with supply source '+s)});T.CFG.sup=sup0;
const hv=T.mrp().map(r=>r.net).join();T.CFG.hor=hor0===6?3:6;ok(T.mrp().map(r=>r.net).join()!==hv,'a different horizon really gives different MRP quantities (so the key is exercised)');T.CFG.hor=hor0;
// recalculation (new data or settings applied) replaces the cache
const old=T.mrp();T.load(XLSX.readFile(path.join(__dirname,'fixtures/edge/scenario-combined.xlsx'),{cellDates:true}));ok(T.mrp()!==old&&J(T.mrp())===J(T.mrpCalc()),'after a new import the cache is rebuilt for the new data');
ok(Object.keys(T.R.memo).length>=1,'cache lives on the results object, so a new analysis starts empty');
console.log(`test-cache: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
