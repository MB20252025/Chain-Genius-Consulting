// N-4 evidence for S11 (Stage 3B Phase 2, 23 Nov 2026): the Excess & dead stock declaration block moved from the tab
// into CGShared.excessModel (js/app.js). Same method, same three guarantees and the same tolerance (strict deep equality,
// full precision; functions by source text) as verify-shared-refactor.js for S1–S10. Baseline: app.js of dcf6308.
// This is a HISTORICAL comparison (old code against new code), so by the owner's test-architecture rule it is a separate
// evidence script, not a registered current-behaviour test. Usage, from the repository root:
//   node applications/inventory-intelligence-engine/stage3-design/stage3b/refactor-evidence/verify-s11-refactor.js <baseline app.js> [out.json]
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
const H = "views['Excess & dead stock']=()=>{const a=";
const bi = baseApp.indexOf(H), bj = baseApp.indexOf(',card=(arr,k,label)=>', bi);
const [LIST, HELP] = baseApp.slice(bi + H.length, bj).split(';\n const ');
const MOVED = { S11: [LIST, HELP] };
say(!!LIST && !!HELP && baseApp.slice(bi + H.length, bj).split(';\n const ').length === 2, 'G1 S11: baseline declaration block found and split into the listing and the helper declarations');
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
const CARD = ',card=(arr,k,label)=>{const t=x1Sum(arr,k);';
const CARD_I = ",__s11=__rec('S11',{a,pv,uv,uc:a.map(uc),neg:a.map(neg),alK:a.map(alK),num:[0,-1,NaN,Infinity,'1',null].map(n),NEG}),card=(arr,k,label)=>{const t=__rec('S11card',[k,x1Sum(arr,k)]);";
const baseI = instrument(baseApp, [[CARD, CARD_I]], 'baseline');
const newI = instrument(newApp, [['=CGShared.excessModel()' + CARD, '=CGShared.excessModel()' + CARD_I]], 'new');

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
books.push(...fs.readdirSync(path.join(__dirname, 's11-edge-workbooks')).filter(f => f.endsWith('.xlsx')).map(f => path.join(__dirname, 's11-edge-workbooks', f)));
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
  const leaves = v => v !== null && typeof v === 'object' && !(v instanceof Date) ? Object.values(v).reduce((q, x) => q + leaves(x), 0) : 1;
  report.leaves = (report.leaves || 0) + lb.reduce((q, e) => q + leaves(norm(e[1])), 0);
  const cov = report.cov = report.cov || { items: 0, allocUnknown: 0, negOnHand: 0, valueUnknown: 0, notAssessedListed: 0, costMissingOrNeg: 0 };
  for (const [k, v] of ln) if (k === 'S11') v.a.forEach((x, i) => { cov.items++; if (!v.alK[i]) cov.allocUnknown++; if (v.neg[i]) cov.negOnHand++; if (!(typeof v.uv[i]._v === 'number' && isFinite(v.uv[i]._v))) cov.valueUnknown++; if (x.cls === 'Not Assessed') cov.notAssessedListed++; if (!(typeof x.cost === 'number' && isFinite(x.cost) && x.cost >= 0)) cov.costMissingOrNeg++; });
  for (const [k] of lb) report.sites[k] = (report.sites[k] || 0) + 1;
  say(calcSame, `G2 ${rel}: ${lb.length} recorded values identical at full precision`);
  say(htmlSame, `G3 ${rel}: all ${runs.base.html.length} tabs byte-identical`);
  report.books.push({ book: rel, values: lb.length, calcIdentical: calcSame, tabs: runs.base.html.length, htmlIdentical: htmlSame, threw: runs.new.html.filter(h => h.startsWith('THREW')).length });
}
console.log('Edge-case coverage over all analysed runs (listed items): ' + JSON.stringify(report.cov) + '; leaf values compared: ' + report.leaves);
say(report.sites.S11 > 0 && report.sites.S11card > 0, `S11 was exercised (${report.sites.S11 || 0} tab renders, ${report.sites.S11card || 0} card totals)`);
console.log(`SUMMARY: ${compared} recorded values compared; ${htmlTabs} tab renders compared; ${report.books.filter(b => b.skipped).length} workbook runs could not be analysed (same outcome old and new); ${fails} failure(s)`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 1));
process.exit(fails ? 1 : 0);
