#!/usr/bin/env node
/* X1 WP1/WP2 foundations (20 Nov 2026): js/validation/x1-integrity.js — field states, provenance, dependency registry, withholding records,
 * calendar-indexed demand history. Decision-independent: no test here asserts an unresolved owner policy (D1–D7).
 * Expected outcomes are written from the design (stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md §4, §8, §9, §10), never read from the code.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-x1-foundation.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; } v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(read('js/validation/x1-integrity.js'), ctx, { filename: 'x1-integrity.js' });
const V = ctx.CGValidation, X = ctx.XLSX;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));

// ---------- WP1: the ten states
ok(() => V.STATES.length === 10 && ['valid', 'zero', 'blank', 'column-absent', 'not-supplied', 'invalid', 'non-finite', 'negative-prohibited', 'assumed', 'not-applicable'].every(s => V.STATES.includes(s)), 'the model has exactly the ten states of design §4');
ok(() => V.FIELD_NAMES.join() === 'On_Hand_Qty,Allocated_Qty,On_Order_Qty,Reorder_Point_Qty,Unit_Cost_GBP,Units_Sold,Qty_Per_Finished_Unit', 'all seven X1 fields are described');
const C = (raw, f, o) => V.classify(raw, f, o).state;
ok(() => C(12, 'Allocated_Qty') === 'valid' && C(0, 'Allocated_Qty') === 'zero', 'a positive number is valid; a recorded 0 is "zero", not missing');
ok(() => C(undefined, 'Allocated_Qty') === 'blank' && C(null, 'Allocated_Qty') === 'blank' && C('', 'Allocated_Qty') === 'blank' && C('   ', 'Allocated_Qty') === 'blank', 'no cell, a canonical null, an empty string and whitespace are all "blank" (never 0)');
ok(() => C(undefined, 'Allocated_Qty', { columnPresent: false }) === 'column-absent', 'a value from an absent column is "column-absent", distinct from a blank cell');
ok(() => C('abc', 'On_Hand_Qty') === 'invalid' && C('120', 'On_Hand_Qty') === 'invalid' && C(true, 'On_Hand_Qty') === 'invalid', 'text (including "120", pending the text-number policy) and booleans are "invalid"');
ok(() => C(NaN, 'Unit_Cost_GBP') === 'non-finite' && C(Infinity, 'Unit_Cost_GBP') === 'non-finite' && C(-Infinity, 'Unit_Cost_GBP') === 'non-finite', 'NaN, +Infinity and -Infinity are "non-finite"');
ok(() => C(-5, 'Allocated_Qty') === 'negative-prohibited' && C(-5, 'On_Order_Qty') === 'negative-prohibited' && C(-5, 'Units_Sold') === 'negative-prohibited', 'negatives are "negative-prohibited" where the import contract (CDv1) forbids them');
ok(() => C(-2, 'On_Hand_Qty') === 'valid', 'a negative On_Hand_Qty stays valid (CDv1 keeps it; B6 Option D)');
ok(() => V.classify(0, 'Unit_Cost_GBP').value === 0 && V.classify(undefined, 'Unit_Cost_GBP').value === null, 'a zero keeps the value 0; a blank has no value (null), so nothing can read it as 0');
ok(() => { try { V.classify(1, 'Safety_Stock_Qty'); return false; } catch (e) { return /unknown field/.test(e.message); } }, 'a field outside X1 is refused, not guessed');

// ---------- WP1: provenance and JSON safety
{ const p = V.provenance('Allocated_Qty', 'RM001', 'direct', { sheet: 'Inventory', row: 7, column: 'Allocated_Qty' }, V.classify(NaN, 'Allocated_Qty'), { reasons: ['r'], assumptions: [], transformations: [{ rule: 't', ruleVersion: '1', from: 'a', to: 'b' }] });
  ok(() => p.field === 'Allocated_Qty' && p.record === 'RM001' && p.route === 'direct' && p.source.sheet === 'Inventory' && p.source.row === 7 && p.state === 'non-finite' && p.transformations[0].rule === 't' && p.reasons[0] === 'r', 'a provenance record keeps field, record, route, source (sheet, row, column), state, transformations and reasons');
  ok(() => JSON.parse(JSON.stringify(p)).raw.nonFinite === 'NaN' && Object.isFrozen(p) && Object.isFrozen(p.source), 'records are JSON-safe (NaN kept as the text "NaN") and frozen'); }
ok(() => V.periodKey(new Date(2026, 3, 1)) === Date.UTC(2026, 3, 1) && V.periodKey('2026-04-01') === Date.UTC(2026, 3, 1), 'a calendar date maps to UTC midnight of that day in any time zone (the engine reader\'s calDate rule)');
ok(() => V.jsonSafe(undefined).absent === true && V.jsonSafe(new Date(NaN)).invalidDate === true, 'absence and invalid dates are recorded explicitly, never as a number');

// ---------- WP4 (direct adapter) on Northstar as supplied
const nsWb = () => X.read(NS, { cellDates: true });
{ const I = V.fromDirectWorkbook(nsWb(), X), inv = I.records.filter(r => r.field === 'On_Hand_Qty');
  ok(() => I.route === 'direct' && I.version === 'X1-F1' && V.FIELD_NAMES.every(n => I.fields[n].column === 'present'), 'Northstar direct: every X1 column is present');
  ok(() => inv.length === 150 && inv.every(r => r.state === 'valid' || r.state === 'zero') && inv[0].source.row === 2 && inv[0].source.sheet === 'Inventory', 'Northstar direct: 150 inventory records, all usable, each with its sheet row (first data row = 2)');
  ok(() => V.FIELD_NAMES.every(n => ['blank', 'invalid', 'non-finite', 'negative-prohibited', 'column-absent'].every(s => I.fields[n].counts[s] === 0)), 'Northstar direct: no blank, invalid, non-finite, negative or absent value in any X1 field');
  ok(() => V.describe(I, V.assess(I)).length === 0, 'Northstar direct: the report has no data-quality line (no broad warning on clean data)'); }

// ---------- WP2: registry and assessment
{ const R = V.createRegistry();
  R.declare('a', { label: 'A', scope: 'item', inputs: ['On_Hand_Qty'] });
  ok(() => { try { R.declare('a', { label: 'A', scope: 'item', inputs: ['On_Hand_Qty'] }); return false; } catch (e) { return /already declared/.test(e.message); } }, 'registry: a calculation cannot be declared twice');
  ok(() => { try { R.declare('b', { label: 'B', scope: 'item', inputs: ['Nope'] }); return false; } catch (e) { return /unknown field/.test(e.message); } }, 'registry: an unknown input field is refused'); }
const edited = (sheet, fn, drop) => { const w = nsWb(); const hdr = X.utils.sheet_to_json(w.Sheets[sheet], { header: 1 })[0]; const r = X.utils.sheet_to_json(w.Sheets[sheet], { raw: true, cellDates: true }); fn(r); w.Sheets[sheet] = X.utils.json_to_sheet(r, { header: drop ? hdr.filter(h => h !== drop) : hdr, cellDates: true }); return w; };
{ const w = edited('Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; r.find(x => x.Item_ID === 'FG003').Unit_Cost_GBP = 'n/a'; });
  const I = V.fromDirectWorkbook(w, X), A = V.assess(I, V.DEFAULT_DEPENDENCIES, { sup: 0 });
  const held = (calc, id) => A[calc].withheld.some(x => x.record === id);
  ok(() => I.fields.Allocated_Qty.counts.blank === 1 && I.fields.Unit_Cost_GBP.counts.invalid === 1, 'one blank allocation and one invalid cost are counted in their own fields');
  ok(() => held('available-stock', 'RM001') && held('stock-position', 'RM001') && held('shortage', 'RM001') && held('excess', 'RM001') && held('mrp-net', 'RM001'), 'RM001 (allocation blank): available stock, position, shortage, excess and MRP are identified as withheld');
  ok(() => !held('stock-quantity', 'RM001') && !held('valuation', 'RM001'), 'RM001: physical quantity and valuation stay available (they do not use allocation)');
  ok(() => held('valuation', 'FG003') && !held('stock-quantity', 'FG003') && !held('available-stock', 'FG003'), 'FG003 (cost invalid): valuation withheld; quantity and availability stay available');
  ok(() => A['available-stock'].withheld.length === 1 && A['supplier-performance'].available === 1 && A['supplier-performance'].withheld.length === 0, 'unaffected items and supplier analysis are not withheld (no contamination)');
  ok(() => { const r = A['available-stock'].withheld[0].reasons[0]; return r.field === 'Allocated_Qty' && r.state === 'blank' && r.source.sheet === 'Inventory' && typeof r.source.row === 'number'; }, 'a withheld calculation names the field, its state and the source row');
  ok(() => V.describe(I, A).some(l => /^Allocated_Qty: 1 blank \(Inventory row \d+\)\. Depends on it: .*Available stock/.test(l)) && V.describe(I, A).every(l => !/On_Hand_Qty|Units_Sold/.test(l)), 'the report line is specific to the affected field and names the dependent calculations; unaffected fields get no line'); }
{ const w = edited('Inventory', r => r.forEach(x => delete x.On_Order_Qty), 'On_Order_Qty'), I = V.fromDirectWorkbook(w, X);
  const a0 = V.assess(I, V.DEFAULT_DEPENDENCIES, { sup: 0 }), a1 = V.assess(I, V.DEFAULT_DEPENDENCIES, { sup: 1 });
  ok(() => I.fields.On_Order_Qty.column === 'absent' && I.fields.On_Order_Qty.counts['column-absent'] === 1, 'On_Order_Qty column removed: recorded once as column-absent');
  ok(() => a0['stock-position'].withheld.length === 0 && a1['stock-position'].withheld.length === 150, 'stock position depends on On_Order_Qty only when CFG.sup = 1 (default 0 uses purchase orders): design §8.2');
  ok(() => a0['available-stock'].withheld.length === 0 && a0['po-reconciliation'].withheld.length === 150, 'physical available stock never depends on on-order; the PO reconciliation always does'); }
ok(() => V.withheld('X1_TEST', { field: 'Allocated_Qty' }).withheld === true && V.withheld('X1_TEST').reason === 'X1_TEST', 'withholding records use the gate\'s { withheld, reason } shape');

// ---------- calendar-indexed history: the three conditions (C3) and no compression
{ const months = Array.from({ length: 12 }, (_, i) => Date.UTC(2025, 10 + i, 1));   // Northstar's 12 calendar months, Nov 2025 – Oct 2026
  const H = w => V.calendarHistory(V.fromDirectWorkbook(w, X), months, ['FG001']).FG001;
  const fg = r => r.filter(x => x.SKU === 'FG001').sort((a, b) => a.Month_Start - b.Month_Start);
  const full = H(nsWb());
  ok(() => full.condition === 'complete' && full.slots.length === 12 && full.missing === 0 && full.slots.every((s, i) => s.period === months[i]), 'Northstar FG001: complete; 12 slots aligned to the 12 calendar months');
  const gap = H(edited('Demand History', r => { const f = fg(r); r.splice(r.indexOf(f[5]), 1); }));
  ok(() => gap.condition === 'partial' && gap.slots.length === 12 && gap.slots[5].state === 'missing' && gap.slots[5].cause === 'no row' && gap.slots[6].period === months[6] && gap.slots[6].value === full.slots[6].value, 'a missing middle month stays in place: slot 6 is "missing", slot 7 keeps its own month and value (no compression)');
  const blank = H(edited('Demand History', r => { delete fg(r)[11].Units_Sold; }));
  ok(() => blank.condition === 'partial' && blank.slots[11].state === 'missing' && blank.slots[11].cause === 'blank', 'a blank cell is a missing slot with cause "blank" (its meaning, unknown or zero, is D6 and not applied)');
  const none = H(edited('Demand History', r => { r.splice(0, r.length, ...r.filter(x => x.SKU !== 'FG001')); }));
  // task 3 (21 Nov 2026, CR-12): "no rows at all" is now its own condition 'no-rows' (interim, owner decision Q1 pending); rows that exist but are
  // all unusable remain 'no-usable-history' (checked below with every value invalid). Superseded expectation: 'no-usable-history' for no rows.
  ok(() => none.condition === 'no-rows' && none.usable === 0 && none.missing === 12, 'no demand rows at all: "no-rows" (interim Q1), not "complete" and not zero history');
  const zero = H(edited('Demand History', r => { fg(r).forEach(x => { x.Units_Sold = 0; }); }));
  ok(() => zero.condition === 'recorded-zero' && zero.zeros === 12 && zero.missing === 0, 'every month recorded as 0: "recorded-zero", distinct from no-usable-history');
  const bad = H(edited('Demand History', r => { fg(r).forEach(x => { x.Units_Sold = 'n/a'; }); }));
  ok(() => bad.condition === 'no-usable-history' && bad.slots.every(s => s.cause === 'invalid'), 'every value invalid: no usable history, each slot keeps its cause');
  const A = V.assess(V.fromDirectWorkbook(edited('Demand History', r => { fg(r).forEach(x => { x.Units_Sold = 'n/a'; }); }), X), V.DEFAULT_DEPENDENCIES, { history: { FG001: bad } });
  ok(() => A.forecast.withheld.some(x => x.record === 'FG001' && x.reasons[0].state === 'no-usable-history') && !A['available-stock'].withheld.some(x => x.record === 'FG001'), 'with rows but no usable value the forecast dependency is withheld; availability is not affected');
  const A0 = V.assess(V.fromDirectWorkbook(edited('Demand History', r => { r.splice(0, r.length, ...r.filter(x => x.SKU !== 'FG001')); }), X), V.DEFAULT_DEPENDENCIES, { history: { FG001: none } });
  // task 4 (owner Q1 approval, 21 Nov 2026; CR-17): superseded expectation "no rows at all: not withheld (interim)" -> withheld, demand unknown (D6)
  ok(() => A0.forecast.withheld.some(x => x.record === 'FG001' && x.reasons[0].state === 'no-rows') && !A0['available-stock'].withheld.some(x => x.record === 'FG001'), 'with no demand rows at all the forecast dependency is withheld (D6 + Q1: unknown, not zero); availability unaffected'); }

console.log(`\nx1-foundation: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
