#!/usr/bin/env node
/* Stage 3 N3 / owner decision D4 (16 Nov 2026): partial group totals in the Universal Import result gate (js/import/result-gate.js, R4).
 * When a group total (exF, exR, exV, shV, cogsF, cogsR) used to be withheld because items of its group(s) are withheld, the gate now
 * releases { value, partial: true, excludedItems: [{ id, reason }] } over the items whose value is released. Safeguards checked here:
 *   1 identifiable: RG.isPartial, a PARTIAL_TOTAL label, disclosures.partialTotals and a sentence saying they are not complete totals;
 *   2 every left-out item is named with its reason;  3 never a plain number;  4 ABC / cumulative share stay withheld;
 *   5 no eligible item -> withheld with NO_ELIGIBLE_ITEMS, never 0;  6 any arithmetic, comparison or string use throws.
 * A complete dataset is unchanged (plain numbers, no partial totals). Values are recomputed here from the engine's own item values.
 * Package 01 runs through Stage 1, the adapter and the engine; the gate specification is varied in memory (a copy) to withhold items.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-partial-totals.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; }
  let msg; try { msg = typeof m === 'function' ? m() : m; } catch (e) { msg = '(message could not be built: ' + e.message + ')'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + msg + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'adapter', 'result-gate']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const E = ctx.__E, G = ctx.CGImport, RG = G.resultGate, P01 = path.join(__dirname, 'fixtures', 'library', '01-Clean-Manufacturer');
const csv = t => { const L = t.replace(/\r/g, '').trim().split('\n'), h = L[0].split(','); return { h, rows: L.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(h.map((k, i) => [k, c[i] === undefined ? '' : c[i]])); }) }; };
const outCsv = (h, rows) => [h.join(','), ...rows.map(r => h.map(k => (r[k] === undefined ? '' : r[k])).join(','))].join('\n') + '\n';
const T = {}; for (const n of fs.readdirSync(P01).filter(n => n.endsWith('.csv'))) T[n.slice(0, -4)] = csv(fs.readFileSync(path.join(P01, n), 'utf8'));
const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'partial', files: {}, tables: {} };
for (const [t, v] of Object.entries(T)) { const f = t + '.csv'; m.files[f] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => v.h.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
  const cols = {}; for (const h of v.h) if (G.canonical.field(t, h)) cols[h] = { source: h }; m.tables[t] = { sources: [{ file: f, columns: cols }] }; }
const imp = G.validate.importFiles(m, Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: outCsv(v.h, v.rows) }))), ad = G.adapter.build(imp, m);
const o = E.runEngine({ workbook: ad.workbook }), eng = o.result, cp = s => JSON.parse(JSON.stringify(s));
const withhold = ids => { const s = cp(ad.gate); ids.forEach(id => { s.items[id] = s.items[id] || { withhold: [], labels: [] }; s.items[id].withhold.push({ analysis: 'demand', reason: 'TEST_DEMAND_WITHHELD' }); }); return RG.apply(o, s); };
const near = (a, b) => Math.abs(a - b) < 0.005, sum = (a, f) => a.reduce((t, x) => t + x[f], 0), isW = v => v !== null && typeof v === 'object' && v.withheld === true;
const TOT = ['exF', 'exR', 'exV', 'shV', 'cogsF', 'cogsR'];

// ---------- 1. Complete dataset: unchanged (plain numbers, no partial totals).
const C = RG.apply(o, ad.gate);
ok(() => imp.importAccepted && ad.status === 'complete' && C.status === 'complete' && TOT.every(k => typeof C.result.result[k] === 'number' && C.result.result[k] === eng[k]) && C.disclosures.partialTotals.length === 0,
  'complete Package 01: all six totals are the engine\'s plain numbers; no partial total; gate complete');

// ---------- 2. One product withheld for demand. The gate's R2 also withholds the material results of its components (their usage would
// leave out its demand), so the materials totals are partial too. The components are taken independently from the engine's own BOM.
const id = eng.fg[0].id, one = withhold([id]), R1 = one.result.result, x1 = eng.fg[0];
const comps = [...new Set(eng.bomS[id].map(l => l.Material_ID))].sort(), cx = eng.rm.filter(x => comps.includes(x.id));
const partial = v => RG.isPartial(v) && Object.isFrozen(v) && Object.keys(v).join() === 'value,partial,excludedItems' && v.partial === true;
const ids = v => v.excludedItems.map(e => e.id).sort().join();
ok(() => partial(R1.exF) && near(R1.exF.value, eng.exF - x1.exVal) && partial(R1.cogsF) && near(R1.cogsF.value, eng.cogsF - x1.ann) &&
  partial(R1.exR) && near(R1.exR.value, eng.exR - sum(cx, 'exVal')) && partial(R1.cogsR) && near(R1.cogsR.value, eng.cogsR - sum(cx, 'ann')) &&
  partial(R1.exV) && near(R1.exV.value, eng.exV - x1.exVal - sum(cx, 'exVal')) && partial(R1.shV) && near(R1.shV.value, eng.shV - x1.short - sum(cx, 'short')),
  () => `one product (${id}) withheld: all six totals are partial and equal the engine total minus the left-out items' own values (${id}, and its components ${comps.join(', ')}); exF ${R1.exF.value.toFixed(2)} = ${eng.exF.toFixed(2)} − ${x1.exVal.toFixed(2)}`);
ok(() => ids(R1.exF) === id && ids(R1.cogsF) === id && ids(R1.exR) === comps.join() && ids(R1.exV) === [id, ...comps].sort().join() && ids(R1.shV) === [id, ...comps].sort().join() &&
  [R1.exF, R1.exV].every(v => v.excludedItems.find(e => e.id === id).reason.includes('TEST_DEMAND_WITHHELD')) && R1.exR.excludedItems.every(e => /materials/.test(e.reason) && e.reason.includes(id)),
  () => `every partial total names exactly the items it leaves out, with the reason (${id}: its withheld demand; ${comps.join(', ')}: their material results depend on ${id})`);
ok(() => one.disclosures.partialTotals.map(t => t.path).join() === 'exF,exR,exV,shV,cogsF,cogsR' && one.disclosures.partialTotals.every(t => t.items + t.excludedItems.length === t.of) &&
  one.disclosures.text.some(t => /^Partial totals \(not complete totals\): exF covers \d+ of \d+ items \(excluded: /.test(t) && /Do not present them as complete exposure or financial totals/.test(t)) &&
  TOT.every(k => one.labelled.some(l => l.path === 'result.' + k && /^PARTIAL_TOTAL: /.test(l.label))) && one.status === 'restricted',
  'one product withheld: disclosures list the six partial totals with counts, a sentence says they are not complete totals, each is labelled PARTIAL_TOTAL, and the gate is restricted');
ok(() => R1.fg.every(x => isW(x.abc) && isW(x.cum)) && R1.rm.every(x => isW(x.abc) && isW(x.cum)), 'one product withheld: ABC classes and cumulative shares stay withheld for both groups (each has withheld items)');
// Safeguard 6: a partial total cannot be used as a number or a string by accident.
const throwsPartial = f => { try { f(); return false; } catch (e) { return /^partial total: read \.value/.test(e.message); } };
ok(() => throwsPartial(() => R1.exV + 0) && throwsPartial(() => R1.exV * 2) && throwsPartial(() => R1.exV > 0) && throwsPartial(() => Math.max(R1.exV, 0)) && throwsPartial(() => '£' + R1.exV) && throwsPartial(() => `${R1.exV}`) && throwsPartial(() => Number(R1.exV)),
  'a partial total throws on arithmetic, comparison, Math, string concatenation, template strings and Number() (it cannot enter a calculation or a display as a complete figure)');
ok(() => JSON.stringify(R1.exV) === JSON.stringify({ value: R1.exV.value, partial: true, excludedItems: R1.exV.excludedItems }) && typeof R1.exV.value === 'number', 'a partial total serialises as exactly { value, partial: true, excludedItems } (no hidden fields in JSON)');

// ---------- 3. Every product withheld: every material is a component, so no item of any group is eligible -> all six withheld, never 0.
const all = withhold(eng.fg.map(x => x.id)), RA = all.result.result, used = new Set(Object.values(eng.bomS).flat().map(l => l.Material_ID));
ok(() => eng.rm.every(x => used.has(x.id)) && TOT.every(k => isW(RA[k]) && /^NO_ELIGIBLE_ITEMS: /.test(RA[k].reason)) && all.disclosures.partialTotals.length === 0 &&
  TOT.every(k => all.disclosures.withheldTotals.some(t => t.path === k && /^NO_ELIGIBLE_ITEMS/.test(t.reason))),
  'every product withheld (and so every material, all being components): no total has an eligible item, so all six are withheld (NO_ELIGIBLE_ITEMS) and listed; none is released as 0');

console.log(`\npartial-totals: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
