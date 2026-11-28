// Stage 3B Phase 3 (25 Nov 2026) real-browser test: the Duplicates & gaps screen and the customer's decisions, end to end.
// Headless Chrome, desktop 1280x800 and Pixel 5 EMULATION (not a physical Android device). Synthetic fixture
// tests/fixtures/phase3/phase3-duplicates.xlsx (derived from the Northstar demonstration workbook).
// Workflow per mode: upload -> three months need review (first row in use) -> choose another row -> reload the page and upload
// the same file again (decision kept, from browser storage) -> exclude a month -> clear a decision -> another dataset sees
// nothing -> the first dataset's decision is still there; plus the forecast screen, the Advanced view and the screen's text.
// Expected values are this test's own: the rows written by make-phase3.js (FG005 month 9: 35 first, 10 second; FG012 month 3:
// 70, 75, 80; FG010 month 5: two identical rows of 81).
// Run: NODE_PATH=<node_modules with puppeteer-core, @sparticuz/chromium> node browser-phase3-chrome.js [screenshotDir]
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const ROOT = path.resolve(__dirname, '..'), BASE = '/chain-genius/applications/inventory-intelligence-engine/';
const FX = path.join(__dirname, 'fixtures', 'phase3', 'phase3-duplicates.xlsx'), NS = path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const SHOTS = process.argv.filter(a => !a.startsWith('--'))[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-browser-'));
fs.mkdirSync(SHOTS, { recursive: true });
let ok = 0, bad = 0; const chk = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  >> ' + JSON.stringify(d === undefined ? '' : d).slice(0, 300))); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); if (!u.startsWith(BASE)) { s.writeHead(404); return s.end('nf'); }
  let f = path.join(ROOT, u.slice(BASE.length) || 'index.html'); if (f.endsWith(path.sep)) f += 'index.html';
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('nf'); }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL = `http://127.0.0.1:${server.address().port}${BASE}index.html`;
  const m = require('@sparticuz/chromium'), chromium = m.default || m, puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: 'shell' });
  try {
    for (const mode of ['desktop', 'mobile']) {
      const page = await browser.newPage(), errs = [];
      if (mode === 'mobile') await page.emulate(puppeteer.KnownDevices['Pixel 5']); else await page.setViewport({ width: 1280, height: 800 });
      page.on('pageerror', e => errs.push(e.message)); page.on('console', q => { if (q.type() === 'error') errs.push(q.text()); });
      const load = async file => { await page.goto(URL, { waitUntil: 'load' }); await page.waitForFunction(() => window.CGShell, { timeout: 15000 }); const inp = await page.$('#f'); await inp.uploadFile(file); await page.waitForSelector('body.scie-on #scie-view .scie-kpi', { timeout: 30000 }); await sleep(200); };
      const goDup = async () => { await page.evaluate(() => CGShell.go('data', 'duplicates')); await sleep(150); };
      const state = () => page.evaluate(() => { const R = CGEngine.currentResult(), g = s => R.dups.find(x => x.sku === s) || {}, v = (s, i) => R.fg.find(x => x.id === s).hc[i];
        return { st: { FG005: g('FG005').status, FG010: g('FG010').status, FG012: g('FG012').status }, v5: v('FG005', 8), v12: v('FG012', 2), key5: g('FG005').key, key12: g('FG012').key, key10: g('FG010').key, ds: R.dsId,
          store: localStorage.getItem('scie.duplicateDecisions.v2'), cards: document.querySelectorAll('[data-dup-card]').length, text: document.querySelector('#scie-view').innerText }; });
      const press = async sel => { const el = await page.$(sel); if (!el) return false; mode === 'mobile' ? await el.tap() : await el.click(); await sleep(400); return true; };
      const T = s => `${mode}: ${s}`;

      // 1. first load: three months need review; the first row is in use; nothing saved yet
      await page.goto(URL, { waitUntil: 'load' }); await page.evaluate(() => { localStorage.removeItem('scie.duplicateDecisions.v1'); localStorage.removeItem('scie.duplicateDecisions.v2'); }); /* start each mode with no saved decisions */
      await load(FX); await goDup(); let s = await state();
      chk(T('three product-months need review, first row in use (FG005 35, FG012 70)'), s.st.FG005 === 'unreviewed' && s.st.FG010 === 'unreviewed' && s.st.FG012 === 'unreviewed' && s.v5 === 35 && s.v12 === 70 && s.cards === 3, s);
      chk(T('the screen explains the first-row default and that nothing is added together'), /temporary default, not a confirmed value/.test(s.text) && /nothing is added together/i.test(s.text) && !/NaN|undefined|Infinity/.test(s.text));
      chk(T('every competing row is shown (2 + 2 + 3 rows) with the one in use marked'), (await page.$$eval('[data-dup-card] tbody tr', t => t.length)) === 7 && (await page.$$eval('.scie-dup-used', t => t.length)) === 3);
      await page.screenshot({ path: path.join(SHOTS, `${mode}-1-review.png`), fullPage: true });
      // 2. choose FG005's second row (10)
      /* FG005's card (owner approval, 28 Nov 2026): both competing rows and both values visible, the first marked in use */
      const card5 = k => page.evaluate(key => { const c = document.querySelector(`[data-dup-card="${key}"]`); if (!c) return null; const tr = [...c.querySelectorAll('tbody tr')]; const head = [...c.querySelectorAll('thead th')].map(t => t.innerText), ui = head.findIndex(t => /^Units_Sold/.test(t)); return { rows: tr.length, units: tr.map(r => r.children[ui] && r.children[ui].innerText.trim()), used: tr.map(r => r.classList.contains('scie-dup-used')), inUse: tr.map(r => /in use/.test(r.children[0].innerText)) }; }, k);
      { const c = await card5(s.key5); chk(T('FG005 card: both competing rows shown with both values (35, 10); the first is marked in use, the second is not'), !!c && c.rows === 2 && c.units.join() === '35,10' && c.used.join() === 'true,false' && c.inUse.join() === 'true,false', c); }
      const k5 = s.key5, k12 = s.key12, fp10 = await page.evaluate(k => CGEngine.currentResult().dups.find(x => x.key === k).rows[1].fp, k5);
      chk(T('"Use this row" pressed'), await press(`[data-dup="${k5}"][data-choice="row"][data-fp="${fp10}"]`));
      s = await state(); chk(T('FG005 resolved with the second row: the month is now 10 in the analysis and saved in this browser'), s.st.FG005 === 'chosen' && s.v5 === 10 && s.store && JSON.parse(s.store).sets[s.ds][k5].c === 'row', s);
      { await press('[data-set="dg=all"]'); const c = await card5(k5); chk(T('after choosing the second row, FG005\'s card (All list) still shows both rows and values (35, 10), now with the second marked in use'), !!c && c.rows === 2 && c.units.join() === '35,10' && c.used.join() === 'false,true' && c.inUse.join() === 'false,true', c); }
      // 3. reload the page and upload the same file again
      await load(FX); await goDup(); s = await state();
      chk(T('after reload and re-upload: FG005 still resolved with 10; the other two still need review'), s.st.FG005 === 'chosen' && s.v5 === 10 && s.st.FG012 === 'unreviewed' && s.cards === 2, s);
      await press('[data-set="dg=done"]'); s = await state(); chk(T('"Resolved" list shows the one decided month'), s.cards === 1 && /Resolved: another row chosen/.test(s.text));
      await press('[data-set="dg=all"]');
      // 4. exclude FG012's month, then clear the decision
      chk(T('"Exclude this month" pressed'), await press(`[data-dup="${k12}"][data-choice="exclude"]`));
      s = await state(); chk(T('FG012 month excluded: no value for the month (treated as missing)'), s.st.FG012 === 'excluded' && s.v12 === null, s);
      chk(T('"Clear my decision" pressed'), await press(`[data-dup="${k12}"][data-choice="forget"]`));
      s = await state(); chk(T('FG012 back to review with the first row (70)'), s.st.FG012 === 'unreviewed' && s.v12 === 70, s);
      // 5. forecast screen: missing months stated; the Advanced view still reports duplicates
      await page.evaluate(() => CGShell.go('planning', 'forecast')); await sleep(200);
      const fc = await page.evaluate(() => { const A = CGEngine.current().forecasts, R = CGEngine.currentResult(); const b = R.boundary, d = new Date(b); return { start: A.FG020.start === Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1), trail: A.FG020.trail, warn: A.FG020.warn.join(' '), allStart: Object.values(A).filter(F => F.ok).every(F => F.start === A.FG020.start) }; });
      chk(T('FG020 (last 2 months missing) is forecast from the month after the workbook\'s last month, with a reliability warning; every product starts there'), fc.start && fc.trail === 2 && /less reliable/.test(fc.warn) && fc.allStart, fc);
      const adv = await page.evaluate(() => { const b = [...document.querySelectorAll('#nav [data-t]')].find(x => x.dataset.t === 'Data quality'); b.click(); return document.querySelector('#v').innerText; });
      chk(T('Advanced view › Data quality states the duplicates and the first-row default'), /have more than one row and need your review/.test(adv) && /FIRST row in the file is used/.test(adv));
      // 6. layout: nothing wider than the screen on the duplicates screen
      await page.evaluate(() => CGShell.go('data', 'duplicates')); await sleep(200);
      const ov = await page.evaluate(() => { const W = innerWidth, bad = []; document.querySelectorAll('#scie-view *').forEach(e => { if (e.closest('.w')) return; const r = e.getBoundingClientRect(); if (r.right > W + 1) bad.push(e.tagName + '.' + e.className); }); return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }; });
      chk(T('Duplicates & gaps fits the screen width (tables scroll inside their own box)'), ov.sw <= ov.W + 1 && !ov.bad.length, ov);
      await page.screenshot({ path: path.join(SHOTS, `${mode}-2-after.png`), fullPage: true });
      // 7. another dataset: no decisions there; then the first dataset's decision is still in place
      await load(NS); await goDup(); const n = await page.evaluate(() => ({ g: CGEngine.currentResult().dups.length, t: document.querySelector('#scie-view').innerText }));
      chk(T('Northstar (another dataset): no duplicate months, and the screen says so'), n.g === 0 && /No product-month is recorded on more than one row/.test(n.t), n);
      await load(FX); s = await state(); chk(T('back to the first dataset: FG005 still resolved with 10'), s.st.FG005 === 'chosen' && s.v5 === 10, s);
      // 8. recovery after browser storage is cleared (owner decision 27 Nov 2026): download the decisions, clear storage, load the file
      await goDup();
      const dl = await page.evaluate(() => { let made = null; const orig = URL.createObjectURL; URL.createObjectURL = b => { made = b; return orig.call(URL, b); }; document.querySelector('[data-dup-export]').click(); URL.createObjectURL = orig; return made ? made.text() : null; });
      const msgDl = await page.evaluate(() => (document.querySelector('.scie-dup-msg') || {}).innerText || '');
      chk(T('"Download my decisions" makes a decisions file with the saved decision, and says what it is for'), !!dl && JSON.parse(dl).format === 'scie-duplicate-decisions' && /Decisions file downloaded/.test(msgDl), msgDl);
      const file = path.join(SHOTS, `${mode}-decisions.json`); fs.writeFileSync(file, dl || '');
      await page.evaluate(() => localStorage.clear()); await load(FX); await goDup(); s = await state();
      chk(T('browser storage cleared: FG005 needs review again (first row 35)'), s.st.FG005 === 'unreviewed' && s.v5 === 35, s);
      const inp = await page.$('input[data-dup-import]'); await inp.uploadFile(file); await page.waitForFunction(() => /Decisions file loaded/.test((document.querySelector('.scie-dup-msg') || {}).innerText || ''), { timeout: 10000 }).catch(() => {});
      s = await state(); chk(T('"Load a decisions file" restores the decision (FG005 resolved, 10) and saves it again'), s.st.FG005 === 'chosen' && s.v5 === 10 && !!s.store && /Decisions file loaded: 1 decision/.test(s.text), { st: s.st, v5: s.v5 });
      chk(T('no page errors'), errs.length === 0, errs);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(`browser-phase3-chrome: ${ok} passed, ${bad} failed (screenshots: ${SHOTS})`);
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error('browser-phase3-chrome FAILED', e); process.exit(1); });
