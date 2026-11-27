/* Chain Genius – Inventory Intelligence Engine, v0.7 checkpoint A1
 * engine/engine-api.js
 * Phase 1 engine wrapper: the single entry point new (v0.7) code uses to run the existing v0.6 engine.
 *
 * Why it exists: the v0.6 engine reads its settings (CFG), its input (WB) and its last result (R) from shared globals.
 * runEngine() puts a copy of the requested settings (and optionally another workbook) in place, runs exactly the same
 * calculation sequence as app.js run(), collects the results, and then restores CFG, R and WB, also when an error occurs.
 *
 * Safe only because the engine is synchronous: nothing else can run while runEngine() is running.
 * tests/test-a1-no-async.js fails if calculations.js, forecasting.js or this file ever contain asynchronous code.
 *
 * It does not change any v0.6 formula, file or screen. The 17 tabs keep using R exactly as before.
 * Plain script (no build step). Loaded last in index.html, after excel-import.js.
 */
const CGEngine=(()=>{
  'use strict';
  let busy=false;

  const fail=(code,message)=>{const e=new Error(message);e.code=code;return e};

  // Freeze a result and everything inside it, so callers cannot change it by accident.
  // (A Date inside stays changeable through its own methods, e.g. setTime(); results are read-only by convention for those.)
  const deepFreeze=root=>{const seen=new Set(),stack=[root];
    while(stack.length){const o=stack.pop();if(o===null||typeof o!=='object'||seen.has(o))continue;seen.add(o);Object.freeze(o);
      for(const k of Object.keys(o))stack.push(o[k])}
    return root};

  // Settings overrides: only existing setting names, only finite numbers. Range checks belong to the approved calculation list (A2).
  const checkSettings=s=>{if(s===undefined||s===null)return {};
    if(typeof s!=='object'||Array.isArray(s))throw fail('BAD_ARGS','settings must be an object of setting names and numbers');
    for(const [k,v] of Object.entries(s)){
      if(!Object.prototype.hasOwnProperty.call(CFG0,k))throw fail('BAD_ARGS','unknown setting: '+k);
      if(typeof v!=='number'||!isFinite(v))throw fail('BAD_ARGS','setting '+k+' must be a finite number')}
    return s};

  // runEngine({settings, workbook})
  //   settings: optional partial overrides of the current settings, e.g. {z:1.9}. The current CFG values are the base.
  //   workbook: optional SheetJS workbook to analyse instead of the currently loaded one (WB).
  // Returns a frozen object: {result, mrp, feas, forecasts, forecastCredibility, clientQuestions, confidence}.
  //   result is what app.js run() would put in R for the same workbook and settings.
  function runEngine(opts){
    opts=opts||{};
    if(busy)throw fail('ENGINE_BUSY','a calculation is already running');
    const over=checkSettings(opts.settings);
    const wb=opts.workbook===undefined?WB:opts.workbook;
    if(!wb||!wb.Sheets)throw fail('NO_WORKBOOK','no workbook is loaded');
    busy=true;
    const keys=Object.keys(over),savedVals=keys.map(k=>CFG[k]),savedR=typeof R==='undefined'?undefined:R,savedWB=WB;
    try{
      keys.forEach(k=>{CFG[k]=over[k]});
      WB=wb;
      // --- the calculation sequence of app.js run(), without the screen updates ---
      R=analyse();
      const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}
      const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}
      link();
      // --- results the tabs work out on demand, collected while this result is in place ---
      const out={result:R,mrp:mrp(),feas:feas(),forecasts:fcAll(),forecastCredibility:R.hasF?fcCredAll():null,clientQuestions:qs(),confidence:confAreas()}; /* X1 WP4 (20 Nov 2026): when js/validation/x1-integrity.js is loaded, attach field states, provenance, calendar history and dependency assessment as out.integrity (outside result, so route comparisons are unaffected). opts.integrity: a record built by CGValidation.fromImport on the import route. It changes no figure; a failure of the check itself is reported, never hidden as success. */const V=globalThis.CGValidation;if(V&&typeof V.forRun==='function'){if(opts.integrity!==undefined&&!(opts.integrity&&opts.integrity.route==='import'&&Array.isArray(opts.integrity.records)))throw fail('BAD_INTEGRITY','opts.integrity must be a record from CGValidation.fromImport');try{out.integrity=V.forEngineResult({workbook:wb,XLSX:globalThis.XLSX,imported:opts.integrity,result:R,sup:CFG.sup,pol:CFG.pol})}catch(e){out.integrity=Object.freeze({status:'integrity check failed',error:String(e&&e.message||e)})}}
      return deepFreeze(out);
    }finally{
      keys.forEach((k,i)=>{CFG[k]=savedVals[i]});
      R=savedR;WB=savedWB;busy=false;
    }
  }

  // current() (Stage 3B Phase 0, 22 Nov 2026): the results ALREADY calculated for the screen, for the view layer
  //   (js/views/contract.js). It runs no calculation and changes nothing. Unlike runEngine() the objects are not frozen,
  //   because app.js still memoises into R; the view layer only reads them, and tests/test-view-contract.js proves that.
  //   Returns {result, settings (a frozen copy of CFG), settingDefs, mrp, feas, forecasts, forecastCredibility,
  //   clientQuestions, confidence, x1Sum (the X1/D4 partial-total helper), shared (CGShared: the shared derived figures
  //   that the existing tabs also use; Stage 3B N-4, 23 Nov 2026)}.
  function current(){
    if(typeof R==='undefined'||!R||!R.fg)throw fail('NO_RESULT','no analysis has been run');
    return Object.freeze({result:R,settings:Object.freeze(Object.assign({},CFG)),settingDefs:SETDEF,mrp:mrp(),feas:feas(),forecasts:fcAll(),forecastCredibility:R.hasF?fcCredAll():null,clientQuestions:qs(),confidence:confAreas(),x1Sum:x1Sum,shared:CGShared,coverBands:bucket,methodNames:FNAME});
  }

  // currentResult() (Stage 3B, 23 Nov 2026): the result object now on screen, or null; lets the new interface notice a new
  //   analysis cheaply (no MRP/forecast collection). Read-only by convention, like current().
  function currentResult(){return typeof R==='undefined'||!R||!R.fg?null:R}

  /* duplicates (Stage 3B Phase 3, owner rules A–C, 25 Nov 2026): the customer's decisions on product-months recorded on more
   * than one row. Stored in this browser only (localStorage key below), under the dataset fingerprint of the loaded workbook
   * (calculations.js prepDemand: dsId), so one dataset's decisions never touch another's. A decision records the exact records it
   * was made on (group fingerprint) and, for a chosen record, that record's own fingerprint: it applies only while the group still
   * holds exactly those records, whatever their order; otherwise the engine returns the group for review. Kept in this browser;
   * the customer can download them as a file and load it again (another browser, or after site data is cleared). When browser
   * storage is unavailable they last only until the page is closed (storageOK() says which). KNOWN-LIMITATIONS 22. */
  /* Storage format v2 (Phase 3 follow-up, owner decision 27 Nov 2026): {version:2, sets:{datasetId:{key:decision}}, meta:{datasetId:{label,
     saved,products}}}. A decision is {v:2, g:group fingerprint, n:records, c:'accept'|'row'|'exclude', f:record fingerprint, at:date}.
     The 25 Nov 2026 key (v1) is still read, so nothing saved then is lost; the next save writes v2 and removes v1. */
  const DKEY='scie.duplicateDecisions.v2',DKEY1='scie.duplicateDecisions.v1',FORMAT='scie-duplicate-decisions';
  let storeOK=false;DUPDEC.meta=DUPDEC.meta||{};
  const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
  const okDec=d=>isObj(d)&&typeof d.g==='string'&&d.g.length<=64&&Number.isInteger(d.n)&&d.n>1&&d.n<100000&&['accept','row','exclude'].includes(d.c)&&(d.f===null||d.f===undefined||(typeof d.f==='string'&&d.f.length<=64));
  /* keep only well-formed entries: a damaged or hand-edited store can never apply a decision it does not describe exactly */
  const clean=sets=>{const out={};if(!isObj(sets))return out;Object.keys(sets).forEach(ds=>{if(typeof ds!=='string'||ds.length>64||!isObj(sets[ds]))return;const o={};Object.keys(sets[ds]).forEach(k=>{if(k.length<=200&&okDec(sets[ds][k]))o[k]=Object.assign({},sets[ds][k])});if(Object.keys(o).length)out[ds]=o});return out};
  const loadDec=()=>{try{if(typeof localStorage==='undefined'){DUPDEC.sets={};storeOK=false;return}
    const s2=localStorage.getItem(DKEY),s1=localStorage.getItem(DKEY1),o2=s2?JSON.parse(s2):null,o1=s1?JSON.parse(s1):null;
    DUPDEC.sets=Object.assign({},clean(o1),clean(o2&&o2.sets));DUPDEC.meta=isObj(o2&&o2.meta)?o2.meta:{};storeOK=true}catch(e){DUPDEC.sets={};DUPDEC.meta={};storeOK=false}};
  const saveDec=()=>{try{if(typeof localStorage==='undefined')return false;localStorage.setItem(DKEY,JSON.stringify({version:2,sets:DUPDEC.sets,meta:DUPDEC.meta}));localStorage.removeItem(DKEY1);return true}catch(e){return false}};
  loadDec();
  const need=()=>{const r=currentResult();if(!r)throw fail('NO_RESULT','no analysis has been run');return r};
  const touch=r=>{DUPDEC.meta[r.dsId]={label:String(r.title||'').slice(0,120),saved:new Date().toISOString().slice(0,10),products:(r.fg||[]).length}};
  /* decide(key, choice, recordFp): choice 'accept' (the first row, as shown by default), 'row' (the record with fingerprint
     recordFp) or 'exclude' (no value for the month). Records the decision only: the caller re-runs the analysis (the screen calls run()). */
  function decide(key,choice,fp){
    const r=need(),g=(r.dups||[]).find(x=>x.key===key);if(!g)throw fail('BAD_ARGS','no duplicate group '+key);
    if(!['accept','row','exclude'].includes(choice))throw fail('BAD_ARGS','choice must be accept, row or exclude');
    const f=choice==='accept'?g.rows[0].fp:choice==='row'?fp:null;
    if(choice==='row'&&!g.rows.some(x=>x.fp===fp))throw fail('BAD_ARGS','that record is not in this group');
    const set=DUPDEC.sets[r.dsId]||(DUPDEC.sets[r.dsId]={});
    set[key]={v:2,g:g.gfp,n:g.rows.length,c:choice,f,at:new Date().toISOString().slice(0,10)};
    if(r.dsId0&&DUPDEC.sets[r.dsId0]){delete DUPDEC.sets[r.dsId0][key];if(!Object.keys(DUPDEC.sets[r.dsId0]).length)delete DUPDEC.sets[r.dsId0]}
    touch(r);return {saved:saveDec()}}
  /* forget(key): remove the decision; the group returns to review with the first-row default. */
  function forget(key){const r=need();[r.dsId,r.dsId0].forEach(ds=>{const set=DUPDEC.sets[ds];if(set&&set[key]){delete set[key];if(!Object.keys(set).length)delete DUPDEC.sets[ds]}});return {saved:saveDec()}}
  /* related(): decisions saved for OTHER datasets (e.g. this workbook before a product was added) that match one of this workbook's
     duplicate groups EXACTLY (same product, month and record fingerprints). Nothing is applied until the customer adopts them. */
  function related(){const r=need(),out=[];Object.keys(DUPDEC.sets).forEach(ds=>{if(ds===r.dsId||ds===r.dsId0)return;const set=DUPDEC.sets[ds],keys=(r.dups||[]).filter(g=>{const d=set[g.key];return d&&d.v===2&&d.g===g.gfp&&!(DUPDEC.sets[r.dsId]||{})[g.key]}).map(g=>g.key);if(keys.length)out.push({dataset:ds,label:(DUPDEC.meta[ds]||{}).label||'',saved:(DUPDEC.meta[ds]||{}).saved||'',matches:keys.length,keys})});return out.sort((a,b)=>b.matches-a.matches)}
  /* adopt(dataset): copy into this dataset only the decisions from that dataset whose records match exactly. */
  function adopt(ds){const r=need(),rel=related().find(x=>x.dataset===ds);if(!rel)throw fail('BAD_ARGS','no matching decisions from that dataset');const set=DUPDEC.sets[r.dsId]||(DUPDEC.sets[r.dsId]={});rel.keys.forEach(k=>{set[k]=Object.assign({},DUPDEC.sets[ds][k])});touch(r);return {adopted:rel.keys.length,saved:saveDec()}}
  /* exportText(): every saved decision (all datasets) as a JSON file, so they can be restored after browser storage is cleared or
     carried to another browser. importText(text): merge a file made by exportText; per decision the later date wins. A malformed
     file changes nothing. Imported decisions still apply only where the records match exactly. */
  function exportText(){return JSON.stringify({format:FORMAT,version:2,exported:new Date().toISOString(),sets:DUPDEC.sets,meta:DUPDEC.meta},null,1)}
  function importText(text){let o;try{o=JSON.parse(String(text))}catch(e){throw fail('BAD_ARGS','this is not a decisions file (not valid JSON)')}
    if(!isObj(o)||o.format!==FORMAT||o.version!==2)throw fail('BAD_ARGS','this is not a decisions file made by this tool');
    const inc=clean(o.sets);let added=0,kept=0;Object.keys(inc).forEach(ds=>{const set=DUPDEC.sets[ds]||(DUPDEC.sets[ds]={});Object.keys(inc[ds]).forEach(k=>{const a=set[k],b=inc[ds][k];if(!a||String(b.at||'')>String(a.at||'')){set[k]=b;added++}else kept++});if(isObj(o.meta)&&isObj(o.meta[ds])&&!DUPDEC.meta[ds])DUPDEC.meta[ds]={label:String(o.meta[ds].label||'').slice(0,120),saved:String(o.meta[ds].saved||'').slice(0,10),products:Number(o.meta[ds].products)||0}});
    return {added,kept,saved:saveDec()}}
  const count=()=>Object.values(DUPDEC.sets).reduce((a,s)=>a+Object.keys(s).length,0);
  const duplicates=Object.freeze({decide,forget,related,adopt,exportText,importText,count,reload:loadDec,storageOK:()=>storeOK,key:DKEY});
  return Object.freeze({runEngine,current,currentResult,duplicates,isBusy:()=>busy,version:'v0.7-a1'});
})();
