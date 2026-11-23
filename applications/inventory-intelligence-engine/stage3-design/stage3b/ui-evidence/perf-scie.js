// Stage 3B performance: import a workbook through the real file input, then time every SCIE screen switch.
// Usage: node perf-scie.js <app-dir> <workbook.xlsx>
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const ROOT = path.resolve(process.argv[2]), file = process.argv[3];
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.goto('http://127.0.0.1:8765/index.html');
  await p.waitForFunction(() => typeof CGShell !== 'undefined');
  const t0 = Date.now();
  await p.setInputFiles('#f', file);
  await p.waitForFunction(() => /Analysed|Error|could not/i.test(document.querySelector('#st').textContent), null, { timeout: 600000 });
  const imp = Date.now() - t0;
  await p.waitForFunction(() => document.body.classList.contains('scie-on') && document.querySelector('#scie-view').children.length, null, { timeout: 60000 });
  const ready = Date.now() - t0;
  const st = await p.$eval('#st', e => e.textContent);
  // engine analysis alone, on the loaded workbook (same call the import path makes)
  const eng = await p.evaluate(() => { const a = performance.now(); CGEngine.runEngine({}); return performance.now() - a; }).catch(e => 'n/a: ' + String(e).slice(0, 80));
  const items = await p.evaluate(() => { const r = CGEngine.currentResult(); return r ? r.fg.length + r.rm.length : null; });
  console.log(`items analysed: ${items} | status: ${st}`);
  console.log(`import-to-"Analysed." (file read + parse + analysis + first render): ${imp} ms; SCIE screen shown: ${ready} ms`);
  console.log(`engine analysis alone (CGEngine.runEngine on the loaded workbook): ${typeof eng === 'number' ? Math.round(eng) + ' ms' : eng}`);
  const goes = await p.$$eval('#scie-side [data-go]', e => [...new Set(e.map(x => x.dataset.go))]);
  const subs = [];
  for (const g of goes) {
    await p.evaluate(g => document.querySelector(`#scie-side [data-go="${g}"]`).click(), g);
    const s = await p.$$eval('#scie-view [data-go], #scie-top [data-go]', e => e.map(x => x.dataset.go).filter(x => x.includes('/')));
    for (const x of s) if (!subs.includes(x)) subs.push(x);
    if (g.includes('/') && !subs.includes(g)) subs.push(g);
  }
  const rows = [];
  for (const pass of ['cold', 'warm']) for (const g of subs) {
    const ms = await p.evaluate(async g => {
      const a = performance.now(); const [ar, sb] = g.split('/'); CGShell.go(ar, sb);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - a;
    }, g).catch(e => NaN);
    rows.push({ pass, g, ms });
  }
  for (const pass of ['cold', 'warm']) {
    const r = rows.filter(x => x.pass === pass).sort((a, b) => b.ms - a.ms);
    console.log(`--- ${pass}: ${r.length} screens; max ${Math.round(r[0].ms)} ms; over 300 ms: ${r.filter(x => !(x.ms <= 300)).length}`);
    r.forEach(x => console.log('  ' + x.g.padEnd(28) + String(Math.round(x.ms)).padStart(6) + ' ms'));
  }
  console.log('page errors:', errs.length, errs.slice(0, 5).join(' | '));
  await b.close();
})();
