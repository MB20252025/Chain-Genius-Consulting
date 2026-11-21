#!/usr/bin/env node
/* Stage 3 time-zone verification for the existing five zones (UTC, Europe/London, America/New_York, Asia/Kolkata, Pacific/Auckland).
 *
 * Excel stores a date as a serial number. SheetJS turns it into a local-time Date; the direct-upload reader (excel-import.js calDate)
 * re-expresses it as the same calendar date at UTC midnight, because the engine works in UTC. This test writes real date cells
 * (serial numbers with a date format) on the days each zone changes clock (daylight saving), on year and month boundaries and on a
 * leap day, then checks, in each zone separately: (1) every date reads as exactly that calendar date at UTC midnight; (2) the engine
 * runs; and, across zones: (3) the complete engine output (result, MRP, feasibility, forecasts, client questions, confidence) is
 * byte-identical in all five zones, so results are deterministic and do not depend on the computer's time zone.
 * Engine-level only; Northstar changed in memory only. Run from tests/:  NODE_PATH=<pinned test node_modules> node test-tz-boundaries.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];
// Clock-change days in 2026 (local): London 29 Mar / 25 Oct; New York 8 Mar / 1 Nov; Auckland 5 Apr / 27 Sep; Kolkata none.
const DAYS = ['2026-03-08', '2026-03-29', '2026-04-05', '2026-09-27', '2026-10-25', '2026-11-01', '2025-12-31', '2026-01-01', '2024-02-29', '2026-10-31'];
if (!process.argv.includes('--once')) {
  let P = 0, F = 0; const outs = [];
  for (const z of ZONES) {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 64e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /tz-boundaries: (\d+) passed, (\d+) failed\s*\nDIGEST ([0-9a-f]+)\s*$/.exec(r.stdout.trim() + '\n');
    if (m) { P += +m[1]; F += +m[2]; outs.push(m[3]); } else { F++; outs.push(null); console.log('FAIL: ' + z + ': no valid summary line'); }
  }
  const same = outs.every(o => o && o === outs[0]); same ? P++ : F++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: the complete engine output is identical in all ${ZONES.length} time zones (digest ${outs[0] ? outs[0].slice(0, 16) : '-'})`);
  console.log(`tz-boundaries all zones: ${P} passed, ${F} failed`);
  process.exit(F ? 1 : 0);
}
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; } v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const APP = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;globalThis.__rows=(w,n)=>{const p=WB;WB=w;try{return rows(n)}finally{WB=p}};', ctx, { filename: 'engine' });
const CDate = vm.runInContext('Date', ctx), X = ctx.XLSX, E = ctx.__E, NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const serial = iso => { const [y, m, d] = iso.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; };
// Purchase Orders rows 2..11: Order_Date = the boundary day; Promised_Date = the next boundary day (or the same day for the last).
const w0 = X.read(NS, { cellDates: true }), ws = w0.Sheets['Purchase Orders'], rg = X.utils.decode_range(ws['!ref']);
const col = h => { for (let c = rg.s.c; c <= rg.e.c; c++) if ((ws[X.utils.encode_cell({ r: 0, c })] || {}).v === h) return c; return -1; };
const put = (r, h, iso) => { ws[X.utils.encode_cell({ r, c: col(h) })] = { t: 'n', v: serial(iso), z: 'yyyy-mm-dd' }; };
DAYS.forEach((d, i) => { put(i + 1, 'Order_Date', d); put(i + 1, 'Promised_Date', DAYS[Math.min(i + 1, DAYS.length - 1)] > d ? DAYS[i + 1] : d); });
const wb = X.read(X.write(w0, { type: 'array', bookType: 'xlsx' }), { cellDates: true });
const po = ctx.__rows(wb, 'Purchase Orders');
console.log('time zone: ' + (process.env.TZ || '(default)'));
DAYS.forEach((d, i) => ok(() => po[i].Order_Date instanceof CDate && po[i].Order_Date.toISOString() === d + 'T00:00:00.000Z', `Order_Date written as ${d} reads as ${d} at UTC midnight (got ${po[i].Order_Date && po[i].Order_Date.toISOString && po[i].Order_Date.toISOString()})`));
ok(() => po.every(r => !(r.Order_Date instanceof CDate) || r.Order_Date.getUTCHours() === 0 && r.Order_Date.getUTCMinutes() === 0 && r.Order_Date.getUTCSeconds() === 0), 'every Order_Date in the sheet is exactly UTC midnight (no hour or second offset)');
ok(() => ctx.__rows(wb, 'Inventory').every(r => r.Snapshot_Date.toISOString() === '2026-10-31T00:00:00.000Z'), 'the snapshot date reads as 2026-10-31 at UTC midnight on every Inventory row');
let o; ok(() => { o = E.runEngine({ workbook: wb }); return !!o; }, 'the engine runs on the boundary-date workbook');
ok(() => o.feas.rows.every(x => x.start === '–' || /^\d{4}-\d{2}-\d{2}$/.test(x.start)), 'feasibility start dates are plain calendar dates');
console.log(`\ntz-boundaries: ${pass} passed, ${fail} failed`);
console.log('DIGEST ' + crypto.createHash('sha256').update(JSON.stringify({ r: o && o.result, m: o && o.mrp, f: o && o.feas, fc: o && o.forecasts, c: o && o.forecastCredibility, q: o && o.clientQuestions, k: o && o.confidence })).digest('hex'));
process.exit(fail ? 1 : 0);
