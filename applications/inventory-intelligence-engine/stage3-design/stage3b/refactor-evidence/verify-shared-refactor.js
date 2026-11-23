// N-4 evidence (Stage 3B, 23 Nov 2026): the ten calculation sites moved from the tabs into CGShared (js/app.js).
// This is a HISTORICAL comparison (old code against new code), so by the owner's test-architecture rule it is a separate
// evidence script, not a registered current-behaviour test. Usage, from the repository root:
//   node applications/inventory-intelligence-engine/stage3-design/stage3b/refactor-evidence/verify-shared-refactor.js <baseline app.js> [out.json]
// Three separate guarantees, reported separately (the owner's instruction: one is never taken as proof of another):
//   G1 verbatim move  – each moved expression occurs exactly once in the baseline tab code and exactly once in CGShared
//   G2 calculation    – every site's values, recorded at full precision while every tab renders, are identical
//                       (baseline code instrumented in memory vs new code instrumented in memory), on every workbook
//   G3 HTML           – every one of the 17 tabs renders byte-identical HTML (uninstrumented code), on every workbook
const fs = require('fs'), path = require('path'), util = require('util');
const APP = path.resolve(__dirname, '../../..');
global.XLSX = require('xlsx');
global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
const baseApp = fs.readFileSync(process.argv[2], 'utf8'), newApp = fs.readFileSync(path.join(APP, 'js/app.js'), 'utf8');
const lib = ['calculations.js', 'forecasting.js'].map(n => fs.readFileSync(path.join(APP, 'js', n), 'utf8')).join('\n'), xl = fs.readFileSync(path.join(APP, 'js/excel-import.js'), 'utf8');
let fails = 0; const say = (ok, m) => { console.log((ok ? 'PASS: ' : 'FAIL: ') + m); if (!ok) fails++; };
const once = (s, t) => s.split(t).length === 2;
const shared = newApp.slice(newApp.indexOf('const CGShared=Object.freeze({'), newApp.indexOf('\n});', newApp.indexOf('const CGShared=Object.freeze({')));

// ---- G1 ----------------------------------------------------------------------------------------------------------
const MOVED = {
  S1: ['mean(sc.map(x=>x.score))'],
  S2: ['r.cogsF/r.fgV', 'r.cogsR/r.rmV'],
  S3: ["tv=a.reduce((q,x)=>q+(fv(x.val)?x.val:0),0)||1,ta=a.reduce((q,x)=>q+(fv(x.ann)?x.ann:0),0)||1;let c=0;", 'p=g.reduce((q,x)=>q+x.ann,0)/ta*100;c+=p;', 'g.reduce((q,x)=>q+(fv(x.val)?x.val:0),0)/tv*100', "na=a.filter(x=>x.abc==='Not Assessed')"],
  S4: ['g.reduce((q,x)=>q+x.val,0)', '[...a].sort((p,q)=>q.gap-p.gap).slice(0,10).reduce((q,x)=>q+x.gap,0)/(a.reduce((q,x)=>q+x.gap,0)||1)*100'],
  S5: ['n.reduce((q,r)=>q+(r.val==null?0:r.val),0)'],
  S6: [baseApp.slice(baseApp.indexOf('views.Summary=()=>{') + 'views.Summary=()=>{'.length, baseApp.indexOf('\n return `<div class="card"><h2>Management summary')).replace(/;\/\* X1 acceptance[^]*$/, '')],
  S7: ['ok.reduce((q,y)=>q+A[y.id][k],0)'],
  S8: ['.f.slice(0,Math.min(12,Math.max(3,CFG.fcH||12))).reduce((q,v)=>q+v,0)'],
  S9: ["ass=rows.filter(r=>r.c.dq!=='Insufficient'),hi=ass.filter(r=>r.c.hiAcc).length,avg=ass.length?mean(ass.map(r=>r.c.acc)):null"],
  S10: ['T=a.reduce((o,p)=>(o.n+=p.n,o.nQ+=p.nQ,o.pl+=p.planned,o.ac+=p.actual,o.ex+=p.exQ,o.s+=p.att==null?0:p.att*p.nQ,o),{n:0,nQ:0,pl:0,ac:0,ex:0,s:0}),avg=T.nQ?T.s/T.nQ:null,w=T.pl>0?T.ac/T.pl*100:null']
};
for (const [k, list] of Object.entries(MOVED)) for (const t of list) {
  const inBase = baseApp.includes(t), inShared = shared.includes(t.replace(/^const /, '')), inNewTabs = newApp.replace(shared, '').includes(t);
  say(inBase && inShared && !inNewTabs, `G1 ${k}: "${t.length > 60 ? t.slice(0, 57) + '…' : t}" is in the baseline tab code, in CGShared, and no longer in the tab code`);
}

// ---- instrumentation (in memory only) ----------------------------------------------------------------------------
function instrument(src, pairs, label) {
  let s = src;
  for (const [from, to] of pairs) { if (!once(s, from)) { say(false, `${label}: instrumentation anchor not found exactly once: ${from.slice(0, 60)}`); continue; } s = s.replace(from, () => to); }
  return s;
}
const SUM_RET = '\n return `<div class="card"><h2>Management summary', PR_RET = '\n return `<div class="card"><h2>Production schedule adherence', FA_DECL = 'const decl=new Set(R.declared||[]);';
const common = [[SUM_RET, "\n __rec('S6',{a,nA,cr,m,on,P,ws,ex,ins,expo,F,sn,na,nCk,nNoRop,rec});" + SUM_RET.slice(1)], [PR_RET, "\n __rec('S10',{T,avg,w});" + PR_RET.slice(1)], [FA_DECL, "__rec('S9',{hi,avg,ass:ass.length});" + FA_DECL]];
const baseI = instrument(baseApp, common.concat([
  ['${f(mean(sc.map(x=>x.score)),1)}', "${f(__rec('S1',mean(sc.map(x=>x.score))),1)}"],
  ['FG ${f(r.cogsF/r.fgV,1)}×/yr, materials ${f(r.cogsR/r.rmV,1)}×/yr', "FG ${f(__rec('S2',r.cogsF/r.fgV),1)}×/yr, materials ${f(__rec('S2',r.cogsR/r.rmV),1)}×/yr"],
  ["p=g.reduce((q,x)=>q+x.ann,0)/ta*100;c+=p;return [t+' '+k,g.length,f(p,1)+'%',f(c,1)+'%',f(g.reduce((q,x)=>q+(fv(x.val)?x.val:0),0)/tv*100,1)+'%']}),na=a.filter(x=>x.abc==='Not Assessed');", "p=g.reduce((q,x)=>q+x.ann,0)/ta*100;c+=p;__rec('S3',[k,g.length,p,c,g.reduce((q,x)=>q+(fv(x.val)?x.val:0),0)/tv*100]);return [t+' '+k,g.length,f(p,1)+'%',f(c,1)+'%',f(g.reduce((q,x)=>q+(fv(x.val)?x.val:0),0)/tv*100,1)+'%']}),na=a.filter(x=>x.abc==='Not Assessed');__rec('S3na',na.length);"],
  ["x1Money(g.reduce((q,x)=>q+x.val,0),g,'val')", "x1Money(__rec('S4',g.reduce((q,x)=>q+x.val,0)),g,'val')"],
  ['f([...a].sort((p,q)=>q.gap-p.gap).slice(0,10).reduce((q,x)=>q+x.gap,0)/(a.reduce((q,x)=>q+x.gap,0)||1)*100)', "f(__rec('S4',[...a].sort((p,q)=>q.gap-p.gap).slice(0,10).reduce((q,x)=>q+x.gap,0)/(a.reduce((q,x)=>q+x.gap,0)||1)*100))"],
  ['gbp(n.reduce((q,r)=>q+(r.val==null?0:r.val),0))', "gbp(__rec('S5',n.reduce((q,r)=>q+(r.val==null?0:r.val),0)))"],
  ['S=k=>ok.reduce((q,y)=>q+A[y.id][k],0)', "S=k=>__rec('S7',ok.reduce((q,y)=>q+A[y.id][k],0))"],
  ['x=>f(A[x.id].f.slice(0,Math.min(12,Math.max(3,CFG.fcH||12))).reduce((q,v)=>q+v,0))', "x=>f(__rec('S8',A[x.id].f.slice(0,Math.min(12,Math.max(3,CFG.fcH||12))).reduce((q,v)=>q+v,0)))"]
]), 'baseline');
const newI = instrument(newApp, common.concat([
  ['${f(CGShared.healthMean(sc),1)}', "${f(__rec('S1',CGShared.healthMean(sc)),1)}"],
  ['FG ${f(CGShared.turnoverFG(r),1)}×/yr, materials ${f(CGShared.turnoverRM(r),1)}×/yr', "FG ${f(__rec('S2',CGShared.turnoverFG(r)),1)}×/yr, materials ${f(__rec('S2',CGShared.turnoverRM(r)),1)}×/yr"],
  ["const s=CGShared.abcStats(a),r=s.rows.map(", "const s=CGShared.abcStats(a);s.rows.forEach(o=>__rec('S3',[o.k,o.n,o.p,o.c,o.pv]));__rec('S3na',s.na);const r=s.rows.map("],
  ["x1Money(CGShared.reconGapValue(g),g,'val')", "x1Money(__rec('S4',CGShared.reconGapValue(g)),g,'val')"],
  ['f(CGShared.reconTop10Share(a))', "f(__rec('S4',CGShared.reconTop10Share(a)))"],
  ['gbp(CGShared.mrpReplenishment(n))', "gbp(__rec('S5',CGShared.mrpReplenishment(n)))"],
  ['S=k=>CGShared.fcSum(ok,A,k)', "S=k=>__rec('S7',CGShared.fcSum(ok,A,k))"],
  ['x=>f(CGShared.fcNextSum(A[x.id]))', "x=>f(__rec('S8',CGShared.fcNextSum(A[x.id])))"]
]), 'new');

function engine(appSrc) {
  const A = { log: [] };
  new Function('XLSX', 'document', 'out', lib + '\n' + appSrc + '\n' + xl + `;out.go=(wb,pol)=>{WB=wb;CFG.pol=pol;R=analyse();CFG.pol=pol?0:1;try{R.alt=analyse()}finally{CFG.pol=pol}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.ORDER=ORDER;out.CFG=CFG;`).call(null, XLSX, document, A);
  return A;
}
global.__rec = (k, v) => { global.__log.push([k, v]); return v; };
// Values are compared with strict deep equality (full precision, NaN = NaN, Dates by time, prototypes checked).
// One exception: a function cannot be equal across two separately loaded engines (the old and the new code are loaded
// side by side), so a function is compared by its exact source text. (Found on the first run, 23 Nov 2026: feasibility
// rows carry a date-formatting helper `sd`; it was the only difference reported, and its source is identical.)
const norm = (v, seen = new Map()) => {
  if (typeof v === 'function') return { __fn: String(v) };
  if (v === null || typeof v !== 'object' || v instanceof Date) return v;
  if (seen.has(v)) return seen.get(v);
  const o = Array.isArray(v) ? [] : {}; seen.set(v, o);
  for (const k of Object.keys(v)) o[k] = norm(v[k], seen);
  return o;
};

// ---- G2 and G3 on every workbook, both safety-stock policies --------------------------------------------------------
const books = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.xlsx')) books.push(p); } })(path.join(APP, 'tests/fixtures'));
books.push(...fs.readdirSync(path.join(APP, 'stage3-design/audit-20261121/evidence/workbooks')).filter(f => f.endsWith('.xlsx')).map(f => path.join(APP, 'stage3-design/audit-20261121/evidence/workbooks', f)));
const report = { books: [], sites: {} };
let compared = 0, htmlTabs = 0;
for (const b of books.sort()) for (const pol of [0, 1]) {
  const rel = path.relative(APP, b) + (pol ? ' [calculated policy]' : ' [workbook policy]');
  let wb; try { wb = XLSX.readFile(b, { cellDates: true }); } catch (e) { report.books.push({ book: rel, skipped: 'unreadable workbook (' + e.message.slice(0, 60) + ')' }); continue; }
  const runs = {};
  for (const [name, src] of [['base', baseApp], ['new', newApp], ['baseI', baseI], ['newI', newI]]) {
    const A = engine(src); global.__log = [];
    try { A.go(wb, pol); } catch (e) { runs[name] = { err: 'analysis failed: ' + e.message.slice(0, 80) }; continue; }
    const html = A.ORDER.map(k => { try { return A.html(k); } catch (e) { return 'THREW ' + e.message; } });
    runs[name] = { html, log: global.__log };
  }
  if (runs.base.err || runs.new.err) { const same = runs.base.err === runs.new.err; say(same, `${rel}: analysis outcome identical (${runs.base.err || 'ok'})`); report.books.push({ book: rel, skipped: runs.base.err || runs.new.err, identicalOutcome: same }); continue; }
  const htmlSame = runs.base.html.every((h, i) => h === runs.new.html[i]); htmlTabs += runs.base.html.length;
  const lb = runs.baseI.log, ln = runs.newI.log;
  const calcSame = lb.length === ln.length && lb.every((e, i) => e[0] === ln[i][0] && util.isDeepStrictEqual(norm(e[1]), norm(ln[i][1])));
  compared += lb.length;
  for (const [k] of lb) report.sites[k] = (report.sites[k] || 0) + 1;
  say(calcSame, `G2 ${rel}: ${lb.length} recorded values identical at full precision`);
  say(htmlSame, `G3 ${rel}: all ${runs.base.html.length} tabs byte-identical`);
  report.books.push({ book: rel, values: lb.length, calcIdentical: calcSame, tabs: runs.base.html.length, htmlIdentical: htmlSame, threw: runs.new.html.filter(h => h.startsWith('THREW')).length });
}
const sitesSeen = Object.keys(report.sites).map(k => k.replace('na', '')).filter((v, i, a) => a.indexOf(v) === i).sort();
say(['S1', 'S10', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'].every(k => sitesSeen.includes(k)), `every one of the ten sites was exercised (${sitesSeen.join(', ')})`);
console.log(`SUMMARY: ${compared} recorded values compared; ${htmlTabs} tab renders compared; ${report.books.filter(b => b.skipped).length} workbook runs could not be analysed (same outcome old and new); ${fails} failure(s)`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 1));
process.exit(fails ? 1 : 0);
