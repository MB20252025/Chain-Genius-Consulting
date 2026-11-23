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
    return Object.freeze({result:R,settings:Object.freeze(Object.assign({},CFG)),settingDefs:SETDEF,mrp:mrp(),feas:feas(),forecasts:fcAll(),forecastCredibility:R.hasF?fcCredAll():null,clientQuestions:qs(),confidence:confAreas(),x1Sum:x1Sum,shared:CGShared,coverBands:bucket});
  }

  // currentResult() (Stage 3B, 23 Nov 2026): the result object now on screen, or null; lets the new interface notice a new
  //   analysis cheaply (no MRP/forecast collection). Read-only by convention, like current().
  function currentResult(){return typeof R==='undefined'||!R||!R.fg?null:R}

  return Object.freeze({runEngine,current,currentResult,isBusy:()=>busy,version:'v0.7-a1'});
})();
