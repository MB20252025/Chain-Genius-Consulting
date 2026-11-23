const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
  await p.setInputFiles('#f', process.argv[2]);
  await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 600000 });
  await p.evaluate(() => CGShell.go('inventory', 'stock'));
  const r = await p.evaluate(async () => { const btn = document.querySelector('#scie-view [data-rows-all]'); const a = performance.now(); btn.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return { ms: performance.now() - a, rows: document.querySelectorAll('#scie-view .scie-table tbody tr').length }; });
  const back = await p.evaluate(async () => { CGShell.go('planning', 'forecast'); CGShell.go('inventory', 'stock'); return document.querySelectorAll('#scie-view .scie-table tbody tr').length; });
  console.log(`Show all on Stock position: ${Math.round(r.ms)} ms to paint ${r.rows} rows; after leaving and returning to the area: ${back} rows (reset)`);
  await b.close();
})();
