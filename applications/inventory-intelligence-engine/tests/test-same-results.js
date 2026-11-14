#!/usr/bin/env node
/* Universal Data Import v1, Stage 2 (K5): "same results" proofs A, B and C of the Stage 2 design.
 *  A  every eight-sheet fixture workbook (17) run two ways: direct upload, and reversed to canonical CSV files -> Stage 1 import ->
 *     adapter -> engine. Outputs must be identical apart from the entries of the difference register (DR-1 ... DR-6), and every
 *     registered difference is itself checked: it must appear exactly where registered, and disappear when its cause is removed.
 *     The four workbooks Stage 1 refuses (combined, multiline, posupconflict, splitline) must stay refused.
 *  B  Universal Import Package 01 (canonical CSV files) against its expected-results.json.
 *  C  the approved snapshots: golden v0.5 and v0.6.0 (regress.js on the adapter-built Northstar workbook) and confidence v0.7
 *     (every fixture through the adapter). Snapshot files are read only, never written.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-same-results.js   (5 time zones + identity check)
 * ONE JavaScript context holds the bundled SheetJS, the import modules, the engine and the test-only reverse converter. Every run
 * first checks that direct Northstar gives its known 5 data-quality warnings.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), os = require('os');
const APP = path.resolve(__dirname, '..'), FIX = path.join(__dirname, 'fixtures');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];
if (!process.argv.includes('--once')) {
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 256e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /same-results: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return r.stdout.split('\n').filter(l => !l.startsWith('time zone:')).join('\n');
  });
  const same = outs.every(o => o === outs[0]); same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`same-results all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
console.log('time zone: ' + (process.env.TZ || '(default)'));

const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx, { filename: 'reverse-eight-sheet.js' });
const X = ctx.XLSX, G = ctx.CGImport, E = ctx.__E, REV = ctx.CGTestTools.reverseEightSheet;
const isDate = v => Object.prototype.toString.call(v) === '[object Date]';

// Normalised comparison. Keys are sorted (Willow's columns are in reverse order, so engine objects are built in another key order).
// Dropped keys, each a register entry: DR-1 demo/declared/notes; DR-2 Production_Line_ID; DR-6 ua; memo is the engine's internal
// cache (never released: the gate always replaces it).
const DROP = new Set(['demo', 'declared', 'notes', 'Production_Line_ID', 'ua', 'memo']);
const sk = v => Array.isArray(v) ? v.map(sk) : v && typeof v === 'object' && !isDate(v) ? Object.fromEntries(Object.keys(v).filter(k => !DROP.has(k)).sort().map(k => [k, sk(v[k])])) : v;
const norm = v => JSON.stringify(sk(v), function (k, x) { const o = this[k]; if (isDate(o)) return 'D:' + o.getTime(); if (typeof x === 'number' && !isFinite(x)) return 'N:' + x; return x; });
const SECTIONS = ['mrp', 'feas', 'forecasts', 'forecastCredibility', 'clientQuestions', 'confidence'];
const diff = (D, A) => [...SECTIONS.filter(s => norm(D[s]) !== norm(A[s])),
  ...[...new Set([...Object.keys(D.result), ...Object.keys(A.result)])].filter(k => !DROP.has(k) && norm(D.result[k]) !== norm(A.result[k])).map(k => 'result.' + k)].sort();
const fixtures = ['northstar', 'suppliers', 'edge', 'structure'].flatMap(d => fs.readdirSync(path.join(FIX, d)).filter(f => /\.xlsx$/.test(f)).sort().map(f => d + '/' + f));
const wbOf = buf => X.read(buf, { cellDates: true });
const viaAdapter = buf => { const rv = REV(wbOf(buf)), imp = G.validate.importFiles(rv.mapping, rv.files), ad = G.adapter.build(imp, rv.mapping); return { rv, imp, ad, out: ad.workbook ? E.runEngine({ workbook: ad.workbook }) : null }; };

// ---- self-check
{
  const ns = E.runEngine({ workbook: wbOf(fs.readFileSync(path.join(FIX, 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'))) });
  ok(ns.result.dq.length === 5 && !ns.result.dq.some(d => /non-date/.test(d.msg)), 'self-check: direct Northstar gives its known 5 data-quality warnings (one context: dates readable)');
  ok(fixtures.length === 17, `the fixture set has 17 eight-sheet workbooks (found ${fixtures.length})`);
}

// ===================== Proof A =====================
console.log('\n--- Proof A: 17 workbooks, direct upload vs reversed CSV -> Stage 1 -> adapter -> engine');
const REFUSED = ['edge/scenario-combined.xlsx', 'edge/scenario-multiline.xlsx', 'edge/scenario-posupconflict.xlsx', 'edge/scenario-splitline.xlsx'];
// DR-3: exact duplicate rows removed by Stage 1 (A6). Cause removed: drop the same exact duplicates from the direct workbook.
const dedupe = (wb, sheet) => { const seen = new Set(), rows = X.utils.sheet_to_json(wb.Sheets[sheet], { raw: true, cellDates: true }), keep = [];
  for (const r of rows) { const k = JSON.stringify(r, (kk, v) => (isDate(v) ? +v : v)); if (!seen.has(k)) { seen.add(k); keep.push(r); } }
  wb.Sheets[sheet] = X.utils.json_to_sheet(keep, { cellDates: true }); return rows.length - keep.length; };
// DR-4: empty-text cells read as missing values by Stage 1. DR-5: an unmapped column (Willow's empty Notes) is not carried.
const dropEmptyTextAndColumn = (wb, col) => { let empties = 0, dropped = 0;
  for (const sn of wb.SheetNames) { const ws = wb.Sheets[sn]; if (!ws['!ref']) continue; const rg = X.utils.decode_range(ws['!ref']); const hdr = {};
    for (let c = rg.s.c; c <= rg.e.c; c++) { const h = ws[X.utils.encode_cell({ r: rg.s.r, c })]; hdr[c] = h && h.v; }
    for (const a of Object.keys(ws)) { if (a[0] === '!') continue; const ad = X.utils.decode_cell(a), cell = ws[a];
      if (col && hdr[ad.c] === col) { delete ws[a]; dropped++; } else if (ad.r > rg.s.r && cell.t === 's' && cell.v.trim() === '') { delete ws[a]; empties++; } } }
  return { empties, dropped }; };
for (const f of fixtures) {
  const buf = fs.readFileSync(path.join(FIX, f)), D = E.runEngine({ workbook: wbOf(buf) }), r = viaAdapter(buf);
  if (REFUSED.includes(f)) {
    ok(!r.imp.importAccepted && r.ad.status === 'refused' && r.ad.workbook === null && r.ad.report.refusals[0].code === 'IMPORT_NOT_ACCEPTED', `${f}: Stage 1 refuses it, so the adapter refuses (IMPORT_NOT_ACCEPTED) and the engine never runs`);
    continue;
  }
  const A = r.out, d = diff(D, A);
  ok(r.imp.importAccepted && A && [...A.result.fg, ...A.result.rm].every(x => x.ua === x.oh) && [...D.result.fg, ...D.result.rm].every(x => !('ua' in x)),
    `${f}: imported and adapted (${r.ad.status}); DR-6: every adapter-route item carries ua = on-hand (no negative locations), no direct item has ua`);
  ok(norm(D.result.demo || null) !== 'null' ? A.result.demo == null : true, `${f}: DR-1: the notes sheet text is not carried (not part of the canonical model)`);
  if (f === 'edge/scenario-dupexact.xlsx') {
    ok(d.join() === 'clientQuestions,confidence,feas,mrp,result.alt,result.altS,result.dq,result.po,result.recon,result.rm,result.sched,result.sup,result.supRisk,result.top',
      `${f}: DR-3 differences appear exactly where registered (${d.length} sections)`);
    const w = wbOf(buf), n = dedupe(w, 'Purchase Orders'), D2 = E.runEngine({ workbook: X.read(X.write(w, { type: 'array', bookType: 'xlsx' }), { cellDates: true }) }), d2 = diff(D2, A);
    ok(n === 3 && d2.length === 0, `${f}: DR-3 explained: removing the same ${n} exact duplicate PO rows from the direct workbook leaves no difference (${d2.join(', ') || 'none'})`);
  } else if (f === 'structure/scenario-willow.xlsx') {
    ok(d.join() === 'clientQuestions,result.alt,result.altS,result.dq', `${f}: DR-4/DR-5 differences appear exactly where registered (${d.join(', ')})`);
    const s = x => x.result.dq.map(q => q.msg), only = (a, b) => s(a).filter(m => !s(b).includes(m));
    ok(only(D, A).some(m => /Column Notes contains no values/.test(m)) && only(D, A).some(m => /^19 POs received short/.test(m)) && only(A, D).some(m => /^11 POs received short/.test(m)),
      `${f}: the direct route has the empty-Notes warning (DR-5) and 19 short receipts; the import route 11 (DR-4)`);
    const w = wbOf(buf), c = dropEmptyTextAndColumn(w, 'Notes'), D2 = E.runEngine({ workbook: w }), d2 = diff(D2, A);
    // DR-7: the engine lists data-quality warnings in the order of the sheet's columns. Willow's columns are in reverse order;
    // the Engine View writes them in the standard order, so two warnings swap places. Same warnings, different order.
    const sortDq = o => { const c = Object.assign({}, o, { result: Object.assign({}, o.result) }); for (const k of ['result', 'alt', 'altS'].map(x => x === 'result' ? c.result : (c.result[x] = Object.assign({}, c.result[x])))) k.dq = [...k.dq].sort((p, q) => norm(p) < norm(q) ? -1 : 1); return c; };
    const d3 = diff(sortDq(D2), sortDq(A));
    ok(c.empties > 0 && c.dropped > 0 && d2.join() === 'result.alt,result.altS,result.dq' && d3.length === 0,
      `${f}: DR-4/DR-5 explained: with empty-text cells read as missing and the unmapped Notes column removed, only the order of data-quality warnings differs (DR-7); with warnings sorted, no difference remains (${d3.join(', ') || 'none'})`);
  } else {
    ok(d.length === 0, `${f}: identical results in every section after the register's normalisation (${d.join(', ') || 'no difference'})`);
  }
}

// ===================== Proof B =====================
console.log('\n--- Proof B: Universal Import Package 01 against expected-results.json');
{
  const dir = path.join(FIX, 'library', '01-Clean-Manufacturer'), exp = JSON.parse(fs.readFileSync(path.join(dir, 'expected-results.json'), 'utf8'));
  const names = fs.readdirSync(dir).filter(n => n.endsWith('.csv')).sort();
  const load = label => names.map(n => { let t = fs.readFileSync(path.join(dir, n), 'utf8'); if (label && n === 'dataset.csv') { const [h, r] = t.split(/\r?\n/); t = h + ',Demand_Basis\n' + r + ',shipments\n'; } return { name: n, text: t }; });
  const mapFor = files => { const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'identity', files: {}, tables: {} };
    for (const f of files) { const t = f.name.slice(0, -4); if (!G.canonical.TABLES[t]) continue; const tb = G.read.fromCSVText(f.text, f.name);
      m.files[f.name] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => tb.headers.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
      m.tables[t] = { sources: [{ file: f.name, columns: Object.fromEntries(tb.headers.filter(h => G.canonical.field(t, h)).map(h => [h, { source: h }])) }] }; }
    return m; };
  const asIs = load(false), mp0 = mapFor(asIs), imp0 = G.validate.importFiles(mp0, asIs), ad0 = G.adapter.build(imp0, mp0);
  ok(imp0.importAccepted && ad0.status === 'refused' && ad0.report.refusals[0].code === 'DEMAND_BASIS_NOT_LABELLED',
    'as supplied: Stage 1 accepts it, but the adapter refuses it: dataset.csv has no Demand_Basis label (M1 D14) — recorded for the owner');
  const files = load(true), mp = mapFor(files), imp = G.validate.importFiles(mp, files), ad = G.adapter.build(imp, mp);
  const o = E.runEngine({ workbook: ad.workbook }), all = [...o.result.fg, ...o.result.rm], g = G.resultGate.apply(o, ad.gate);
  ok(ad.status === 'complete' && g.status === 'complete' && all.length === 120, 'with Demand_Basis = shipments added in memory (documented test assumption): complete, 120 items, gate complete');
  const oh = all.reduce((s, x) => s + x.oh, 0), ohPos = all.reduce((s, x) => s + Math.max(0, x.oh), 0);
  ok(oh === exp.stock.business_wide_on_hand_excluding_negatives && ohPos === oh && ad.report.negativeStock.length === 0 && exp.stock.items_with_negative_stock.length === 0,
    `on-hand ${oh.toLocaleString('en-GB')} = expected ${exp.stock.business_wide_on_hand_excluding_negatives.toLocaleString('en-GB')} (no negative stock in the package)`);
  const byLoc = {}; for (const s of imp.dataset.stock) byLoc[s.Location_ID] = (byLoc[s.Location_ID] || 0) + s.On_Hand_Qty;
  ok(JSON.stringify(byLoc, Object.keys(byLoc).sort()) === JSON.stringify(exp.stock.on_hand_by_location_included, Object.keys(exp.stock.on_hand_by_location_included).sort()), 'on-hand by location matches (FGW, MAIN, SHEF)');
  ok(Math.abs(o.result.tot - exp.stock.stock_value_at_cost_gbp) < 0.005, `stock value £${o.result.tot.toFixed(2)} = expected £${exp.stock.stock_value_at_cost_gbp.toFixed(2)}`);
  const so = exp.findings_reference.stockout_risk.map(x => x.item);
  ok(so.every(id => all.find(y => y.id === id).fLT === true), `stock-out risk items flagged by the engine (cover below lead time): ${so.join(', ')}`);
  const dead = all.filter(x => x.cls === 'No recorded demand').map(x => x.id).sort();
  ok(JSON.stringify(dead) === JSON.stringify([...exp.findings_reference.dead_stock_items].map(x => x.item || x).sort()), `dead stock: ${dead.join(', ')} as expected`);
}

// ===================== Proof C =====================
console.log('\n--- Proof C: approved snapshots (read only)');
{
  const ns = fs.readFileSync(path.join(FIX, 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx')), r = viaAdapter(ns);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'same-results-')), wbFile = path.join(tmp, 'northstar-adapter.xlsx');
  try {
    fs.writeFileSync(wbFile, Buffer.from(X.write(r.ad.workbook, { type: 'array', bookType: 'xlsx' })));
    const snap = path.join(tmp, 'regress.json'), g = cp.spawnSync(process.execPath, ['regress.js', '..', snap, wbFile], { cwd: __dirname, encoding: 'utf8', env: process.env });
    ok(g.status === 0, 'regress.js reads the adapter-built Northstar workbook (written by the bundled SheetJS)');
    for (const s of ['snapshots/v0.5-golden-20261105T101953Z.json', 'snapshots/v0.6.0-baseline-20261109T152050Z.json']) {
      const c = cp.spawnSync(process.execPath, ['compare-snapshots.js', s, snap], { cwd: __dirname, encoding: 'utf8', env: process.env });
      const same = (c.stdout.match(/^IDENTICAL/gm) || []).length, diffN = (c.stdout.match(/^DIFFERENT/gm) || []).length;
      ok(c.status === 0 && same === 10 && diffN === 0, `${s}: adapter-built Northstar is identical in all ${same} sections (${diffN} different)`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'v0.7-confidence-20261112T011814Z.json'), 'utf8'));
  const REG = { 'edge/scenario-dupexact.xlsx': 'confidence,clientQuestions', 'structure/scenario-willow.xlsx': 'clientQuestions' };
  for (const f of fixtures.filter(x => !REFUSED.includes(x))) {
    const o = viaAdapter(fs.readFileSync(path.join(FIX, f))).out, want = conf.fixtures[f];
    const d = conf.sections.filter(s => norm(JSON.parse(JSON.stringify(o[s]))) !== norm(want[s]));
    ok(d.join() === (REG[f] || ''), `confidence v0.7, ${f}: ${d.length ? 'differs only in the registered sections (' + d.join(', ') + ')' : 'identical in all 3 sections'}`);
  }
}

console.log(`\nsame-results: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
