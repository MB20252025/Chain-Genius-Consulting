#!/usr/bin/env node
/* Universal Data Import v1, Stage 1 tests: js/import/mapping.js and js/import/validate.js.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-import-mapping.js          (all checks in 5 time zones + identity check)
 *                   ... node test-import-mapping.js --once                                      (one time zone; used internally)
 * Needs: Node 22, the pinned test packages (acorn, xlsx) on NODE_PATH. Reading uses the app's own bundled SheetJS.
 * Expectations are written by hand from the owner's Stage 1 decisions (IMPORT-V1-STAGE1-RECORD.md) and the library documents
 * (DATA-ISSUES, EXPECTED.md, expected-import-report.json); they are never generated from the code under test.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), os = require('os'), crypto = require('crypto');
const APP = path.resolve(__dirname, '..'), LIB = path.join(__dirname, 'fixtures', 'library'), FX = path.join(__dirname, 'fixtures', 'import-v1');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];

if (!process.argv.includes('--once')) {
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 256e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /import-mapping: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return r.stdout.split('\n').filter(l => !l.startsWith('time zone:') && !l.startsWith('timing:')).join('\n');
  });
  const same = outs.every(o => o === outs[0]);
  same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`import-mapping all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log('time zone: ' + (process.env.TZ || '(default)'));

// ===================== S0: safety of the new modules (static) =====================
// The existing static test (test-a1-static.js) checks js/import files only for engine globals, and the global-variable audit only
// covers files loaded by index.html. These checks apply the no-async / no-network rule and a globals check to the two new files.
console.log('\n--- S0 static safety of mapping.js and validate.js');
const acorn = require('acorn');
const NEW = ['js/import/mapping.js', 'js/import/validate.js'];
const walk = (n, fn) => { if (!n || typeof n.type !== 'string') return; fn(n); for (const k in n) { if (k === 'loc') continue; const v = n[k]; Array.isArray(v) ? v.forEach(c => walk(c, fn)) : v && typeof v.type === 'string' && walk(v, fn); } };
const BANNED = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback', 'Promise', 'fetch', 'XMLHttpRequest', 'Worker', 'postMessage',
  'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'eval', 'Function', 'require', 'importScripts', 'document', 'window', 'navigator', 'CFG', 'R', 'WB']);
const findings = src => { const out = []; const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
  walk(ast, n => { if (n.type === 'MemberExpression' && !n.computed) n.property.__skip = true; if (n.type === 'Property' && !n.computed) n.key.__skip = true; });
  walk(ast, n => {
    if (/Function/.test(n.type) && (n.async || n.generator)) out.push((n.async ? 'async' : 'generator') + ' function @' + n.loc.start.line);
    if (n.type === 'AwaitExpression' || n.type === 'YieldExpression' || n.type === 'ImportExpression') out.push(n.type + ' @' + n.loc.start.line);
    if (n.type === 'Identifier' && !n.__skip && BANNED.has(n.name)) out.push(n.name + ' @' + n.loc.start.line);
    if (n.type === 'MemberExpression' && !n.computed && ['then', 'sendBeacon', 'cookie'].includes(n.property.name)) out.push('.' + n.property.name + ' @' + n.loc.start.line);
  }); return out; };
for (const f of NEW) { const r = findings(fs.readFileSync(path.join(APP, f), 'utf8')); ok(r.length === 0, `${f}: no asynchronous code, network, storage, eval or engine globals (${r.join(', ') || 'none found'})`); }
ok(['setTimeout(f,1)', 'fetch(u)', 'new XMLHttpRequest()', 'localStorage.x=1', 'async function a(){}', 'x.then(y)', 'navigator.sendBeacon(u)', 'const a=R.fg', 'new WebSocket(u)', 'import("x")']
  .every(s => findings(s).length > 0) && findings('const o={fetch:1}; o.fetch; a.R=1').length === 0, 'the static rule detects 10 bad examples and ignores property names');
{
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  ok(!/import\/(mapping|validate)\.js/.test(html), 'index.html does not load mapping.js or validate.js (Stage 1 adds no screens and no app change)');
}
// Globals: load the modules into a fresh context; the only global they may create is CGImport.
{
  const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer });
  vm.runInContext(fs.readFileSync(path.join(APP, 'assets', 'xlsx.mini.min.js'), 'utf8'), ctx);
  const before = new Set(Object.getOwnPropertyNames(ctx));
  for (const f of ['canonical', 'read', 'clean']) vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'import', f + '.js'), 'utf8'), ctx);
  const mid = new Set(Object.getOwnPropertyNames(ctx));
  for (const f of ['mapping', 'validate']) vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'import', f + '.js'), 'utf8'), ctx);
  const added = Object.getOwnPropertyNames(ctx).filter(n => !mid.has(n));
  ok(added.length === 0 && [...mid].filter(n => !before.has(n)).join() === 'CGImport' && Object.isFrozen(ctx.CGImport.mapping) && Object.isFrozen(ctx.CGImport.validate),
    `globals: the new modules add no global names (only CGImport.mapping and CGImport.validate, both frozen) (added: ${added.join(', ') || 'none'})`);
  let threw = false; try { vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'import', 'validate.js'), 'utf8'), vm.createContext({})); } catch (e) { threw = /needs/.test(e.message); }
  ok(threw, 'load order: validate.js refuses to load without its dependencies (clear error)');
}

// ---- load the modules as the browser would
vm.runInThisContext(fs.readFileSync(path.join(APP, 'assets', 'xlsx.mini.min.js'), 'utf8'));
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate']) vm.runInThisContext(fs.readFileSync(path.join(APP, 'js', 'import', f + '.js'), 'utf8'), { filename: f + '.js' });
const { canonical: C, read: RD, clean: CL, mapping: MP, validate: V } = globalThis.CGImport;
const rd = (dir, n) => /\.(xlsx|pdf)$/.test(n) ? { name: n, bytes: fs.readFileSync(path.join(dir, n)) } : { name: n, text: fs.readFileSync(path.join(dir, n), 'utf8') };
const dirInputs = dir => fs.readdirSync(dir).filter(n => !n.endsWith('.json') && !n.endsWith('.md')).sort().map(n => rd(dir, n));
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const strip = rows => (rows || []).map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__'))));
const codes = r => r.issues.map(i => i.code);
const byCode = (r, c) => r.issues.filter(i => i.code === c);
const blockedItems = (r, a) => Object.entries(r.permissions.items).filter(([, e]) => e.blocked[a]).map(([id]) => id).sort();
const incompleteItems = (r, a) => Object.entries(r.permissions.items).filter(([, e]) => e.incomplete[a]).map(([id]) => id).sort();
// Standard-format CSV folder read with the approved cleaning rules: the comparison target.
function canonFolder(dir) {
  const out = {};
  for (const t of C.tableNames) {
    const p = path.join(dir, t + '.csv'); if (!fs.existsSync(p)) continue;
    const tbl = RD.fromCSVText(fs.readFileSync(p, 'utf8'), t + '.csv');
    out[t] = tbl.rows.map(r => Object.fromEntries(C.TABLES[t].fields.map(f => { const i = tbl.headers.indexOf(f.name); return [f.name, i < 0 ? null : CL.cleanValue(f, r.cells[i], { dateFormat: 'ISO' }).value]; })));
  }
  return out;
}
// Identity mapping built from a standard-format folder's own headings (every heading that is a standard field maps to itself).
function identityMapping(dir) {
  const files = {}, tables = {};
  for (const n of fs.readdirSync(dir).filter(n => n.endsWith('.csv')).sort()) {
    const t = n.slice(0, -4); if (!C.TABLES[t]) continue;
    const tbl = RD.fromCSVText(fs.readFileSync(path.join(dir, n), 'utf8'), n);
    const money = MP.moneyFields(t).some(f => tbl.headers.includes(f));
    files[n] = Object.assign({ dateFormat: 'ISO' }, money ? { currency: { code: 'GBP', confirmed: true } } : {});
    tables[t] = { sources: [{ file: n, columns: Object.fromEntries(tbl.headers.filter(h => C.TABLES[t].fields.some(f => f.name === h)).map(h => [h, { source: h }])) }] };
  }
  return { format: 'CG-IMPORT-MAPPING', version: 1, name: 'identity', files, tables };
}

// ===================== S1: the mapping format =====================
console.log('\n--- S1 mapping format v1');
{
  const base = readJSON(path.join(FX, 'mappings', 'L1-alt-headings.mapping.json'));
  const vary = fn => { const m = JSON.parse(JSON.stringify(base)); fn(m); return MP.checkMapping(m); };
  const has = (iss, code, re) => iss.some(i => i.code === code && (!re || re.test(i.message)));
  ok(MP.checkMapping(base).length === 0, 'L1 mapping is valid (no issues)');
  ok(has(vary(m => { m.version = 2; }), 'MAP_INVALID', /version 1/), 'wrong format version → MAP_INVALID');
  ok(has(vary(m => { m.tables.widgets = m.tables.items; }), 'MAP_INVALID', /unknown table "widgets"/), 'unknown table → MAP_INVALID');
  ok(has(vary(m => { m.tables.items.sources[0].columns.Colour = { source: 'Title' }; }), 'MAP_INVALID', /"Colour" is not a field of items/), 'unknown field → MAP_INVALID');
  ok(has(vary(m => { m.tables.items.sources[0].ignore = ['Code']; }), 'MAP_INVALID', /both mapped and ignored/), 'a heading both mapped and ignored → MAP_INVALID');
  ok(has(vary(m => { m.tables.items.sources[0].columns.Is_Sold.values = { yes: 'Y', ' YES': 'Y' }; }), 'MAP_INVALID', /differ only in case/), 'value map with keys differing only in case → MAP_INVALID');
  ok(has(vary(m => { m.tables.items.sources[0].columns['@Unit'] = { source: 'UoM' }; }), 'MAP_INVALID', /@Unit cannot be used in items/), '@Unit is refused outside stock/demand/sales/PO lines');
  ok(has(vary(m => { m.files['Products.csv'].dateFormat = 'DMY'; }), 'MAP_INVALID', /UK, US or ISO/), 'unknown date format → MAP_INVALID');
  ok(has(vary(m => { m.tables.stock.sources.push(m.tables.stock.sources[0]); }), 'MULTI_SOURCE'), 'two sources for one table → MULTI_SOURCE (A7 deferred, format already a list)');
  const k = vary(m => { m.tables.items.sources[0].columns.Unit_of_Measure = { type: 'constant', value: 'each' }; });
  ok(has(k, 'CONSTANT_UNSUPPORTED') && k.find(i => i.code === 'CONSTANT_UNSUPPORTED').category === 'Must fix', 'constant value (A12, reserved) → CONSTANT_UNSUPPORTED, Must fix');
  ok(has(vary(m => { delete m.tables.stock.sources[0].columns.On_Hand_Qty; }), 'REQUIRED_UNMAPPED', /On_Hand_Qty/), 'required field not mapped → REQUIRED_UNMAPPED');
  const r = V.run(null, {});
  ok(!r.importAccepted && codes(r).includes('MAP_INVALID') && Object.isFrozen(r), 'run(null) → MAP_INVALID, not accepted, frozen result (never throws)');
  // profiles recorded for later mapping repair; the input mapping is not changed
  const dir = path.join(FX, 'layouts', 'L1-alt-headings'), loaded = {};
  dirInputs(dir).forEach(i => { const lf = MP.loadFile(i); loaded[lf.file] = lf; });
  const snap = JSON.stringify(base), pr = MP.recordProfiles(base, loaded);
  const ic = pr.tables.items.sources[0].columns;
  ok(JSON.stringify(base) === snap && ic.Item_ID.position === 1 && ic.Item_ID.profile.kind === 'code' && ic.Standard_Cost.profile.kind === 'number' && pr.tables.stock.sources[0].columns.Snapshot_Date.profile.kind === 'date' && ic.Item_Name.profile.kind === 'text',
    'recordProfiles: position and type profile stored per column (code/number/date/text); input mapping unchanged');
}

// ===================== S2: mapping proof with genuinely different layouts =====================
console.log('\n--- S2 mapping proof: synthetic layouts L1 (CSV) and L2 (Excel workbook) → Package 01 standard tables');
const P01 = canonFolder(path.join(LIB, '01-Clean-Manufacturer'));
const tablesCompared = Object.keys(P01).filter(t => t !== 'dataset');
for (const L of ['L1-alt-headings', 'L2-erp-workbook']) {
  const m = readJSON(path.join(FX, 'mappings', L + '.mapping.json'));
  const r = V.importFiles(m, dirInputs(path.join(FX, 'layouts', L)));
  ok(r.importAccepted && r.summary.mustFix === 0, `${L}: import accepted, 0 Must fix`);
  const diff = tablesCompared.filter(t => !eq(strip(r.dataset[t]), P01[t]));
  ok(diff.length === 0, `${L}: all ${tablesCompared.length} tables equal Package 01 value for value (${tablesCompared.map(t => t + ' ' + P01[t].length).join(', ')})${diff.length ? ' — differ: ' + diff.join(', ') : ''}`);
  ok(r.dataset.dataset[0].Snapshot_Date === '2026-10-31' && r.dataset.dataset[0].Currency === 'GBP' && r.dataset.dataset[0].Mapping_Name === m.name, `${L}: dataset row built from the mapping (snapshot, currency GBP, mapping name)`);
  ok(r.dataset.items.every(x => x.__source && x.__source.row >= 2 && x.__source.file), `${L}: every standard row carries its source file and row number`);
  if (L === 'L1-alt-headings') {
    const un = byCode(r, 'COLUMN_UNMAPPED');
    ok(un.length === 2 && eq(un.map(i => [i.file, i.columns]), [['Stock_Report.csv', ['Bin']], ['Monthly_Sales.csv', ['Customer Segment', 'Location ID']]]) && un.every(i => i.category === 'Please check'),
      'L1: unmapped columns listed by name per file (Bin; Customer Segment, Location ID), Please check; "Notes" was explicitly ignored so not listed');
    ok(eq(un[1].looksLike, { 'Location ID': 'Location_ID' }) && /Possibly meant to be imported: Location ID \(looks like Location_ID\)/.test(un[1].message), 'L1: an unmapped column named like a standard field is highlighted');
    ok(byCode(r, 'CLEANED').some(i => i.table === 'items' && i.rules['£ removed'] > 0 && i.rules['yes/true read as Y'] > 0) && byCode(r, 'CLEANED').some(i => i.table === 'stock' && i.rules['thousands separators removed'] > 0), 'L1: £, thousands separators and Yes/No reported as tidied (For information)');
  } else {
    ok(byCode(r, 'LEADING_ZEROS').length === 1 && byCode(r, 'LEADING_ZEROS')[0].table === 'po_lines' && byCode(r, 'LEADING_ZEROS')[0].rows.length === 741, 'L2: PO line numbers stored as Excel numbers → leading-zeros warning (Please check), values still equal');
    // the same workbook read with the wrong date format: US-only dates read as UK → most are invalid in UK order → the table stops
    const m2 = JSON.parse(JSON.stringify(m)); m2.files['ERP_Extract.xlsx'].dateFormat = 'UK';
    const r2 = V.importFiles(m2, dirInputs(path.join(FX, 'layouts', L)));
    ok(byCode(r2, 'DATE_FORMAT_STOP').some(i => i.table === 'po_lines') && r2.completeness.po_lines.status === 'stopped' && !r2.importAccepted && eq(strip(r2.dataset.stock), P01.stock),
      'L2 read with the wrong date format (UK): po_lines stops with DATE_FORMAT_STOP; Excel date cells elsewhere are unaffected');
    // a code missing from an explicit value map is never guessed
    const m3 = JSON.parse(JSON.stringify(m)); delete m3.tables.items.sources[0].columns.Replenishment.values.P;
    const r3 = V.importFiles(m3, dirInputs(path.join(FX, 'layouts', L)));
    const rej = byCode(r3, 'ROW_REJECTED').find(i => i.table === 'items');
    ok(rej && rej.category === 'Must fix' && rej.rows.length === P01.items.filter(x => x.Replenishment === 'Buy').length && /"P" is not in the mapping's list of values for Replenishment/.test(rej.rows[0].reasons[0]),
      'L2 with "P" removed from the Make/Buy value map: every bought item is rejected with the reason; no code is guessed');
    const m4 = JSON.parse(JSON.stringify(m)); delete m4.tables.items.sources[0].columns.Active.values.A;
    const r4 = V.importFiles(m4, dirInputs(path.join(FX, 'layouts', L)));
    const fb = byCode(r4, 'FIELD_BLANKED').find(i => i.field === 'Active');
    ok(fb && fb.category === 'Please check' && fb.rows.length === 120 && r4.dataset.items.length === 120 && r4.dataset.items.every(x => x.Active === null),
      'L2 with "A" removed from the Active value map: the optional field is left blank and flagged for all 120 items; items kept; nothing guessed');
  }
}
// The same layout with columns in a different order still maps correctly (mapping is by heading, not position)
{
  const dir = path.join(FX, 'layouts', 'L1-alt-headings'), m = readJSON(path.join(FX, 'mappings', 'L1-alt-headings.mapping.json'));
  const inputs = dirInputs(dir).map(i => { if (i.name !== 'Products.csv') return i; const t = RD.fromCSVText(i.text, i.name), order = t.headers.map((_, k) => k).reverse();
    const q = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    return { name: i.name, text: [order.map(k => t.headers[k]), ...t.rows.map(r => order.map(k => r.cells[k]))].map(r => r.map(q).join(',')).join('\n') }; });
  const r = V.importFiles(m, inputs);
  ok(r.importAccepted && eq(strip(r.dataset.items), P01.items), 'L1 with the Products.csv columns reversed: items still equal Package 01 (mapping by heading)');
}

// ===================== S3: Package 02 (the only source → standard pair) =====================
console.log('\n--- S3 Package 02: source export + committed mapping');
{
  const P2 = path.join(LIB, '02-Messy-Manufacturer'), EXP = canonFolder(path.join(P2, 'expected-canonical')), ER = readJSON(path.join(P2, 'expected-import-report.json'));
  const m = readJSON(path.join(FX, 'mappings', 'package-02.mapping.json'));
  const r = V.importFiles(m, dirInputs(path.join(P2, 'source-export')));
  ok(!r.importAccepted && r.completeness.stock.status === 'stopped' && r.completeness.demand.status === 'stopped', 'stock (I09) and demand (I16) are STOPPED by conflicting duplicates; the import is not accepted (expected-import-report: 1 + 1 conflicts requiring resolution)');
  const cs = byCode(r, 'DUP_CONFLICT');
  ok(cs.length === 2 && cs.every(i => i.category === 'Must fix' && i.scope === 'table') && eq(cs.map(i => i.conflicts.map(c => c.key)), [['P0006 / FGW'], ['P0020 / 2024-11-01 / ']]) && !r.dataset.stock && !r.dataset.demand,
    'I09 P0006/FGW and I16 P0020/2024-11-01 listed as Must fix (table scope); neither table is in the dataset and no row was chosen');
  // tables not affected by any stop: compared with expected-canonical value for value
  for (const t of ['po_lines', 'bom', 'production_orders']) ok(eq(strip(r.dataset[t]), EXP[t]), `${t}: equals expected-canonical value for value (${EXP[t].length} rows)`);
  const noUoM = rows => rows.map(x => Object.assign({}, x, { Unit_of_Measure: null }));
  ok(eq(strip(r.dataset.items), noUoM(EXP.items)) && r.dataset.items.every(x => x.Unit_of_Measure === null),
    'items: equal expected-canonical on every column except Unit_of_Measure (expected "each" needs a constant, A12, Stage 6; left blank, never invented)');
  const noActive = rows => rows.map(x => Object.assign({}, x, { Active: null }));
  ok(eq(strip(r.dataset.suppliers), noActive(EXP.suppliers)), 'suppliers: equal expected-canonical incl. the S99 placeholder (I18), on every column except Active (expected "Y" needs a constant, A12)');
  // stopped tables: the rows not involved in the conflict equal the expected rows (the expected file assumes the resolution)
  const heldStock = strip(r.held.stock.rows), expStock = EXP.stock.filter(x => !(x.Item_ID === 'P0006' && x.Location_ID === 'FGW'));
  ok(eq(heldStock, expStock), `stock (held, not imported): the ${expStock.length} rows outside the conflict equal expected-canonical; the resolved P0006 row is Stage 6`);
  const heldDem = strip(r.held.demand.rows), expDem = EXP.demand.filter(x => !(x.Item_ID === 'P0020' && x.Period_Start === '2024-11-01'));
  ok(eq(heldDem, expDem), `demand (held, not imported): the ${expDem.length} rows outside the conflict equal expected-canonical, incl. " p0012 " matched to P0012 (I15)`);
  // the import report against expected-import-report.json
  const sr = byCode(r, 'ROW_REJECTED').find(i => i.table === 'stock');
  const asText = sr ? sr.rows.map(x => x.item + (x.suggest ? ' (unmatched; suggest ' + x.suggest + ')' : ' (unmatched)')) : [];
  ok(eq(asText.slice().sort(), ER.stock_rows_rejected.slice().sort()) && sr.category === 'Must fix' && sr.scope === 'dataset', `stock rows rejected = ${JSON.stringify(ER.stock_rows_rejected)} (Must fix: stock must be complete)`);
  ok(r.completeness.stock.duplicatesRemoved === ER.stock_exact_duplicates_removed && r.completeness.po_lines.duplicatesRemoved === ER.po_exact_duplicates_removed, 'exact duplicates removed: stock 1 (I08), PO lines 1 (I19, PO number + line present)');
  const pr = byCode(r, 'ROW_REJECTED').find(i => i.table === 'po_lines');
  const poIds = pr.rows.map(x => x.row).map(row => fs.readFileSync(path.join(P2, 'source-export', 'PO_Lines.csv'), 'utf8').split(/\r?\n/)[row - 1].split(',')[0]);
  ok(eq(poIds, ['PO99901', 'PO99902']) && /Received_Qty: number with text attached/.test(pr.rows[0].reasons[0]) && /Promised_Date: only valid as month\/day\/year/.test(pr.rows[1].reasons[0]) && pr.category === 'Please check',
    'PO rows rejected: PO99901 (unit text, I20) and PO99902 (US-only date, I21), Please check (history table, below thresholds)');
  ok(eq(byCode(r, 'SUPPLIER_PLACEHOLDER')[0].codes, ER.supplier_placeholders), 'supplier placeholders = ["S99"]');
  ok(eq(byCode(r, 'COST_MISSING')[0].items.slice().sort(), ER.items_cost_missing.slice().sort()) && byCode(r, 'FIELD_BLANKED').some(i => i.field === 'Standard_Cost' && i.rows.length === 2), 'items cost missing = P0026, M0044 ("TBC" blanked and flagged, rows kept)');
  ok(eq(byCode(r, 'ITEMS_INACTIVE')[0].items, ER.items_inactive), 'inactive items = P0038, P0039 (Obsolete mapped to N by the explicit value map)');
  const neg = byCode(r, 'NEGATIVE_KEPT')[0];
  ok(neg && neg.rows.length === 1 && neg.rows[0].value === -12 && r.held.stock.rows.some(x => x.Item_ID === 'M0030' && x.Location_ID === 'MAIN' && x.On_Hand_Qty === -12), 'negative stock M0030 at MAIN (−12) kept as entered and flagged');
  ok(byCode(r, 'DATE_AMBIGUOUS').some(i => i.table === 'demand' && i.count === 961 - 80) && byCode(r, 'REF_CASE_MATCHED').some(i => i.table === 'demand' && i.count === 24), 'I17: ambiguous sales months counted (every 01/MM except January = 881); I15: 24 codes matched ignoring case');
  ok(!codes(r).includes('COLUMN_UNMAPPED'), 'I13: Bin Location explicitly ignored, so no unmapped-column report');
  ok(['supplier_items', 'locations'].every(t => r.completeness[t].status === 'not-supplied'), 'NOT compared in Stage 1 (stated): supplier_items (derived table + constant), locations (not in the source files), dataset (expected file copied from Package 01)');
  ok(r.permissions.dataset.status === 'blocked' && r.permissions.analyses.demand === 'stopped' && r.permissions.analyses.purchasing === 'available' && eq(incompleteItems(r, 'purchasing'), ['M0003']),
    'permissions: dataset blocked (stock); demand stopped; purchasing available with M0003 marked incomplete (2 rejected PO rows)');
}

// ===================== S4: Packages 01, 03, 04, 05 (identity / pass-through only) =====================
console.log('\n--- S4 Packages 01, 03, 04, 05: identity mapping (proves pass-through, NOT mapping of unfamiliar layouts)');
for (const pk of ['01-Clean-Manufacturer', '03-Distributor', '04-Mixed-Make-Buy', '05-Performance-Dataset']) {
  const dir = path.join(LIB, pk), exp = canonFolder(dir), rc = readJSON(path.join(dir, 'expected-results.json')).row_counts;
  const t0 = Date.now();
  const r = V.importFiles(identityMapping(dir), dirInputs(dir).filter(i => i.name.endsWith('.csv')));
  const ms = Date.now() - t0;
  const diff = Object.keys(exp).filter(t => t !== 'dataset' && !eq(strip(r.dataset[t]), exp[t]));
  ok(r.importAccepted && r.summary.mustFix === 0 && diff.length === 0, `${pk}: output equals input value for value; 0 Must fix${diff.length ? ' — differ: ' + diff.join(', ') : ''}`);
  const got = Object.fromEntries(Object.keys(rc).map(t => [t, r.dataset[t] ? r.dataset[t].length : 0]));
  ok(eq(got, rc), `${pk}: row counts equal expected-results.json ${JSON.stringify(rc)}`);
  if (pk.startsWith('05')) { console.log(`timing: Package 05 (${Object.values(rc).reduce((a, b) => a + b, 0)} rows) read + mapped + validated in ${ms} ms`); ok(ms < 60000, 'Package 05 completes within the stated limit of 60 s on the test machine (measured time printed on the timing: line)'); }
}

// ===================== S5: Package 06 edge cases =====================
console.log('\n--- S5 Package 06 edge cases (outcome defined in each EXPECTED.md, import part)');
{
  const run = e => { const dir = path.join(LIB, '06-Edge-Cases', e, 'input'); return V.importFiles(identityMapping(dir), dirInputs(dir)); };
  const E = {}; fs.readdirSync(path.join(LIB, '06-Edge-Cases')).filter(n => /^E\d\d/.test(n)).sort().forEach(n => { E[n.slice(0, 3)] = run(n); });
  ok(Object.keys(E).length === 11, '11 edge cases run');
  ok(E.E01.importAccepted && eq(byCode(E.E01, 'NO_DEMAND_HISTORY')[0].items, ['A2']) && E.E01.permissions.items.A2.noDemandHistory === true, 'E01: A2 listed as a sold item with no demand history (not zero, not an error)');
  ok(E.E02.importAccepted && E.E02.permissions.analyses.purchasing === 'unavailable' && byCode(E.E02, 'TABLE_EMPTY').some(i => i.table === 'po_lines' && i.category === 'Please check'), 'E02: no purchase orders → purchasing analysis unavailable (headings-only PO file is valid)');
  ok(E.E03.importAccepted && eq(byCode(E.E03, 'COST_MISSING')[0].items, ['A2']) && E.E03.dataset.items.find(x => x.Item_ID === 'A2').Standard_Cost === null, 'E03: A2 kept, cost missing (null, never 0), listed');
  ok(E.E04.importAccepted && byCode(E.E04, 'NEGATIVE_KEPT')[0].rows[0].value === -15 && E.E04.dataset.stock.some(x => x.On_Hand_Qty === -15), 'E04: −15 kept as entered and flagged');
  ok(E.E05.importAccepted && E.E05.summary.mustFix === 0 && E.E06.importAccepted && E.E06.summary.mustFix === 0, 'E05, E06: import cleanly (receipt and overdue rules are engine behaviour, Stage 2)');
  const s9 = E.E07.dataset.suppliers.find(x => x.Supplier_ID === 'S9');
  ok(E.E07.importAccepted && s9 && s9.Supplier_Name === 'Unlisted supplier S9' && s9.Standard_Lead_Time_Days === null && s9.__placeholder === true && E.E07.dataset.po_lines.length === 7, 'E07: S9 added as "Unlisted supplier S9" placeholder, lines kept, nothing invented');
  ok(!E.E08.importAccepted && E.E08.completeness.demand.status === 'stopped' && eq(byCode(E.E08, 'DUP_EXACT_REMOVED').map(i => i.table), ['items', 'stock', 'po_lines']) &&
    E.E08.dataset.stock.filter(x => x.Item_ID === 'A1').length === 1 && E.E08.dataset.po_lines.length === 5 && E.E08.dataset.items.length === 2, 'E08: 3 exact duplicates removed (item, stock, PO line); A1 stock 60 once; 5 PO lines; conflicting demand row STOPS demand');
  ok(E.E09.importAccepted && byCode(E.E09, 'LOCATION_MISSING')[0].rows.length === 1 && E.E09.dataset.stock.some(x => x.Item_ID === 'A2' && x.Location_ID === null && x.On_Hand_Qty === 7), 'E09: blank warehouse flagged and kept; no "UNASSIGNED" location applied (needs approval)');
  ok(E.E10.importAccepted && E.E10.summary.mustFix === 0 && E.E10.dataset.demand.filter(x => x.Item_ID === 'A2').every(x => x.Units === 0), 'E10: zero demand imported as 0 (not missing)');
  ok(E.E11.importAccepted && eq(byCode(E.E11, 'ITEMS_INACTIVE')[0].items, ['A2']) && E.E11.dataset.stock.some(x => x.Item_ID === 'A2'), 'E11: inactive A2 kept with its stock and listed');
}

// ===================== fault-case runner =====================
const FAULTS = path.join(FX, 'faults');
function fault(name) {
  const m = readJSON(path.join(FAULTS, name, 'mapping.json'));
  const files = new Map(dirInputs(path.join(FAULTS, 'base')).map(i => [i.name, i]));
  dirInputs(path.join(FAULTS, name)).forEach(i => files.set(i.name, i));
  const need = new Set(Object.values(m.tables).map(t => t.sources[0].file));
  return V.importFiles(m, [...files.values()].filter(f => need.has(f.name)));
}

// ===================== S6: duplicates (A6) =====================
console.log('\n--- S6 duplicates (A6 per-table rules)');
{
  // Reference statement of the approved rules. (Record Part A, amended by Q5.) Its independence as a test has reduced because the
  // approved Q5 rule and this reference statement were updated together in the correction pass (13 Nov 2026).
  const SPEC = { items: 'remove', suppliers: 'remove', locations: 'remove', supplier_items: 'remove', bom: 'remove', stock: 'remove', po_lines: 'remove-if-id:PO_ID+Line_No', po_headers: 'remove-if-id:PO_ID',
    production_orders: 'remove-if-id:Production_Order_ID', demand: 'keep', sales_lines: 'remove-if-id:SO_ID+Line_No' };
  // EXPECTED-RESULT CHANGE (owner Q5, 13 Nov 2026; record F8): sales_lines was 'keep'; it now follows the PO-line rule.
  const got = Object.fromEntries(Object.keys(SPEC).map(t => [t, V.DUP_RULES[t].exact + (V.DUP_RULES[t].id ? ':' + V.DUP_RULES[t].id.join('+') : '')]));
  ok(eq(got, SPEC), 'DUP_RULES equal the approved per-table rules (master/stock remove; PO/orders and sales lines only with both IDs (Q5); demand keep)');
  const f8 = fault('F08-dup-demand-identical');
  ok(f8.importAccepted && f8.dataset.demand.length === 961 && byCode(f8, 'DUP_EXACT_KEPT')[0].category === 'Please check', 'F08: identical demand rows are BOTH kept (961 rows) and flagged Please check; never silently removed');
  // EXPECTED-RESULT CHANGE (owner Q4, 13 Nov 2026; record F8): the item now carries the caveat; previously it had no marker.
  {
    const e = f8.permissions.items.P0002, k = byCode(f8, 'DUP_EXACT_KEPT')[0], d = e && e.caveatDetails && e.caveatDetails.demand[0];
    ok(e && e.caveats.demand === 'based_on_possibly_duplicated_rows' && Object.keys(e.blocked).length === 0 && f8.permissions.analyses.demand === 'available' && V.reliabilityOf(f8, 'P0002', 'demand') === 'caveated' && V.reliabilityOf(f8, 'P0001', 'demand') === 'available',
      'F08 (Q4): P0002 marked caveats.demand = "based_on_possibly_duplicated_rows"; not blocked; demand analysis still available; reliabilityOf → caveated (other items available)');
    ok(d && eq(d.rows, [32, 962]) && d.copies === 2 && d.period === '2025-05-01' && d.quantity === 106 && d.possibleExtra === 106, 'F08 (Q4): caveat details record the rows (32 & 962), 2 copies, the month and the possible extra quantity Σ(copies−1)×Units = 106');
    ok(/Item P0002 — 2 identical demand rows for 2025-05-01 \(rows 32 & 962\), 106 units each\. Possible extra quantity: 106 units\./.test(k.message) && /kept/.test(k.message) && /Analysis is still available/.test(k.message) && /overstated/.test(k.message) && /investigate/.test(k.message) && eq(k.items, ['P0002']),
      'F08 (Q4): the import report says in plain English that the rows were kept, analysis is available, results may be overstated, names P0002, the rows and 106 extra units, and asks the user to investigate');
  }
  const f9 = fault('F09-dup-differs-unmapped');
  ok(!f9.importAccepted && f9.completeness.stock.status === 'stopped' && byCode(f9, 'DUP_CONFLICT')[0].conflicts[0].key === 'P0002 / FGW', 'F09: rows identical in every mapped column but different in an unmapped column (Bin) are NOT exact duplicates → conflict, stock stopped');
  const f10 = fault('F10-dup-po-with-id');
  ok(f10.importAccepted && f10.dataset.po_lines.length === 741 && byCode(f10, 'DUP_EXACT_REMOVED')[0].rows.length === 1 && byCode(f10, 'DUP_EXACT_REMOVED')[0].category === 'For information', 'F10: identical PO line with PO number + line → one copy removed and listed (741 rows)');
  const f11 = fault('F11-dup-po-no-id');
  ok(f11.importAccepted && f11.dataset.po_lines.length === 742 && byCode(f11, 'DUP_EXACT_KEPT')[0].category === 'Please check' && !codes(f11).includes('DUP_CONFLICT'), 'F11: identical PO lines with no line number → both kept (742) and flagged; no key check without the line number');
  // sales lines and PO headers have no library data: small inline CSVs (protected with this file), joined to the F-case base
  {
    const base = readJSON(path.join(FAULTS, 'F07-cost-tbc', 'mapping.json'));
    const m = JSON.parse(JSON.stringify(base)); m.files['so.csv'] = { dateFormat: 'UK' }; m.files['poh.csv'] = { dateFormat: 'ISO', currency: { code: 'GBP', confirmed: true } };
    const cols = (t, hs) => ({ sources: [{ file: t, columns: Object.fromEntries(hs.map(h => [h, { source: h }])) }] });
    m.tables.sales_lines = cols('so.csv', ['SO_ID', 'Line_No', 'Item_ID', 'Order_Date', 'Ordered_Qty']);
    m.tables.po_headers = cols('poh.csv', ['PO_ID', 'Supplier_ID', 'Order_Date', 'Header_Total']);
    const so = 'SO_ID,Line_No,Item_ID,Order_Date,Ordered_Qty\nSO1,10,P0001,03/10/2026,5\nSO1,10,P0001,03/10/2026,5\nSO2,10,P0002,04/10/2026,7\nSO2,10,P0002,04/10/2026,8\n';
    const poh = 'PO_ID,Supplier_ID,Order_Date,Header_Total\nH1,S01,2026-10-01,£100.00\nH1,S01,2026-10-01,£100.00\nH2,S77,2026-10-02,50\n';
    const files = new Map(dirInputs(path.join(FAULTS, 'base')).map(i => [i.name, i])); files.set('so.csv', { name: 'so.csv', text: so }); files.set('poh.csv', { name: 'poh.csv', text: poh });
    files.set('items.csv', rd(path.join(FAULTS, 'F07-cost-tbc'), 'items.csv'));
    const need = new Set(Object.values(m.tables).map(t => t.sources[0].file));
    const r = V.importFiles(m, [...files.values()].filter(f => need.has(f.name)));
    const kept = byCode(r, 'DUP_EXACT_KEPT').find(i => i.table === 'sales_lines'), cf = byCode(r, 'DUP_CONFLICT').find(i => i.table === 'sales_lines');
    // EXPECTED-RESULT CHANGE (owner Q5, 13 Nov 2026; record F8): SO1/10 (both IDs, whole row identical) was kept; it is now removed.
    const rm = byCode(r, 'DUP_EXACT_REMOVED').find(i => i.table === 'sales_lines');
    ok(!kept && rm && eq(rm.rows, [{ row: 3, sameAs: 2 }]) && cf && cf.conflicts[0].key === 'SO2 / 10' && r.completeness.sales_lines.status === 'stopped',
      'sales lines (Q5): identical SO1/10 with order and line number → one copy removed and reported; SO2/10 with different quantities is a conflict and stops the table');
    // Q5 without a line number, and Q6 for sales: identical lines are kept with the Q4 caveat; a line dated after the snapshot is excluded
    const m2 = JSON.parse(JSON.stringify(base)); m2.files['so2.csv'] = { dateFormat: 'UK' }; m2.tables.sales_lines = cols('so2.csv', ['SO_ID', 'Item_ID', 'Order_Date', 'Ordered_Qty']);
    const so2 = 'SO_ID,Item_ID,Order_Date,Ordered_Qty\nSO9,P0001,05/10/2026,7\nSO9,P0001,05/10/2026,7\nSO8,P0002,06/10/2026,4\nSO7,P0003,05/12/2026,\n';
    const f2 = new Map(files); f2.set('so2.csv', { name: 'so2.csv', text: so2 });
    const need2 = new Set(Object.values(m2.tables).map(t => t.sources[0].file));
    const r2 = V.importFiles(m2, [...f2.values()].filter(f => need2.has(f.name)));
    const k2 = byCode(r2, 'DUP_EXACT_KEPT').find(i => i.table === 'sales_lines'), e2 = r2.permissions.items.P0001;
    ok(k2 && r2.dataset.sales_lines.length === 3 && e2 && e2.caveats.demand === 'based_on_possibly_duplicated_rows' && e2.caveatDetails.demand[0].possibleExtra === 7 && /no order number and line number to prove they are copies/.test(k2.message) && /Possible extra quantity: 7 units/.test(k2.message),
      'sales lines (Q5) with no line number: identical SO9 lines are both kept, flagged, and P0001 carries the Q4 caveat (possible extra 7 units)');
    const fd = byCode(r2, 'FUTURE_DATED').find(i => i.table === 'sales_lines');
    ok(fd && eq(fd.rows.map(x => [x.row, x.date]), [[5, '2026-12-05']]) && r2.completeness.sales_lines.futureExcluded === 1 && !byCode(r2, 'ROW_REJECTED').some(i => i.table === 'sales_lines'),
      'sales lines (Q6): the order dated 05/12/2026 (after the 2026-10-31 snapshot, blank quantity) is excluded as future-dated, not rejected');
    ok(r.dataset.po_headers.length === 2 && byCode(r, 'DUP_EXACT_REMOVED').some(i => i.table === 'po_headers') && r.dataset.suppliers.some(x => x.Supplier_ID === 'S77' && x.__placeholder) && r.dataset.po_headers[0].Header_Total === 100,
      'PO headers: identical header with a PO number removed; unlisted supplier S77 gets a placeholder; £100.00 read as 100');
  }
  const f12 = fault('F12-dup-item-conflict');
  ok(!f12.importAccepted && f12.completeness.items.status === 'stopped' && f12.permissions.dataset.status === 'blocked' && byCode(f12, 'DUP_EXACT_REMOVED').some(i => i.table === 'items'), 'F12: an item twice with different names → items stopped, dataset blocked; a separate exact copy is still removed');
}

// ===================== S7: partial imports (two thresholds, two decisions) =====================
console.log('\n--- S7 partial imports');
{
  ok(V.THRESHOLDS.tableShare === 0.05 && V.THRESHOLDS.itemMonthsAllowed === 1, 'thresholds are exactly the approved values: 5% of a history table; more than 1 month of an item\'s demand');
  const f1 = fault('F01-stock-bad-row');
  const rj = byCode(f1, 'ROW_REJECTED')[0];
  ok(!f1.importAccepted && f1.permissions.dataset.status === 'blocked' && rj.category === 'Must fix' && rj.scope === 'dataset' && rj.rows.length === 1 && /On_Hand_Qty: not a number/.test(rj.rows[0].reasons[0]), 'F01: one bad stock row → Must fix, analysis blocked for the whole dataset');
  const f2 = fault('F02-demand-2pct');
  ok(f2.importAccepted && f2.permissions.dataset.status === 'allowed' && blockedItems(f2, 'demand').length === 0 && incompleteItems(f2, 'demand').length === 19 && f2.completeness.demand.thresholdCrossed === false,
    'F02: 19 bad demand rows (2.0%), one month each → import accepted; 19 items listed as incomplete, none blocked');
  const f3 = fault('F03-demand-10pct');
  ok(f3.importAccepted && blockedItems(f3, 'demand').length === 24 && f3.completeness.demand.thresholdCrossed === true && f3.permissions.items.P0001.blocked.demand.includes('10% of demand rows') && f3.permissions.items.P0001.blocked.demand.includes('4 months'),
    'F03: 96 bad rows (10%) over 24 items → import accepted (decision 1) but those 24 items blocked from demand analysis (decision 2), both reasons given');
  ok(f3.permissions.analyses.demand === 'available' && !f3.permissions.items.P0025, 'F03: items without rejected rows are not affected');
  const f4 = fault('F04-item-months');
  ok(eq(blockedItems(f4, 'demand'), ['P0001']) && eq(incompleteItems(f4, 'demand'), ['P0002']) && f4.completeness.demand.thresholdCrossed === false, 'F04: item threshold alone (0.3% of the table): P0001 loses 2 months → blocked; P0002 loses exactly 1 month → incomplete only');
  const f5a = fault('F05a-small-table-5pct'), f5b = fault('F05b-small-table-4pct');
  ok(f5a.completeness.demand.sourceRows === 120 && f5a.completeness.demand.rejectedShare === 0.05 && blockedItems(f5a, 'demand').length === 6, 'F05a: table threshold alone, small table (120 rows): 6 bad rows = exactly 5.0% → crossed, the 6 items (1 month each) blocked');
  ok(Math.abs(f5b.completeness.demand.rejectedShare - 5 / 120) < 1e-12 && blockedItems(f5b, 'demand').length === 0 && incompleteItems(f5b, 'demand').length === 5, 'F05b: 5 bad rows = 4.2% → not crossed, 5 items incomplete only');
  ok(f2.completeness.demand.sourceRows === 960 && f5a.completeness.demand.sourceRows === 120, 'thresholds tested on two dataset sizes (960 and 120 history rows)');
  const f6 = fault('F06-no-po-table');
  ok(f6.importAccepted && f6.permissions.analyses.purchasing === 'unavailable' && byCode(f6, 'TABLE_NOT_SUPPLIED').some(i => i.analysis === 'purchasing' && i.category === 'Please check'), 'F06: no PO table → purchasing analysis unavailable, reported');
  const f7 = fault('F07-cost-tbc');
  ok(f7.importAccepted && f7.dataset.items.find(x => x.Item_ID === 'M0004').Standard_Cost === null && eq(byCode(f7, 'COST_MISSING')[0].items, ['M0004']) && f7.permissions.financial.status === 'allowed',
    'F07: cost "TBC" → blank and flagged, item kept and listed as left out of £ totals; financial analysis otherwise allowed');
}

// ===================== S8: currency =====================
console.log('\n--- S8 currency (declared per file, actively confirmed, never converted)');
{
  const money = (r, t, f) => r.dataset[t].map(x => x[f]);
  const f13 = fault('F13-currency-usd');
  ok(f13.importAccepted && f13.permissions.financial.status === 'withheld' && byCode(f13, 'CURRENCY_UNSUPPORTED')[0].category === 'Must fix' && byCode(f13, 'CURRENCY_UNSUPPORTED')[0].scope === 'financial',
    'F13: items.csv declared USD → Must fix (financial scope), financial values withheld');
  ok(money(f13, 'items', 'Standard_Cost').every(v => v === null) && money(f13, 'items', 'Selling_Price').every(v => v === null) && f13.dataset.stock.some(x => x.Unit_Cost !== null) && f13.dataset.stock.every(x => x.On_Hand_Qty !== null) && f13.dataset.dataset[0].Currency === 'GBP',
    'F13: the USD file\'s money values are not placed in the dataset (null); quantities intact; nothing converted');
  const f14 = fault('F14-currency-dollar-value');
  const fv = byCode(f14, 'CURRENCY_FOREIGN_VALUE')[0];
  ok(fv && fv.mixed === true && fv.rows[0].value === '$46.10' && money(f14, 'stock', 'Unit_Cost').every(v => v === null) && f14.permissions.financial.status === 'withheld' && f14.importAccepted, 'F14: one "$" value in a GBP file → mixed currencies, Must fix; the whole file\'s money values withheld; quantity analysis continues');
  const f15 = fault('F15-currency-unconfirmed');
  ok(byCode(f15, 'CURRENCY_UNCONFIRMED')[0] && /pre-selected but has not been confirmed/.test(byCode(f15, 'CURRENCY_UNCONFIRMED')[0].message) && money(f15, 'po_lines', 'Unit_Cost').every(v => v === null) && f15.permissions.financial.status === 'withheld',
    'F15: GBP pre-selected but NOT confirmed → treated as undeclared (Must fix), values withheld — no silent GBP default');
  const f16 = fault('F16-currency-undeclared');
  ok(byCode(f16, 'CURRENCY_UNCONFIRMED')[0] && /cannot tell the currency of plain numbers/.test(byCode(f16, 'CURRENCY_UNCONFIRMED')[0].message) && f16.permissions.financial.status === 'withheld', 'F16: plain numbers with no declaration are never assumed to be GBP; the message explains why');
  const f17 = fault('F17-no-money-no-currency');
  ok(f17.importAccepted && f17.permissions.financial.status === 'allowed' && !codes(f17).some(c => /^CURRENCY_/.test(c)), 'F17: files with no money columns need no currency declaration');
  const ok1 = fault('F07-cost-tbc');
  ok(byCode(ok1, 'CURRENCY_CONFIRMED').length === 3 && byCode(ok1, 'CURRENCY_CONFIRMED').every(i => i.category === 'For information' && /cannot detect the currency of plain numbers/.test(i.message)), 'confirmed GBP files: the report states that GBP rests on the user\'s confirmation');
}

// ===================== S9: units =====================
console.log('\n--- S9 units (check-only; never converted)');
{
  const f18 = fault('F18-unit-mismatch');
  const um = byCode(f18, 'UNIT_MISMATCH');
  ok(eq(um.map(i => i.item).sort(), ['M0001', 'P0001']) && um.every(i => i.category === 'Must fix' && i.scope === 'item') && eq(blockedItems(f18, 'all'), ['M0001', 'P0001']), 'F18: "box" and "EA" against item unit "each" → Must fix for those items only; both excluded from every analysis');
  ok(f18.importAccepted && f18.dataset.stock.find(x => x.Item_ID === 'P0001').On_Hand_Qty === 128 && f18.dataset.stock.every(x => x.__unit !== undefined) && !byCode(f18, 'UNIT_NOT_CHECKED').some(i => i.table === 'stock'),
    'F18: "Each" vs "each" matches (case ignored); quantities kept as written, never converted; the unit kept as provenance only');
  ok(byCode(fault('F07-cost-tbc'), 'UNIT_NOT_CHECKED').length === 3, 'files with no unit column: a standing note per table that the unit cannot be verified (For information)');
}

// ===================== S10: failure and recovery =====================
console.log('\n--- S10 failure and recovery');
{
  const good = fault('F07-cost-tbc'), snap = JSON.stringify(good);
  const want = { 'F19-corrupt-xlsx': 'FILE_UNREADABLE', 'F20-not-a-zip-xlsx': 'FILE_UNREADABLE', 'F21-wrong-type': 'FILE_WRONG_TYPE', 'F22-empty-file': 'FILE_EMPTY', 'F23-headings-only': 'TABLE_EMPTY', 'F24-missing-column': 'COLUMN_MISSING' };
  for (const [c, code] of Object.entries(want)) {
    let r, threw = null; try { r = fault(c); } catch (e) { threw = e.message; }
    const i = r && byCode(r, code)[0];
    ok(!threw && i && i.category === 'Must fix' && !r.importAccepted && r.permissions.dataset.status === 'blocked' && i.message.length > 20, `${c}: clear Must fix ${code} ("${i ? i.message.slice(0, 70) : threw}…"), no exception, import not accepted`);
  }
  ok(!byCode(fault('F23-headings-only'), 'ROW_REJECTED').length, 'F23: with no items, other rows are not also rejected as "unmatched" (one clear problem, not hundreds)');
  ok(JSON.stringify(good) === snap && Object.isFrozen(good) && Object.isFrozen(good.dataset.items[0]) && Object.isFrozen(good.issues[0]), 'after six failed imports the earlier result is unchanged and deeply frozen');
  let threw = false; try { MP.loadFile(null); MP.loadFile({ name: 'x.csv', bytes: new Uint8Array([0xff, 0xfe, 0x00]) }); MP.loadFile({ name: 'x.xlsx', bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]) }); } catch (e) { threw = true; }
  ok(!threw, 'loadFile never throws (null input, invalid UTF-8, truncated ZIP)');
  // inputs are not changed by a run
  const m = readJSON(path.join(FX, 'mappings', 'package-02.mapping.json')), loaded = {};
  dirInputs(path.join(LIB, '02-Messy-Manufacturer', 'source-export')).forEach(i => { const lf = MP.loadFile(i); loaded[lf.file] = lf; });
  const ms = JSON.stringify(m), ls = JSON.stringify(loaded);
  const a = V.run(m, loaded), b = V.run(m, loaded);
  ok(JSON.stringify(m) === ms && JSON.stringify(loaded) === ls && JSON.stringify(a) === JSON.stringify(b), 'run() does not change its inputs; two runs give identical results');
}

// ===================== S12: D1 money-field currency classification (owner, 13 Nov 2026) =====================
// The D1 journey: for every raw value, the currency-check path (file level) and the row-building path must agree.
// This test is part of Stage 1 and must not be removed or weakened by later stages (record Part F).
console.log('\n--- S12 D1 currency classification and the currency journey (money fields only)');
{
  // ISO list (record F-2; pre-Stage 2 correction Part A, 14 Nov 2026): official SIX List One 2026-09-17, 178 current codes, minus the
  // 16 codes that are not currency amounts (4 metals, 10 funds incl. XAD, XTS testing, XXX no currency) = 162, + 6 withdrawn = 168.
  // Was 169 with hash 079aaabf… in the Stage 1 commit (XAD then wrongly counted as a currency; see record F-2).
  const L = V.CURRENCY_CODES;
  ok(L.length === 168 && ['ANG', 'BGN', 'CUC', 'HRK', 'SLL', 'ZWL', 'GBP', 'USD', 'EUR', 'XCG', 'ZWG', 'SLE', 'XDR'].every(c => L.includes(c)) &&
    !['XAU', 'XAG', 'XPT', 'XPD', 'BOV', 'CHE', 'CHW', 'CLF', 'COU', 'MXV', 'USN', 'UYI', 'UYW', 'XAD', 'XTS', 'XXX'].some(c => L.includes(c)),
    'currency code list: 168 codes; the 6 approved withdrawn codes included; metal, fund (incl. XAD), testing and no-currency codes excluded');
  ok(crypto.createHash('sha256').update(L.join(' ')).digest('hex') === '0919fdbc4af6ad38b46ebfc91853bfa222a54562b428a40909cd98a071efa178',
    'currency code list content pinned by SHA-256 (any change to the list must be deliberate and recorded)');
  ok(eq(V.FOREIGN_SYMBOLS.slice().sort(), ['US$', 'A$', 'C$', 'NZ$', 'HK$', 'S$', 'R$', '$', '€', '¥', '￥', '₹', '₩', '₽', '₺', '₪', '₫', '₱', '₦', '฿', '₴', '₸', '¢'].sort()) &&
    eq(V.FOREIGN_WORDS.slice().sort(), ['kr', 'zł', 'Kč', 'Ft', 'Rs', 'Rp', 'RM', 'lei'].sort()), 'approved foreign symbols (23) and currency words (8), exactly');
  // value → [expected classification, expected stored value: number | 'blank' (FIELD_BLANKED) | 'foreign' (withheld) |
  //          'prohibited' (withheld; CURRENCY_PROHIBITED_CODE) | null (missing)]
  // Part A (14 Nov 2026) changed three expectations: "XAU 5", "XTS 5", "BOV 5" were 'none'/'blank' (blanked, Please check, financial
  // allowed); they are now 'prohibited' (Must fix, money values withheld).
  const CASES = [
    ['GBP 46.10', 'GBP', 46.1], ['46.10 GBP', 'GBP', 46.1], ['46.10GBP', 'GBP', 46.1], ['GBP46.10', 'GBP', 46.1], ['gbp 46.10', 'GBP', 46.1], ['Gbp 46.10', 'GBP', 46.1],
    ['£46.10', 'GBP', 46.1], ['£1,234.56', 'GBP', 1234.56], ['46.10 £', 'GBP', 46.1], ['GBP £46.10', 'GBP', 46.1], ['(GBP 5)', 'GBP', 'blank'], ['GBP 1.234,50', 'GBP', 'blank'],
    ['GBP', 'GBP', 'blank'], ['£', 'GBP', 'blank'],
    ['46.10 USD', 'foreign', 'foreign'], ['USD 46.10', 'foreign', 'foreign'], ['usd 46.10', 'foreign', 'foreign'], ['Usd 46.10', 'foreign', 'foreign'], ['5 eur', 'foreign', 'foreign'],
    ['EUR 5', 'foreign', 'foreign'], ['$46.10', 'foreign', 'foreign'], ['US$46.10', 'foreign', 'foreign'], ['A$5', 'foreign', 'foreign'], ['C$5', 'foreign', 'foreign'],
    ['NZ$5', 'foreign', 'foreign'], ['HK$5', 'foreign', 'foreign'], ['S$5', 'foreign', 'foreign'], ['R$5', 'foreign', 'foreign'], ['€5', 'foreign', 'foreign'], ['5€', 'foreign', 'foreign'],
    ['¥5', 'foreign', 'foreign'], ['￥5', 'foreign', 'foreign'], ['₹5', 'foreign', 'foreign'], ['₩5', 'foreign', 'foreign'], ['₽5', 'foreign', 'foreign'], ['₺5', 'foreign', 'foreign'],
    ['₪5', 'foreign', 'foreign'], ['₫5', 'foreign', 'foreign'], ['₱5', 'foreign', 'foreign'], ['₦5', 'foreign', 'foreign'], ['฿5', 'foreign', 'foreign'], ['₴5', 'foreign', 'foreign'],
    ['₸5', 'foreign', 'foreign'], ['5¢', 'foreign', 'foreign'], ['5 kr', 'foreign', 'foreign'], ['5 kr.', 'foreign', 'foreign'], ['5 zł', 'foreign', 'foreign'], ['5 Kč', 'foreign', 'foreign'],
    ['5 Ft', 'foreign', 'foreign'], ['Rs 5', 'foreign', 'foreign'], ['Rs. 5', 'foreign', 'foreign'], ['Rp 5', 'foreign', 'foreign'], ['RM 5', 'foreign', 'foreign'], ['5 lei', 'foreign', 'foreign'],
    ['CHF 5', 'foreign', 'foreign'], ['THB 46.10', 'foreign', 'foreign'], ['XDR 5', 'foreign', 'foreign'], ['ALL 5', 'foreign', 'foreign'], ['USD', 'foreign', 'foreign'],
    ['£46.10 USD', 'foreign', 'foreign'], ['GBP 46.10 USD', 'foreign', 'foreign'], ['46.10usd', 'foreign', 'foreign'],
    ['46.10 apples', 'none', 'blank'], ['BOX 12', 'none', 'blank'], ['46p', 'none', 'blank'], ['all 5', 'none', 'blank'], ['cup 5', 'none', 'blank'], ['top 5', 'none', 'blank'],
    ['pen 5', 'none', 'blank'], ['try 5', 'none', 'blank'], ['mad 5', 'none', 'blank'], ['ron 5', 'none', 'blank'], ['Chf 5', 'none', 'blank'], ['R 5', 'none', 'blank'], ['5 R', 'none', 'blank'],
    ['5 ft', 'none', 'blank'], ['5 rm', 'none', 'blank'], ['XAU 5', 'prohibited', 'prohibited'], ['XTS 5', 'prohibited', 'prohibited'], ['BOV 5', 'prohibited', 'prohibited'], ['USDA 5', 'none', 'blank'], ['TBC', 'none', 'blank'],
    ['46.10', 'none', 46.1], ['(5)', 'none', 'blank'], ['', 'none', null],
  ];
  const q = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const mapping = (money) => ({ format: 'CG-IMPORT-MAPPING', version: 1, name: 'D1 journey', files: { 'items.csv': { dateFormat: 'ISO', currency: { code: 'GBP', confirmed: true } }, 'stock.csv': { dateFormat: 'ISO' } },
    tables: { items: { sources: [{ file: 'items.csv', columns: { Item_ID: { source: 'Item_ID' }, Item_Name: { source: 'Item_Name' }, Is_Sold: { source: 'Is_Sold' }, Replenishment: { source: 'Replenishment' }, Standard_Cost: { source: 'Standard_Cost' } } }] },
      stock: { sources: [{ file: 'stock.csv', columns: { Item_ID: { source: 'Item_ID' }, Snapshot_Date: { source: 'Snapshot_Date' }, On_Hand_Qty: { source: 'On_Hand_Qty' } } }] } },
    dataset: { Snapshot_Date: '2026-10-31' } });
  const journey = v => V.importFiles(mapping(), [{ name: 'items.csv', text: 'Item_ID,Item_Name,Is_Sold,Replenishment,Standard_Cost\nA1,Widget,Y,Buy,' + q(v) + '\n' },
    { name: 'stock.csv', text: 'Item_ID,Snapshot_Date,On_Hand_Qty\nA1,2026-10-31,7\n' }]);
  const wrongCls = [], wrongOut = [], drift = [];
  for (const [v, cls, out] of CASES) {
    const mc = V.moneyCurrency(v).currency;
    if (mc !== cls) wrongCls.push(JSON.stringify(v) + ' → ' + mc);
    const r = journey(v), cost = r.dataset.items[0].Standard_Cost;
    const fileForeign = byCode(r, 'CURRENCY_FOREIGN_VALUE').length === 1 && r.permissions.financial.status === 'withheld';
    const fileProhibited = byCode(r, 'CURRENCY_PROHIBITED_CODE').length === 1 && r.permissions.financial.status === 'withheld';
    const blanked = byCode(r, 'FIELD_BLANKED').some(i => i.field === 'Standard_Cost');
    const got = fileForeign && cost === null && !blanked && !fileProhibited ? 'foreign' : fileProhibited && cost === null && !blanked && !fileForeign ? 'prohibited'
      : blanked && cost === null && !fileForeign && !fileProhibited ? 'blank' : cost;
    if (!(got === out || (typeof out === 'number' && Math.abs(got - out) < 1e-9))) wrongOut.push(JSON.stringify(v) + ' → ' + JSON.stringify(got));
    // no drift: the file-level verdict and the row outcome come from the same classification
    if ((mc === 'foreign') !== fileForeign || (mc === 'foreign') !== (got === 'foreign') || (mc === 'prohibited') !== fileProhibited || (mc === 'prohibited') !== (got === 'prohibited') ||
      (r.importAccepted !== true) || r.dataset.stock[0].On_Hand_Qty !== 7) drift.push(JSON.stringify(v));
  }
  ok(wrongCls.length === 0, `moneyCurrency(): ${CASES.length} values classified GBP / foreign / prohibited / none as approved (codes before or after, case rules, every symbol and word, contradictions → foreign)` + (wrongCls.length ? ' — ' + wrongCls.slice(0, 6).join('; ') : ''));
  ok(wrongOut.length === 0, `D1 journey: each of the ${CASES.length} values in a money field ends as approved (GBP cleaned, foreign and prohibited withheld, ordinary text blanked and not foreign)` + (wrongOut.length ? ' — ' + wrongOut.slice(0, 6).join('; ') : ''));
  ok(drift.length === 0, `D1 journey: for all ${CASES.length} values the file-level currency check and the row-building path agree; quantities and import acceptance are unaffected` + (drift.length ? ' — ' + drift.slice(0, 6).join('; ') : ''));
  // the cleaner cannot override the money decision
  const bx = V.cleanMoney(C.field('items', 'Standard_Cost'), 'BOX 12'), us = V.cleanMoney(C.field('items', 'Standard_Cost'), '46.10 USD'), gb = V.cleanMoney(C.field('items', 'Standard_Cost'), 'GBP 46.10');
  ok(CL.cleanNumber('BOX 12').reason.startsWith('currency other than') && bx.currency === 'none' && !/currency/.test(bx.reason) && /text attached/.test(bx.reason) &&
    /text attached/.test(CL.cleanNumber('46.10 USD').reason) && us.currency === 'foreign' && CL.cleanNumber('GBP 46.10').status === 'invalid' && gb.value === 46.1 && gb.rule === 'GBP indicator removed',
    'the unchanged cleaner says "BOX 12" is a currency, "46.10 USD" is text and "GBP 46.10" invalid; in money fields moneyCurrency() decides instead (none, foreign, 46.1)');
  const same = ['£1,234.56', '£46.10', '46.10', '1,200', '(5)', 'TBC', '', '12 units'].filter(v => { const a = V.cleanMoney(C.field('items', 'Standard_Cost'), v), c = CL.cleanValue(C.field('items', 'Standard_Cost'), v);
    return a.status !== c.status || a.value !== c.value || a.rule !== c.rule || a.reason !== c.reason; });
  ok(same.length === 0, 'values without a GBP code or foreign indicator that the unchanged cleaner handles (e.g. "£1,234.56", "1,200", "TBC") get exactly the cleaner\'s result (status, value, rule, reason)' + (same.length ? ' — differ: ' + same.join(', ') : ''));
  // quantity regression: quantity fields are never treated by the MONEY rules. The unchanged cleaner, called directly, still gives its
  // Stage 1 result (column 4). Pre-Stage 2 correction Part B (14 Nov 2026) changed the import result of six values: "£5" was stored as 5
  // and is now rejected; "$5", "GBP 5", "€5", "5 GBP", "46.10 USD" are still rejected, now with the money-value reason (S12B).
  const MV = 'money value (', QW = 'currency other than £', TA = 'number with text attached';
  const QTY = [['$5', 'reject', MV + '$)', QW], ['GBP 5', 'reject', MV + 'GBP)', QW], ['BOX 12', 'reject', QW, QW], ['5 GBP', 'reject', MV + 'GBP)', TA],
    ['46.10 USD', 'reject', MV + 'USD)', TA], ['€5', 'reject', MV + '€)', QW], ['£5', 'reject', MV + '£)', 5], ['12', 12, null, 12], ['1,200', 1200, null, 1200], ['46p', 'reject', TA, TA]];
  const qWrong = [];
  for (const [v, want, why, directWant] of QTY) {
    const r = V.importFiles(mapping(), [{ name: 'items.csv', text: 'Item_ID,Item_Name,Is_Sold,Replenishment,Standard_Cost\nA1,Widget,Y,Buy,5\n' }, { name: 'stock.csv', text: 'Item_ID,Snapshot_Date,On_Hand_Qty\nA1,2026-10-31,' + q(v) + '\n' }]);
    const direct = CL.cleanValue(C.field('stock', 'On_Hand_Qty'), v);
    const rj = byCode(r, 'ROW_REJECTED').find(i => i.table === 'stock');
    const directOk = typeof directWant === 'number' ? direct.value === directWant : direct.status === 'invalid' && direct.reason.startsWith(directWant);
    const okCase = directOk && (want === 'reject' ? rj && rj.rows[0].reasons[0].startsWith('On_Hand_Qty: ' + why) && r.dataset.stock.length === 0 && !codes(r).some(c => /^CURRENCY_(FOREIGN|PROHIBITED)/.test(c))
      : r.dataset.stock && r.dataset.stock[0].On_Hand_Qty === want);
    if (!okCase) qWrong.push(JSON.stringify(v));
  }
  ok(qWrong.length === 0, `quantity regression: ${QTY.length} values in a quantity field — never treated by the money rules; currency values rejected (Part B: "£5" no longer stored as 5); the unchanged cleaner called directly gives its Stage 1 result` + (qWrong.length ? ' — ' + qWrong.join(', ') : ''));
  // file fixtures
  const f25 = fault('F25-currency-gbp-codes'), base = canonFolder(path.join(FAULTS, 'base'));
  ok(f25.importAccepted && f25.permissions.financial.status === 'allowed' && eq(f25.dataset.stock.map(x => x.Unit_Cost), base.stock.map(x => x.Unit_Cost)) && !codes(f25).includes('FIELD_BLANKED'),
    'F25: "GBP 46.1", "46.1 GBP", "46.1GBP", "gbp …", "… £" in a GBP file → read as the original numbers; financial allowed');
  const f26 = fault('F26-currency-code-after');
  ok(f26.permissions.financial.status === 'withheld' && byCode(f26, 'CURRENCY_FOREIGN_VALUE')[0].mixed === true && f26.dataset.stock.every(x => x.Unit_Cost === null) && eq(f26.dataset.stock.map(x => x.On_Hand_Qty), base.stock.map(x => x.On_Hand_Qty)) && f26.importAccepted,
    'F26 (the D1 defect): "46.1 USD" in a GBP-confirmed file → mixed currency, the whole file\'s money values withheld; quantities intact; import accepted');
  const f27 = fault('F27-currency-ordinary-text');
  ok(f27.permissions.financial.status === 'allowed' && !codes(f27).includes('CURRENCY_FOREIGN_VALUE') && eq(byCode(f27, 'FIELD_BLANKED')[0].rows.map(x => x.value), ['46.1 apples', 'BOX 12', '46p']) && byCode(f27, 'FIELD_BLANKED')[0].rows.every(x => !/currency/.test(x.reason)),
    'F27: "46.1 apples", "BOX 12", "46p" → blanked (Please check, reason "text attached"), not foreign; financial allowed; no pence conversion');
  const f28 = fault('F28-currency-separate-files');
  ok(f28.permissions.financial.status === 'withheld' && eq(f28.permissions.financial.withheldFields, ['items.Standard_Cost', 'items.Selling_Price']) && f28.dataset.items.every(x => x.Standard_Cost === null) &&
    eq(f28.dataset.stock.map(x => x.Unit_Cost), base.stock.map(x => x.Unit_Cost)) && byCode(f28, 'CURRENCY_FOREIGN_VALUE').every(i => i.file === 'items.csv'),
    'F28: "EUR …" in items.csv only → only items.csv money values withheld; stock and PO files keep theirs (confirmations stay per file); financial analysis withheld overall');
  const f29 = fault('F29-currency-contradictory');
  ok(f29.permissions.financial.status === 'withheld' && eq(byCode(f29, 'CURRENCY_FOREIGN_VALUE')[0].rows.map(x => x.indicators), [['£', 'USD'], ['GBP', 'USD']]), 'F29: "£… USD" and "GBP … USD" → contradictory indicators treated as foreign');
}

// ===================== S12A: pre-Stage 2 correction Part A — code classification (owner, 14 Nov 2026) =====================
// One table (CODE_CLASS) classifies every recognised ISO 4217 code. Recognising a code is not permission to use its values:
// only GBP, declared and confirmed for the file, reaches financial analysis. The 16 codes that are not currency amounts (funds, precious
// metals, XTS testing, XXX no currency) are prohibited in money fields: Must fix, financial scope, the file's money values withheld.
console.log('\n--- S12A Part A: currency and non-currency code classification');
{
  // The 178 current codes of the official SIX List One, Pblshd 2026-09-17 (list-one.xml, 47,491 bytes,
  // SHA-256 33139b438657d1cee116ba737807ea71d19d6de4b90f799a09c56f0cc6a1b0ff; kept outside the repository; record F-2).
  const LIST_ONE = ('AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD CAD CDF CHE CHF CHW ' +
    'CLF CLP CNY COP COU CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL ' +
    'HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA ' +
    'MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD ' +
    'RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD ' +
    'USN UYI UYU UYW UZS VED VES VND VUV WST XAD XAF XAG XAU XBA XBB XBC XBD XCD XCG XDR XOF XPD XPF XPT XSU XTS XUA XXX ' +
    'YER ZAR ZMW ZWG').split(' ');
  // Withdrawn codes approved by the owner; each is in the official SIX List Three (Pblshd 2026-01-01) and none is in List One.
  const WITHDRAWN = ['ANG', 'BGN', 'CUC', 'HRK', 'SLL', 'ZWL'];
  const WANT_PROHIBITED = { BOV: 'fund', CHE: 'fund', CHW: 'fund', CLF: 'fund', COU: 'fund', MXV: 'fund', USN: 'fund', UYI: 'fund', UYW: 'fund', XAD: 'fund',
    XAG: 'metal', XAU: 'metal', XPD: 'metal', XPT: 'metal', XTS: 'testing', XXX: 'no_currency' };
  const LABEL = { fund: 'fund code', metal: 'precious metal code', testing: 'testing code', no_currency: 'no-currency code' };
  const CC = V.CODE_CLASS, keys = Object.keys(CC).sort();
  const count = k => keys.filter(c => CC[c] === k).length;
  ok(LIST_ONE.length === 178 && new Set(LIST_ONE).size === 178 && keys.length === 184 && eq(keys, LIST_ONE.concat(WITHDRAWN).sort()) &&
    LIST_ONE.every(c => CC[c] !== 'withdrawn') && WITHDRAWN.every(c => CC[c] === 'withdrawn'),
    'CODE_CLASS covers exactly the 178 codes of official SIX List One 2026-09-17 plus the 6 approved withdrawn codes (184), each exactly once');
  ok(count('gbp') === 1 && CC.GBP === 'gbp' && count('ordinary') === 161 && count('withdrawn') === 6 && count('fund') === 10 && count('metal') === 4 &&
    count('testing') === 1 && count('no_currency') === 1 && eq([...new Set(keys.map(c => CC[c]))].sort(), ['fund', 'gbp', 'metal', 'no_currency', 'ordinary', 'testing', 'withdrawn']),
    'classification counts: GBP 1, ordinary 161, withdrawn 6, fund 10, precious metal 4, testing 1 (XTS), no currency 1 (XXX)');
  ok(eq(V.PROHIBITED_CODES, WANT_PROHIBITED) && Object.keys(V.PROHIBITED_CODES).length === 16 &&
    eq(V.CURRENCY_CODES, keys.filter(c => !WANT_PROHIBITED[c])) && V.CURRENCY_CODES.length === 168,
    'derived lists: PROHIBITED_CODES = the 16 expected codes with their kinds; CURRENCY_CODES = the other 168, derived from the same table');
  ok(crypto.createHash('sha256').update(keys.map(c => c + ':' + CC[c]).join(' ')).digest('hex') === 'd8fc96b70a2dde8611b77e5300e2fc2ced5fe4d77dcc449e351178e2bb6be284' &&
    crypto.createHash('sha256').update(Object.entries(V.PROHIBITED_CODES).map(([c, k]) => c + ':' + k).join(' ')).digest('hex') === '2ac4c42b856493b3a79a9d440f94ea486e5a830f68800cebcd1c304790262cc0',
    'CODE_CLASS and PROHIBITED_CODES pinned by SHA-256 (any reclassification must be deliberate and recorded)');
  ok(Object.isFrozen(CC) && Object.isFrozen(V.PROHIBITED_CODES) && Object.isFrozen(V.CURRENCY_CODES) && Object.getPrototypeOf(CC) === null && CC.constructor === undefined,
    'the table and both derived lists are frozen; the table has no inherited keys');
  // duplicate and malformed entries stop the module from loading (checked by loading altered source text into a fresh context)
  const src = fs.readFileSync(path.join(APP, 'js', 'import', 'validate.js'), 'utf8');
  const loadAltered = (from, to) => {
    const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(APP, 'assets', 'xlsx.mini.min.js'), 'utf8'), ctx);
    for (const f of ['canonical', 'read', 'clean', 'mapping']) vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'import', f + '.js'), 'utf8'), ctx);
    if (!src.includes(from)) return 'source text not found';
    try { vm.runInContext(src.replace(from, to), ctx); return 'loaded'; } catch (e) { return e.message; }
  };
  const dup = loadAltered("codes: 'XTS' })", "codes: 'XTS XAU' })"), dup2 = loadAltered("codes: 'XTS' })", "codes: 'XTS XTS' })"), bad = loadAltered("codes: 'XTS' })", "codes: 'XTS xau' })");
  ok(/XAU is classified twice \(metal and testing\)/.test(dup) && /XTS is classified twice/.test(dup2) && /malformed currency code "xau"/.test(bad),
    'a code listed twice (in two kinds or the same kind) or not written as three capitals stops validate.js loading — duplicates cannot slip in' + ` (${dup}; ${bad})`);
  // classifyCode: capitals only, except GBP/EUR/USD in any case
  const cls = { GBP: 'gbp', gbp: 'gbp', Eur: 'ordinary', usd: 'ordinary', USD: 'ordinary', JPY: 'ordinary', jpy: null, ANG: 'withdrawn', ang: null, XAD: 'fund', xad: null, Xad: null,
    BOV: 'fund', XAU: 'metal', xau: null, XTS: 'testing', XXX: 'no_currency', xxx: null, XDR: 'ordinary', ABC: null, ALL: 'ordinary', all: null, GBPX: null, GB: null, '': null };
  const clsWrong = Object.entries(cls).filter(([w, k]) => V.classifyCode(w) !== k).map(([w]) => w + '→' + V.classifyCode(w));
  ok(clsWrong.length === 0 && V.classifyCode(null) === null && V.classifyCode(undefined) === null && V.classifyCode(123) === null,
    `classifyCode(): ${Object.keys(cls).length} words, capitals rule kept ("xau", "xxx", "all" are ordinary words; "gbp", "Eur", "usd" count)` + (clsWrong.length ? ' — ' + clsWrong.join(', ') : ''));

  // the journey for one money value in a GBP-confirmed items file (same mapping as S12)
  const q = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const mapping = (cur) => ({ format: 'CG-IMPORT-MAPPING', version: 1, name: 'Part A journey', files: { 'items.csv': { dateFormat: 'ISO', ...(cur === undefined ? { currency: { code: 'GBP', confirmed: true } } : cur ? { currency: cur } : {}) }, 'stock.csv': { dateFormat: 'ISO' } },
    tables: { items: { sources: [{ file: 'items.csv', columns: { Item_ID: { source: 'Item_ID' }, Item_Name: { source: 'Item_Name' }, Is_Sold: { source: 'Is_Sold' }, Replenishment: { source: 'Replenishment' }, Standard_Cost: { source: 'Standard_Cost' } } }] },
      stock: { sources: [{ file: 'stock.csv', columns: { Item_ID: { source: 'Item_ID' }, Snapshot_Date: { source: 'Snapshot_Date' }, On_Hand_Qty: { source: 'On_Hand_Qty' } } }] } },
    dataset: { Snapshot_Date: '2026-10-31' } });
  const journey = (vals, cur) => V.importFiles(mapping(cur), [{ name: 'items.csv', text: 'Item_ID,Item_Name,Is_Sold,Replenishment,Standard_Cost\n' + vals.map((v, i) => 'A' + (i + 1) + ',Widget,Y,Buy,' + q(v)).join('\n') + '\n' },
    { name: 'stock.csv', text: 'Item_ID,Snapshot_Date,On_Hand_Qty\n' + vals.map((v, i) => 'A' + (i + 1) + ',2026-10-31,7').join('\n') + '\n' }]);
  const costs = r => r.dataset.items.map(x => x.Standard_Cost);

  // every prohibited code, before and after the number: Must fix (financial), withheld, never stored, import accepted, quantities intact
  const pWrong = [];
  for (const [code, kind] of Object.entries(WANT_PROHIBITED)) for (const v of [code + ' 5', '5 ' + code, code + '5.00']) {
    const mc = V.moneyCurrency(v), r = journey([v]), pi = byCode(r, 'CURRENCY_PROHIBITED_CODE');
    const good = mc.currency === 'prohibited' && eq(mc.prohibited, [{ code, kind }]) && pi.length === 1 && pi[0].category === 'Must fix' && pi[0].scope === 'financial' &&
      pi[0].message.includes(code + ': ' + LABEL[kind]) && pi[0].rows.length === 1 && pi[0].rows[0].value === v && pi[0].rows[0].reason.includes(code + ': ' + LABEL[kind]) &&
      r.permissions.financial.status === 'withheld' && eq(costs(r), [null]) && r.importAccepted === true && r.dataset.stock[0].On_Hand_Qty === 7 &&
      !codes(r).includes('CURRENCY_FOREIGN_VALUE') && !codes(r).includes('FIELD_BLANKED') && !codes(r).includes('CURRENCY_CONFIRMED');
    if (!good) pWrong.push(JSON.stringify(v));
  }
  ok(pWrong.length === 0, `all 16 prohibited codes × 3 forms (48 values): "not a currency amount" Must fix (financial), reason names the code and its kind, file money withheld, value never stored, import accepted, quantities intact` + (pWrong.length ? ' — ' + pWrong.slice(0, 6).join('; ') : ''));
  // XAD: at least its Stage 1 protection (Stage 1: CURRENCY_FOREIGN_VALUE, Must fix, financial scope, money withheld)
  const xad = journey(['XAD 46.10']), xi = byCode(xad, 'CURRENCY_PROHIBITED_CODE')[0];
  ok(xi && xi.category === 'Must fix' && xi.scope === 'financial' && xad.permissions.financial.status === 'withheld' && xad.dataset.items[0].Standard_Cost === null &&
    xi.message === 'items.csv: 1 money value carries a code that is not a currency amount (XAD: fund code). Such values cannot be used as money, so this file\'s money values are withheld from financial analysis. Correct the values and import again.' &&
    V.cleanMoney(C.field('items', 'Standard_Cost'), 'XAD 46.10').reason === 'not a currency amount (XAD: fund code): withheld, never used as money',
    'XAD keeps (at least) its Stage 1 protection — Must fix, financial scope, money withheld, nothing stored — now explained as a fund code (exact file and row messages)');
  // several codes in one value, and codes with GBP or foreign indicators: prohibited wins; every code is named
  const multi = [['£5 XAD', ['XAD: fund code'], ['£']], ['XAD 5 GBP', ['XAD: fund code'], ['GBP']], ['EUR 5 XAU', ['XAU: precious metal code'], ['EUR']],
    ['XAU XAG 5', ['XAU: precious metal code', 'XAG: precious metal code'], []], ['USD 5 XTS', ['XTS: testing code'], ['USD']], ['$5 XXX', ['XXX: no-currency code'], ['$']],
    ['€5 BOV XAU', ['BOV: fund code', 'XAU: precious metal code'], ['€']]];
  const mWrong = multi.filter(([v, named, also]) => {
    const r = journey([v]), pi = byCode(r, 'CURRENCY_PROHIBITED_CODE')[0], reason = V.cleanMoney(C.field('items', 'Standard_Cost'), v).reason;
    return !(V.moneyCurrency(v).currency === 'prohibited' && pi && named.every(n => pi.message.includes(n) && reason.includes(n)) && also.every(a => pi.message.includes('also contain ' + a) && reason.includes('also ' + a)) &&
      !codes(r).includes('CURRENCY_FOREIGN_VALUE') && r.permissions.financial.status === 'withheld' && eq(costs(r), [null]));
  }).map(([v]) => v);
  ok(mWrong.length === 0, `${multi.length} values with several indicators (prohibited + £/GBP/EUR/USD/$/€, two prohibited codes): classified prohibited; the file message and the row reason name every code` + (mWrong.length ? ' — ' + mWrong.join(', ') : ''));
  // one file mixing prohibited, foreign and plain values: both Must fix issues; prohibited values are not counted as £/plain values
  const mix = journey(['XAD 5', 'EUR 5', '7', '£8']), mf = byCode(mix, 'CURRENCY_FOREIGN_VALUE')[0], mp = byCode(mix, 'CURRENCY_PROHIBITED_CODE')[0];
  ok(mf && mp && mf.category === 'Must fix' && mp.category === 'Must fix' && eq(mp.rows.map(x => x.value), ['XAD 5']) && eq(mf.rows.map(x => x.value), ['EUR 5']) &&
    /alongside 2 £\/plain values/.test(mf.message) && eq(costs(mix), [null, null, null, null]) && mix.permissions.financial.status === 'withheld' &&
    eq(mix.permissions.financial.reasons, ['items.csv: codes that are not currency amounts, foreign currency values']) && mix.importAccepted === true,
    'a file with "XAD 5", "EUR 5", "7", "£8": prohibited and foreign Must fix both reported; every money value in that file withheld (the plain 7 and £8 too); import accepted');
  // the primary currencies in their supported forms: GBP read; USD and EUR recognised but never read as GBP
  const gbpForms = [['£5', 5], ['GBP 5', 5], ['5 GBP', 5], ['gbp 5', 5], ['5GBP', 5], ['£1,234.56', 1234.56], ['GBP 1,234.56', 1234.56], ['5 £', 5], ['GBP £5', 5]];
  const usdForms = ['$5', 'USD 5', '5 USD', 'usd 5', 'Usd 5', '5USD', 'US$5', '$1,234.56', 'USD 1,234.56'];
  const eurForms = ['€5', 'EUR 5', '5 EUR', 'eur 5', 'Eur 5', '5€', '5EUR', '€1.234,56', 'EUR 1,234.56'];
  const gWrong = gbpForms.filter(([v, n]) => { const r = journey([v]); return !(V.moneyCurrency(v).currency === 'GBP' && r.dataset.items[0].Standard_Cost === n && r.permissions.financial.status === 'allowed'); }).map(([v]) => v);
  const fWrong = usdForms.concat(eurForms).filter(v => { const r = journey([v]); return !(V.moneyCurrency(v).currency === 'foreign' && byCode(r, 'CURRENCY_FOREIGN_VALUE').length === 1 && eq(costs(r), [null]) && r.permissions.financial.status === 'withheld'); });
  ok(gWrong.length === 0 && fWrong.length === 0, `primary currencies: ${gbpForms.length} GBP forms read as GBP in a GBP-confirmed file; ${usdForms.length} USD and ${eurForms.length} EUR forms recognised as foreign, withheld and never read as GBP` + (gWrong.concat(fWrong).length ? ' — ' + gWrong.concat(fWrong).join(', ') : ''));
  // "$" alone is ambiguous: it never means USD (or GBP); a USD declaration does not make dollar values usable
  const dl = V.moneyCurrency('$5'), cad = V.moneyCurrency('C$5'), usdDecl = journey(['$5', '5'], { code: 'USD', confirmed: true });
  ok(dl.currency === 'foreign' && eq(dl.indicators, ['$']) && eq(cad.indicators, ['C$']) && !dl.indicators.includes('USD') &&
    codes(usdDecl).includes('CURRENCY_UNSUPPORTED') && byCode(usdDecl, 'CURRENCY_FOREIGN_VALUE').length === 1 && eq(costs(usdDecl), [null, null]) && usdDecl.permissions.financial.status === 'withheld',
    '"$5" is recorded as "$" only (never inferred as USD or GBP; "C$5" stays "C$"); a file declared and confirmed as USD is still unsupported — no value is used, nothing is converted');
  // unknown codes: never GBP, never stored; they stay Please check (FIELD_BLANKED), as approved
  const unknown = ['ABC 5', '5 ABC', '£5 ABC', 'ABC 5 GBP', 'GBP 5 ABC', 'ABC£5', '5ABC', 'GBP ABC 5', 'xau 5', 'Xad 5'];
  const uWrong = unknown.filter(v => { const r = journey([v]); const b = byCode(r, 'FIELD_BLANKED')[0];
    return !(eq(costs(r), [null]) && b && b.category === 'Please check' && b.rows[0].value === v && !codes(r).includes('CURRENCY_PROHIBITED_CODE') && !codes(r).includes('CURRENCY_FOREIGN_VALUE') && r.importAccepted === true); });
  ok(uWrong.length === 0, `unknown codes in ${unknown.length} positions and combinations (incl. with £/GBP, and lower-case "xau"/"Xad"): never stored, never read as GBP, blanked as Please check` + (uWrong.length ? ' — ' + uWrong.join(', ') : ''));
  // declarations still mandatory: an undeclared or unconfirmed file with a prohibited code reports both problems
  const und = journey(['XAD 5', '5'], null), unc = journey(['XAU 5', '5'], { code: 'GBP', confirmed: false });
  ok(codes(und).includes('CURRENCY_UNCONFIRMED') && codes(und).includes('CURRENCY_PROHIBITED_CODE') && eq(costs(und), [null, null]) &&
    codes(unc).includes('CURRENCY_UNCONFIRMED') && codes(unc).includes('CURRENCY_PROHIBITED_CODE') && eq(costs(unc), [null, null]) && und.permissions.financial.status === 'withheld' && unc.permissions.financial.status === 'withheld',
    'GBP declaration and confirmation still required: undeclared or unconfirmed files with a prohibited code report both problems; plain numbers are not used');
  // money fields in other tables (stock, supplier_items, po_lines, po_headers) use the same rule
  const stockMap = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'Part A stock', files: { 'items.csv': { dateFormat: 'ISO' }, 'stock.csv': { dateFormat: 'ISO', currency: { code: 'GBP', confirmed: true } } },
    tables: { items: { sources: [{ file: 'items.csv', columns: { Item_ID: { source: 'Item_ID' }, Item_Name: { source: 'Item_Name' }, Is_Sold: { source: 'Is_Sold' }, Replenishment: { source: 'Replenishment' } } }] },
      stock: { sources: [{ file: 'stock.csv', columns: { Item_ID: { source: 'Item_ID' }, Snapshot_Date: { source: 'Snapshot_Date' }, On_Hand_Qty: { source: 'On_Hand_Qty' }, Unit_Cost: { source: 'Unit_Cost' } } }] } },
    dataset: { Snapshot_Date: '2026-10-31' } };
  const st = V.importFiles(stockMap, [{ name: 'items.csv', text: 'Item_ID,Item_Name,Is_Sold,Replenishment\nA1,W,Y,Buy\nA2,V,Y,Buy\n' }, { name: 'stock.csv', text: 'Item_ID,Snapshot_Date,On_Hand_Qty,Unit_Cost\nA1,2026-10-31,7,XPT 9\nA2,2026-10-31,8,4\n' }]);
  ok(byCode(st, 'CURRENCY_PROHIBITED_CODE').length === 1 && byCode(st, 'CURRENCY_PROHIBITED_CODE')[0].file === 'stock.csv' && eq(st.dataset.stock.map(x => x.Unit_Cost), [null, null]) &&
    eq(st.dataset.stock.map(x => x.On_Hand_Qty), [7, 8]) && st.permissions.financial.status === 'withheld' && st.importAccepted === true,
    'stock Unit_Cost "XPT 9": the same rule in another table — stock.csv money withheld, quantities kept, import accepted');
}

// ===================== S12B: pre-Stage 2 correction Part B — currency values in quantity and lead-time fields (owner, 14 Nov 2026) ==========
// Defect: the unchanged number cleaner removes a leading £ from every number, so "£5" in a quantity was stored as 5. A detected currency
// value in any of the 21 non-money number fields is now invalid and follows that field's EXISTING rule (row rejected or value blanked).
// Expected outcomes below are written out independently per field (not read from canonical.js), and every case is also compared with an
// existing invalid value ("abc") in the same place: severities, partial-import results and permissions must be identical.
console.log('\n--- S12B Part B: currency values in quantity and lead-time fields');
{
  const QTY17 = ['items.Min_Order_Qty', 'items.Order_Multiple', 'stock.On_Hand_Qty', 'stock.Allocated_Qty', 'stock.On_Order_Qty', 'stock.Reorder_Point_Qty', 'stock.Safety_Stock_Qty',
    'demand.Units', 'demand.Forecast_Units', 'sales_lines.Ordered_Qty', 'sales_lines.Shipped_Qty', 'supplier_items.Min_Order_Qty', 'po_lines.Ordered_Qty', 'po_lines.Received_Qty',
    'bom.Qty_Per', 'production_orders.Planned_Qty', 'production_orders.Completed_Qty'];
  const DAYS4 = ['items.Purchase_Lead_Time_Days', 'items.Production_Lead_Time_Days', 'suppliers.Standard_Lead_Time_Days', 'supplier_items.Lead_Time_Days'];
  // existing consequence of an invalid value, per field (Stage 1 rules, unchanged by Part B)
  const MUST = ['stock.On_Hand_Qty', 'stock.Allocated_Qty', 'stock.On_Order_Qty', 'stock.Reorder_Point_Qty', 'stock.Safety_Stock_Qty', 'bom.Qty_Per']; // row rejected; Must fix; dataset blocked
  const HIST = ['demand.Units', 'sales_lines.Ordered_Qty', 'sales_lines.Shipped_Qty', 'po_lines.Ordered_Qty', 'po_lines.Received_Qty', 'production_orders.Planned_Qty', 'production_orders.Completed_Qty']; // row rejected; Please check
  const REQUIRED = ['stock.On_Hand_Qty', 'demand.Units', 'sales_lines.Ordered_Qty', 'po_lines.Ordered_Qty', 'bom.Qty_Per', 'production_orders.Planned_Qty'];
  const ALL21 = QTY17.concat(DAYS4), BLANK = ALL21.filter(f => !MUST.includes(f) && !HIST.includes(f)); // value blanked; Please check; row kept
  const nonMoney = []; for (const [t, def] of Object.entries(C.TABLES)) for (const f of def.fields) if (f.type === 'num' && !MP.moneyFields(t).includes(f.name)) nonMoney.push(t + '.' + f.name);
  ok(QTY17.length === 17 && DAYS4.length === 4 && eq(nonMoney.slice().sort(), ALL21.slice().sort()) && BLANK.length === 8 &&
    eq(ALL21.filter(f => C.field(f.split('.')[0], f.split('.')[1]).req).sort(), REQUIRED.slice().sort()),
    'field inventory: the schema has exactly 21 non-money number fields — 17 quantities and 4 lead times in days — and the 6 required ones are as expected (nothing omitted)');

  // a minimal 25-row dataset per table; row 1 of the table under test gets the value (1 row of 25 = 4%, below the 5% history threshold)
  const N = 25, IT = [...Array(N)].map((_, i) => 'A' + (i + 1));
  const BASE = {
    items: { h: ['Item_ID', 'Item_Name', 'Is_Sold', 'Replenishment', 'Purchase_Lead_Time_Days', 'Production_Lead_Time_Days', 'Min_Order_Qty', 'Order_Multiple'], row: i => [IT[i], 'W' + i, 'Y', 'Buy', '10', '11', '12', '13'] },
    stock: { h: ['Item_ID', 'Snapshot_Date', 'On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty', 'Reorder_Point_Qty', 'Safety_Stock_Qty'], row: i => [IT[i], '2026-10-31', '7', '0', '0', '2', '1'] },
    demand: { h: ['Item_ID', 'Period_Start', 'Units', 'Forecast_Units'], row: i => [IT[i], '2026-09-01', '3', '3'] },
    sales_lines: { h: ['SO_ID', 'Line_No', 'Item_ID', 'Order_Date', 'Ordered_Qty', 'Shipped_Qty'], row: i => ['SO' + i, '1', IT[i], '2026-09-05', '2', '2'] },
    suppliers: { h: ['Supplier_ID', 'Standard_Lead_Time_Days'], row: i => ['S' + i, '14'] },
    supplier_items: { h: ['Supplier_ID', 'Item_ID', 'Lead_Time_Days', 'Min_Order_Qty'], row: i => ['S' + i, IT[i], '14', '1'] },
    po_lines: { h: ['PO_ID', 'Line_No', 'Supplier_ID', 'Item_ID', 'Order_Date', 'Ordered_Qty', 'Received_Qty'], row: i => ['PO' + i, '1', 'S' + i, IT[i], '2026-09-05', '4', '4'] },
    bom: { h: ['Parent_Item_ID', 'Component_Item_ID', 'Qty_Per'], row: i => [IT[i], IT[(i + 1) % N], '2'] },
    production_orders: { h: ['Production_Order_ID', 'Item_ID', 'Planned_Qty', 'Completed_Qty'], row: i => ['MO' + i, IT[i], '10', '10'] } };
  const qv = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const runField = (tf, vals) => { // vals: values for the first rows of the table under test
    const [t, fn] = tf.split('.');
    const tabs = [...new Set(['items', 'stock'].concat(['supplier_items', 'po_lines'].includes(t) ? ['suppliers', t] : [t]))];
    const mapping = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'Part B', files: {}, tables: {}, dataset: { Snapshot_Date: '2026-10-31' } }, inputs = [];
    for (const tb of tabs) {
      const b = BASE[tb], file = tb + '.csv';
      mapping.files[file] = { dateFormat: 'ISO' };
      mapping.tables[tb] = { sources: [{ file, columns: Object.fromEntries(b.h.map(h => [h, { source: h }])) }] };
      const lines = [b.h.join(',')];
      for (let i = 0; i < N; i++) { const r = b.row(i); if (tb === t && i < vals.length) r[b.h.indexOf(fn)] = vals[i]; lines.push(r.map(qv).join(',')); }
      inputs.push({ name: file, text: lines.join('\n') + '\n' });
    }
    return V.importFiles(mapping, inputs);
  };
  // outcome of the test value in row 1: what was stored, and how it was reported
  const outcome = (tf, r, n) => {
    const [t, fn] = tf.split('.'), rows = r.dataset[t] || [];
    const rj = byCode(r, 'ROW_REJECTED').find(i => i.table === t), bl = byCode(r, 'FIELD_BLANKED').find(i => i.table === t && i.field === fn);
    const rejectedRow = rj && rj.rows.find(x => x.row === 2);
    return { kept: rows.length, stored: rows.length === N ? rows[0][fn] : undefined, values: rows.map(x => x[fn]),
      rejected: !!rejectedRow, rejectReason: rejectedRow ? (rejectedRow.reasons.find(s => s.startsWith(fn + ':')) || '').slice(fn.length + 2) : null, rejectCat: rj ? rj.category : null,
      blanked: !!(bl && bl.rows.some(x => x.row === 2)), blankReason: bl ? (bl.rows.find(x => x.row === 2) || {}).reason : null, blankCat: bl ? bl.category : null,
      dataset: r.permissions.dataset.status, analyses: JSON.stringify(r.permissions.analyses), accepted: r.importAccepted,
      shape: JSON.stringify(r.issues.map(i => [i.code, i.category, i.scope, i.table || null, i.field || null])) };
  };
  const ending = tf => /_Days$/.test(tf) ? 'lead-time field: a currency amount cannot be used as a number of days' : 'quantity field: a currency amount cannot be used as a quantity';
  // currency values: £ (with spaces, after, twice, alone, zero, middle, negative, brackets, separators), GBP, EUR, USD, $, € and other codes
  const CUR = [['£5', '£'], ['£5.50', '£'], ['£ 5', '£'], ['5£', '£'], ['5 £', '£'], ['£5 £5', '£'], ['£', '£'], ['GBP', 'GBP'], ['£0', '£'], ['£0.00', '£'], ['5 £ 5', '£'],
    ['5£5', '£'], ['-£5', '£'], ['(£5)', '£'], ['£1,234', '£'], ['£-5', '£'], ['GBP 5', 'GBP'], ['5 GBP', 'GBP'], ['gbp 5', 'gbp'], ['GBP5', 'GBP'], ['5GBP', 'GBP'],
    ['EUR 5', 'EUR'], ['5 EUR', 'EUR'], ['€5', '€'], ['5€', '€'], ['eur 5', 'eur'], ['5 € 5', '€'], ['USD 5', 'USD'], ['5 USD', 'USD'], ['$5', '$'], ['US$5', 'US$'],
    ['usd 5', 'usd'], ['ANG 5', 'ANG'], ['CHF 5', 'CHF'], ['XAD 5', 'XAD'], ['XAU 5', 'XAU'], ['XTS 5', 'XTS'], ['XXX 5', 'XXX'], ['£5 USD', '£, USD']];
  const baseline = {}; for (const tf of ALL21) baseline[tf] = outcome(tf, runField(tf, ['abc']));
  for (const tf of ALL21) {
    const bad = [], base = baseline[tf];
    const cls = MUST.includes(tf) ? 'must' : HIST.includes(tf) ? 'hist' : 'blank';
    const clsOk = cls === 'must' ? base.rejected && base.rejectCat === 'Must fix' && base.dataset === 'blocked' : cls === 'hist' ? base.rejected && base.rejectCat === 'Please check' && base.dataset !== 'blocked'
      : base.blanked && base.blankCat === 'Please check' && base.stored === null;
    if (!clsOk) bad.push('existing rule for "abc" is not ' + cls);
    for (const [v, ind] of CUR) {
      const o = outcome(tf, runField(tf, [v]));
      const want = 'money value (' + ind + ') in a ' + ending(tf);
      // 1. never stored: the row is gone, or the value is null; no accepted row holds the value
      const neverStored = cls === 'blank' ? o.kept === N && o.stored === null : o.kept === N - 1 && o.stored === undefined;
      // 2. reported with the money reason, under the field's existing rule
      const reported = cls === 'blank' ? o.blanked && o.blankReason === want && o.blankCat === 'Please check' && !o.rejected : o.rejected && o.rejectReason === want && o.rejectCat === (cls === 'must' ? 'Must fix' : 'Please check') && !o.blanked;
      // 3. the same consequences as an existing invalid value in the same place (issues, severities, scopes, permissions, acceptance)
      const same = o.shape === base.shape && o.dataset === base.dataset && o.analyses === base.analyses && o.accepted === base.accepted && o.kept === base.kept;
      if (!neverStored || !reported || !same) bad.push(JSON.stringify(v) + (neverStored ? '' : ' STORED ' + JSON.stringify(o.stored)) + (reported ? '' : ' reason "' + (o.rejectReason || o.blankReason) + '"') + (same ? '' : ' consequences differ'));
    }
    ok(bad.length === 0, `${tf} (${REQUIRED.includes(tf) ? 'required' : 'optional'}; ${cls === 'must' ? 'row rejected, Must fix' : cls === 'hist' ? 'history row rejected, Please check' : 'value blanked, Please check'}): ${CUR.length} currency values never stored, reported with the ${/_Days$/.test(tf) ? 'number-of-days' : 'quantity'} reason, consequences identical to an existing invalid value` + (bad.length ? ' — ' + bad.slice(0, 5).join('; ') : ''));
  }
  // values that are NOT currency values keep exactly the unchanged cleaner's result in every field (stored value, or reason)
  const PLAIN = ['7', '0', '5.5', '1,234', '(5)', '-5', ' 8 ', '12 units', '5 units', '5 Ft', '5 kr', '5 RM', '5 Rs', 'ABC 5', 'abc', 'n/a', 'TBC', '5 box', 'xau 5', 'cup 5', '46p', '1.200,50'];
  const pWrong = [];
  for (const tf of ALL21) for (const v of PLAIN) {
    const [t, fn] = tf.split('.'), direct = CL.cleanValue(C.field(t, fn), v), o = outcome(tf, runField(tf, [v]));
    const good = (direct.status === 'ok' || direct.status === 'cleaned') ? o.kept === N && o.stored === direct.value && !o.rejected && !o.blanked
      : direct.status === 'invalid' && (o.rejectReason === direct.reason || o.blankReason === direct.reason) && !/money value/.test(o.rejectReason || o.blankReason || '');
    if (!good) pWrong.push(tf + ' ' + JSON.stringify(v));
  }
  ok(pWrong.length === 0, `${PLAIN.length} non-currency values (plain, zero, decimal, separators, brackets, negative, units, "5 Ft", "5 kr", "5 RM", "ABC 5", "xau 5") × 21 fields: exactly the unchanged cleaner's result — stored value or existing reason; never the money message` + (pWrong.length ? ' — ' + pWrong.slice(0, 6).join('; ') : ''));
  // history partial-import thresholds unchanged: 2 rows of 25 (8%) behave exactly like 2 existing invalid values
  const tWrong = HIST.filter(tf => { const a = outcome(tf, runField(tf, ['£5', '£6'])), b = outcome(tf, runField(tf, ['abc', 'abc'])); return !(a.shape === b.shape && a.analyses === b.analyses && a.dataset === b.dataset && a.kept === N - 2); });
  ok(tWrong.length === 0, `history tables above the 5% threshold (2 of 25 rows): "£5" rows give exactly the same analysis permissions and issues as existing invalid rows in all ${HIST.length} history quantities` + (tWrong.length ? ' — ' + tWrong.join(', ') : ''));
  // no currency value reaches accepted data anywhere: every numeric value stored in the 21 fields equals a base value
  const leak = [];
  for (const tf of ALL21) { const [t, fn] = tf.split('.'), r = runField(tf, CUR.slice(0, 20).map(x => x[0])); const baseVal = Number(BASE[t].row(24)[BASE[t].h.indexOf(fn)]);
    (r.dataset[t] || []).forEach(x => { if (x[fn] !== null && x[fn] !== baseVal) leak.push(tf + '=' + x[fn]); }); }
  ok(leak.length === 0, '20 currency values in one table at once (80% of rows), in each of the 21 fields: no currency value is stored as a number in any accepted row' + (leak.length ? ' — ' + leak.slice(0, 6).join(', ') : ''));
  // the unchanged cleaner still reads "£5.50" as 5.5 when called directly (Stage 1 rule; Part B never calls it for currency values)
  ok(CL.cleanValue(C.field('stock', 'On_Hand_Qty'), '£5.50').value === 5.5 && CL.cleanNumber('£5.50').value === 5.5 && CL.cleanNumber('£1,234').value === 1234 &&
    CL.cleanValue(C.field('items', 'Purchase_Lead_Time_Days'), '£5').value === 5, 'clean.js is unchanged: called directly, "£5.50" → 5.5, "£1,234" → 1234, lead time "£5" → 5 (only validate.js stops these)');
  // exact messages as the user sees them: required master quantity, optional quantity, history quantity, lead time
  const e1 = runField('stock.On_Hand_Qty', ['£5']), e2 = runField('items.Min_Order_Qty', ['£5']), e3 = runField('demand.Units', ['£5']), e4 = runField('items.Purchase_Lead_Time_Days', ['£5']);
  const r1 = byCode(e1, 'ROW_REJECTED').find(i => i.table === 'stock'), b2 = byCode(e2, 'FIELD_BLANKED').find(i => i.field === 'Min_Order_Qty'), r3 = byCode(e3, 'ROW_REJECTED').find(i => i.table === 'demand'), b4 = byCode(e4, 'FIELD_BLANKED').find(i => i.field === 'Purchase_Lead_Time_Days');
  ok(r1 && eq(r1.rows[0].reasons, ['On_Hand_Qty: money value (£) in a quantity field: a currency amount cannot be used as a quantity']) && r1.category === 'Must fix' && e1.dataset.stock.length === N - 1 && !e1.dataset.stock.some(x => x.Item_ID === 'A1') &&
    b2 && b2.rows[0].reason === 'money value (£) in a quantity field: a currency amount cannot be used as a quantity' && b2.rows[0].value === '£5' && e2.dataset.items[0].Min_Order_Qty === null &&
    r3 && r3.category === 'Please check' && eq(r3.rows[0].reasons, ['Units: money value (£) in a quantity field: a currency amount cannot be used as a quantity']) && !e3.dataset.demand.some(x => x.Item_ID === 'A1') &&
    b4 && b4.rows[0].reason === 'money value (£) in a lead-time field: a currency amount cannot be used as a number of days' && e4.dataset.items[0].Purchase_Lead_Time_Days === null,
    '"£5": stock On_Hand_Qty row rejected (Must fix), items Min_Order_Qty blanked, demand Units history row rejected (Please check), Purchase_Lead_Time_Days blanked — exact reasons; never stored as 5');
}

// ===================== S13: Q2/Q13 suggested links and Q3 Option A =====================
console.log('\n--- S13 Q2/Q13 suggested item links; Q3 Option A analysis blocking');
{
  const f30 = fault('F30-history-suggested-code');
  const rj = byCode(f30, 'ROW_REJECTED').find(i => i.table === 'demand'), linked = rj.rows.filter(x => x.linkedItem);
  ok(linked.length === 3 && linked.every(x => x.item === 'P-0001' && x.linkedItem === 'P0001' && /after ignoring dashes and spaces/.test(x.linkReason) && /not in the item list/.test(x.reasons[0])) && !f30.dataset.demand.some(x => x.Item_ID === 'P-0001'),
    'F30 (Q2): three rejected "P-0001" rows keep their original code and reason, are linked to P0001 (the only candidate), and are NOT imported');
  ok(/demand: 3 months of demand lost/.test(f30.permissions.items.P0001.blocked.demand) && V.reliabilityOf(f30, 'P0001', 'demand') === 'blocked' && /P-0001 → P0001 \(3 rows\)/.test(byCode(f30, 'HISTORY_SUGGESTED_LINK')[0].message),
    'F30 (Q2): the three months count against P0001, which is blocked (more than 1 month lost); the report shows "P-0001 → P0001 (3 rows)"');
  const q1 = rj.rows.find(x => x.item === 'Q1');
  ok(q1 && !q1.linkedItem && byCode(f30, 'HISTORY_UNATTRIBUTED')[0].count === 1 && !f30.permissions.items['Q-1'] && !f30.permissions.items['Q 1'], 'F30 (Q2): "Q1" has two candidates ("Q-1" and "Q 1") → not linked to either');
  {
    const P2 = path.join(LIB, '02-Messy-Manufacturer'), p2 = V.importFiles(readJSON(path.join(FX, 'mappings', 'package-02.mapping.json')), dirInputs(path.join(P2, 'source-export')));
    const s14 = byCode(p2, 'ROW_REJECTED').find(i => i.table === 'stock').rows.find(x => x.item === 'P-0014');
    ok(s14 && s14.suggest === 'P0014' && !s14.linkedItem && !p2.permissions.items.P0014 && !codes(p2).includes('HISTORY_SUGGESTED_LINK') && p2.permissions.dataset.status === 'blocked',
      'Q2 is for history tables only: Package 02 stock "P-0014" keeps only a suggestion (P0014), is not linked, and stock stays Must fix (master tables are never repaired)');
  }
  const f31 = fault('F31-history-unlinked-6pct'), f32 = fault('F32-history-unlinked-4pct'), f35 = fault('F35-history-unlinked-5pct-exact'), f36 = fault('F36-history-linked-6pct');
  const hb = r => byCode(r, 'HISTORY_ANALYSIS_BLOCKED')[0];
  ok(f35.completeness.demand.rejectedShare === 0.05 && f35.completeness.demand.unlinkedRejected === 6 && f35.permissions.analyses.demand === 'blocked' && hb(f35) && f35.importAccepted,
    'Q3: exactly 5.0% (6 of 120, all unlinked) → demand analysis "blocked"; the import is still accepted');
  ok(Math.abs(f31.completeness.demand.rejectedShare - 58 / 960) < 1e-12 && f31.permissions.analyses.demand === 'blocked' && hb(f31).category === 'Please check' && hb(f31).scope === 'analysis' && /cannot be known which items/.test(hb(f31).message) && f31.importAccepted && f31.permissions.dataset.status === 'allowed',
    'Q3: 6.04% unlinked → demand "blocked" with the reason in the report; import acceptance and the dataset permission are unaffected');
  ok(['P0005', 'P0025', 'P0040'].every(id => V.reliabilityOf(f31, id, 'demand') === 'blocked') && V.reliabilityOf(f31, 'P0005', 'purchasing') === 'available',
    'Q3 Option A (acknowledged limitation): clean items are blocked from demand too; other analyses (purchasing) stay available');
  ok(f32.completeness.demand.thresholdCrossed === false && f32.permissions.analyses.demand === 'available' && !hb(f32) && byCode(f32, 'HISTORY_UNATTRIBUTED')[0].count === 38, 'Q3: 3.96% unlinked → below the threshold, analysis not blocked (unlinked rows still reported)');
  ok(f36.completeness.demand.thresholdCrossed === true && f36.completeness.demand.unlinkedRejected === 0 && f36.permissions.analyses.demand === 'available' && !hb(f36) &&
    eq(blockedItems(f36, 'demand'), ['P0001', 'P0002', 'P0003']) && V.reliabilityOf(f36, 'P0005', 'demand') === 'available',
    'Q3/Q13: 6.04% rejected but every row linked through a single suggestion → counted as linked: the analysis stays available, the 3 affected items are blocked');
  ok(eq(V.THRESHOLDS, { tableShare: 0.05, itemMonthsAllowed: 1 }), 'thresholds unchanged by the correction pass (5% or more; more than 1 month)');
}

// ===================== S14: Q6 future-dated history and Q14 stock dates =====================
console.log('\n--- S14 Q6 future-dated history; Q14 stock date');
{
  const f33 = fault('F33-future-dated'), fd = byCode(f33, 'FUTURE_DATED')[0];
  ok(fd && fd.category === 'Please check' && eq(fd.rows.map(x => [x.row, x.item, x.date]), [[962, 'P0001', '2026-11-01'], [963, 'P0001', '2026-12-01'], [964, 'P0002', '2027-01-01'], [965, 'P0003', '2026-12-01']]) && fd.snapshot === '2026-10-31',
    'F33 (Q6): the 4 demand rows after the snapshot (2026-10-31) are listed with row, item and date');
  ok(f33.dataset.demand.length === 960 && !f33.dataset.demand.some(x => x.Period_Start > '2026-10-31') && f33.completeness.demand.rejected === 0 && f33.completeness.demand.futureExcluded === 4 && !codes(f33).includes('ROW_REJECTED') && f33.importAccepted,
    'F33 (Q6): future rows (incl. blank and unreadable quantities) are excluded before required-field checks — not rejected, not in the 5% share; all 960 historical rows kept');
  const m = readJSON(path.join(FAULTS, 'F33-future-dated', 'mapping.json')); delete m.dataset.Snapshot_Date;
  const files = new Map(dirInputs(path.join(FAULTS, 'base')).map(i => [i.name, i])); dirInputs(path.join(FAULTS, 'F33-future-dated')).forEach(i => files.set(i.name, i));
  const r = V.importFiles(m, [...files.values()].filter(f => new Set(Object.values(m.tables).map(t => t.sources[0].file)).has(f.name)));
  ok(codes(r).includes('SNAPSHOT_DATE_MISSING') && byCode(r, 'SNAPSHOT_DATE_MISSING')[0].category === 'Must fix' && codes(r).includes('FUTURE_CHECK_NOT_RUN') && !codes(r).includes('FUTURE_DATED') && !r.importAccepted,
    'Q6: with no snapshot date the existing Must fix stands and the report says the future-date check could not be run (the clock is never used)');
  const f34 = fault('F34-stock-date-mismatch'), sd = byCode(f34, 'STOCK_DATE_DIFFERS')[0];
  ok(sd && sd.category === 'Please check' && eq(sd.rows, [{ row: 2, item: 'P0001', date: '2026-10-30' }]) && f34.dataset.stock[0].Snapshot_Date === '2026-10-30' && f34.dataset.stock[0].On_Hand_Qty === 128 && f34.importAccepted && f34.completeness.stock.status === 'complete',
    'F34 (Q14): a stock row dated 2026-10-30 → Please check with the row and date; the row is kept with its own date and value; stock not rejected');
}

// ===================== S15: reliabilityOf() =====================
console.log('\n--- S15 reliabilityOf(result, item, analysis)');
{
  ok(typeof V.reliabilityOf === 'function' && Object.isFrozen(V) && eq(V.RELIABILITY, ['available', 'incomplete', 'caveated', 'blocked']), 'reliabilityOf is exported on CGImport.validate (frozen); order available → incomplete → caveated → blocked');
  const mk = (entry, extra) => { const r = { permissions: { dataset: { status: 'allowed' }, analyses: { demand: 'available', purchasing: 'available', production: 'unavailable', materials: 'unavailable' }, items: {} }, dataset: { items: [{ Item_ID: 'A' }, { Item_ID: 'B' }] } };
    if (entry !== undefined) r.permissions.items.A = entry; if (extra) extra(r); return r; };
  const R = (r, a, it) => V.reliabilityOf(r, it || 'A', a || 'demand');
  const CASES = [
    ['no entry', R(mk()), 'available'],
    ['incomplete', R(mk({ blocked: {}, incomplete: { demand: 'x' }, caveats: {} })), 'incomplete'],
    ['caveated', R(mk({ blocked: {}, incomplete: {}, caveats: { demand: 'based_on_possibly_duplicated_rows' } })), 'caveated'],
    ['blocked', R(mk({ blocked: { demand: 'x' }, incomplete: {}, caveats: {} })), 'blocked'],
    ['blocked.all', R(mk({ blocked: { all: 'unit mismatch' }, incomplete: {}, caveats: {} }), 'purchasing'), 'blocked'],
    ['caveat + incomplete → caveated', R(mk({ blocked: {}, incomplete: { demand: 'x' }, caveats: { demand: 'based_on_possibly_duplicated_rows' } })), 'caveated'],
    ['blocked + caveat + incomplete → blocked', R(mk({ blocked: { demand: 'x' }, incomplete: { demand: 'x' }, caveats: { demand: 'based_on_possibly_duplicated_rows' } })), 'blocked'],
    ['blocked analysis + item caveat → blocked', R(mk({ blocked: {}, incomplete: {}, caveats: { demand: 'based_on_possibly_duplicated_rows' } }, r => { r.permissions.analyses.demand = 'blocked'; })), 'blocked'],
    ['analysis stopped', R(mk(undefined, r => { r.permissions.analyses.demand = 'stopped'; })), 'blocked'],
    ['analysis unavailable', R(mk(), 'production'), 'blocked'],
    ['analysis status unknown', R(mk(undefined, r => { r.permissions.analyses.demand = 'mostly fine'; })), 'blocked'],
    ['analysis status missing', R(mk(undefined, r => { delete r.permissions.analyses.demand; })), 'blocked'],
    ['unknown analysis name', R(mk(), 'pricing'), 'blocked'],
    ['unknown caveat value', R(mk({ blocked: {}, incomplete: {}, caveats: { demand: 'something_new' } })), 'blocked'],
    ['unknown item key', R(mk({ blocked: {}, incomplete: {}, caveats: {}, reliability: 'good' })), 'blocked'],
    ['unknown analysis inside incomplete', R(mk({ blocked: {}, incomplete: { pricing: 'x' }, caveats: {} })), 'blocked'],
    ['entry not an object', R(mk('fine')), 'blocked'],
    ['caveats not an object', R(mk({ blocked: {}, incomplete: {}, caveats: 'based_on_possibly_duplicated_rows' })), 'blocked'],
    ['dataset blocked', R(mk(undefined, r => { r.permissions.dataset.status = 'blocked'; })), 'blocked'],
    ['item not imported', R(mk(), 'demand', 'Z'), 'blocked'],
    ['caveat on another analysis', R(mk({ blocked: {}, incomplete: {}, caveats: { purchasing: 'based_on_possibly_duplicated_rows' } })), 'available'],
    ['incomplete on another analysis', R(mk({ blocked: {}, incomplete: { purchasing: 'x' }, caveats: {} })), 'available'],
    ['no demand history (demand)', R(mk({ blocked: {}, incomplete: {}, caveats: {}, noDemandHistory: true })), 'incomplete'],
    ['no demand history (purchasing)', R(mk({ blocked: {}, incomplete: {}, caveats: {}, noDemandHistory: true }), 'purchasing'), 'available'],
    ['noDemandHistory not true', R(mk({ blocked: {}, incomplete: {}, caveats: {}, noDemandHistory: 'yes' })), 'blocked'],
    ['result null', V.reliabilityOf(null, 'A', 'demand'), 'blocked'],
    ['result {}', V.reliabilityOf({}, 'A', 'demand'), 'blocked'],
    ['permissions missing parts', V.reliabilityOf({ permissions: { dataset: { status: 'allowed' } } }, 'A', 'demand'), 'blocked'],
  ];
  const wrong = CASES.filter(([, got, want]) => got !== want).map(([n, got, want]) => n + ': ' + got + ' (expected ' + want + ')');
  ok(wrong.length === 0, `reliabilityOf: ${CASES.length} cases — the four statuses, conflicts (most conservative wins), missing, unknown and malformed (always blocked)` + (wrong.length ? ' — ' + wrong.join('; ') : ''));
  const f02 = fault('F02-demand-2pct'), f03 = fault('F03-demand-10pct'), f18 = fault('F18-unit-mismatch');
  ok(V.reliabilityOf(f02, incompleteItems(f02, 'demand')[0], 'demand') === 'incomplete' && V.reliabilityOf(f03, 'P0001', 'demand') === 'blocked' && V.reliabilityOf(f03, 'P0025', 'demand') === 'available' &&
    V.reliabilityOf(f18, 'P0001', 'purchasing') === 'blocked' && V.reliabilityOf(f18, 'P0002', 'purchasing') === 'available' && V.reliabilityOf(fault('F01-stock-bad-row'), 'P0001', 'demand') === 'blocked',
    'reliabilityOf on real results: incomplete (F02), blocked by threshold (F03), unaffected item available, unit mismatch blocks every analysis (F18), blocked dataset (F01)');
}

// ===================== S11: fixture provenance =====================
console.log('\n--- S11 fixtures are exactly the generator\'s output');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-import-v1-'));
  const g = cp.spawnSync(process.execPath, [path.join(__dirname, 'tools', 'import-v1', 'make-stage1-fixtures.js'), '--out', tmp], { encoding: 'utf8', env: process.env });
  const list = d => { const out = []; (function w(p) { for (const e of fs.readdirSync(p, { withFileTypes: true })) e.isDirectory() ? w(path.join(p, e.name)) : out.push(path.relative(d, path.join(p, e.name))); })(d); return out.sort(); };
  const h = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const gen = g.status === 0 ? list(tmp) : [], committed = list(FX).filter(p => p !== path.join('mappings', 'package-02.mapping.json'));
  const differ = gen.filter(p => !fs.existsSync(path.join(FX, p)) || h(path.join(tmp, p)) !== h(path.join(FX, p)));
  ok(g.status === 0 && eq(gen, committed) && differ.length === 0, `generator reproduces all ${gen.length} generated fixtures byte for byte in this time zone (package-02.mapping.json is hand-written)${differ.length ? ' — differ: ' + differ.slice(0, 3).join(', ') : ''}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const sums = fs.readFileSync(path.join(__dirname, 'checksums.txt'), 'utf8');
  const unprotected = list(FX).map(p => 'tests/fixtures/import-v1/' + p.split(path.sep).join('/')).concat(['tests/test-import-mapping.js', 'tests/tools/import-v1/make-stage1-fixtures.js']).filter(p => !sums.includes(' ' + p + '\n'));
  ok(unprotected.length === 0, `every Stage 1 fixture, the generator and this test are listed in checksums.txt (condition 3)${unprotected.length ? ' — missing: ' + unprotected.slice(0, 3).join(', ') : ''}`);
}

console.log(`\nimport-mapping: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
