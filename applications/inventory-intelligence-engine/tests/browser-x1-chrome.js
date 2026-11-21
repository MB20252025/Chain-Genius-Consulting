// X1 P1/WP4 real-browser test (21 Nov 2026): headless Chrome, desktop 1280x800 and Pixel 5 EMULATION (not a physical Android device).
// Evidence it produces, kept separate (owner, 21 Nov):
//   A. MRP crash containment: the analysis completes through the real file input when Allocated_Qty is blank, absent or invalid.
//   B. Browser availability of the X1 integrity record: window INTEG (app.js run) after a direct upload; for the import route, the
//      Universal Import pipeline + CGEngine.runEngine run INSIDE the page (a harness: the app has no import-upload screen).
//   C. Presentation: withheld MRP rows show "Not calculated" with the reason and no figures; the replenishment total says "partial"
//      when a value is missing; the integrity notice names the field; no tab shows NaN, Infinity, "Invalid Date" or "undefined";
//      unaffected materials show exactly what they show on clean data.
// Variants are CELL-LEVEL edits of Northstar (every other cell stays as supplied). No assertion here applies an owner decision D1–D7.
// Run: NODE_PATH=<node_modules with puppeteer-core, @sparticuz/chromium, xlsx> node browser-x1-chrome.js [screenshotDir]
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), XLSX = require('xlsx');
const ROOT = path.resolve(__dirname, '..'), BASE = '/chain-genius/applications/inventory-intelligence-engine/';
const NS = path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const SHOTS = process.argv.filter(a => !a.startsWith('--'))[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'x1-browser-'));
fs.mkdirSync(SHOTS, { recursive: true });
let ok = 0, bad = 0; const chk = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  >> ' + (d === undefined ? '' : typeof d === 'string' ? d : JSON.stringify(d).slice(0, 400)))); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); if (!u.startsWith(BASE)) { s.writeHead(404); return s.end('nf'); }
  let f = path.join(ROOT, u.slice(BASE.length) || 'index.html'); if (f.endsWith(path.sep)) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('nf'); }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });

// ---- variants: cell-level edits on the Inventory sheet
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'x1-variants-'));
function variant(name, edit) {
  const wb = XLSX.read(fs.readFileSync(NS), { cellStyles: true }), ws = wb.Sheets.Inventory, rg = XLSX.utils.decode_range(ws['!ref']);
  const col = h => { for (let c = rg.s.c; c <= rg.e.c; c++) { const x = ws[XLSX.utils.encode_cell({ r: 0, c })]; if (x && x.v === h) return c; } throw new Error('no column ' + h); };
  const row = id => { const c = col('Item_ID'); for (let r = 1; r <= rg.e.r; r++) { const x = ws[XLSX.utils.encode_cell({ r, c })]; if (x && x.v === id) return r; } throw new Error('no item ' + id); };
  const at = (id, h) => XLSX.utils.encode_cell({ r: row(id), c: col(h) });
  edit({ ws, rg, col, row, at, blank: (id, h) => { delete ws[at(id, h)]; }, set: (id, h, v) => { ws[at(id, h)] = typeof v === 'number' ? { t: 'n', v } : { t: 's', v }; },
    dropColumn: h => { const c = col(h); for (let r = 0; r <= rg.e.r; r++) delete ws[XLSX.utils.encode_cell({ r, c })]; } });
  const f = path.join(TMP, name + '.xlsx'); XLSX.writeFile(wb, f); return f;
}
// na: items expected to be Not Assessed in every view (risk status). withheld: MRP rows. Task 3 (21 Nov 2026): vocabulary "Not Assessed" (owner §6.3).
const V = {
  clean: { file: NS, withheld: [], report: [], na: [] },
  'blank-one': { file: variant('blank-one', v => v.blank('RM001', 'Allocated_Qty')), withheld: ['RM001'], report: ['Allocated_Qty'], na: ['RM001'] },
  'blank-several': { file: variant('blank-several', v => ['RM001', 'RM005', 'RM010'].forEach(id => v.blank(id, 'Allocated_Qty'))), withheld: ['RM001', 'RM005', 'RM010'], report: ['Allocated_Qty'], na: ['RM001', 'RM005', 'RM010'] },
  'column-absent': { file: variant('column-absent', v => v.dropColumn('Allocated_Qty')), withheld: 'all', report: ['Allocated_Qty'], na: 'all' },
  'invalid-mixed': { file: variant('invalid-mixed', v => { v.set('RM002', 'Allocated_Qty', 'abc'); v.set('RM003', 'Unit_Cost_GBP', 'n/a'); v.blank('RM004', 'On_Hand_Qty'); }), withheld: ['RM002', 'RM004'], report: ['On_Hand_Qty', 'Allocated_Qty', 'Unit_Cost_GBP'], partialCost: 'RM003', na: ['RM002', 'RM004'], noValue: ['RM003', 'RM004'] }
};
const BAD_TEXT = /\bNaN\b|\bInfinity\b|Invalid Date|\bundefined\b/;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + server.address().port + BASE;
  const m = require('@sparticuz/chromium'), chromium = m.default || m, puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: 'shell' });
  console.log('Browser:', await browser.version(), '| served at', URL, '| screenshots', SHOTS);
  for (const mode of ['desktop', 'mobile']) {
    console.log('\n===== ' + mode.toUpperCase() + (mode === 'mobile' ? ' (Pixel 5 EMULATION, not a physical device)' : ' (1280x800)') + ' =====');
    let cleanRows = null; const cleanView = {};
    for (const [name, spec] of Object.entries(V)) {
      const page = await browser.newPage(), errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 160))); page.on('console', x => { if (x.type() === 'error') errs.push('console: ' + x.text().slice(0, 160)); });
      if (mode === 'mobile') await page.emulate(puppeteer.KnownDevices['Pixel 5']); else await page.setViewport({ width: 1280, height: 800 });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      const tag = mode + ' ' + name + ': ';
      if (name === 'clean') chk(tag + 'the page loads js/validation/x1-integrity.js and exposes CGValidation (P1)', await page.evaluate(() => typeof CGValidation === 'object' && CGValidation.VERSION === 'X1-F1' && [...document.scripts].some(s => /validation\/x1-integrity\.js/.test(s.src))));
      await (await page.$('#f')).uploadFile(spec.file);
      await page.waitForFunction(() => /Analysed\.|Error/.test(document.querySelector('#st').textContent), { timeout: 30000 }).catch(() => {});
      const st = await page.$eval('#st', e => e.textContent);
      chk(tag + 'A: the upload completes ("Analysed."), no page error', st === 'Analysed.' && !errs.length, { st, errs });
      // B: the integrity record reached the browser application
      const ig = await page.evaluate(() => INTEG && { route: INTEG.route, status: INTEG.status, version: INTEG.version, report: INTEG.report.slice(), mrpHeld: INTEG.dependencies['mrp-net'].withheld.map(w => w.record), frozen: Object.isFrozen(INTEG), resultKey: 'integrity' in R });
      chk(tag + 'B: window INTEG holds the integrity record (direct route), outside R', ig && ig.route === 'direct' && ig.version === 'X1-F1' && ig.frozen && !ig.resultKey, ig);
      chk(tag + 'B: INTEG (app.js) and CGEngine.runEngine().integrity are identical: one builder, no second implementation (owner §6.2)', await page.evaluate(() => JSON.stringify(CGEngine.runEngine({}).integrity) === JSON.stringify(INTEG)));
      chk(tag + 'B: the record names exactly the affected fields', ig && spec.report.every(f => ig.report.some(l => l.startsWith(f + ':'))) && ig.report.length === spec.report.length, ig && ig.report);
      chk(tag + 'B: status ' + (spec.report.length ? 'inputs-not-all-valid' : 'inputs-valid') + '; never "Verified"', ig && ig.status === (spec.report.length ? 'inputs-not-all-valid' : 'inputs-valid') && !JSON.stringify(ig).includes('Verified'));
      // C: the MRP view
      await page.click('#nav button[data-t="MRP"]'); await page.waitForSelector('#v table');
      const mv = await page.evaluate(() => { const t = document.querySelector('#v table'), trs = [...t.querySelectorAll('tr')], hr = trs.filter(tr => tr.querySelector('th') && !tr.querySelector('td')), hd = [...hr[hr.length - 1].querySelectorAll('th')].map(h => h.textContent.trim());   // header rows are rows of th cells (no thead); the last one names the columns
        const rows = trs.filter(tr => tr.querySelector('td')).map(tr => [...tr.children].map(td => td.textContent.trim()));
        const note = document.querySelector('#v [data-x1="report"]'), cards = [...document.querySelectorAll('#v .k > div')].map(d => d.textContent.trim());
        const pe = document.querySelector('#v [data-x1="partial"]'), partialStyle = pe ? { display: getComputedStyle(pe).display, size: getComputedStyle(pe).fontSize, inCard: !!pe.closest('.k') } : null;
        return { partialStyle, hd, rows, note: note ? note.textContent : null, cards, text: document.querySelector('#v').innerText, more: !!document.querySelector('#v .more, #v button[data-more]') }; });
      const col = h => mv.hd.indexOf(h), byId = Object.fromEntries(mv.rows.map(r => [r[col('Material')], r]));
      const nAll = await page.evaluate(() => R.rm.length);   // the phone shows the first page (50) of the table; counts come from the cards
      const heldIds = spec.withheld === 'all' ? mv.rows.map(r => r[col('Material')]) : spec.withheld, nHeld = spec.withheld === 'all' ? nAll : heldIds.length;
      const held = mv.rows.filter(r => /^Not Assessed/.test(r[col('Status')]));
      chk(tag + 'C: ' + (spec.withheld === 'all' ? 'every' : heldIds.length) + ' withheld MRP row(s) shown as "Not Assessed" with the reason from the shared record (field, state, sheet row)', held.length === heldIds.length && heldIds.every(id => byId[id] && /^Not Assessed – (On_Hand_Qty|Allocated_Qty) (blank|invalid|column not supplied).*\(Inventory( row \d+)?\)/.test(byId[id][col('Status')])), held.map(r => r[col('Material')] + ' ' + r[col('Status')]).slice(0, 5));
      chk(tag + 'C: withheld rows show no figure (net, quantity, gross, dates "–"; money "£–", the app-wide "no value" form)', held.every(r => ['Net req.', 'Suggest qty', '£', 'Gross req.', 'Stock-out ~', 'Order by'].every(h => r[col(h)] === '–' || (h === '£' && r[col(h)] === '£–'))), held.slice(0, 2));
      chk(tag + 'C: "Not calculated" count card ' + (nHeld ? 'shows ' + nHeld : 'is absent'), nHeld ? mv.cards.some(c => c.startsWith(String(nHeld)) && /^\d+Not Assessed \(required inputs missing or invalid/.test(c)) : !mv.cards.some(c => /Not Assessed/.test(c)), mv.cards);
      chk(tag + 'C: net-requirement count ' + (nHeld ? 'says how many were not calculated' : 'has no qualifier'), nHeld ? mv.cards.some(c => /Materials with net requirement — of \d+ assessed; /.test(c) && c.includes(nHeld + ' Not Assessed')) : mv.cards.some(c => /Materials with net requirement$/.test(c)), mv.cards);
      chk(tag + 'C: integrity notice ' + (spec.report.length ? 'names ' + spec.report.join(', ') : 'is absent on clean data'), spec.report.length ? !!mv.note && spec.report.every(f => mv.note.includes(f)) && /results that depend on them are Not Assessed, never estimated/.test(mv.note) : mv.note === null, mv.note);
      const tot = mv.cards.find(c => /replenishment/.test(c)) || '';
      chk(tag + 'C: replenishment total ' + (nHeld || spec.partialCost ? 'is labelled partial and says what it excludes' : 'is not labelled partial'), nHeld || spec.partialCost ? /partial: excludes/.test(tot) && (!nHeld || tot.includes(nHeld + ' material(s) Not Assessed')) && (!spec.partialCost || /material\(s\) without a unit cost/.test(tot)) : !/partial/.test(tot), tot);
      chk(tag + 'C: order-now count ' + (nHeld ? 'says how many materials were calculated' : 'has no qualifier'), nHeld ? mv.cards.some(c => /^\d+Order now \(.*\) — of \d+ assessed$/.test(c) && c.endsWith('of ' + (nAll - nHeld) + ' assessed')) : mv.cards.some(c => /^\d+Order now \([^)]*\)$/.test(c)), mv.cards);
      chk(tag + 'C: replenishment total ' + (nHeld === nAll ? 'shows "–", not £0, when no material was calculated' : 'is a £ figure'), nHeld === nAll ? /^–Total replenishment/.test(tot) : /^£[\d,]+Total replenishment/.test(tot), tot);
      if (nHeld || spec.partialCost) chk(tag + 'C: the word "partial" sits inline in the card text (not styled as the headline number)', mv.partialStyle && mv.partialStyle.inCard && mv.partialStyle.display === 'inline' && mv.partialStyle.size === '12px', mv.partialStyle);
      if (name === 'clean') cleanRows = byId;
      else {
        const same = Object.keys(byId).filter(id => !heldIds.includes(id) && id !== spec.partialCost);
        const diff = same.filter(id => !cleanRows[id] || JSON.stringify(cleanRows[id]) !== JSON.stringify(byId[id]));
        chk(tag + 'C: every unaffected material (' + same.length + ' shown) displays exactly what it displays on clean data', diff.length === 0, diff.slice(0, 5).map(id => [id, cleanRows[id], byId[id]]));
      }
      await page.screenshot({ path: path.join(SHOTS, mode + '-' + name + '-MRP.png'), fullPage: false });
      // ---- WP7 (owner D4): every relevant view, affected AND unaffected items
      const naIds = spec.na === 'all' ? await page.evaluate(() => [...R.fg, ...R.rm].map(x => x.id)) : spec.na;
      const eng = await page.evaluate(() => [...R.fg, ...R.rm].map(x => ({ id: x.id, sev: x.sev, score: x.score, cls: x.cls, assess: x.assess })));
      chk(tag + 'engine: exactly the expected items are Not Assessed (' + (spec.na === 'all' ? 'all' : naIds.join(',') || 'none') + ')', eng.filter(x => x.sev === null).map(x => x.id).sort().join() === [...naIds].sort().join(), eng.filter(x => x.sev === null).map(x => x.id).slice(0, 6));
      const view = async t => { await page.click('#nav button[data-t="' + t + '"]'); if (['blank-several', 'invalid-mixed'].includes(name)) await page.screenshot({ path: path.join(SHOTS, mode + '-' + name + '-' + t.replace(/[^A-Za-z]+/g, '') + '.png'), fullPage: false }); return page.evaluate(() => { const out = {}; document.querySelectorAll('#v table').forEach((tb, ti) => { const trs = [...tb.querySelectorAll('tr')], hr = trs.filter(r => r.querySelector('th') && !r.querySelector('td')), hd = hr.length ? [...hr[hr.length - 1].querySelectorAll('th')].map(h => h.textContent.trim()) : []; trs.filter(r => r.querySelector('td')).forEach(r => { const c = [...r.children].map(td => td.textContent.trim()); (out[ti] = out[ti] || { hd, rows: [] }).rows.push(c); }); }); return { tables: out, cards: [...document.querySelectorAll('#v .k > div')].map(d => d.textContent.trim()), text: document.querySelector('#v').innerText }; }); };
      for (const t of ['Finished goods', 'Materials']) {
        const v = await view(t), tb = v.tables[0], ri = tb.hd.indexOf('Risk'), rows = tb.rows, shown = rows.map(r => r[0]), naShown = naIds.filter(id => shown.includes(id));
        const expectNA = naIds.filter(id => (t === 'Materials') === /^RM/.test(id));
        chk(tag + t + ': every Not Assessed item shown on this page says "Not Assessed – reason" in the Risk column and is listed first', naShown.every(id => /^Not Assessed – \S/.test(rows.find(r => r[0] === id)[ri])) && rows.slice(0, naShown.length).every(r => naIds.includes(r[0])) && (expectNA.length === 0 || naShown.length > 0), naShown.slice(0, 3).map(id => rows.find(r => r[0] === id)[ri]));
        chk(tag + t + ': no assessed item is labelled Not Assessed', rows.filter(r => !naIds.includes(r[0])).every(r => !/Not Assessed/.test(r[ri])));
        if (name === 'clean') cleanView[mode + t] = Object.fromEntries(rows.map(r => [r[0], r.join('|')]));
        else { const cmp = rows.filter(r => !naIds.includes(r[0]) && !(spec.noValue || []).includes(r[0]) && cleanView[mode + t][r[0]] !== undefined); const d = cmp.filter(r => cleanView[mode + t][r[0]] !== r.join('|')).map(r => r[0]);
          chk(tag + t + ': every unaffected item shown (' + cmp.length + ') is identical to clean data', d.length === 0, d.slice(0, 5)); }
      }
      { const v = await view('Health'), tb = v.tables[0], nAa = naIds.length;
        chk(tag + 'Health: ' + (nAa ? 'a "Not Assessed" card counts ' + nAa + ' and the average covers only assessed items' : 'no Not Assessed card; average over all items'), nAa ? v.cards.some(c => c.startsWith(String(nAa)) && /Not Assessed/.test(c)) && v.cards.some(c => /simple average of the \d+ assessed items; \d+ Not Assessed are excluded/.test(c)) : !v.cards.some(c => /Not Assessed/.test(c)), v.cards.slice(0, 2));
        chk(tag + 'Health: Not Assessed items have no score ("–"), category "Not Assessed" and the reason (never a healthy score)', tb.rows.filter(r => naIds.includes(r[0])).every(r => r[1] === '–' && r[2] === 'Not Assessed' && /^Not Assessed: \S/.test(r[3])) && tb.rows.filter(r => !naIds.includes(r[0])).every(r => /^\d+$/.test(r[1]))); }
      { const v = await view('Overview'), c = v.cards.find(x => /Not Assessed \(inputs missing/.test(x));
        chk(tag + 'Overview: ' + (naIds.length ? 'Not Assessed card shows ' + naIds.length : 'no Not Assessed card'), naIds.length ? !!c && c.startsWith(String(naIds.length)) && v.cards.some(x => x.includes((eng.length - naIds.length) + ' assessed, ' + naIds.length + ' Not Assessed')) : !c, v.cards.slice(0, 4));
        const val = v.cards.find(x => /Inventory value/.test(x)) || '';
        chk(tag + 'Overview: inventory value ' + ((spec.noValue || []).length ? 'labelled partial with coverage' : 'is a complete figure'), (spec.noValue || []).length ? new RegExp('partial: ' + (eng.length - spec.noValue.length) + ' of ' + eng.length + ' items').test(val) : !/partial/.test(val), val); }
      { const v = await view('Excess & dead stock'), tb = v.tables[0], ci = tb ? tb.hd.indexOf('Class') : -1, rows = tb ? tb.rows : [];
        chk(tag + 'Excess & dead stock: items listed here that are Not Assessed show "Not Assessed – reason"; none is shown as an assessed class', rows.filter(r => naIds.includes(r[0])).every(r => /^Not Assessed – \S/.test(r[ci])) && rows.filter(r => !naIds.includes(r[0])).every(r => !/Not Assessed/.test(r[ci]))); }
      { const v = await view('Summary'), c = v.cards.find(x => /Not Assessed items:/.test(x));
        chk(tag + 'Summary: ' + (naIds.length ? 'a Not Assessed card names the items (not counted as low risk)' : 'no Not Assessed card'), naIds.length ? !!c && naIds.slice(0, 6).every(id => c.includes(id)) && /not counted as low risk/.test(c) : !c, c); }
      { // the real export code path (exportWorkbook), captured in the page instead of downloading
        const ex = await page.evaluate(() => { let got = null; const w0 = XLSX.writeFile; XLSX.writeFile = w => { got = w; }; try { exportWorkbook(); } finally { XLSX.writeFile = w0; } const rows = n => XLSX.utils.sheet_to_json(got.Sheets[n], { defval: '' }); return { fg: rows('ENG_FG'), rm: rows('ENG_RM') }; });
        const all = [...ex.fg, ...ex.rm], na = all.filter(r => naIds.includes(r.Item)), ok1 = all.filter(r => !naIds.includes(r.Item));
        chk(tag + 'export: every Not Assessed row has Assessment "Not Assessed", a reason, and EMPTY Available / Risk-dependent number cells (never NaN or a number)', na.length === naIds.length && na.every(r => r.Assessment === 'Not Assessed' && String(r.AssessmentReason).length > 5 && r.HealthScore === '' && r.Risk === 'Not Assessed' && !/NaN/.test(JSON.stringify(r))), na.slice(0, 1));
        chk(tag + 'export: every assessed row has Assessment "Assessed", no reason and a numeric health score; no NaN anywhere in the two sheets', ok1.every(r => r.Assessment === 'Assessed' && r.AssessmentReason === '' && typeof r.HealthScore === 'number') && !/NaN/.test(JSON.stringify(all))); }
      // C: every tab free of NaN / Infinity / Invalid Date / undefined
      const tabs = await page.$$eval('#nav button', b => b.map(x => x.dataset.t)), hits = [], banners = [];
      for (const t of tabs) { await page.click('#nav button[data-t="' + t + '"]'); const tx = await page.$eval('#v', e => e.innerText); banners.push(await page.$eval('#v', e => { const b = e.querySelector('[data-x1="banner"]'); return b ? b.textContent : null; })); const mm = tx.match(BAD_TEXT); if (mm) hits.push(t + ': "' + tx.slice(Math.max(0, mm.index - 60), mm.index + 30).replace(/\s+/g, ' ') + '"'); }
      chk(tag + 'C: every tab ' + (spec.report.length ? 'shows the missing-input banner naming ' + spec.report.join(', ') + ' and the final D4 wording (affected items stay listed as Not Assessed)' : 'has no missing-input banner'), spec.report.length ? banners.every(b => b && spec.report.every(f => b.includes(f)) && /stay in every list with the status Not Assessed/.test(b) && !/understated/.test(b)) : banners.every(b => b === null), banners.slice(0, 2));
      chk(tag + 'C: no tab (' + tabs.length + ') shows NaN, Infinity, "Invalid Date" or "undefined"', hits.length === 0, hits);
      chk(tag + 'no page error while visiting every tab', errs.length === 0, errs);
      await page.close();
    }
  }
  // ---- import route (harness in the real page: the app has no import-upload screen; see X1-CHANGE-RECORD.md CR-05)
  console.log('\n===== IMPORT ROUTE (harness inside the real page, desktop) =====');
  {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    await page.setViewport({ width: 1280, height: 800 }); await page.goto(URL, { waitUntil: 'networkidle0' });
    for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) await page.addScriptTag({ url: URL + 'js/import/' + f + '.js' });
    await page.addScriptTag({ url: URL + 'tests/tools/import-v1/reverse-eight-sheet.js' });
    for (const name of ['clean', 'blank-one', 'column-absent']) {
      const b64 = fs.readFileSync(V[name].file).toString('base64');
      const r = await page.evaluate(b => { const wb = XLSX.read(Uint8Array.from(atob(b), c => c.charCodeAt(0)), { cellDates: true });
        const rv = CGTestTools.reverseEightSheet(wb), imp = CGImport.validate.importFiles(rv.mapping, rv.files); if (!imp.importAccepted) return { stage: 'Stage 1 refused' };
        const ad = CGImport.adapter.build(imp, rv.mapping); if (!ad.workbook) return { stage: 'adapter refused' };
        let o; try { o = CGEngine.runEngine({ workbook: ad.workbook, integrity: CGValidation.fromImport(imp, rv.mapping) }); } catch (e) { return { stage: 'engine threw', err: e.message }; }
        const g = CGImport.resultGate.apply(o, ad.gate);
        return { stage: 'ran', gate: g.status, route: o.integrity.route, status: o.integrity.status, report: o.integrity.report.slice(), held: o.mrp.filter(x => x.nc).map(x => x.x.id), n: o.mrp.length,
          nan: JSON.stringify(o.mrp.map(x => [x.net, x.qty, x.val, x.out, x.by])).match(/NaN|Invalid/) !== null, appR: typeof R !== 'undefined' && R && 'integrity' in R };
      }, b64);
      const exp = V[name].withheld === 'all' ? 'all' : V[name].withheld.join();
      chk('import ' + name + ': A: Stage 1, adapter and engine complete in the browser', r.stage === 'ran', r);
      chk('import ' + name + ': B: out.integrity is an import-route record (' + (name === 'clean' ? 'inputs-valid' : 'names Allocated_Qty') + ')', r.route === 'import' && (name === 'clean' ? r.status === 'inputs-valid' && r.report.length === 0 : r.report.some(l => l.startsWith('Allocated_Qty:'))), r);
      chk('import ' + name + ': A: withheld MRP rows ' + (exp || 'none') + ', no NaN or invalid date', (exp === 'all' ? r.held.length === r.n : r.held.join() === exp) && !r.nan, r);
    }
    chk('import harness: no page error', errs.length === 0, errs);
    await page.close();
  }
  await browser.close(); server.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\nbrowser-x1-chrome: ${ok} passed, ${bad} failed | screenshots in ${SHOTS}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL browser-x1-chrome crashed: ' + (e && e.stack || e)); process.exit(1); });
