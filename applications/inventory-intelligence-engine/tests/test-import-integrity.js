#!/usr/bin/env node
/* Universal Data Import v1, Stage 2, K7: data-integrity tests for the adapter (AD2) and result gate (RG2).
 *   F1  items blocked for every analysis are left out of the Engine View, BOM relationships are kept, and no released result
 *       depends on an excluded or withheld input (dependants, shared material pool, group rankings and totals, suppliers).
 *   F2  BOM scrap: supplied values are used; a missing column or blank cell is an assumed 0% that is disclosed; a value Stage 1
 *       could not read is never replaced, and the results that use it are withheld.
 *   I13 the gate refuses a specification that does not describe the engine output it is applied to.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-import-integrity.js     (5 time zones + identity check)
 * ONE JavaScript context holds the bundled SheetJS, the import modules and the engine; every run first checks that direct
 * Northstar gives its known 5 data-quality warnings. Test data is changed in memory only, never on disk:
 *   - library Package 01 gets Demand_Basis = shipments (the owner's definition, 14 Nov 2026; the file itself is labelled at T5);
 *   - unit mismatches are injected by adding a UOM column to Package 01 stock (P0001 "box", M0028 "kg");
 *   - Stage 1 fault cases F03 and F18 get a dataset file labelled shipments (they have none).
 * Expected figures were established by hand from the engine's own formulas (IMPORT-V1-STAGE2-RECORD.md, K7) and are checked
 * here against an independent engine run, never against the code under test alone.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const APP = path.resolve(__dirname, '..');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];
if (!process.argv.includes('--once')) {
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 256e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /import-integrity: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return r.stdout.split('\n').filter(l => !l.startsWith('time zone:')).join('\n');
  });
  const same = outs.every(o => o === outs[0]); same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`import-integrity all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
// Every assertion reports by name. The condition (and, where it uses run data, the message) is a function, so an exception inside
// it is a named FAIL that says what threw, never a crash that hides the assertions after it. guard() does the same for a block's
// set-up code, and the last assertion checks that every expected assertion ran (EXPECTED per zone).
const ok = (c, m) => { let v = false, why = '';
  try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + (e && e.message ? e.message : String(e)) + ']'; }
  let t; try { t = typeof m === 'function' ? m() : m; } catch (e) { t = '(message could not be built: ' + (e && e.message) + ')'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + t + why); };
const guard = (name, fn) => { try { fn(); } catch (e) { fail++; console.log('FAIL: ' + name + ': set-up threw (' + (e && e.message ? e.message : String(e)) + '); the assertions after it in this block did not run'); } };
const tryv = f => { try { return f(); } catch (e) { return undefined; } };
const EXPECTED = 79;   // assertions per zone, including the completeness check at the end (77 until Stage 3, D2: S7 split in two, +1 adapter defence)
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
console.log('time zone: ' + (process.env.TZ || '(default)'));
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx, { filename: 'reverse-eight-sheet.js' });
const X = ctx.XLSX, G = ctx.CGImport, E = ctx.__E, RG = G.resultGate;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
{ const ns = E.runEngine({ workbook: X.read(NS, { cellDates: true }) }); ok(() => ns.result.dq.length === 5, 'self-check: direct Northstar gives its known 5 data-quality warnings (one context)'); }

// ---------- helpers
const csv = t => { const L = t.replace(/\r/g, '').trim().split('\n'), h = L[0].split(','); return { h, rows: L.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(h.map((k, i) => [k, c[i] === undefined ? '' : c[i]])); }) }; };
const out = (h, rows) => [h.join(','), ...rows.map(r => h.map(k => (r[k] === undefined ? '' : r[k])).join(','))].join('\n') + '\n';
const P01 = path.join(__dirname, 'fixtures', 'library', '01-Clean-Manufacturer'), FX = path.join(__dirname, 'fixtures', 'import-v1', 'faults');
function pkg01() { const T = {}; for (const n of fs.readdirSync(P01).filter(n => n.endsWith('.csv'))) T[n.slice(0, -4)] = csv(fs.readFileSync(path.join(P01, n), 'utf8'));
  T.dataset.h.push('Demand_Basis'); T.dataset.rows[0].Demand_Basis = 'shipments'; return T; }
function mapFor(T) { const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'k7', files: {}, tables: {} };
  for (const [t, v] of Object.entries(T)) { const f = t + '.csv'; m.files[f] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => v.h.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
    const cols = {}; for (const h of v.h) { if (G.canonical.field(t, h)) cols[h] = { source: h }; else if (h === 'UOM') cols['@Unit'] = { source: 'UOM' }; } m.tables[t] = { sources: [{ file: f, columns: cols }] }; }
  return m; }
function run(T) { const files = Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: out(v.h, v.rows) })), m = mapFor(T), imp = G.validate.importFiles(m, files), ad = G.adapter.build(imp, m);
  const o = ad.workbook ? E.runEngine({ workbook: ad.workbook }) : null; return { imp, ad, o, g: o ? RG.apply(o, ad.gate) : null, m }; }
function fault(name) { const files = {}; for (const f of fs.readdirSync(path.join(FX, 'base'))) files[f] = fs.readFileSync(path.join(FX, 'base', f), 'utf8');
  for (const f of fs.readdirSync(path.join(FX, name))) if (f !== 'mapping.json') files[f] = fs.readFileSync(path.join(FX, name, f), 'utf8');
  const m = JSON.parse(fs.readFileSync(path.join(FX, name, 'mapping.json'), 'utf8'));
  files['dataset.csv'] = 'Format_Version,Snapshot_Date,Currency,Demand_Basis\nCDv1,2026-10-31,GBP,shipments\n'; m.files['dataset.csv'] = { dateFormat: 'ISO' };
  m.tables.dataset = { sources: [{ file: 'dataset.csv', columns: { Format_Version: { source: 'Format_Version' }, Snapshot_Date: { source: 'Snapshot_Date' }, Currency: { source: 'Currency' }, Demand_Basis: { source: 'Demand_Basis' } } }] };
  const fl = Object.entries(files).map(([name, text]) => ({ name, text })), imp = G.validate.importFiles(m, fl), ad = G.adapter.build(imp, m), o = E.runEngine({ workbook: ad.workbook });
  return { imp, ad, o, g: RG.apply(o, ad.gate) }; }
const items = r => [...r.fg, ...r.rm];
const byId = r => Object.fromEntries(items(r).map(x => [x.id, x]));
const W = v => v !== null && typeof v === 'object' && v.withheld === true;
// Stage 3 (D4): a partial total, and proof it cannot be used as a number by accident.
const P = v => RG.isPartial(v) && Object.isFrozen(v) && Object.keys(v).join() === 'value,partial,excludedItems';
const noArith = v => { try { return v + 0 === 'never'; } catch (e) { return /^partial total: read \.value/.test(e.message); } };
const near = (a, b) => Math.abs(a - b) < 0.005;
const nonFinite = o => { let n = 0; const w = v => { if (typeof v === 'number' && !isFinite(v)) n++; else if (v && typeof v === 'object') for (const k in v) w(v[k]); }; w(o); return n; };
const sheetRows = (wb, s) => { ctx.__wb = wb; ctx.__s = s; return vm.runInContext('WB = __wb; rows(__s)', ctx); };
const statusOf = r => (typeof r.status === 'string' ? r.status : 'WITHHELD');
const readable = o => o.result.dq.find(d => /^Scrap not readable/.test(d.msg));   // E-1: the engine's incomplete-usage warning (dq entries list up to 6 examples in .ex)
const ABC_A = 80, ABC_B = 95;   // the engine's ABC thresholds (CFG.abcA, CFG.abcB, recorded in every engine cache key)
const abcIndependent = list => { const t = list.reduce((s, x) => s + x.ann, 0) || 1; let c = 0; return Object.fromEntries([...list].sort((a, b) => b.ann - a.ann).map((x, i) => { c += x.ann; const cum = c / t * 100; return [x.id, i === 0 || cum <= ABC_A + 1e-9 ? 'A' : cum <= ABC_B + 1e-9 ? 'B' : 'C']; })); };

// =============== F1: all-blocked items, Package 01 with injected unit mismatches (P0001 "box", M0028 "kg")
console.log('\n--- F1: items blocked for every analysis (Package 01, P0001 and M0028 in the wrong unit)');
const mismatch = () => { const T = pkg01(); T.stock.h.push('UOM'); T.stock.rows.forEach(r => { r.UOM = r.Item_ID === 'P0001' ? 'box' : r.Item_ID === 'M0028' ? 'kg' : 'each'; }); return T; };
const C0 = run(pkg01()), C1 = run(mismatch());
const clean = tryv(() => byId(C0.o.result)), eng = tryv(() => byId(C1.o.result)), rel = tryv(() => byId(C1.g.result.result)), R1 = tryv(() => C1.g.result.result), ER = tryv(() => C1.o.result);
ok(() => C0.g.status === 'complete' && C1.ad.status === 'restricted' && C1.g.status === 'restricted' && C1.g.result !== null && C1.g.notes.every(n => !/RESULT_GATE_SPEC_ENGINE_MISMATCH/.test(n)),
  'I0: the gate accepts the adapter’s own specification for both runs (adapter and engine agree; the run with the unit mismatches is restricted, not refused)');
guard('F1 Package 01', () => {
  // I1 the contamination the fix removes: with the items in the Engine View, every total includes them.
  ok(() => C0.g.status === 'complete' && near(C0.o.result.tot, 2318695.70) && near(clean.P0001.val + clean.M0028.val, 19708.41) && clean.P0001.val > 0,
    'I1: with P0001 and M0028 in the Engine View the stock value £2,318,695.70 includes their £19,708.41 (P0001 198 x £46.10 = £9,127.80; M0028 961 x £11.01 = £10,580.61)');
  ok(() => C1.imp.importAccepted && C1.imp.permissions.items.P0001.blocked.all === 'unit mismatch' && C1.imp.permissions.items.M0028.blocked.all === 'unit mismatch',
    'I1: Stage 1 blocks P0001 and M0028 for every analysis (unit mismatch; Stage 1 rule unchanged)');
  // I2 left out of every Engine View sheet; BOM relationships kept.
  const wb = C1.ad.workbook, ids = ['P0001', 'M0028'];
  const sheets = { Products: 'SKU', Materials: 'Material_ID', Inventory: 'Item_ID', 'Demand History': 'SKU', 'Purchase Orders': 'Material_ID', 'Production Orders': 'SKU' };
  ok(() => Object.entries(sheets).every(([s, c]) => !sheetRows(wb, s).some(r => ids.includes(r[c]))) && items(ER).every(x => !ids.includes(x.id)) && !('P0001' in C1.o.forecasts),
    'I2: P0001 and M0028 are in none of the six item, stock, demand, PO and production sheets, and the engine never analyses them');
  const bom = tryv(() => sheetRows(wb, 'BOM')), canon = tryv(() => C1.imp.dataset.bom);
  ok(() => bom.length === canon.length && bom.filter(r => r.SKU === 'P0001').length === canon.filter(r => r.Parent_Item_ID === 'P0001').length && bom.filter(r => r.Material_ID === 'M0028').length === 2,
    'I2: every BOM row is kept, including P0001’s 3 lines and the 2 lines that use M0028 (P0001, P0018)');
  // I3 totals: released = the engine run without the items = clean total minus their values.
  ok(() => near(R1.tot, 2298987.29) && near(R1.tot, C0.o.result.tot - clean.P0001.val - clean.M0028.val) && near(R1.fgV, C0.o.result.fgV - clean.P0001.val) && near(R1.rmV, C0.o.result.rmV - clean.M0028.val) && R1.tot === ER.tot,
    'I3: total stock value £2,298,987.29 = £2,318,695.70 - £19,708.41; finished goods and materials values drop by exactly P0001 and M0028');
  // I4 available stock: nothing of theirs is released anywhere.
  const sumAv = r => items(r).reduce((s, x) => s + x.av, 0), deepHas = (o, id) => JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? 0 : v)).includes('"' + id + '"');
  ok(() => sumAv(R1) === sumAv(C0.o.result) - clean.P0001.av - clean.M0028.av && !deepHas(R1.fg, 'P0001') && !deepHas(R1.rm, 'M0028') && !deepHas(C1.g.result.mrp.map(m => m.x), 'M0028'),
    () => `I4: available stock over released items = ${tryv(() => sumAv(C0.o.result))} - ${tryv(() => clean.P0001.av)} (P0001) - ${tryv(() => clean.M0028.av)} (M0028) = ${tryv(() => sumAv(R1))}; no released item, MRP or forecast record belongs to them`);
  // I5 ABC: finished goods recalculated over analysed items only; materials withheld (they include M0058/M0064, see I8).
  const fgIndep = tryv(() => abcIndependent(ER.fg.map(x => ({ id: x.id, ann: x.ann }))));
  ok(() => R1.fg.every(x => x.abc === fgIndep[x.id]) && R1.rm.every(x => W(x.abc) && (['M0058', 'M0064'].includes(x.id) ? /DEPENDS_ON_EXCLUDED_PARENT P0001/ : /^DEPENDS_ON_WITHHELD_ITEMS \(rm\): M0058, M0064$/).test(x.abc.reason)),
    'I5: released finished-goods ABC equals an independent recalculation over the 39 analysed products; materials ABC is withheld because two materials’ usage is incomplete');
  // I6 top, top-10, excess and shortage totals.
  // Stage 3 (D4): the materials, overall excess, materials annual-value and shortage totals are released as PARTIAL totals over the released items
  // (they used to be withheld; shV sums materials too, so it is partial as well). Each value is recomputed here from the engine's own item values.
  const relRm = ER.rm.filter(x => !W(rel[x.id].exVal)), sum = (a, f) => a.reduce((t, x) => t + x[f], 0);
  ok(() => R1.top10 === ER.top10 && near(R1.top10, 45.10) && R1.top.length === ER.top.length && near(R1.exF, ER.exF) && typeof R1.exF === 'number' &&
    P(R1.exR) && near(R1.exR.value, sum(relRm, 'exVal')) && P(R1.exV) && near(R1.exV.value, ER.exF + sum(relRm, 'exVal')) && P(R1.cogsR) && near(R1.cogsR.value, sum(relRm, 'ann')) &&
    P(R1.shV) && near(R1.shV.value, sum(ER.fg, 'short') + sum(relRm, 'short')) && ['M0058', 'M0064', 'M0028'].every(id => R1.exR.excludedItems.some(e => e.id === id && e.reason)) &&
    !R1.exR.excludedItems.some(e => relRm.some(x => x.id === e.id)) && noArith(R1.exV) && noArith(R1.exR) && near(eng.M0058.exVal, 6232.80) && W(rel.M0058.exVal),
    () => `I6 (Stage 3, D4): top-10 share 45.10% and the finished-goods excess total are released as calculated; the M0058 false excess (£6,232.80, its only parent P0001 is excluded) is withheld; the materials excess (£${R1.exR.value.toFixed(2)}), overall excess, materials annual-value and shortage totals are released only as partial totals over the released items, naming M0058, M0064 and the excluded M0028, and cannot be used as numbers`);
  // I7 dependent production: P0018 uses M0028.
  const p18 = tryv(() => C1.o.feas.rows.filter(r => r.o.sku === 'P0018')), p18r = tryv(() => C1.g.result.feas.rows.filter(r => r.o.sku === 'P0018'));
  ok(() => C0.o.feas.rows.filter(r => r.o.sku === 'P0018').every(r => r.status === 'Feasible') && p18.length && p18.every(r => r.status === 'Insufficient information') &&
    p18r.every(r => W(r.status) && /USES_EXCLUDED_COMPONENT M0028/.test(r.status.reason)) && !C1.g.result.feas.rows.some(r => (C1.o.result.bomS[r.o.sku] || []).some(l => l.Material_ID === 'M0028') && typeof r.status === 'string'),
    'I7: P0018 was "Feasible" only because M0028’s kg counted as each; the engine now says "Insufficient information" and the released order is withheld; no order using M0028 is released with a status');
  const pool = tryv(() => C1.g.result.feas.rows.filter(r => W(r.status) && /SHARED_POOL/.test(r.status.reason)));
  ok(() => pool.length >= 1 && pool.every(r => C1.o.feas.rows.findIndex(x => x.o.id === r.o.id) > C1.o.feas.rows.findIndex(x => x.o.sku === 'P0018')),
    () => `I7: later orders that share materials with a withheld order are withheld too (${tryv(() => pool.map(r => r.o.sku).join(', '))}), because the shared pool they draw on is no longer known`);
  // I8 components of the excluded parent; their suppliers.
  const supOf = id => clean[id].sup;
  ok(() => ['M0058', 'M0064'].every(id => W(rel[id].sev) && W(rel[id].cover) && /DEPENDS_ON_EXCLUDED_PARENT P0001/.test(rel[id].sev.reason) && rel[id].oh === eng[id].oh) &&
    ['M0058', 'M0064'].every(id => R1.sup.find(s => s.id === supOf(id)).otd.withheld === true) && R1.sup.some(s => s.otd && !W(s.otd)),
    'I8: M0058 and M0064 (components of P0001) have their material and purchasing results withheld, their stock still shown; their suppliers’ results are withheld, other suppliers released');
  // I9 disclosure.
  const d = tryv(() => C1.g.disclosures), p1 = tryv(() => d.excluded.find(x => x.itemId === 'P0001')), m28 = tryv(() => d.excluded.find(x => x.itemId === 'M0028'));
  ok(() => d.excluded.length === 2 && p1.reason === 'unit mismatch' && p1.analyses === 'all' && p1.sourceStock.map(s => s.onHandQty + s.unitAsSupplied + '@' + s.locationId).join(',') === '128box@FGW,70box@SHEF' &&
    m28.sourceStock.map(s => s.onHandQty + s.unitAsSupplied).join() === '961kg' && p1.stockValue === 'not calculated' && p1.components.join() === 'M0028,M0058,M0064' && m28.parents.join() === 'P0001,P0018' &&
    /unit conversion factor/.test(p1.hint), 'I9: the disclosure names both items, the reason, "all analyses", the source stock in its own unit (128 + 70 box; 961 kg), value not calculated, the BOM dependants and the unit-conversion hint');
  ok(() => d.text.some(t => /^2 item\(s\) were excluded/.test(t) && /calculated over the analysed items only/.test(t)) && d.text.some(t => /Orders for P0018 use M0028/.test(t)) &&
    d.text.some(t => /P0001 uses M0028, M0058, M0064/.test(t)) && d.withheldTotals.map(x => x.path).join() === 'confidence,clientQuestions' && d.partialTotals.map(x => x.path).join() === 'exR,exV,shV,cogsR' &&
    d.text.some(t => /^Partial totals \(not complete totals\): exR covers \d+ of \d+ items/.test(t) && /Do not present them as complete/.test(t)) && C1.g.labelled.some(l => l.path === 'result.exV' && /^PARTIAL_TOTAL: /.test(l.label)) && C1.g.status === 'restricted',
    'I9 (Stage 3, D4): the display sentences explain the exclusion, that totals cover analysed items only, the P0018 orders and the withheld component results; the withheld results are listed, and the four partial totals are listed, labelled and described as not complete');
  // I12 unaffected items keep their results exactly.
  const affected = new Set(['M0058', 'M0064']);
  ok(() => R1.fg.every(x => Object.keys(eng[x.id]).every(k => JSON.stringify(x[k]) === JSON.stringify(eng[x.id][k]))) &&
    R1.rm.filter(x => !affected.has(x.id)).every(x => Object.keys(eng[x.id]).every(k => ['abc', 'cum'].includes(k) ? W(x[k]) : JSON.stringify(x[k]) === JSON.stringify(eng[x.id][k]))),
    'I12: every released product, and every material other than M0058 and M0064, equals the engine output exactly (materials ABC and cumulative share withheld, as I5)');
  ok(() => nonFinite(C1.g.result) === 0 && Object.isFrozen(C1.g) && Object.isFrozen(C1.g.disclosures), 'F1: no non-finite value is released; the gated result and disclosures are frozen');
});

// =============== F1 on the Stage 1 fault case F18 (P0001 "box", M0001 "EA"; no BOM)
console.log('\n--- F1: fault case F18 (P0001 box, M0001 EA) and the ABC reclassification');
guard('F1 F18', () => {
  const F = fault('F18-unit-mismatch'), R = tryv(() => F.g.result.result), e = tryv(() => byId(F.o.result));
  // Reference: the same data with no unit column (Stage 1 then checks nothing), i.e. the old contaminated population.
  const files = {}; for (const f of fs.readdirSync(path.join(FX, 'base'))) files[f] = fs.readFileSync(path.join(FX, 'base', f), 'utf8');
  const st = csv(fs.readFileSync(path.join(FX, 'F18-unit-mismatch', 'stock.csv'), 'utf8')); st.h = st.h.filter(h => h !== 'UOM');
  const T = { dataset: csv('Format_Version,Snapshot_Date,Currency,Demand_Basis\nCDv1,2026-10-31,GBP,shipments\n') }; for (const [f, t] of Object.entries(files)) T[f.slice(0, -4)] = csv(t); T.stock = st;
  const Ref = run(T), ref = tryv(() => byId(Ref.o.result));
  ok(() => F.ad.report.excludedItems.map(x => x.itemId).join() === 'M0001,P0001' && near(Ref.o.result.tot, 2318695.70) && near(R.tot, 2307019.10) && near(Ref.o.result.tot - R.tot, ref.P0001.val + ref.M0001.val) && near(ref.P0001.val, 9127.80) && near(ref.M0001.val, 2548.80),
    'F18: stock value £2,318,695.70 -> £2,307,019.10; the £11,676.60 difference is exactly P0001 (198 x £46.10 = £9,127.80) + M0001 (118 x £21.60 = £2,548.80)');
  ok(() => near(Ref.o.result.rmV, 1031007.16) && near(R.rmV, 1028458.36) && near(R.exR, R.rmV) && F.o.result.rm.every(x => x.d === 0 && near(x.exVal, x.val)) && Object.keys(F.o.result.bomS).length === 0,
    'F18 materials value = materials excess value (£1,028,458.36) is legitimate: the case has no BOM, so no material has usage, and the engine counts all stock without usage as excess (exVal = val for every material)');
  ok(() => Ref.o.result.fg.find(x => x.id === 'P0015').abc === 'C' && Ref.o.result.fg.find(x => x.id === 'P0017').abc === 'A' && e.P0015.abc === 'B' && e.P0017.abc === 'B' &&
    R.fg.find(x => x.id === 'P0015').abc === 'B' && R.fg.find(x => x.id === 'P0017').abc === 'B',
    'I12: P0015 C -> B and P0017 A -> B, released as recalculated without P0001');
  const indep = abcIndependent(R.fg.map(x => ({ id: x.id, ann: x.ann })));
  ok(() => R.fg.every(x => x.abc === indep[x.id]) && !R.fg.some(x => x.id === 'P0001') && near(Ref.o.result.fg.reduce((s, x) => s + x.ann, 0) - R.fg.reduce((s, x) => s + x.ann, 0), ref.P0001.ann),
    () => `I12: the released classes equal an independent ABC over the analysed products; the ranked total is lower by exactly P0001’s annual value (£${ref.P0001.ann.toFixed(2)}), so blocked data no longer ranks other items`);
  ok(() => F.g.disclosures.text[0].includes('ABC classes are calculated over the analysed items only') && F.g.disclosures.excluded.some(x => x.itemId === 'P0001' && x.reason === 'unit mismatch'),
    'I12: the disclosure says the classes are calculated over the analysed items only and names P0001 and its reason, so the change is traceable');
  ok(() => near(R.sup.find(s => s.id === 'S01').val, Ref.o.result.sup.find(s => s.id === 'S01').val - ref.M0001.val) && near(Ref.o.result.sup.find(s => s.id === 'S01').val - R.sup.find(s => s.id === 'S01').val, 2548.80),
    'F18: supplier S01’s stock value drops by £2,548.80, exactly M0001 (its material)');
});

// =============== Partially blocked items (I10, I11)
console.log('\n--- Partially blocked items: demand (F03), purchasing and production (Package 01 with rejected rows)');
guard('Partial blocks', () => {
  const F = fault('F03-demand-10pct'), R = tryv(() => F.g.result.result), e = tryv(() => byId(F.o.result)), r = tryv(() => byId(R));
  const held = Object.entries(F.imp.permissions.items).filter(([, x]) => x.blocked && x.blocked.demand).map(([id]) => id);
  const heldEx = F.o.result.fg.filter(x => held.includes(x.id)).reduce((s, x) => s + x.exVal, 0);
  const heldOf = f => F.o.result.fg.filter(x => held.includes(x.id)).reduce((s, x) => s + x[f], 0);
  ok(() => held.length === 24 && near(heldEx, 244837.55) && P(R.exF) && near(R.exF.value, F.o.result.exF - heldEx) && P(R.exV) && near(R.exV.value, F.o.result.exV - heldEx) &&
    P(R.shV) && near(R.shV.value, F.o.result.shV - heldOf('short')) && P(R.cogsF) && near(R.cogsF.value, F.o.result.cogsF - heldOf('ann')) &&
    held.every(id => R.exF.excludedItems.some(e => e.id === id && /DEPENDS|DEMAND|BLOCK/i.test(e.reason))) && R.exF.excludedItems.length === 24 && noArith(R.exF) && near(R.tot, F.o.result.tot) && near(R.fgV, F.o.result.fgV),
    () => `I10 (Stage 3, D4): 24 products blocked for demand would have put £244,837.55 into excess value: the excess, shortage and annual-value totals are released only as partial totals that leave out exactly those 24 (excess £${R.exF.value.toFixed(2)} = engine total − £244,837.55) and cannot be used as numbers; stock value totals (on-hand x cost) are released as calculated`);
  ok(() => R.fg.every(x => W(x.abc) && W(x.cum)) && R.fg.filter(x => !held.includes(x.id)).every(x => Object.keys(e[x.id]).every(k => ['abc', 'cum'].includes(k) || JSON.stringify(x[k]) === JSON.stringify(e[x.id][k]))) &&
    held.every(id => W(r[id].sev) && r[id].oh === e[id].oh && r[id].val === e[id].val) && held.every(id => W(F.g.result.forecasts[id])) && F.o.result.fg.filter(x => !held.includes(x.id)).every(x => !W(F.g.result.forecasts[x.id])),
    'I10: every product’s ABC and cumulative share are withheld (56.63% of the ranked value is blocked); unblocked products keep every other result; blocked products keep stock and value; only blocked forecasts are withheld');
  ok(() => Object.values(R.fcm || {}).length && held.every(id => W(R.fcm[id]) && W(R.fcc[id])),
    'I10: the engine’s second copies of forecasts and forecast credibility (result.fcm, result.fcc) are withheld for blocked products too (a K4 gap closed in K7)');
  ok(() => F.g.disclosures.text.some(t => /Demand-based results are withheld for P0001/.test(t) && /released only as partial totals/.test(t)) && F.g.disclosures.partialTotals.some(x => x.path === 'exV' && x.items + x.excludedItems.length === x.of) &&
      !F.g.disclosures.withheldTotals.some(x => ['exF', 'exV', 'shV', 'cogsF'].includes(x.path)), 'I10 (Stage 3, D4): the disclosure names the products and lists the partial totals (no longer withheld totals)');

  const T = pkg01(); let n = 0; for (const x of T.po_lines.rows) if (n < Math.ceil(T.po_lines.rows.length * 0.06) && ['M0005', 'M0006', 'M0007', 'M0008', 'M0009', 'M0010'].includes(x.Item_ID)) { x.Ordered_Qty = 'abc'; n++; }
  const Pu = run(T), PR = tryv(() => Pu.g.result.result), pHeld = tryv(() => Object.entries(Pu.imp.permissions.items).filter(([, x]) => x.blocked && x.blocked.purchasing).map(([id]) => id)) || [], pe = tryv(() => byId(Pu.o.result));
  const pSup = tryv(() => new Set(pHeld.map(id => pe[id].sup))) || new Set();
  ok(() => pHeld.length >= 2 && PR.sup.filter(s => pSup.has(s.id)).every(s => W(s.otd) && W(s.score)) && PR.sup.filter(s => !pSup.has(s.id)).every(s => !W(s.otd)) && W(PR.po) &&
    PR.recon.filter(x => pHeld.includes(x.id)).every(x => W(x.po)) && pHeld.every(id => !Pu.g.result.result.sched[id] || W(Pu.g.result.result.sched[id])),
    () => `I11 purchasing (${pHeld.join(', ')} blocked): their suppliers’ results, the PO summary, their reconciliation lines and scheduled receipts are withheld; other suppliers are released`);
  const pOrders = Pu.o.feas.rows.filter(r => (Pu.o.result.bomS[r.o.sku] || []).some(l => pHeld.includes(l.Material_ID)));
  ok(() => pOrders.length && pOrders.every(r => W(Pu.g.result.feas.rows.find(x => x.o.id === r.o.id).status)) && near(PR.tot, Pu.o.result.tot),
    () => `I11 purchasing: all ${pOrders.length} orders that use a material whose receipts are withheld are withheld; stock value is released`);
  const T2 = pkg01(); n = 0; for (const x of T2.production_orders.rows) if (n < Math.ceil(T2.production_orders.rows.length * 0.06) && ['P0003', 'P0004', 'P0005', 'P0006'].includes(x.Item_ID)) { x.Planned_Qty = 'abc'; n++; }
  const Po = run(T2), oHeld = Object.entries(Po.imp.permissions.items).filter(([, x]) => x.blocked && x.blocked.production).map(([id]) => id);
  const oRows = tryv(() => Po.g.result.feas.rows.filter(r => oHeld.includes(r.o.sku)));
  ok(() => oHeld.length >= 2 && oRows.length && oRows.every(r => W(r.status)) && Po.g.result.result.prRows.every(x => W(x) || !oHeld.includes(x.SKU)) &&
    Po.g.result.result.fg.filter(x => !oHeld.includes(x.id)).every(x => !W(x.sev)) && !W(Po.g.result.result.exF),
    () => `I11 production (${oHeld.join(', ')} blocked): their orders and production history rows are withheld; other products’ results and the demand totals stay`);
  // M12 (K7 verification): production performance (result.pr) is withheld for production-blocked products and released for the others.
  ok(() => { const e = Po.o.result.pr, r = Po.g.result.result.pr; return Array.isArray(e) && e.length === r.length && e.some(x => oHeld.includes(x.id)) &&
      e.every((x, i) => oHeld.includes(x.id) ? W(r[i]) && /^ITEM_WITHHELD: production /.test(r[i].reason) : JSON.stringify(r[i]) === JSON.stringify(x)); },
    () => `I11 production performance (result.pr): the entries of the production-blocked products (${Po.o.result.pr.filter(x => oHeld.includes(x.id)).map(x => x.id).join(', ')}) are withheld; every other entry equals the engine output`);
});

// =============== Scheduled receipts belong to purchasing (M13b, K7 verification)
console.log('\n--- Scheduled receipts (result.sched) are a purchasing result');
guard('Scheduled receipts', () => {
  const cp3 = s => JSON.parse(JSON.stringify(s)), withAnalysis = (a, st) => { const s = cp3(C0.ad.gate); s.analyses[a] = st; return RG.apply(C0.o, s); };
  const gp = withAnalysis('purchasing', 'blocked'), gq = withAnalysis('production', 'blocked');
  ok(() => C0.o.result.sched && Object.keys(C0.o.result.sched).length > 0 && W(gp.result.result.sched) && /^ANALYSIS_PURCHASING_BLOCKED$/.test(gp.result.result.sched.reason) &&
      !W(gq.result.result.sched) && JSON.stringify(gq.result.result.sched) === JSON.stringify(C0.o.result.sched) && W(gq.result.feas),
    'sched: with purchasing blocked for the whole dataset, scheduled receipts are withheld (ANALYSIS_PURCHASING_BLOCKED); with production blocked instead, they are released unchanged (and feasibility is withheld)');
  const T = pkg01(); delete T.po_lines; const N = run(T);
  ok(() => N.ad.gate.analyses.purchasing === 'unavailable' && N.g.labelled.some(l => l.path === 'result.sched' && /purchasing analysis not available/.test(l.label)) && !N.g.labelled.some(l => l.path === 'result.sched' && /production analysis/.test(l.label)),
    'sched: with no purchase-order file, scheduled receipts are labelled "purchasing analysis not available" (filed under purchasing, not production)');
});

// =============== I13: adapter and gate must agree
console.log('\n--- I13: the gate refuses a specification that does not describe the engine output');
guard('I13 and R7', () => {
  const base = C1.ad.gate, o = C1.o, cp2 = s => JSON.parse(JSON.stringify(s));
  const refusedWith = (g, re) => g.status === 'refused' && g.result === null && g.disclosures === null && g.notes.some(n => re.test(n));
  const t1 = tryv(() => { const t = cp2(base); delete t.excluded.P0001; delete t.dependants.P0001; return t; });
  ok(() => refusedWith(RG.apply(o, t1), /P0001 is named in the BOM but was neither analysed nor declared excluded/), 'I13: an exclusion dropped from the specification is detected (the BOM still names P0001): refused, nothing released');
  const t2 = tryv(() => { const t = cp2(base); t.excluded.P0002 = { reason: 'unit mismatch', sourceStock: [] }; t.dependants.P0002 = { components: [], parents: [] }; return t; });
  ok(() => refusedWith(RG.apply(o, t2), /P0002 is declared excluded but is present in the engine output/), 'I13: an item declared excluded but present in the engine output is detected: refused');
  const t3 = tryv(() => { const t = cp2(base); t.dependants.P0001.components = ['M0028', 'M0058']; return t; });
  ok(() => refusedWith(RG.apply(o, t3), /P0001: declared BOM dependants .* differ from the engine BOM/), 'I13: dependants that differ from the engine BOM are detected (M0064 missing): refused');
  const t4 = tryv(() => { const t = cp2(base); t.items.M0028 = { withhold: [], labels: [] }; return t; });
  ok(() => refusedWith(RG.apply(o, t4), /M0028 is declared excluded but also has item gate entries/), 'I13: an excluded item that also has item gate entries is detected: refused');
  const t5 = tryv(() => { const t = cp2(base); t.items.ZZ99 = { withhold: [{ analysis: 'demand', reason: 'X' }], labels: [] }; return t; });
  ok(() => refusedWith(RG.apply(o, t5), /ZZ99 has item gate entries but is not in the engine output/), 'I13: item gate entries for an item the engine never saw are detected: refused');
  const sup = tryv(() => Object.values(C1.o.result.bomS).flat().find(l => l.Scrap_Factor_Pct > 0)), t6 = tryv(() => { const t = cp2(base); t.scrap.assumed.push({ parent: sup.SKU, component: sup.Material_ID, basis: 'blank cell', row: 99 }); return t; });
  ok(() => refusedWith(RG.apply(o, t6), new RegExp(sup.SKU + '/' + sup.Material_ID + ' is declared assumed 0% but the Engine View does not hold 0')),
    'I13: a scrap line declared assumed 0% that the Engine View holds as a supplied value is detected: refused');
  const t7 = tryv(() => { const t = cp2(base); t.excluded.P0001.reason = ''; return t; });
  ok(() => refusedWith(RG.apply(o, t7), /RESULT_GATE_SPEC_INVALID/), 'I13: a malformed exclusion entry (no reason) is refused as an invalid specification');
  const o2 = Object.assign({}, o, { result: Object.assign({}, o.result) }); delete o2.result.bomS;
  ok(() => refusedWith(RG.apply(o2, base), /RESULT_GATE_ENGINE_OUTPUT_INVALID/), 'I13: an engine output without its BOM (no dependency information) is refused');
  const t8 = tryv(() => { const t = cp2(base); t.version = 'RG1'; return t; });
  ok(() => refusedWith(RG.apply(o, t8), /RESULT_GATE_SPEC_INVALID/), 'I13: an RG1 specification (no exclusion or scrap information) is refused by the RG2 gate');
  ok(() => RG.apply(o, base).status === 'restricted', 'I13: the untampered specification is accepted (control)');
  // R7 safety net: a non-finite number that no other rule withholds is still never released.
  const bad = Object.assign({}, C0.o, { result: Object.assign({}, C0.o.result, { fg: C0.o.result.fg.map((x, i) => (i === 0 ? Object.assign({}, x, { cover: NaN }) : x)) }) });
  const gn = RG.apply(bad, C0.ad.gate), x0 = gn.result.result.fg[0];
  ok(() => RG.apply(C0.o, C0.ad.gate).status === 'complete' && gn.status === 'restricted' && W(x0.cover) && x0.cover.reason === 'NON_FINITE_VALUE' && nonFinite(gn.result) === 0 && gn.notes.some(n => /not finite/.test(n)),
    'R7: a NaN placed in an otherwise clean engine output is withheld (NON_FINITE_VALUE) and the result is marked restricted, never complete');
  const inf = Object.assign({}, C0.o, { result: Object.assign({}, C0.o.result, { tot: -Infinity, fg: C0.o.result.fg.map((x, i) => (i === 0 ? Object.assign({}, x, { cover: Infinity }) : x)) }) });
  const gi = RG.apply(inf, C0.ad.gate);
  ok(() => gi.status === 'restricted' && W(gi.result.result.tot) && gi.result.result.tot.reason === 'NON_FINITE_VALUE' && W(gi.result.result.fg[0].cover) && gi.result.result.fg[0].cover.reason === 'NON_FINITE_VALUE' &&
      nonFinite(gi.result) === 0 && gi.result.result.fg[1].cover === C0.o.result.fg[1].cover,
    'R7: Infinity (fg[0].cover) and -Infinity (the stock-value total) are withheld (NON_FINITE_VALUE) and the result is restricted; the neighbouring values are released unchanged');
});

// =============== F2: scrap
console.log('\n--- F2: BOM scrap (Package 01, 142 lines; true scrap 0, 2% or 5%)');
guard('F2 Package 01', () => {
  const variant = f => { const T = pkg01(); f(T); return run(T); };
  const noCol = T => { T.bom.h = T.bom.h.filter(h => h !== 'Scrap_Pct'); T.bom.rows.forEach(r => delete r.Scrap_Pct); };
  const S0 = variant(() => {}), Sm = variant(noCol), Sb = variant(T => T.bom.rows.forEach(r => { r.Scrap_Pct = ''; })), Sz = variant(T => T.bom.rows.forEach(r => { r.Scrap_Pct = '0'; }));
  const rows = r => r.o.feas.rows.map(x => x.o.id + ':' + statusOf(x) + ':' + x.delay);
  ok(() => Sm.ad.report.scrap.column === 'not-mapped' && Sm.ad.report.scrap.assumedLines === 142 && nonFinite(Sm.o) === 0 && JSON.stringify(rows(Sm)) === JSON.stringify(rows(Sz)) &&
    Sm.g.status === 'restricted' && Sm.g.disclosures.assumptions[0].lines === 142 && Sm.g.disclosures.text.some(t => /Scrap percentage: not supplied\. 0% was assumed/.test(t)),
    'S1 column missing: all 142 lines assumed 0% (disclosed); no NaN anywhere in the engine; every order’s status and delay equal an explicit-0% run; the gate is not "complete"');
  ok(() => Sb.ad.report.scrap.column === 'supplied' && Sb.ad.report.scrap.assumed.every(l => l.basis === 'blank cell') && Sb.ad.report.scrap.assumedLines === 142 && JSON.stringify(rows(Sb)) === JSON.stringify(rows(Sz)) && nonFinite(Sb.g.result) === 0,
    'S2 all cells blank: assumed 0% line by line, recorded as blank cells; same results as S1');
  ok(() => Sz.g.status === 'complete' && Sz.ad.report.scrap.assumedLines === 0 && Sz.g.disclosures.assumptions.length === 0, 'S3 explicit 0: a supplied value, no assumption disclosed, gate complete');
  const pct = variant(T => { T.bom.rows[2].Scrap_Pct = '5%'; }), dec = variant(T => { T.bom.rows[2].Scrap_Pct = '0.05'; });
  ok(() => S0.imp.dataset.bom[2].Scrap_Pct === 0.05 && JSON.stringify(pct.o.feas) === JSON.stringify(dec.o.feas) && JSON.stringify(pct.o.mrp, (k, v) => (typeof v === 'function' ? 0 : v)) === JSON.stringify(dec.o.mrp, (k, v) => (typeof v === 'function' ? 0 : v)) && pct.g.status === 'complete',
    'S4 "5%" and 0.05 give identical engine results and are supplied values');
  // S5 boundary 1 (= 100%): a component with one parent line has exactly double the usage of the same line at 0.
  const single = (() => { const by = {}; S0.imp.dataset.bom.forEach((b, i) => { (by[b.Component_Item_ID] = by[b.Component_Item_ID] || []).push(i); }); return Object.entries(by).find(([, a]) => a.length === 1); })();
  const [cid, [li]] = single, one = variant(T => { T.bom.rows[li].Scrap_Pct = '1'; }), zero = variant(T => { T.bom.rows[li].Scrap_Pct = '0'; });
  const ann = r => r.o.result.rm.find(x => x.id === cid).annual;
  ok(() => one.ad.report.scrap.assumedLines === 0 && one.ad.report.scrap.invalidLines === 0 && ann(zero) > 0 && Math.abs(ann(one) / ann(zero) - 2) < 1e-9,
    () => `S5 boundary 1 (= 100%, a supplied value): ${cid} (one parent line) uses exactly twice its 0% usage (${ann(one)} vs ${ann(zero)}); requirement = qty x Qty_Per x (1 + scrap)`);
  // S6/S7 (Stage 3, owner decision D2, 16 Nov 2026): invalid scrap is rejected by Stage 1, so the import is not accepted and nothing reaches
  // the adapter. Replaces the E-1 assertions that the line was marked SCRAP_UNREADABLE and its results withheld.
  const rejRows = r => { const i = r.imp.issues.find(x => x.code === 'ROW_REJECTED'); return i ? i : { rows: [] }; };
  const refusedAll = r => !r.imp.importAccepted && r.ad.status === 'refused' && r.ad.workbook === null && r.ad.report.refusals.some(x => x.code === 'IMPORT_NOT_ACCEPTED') && r.o === null && r.g === null;
  for (const bad of ['abc', '1.5']) {
    const I = variant(T => { T.bom.rows[2].Scrap_Pct = bad; }), rj = rejRows(I), parent = S0.imp.dataset.bom[2].Parent_Item_ID, comp = S0.imp.dataset.bom[2].Component_Item_ID;
    ok(() => refusedAll(I) && rj.category === 'Must fix' && rj.rows.length === 1 && rj.rows[0].row === 4 && rj.rows[0].reasons.some(t => /^Scrap_Pct: /.test(t)) &&
      /BOM|bom/.test(rj.message) && !(I.imp.dataset && I.imp.dataset.bom && I.imp.dataset.bom.some(b => b.Parent_Item_ID === parent && b.Component_Item_ID === comp && b.Scrap_Pct === 0 && b.__source && b.__source.row === 4)),
      () => `S6 invalid "${bad}" (row 4, ${parent}/${comp}): Stage 1 rejects the row (Must fix, ROW_REJECTED names row 4 and the reason: ${rj.rows[0] ? rj.rows[0].reasons.join('; ') : 'none'}), the import is not accepted, the adapter refuses, no Engine View is built and the engine does not run, so the value never becomes 0`);
  }
  const mixedBad = variant(T => { T.bom.rows[0].Scrap_Pct = ''; T.bom.rows[1].Scrap_Pct = '0.02'; T.bom.rows[2].Scrap_Pct = 'abc'; });
  ok(() => refusedAll(mixedBad) && rejRows(mixedBad).rows.map(x => x.row).join() === '4', 'S7a mixed lines with one invalid value: the whole import is refused, and only row 4 ("abc") is rejected; the blank and "0.02" rows are not reported as invalid');
  const mixed = variant(T => { T.bom.rows[0].Scrap_Pct = ''; T.bom.rows[1].Scrap_Pct = '0.02'; });
  const eb = sheetRows(mixed.ad.workbook, 'BOM');
  ok(() => mixed.imp.importAccepted && eb[0].Scrap_Factor_Pct === 0 && eb[1].Scrap_Factor_Pct === 0.02 && eb.slice(2).every((b, i) => b.Scrap_Factor_Pct === S0.imp.dataset.bom[i + 2].Scrap_Pct) &&
    mixed.ad.report.scrap.assumed.map(l => l.row).join() === '2' && mixed.ad.report.scrap.invalidLines === 0,
    'S7b mixed valid lines: blank -> 0 (assumed and disclosed, row 2), 0.02 kept, every other line keeps its own supplied value; no invalid line exists');
  // S8–S12 against hand arithmetic on the one shortage order, one behaviour per assertion. Requirement = q x Qty_Per x (1 + scrap);
  // shortage = requirement - available by the start date, so taking scrap away lowers each shortage by exactly q x Qty_Per x scrap.
  const sh0 = S0.o.feas.rows.find(r => r.status === 'Material shortage'), shz = tryv(() => Sm.o.feas.rows.find(r => r.o.id === sh0.o.id));
  const lineFor = (r, m) => S0.o.result.bomS[r.o.sku].find(l => l.Material_ID === m);
  ok(() => sh0.bl.length > 0 && sh0.bl.length === shz.bl.length && sh0.bl.every((b, i) => { const l = lineFor(sh0, b.id); return b.id === shz.bl[i].id && Math.abs((b.sh - shz.bl[i].sh) - sh0.o.q * l.Qty_Per_Finished_Unit * l.Scrap_Factor_Pct) < 1e-6; }),
    () => `S8 production requirement (order ${sh0.o.id}): for each short material, the requirement with true scrap exceeds the 0%-scrap requirement by exactly q x Qty_Per x scrap`);
  const sc1 = (() => { const by = {}; S0.o.result.bomS && Object.values(S0.o.result.bomS).flat().forEach(l => { (by[l.Material_ID] = by[l.Material_ID] || []).push(l); }); return Object.entries(by).find(([id, a]) => a.length === 1 && a[0].Scrap_Factor_Pct > 0 && S0.o.result.rm.find(x => x.id === id).annual > 0); })();
  ok(() => { const [id, [l]] = sc1, t = S0.o.result.rm.find(x => x.id === id).annual, z = Sm.o.result.rm.find(x => x.id === id).annual; return z > 0 && Math.abs(t / z - (1 + l.Scrap_Factor_Pct)) < 1e-9; },
    () => `S9 material requirement: ${sc1[0]} (one BOM line, scrap ${sc1[1][0].Scrap_Factor_Pct}) has annual usage with true scrap = its 0%-scrap usage x (1 + scrap)`);
  ok(() => shz.status === 'Material shortage' && shz.bl.every((b, i) => { const sc = lineFor(sh0, b.id).Scrap_Factor_Pct; return b.id === sh0.bl[i].id && b.sh > 0 && (sc > 0 ? sh0.bl[i].sh > b.sh : sh0.bl[i].sh === b.sh) && b.when === sh0.bl[i].when && b.sched === sh0.bl[i].sched; }),
    'S10 shortage: with 0% assumed the order is still short of the same materials, each shortage still above zero and smaller only where the line has scrap, with the same availability dates');
  ok(() => JSON.stringify(S0.o.feas.rows.map(statusOf)) === JSON.stringify(Sm.o.feas.rows.map(statusOf)) && S0.o.feas.rows.length > 0,
    'S11 feasibility: with 0% assumed, every order has its true-scrap status (scrap here is at most 5%)');
  ok(() => JSON.stringify(S0.o.feas.rows.map(r => r.delay)) === JSON.stringify(Sm.o.feas.rows.map(r => r.delay)) && sh0.delay === shz.delay,
    'S12 delay: with 0% assumed, every order has its true-scrap delay, including the genuine shortage');
  ok(() => Sm.g.labelled.some(l => l.path === 'feas' && /SCRAP_ASSUMED_ZERO/.test(l.label)) && Sm.g.labelled.some(l => l.path === 'mrp' && /SCRAP_ASSUMED_ZERO/.test(l.label)) &&
    Sm.g.labelled.filter(l => /\/ materials$/.test(l.path) && /SCRAP_ASSUMED_ZERO/.test(l.label)).length === new Set(Sm.imp.dataset.bom.map(b => b.Component_Item_ID)).size,
    'S13 reliability: production and MRP sections and every component used by an assumed line are labelled caveated (SCRAP_ASSUMED_ZERO); the result is "restricted", never "complete"');
  ok(() => Sb.g.disclosures.text.some(t => /blank on 142 BOM line\(s\)\. 0% was assumed/.test(t) && /assumes no scrap/.test(t)), 'S14 disclosure text: states the basis (blank cells), the 0% assumption and that the results are an estimate assuming no scrap');
  // S16–S17 (K7 verification): when Stage 1's records cannot separate a blank cell from an unreadable value, a blank is never assumed 0%.
  const oneBlank = T => { T.bom.rows[0].Scrap_Pct = ''; }, parent0 = S0.imp.dataset.bom[0].Parent_Item_ID, comp0 = S0.imp.dataset.bom[0].Component_Item_ID;
  // Stage 3 (D2): the marker that let such a blank be withheld is retired, so the adapter now REFUSES the import instead (never assumed 0%).
  const fallbackOk = ad => ad.status === 'refused' && ad.workbook === null && ad.report.refusals.some(x => x.code === 'SCRAP_BLANK_UNVERIFIABLE' && /rows 2\b/.test(x.message) && /never|only when that can be shown/.test(x.message));
  ok(() => { const T = pkg01(); oneBlank(T); const files = Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: out(v.h, v.rows) })), m = mapFor(T), imp = G.validate.importFiles(m, files);
      const ad = G.adapter.build(Object.freeze(Object.assign({}, imp, { issues: undefined })), m); return Array.isArray(imp.issues) && fallbackOk(ad); },
    'S16 no Stage 1 issue list: a blank scrap cell cannot be shown to be blank, so it is never assumed 0%: the adapter refuses (SCRAP_BLANK_UNVERIFIABLE, naming row 2) and no Engine View is built');
  // S17: Stage 1 refuses a table built from several files (MULTI_SOURCE, "Must fix"), so this adapter branch is a second line of
  // defence: the adapter is given a mapping that names two BOM files and must not trust Stage 1 row numbers for the blank.
  ok(() => { const T = pkg01(); oneBlank(T); const files = Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: out(v.h, v.rows) })), m = mapFor(T), imp = G.validate.importFiles(m, files);
      const m2 = JSON.parse(JSON.stringify(m)); m2.files['bom2.csv'] = m2.files['bom.csv']; m2.tables.bom.sources.push({ file: 'bom2.csv', columns: m2.tables.bom.sources[0].columns });
      const s1 = G.validate.importFiles(m2, files.concat({ name: 'bom2.csv', text: out(T.bom.h, T.bom.rows.slice(0, 1)) }));
      const ad = G.adapter.build(imp, m2);
      return !s1.importAccepted && s1.issues.some(i => i.code === 'MULTI_SOURCE' && i.table === 'bom') && fallbackOk(ad); },
    'S17 BOM named from two files: Stage 1 refuses it (MULTI_SOURCE); if the adapter is still given such a mapping, a blank scrap cell is never assumed 0%: the adapter refuses (SCRAP_BLANK_UNVERIFIABLE)');
});
guard('F2 Northstar', () => {
  // S15 Northstar (200 BOM lines, 148 with 1–3% scrap): the artificial ~36-day delay is gone and no genuine shortage is hidden.
  const rv = () => ctx.CGTestTools.reverseEightSheet(X.read(NS, { cellDates: true }));
  const nsRun = drop => { const r = rv(); if (drop) { const f = r.files.find(x => x.name === 'bom.csv'), T = csv(f.text); T.h = T.h.filter(h => h !== 'Scrap_Pct'); T.rows.forEach(x => delete x.Scrap_Pct); f.text = out(T.h, T.rows); delete r.mapping.tables.bom.sources[0].columns.Scrap_Pct; }
    const imp = G.validate.importFiles(r.mapping, r.files), ad = G.adapter.build(imp, r.mapping), o = E.runEngine({ workbook: ad.workbook }); return { ad, o, g: RG.apply(o, ad.gate) }; };
  const A = nsRun(false), M = nsRun(true), sd = r => r.o.feas.rows.map(x => x.status + '|' + x.delay);
  ok(() => M.ad.report.scrap.assumedLines === 200 && JSON.stringify(sd(A)) === JSON.stringify(sd(M)) && A.o.feas.rows[0].status === 'Feasible' && M.o.feas.rows[0].delay === 'Not from materials' &&
    sd(M).filter(x => /shortage/.test(x)).length === 33 && A.o.result.rm.every((x, i) => x.sev === M.o.result.rm[i].sev) && !M.o.result.dq.some(d => /Stock held with no demand/.test(d.msg)) && nonFinite(M.g.result) === 0,
    'S15 Northstar without the scrap column: all 50 orders keep their true-scrap status and delay (33 genuine shortages kept; order FG003/211 Feasible, not "~36d"); all 100 material severities unchanged; no NaN released');
  ok(() => A.g.status === 'complete' && M.g.status === 'restricted', 'S15: with scrap supplied the gate is complete; with it assumed the result is restricted (caveated)');
});

// =============== E-1: direct-upload scrap; the direct and import routes compared case by case (Northstar, 200 BOM lines)
// Line 1 of the Northstar BOM is FG001/RM001 with scrap 0.02. Each case changes that one cell (or the whole column) in the workbook;
// the direct route reads the workbook, the import route reads the same workbook converted to CSV files (reverse-eight-sheet).
// Parity of calculated results is asserted only where the routes are meant to agree; the two known differences ("0.02" stored as
// text, and 1.5) are asserted as differences.
console.log('\n--- E-1: direct-upload scrap, and the direct and import routes compared (Northstar, 200 BOM lines)');
guard('E-1 routes', () => {
  const colOf = ws => { const rg = X.utils.decode_range(ws['!ref']); for (let c = rg.s.c; c <= rg.e.c; c++) if ((ws[X.utils.encode_cell({ r: 0, c })] || {}).v === 'Scrap_Factor_Pct') return { c, rg }; return null; };
  const wbWith = f => { const w = X.read(NS, { cellDates: true }); f(w.Sheets.BOM, colOf(w.Sheets.BOM)); return w; };
  const set1 = cell => (ws, { c }) => { if (cell === null) delete ws[X.utils.encode_cell({ r: 1, c })]; else ws[X.utils.encode_cell({ r: 1, c })] = cell; };
  const V = {
    valid: () => {}, zero: set1({ t: 'n', v: 0 }), blank: set1(null), missing: (ws, { c, rg }) => { for (let r = 0; r <= rg.e.r; r++) delete ws[X.utils.encode_cell({ r, c })]; },
    text: set1({ t: 's', v: 'abc' }), numText: set1({ t: 's', v: '0.02' }), out: set1({ t: 'n', v: 1.5 }), space: set1({ t: 's', v: '   ' }),
    allZero: (ws, { c, rg }) => { for (let r = 1; r <= rg.e.r; r++) ws[X.utils.encode_cell({ r, c })] = { t: 'n', v: 0 }; }
  };
  const direct = k => E.runEngine({ workbook: wbWith(V[k]) });
  const viaImport = k => { const r = ctx.CGTestTools.reverseEightSheet(wbWith(V[k]));
    if (k === 'missing') { const f = r.files.find(x => x.name === 'bom.csv'), T = csv(f.text); T.h = T.h.filter(h => h !== 'Scrap_Pct'); f.text = out(T.h, T.rows); delete r.mapping.tables.bom.sources[0].columns.Scrap_Pct; }
    const imp = G.validate.importFiles(r.mapping, r.files), ad = G.adapter.build(imp, r.mapping), o = E.runEngine({ workbook: ad.workbook }); return { imp, ad, o, g: RG.apply(o, ad.gate) }; };
  const feasSig = o => JSON.stringify(o.feas.rows.map(x => x.o.id + '|' + x.status + '|' + x.delay));
  const useSig = o => JSON.stringify(o.result.rm.map(x => x.id + '|' + x.annual + '|' + x.sev));
  const scrapDq = o => o.result.dq.filter(d => /^Scrap (missing|not readable|outside)/.test(d.msg)).map(d => d.msg.split(':')[0]);
  const D = {}, I = {}, DE = {}, IR = {}; for (const k of Object.keys(V)) { D[k] = tryv(() => direct(k)); if (k !== 'allZero') I[k] = tryv(() => viaImport(k)); }
  // Stage 3 (D2): refusals. DE = the direct route's refusal message; IR = the import route stopped at Stage 1 and the adapter.
  const impOnly = w => { const r = ctx.CGTestTools.reverseEightSheet(w), imp = G.validate.importFiles(r.mapping, r.files); return { imp, ad: G.adapter.build(imp, r.mapping) }; };
  for (const k of ['text', 'out']) { try { direct(k); DE[k] = null; } catch (e) { DE[k] = e.message; } IR[k] = impOnly(wbWith(V[k])); }
  const rejected = (r, rowsWanted, why) => { const i = r.imp.issues.find(x => x.code === 'ROW_REJECTED'); return !r.imp.importAccepted && i && i.category === 'Must fix' && i.rows.map(x => x.row).join() === rowsWanted.join() &&
    i.rows.every(x => x.reasons.some(t => /^Scrap_Pct: /.test(t) && why.test(t))) && r.ad.status === 'refused' && r.ad.workbook === null; };
  const fg1 = o => o.feas.rows.filter(r => r.o.sku === 'FG001'), rm1 = o => o.result.rm.find(x => x.id === 'RM001').annual;
  const clean = (r, st) => nonFinite(r.g.result) === 0 && r.g.status === st;
  const same = k => feasSig(D[k]) === feasSig(I[k].o) && useSig(D[k]) === useSig(I[k].o);
  ok(() => D.valid.result.bomS.FG001.find(l => l.Material_ID === 'RM001').Scrap_Factor_Pct === 0.02 && nonFinite(D.valid) === 0 && scrapDq(D.valid).length === 0 && D.valid.result.dq.length === 5 && same('valid') && clean(I.valid, 'complete'),
    'E-1 case 1 valid number (FG001/RM001 0.02): direct has no NaN or Infinity, no scrap warning, its 5 known warnings; direct and import give identical feasibility (status and delay), material usage and severity; import is complete');
  ok(() => nonFinite(D.zero) === 0 && scrapDq(D.zero).length === 0 && rm1(D.zero) < rm1(D.valid) && same('zero') && clean(I.zero, 'complete') && I.zero.ad.report.scrap.assumedLines === 0,
    'E-1 case 2 explicit 0: a supplied value (no warning, no assumption, RM001 usage lower than at 2%); direct and import identical; import complete');
  ok(() => nonFinite(D.blank) === 0 && scrapDq(D.blank).join() === 'Scrap missing on 1 BOM line(s)' && feasSig(D.blank) === feasSig(D.zero) && useSig(D.blank) === useSig(D.zero) && same('blank') &&
      I.blank.ad.report.scrap.assumed.map(l => l.parent + '/' + l.component + ':' + l.basis).join() === 'FG001/RM001:blank cell' && clean(I.blank, 'restricted') && I.blank.g.labelled.some(l => /SCRAP_ASSUMED_ZERO/.test(l.label)),
    'E-1 case 3 blank cell: direct warns "Scrap missing on 1 BOM line(s): 0% assumed" and equals an explicit 0; import assumes 0% for FG001/RM001 (disclosed, caveated SCRAP_ASSUMED_ZERO, restricted); identical calculated results; no NaN');
  ok(() => nonFinite(D.missing) === 0 && scrapDq(D.missing).join() === 'Scrap missing on 200 BOM line(s)' && feasSig(D.missing) === feasSig(D.allZero) && useSig(D.missing) === useSig(D.allZero) && same('missing') &&
      !D.missing.result.dq.some(d => /Stock held with no demand/.test(d.msg)) && I.missing.ad.report.scrap.assumedLines === 200 && I.missing.ad.report.scrap.column === 'not-mapped' && clean(I.missing, 'restricted'),
    'E-1 case 4 column missing: direct warns "Scrap missing on 200 BOM line(s)" and equals an all-0% run (no false shortages or "no demand"); import assumes 0% on all 200 lines (column not supplied, restricted); identical calculated results');
  ok(() => !D.text && /^Invalid scrap in the BOM sheet, so the analysis was not run/.test(DE.text) && DE.text.includes('row 2 (FG001 / RM001) "abc": not a plain decimal or a percentage') && rejected(IR.text, [2], /not a plain decimal or a percentage/),
    () => `E-1 case 5 text "abc" (Stage 3, D2): both routes refuse, naming the row: direct "${(DE.text || '').slice(0, 120)}…"; import: Stage 1 rejects row 2 (Must fix) and the adapter refuses; never 0, never NaN, never left out silently`);
  ok(() => nonFinite(D.numText) === 0 && !scrapDq(D.numText).some(m => /not readable/.test(m)) && D.numText.result.dq.some(d => d.msg === 'Scrap stored as text was converted to a number on 1 BOM line(s): row 2 (FG001 / RM001) "0.02" → 0.02') &&
      feasSig(D.numText) === feasSig(D.valid) && useSig(D.numText) === useSig(D.valid) && I.numText.imp.dataset.bom[0].Scrap_Pct === 0.02 && same('numText') && clean(I.numText, 'complete'),
    'E-1 case 6 "0.02" stored as text (Stage 3: the E-1 route difference is RESOLVED): direct converts it to 0.02 and discloses the conversion with its row; both routes equal the valid case');
  ok(() => !D.out && DE.out.includes('row 2 (FG001 / RM001) 1.5: a value above 1 is above 100% or ambiguous') && rejected(IR.out, [2], /above 100% or ambiguous/),
    'E-1 case 7 1.5 (Stage 3: the E-1 route difference is RESOLVED): both routes reject it (above 100%), naming row 2; the direct route no longer uses 150%');
  ok(() => nonFinite(D.space) === 0 && scrapDq(D.space).join() === 'Scrap missing on 1 BOM line(s)' && feasSig(D.space) === feasSig(D.zero) && useSig(D.space) === useSig(D.zero) && same('space') &&
      I.space.ad.report.scrap.assumed.length === 1 && I.space.ad.report.scrap.invalidLines === 0 && clean(I.space, 'restricted'),
    'E-1 case 8 whitespace-only cell: treated as blank on both routes (0% assumed and disclosed; direct warns "Scrap missing on 1 BOM line(s)"); identical calculated results');
  // Confirmation 3 (Stage 3, D2): the E-1 incomplete-usage warning is retired; several invalid lines are all named in one refusal.
  const multi = tryv(() => { const w = wbWith(() => {}), ws = w.Sheets.BOM, { c } = colOf(ws), rows = sheetRows(w, 'BOM');
    const other = rows.findIndex((r, i) => i > 0 && r.Material_ID !== 'RM001'), again = rows.findIndex((r, i) => i > 0 && r.Material_ID === 'RM001');
    [0, other, again].forEach(i => { ws[X.utils.encode_cell({ r: i + 1, c })] = { t: 's', v: 'n/a' }; });
    let err = null; try { E.runEngine({ workbook: w }); } catch (e) { err = e.message; }
    return { err, imp: impOnly(w), sheetRowsAt: [0, other, again].map(i => i + 2).sort((a, b) => a - b), lines: [rows[0], rows[other], rows[again]].map(r => r.SKU + ' / ' + r.Material_ID) }; });
  ok(() => multi.err && /Correct these 3 lines/.test(multi.err) && multi.sheetRowsAt.every((n, k) => multi.err.includes('row ' + n + ' (')) && multi.lines.every(l => multi.err.includes(l)) &&
      rejected(multi.imp, multi.sheetRowsAt, /not a plain decimal or a percentage/) && ![D.valid, D.blank, D.numText].some(o => o.result.dq.some(d => /^Scrap not readable/.test(d.msg))),
    () => `E-1 several invalid lines (Stage 3, D2): 3 "n/a" lines (rows ${multi.sheetRowsAt.join(', ')}) are all named in one direct-route refusal and in one Stage 1 ROW_REJECTED; the retired "Scrap not readable" warning never appears`);
});

// =============== E-1 confirmations 1 and 2, as amended by Stage 3 (owner decision D2, 16 Nov 2026): the SCRAP_UNREADABLE marker and the gate's
// withholding of invalid scrap lines are retired. Invalid scrap stops at Stage 1; the gate and adapter keep their defensive checks.
console.log('\n--- E-1 (retired by Stage 3, D2): invalid scrap stops at Stage 1; no SCRAP_UNREADABLE marker exists; defensive checks remain');
guard('E-1 retired marker', () => {
  const T = pkg01(), n = T.bom.rows.length, bad = [0, 70, n - 1]; bad.forEach(i => { T.bom.rows[i].Scrap_Pct = 'abc'; });
  const R = run(T), rj = R.imp.issues.find(x => x.code === 'ROW_REJECTED');
  ok(() => !R.imp.importAccepted && rj && rj.rows.map(x => x.row).join() === bad.map(i => i + 2).join() && R.ad.status === 'refused' && R.ad.workbook === null && R.o === null && G.adapter.SCRAP_UNREADABLE === undefined,
    () => `E-1 marker retired: 3 invalid lines (first, middle, last; source rows ${bad.map(i => i + 2).join(', ')}) are exactly the rows Stage 1 rejects; the import is refused, no Engine View is built, so no marker can be written; the adapter no longer defines SCRAP_UNREADABLE`);
});
guard('E-1 gate', () => {
  const T = pkg01(); T.bom.rows[2].Scrap_Pct = 'abc'; const R = run(T), rj = R.imp.issues.find(x => x.code === 'ROW_REJECTED');
  ok(() => rj && rj.category === 'Must fix' && rj.rows.length === 1 && rj.rows[0].row === 4 && rj.rows[0].reasons.join() === 'Scrap_Pct: not a plain decimal or a percentage' && /row/.test(rj.message) &&
      R.ad.report.refusals.some(x => x.code === 'IMPORT_NOT_ACCEPTED') && R.g === null,
    () => `E-1 explanation for "abc" on row 4: Stage 1 gives a Must-fix ROW_REJECTED naming row 4 and "Scrap_Pct: not a plain decimal or a percentage" (message: ${rj ? rj.message.slice(0, 120) : 'none'}…); the adapter refuses; nothing is released`);
  // The gate's R1 checks still refuse a result that declares an invalid line, or whose Engine View holds a non-number scrap value.
  const V0 = run(pkg01()), cp4 = s => JSON.parse(JSON.stringify(s)), l0 = V0.o.result.bomS.P0001[0];
  ok(() => { const declared = cp4(V0.ad.gate); declared.scrap.invalid = [{ parent: 'P0001', component: l0.Material_ID, basis: 'test', row: 2, value: 'abc' }];
      const asText = Object.assign({}, V0.o, { result: Object.assign({}, V0.o.result, { bomS: Object.assign({}, V0.o.result.bomS, { P0001: V0.o.result.bomS.P0001.map(l => (l === l0 ? Object.assign({}, l, { Scrap_Factor_Pct: 'abc' }) : l)) }) }) });
      const gD = RG.apply(V0.o, declared), gT = RG.apply(asText, V0.ad.gate);
      return gD.status === 'refused' && gD.result === null && gD.notes.some(t => /is declared invalid; invalid scrap is rejected by Stage 1/.test(t)) &&
        gT.status === 'refused' && gT.result === null && gT.notes.some(t => t.includes('scrap: line P0001/' + l0.Material_ID + ' has no usable scrap value and is not declared invalid')); },
    'E-1 gate predicates (kept): a specification that declares an invalid scrap line is refused; an Engine View line holding a non-number scrap value is refused; nothing is released in either case');
  ok(() => { const S1 = V0.imp, inj = Object.freeze(Object.assign({}, S1, { issues: Object.freeze([...S1.issues, Object.freeze({ code: 'FIELD_BLANKED', table: 'bom', field: 'Scrap_Pct', rows: Object.freeze([Object.freeze({ row: 4, value: 'abc' })]) })]) }));
      const ad = G.adapter.build(inj, V0.m); return ad.status === 'refused' && ad.workbook === null && ad.report.refusals.some(x => x.code === 'SCRAP_INVALID_UPSTREAM' && /rows 4/.test(x.message) && /never assumed 0%/.test(x.message)); },
    'E-1 adapter defence (Stage 3): a Stage 1 result that still reports a blanked scrap value is refused (SCRAP_INVALID_UPSTREAM, row 4), never marked or assumed 0%');
});

// Completeness: a crash or a skipped block can never pass silently.
ok(() => pass + fail === EXPECTED - 1, () => `completeness: all ${EXPECTED - 1} assertions before this one ran (${pass + fail} ran)`);

console.log(`\nimport-integrity: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
