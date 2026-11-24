// N-4 evidence for S12–S15 (Stage 3B Phase 2 completion, 24 Nov 2026): four displayed calculations moved from their tabs
// into CGShared (js/app.js): S12 fcRange3 (Demand forecast '3m range (80%)'), S13 biasValue (Forecast accuracy 'Bias £ at
// cost'), S14 faConsistency (Forecast accuracy 'unusually consistent accuracy' warning and its %), S15 ropWhy (Reorder
// policy 'Why' explanations). Same method, same three guarantees and the same tolerance (strict deep equality at full
// precision; functions by source text) as verify-shared-refactor.js (S1–S10) and verify-s11-refactor.js (S11).
// HISTORICAL comparison (old code against new code): a separate evidence script, not a registered current-behaviour test.
// Usage, from the repository root:
//   node applications/inventory-intelligence-engine/stage3-design/stage3b/refactor-evidence/verify-s12-s15-refactor.js <baseline app.js> [out.json]
//   G1 verbatim move  – each moved expression is in the baseline tab code, in CGShared (with the tab's own operand
//                       renamed to the function's parameter, listed), and no longer in the tab code
//   G2 calculation    – (a) values recorded at full precision while every tab renders, identical baseline vs new; and
//                       (b) full population: the baseline's own expressions (copied from the baseline source text) and the
//                       new shared functions, run in their engines over EVERY product/item (the tabs page their tables,
//                       so (a) alone sees only the first page), plus S14 over a sweep of settings and counts
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
const tabs = newApp.replace(shared, '');

// ---- G1 ----------------------------------------------------------------------------------------------------------
const W0 = " why=x=>{if(/^Not Assessed/.test(x.verdict))", WEND = ":'Within ±20% of the calculated value.'};";
const wi = baseApp.indexOf(W0), wj = baseApp.indexOf(WEND, wi), WHY = wi > 0 && wj > 0 ? baseApp.slice(wi + ' why='.length, wj + WEND.length - 1) : null;
const MOVED = [
  ['S12', 'Math.max(0,A[x.id].s3-1.28*A[x.id].rm*Math.sqrt(3))', [['A[x.id]', 'F']]],
  ['S12', 'A[x.id].s3+1.28*A[x.id].rm*Math.sqrt(3)', [['A[x.id]', 'F']]],
  ['S13', 'x.x.fcu*x.x.cost', [['x.x.', 'x.']]],
  ['S14', 'ass.length&&hi/ass.length>=CFG.fcHighShare/100', []],
  ['S14', 'hi/ass.length*100', []],
  ['S15', WHY || '(baseline why() not found)', []],
  ['S15', "V={ins:'Existing ROP insufficient',exc:'Existing ROP possibly excessive',ok:'Broadly aligned'}", []]
];
for (const [k, t, ren] of MOVED) {
  const inShared = ren.reduce((s, [a, b]) => s.split(a).join(b), t), label = t.length > 60 ? t.slice(0, 57) + '…' : t;
  const gone = k === 'S15' && t.startsWith('V=') ? true : !tabs.includes(t); // the verdict names stay in the tab too (its filter uses them)
  say(baseApp.includes(t) && shared.includes(inShared) && gone, `G1 ${k}: "${label}" is in the baseline tab code, in CGShared${ren.length ? ` (as ${ren.map(([a, b]) => `${a}→${b}`).join(', ')})` : ''}${k === 'S15' && t.startsWith('V=') ? '' : ', and no longer in the tab code'}`);
}

// ---- instrumentation (in memory only) ----------------------------------------------------------------------------
function instrument(src, pairs, label) {
  let s = src;
  for (const [from, to] of pairs) { if (!once(s, from)) { say(false, `${label}: instrumentation anchor not found exactly once: ${from.slice(0, 70)}`); continue; } s = s.replace(from, () => to); }
  return s;
}
const baseI = instrument(baseApp, [
  ["['3m range (80%)',x=>f(Math.max(0,A[x.id].s3-1.28*A[x.id].rm*Math.sqrt(3)))+'–'+f(A[x.id].s3+1.28*A[x.id].rm*Math.sqrt(3))]", "['3m range (80%)',x=>{__rec('S12',[Math.max(0,A[x.id].s3-1.28*A[x.id].rm*Math.sqrt(3)),A[x.id].s3+1.28*A[x.id].rm*Math.sqrt(3)]);return f(Math.max(0,A[x.id].s3-1.28*A[x.id].rm*Math.sqrt(3)))+'–'+f(A[x.id].s3+1.28*A[x.id].rm*Math.sqrt(3))}]"],
  ["gbp(x.x.fcu*x.x.cost)", "gbp(__rec('S13',x.x.fcu*x.x.cost))"],
  [",many=ass.length&&hi/ass.length>=CFG.fcHighShare/100;", ",many=ass.length&&hi/ass.length>=CFG.fcHighShare/100;__rec('S14',[many,hi/ass.length*100]);"],
  [" why=x=>{if(/^Not Assessed/.test(x.verdict))", " why=x=>__rec('S15',(x=>{if(/^Not Assessed/.test(x.verdict))"],
  [WEND, ":'Within ±20% of the calculated value.'})(x));"]
], 'baseline');
const newI = instrument(newApp, [
  ["const g=CGShared.fcRange3(A[x.id]);", "const g=CGShared.fcRange3(A[x.id]);__rec('S12',[g.lo,g.hi]);"],
  ["gbp(CGShared.biasValue(x.x))", "gbp(__rec('S13',CGShared.biasValue(x.x)))"],
  [",{many,share}=CGShared.faConsistency(ass,hi);", ",{many,share}=CGShared.faConsistency(ass,hi);__rec('S14',[many,share]);"],
  [" why=x=>CGShared.ropWhy(x);", " why=x=>__rec('S15',CGShared.ropWhy(x));"]
], 'new');
// full-population hooks: the baseline's own expressions (copied from its source text) vs the new shared functions
const POP_BASE = `;out.pop=(sweep)=>{const A=fcAll(),ok=R.fg.filter(x=>A[x.id]&&A[x.id].ok),V={ins:'Existing ROP insufficient',exc:'Existing ROP possibly excessive',ok:'Broadly aligned'},why=${WHY};
 return {S12:ok.map(x=>[x.id,Math.max(0,A[x.id].s3-1.28*A[x.id].rm*Math.sqrt(3)),A[x.id].s3+1.28*A[x.id].rm*Math.sqrt(3)]),
  S13:R.fg.map(y=>{const x={x:y};return [y.id,x.x.fcu*x.x.cost]}),
  S14:sweep.map(([n,h,share])=>{const ass=Array(n).fill(0),hi=h,c0=CFG.fcHighShare;CFG.fcHighShare=share;try{return [n,h,share,ass.length&&hi/ass.length>=CFG.fcHighShare/100,hi/ass.length*100]}finally{CFG.fcHighShare=c0}}),
  S15:[...R.fg,...R.rm].map(x=>[x.id,why(x)])}};`;
const POP_NEW = `;out.pop=(sweep)=>{const A=fcAll(),ok=R.fg.filter(x=>A[x.id]&&A[x.id].ok);
 return {S12:ok.map(x=>{const g=CGShared.fcRange3(A[x.id]);return [x.id,g.lo,g.hi]}),
  S13:R.fg.map(y=>[y.id,CGShared.biasValue(y)]),
  S14:sweep.map(([n,h,share])=>{const c0=CFG.fcHighShare;CFG.fcHighShare=share;try{const r=CGShared.faConsistency(Array(n).fill(0),h);return [n,h,share,r.many,r.share]}finally{CFG.fcHighShare=c0}}),
  S15:[...R.fg,...R.rm].map(x=>[x.id,CGShared.ropWhy(x)])}};`;
const SWEEP = [];
for (const n of [0, 1, 2, 7, 50]) for (const h of [0, 1, 2, 7, 50]) if (h <= n || n === 0) for (const share of [0, 1, 14, 50, 62, 100, 101]) SWEEP.push([n, h, share]);

function engine(appSrc, pop) {
  const A = { log: [] };
  new Function('XLSX', 'document', 'out', lib + '\n' + appSrc + '\n' + xl + `;out.go=(wb,pol)=>{WB=wb;CFG.pol=pol;R=analyse();CFG.pol=pol?0:1;try{R.alt=analyse()}finally{CFG.pol=pol}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.ORDER=ORDER;out.CFG=CFG;` + (pop || '')).call(null, XLSX, document, A);
  return A;
}
global.__rec = (k, v) => { global.__log.push([k, v]); return v; };
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
for (const dir of ['stage3-design/audit-20261121/evidence/workbooks', 'stage3-design/stage3b/refactor-evidence/s11-edge-workbooks', 'stage3-design/stage3b/refactor-evidence/s12-s15-edge-workbooks'])
  books.push(...fs.readdirSync(path.join(APP, dir)).filter(f => f.endsWith('.xlsx')).map(f => path.join(APP, dir, f)));
const report = { books: [], sites: {}, population: { S12: 0, S13: 0, S14: 0, S15: 0 }, cov: { S12rmUnknown: 0, S12lowClampedAt0: 0, S13notNumber: 0, S13negative: 0, S14warn: 0, S14noWarn: 0, S14noneAssessable: 0, S15: {} } };
let compared = 0, htmlTabs = 0;
const num = v => typeof v === 'number' && isFinite(v);
for (const b of books.sort()) for (const pol of [0, 1]) {
  const rel = path.relative(APP, b) + (pol ? ' [calculated policy]' : ' [workbook policy]');
  let wb; try { wb = XLSX.readFile(b, { cellDates: true }); } catch (e) { report.books.push({ book: rel, skipped: 'unreadable workbook (' + e.message.slice(0, 60) + ')' }); continue; }
  const runs = {};
  for (const [name, src, pop] of [['base', baseApp], ['new', newApp], ['baseI', baseI, POP_BASE], ['newI', newI, POP_NEW]]) {
    const A = engine(src, pop); global.__log = [];
    try { A.go(wb, pol); } catch (e) { runs[name] = { err: 'analysis failed: ' + e.message.slice(0, 80) }; continue; }
    const html = A.ORDER.map(k => { try { return A.html(k); } catch (e) { return 'THREW ' + e.message; } });
    runs[name] = { html, log: global.__log, pop: A.pop ? A.pop(SWEEP) : null };
  }
  if (runs.base.err || runs.new.err) { const same = runs.base.err === runs.new.err; say(same, `${rel}: analysis outcome identical (${runs.base.err || 'ok'})`); report.books.push({ book: rel, skipped: runs.base.err || runs.new.err, identicalOutcome: same }); continue; }
  const htmlSame = runs.base.html.every((h, i) => h === runs.new.html[i]); htmlTabs += runs.base.html.length;
  const lb = runs.baseI.log, ln = runs.newI.log;
  const calcSame = lb.length === ln.length && lb.every((e, i) => e[0] === ln[i][0] && util.isDeepStrictEqual(norm(e[1]), norm(ln[i][1])));
  compared += lb.length;
  for (const [k] of lb) report.sites[k] = (report.sites[k] || 0) + 1;
  const pb = runs.baseI.pop, pn = runs.newI.pop, popSame = util.isDeepStrictEqual(norm(pb), norm(pn));
  for (const k of ['S12', 'S13', 'S14', 'S15']) report.population[k] += pb[k].length;
  for (const [, lo, hi] of pn.S12) { if (!num(lo) || !num(hi)) report.cov.S12rmUnknown++; else if (lo === 0) report.cov.S12lowClampedAt0++; }
  for (const [, v] of pn.S13) { if (!num(v)) report.cov.S13notNumber++; else if (v < 0) report.cov.S13negative++; }
  for (const [k, v] of ln) if (k === 'S14') { if (v[0]) report.cov.S14warn++; else if (v[0] === 0) report.cov.S14noneAssessable++; else report.cov.S14noWarn++; }
  for (const [, t] of pn.S15) { const key = String(t).replace(/[\d.,£%×\-]+/g, '#').slice(0, 40); report.cov.S15[key] = (report.cov.S15[key] || 0) + 1; }
  say(calcSame, `G2a ${rel}: ${lb.length} values recorded while the tabs render, identical at full precision`);
  say(popSame, `G2b ${rel}: full population identical (S12 ${pb.S12.length} products, S13 ${pb.S13.length} products, S14 ${pb.S14.length} sweep cases, S15 ${pb.S15.length} items)`);
  say(htmlSame, `G3 ${rel}: all ${runs.base.html.length} tabs byte-identical`);
  report.books.push({ book: rel, values: lb.length, calcIdentical: calcSame, populationIdentical: popSame, tabs: runs.base.html.length, htmlIdentical: htmlSame, threw: runs.new.html.filter(h => h.startsWith('THREW')).length });
}
const p = report.population;
console.log('Coverage: ' + JSON.stringify(report.cov));
say(report.sites.S12 > 0 && report.sites.S13 > 0 && report.sites.S14 > 0 && report.sites.S15 > 0, `every site was exercised while rendering (S12 ${report.sites.S12 || 0}, S13 ${report.sites.S13 || 0}, S14 ${report.sites.S14 || 0}, S15 ${report.sites.S15 || 0})`);
say(report.cov.S14warn > 0 && report.cov.S14noWarn > 0, 'S14: both sides of the warning were met in real workbooks');
console.log(`SUMMARY: ${compared} values recorded while rendering; full population S12 ${p.S12}, S13 ${p.S13}, S14 ${p.S14} sweep cases, S15 ${p.S15}; ${htmlTabs} tab renders compared; ${report.books.filter(b => b.skipped).length} workbook runs could not be analysed (same outcome old and new); ${fails} failure(s)`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 1));
process.exit(fails ? 1 : 0);
