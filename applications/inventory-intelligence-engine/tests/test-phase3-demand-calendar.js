// Stage 3B Phase 3 (25 Nov 2026): duplicate product-months, missing months and the global forecast boundary (owner rules A–F).
// Expected results here are built independently of the engine:
//  - calendar cases: the expected month-by-month history is written out by hand for each case;
//  - duplicates: a workbook resolved by a decision must give EXACTLY the results of a workbook in which this test itself kept
//    only the chosen row (or, for "exclude", removed the month), on every product, material and forecast;
//  - forecasts with gaps: mean, trend on calendar positions, the uncertainty band and the start month are recomputed here;
//  - gap-free workbooks: every forecast equals the bd61ae7 engine's (baseline copied in stage3-design/stage3b/phase3/);
//  - the 18-step decision workflow is checked against this test's own record of what each decision should do.
// Synthetic data only (derived from the Northstar demonstration workbook), labelled as such.
const fs = require('fs'), path = require('path'), vm = require('vm'), util = require('util');
const XLSX = require('xlsx');
const APP = path.join(__dirname, '..'), js = n => fs.readFileSync(path.join(APP, 'js', n), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };
const NS = path.join(APP, 'tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const BASE = path.join(APP, 'stage3-design/stage3b/phase3/baseline-bd61ae7');

/* an engine in its own context; `store` is a fake browser storage shared between "page loads" (refresh = new engine, same store) */
function engine(store, opts) {
  opts = opts || {};
  const ls = store === null ? undefined : { getItem: k => (opts.throwing ? (() => { throw new Error('blocked'); })() : (k in store ? store[k] : null)), setItem: (k, v) => { if (opts.throwing) throw new Error('blocked'); store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const ctx = vm.createContext({ XLSX, console, Math, Date, JSON, Intl, localStorage: ls, document: { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] } });
  if (store === null) delete ctx.localStorage;
  const calc = opts.calc || js('calculations.js'), fc = opts.fc || js('forecasting.js');
  vm.runInContext([calc, fc, js('app.js'), js('excel-import.js'), opts.calc ? '' : js('engine/engine-api.js')].join('\n;\n'), ctx);
  vm.runInContext('this.__go=wb=>{WB=wb;R=analyse();return R};this.__fc=()=>fcAll();this.__R=()=>R;this.__redo=()=>{R=analyse();return R};', ctx);
  return ctx;
}
const readNS = () => XLSX.readFile(NS, { cellDates: true });
const demandRows = wb => XLSX.utils.sheet_to_json(wb.Sheets['Demand History'], { defval: null, raw: true });
const withDemand = (wb, rows) => { const w = Object.assign({}, wb, { Sheets: Object.assign({}, wb.Sheets) }); w.Sheets['Demand History'] = XLSX.utils.json_to_sheet(rows, { header: ['Month_Start', 'SKU', 'Units_Sold', 'Customer_Orders', 'Forecast_Units'], cellDates: true }); return XLSX.read(XLSX.write(w, { type: 'buffer', cellDates: true }), { cellDates: true }); };
const UTCm = (y, m) => Date.UTC(y, m, 1);
const ym = t => new Date(t).toISOString().slice(0, 7);
/* the month a sheet date shows, read as local time and rounded to the nearest local day (SheetJS can read local midnight a few
   seconds early in zones with an odd historical offset, e.g. Asia/Kolkata: 1 Oct arrives as 30 Sep 23:59:50) */
const LD = t => new Date(+t + 43200000), LM = t => UTCm(LD(t).getFullYear(), LD(t).getMonth());
const J = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

// ---- 1. calendar construction (prepDemand) on hand-written cases -------------------------------------------------------
console.log('--- 1 calendar: every month from first to last, missing months kept as gaps, duplicates never summed');
{
  const E = engine({}), P = [{ SKU: 'A', Product_Name: 'a' }], M = [], S = [];
  const d = (y, m, sku, u, extra) => Object.assign({ Month_Start: new Date(UTCm(y, m)), SKU: sku, Units_Sold: u, Customer_Orders: 1, Forecast_Units: 1 }, extra || {});
  const prep = rows => vm.runInContext('prepDemand', E)(rows, P, M, S);
  const hcOf = (DP, sku) => DP.months.map(t => { const r = (DP.bySku[sku] || []).find(x => +x.Month_Start === t); return r ? r.Units_Sold : null; });
  const J25 = [0, 1, 2, 3, 4, 5].map(m => UTCm(2025, m));
  const D = [
    // Jan–Apr only; global calendar runs to Jun, so May–Jun are trailing gaps
    d(2025, 0, 'P1', 10), d(2025, 1, 'P1', 11), d(2025, 2, 'P1', 12), d(2025, 3, 'P1', 13),
    // Jan, Feb, May: Mar and Apr missing inside, Jun missing at the end
    d(2025, 0, 'P2', 20), d(2025, 1, 'P2', 21), d(2025, 4, 'P2', 24),
    // Jan, Mar, Apr: Feb missing
    d(2025, 0, 'P3', 30), d(2025, 2, 'P3', 32), d(2025, 3, 'P3', 33),
    // Jan–Jun with a genuine zero in Mar
    ...[40, 41, 0, 43, 44, 45].map((u, m) => d(2025, m, 'P4', u)),
    // Jan–Jun with Feb recorded twice (10 then 30): the first row (10) is used, never 40
    d(2025, 0, 'P5', 50), d(2025, 1, 'P5', 10), d(2025, 1, 'P5', 30), d(2025, 2, 'P5', 52), d(2025, 3, 'P5', 53), d(2025, 4, 'P5', 54), d(2025, 5, 'P5', 55),
    // a different final month: Jan–May
    ...[60, 61, 62, 63, 64].map((u, m) => d(2025, m, 'P6', u))
  ];
  const DP = prep(D);
  ok(JSON.stringify(DP.months) === JSON.stringify(J25) && DP.boundary === UTCm(2025, 5), 'calendar Jan–Jun 2025 (6 months); global boundary Jun 2025 although only P4 and P5 reach it');
  const want = { P1: [10, 11, 12, 13, null, null], P2: [20, 21, null, null, 24, null], P3: [30, null, 32, 33, null, null], P4: [40, 41, 0, 43, 44, 45], P5: [50, 10, 52, 53, 54, 55], P6: [60, 61, 62, 63, 64, null] };
  for (const [k, w] of Object.entries(want)) ok(JSON.stringify(hcOf(DP, k)) === JSON.stringify(w), `${k}: month by month ${JSON.stringify(w)} (got ${JSON.stringify(hcOf(DP, k))})`);
  ok(DP.groups.length === 1 && DP.groups[0].sku === 'P5' && DP.groups[0].month === UTCm(2025, 1) && DP.groups[0].rows.length === 2 && DP.groups[0].status === 'unreviewed' && DP.groups[0].used === 0, 'P5 Feb: one duplicate group, both rows kept, unreviewed, first row in use');
  // a month no product records is still a month
  const DP2 = prep([d(2025, 0, 'Q', 1), d(2025, 1, 'Q', 2), d(2025, 3, 'Q', 4), d(2025, 0, 'R', 5), d(2025, 3, 'R', 8)]);
  ok(JSON.stringify(DP2.months) === JSON.stringify([0, 1, 2, 3].map(m => UTCm(2025, m))) && JSON.stringify(hcOf(DP2, 'Q')) === '[1,2,null,4]', 'a month missing from the WHOLE workbook (Mar) stays in the calendar as a gap; months are never compressed');
  // a day other than the 1st is read as its calendar month (UTC); an invalid date is reported, not placed
  const DP3 = prep([d(2025, 0, 'Q', 1), Object.assign(d(2025, 1, 'Q', 2), { Month_Start: new Date(Date.UTC(2025, 1, 15)) }), Object.assign(d(2025, 2, 'Q', 3), { Month_Start: 'not a date' })]);
  ok(DP3.normalised === 1 && JSON.stringify(hcOf(DP3, 'Q')) === '[1,2]' && DP3.badDate.length === 1, '15 Feb is read as February; a row without a valid date is reported (row ' + DP3.badDate[0] + ') and not used');
}

// ---- 2. analyse(): history, recent average and trend on the calendar ---------------------------------------------------
console.log('--- 2 analyse: product history on the calendar; recent average over the recent CALENDAR window');
const P3WB = path.join(APP, 'tests/fixtures/phase3/phase3-duplicates.xlsx');
{
  const E = engine({}), wb = XLSX.readFile(P3WB, { cellDates: true }), R = E.__go(wb), rows = demandRows(wb);
  const cal = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b);
  // truth from the sheet: first row in sheet order for each month
  const hcT = id => cal.map(t => { const r = rows.find(x => x.SKU === id && +x.Month_Start === t); return r && typeof r.Units_Sold === 'number' && r.Units_Sold >= 0 ? r.Units_Sold : null; });
  for (const id of ['FG005', 'FG010', 'FG012', 'FG020', 'FG030', 'FG040', 'FG001']) { const x = R.fg.find(y => y.id === id); ok(JSON.stringify(x.hc) === JSON.stringify(hcT(id)) && x.h.length === hcT(id).filter(v => v !== null).length, `${id}: history = the first row of each month, missing months null (${hcT(id).filter(v => v === null).length} gap(s))`); }
  const g = id => R.fg.find(y => y.id === id);
  ok(g('FG040').hc[7] === 0 && g('FG040').gap.missing === 0, 'FG040: the genuine zero is kept as 0, not treated as missing');
  ok(g('FG020').gap.trailing === 2 && g('FG020').gap.interior === 0 && g('FG030').gap.interior === 2 && g('FG030').gap.trailing === 0, 'gap counts: FG020 2 at the end, FG030 2 inside');
  const basis = vm.runInContext('CFG.basis', E), mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  for (const id of ['FG020', 'FG030', 'FG001']) { const w = hcT(id).slice(-basis).filter(v => v !== null); ok(Math.abs(g(id).m - mean(w)) < 1e-9, `${id}: recent average = mean of the usable months in the last ${basis} calendar months (${w.length} used)`); }
  { const h = hcT('FG020'), r3 = h.slice(-3).filter(v => v !== null), e = h.slice(0, -3).filter(v => v !== null); ok(Math.abs(g('FG020').tr - (mean(r3) / mean(e) - 1)) < 1e-12, 'FG020: trend ratio = last 3 calendar months (usable ones) against the months before'); }
  ok(R.dups.length === 3 && R.dups.every(x => x.status === 'unreviewed'), 'three duplicate groups (FG005, FG010, FG012), all awaiting review');
  ok(R.dq.some(q => /3 product-month\(s\) have more than one row/.test(q.msg) && /FIRST row/.test(q.msg)), 'data quality states the duplicates and the first-row default in plain English');
  { ok(R.boundary === LM(cal[cal.length - 1]), 'R.boundary is the last month in the workbook (as the sheet shows it)'); }
}

// ---- 3. duplicates: the decision equals a workbook with only the chosen row (independent oracle) ----------------------
console.log('--- 3 duplicates resolved by a decision = the same workbook with only that row (or none), on every result');
{
  const wb = XLSX.readFile(P3WB, { cellDates: true }), rows = demandRows(wb), cal = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b);
  const isDup = (r, sku, p) => r.SKU === sku && +r.Month_Start === cal[p];
  const keepOnly = (sku, p, k) => { let i = -1; return rows.filter(r => !isDup(r, sku, p) || (++i === k)); }, dropAll = (sku, p) => rows.filter(r => !isDup(r, sku, p));
  const SKIP = new Set(['gap']), strip = R => ({ fg: R.fg.map(x => { const o = {}; for (const k of Object.keys(x)) if (!SKIP.has(k)) o[k] = x[k]; return o; }), rm: R.rm, months: R.months });
  const same = (a, b) => util.isDeepStrictEqual(J(strip(a)), J(strip(b)));
  const cases = [['first-row default (no decision)', null, keepOnly('FG005', 8, 0)], ['accept first row', ['FG005', 'accept', 0], keepOnly('FG005', 8, 0)], ['choose the second row', ['FG005', 'row', 1], keepOnly('FG005', 8, 1)], ['exclude the month', ['FG005', 'exclude'], dropAll('FG005', 8)], ['FG012: choose the third of three rows', ['FG012', 'row', 2], null]];
  for (const [label, dec, oracleRows] of cases) {
    const store = {}, E = engine(store); let R = E.__go(XLSX.readFile(P3WB, { cellDates: true }));
    if (dec) { const g = R.dups.find(x => x.sku === dec[0]); vm.runInContext('CGEngine', E).duplicates.decide(g.key, dec[1], dec[1] === 'row' ? g.rows[dec[2]].fp : undefined); R = E.__redo(); }
    const orows = oracleRows || (() => { const p = 2; let i = -1; return rows.filter(r => !isDup(r, 'FG012', p) || (++i === 2)); })();
    // the oracle keeps the OTHER duplicate groups as they are, so their first rows are used in both
    const O = engine({}), RO = O.__go(withDemand(wb, orows));
    ok(same(R, RO), `${label}: every product and material result equals the workbook that keeps only the expected row(s)`);
    const fa = J(E.__fc()), fb = J(O.__fc());
    ok(Object.keys(fb).every(k => util.isDeepStrictEqual(fa[k], fb[k])), `${label}: every forecast equals that workbook's`);
  }
  // nothing is ever summed: FG005's month 8 is 35 or 10, never 45
  const E = engine({}), R = E.__go(XLSX.readFile(P3WB, { cellDates: true }));
  ok(R.fg.find(x => x.id === 'FG005').hc[8] === 35, 'FG005: the duplicate month is 35 (first row), never 45 (the sum)');
}

// ---- 4. forecasting on the calendar -------------------------------------------------------------------------------------
console.log('--- 4 forecasts: start after the global boundary; methods meet gaps correctly; gap-free results unchanged');
{
  // 4a gap-free workbooks: identical to the bd61ae7 engine, every forecast and every product/material field
  const books = [NS, path.join(APP, 'stage3-design/audit-20261121/evidence/workbooks/ns-x1-faults.xlsx')].concat(fs.readdirSync(path.join(APP, 'tests/fixtures/library')).filter(f => f.endsWith('.xlsx')).map(f => path.join(APP, 'tests/fixtures/library', f)));
  for (const b of books) {
    let ra, rb, fa, fb;
    try { const O = engine({}, { calc: fs.readFileSync(path.join(BASE, 'calculations.js'), 'utf8'), fc: fs.readFileSync(path.join(BASE, 'forecasting.js'), 'utf8') }); ra = O.__go(XLSX.readFile(b, { cellDates: true })); fa = J(O.__fc()); } catch (e) { ra = { err: e.message }; }
    try { const N = engine({}); rb = N.__go(XLSX.readFile(b, { cellDates: true })); fb = J(N.__fc()); } catch (e) { rb = { err: e.message }; }
    if (ra.err || rb.err) { ok(ra.err && rb.err, `${path.basename(b)}: both engines refuse alike`); continue; }
    const gapFree = rb.fg.every(x => !x.gap || (x.gap.missing === 0)) && !rb.dups.length;
    if (!gapFree) continue;
    const fg = ra.fg.every((x, i) => Object.keys(x).every(k => util.isDeepStrictEqual(J(x[k]), J(rb.fg[i][k]))));
    const rm = util.isDeepStrictEqual(J(ra.rm), J(rb.rm));
    const fcs = Object.keys(fa).every(k => Object.keys(fa[k]).every(q => util.isDeepStrictEqual(fa[k][q], fb[k][q])));
    ok(fg && rm && fcs, `${path.basename(b)} (no missing month, no duplicate): every product, material and forecast value identical to bd61ae7`);
  }
  // 4b a product with gaps, against values recomputed here
  const wb = readNS(), rows = demandRows(wb), cal = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b), n = cal.length;
  const drop = { FG001: [3, 4], FG002: [n - 1, n - 2], FG003: [0, 1, 2, 3, 4, 5, 6], FG004: [2, n - 1] };
  const rows2 = rows.filter(r => !(drop[r.SKU] || []).includes(cal.indexOf(+r.Month_Start)));
  const E = engine({}), R = E.__go(withDemand(wb, rows2)), A = E.__fc(), last = LD(cal[n - 1]), start = Date.UTC(last.getFullYear(), last.getMonth() + 1, 1); /* the sheet's last month as displayed (local date) */
  const series = id => cal.map((t, i) => (drop[id] || []).includes(i) ? null : rows.find(r => r.SKU === id && +r.Month_Start === t).Units_Sold);
  const obs = id => series(id).map((v, i) => [i, v]).filter(q => q[1] !== null);
  for (const id of ['FG001', 'FG002', 'FG004']) {
    const F = A[id], o = obs(id), p0 = o[0][0];
    ok(F.ok && F.start === start && F.n === o.length, `${id}: forecast produced from ${o.length} usable months; it starts ${ym(start)}, the month after the last month in the workbook`);
    // mean: order-free
    const mu = o.reduce((s, q) => s + q[1], 0) / o.length, mf = vm.runInContext('fnC', E)('mean', vm.runInContext('calObs', E)(R.fg.find(x => x.id === id)), n - p0, 12, () => 0);
    ok(mf.every(v => Math.abs(v - mu) < 1e-9), `${id}: average method = mean of the usable months (${mu.toFixed(2)})`);
    // trend: least squares on calendar positions, predicted at the forecast months' positions
    const X = o.map(q => q[0] - p0), Y = o.map(q => q[1]), mx = X.reduce((s, v) => s + v, 0) / X.length, my = mu;
    let sxy = 0, sxx = 0; X.forEach((x, i) => { sxy += (x - mx) * (Y[i] - my); sxx += (x - mx) ** 2; });
    const b = sxy / sxx, a = my - b * mx, tw = Array.from({ length: 12 }, (_, j) => Math.max(0, a + b * (n - p0 + j)));
    const tf = vm.runInContext('fnC', E)('trend', vm.runInContext('calObs', E)(R.fg.find(x => x.id === id)), n - p0, 12, () => 0);
    ok(tf.every((v, j) => Math.abs(v - tw[j]) < 1e-9), `${id}: trend = straight line through the usable months at their calendar positions, extended to the 12 months after the boundary`);
    const lastObsGap = n - 1 - o[o.length - 1][0];
    ok(F.trail === lastObsGap && F.hi.every((v, j) => Math.abs(v - F.f[j] - 1.28 * F.rm * Math.sqrt(1 + (j + 1 + lastObsGap) / F.n)) < 1e-9), `${id}: uncertainty band 1.28 × RMSE × √(1 + (months ahead + ${lastObsGap} missing at the end) / n)`);
    const winOK = [1, 2, 3].every(k => series(id)[n - k] !== null);
    ok(winOK === F.meth.includes('ma3') && winOK === F.meth.includes('wma3') && (winOK || /3 calendar months before the forecast start/.test(F.na.ma3)), `${id}: 3-month averages ${winOK ? 'used (last 3 months recorded)' : 'not used, with the reason, because a month in the last 3 is missing'}`);
    { const cmp = Object.keys(F.bt).filter(k => F.bt[k].pts > 0), out = Object.keys(F.bt).filter(k => F.bt[k].pts === 0); ok(cmp.length >= 2 && cmp.every(k => F.bt[k].pts === F.bt[F.best].pts) && (!out.length || F.warn.some(w => /not tested .* so not compared/.test(w))), `${id}: the compared methods (${cmp.join(', ')}) are back-tested on the same ${F.bt[F.best].pts} months${out.length ? `; ${out.join(', ')} named as not compared` : ''}`); }
    ok(lastObsGap ? F.warn.some(w => /less reliable/.test(w)) && F.conf !== 'High' : true, `${id}: ${lastObsGap ? 'missing months at the end: reliability warning and confidence lowered' : 'no missing month at the end'}`);
  }
  ok(A.FG003.ok && A.FG003.n === 5 && A.FG003.tier === 'limited' && A.FG003.conf === 'Low' && A.FG003.levels.trend === 'insufficient' && A.FG003.warn.some(w => /only 5 usable months/.test(w)), 'FG003 (5 usable months, 7 missing): forecast by the methods that need 3 months, stated as limited reliability; trend (needs 6) not used [owner decision 27 Nov 2026 supersedes the 6-month gate]');
  ok(A.FG002.trail === 2 && A.FG002.f.length === 12 && A.FG002.start === start, 'FG002 (last 2 months missing): still forecast, starting after the global boundary (no cut-off)');
  // the global boundary drives every product even when most products stop earlier
  const ext = rows.concat([{ Month_Start: new Date(last.getFullYear(), last.getMonth() + 1, 1), SKU: 'FG050', Units_Sold: 100, Customer_Orders: 1, Forecast_Units: 100 }]);
  const E2 = engine({}), R2 = E2.__go(withDemand(wb, ext)), A2 = E2.__fc(), start2 = Date.UTC(last.getFullYear(), last.getMonth() + 2, 1);
  ok(R2.months.length === n + 1 && R2.fg.filter(x => x.gap.trailing === 1).length === R2.fg.length - 1 && Object.values(A2).filter(F => F.ok).every(F => F.start === start2), 'one product with a later month moves the global boundary: every forecast starts after it and the other products show 1 missing month at the end');
}

// ---- 5. the decision workflow (18 steps) against this test's own record --------------------------------------------------
console.log('--- 5 decision workflow: refresh, re-import, reorder, value and count changes, other row, exclude, isolation, unresolvable');
{
  const store = {}, wb0 = XLSX.readFile(P3WB, { cellDates: true }), rows = demandRows(wb0), cal = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b);
  const at = (R, sku, p) => R.fg.find(x => x.id === sku).hc[p], grp = (R, sku) => R.dups.find(x => x.sku === sku);
  const EXP = {}; // this test's own record: sku -> { status, value at the duplicate month }
  const check = (R, step, sku, p) => { const e = EXP[sku], g = grp(R, sku); ok(g && g.status === e.status && at(R, sku, p) === e.value, `step ${step}: ${sku} ${e.status}, month value ${e.value} (engine: ${g && g.status}, ${at(R, sku, p)})`); };
  const fresh = (rowsX, st) => { const E = engine(st === undefined ? store : st); return { E, R: E.__go(withDemand(wb0, rowsX)), D: vm.runInContext('CGEngine', E).duplicates }; };
  let s = fresh(rows);
  EXP.FG005 = { status: 'unreviewed', value: 35 }; check(s.R, 1, 'FG005', 8);
  s.D.decide(grp(s.R, 'FG005').key, 'accept'); s.R = s.E.__redo(); EXP.FG005 = { status: 'accepted', value: 35 }; check(s.R, 2, 'FG005', 8);
  ok(Object.keys(JSON.parse(store['scie.duplicateDecisions.v2']).sets).length === 1, 'step 2: the decision is saved in browser storage under one dataset');
  s = fresh(rows); check(s.R, '3 (refresh)', 'FG005', 8);
  s = fresh(demandRows(XLSX.readFile(P3WB, { cellDates: true }))); check(s.R, '4 (re-import the same file)', 'FG005', 8);
  const i5 = rows.findIndex(r => r.SKU === 'FG005' && +r.Month_Start === cal[8]), swapped = rows.slice(); [swapped[i5], swapped[i5 + 1]] = [swapped[i5 + 1], swapped[i5]];
  s = fresh(swapped); check(s.R, '5 (rows reordered: the confirmed 35 row is now second)', 'FG005', 8);
  ok(grp(s.R, 'FG005').used === 1, 'step 5: the decision follows the record (now row 2), not the position');
  s.D.decide(grp(s.R, 'FG005').key, 'row', grp(s.R, 'FG005').rows.find(r => r.Units_Sold === 10).fp); s.R = s.E.__redo(); EXP.FG005 = { status: 'chosen', value: 10 }; check(s.R, '6 (choose the other row)', 'FG005', 8);
  s = fresh(rows); check(s.R, '7 (original order again)', 'FG005', 8);
  const changed = rows.map(r => (r.SKU === 'FG005' && +r.Month_Start === cal[8] && r.Units_Sold === 10 ? Object.assign({}, r, { Units_Sold: 11 }) : r));
  s = fresh(changed); EXP.FG005 = { status: 'invalidated', value: 35 }; check(s.R, '8 (the chosen row\'s value changed: back to review, first row used)', 'FG005', 8);
  ok(/values in the records changed/.test(grp(s.R, 'FG005').why), 'step 8: the reason says the values changed');
  s.D.decide(grp(s.R, 'FG005').key, 'row', grp(s.R, 'FG005').rows.find(r => r.Units_Sold === 11).fp); s.R = s.E.__redo(); EXP.FG005 = { status: 'chosen', value: 11 }; check(s.R, '9 (decide again on the changed rows)', 'FG005', 8);
  const added = changed.concat([Object.assign({}, changed[i5], { Units_Sold: 50 })]);
  s = fresh(added); EXP.FG005 = { status: 'invalidated', value: 35 }; check(s.R, '10 (a third row added: back to review)', 'FG005', 8);
  ok(/number of records for this month changed \(2 when you decided, 3 now\)/.test(grp(s.R, 'FG005').why), 'step 10: the reason gives the old and new number of rows');
  s.D.decide(grp(s.R, 'FG005').key, 'exclude'); s.R = s.E.__redo(); EXP.FG005 = { status: 'excluded', value: null }; check(s.R, '11 (exclude the month)', 'FG005', 8);
  ok(s.R.fg.find(x => x.id === 'FG005').gap.excluded === 1 && s.R.dq.some(q => /excluded from all calculations/.test(q.msg)), 'step 11: the month is treated as missing and the exclusion is reported');
  s = fresh(added); check(s.R, '12 (refresh: exclusion kept)', 'FG005', 8);
  // renames keep decisions (owner decision 27 Nov 2026): a product, a material and a supplier renamed = the same dataset
  const sheetWith = (wb, name, edit) => { const w = Object.assign({}, wb, { Sheets: Object.assign({}, wb.Sheets) }), rs = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }); edit(rs); w.Sheets[name] = XLSX.utils.json_to_sheet(rs); return w; };
  let wbR = sheetWith(wb0, 'Products', rs => { rs.find(r => r.SKU === 'FG005').Product_Name = 'FG005 renamed'; });
  wbR = sheetWith(wbR, 'Materials', rs => { rs[0].Material_Name = 'Material renamed'; }); wbR = sheetWith(wbR, 'Suppliers', rs => { rs[0].Supplier_Name = 'Supplier renamed'; });
  { const E = engine(store), RR = E.__go(withDemand(wbR, added)); ok(RR.dsId === s.R.dsId && grp(RR, 'FG005').status === 'excluded', 'step 13a: product, material and supplier renamed: same dataset, the exclusion still applies'); }
  // dataset isolation: another dataset (a product ADDED) with the same duplicate is untouched by these decisions until the customer adopts them
  const wbB = sheetWith(wb0, 'Products', rs => { rs.push(Object.assign({}, rs[0], { SKU: 'FG-NEW', Product_Name: 'A new product' })); });
  const EB = engine(store), RB = EB.__go(withDemand(wbB, added)), DB = vm.runInContext('CGEngine', EB).duplicates;
  ok(RB.dsId !== s.R.dsId && grp(RB, 'FG005').status === 'unreviewed' && at(RB, 'FG005', 8) === 35, 'step 13: a different dataset (a product added) sees no decision (unreviewed, first row used)');
  const rel = DB.related(); ok(rel.length === 1 && rel[0].dataset === s.R.dsId && rel[0].matches === 1 && rel[0].keys[0] === grp(RB, 'FG005').key, 'step 13b: the earlier workbook\'s decision is offered because its records match exactly (1 match)');
  { const st2 = JSON.parse(JSON.stringify(store)), E2 = engine(st2); E2.__go(withDemand(wbB, added)); const D2 = vm.runInContext('CGEngine', E2).duplicates, r = D2.adopt(s.R.dsId), R2 = E2.__redo();
    ok(r.adopted === 1 && grp(R2, 'FG005').status === 'excluded' && at(R2, 'FG005', 8) === null, 'step 13c: adopting copies only the exactly matching decision (the exclusion now applies to the new workbook)'); }
  DB.decide(grp(RB, 'FG005').key, 'row', grp(RB, 'FG005').rows[2].fp);
  s = fresh(added); check(s.R, '14 (back to the first dataset: its exclusion unchanged by dataset B\'s decision)', 'FG005', 8);
  // product change and period change: the decision does not follow, the new group is reviewed
  const moved = added.map(r => (r.SKU === 'FG005' && +r.Month_Start === cal[8] ? Object.assign({}, r, { SKU: 'FG006' }) : r));
  s = fresh(moved); ok(grp(s.R, 'FG006') && grp(s.R, 'FG006').status === 'unreviewed', 'step 15: the same rows under another product: reviewed afresh (decision not carried over)');
  const shifted = added.map(r => (r.SKU === 'FG005' && +r.Month_Start === cal[8] ? Object.assign({}, r, { Month_Start: new Date(cal[9]) }) : r));
  s = fresh(shifted); ok(grp(s.R, 'FG005') && grp(s.R, 'FG005').month === LM(cal[9]) && grp(s.R, 'FG005').status === 'unreviewed', 'step 16: the same rows in another month: reviewed afresh');
  // unresolvable: a saved choice whose record cannot be found (damaged entry) is never applied by position
  s = fresh(rows, {}); const g = grp(s.R, 'FG012'); s.D.decide(g.key, 'row', g.rows[2].fp); const st = vm.runInContext('DUPDEC', s.E).sets[s.R.dsId][g.key]; st.f = 'ffffffffffffffff';
  s.E.__go(withDemand(wb0, rows)); const R17 = s.E.__R();
  ok(grp(R17, 'FG012').status === 'invalidated' && /can no longer be found/.test(grp(R17, 'FG012').why) && at(R17, 'FG012', 2) === 70, 'step 17: a chosen record that cannot be identified returns the month to review (first row used); never applied by row position');
  // identical rows: either choice gives the same value; clearing a decision returns the month to review
  const g10 = grp(R17, 'FG010'); s.D.decide(g10.key, 'row', g10.rows[1].fp); const R18 = s.E.__redo();
  ok(grp(R18, 'FG010').status === 'chosen' && at(R18, 'FG010', 4) === 81, 'step 18a: identical rows cannot be told apart; choosing either gives the same value (81)');
  s.D.forget(g10.key); ok(grp(s.E.__redo(), 'FG010').status === 'unreviewed', 'step 18b: clearing a decision returns the month to review');
  // storage unavailable: decisions still apply for the session, and the screen is told they are not saved
  const T = engine({}, { throwing: true }), RT = T.__go(withDemand(wb0, rows)), DT = vm.runInContext('CGEngine', T).duplicates, r18 = DT.decide(grp(RT, 'FG005').key, 'exclude');
  ok(r18.saved === false && grp(T.__redo(), 'FG005').status === 'excluded', 'storage blocked: the decision applies for this session and reports it was not saved');
  const NOLS = engine(null), RN = NOLS.__go(withDemand(wb0, rows));
  ok(vm.runInContext('CGEngine', NOLS).duplicates.storageOK() === false && grp(RN, 'FG005').status === 'unreviewed', 'no browser storage at all: the engine still runs, nothing is assumed decided');
}

// ---- 6. minimum history per method (owner decision 27 Nov 2026) ----------------------------------------------------------
// Expected levels worked out here from the rules, not read from the engine:
//  - calculation minimums: mean, ma3, wma3 3 months; ma6, trend 6; seasonal 24 (and a detected pattern);
//  - the compared methods are back-tested on the same months: the last min(6, n − largest minimum among them) months. If that leaves
//    fewer than 3, the methods with the fewest testable months (ma6, trend) are left out of the comparison (calculated, untested);
//  - level: 0 test months = calculable; 1–2 = limited; 3–5 = tested; 6+ with 2+ methods tested = comparable.
//  n=2: nothing can calculate. n=3: 0 test months. n=4: 1. n=5: 2. n=6: all five give 0 → ma6/trend left out → 3 (6−3).
//  n=7: 1 → left out → 4. n=8: 2 → left out → 5. n=9: 3 (9−6), nothing left out. n=12: 6.
console.log('--- 6 minimum history: each method its own minimum; reliability stated');
{
  const wb = readNS(), rows = demandRows(wb), cal = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b), N = cal.length;
  const keepLast = n => rows.filter(r => r.SKU !== 'FG001' || cal.indexOf(+r.Month_Start) >= N - n);
  // [level of the 3-month methods, test months, level of ma6/trend]
  const want = { 2: null, 3: ['calculable', 0, 'insufficient'], 4: ['limited', 1, 'insufficient'], 5: ['limited', 2, 'insufficient'], 6: ['tested', 3, 'calculable'], 7: ['tested', 4, 'calculable'], 8: ['tested', 5, 'calculable'], 9: ['tested', 3, 'tested'], 12: ['comparable', 6, 'comparable'] };
  const O = engine({}, { calc: fs.readFileSync(path.join(BASE, 'calculations.js'), 'utf8'), fc: fs.readFileSync(path.join(BASE, 'forecasting.js'), 'utf8') });
  const sum = a => a.reduce((x, y) => x + y, 0);
  for (const [k, w] of Object.entries(want)) {
    const n = +k, E = engine({}), wbn = withDemand(wb, keepLast(n)); E.__go(wbn); const F = J(E.__fc()).FG001, h = rows.filter(r => r.SKU === 'FG001' && cal.indexOf(+r.Month_Start) >= N - n).map(r => r.Units_Sold);
    if (!w) { ok(!F.ok && /fewer than 3 usable months/.test(F.why) && Object.values(F.levels).every(v => v === 'insufficient'), `n=${n}: no method can calculate; not forecast, with the reason`); continue; }
    const short = ['mean', 'ma3', 'wma3'], long = ['ma6', 'trend'];
    ok(F.ok && F.tier === w[0] && F.bt[F.best].pts === w[1] && short.includes(F.best) === (n < 9 || short.includes(F.best)), `n=${n}: forecast; reliability "${w[0]}" (${w[1]} back-test month(s)); engine: ${F.tier}, ${F.bt[F.best] && F.bt[F.best].pts}`);
    ok(short.every(m => F.levels[m] === w[0]) && long.every(m => F.levels[m] === w[2]) && F.levels.seasonal === 'insufficient', `n=${n}: per method: 3-month methods ${w[0]}; 6-month methods ${w[2]}; seasonal insufficient (needs 24)`);
    ok(n >= 12 || F.conf === 'Low', `n=${n}: confidence ${F.conf}${n < 12 ? ' (Low under 12 months)' : ''}`);
    if (n < 6) { ok(w[1] > 0 || (F.best === 'mean' && F.f.every(v => Math.abs(v - sum(h) / n) < 1e-9)), `n=${n}: ${w[1] ? 'tested methods compared' : 'no tested method: the plain average of the ' + n + ' months is used'}`); ok(F.warn.some(x => new RegExp(`only ${n} usable months`).test(x)), `n=${n}: the warning says only ${n} usable months and limited reliability`); }
    if (n >= 6 && n <= 8) {
      // independent back-test of the 3-month methods on the last w[1] months
      const fc = { mean: j => sum(h.slice(0, j)) / j, ma3: j => sum(h.slice(j - 3, j)) / 3, wma3: j => (3 * h[j - 1] + 2 * h[j - 2] + h[j - 3]) / 6 };
      const wape = m => { let ae = 0, ac = 0; for (let j = n - w[1]; j < n; j++) { ae += Math.abs(fc[m](j) - h[j]); ac += h[j]; } return ae / ac; };
      let best = 'mean'; for (const m of short) if (wape(m) < wape(best) - 0.005) best = m;
      ok(short.every(m => Math.abs(F.bt[m].wape - wape(m)) < 1e-12) && F.best === best && long.every(m => F.bt[m].pts === 0) && F.warn.some(x => /not tested .* so not compared/.test(x)), `n=${n}: the 3-month methods are back-tested on ${w[1]} months (WAPE recomputed here), the best of them is used (${best}); the 6-month methods are calculated but not compared, and the warning says so`);
    }
    if (n >= 9) { O.__go(wbn); const B = J(O.__fc()).FG001; ok(Object.keys(B).every(q => util.isDeepStrictEqual(B[q], F[q])), `n=${n}: identical to the bd61ae7 forecast in every original field (9+ months without gaps: unchanged)`); }
  }
}

// 6b seasonal: 24–26 months with a detected pattern: seasonal (needs 24 before its first test month) sits out of the comparison
//    instead of leaving every method untested; from 27 months everything is as at bd61ae7 (expected levels worked out by hand)
{
  const E = engine({}), O = engine({}, { calc: fs.readFileSync(path.join(BASE, 'calculations.js'), 'utf8'), fc: fs.readFileSync(path.join(BASE, 'forecasting.js'), 'utf8') }), last = Date.UTC(2026, 8, 1);
  const fc = c => vm.runInContext('fcast', c), mkH = n => Array.from({ length: n }, (_, i) => Math.round(100 + 40 * Math.sin(2 * Math.PI * i / 12) + (i % 5)));
  for (const [n, sl, ol, pts] of [[24, 'calculable', 'comparable', 6], [26, 'calculable', 'comparable', 6], [27, 'tested', 'tested', 3], [30, 'comparable', 'comparable', 6]]) {
    const h = mkH(n), F = J(fc(E)({ h, hc: h }, last)), B = J(fc(O)({ h, hc: h }, last));
    ok(F.seas && F.seas.det && F.levels.seasonal === sl && ['mean', 'ma3', 'ma6', 'wma3', 'trend'].every(k => F.levels[k] === ol) && F.bt[F.best].pts === pts, `${n} months, seasonal pattern: seasonal ${sl}; other methods ${ol} on ${pts} test months`);
    if (n >= 27) ok(Object.keys(B).every(q => util.isDeepStrictEqual(B[q], F[q])), `${n} months, seasonal: identical to bd61ae7 in every original field`);
    else ok(B.bt[B.best].pts === n - 24 && F.bt[F.best].pts === 6, `${n} months, seasonal: bd61ae7 tested every method on only ${n - 24} month(s); now 6 (seasonal calculated, not compared)`);
  }
}

// ---- 7. saved decisions survive what they should, and only that (owner decision 27 Nov 2026) --------------------------------
console.log('--- 7 saved decisions: time zones, blank columns, the 25 Nov 2026 format, decisions file, damaged storage');
{
  const wb0 = XLSX.readFile(P3WB, { cellDates: true }), rows = demandRows(wb0), grp = (R, sku) => R.dups.find(x => x.sku === sku);
  const choose = st => { const E = engine(st), R = E.__go(withDemand(wb0, rows)), g = grp(R, 'FG005'); vm.runInContext('CGEngine', E).duplicates.decide(g.key, 'row', g.rows[1].fp); return R; };
  const st = {}; const R0 = choose(st);
  for (const h of [5, -5, 11, -11]) { const shifted = rows.map(r => Object.assign({}, r, { Month_Start: new Date(+r.Month_Start + h * 3600000) })); const E = engine(st), R = E.__go(withDemand(wb0, shifted)); ok(grp(R, 'FG005').status === 'chosen' && R.fg.find(x => x.id === 'FG005').hc[8] === 10, `dates read ${h > 0 ? '+' : ''}${h} h from the original (another time zone): the decision still applies`); }
  { const blank = rows.map(r => Object.assign({}, r, { Notes: '  ' })), E = engine(st), R = E.__go(withDemand(wb0, blank)); ok(grp(R, 'FG005').status === 'chosen', 'a blank column added to every row: the decision still applies'); }
  { const extra = rows.map(r => Object.assign({}, r, { Region: 'North' })), E = engine(st), R = E.__go(withDemand(wb0, extra)); ok(grp(R, 'FG005').status === 'invalidated', 'a filled-in column added: the records changed, so the month returns for review'); }
  { const sp = rows.map(r => (r.SKU === 'FG005' ? Object.assign({}, r, { SKU: 'FG005' }) : r)), E = engine(st), R = E.__go(withDemand(wb0, sp)); ok(grp(R, 'FG005').status === 'chosen', 'the same records re-read: the decision applies'); }
  // the 25 Nov 2026 format: written here from its definition (FNV-style hash, ids + names, full timestamps), not by the engine
  const H = q => { let a = 0x811c9dc5, b = 0x9747b28c; for (let i = 0; i < q.length; i++) { const c = q.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822507) >>> 0; } return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0'); };
  const c0 = v => (v instanceof Date ? 'D' + (+v) : v === undefined || v === null ? '' : typeof v === 'number' ? 'N' + v : 'S' + String(v)), sheet = n => XLSX.utils.sheet_to_json(wb0.Sheets[n], { defval: null });
  const ds0 = H(['P', ...sheet('Products').map(r => c0(r.SKU) + '~' + c0(r.Product_Name)).sort(), 'M', ...sheet('Materials').map(r => c0(r.Material_ID) + '~' + c0(r.Material_Name)).sort(), 'S', ...sheet('Suppliers').map(r => c0(r.Supplier_ID) + '~' + c0(r.Supplier_Name)).sort()].join('\n'));
  const g5 = grp(R0, 'FG005'), fp0 = g5.rows.map(r => H(Object.keys(r.rec).sort().map(k => k + '=' + c0(r.rec[k])).join('|'))), gfp0 = H('FG005|' + g5.month + '|' + [...fp0].sort().join(','));
  const legacy = { 'scie.duplicateDecisions.v1': JSON.stringify({ [ds0]: { [g5.key]: { g: gfp0, n: 2, c: 'row', f: fp0[1], at: '2026-11-25' } } }) };
  { const E = engine(legacy), R = E.__go(withDemand(wb0, rows)); ok(grp(R, 'FG005').status === 'chosen' && grp(R, 'FG005').legacy === true && R.fg.find(x => x.id === 'FG005').hc[8] === 10, 'a decision saved in the 25 Nov 2026 format is recognised and applies as before (not lost)');
    const g12 = grp(R, 'FG012'); vm.runInContext('CGEngine', E).duplicates.decide(g12.key, 'accept'); const s2 = JSON.parse(legacy['scie.duplicateDecisions.v2']);
    ok(!('scie.duplicateDecisions.v1' in legacy) && s2.version === 2 && Object.keys(s2.sets).length === 2, 'the next save writes the v2 format and removes v1 (the old decision is kept under its old dataset until decided again)');
    const R2 = engine(legacy).__go(withDemand(wb0, rows)); ok(grp(R2, 'FG005').status === 'chosen' && grp(R2, 'FG012').status === 'accepted', 'after the upgrade both decisions still apply'); }
  { const legacyBad = { 'scie.duplicateDecisions.v1': JSON.stringify({ [ds0]: { [g5.key]: { g: gfp0, n: 2, c: 'row', f: fp0[1].replace(/./, 'x'), at: '2026-11-25' } } }) }, R = engine(legacyBad).__go(withDemand(wb0, rows)); ok(grp(R, 'FG005').status === 'invalidated' && R.fg.find(x => x.id === 'FG005').hc[8] === 35, 'a 25 Nov decision whose record cannot be found returns the month to review (never applied by position)'); }
  // decisions file: export, clear storage, import
  const E1 = engine(st); E1.__go(withDemand(wb0, rows)); const D1 = vm.runInContext('CGEngine', E1).duplicates, file = D1.exportText(), parsed = JSON.parse(file);
  ok(parsed.format === 'scie-duplicate-decisions' && parsed.version === 2 && D1.count() === 1, 'the decisions file holds every saved decision (1)');
  const empty = {}, E2 = engine(empty), R2 = E2.__go(withDemand(wb0, rows)), D2 = vm.runInContext('CGEngine', E2).duplicates;
  ok(grp(R2, 'FG005').status === 'unreviewed', 'browser storage cleared: the decision is gone from this browser');
  const r = D2.importText(file), R3 = E2.__redo(); ok(r.added === 1 && grp(R3, 'FG005').status === 'chosen' && R3.fg.find(x => x.id === 'FG005').hc[8] === 10 && JSON.parse(empty['scie.duplicateDecisions.v2']).version === 2, 'loading the decisions file restores the decision, and it is saved again');
  ok(D2.importText(file).added === 0, 'loading the same file again changes nothing');
  for (const [label, text] of [['not JSON', 'hello'], ['another JSON file', '{"a":1}'], ['a wrong version', JSON.stringify(Object.assign({}, parsed, { version: 1 }))]]) { let threw = false; const before = D2.exportText(); try { D2.importText(text); } catch (e) { threw = true; } ok(threw && JSON.parse(D2.exportText()).sets && JSON.stringify(JSON.parse(D2.exportText()).sets) === JSON.stringify(JSON.parse(before).sets), `a file that is ${label} is refused and changes nothing`); }
  { const bad = JSON.parse(file); const k = Object.keys(bad.sets)[0]; bad.sets[k]['FG005|2099-01'] = { v: 2, g: 1, n: 'x', c: 'delete-all' }; const st3 = {}, E3 = engine(st3); E3.__go(withDemand(wb0, rows)); const r3 = vm.runInContext('CGEngine', E3).duplicates.importText(JSON.stringify(bad)); ok(r3.added === 1, 'malformed entries inside a decisions file are ignored; the valid one is loaded'); }
  { const dmg = { 'scie.duplicateDecisions.v2': '{not json' }, R = engine(dmg).__go(withDemand(wb0, rows)); ok(grp(R, 'FG005').status === 'unreviewed', 'damaged browser storage: nothing is applied, nothing crashes'); }
  { const dmg = { 'scie.duplicateDecisions.v2': JSON.stringify({ version: 2, sets: { [R0.dsId]: { [g5.key]: { v: 2, g: g5.gfp, n: 2, c: 'row', f: 42 } } } }) }, R = engine(dmg).__go(withDemand(wb0, rows)); ok(grp(R, 'FG005').status === 'unreviewed', 'a stored entry of the wrong shape is ignored (the month stays in review)'); }
}

console.log(`test-phase3-demand-calendar: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
