#!/usr/bin/env node
/* X1 WP3/WP4 (20 Nov 2026): MRP crash containment and the integrity record attached by CGEngine.runEngine, on both routes.
 * Acceptance wording (owner, 20 Nov): the missing-allocation condition must no longer terminate the analysis run; the affected outputs must be
 * withheld or clearly marked unavailable. A contained failure is NOT a successful calculation: these tests check that the affected rows are
 * "Not calculated" with a reason and no number, never that they produce a figure.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-x1-containment.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; } v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
function load(withX1) {
  const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
  vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
  for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
  if (withX1) vm.runInContext(read('js/validation/x1-integrity.js'), ctx, { filename: 'x1-integrity.js' });
  for (const n of ['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api']) vm.runInContext(read('js/' + n + '.js'), ctx, { filename: n + '.js' });
  vm.runInContext('globalThis.__E=CGEngine;', ctx);
  vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx);
  return ctx;
}
const C = load(true), C0 = load(false), X = C.XLSX;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const fresh = () => X.read(NS, { cellDates: true });
// each engine copy reads the bytes with its OWN XLSX, so dates are created in its own context (a cross-context Date shifts lead-time risk dates)
const rt = (w, XL) => (XL || X).read(Buffer.from(X.write(w, { type: 'buffer', bookType: 'xlsx', cellDates: true })), { type: 'buffer', cellDates: true });
const edit = (sh, fn) => { const w = fresh(); const hdr = X.utils.sheet_to_json(w.Sheets[sh], { header: 1 })[0]; const r = X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }); const h2 = fn(r, hdr) || hdr; w.Sheets[sh] = X.utils.json_to_sheet(r, { header: h2, cellDates: true }); return w; };
const nonFinite = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !isFinite(v) ? '__NF__' : v).split('__NF__').length - 1;
const run = (ctx, w, opts) => { try { return { o: ctx.__E.runEngine(Object.assign({ workbook: rt(w, ctx.XLSX) }, opts || {})) }; } catch (e) { return { err: e }; } };
const viaImport = (ctx, w, withIntegrity) => {
  const G = ctx.CGImport, rv = ctx.CGTestTools.reverseEightSheet(rt(w, ctx.XLSX)), imp = G.validate.importFiles(rv.mapping, rv.files);
  if (!imp.importAccepted) return { stage: 'Stage 1 refused', imp };
  const ad = G.adapter.build(imp, rv.mapping); if (!ad.workbook) return { stage: 'adapter refused', ad };
  const integrity = withIntegrity ? ctx.CGValidation.fromImport(imp, rv.mapping) : undefined;
  let o; try { o = ctx.__E.runEngine({ workbook: ad.workbook, integrity }); } catch (e) { return { stage: 'engine threw', err: e }; }
  return { stage: 'ran', o, g: G.resultGate.apply(o, ad.gate), imp, integrity };
};
const dates = m => [m.out, m.by];
const plain = m => JSON.stringify(m.map(r => ({ id: r.x.id, st: r.st, net: r.net, qty: r.qty, val: r.val, out: r.out, by: r.by, rq: r.rq, gross: r.gross, netU: r.netU })));

// ---------- clean Northstar: nothing changes
const base0 = run(C0, fresh()), base = run(C, fresh());
ok(() => !base0.err && !base.err, 'Northstar as supplied runs on the direct route, with and without the X1 module');
ok(() => plain(base.o.mrp) === plain(base0.o.mrp) && base.o.mrp.every(r => !r.nc && !r.why), 'Northstar: every MRP row is identical with and without X1; none is withheld');
ok(() => base0.o.integrity === undefined && base.o.integrity && base.o.integrity.route === 'direct' && base.o.integrity.status === 'inputs-valid', 'out.integrity is attached only when the module is loaded; on Northstar it reports inputs-valid');
ok(() => /not performed/.test(base.o.integrity.verification) && !JSON.stringify(base.o.integrity).includes('"Verified"'), 'the integrity record never claims verification');
ok(() => base.o.integrity.report.length === 0 && Object.values(base.o.integrity.history).filter(h => h.condition === 'complete').length >= 1, 'Northstar: no data-quality line; calendar history is built per item');
ok(() => Object.isFrozen(base.o.integrity) && Object.isFrozen(base.o) && JSON.parse(JSON.stringify(base.o.integrity)).route === 'direct', 'the integrity record is frozen with the output and survives JSON export');

// ---------- clean data withholds NOTHING (CR-06, 21 Nov 2026: raw materials were falsely withheld via 'no-usable-history'; the old checks only
// asserted that an affected item WAS listed, which was also true on clean data). Every calculation, both routes, all 17 snapshot fixtures.
{ const held = o => Object.entries(o.integrity.dependencies).filter(([, v]) => v.withheld.length).map(([k, v]) => k + ':' + v.withheld.length);
  ok(() => held(base.o).length === 0, 'Northstar direct: no calculation has any withheld record');
  ok(() => Object.keys(base.o.integrity.history).length === base.o.result.fg.length && base.o.result.fg.every(x => base.o.integrity.history[x.id]) && base.o.result.rm.every(x => !base.o.integrity.history[x.id]), 'demand history exists for every finished good and for no raw material (raw-material usage comes through the BOM)');
  const FX = Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'v0.7-confidence-20261116T034921Z.json'), 'utf8')).fixtures), bad = [];
  for (const f of FX) { const r = run(C, X.read(fs.readFileSync(path.join(__dirname, 'fixtures', f)), { cellDates: true })); if (r.err || held(r.o).length || r.o.integrity.status !== 'inputs-valid') bad.push(f + ' ' + (r.err ? r.err.message : held(r.o).join() + ' ' + r.o.integrity.status)); }
  ok(() => FX.length === 17 && bad.length === 0, 'all 17 confidence-snapshot fixtures: inputs-valid and nothing withheld (' + (bad.join('; ') || 'none') + ')');
  const w = run(C, X.read(fs.readFileSync(path.join(__dirname, 'fixtures', 'structure', 'scenario-willow.xlsx')), { cellDates: true })).o.integrity.history;
  const gaps = Object.keys(w).filter(k => { const u = w[k].slots.map(x => x.state !== 'missing'), a = u.indexOf(true), b = u.lastIndexOf(true); return a >= 0 && u.slice(a, b + 1).includes(false); }).sort();
  ok(() => gaps.join() === 'WF-B330,WF-E110,WF-F355,WF-I957,WF-K343,WF-N525', 'Willow: the six items with an INTERNAL demand gap are identified (WP6 regression scope under D6; issue 5)'); }

// ---------- the RM001 blank allocation that used to stop the run (start-of-task probe: RangeError at calculations.js line 180)
const wBlank = () => edit('Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; });
{ const d = run(C, wBlank()), d0 = run(C0, wBlank());
  ok(() => !d.err && !d0.err, 'one blank Allocated_Qty on RM001: the direct run completes (with and without the X1 module)');
  const rm = d.o.mrp.find(r => r.x.id === 'RM001');
  // task 3 (21 Nov 2026, CR-12; owner §6.3): canonical status "Not Assessed" replaces "Not calculated"; the engine reason now names the input state.
  ok(() => rm.st === 'Not Assessed' && rm.nc === true && /Allocated_Qty blank/.test(rm.why), 'RM001 MRP row is "Not Assessed" with the reason "Allocated_Qty blank"');
  ok(() => rm.net === null && rm.qty === null && rm.val === null && rm.gross === null && rm.out === '–' && rm.by === '–', 'RM001: no net, quantity, value or date is published (withheld, not zero)');
  ok(() => nonFinite(d.o.mrp.map(r => ({ net: r.net, qty: r.qty, val: r.val, gross: r.gross, netU: r.netU }))) === 0 && d.o.mrp.every(r => dates(r).every(s => typeof s === 'string' && !/NaN|Invalid/.test(s))), 'no MRP number is NaN/Infinity and no date string is invalid');
  ok(() => { const a = JSON.parse(plain(d.o.mrp.filter(r => r.x.id !== 'RM001'))), b = JSON.parse(plain(base.o.mrp.filter(r => r.x.id !== 'RM001'))); return JSON.stringify(a) === JSON.stringify(b); }, 'every other material\'s MRP row is identical to the clean run (no contamination)');
  ok(() => d.o.mrp.filter(r => r.nc).length === 1, 'exactly one row is withheld');
  ok(() => d.o.integrity.dependencies['mrp-net'].withheld.some(w => w.record === 'RM001') && d.o.integrity.fields.Allocated_Qty.counts.blank === 1, 'the integrity record names RM001 and the blank allocation');
  ok(() => d.o.integrity.report.some(l => /^Allocated_Qty: 1 blank/.test(l)), 'the report has one specific line for Allocated_Qty'); }

// ---------- the whole Allocated_Qty column absent (crashed both routes at the start of the task, and at Tag-5 and B)
const wAbsent = () => edit('Inventory', (r, h) => { r.forEach(x => delete x.Allocated_Qty); return h.filter(c => c !== 'Allocated_Qty'); });
{ const d = run(C, wAbsent());
  ok(() => !d.err, 'Allocated_Qty column absent: the direct run completes');
  ok(() => d.o.mrp.length === base.o.mrp.length && d.o.mrp.every(r => r.st === 'Not Assessed' && r.net === null), 'column absent: every MRP row is "Not Assessed" (no material has an allocation)');
  ok(() => d.o.integrity.fields.Allocated_Qty.column === 'absent' && d.o.integrity.dependencies['available-stock'].withheld.length > 0 && d.o.integrity.dependencies['stock-quantity'].withheld.length === 0, 'column absent: recorded as absent; availability withheld; physical quantity still available');
  // Forecast FIGURES do not use allocation; the forecast recommendation TEXT does (stock-cover sentence). Found 20 Nov: with allocation unknown that
  // sentence is silently dropped, with or without X1 (existing behaviour, reported as a finding, not changed here).
  const fig = fc => JSON.stringify(Object.fromEntries(Object.entries(fc).map(([k, v]) => [k, Object.assign({}, v, { rec: undefined })])));
  ok(() => Object.keys(d.o.forecasts).length === Object.keys(base.o.forecasts).length && fig(d.o.forecasts) === fig(base.o.forecasts), 'column absent: forecast figures are unchanged (recommendation text excluded: it uses available stock)');
  ok(() => !/NaN|Infinity/.test(JSON.stringify(d.o.forecasts)), 'column absent: no forecast text or figure contains NaN or Infinity'); }

// ---------- import route: the same conditions now reach the result gate instead of crashing
{ const b = viaImport(C, wBlank(), true), a = viaImport(C, wAbsent(), true), c = viaImport(C, fresh(), true);
  ok(() => c.stage === 'ran' && b.stage === 'ran' && a.stage === 'ran', 'import route: clean, one blank allocation and absent column all complete the engine run');
  ok(() => b.o.mrp.filter(r => r.nc).map(r => r.x.id).join() === 'RM001', 'import route, one blank: only RM001 is withheld');
  ok(() => a.o.mrp.every(r => r.nc), 'import route, column absent: every MRP row withheld');
  ok(() => typeof b.g.status === 'string' && typeof a.g.status === 'string' && typeof c.g.status === 'string', 'import route: the result gate still runs on each output and returns its own status (gate rules unchanged)');
  ok(() => b.o.integrity.route === 'import' && c.o.integrity.route === 'import' && c.o.integrity.status === 'inputs-valid', 'import route: opts.integrity from CGValidation.fromImport is attached as an import-route record');
  ok(() => { const d = run(C, wBlank()).o; return d.integrity.fields.Allocated_Qty.counts.blank === b.o.integrity.fields.Allocated_Qty.counts.blank && b.o.integrity.dependencies['mrp-net'].withheld.some(w => w.record.split('|')[0] === 'RM001'); }, 'route parity: both routes classify the one blank allocation the same way and both withhold RM001');
  ok(() => Object.values(c.o.integrity.dependencies).every(v => v.withheld.length === 0) && Object.keys(c.o.integrity.history).length === c.o.result.fg.length, 'import route, clean data: nothing withheld; history for finished goods only (same as direct)');
  ok(() => { const hd = base.o.integrity.history, hi = c.o.integrity.history; return Object.keys(hd).length > 0 && Object.keys(hd).every(k => hi[k] && hi[k].condition === hd[k].condition && hi[k].usable === hd[k].usable); }, 'route parity: the calendar history condition and usable-month count match for every item on both routes (clean data)');
  ok(() => { const i = b.integrity.records.find(r => r.field === 'Allocated_Qty' && r.state === 'blank'); return i && i.source.row != null && i.source.table === 'stock' && i.transformations[0].rule === 'Stage 1 CDv1 cleaning'; }, 'import route provenance keeps the source row, the canonical table and the Stage 1 step'); }

// ---------- clarification D (21 Nov 2026): advice that cannot be calculated is explained, never dropped silently
{ const wFG = () => edit('Inventory', r => { delete r.find(x => x.Item_ID === 'FG003').Allocated_Qty; });
  const d = run(C, wFG()).o, d0 = run(C0, wFG()).o, c = run(C0, fresh()).o;
  ok(() => /Stock cover not assessed: available stock is unknown/.test(d.forecasts.FG003.rec) && !/covers [\d.]+d at forecast demand/.test(d.forecasts.FG003.rec), 'FG003 allocation blank: the forecast advice says stock cover was not assessed and why (it used to vanish)');
  ok(() => d0.forecasts.FG003.rec === d.forecasts.FG003.rec, 'the explanation comes from forecasting.js itself, so it is the same with or without the X1 module');
  ok(() => c.forecasts.FG003.rec === base.o.forecasts.FG003.rec && /covers 0\.0d at forecast demand, below [\d.]+d lead time: replenish/.test(c.forecasts.FG003.rec), 'clean data: the original replenish advice is unchanged');
  ok(() => Object.keys(d.forecasts).filter(k => k !== 'FG003').every(k => d.forecasts[k].rec === base.o.forecasts[k].rec), 'every other item keeps exactly its clean-data advice');
  ok(() => d.integrity.dependencies.shortage.withheld.some(w => w.record === 'FG003') && d.integrity.dependencies['available-stock'].withheld.some(w => w.record === 'FG003'), 'the integrity record identifies FG003 shortage and availability as dependent on the missing value (risk-status withholding itself is WP5, D1/D4)'); }

// ---------- secondary guards
{ const d = run(C, edit('Inventory', r => { r.find(x => x.Item_ID === 'RM002').Unit_Cost_GBP = 'n/a'; }));
  const rm = !d.err && d.o.mrp.find(r => r.x.id === 'RM002');
  // P3 inspection (21 Nov 2026): the earlier check also accepted any finite value, so it could pass with a wrong £ figure. Now exact.
  const rm0 = base.o.mrp.find(r => r.x.id === 'RM002');
  ok(() => !d.err && rm && rm0.qty > 0 && rm.qty === rm0.qty && rm.net === rm0.net && rm.val === null && nonFinite(d.o.mrp.map(r => r.val)) === 0, 'an unreadable unit cost (RM002): order quantity and net unchanged, £ value null (not NaN, not a number)'); }
{ // P3 inspection (21 Nov 2026): the earlier wording claimed to exercise the non-finite lead-time guard, which data cannot reach (lead time always
  // falls back: stated > supplier standard > PO history > default setting, calculations.js line 135-136). The check now states exactly that.
  const d = run(C, edit('Materials', r => { r.forEach(x => { if (x.Material_ID === 'RM003') delete x.Lead_Time_Days; }); }));
  const x3 = !d.err && d.o.result.rm.find(x => x.id === 'RM003');
  ok(() => x3 && Number.isFinite(x3.lt) && x3.ltInfo.source !== 'Supplied' && d.o.mrp.every(r => dates(r).every(s => !/NaN|Invalid/.test(s))), 'a blank material lead time falls back to a finite lead time with a non-"Supplied" source, and every MRP date stays valid'); }
ok(() => { const r = run(C, fresh(), { integrity: { route: 'direct', records: [] } }); return r.err && r.err.code === 'BAD_INTEGRITY'; }, 'runEngine refuses an opts.integrity that is not an import-route record (no silent mix-up)');

// ---------- app view: source string check only. The rendering itself is tested in a real browser by browser-x1-chrome.js
{ const app = read('js/app.js');
  ok(() => /nc=a\.filter\(r=>r\.nc\)/.test(app) && /<strong data-x1="partial">partial<\/strong>: excludes/.test(app) && /Not Assessed \(required inputs missing or invalid/.test(app), 'app.js MRP view counts withheld rows separately and labels the replenishment total partial when a value is missing'); }

console.log(`\nx1-containment: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
