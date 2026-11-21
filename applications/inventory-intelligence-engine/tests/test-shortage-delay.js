#!/usr/bin/env node
/* N1 regression test (Stage 3): production feasibility never shows a negative "delay".
 *
 * Meaning (calculations.js feasCalc): an order is "Material shortage" when recorded stock plus scheduled receipts up to its start
 * date do not cover a BOM line. For each short line the engine finds when it could be covered: by a later scheduled receipt, or,
 * when none covers it, by a NEW order placed today (arrival = snapshot + the material's lead time). The delay is the latest such
 * date minus the order's start. It can be negative only on the new-order path (a scheduled receipt that covered the line before the
 * start would already be in the recorded supply). A negative value therefore means "short on recorded supply, but an order placed
 * today arrives in time": the order stays "Material shortage" (the shortage is real until someone orders) and the delay reads
 * "No delay if ordered today (arrives ~N d before start)" instead of "Likely: ~-N d". Positive delays are unchanged.
 * Also covered: an open order with no valid planned start date is "Insufficient information" and reserves no material (before
 * Stage 3 the whole engine run threw "Invalid time value").
 * Independent references: statuses and blocking materials are compared with the historical v0.5 golden snapshot (read only), and
 * every delay is recomputed here from the snapshot date, the material lead time and the start date.
 * Engine-level only; Northstar changed in memory only. Run from tests/:  NODE_PATH=<pinned test node_modules> node test-shortage-delay.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..'), DAY = 864e5;
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = '';
  try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + (e && e.message ? e.message : String(e)) + ']'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + (typeof m === 'function' ? m() : m) + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const X = ctx.XLSX, E = ctx.__E;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const GOLD = JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'v0.5-golden-20261105T101953Z.json'), 'utf8')).feas;
const build = fn => { const w = X.read(NS, { cellDates: true }); if (fn) fn(w); return X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true }); };
const run = (w, settings) => E.runEngine({ workbook: w, settings });
const fmt = n => Math.round(n).toLocaleString('en-GB');
// The delay text the engine should show, worked out here from first principles for one feasibility row.
const expectDelay = (o, x) => { if (x.status !== 'Material shortage') return null;
  const latest = Math.max(...x.bl.map(b => b.when)), d = (latest - x.o.st) / DAY;
  if (d > 0) return 'Likely: ~' + fmt(d) + 'd';
  const ahead = Math.round(-d) + 0;   // + 0 turns -0 into 0
  return 'No delay if ordered today (' + (ahead === 0 ? 'arrives by the start date' : 'arrives ~' + fmt(ahead) + 'd before start') + ')'; };

// ---------- 1. Northstar (illustrative orders): statuses and blocking materials are unchanged from the v0.5 golden snapshot.
const N = run(build()), rows = N.feas.rows;
ok(() => rows.length === GOLD.length && rows.every((x, i) => x.o.id === GOLD[i][0] && x.status === GOLD[i][1]
  && JSON.stringify(x.bl.map(b => [b.id, Math.round(b.sh * 1e4) / 1e4])) === JSON.stringify(GOLD[i][2])),
  () => `Northstar: all ${GOLD.length} feasibility rows keep the golden v0.5 order, status and blocking materials (shortage stays visible)`);
ok(() => rows.every(x => !/~-/.test(x.delay)), 'Northstar: no delay text contains a negative number');
const neg = GOLD.filter(g => /~-/.test(g[3])), pos = GOLD.filter(g => /^Likely: ~\d/.test(g[3]));
ok(() => neg.length === 20 && neg.every(g => /^No delay if ordered today \(arrives ~\d+d before start\)$/.test(rows.find(x => x.o.id === g[0]).delay)),
  () => `Northstar: the ${neg.length} golden rows with a negative delay now read "No delay if ordered today (arrives ~N d before start)"`);
ok(() => neg.every(g => rows.find(x => x.o.id === g[0]).delay === 'No delay if ordered today (arrives ~' + g[3].match(/~-(\d+)d/)[1] + 'd before start)'),
  'Northstar: each of those N equals the magnitude of the golden negative delay (same calculation, new wording)');
ok(() => pos.length === 13 && pos.every(g => rows.find(x => x.o.id === g[0]).delay === g[3]), () => `Northstar: the ${pos.length} positive golden delays are unchanged`);
ok(() => rows.every(x => x.status !== 'Material shortage' || x.delay === expectDelay(N, x)), 'Northstar: every shortage delay equals the value recomputed from snapshot date, lead time and start date');
ok(() => rows.filter(x => /^No delay/.test(x.delay)).every(x => x.bl.every(b => !b.sched) && x.why.includes('availability assumes a new order today')),
  'Northstar: every "No delay if ordered today" row depends only on new orders, and its basis says so');
ok(() => rows.filter(x => x.status !== 'Material shortage').every(x => ['Not from materials', 'Possible', 'Unknown'].includes(x.delay)), 'Northstar: the delay text of other statuses is unchanged');

// ---------- 2. Boundaries on one order (SIM17: RM057, start = snapshot + 17 days). Lateness off so the lead time is exactly as stated.
const sim17 = rows.find(x => x.o.id === 'SIM17'), lead = lt => { const w = build(wb => { const r = X.utils.sheet_to_json(wb.Sheets.Materials, { raw: true, cellDates: true });
  r.forEach(m => { if (m.Material_ID === 'RM057') m.Lead_Time_Days = lt; }); wb.Sheets.Materials = X.utils.json_to_sheet(r, { cellDates: true }); }); return run(w, { late: 0 }).feas.rows.find(x => x.o.id === 'SIM17'); };
ok(() => sim17 && sim17.status === 'Material shortage' && sim17.bl.length === 1 && sim17.bl[0].id === 'RM057' && (sim17.o.st - +new Date(N.result.snap)) / DAY === 17, 'boundary set-up: SIM17 is short of RM057 only and starts 17 days after the snapshot');
for (const [lt, want] of [[16, 'No delay if ordered today (arrives ~1d before start)'], [17, 'No delay if ordered today (arrives by the start date)'], [18, 'Likely: ~1d'], [1, 'No delay if ordered today (arrives ~16d before start)'], [40, 'Likely: ~23d']]) {
  ok(() => { const x = lead(lt); return x.status === 'Material shortage' && x.delay === want; }, () => `boundary: lead time ${lt} days -> "${want}" (got "${lead(lt).delay}")`); }

// ---------- 3. Open orders with and without a valid planned start date.
const openOrders = (startOf) => build(wb => { const r = X.utils.sheet_to_json(wb.Sheets['Production Orders'], { raw: true, cellDates: true });
  r.slice(0, 2).forEach((o, i) => { o.Order_Status = 'Planned'; const s = startOf(i, o); if (s === undefined) delete o.Planned_Start_Date; else o.Planned_Start_Date = s; });
  wb.Sheets['Production Orders'] = X.utils.json_to_sheet(r, { cellDates: true }); });
// Dates are created inside the engine's JavaScript context: SheetJS there does not recognise a Date from this file's context (it writes null).
const snapAt = d => vm.runInContext('new Date(' + (+new Date(N.result.snap) + d * DAY) + ')', ctx);
let T; ok(() => { T = run(openOrders((i) => i === 0 ? snapAt(10) : undefined)); return true; }, 'open order with no planned start date: the engine run completes (it used to throw "Invalid time value")');
ok(() => { const x = T.feas.rows.find(r => r.start === '–'); return x && x.status === 'Insufficient information' && x.delay === 'Unknown' && x.why.includes('no valid planned start date'); },
  'open order with no planned start date: "Insufficient information", delay "Unknown", start shown as "–", basis names the missing date');
ok(() => T.feas.rows[T.feas.rows.length - 1].start === '–', 'open order with no planned start date: listed after the dated orders');
ok(() => { const only = run(openOrders((i, o) => i === 0 ? snapAt(10) : o.Planned_Start_Date)), solo = run(build(wb => { const r = X.utils.sheet_to_json(wb.Sheets['Production Orders'], { raw: true, cellDates: true });
  r[0].Order_Status = 'Planned'; r[0].Planned_Start_Date = snapAt(10); wb.Sheets['Production Orders'] = X.utils.json_to_sheet(r, { cellDates: true }); }));
  const a = T.feas.rows.find(r => r.start !== '–'), b = solo.feas.rows[0]; return !!only && a.o.id === b.o.id && a.status === b.status && JSON.stringify(a.bl) === JSON.stringify(b.bl) && a.delay === b.delay; },
  'open order with no planned start date reserves no material: the dated order\'s result equals a run where it is the only open order');
ok(() => { const R2 = run(openOrders((i) => i === 0 ? snapAt(10) : 'TBC')), x = R2.feas.rows.find(r => r.start === '–'); return x && x.status === 'Insufficient information' && R2.result.dq.some(q => /^Invalid or non-date values in date fields$/.test(q.msg)); },
  'open order with a non-date start ("TBC"): "Insufficient information", and the existing invalid-date warning is raised');

console.log(`\nshortage-delay: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
