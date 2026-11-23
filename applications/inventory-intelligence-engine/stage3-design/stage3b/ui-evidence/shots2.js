// screenshots of chosen SCIE screens. node shots2.js <app-dir> <out-dir> <workbook> <vp:desktop|phone> <area/sub>...
const { chromium } = require('playwright'), path = require('path');
(async () => {
  const [ROOT, OUT, WB, vp, ...subs] = process.argv.slice(2);
  const b = await chromium.launch(); const size = vp === 'phone' ? { width: 412, height: 915 } : { width: 1280, height: 900 };
  const p = await (await b.newContext({ viewport: size, deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
  await p.setInputFiles('#f', WB); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
  for (const g of subs) { const [a, s] = g.split('/'); await p.evaluate(([a, s]) => CGShell.go(a, s), [a, s]); await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, `${vp}-${a}-${s}.png`), fullPage: true }); }
  console.log('errors:', errs.length, errs.slice(0, 3).join(' | ')); await b.close();
})();
