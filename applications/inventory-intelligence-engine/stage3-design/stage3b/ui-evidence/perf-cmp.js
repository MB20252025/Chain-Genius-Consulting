const { chromium } = require('playwright');
(async () => {
  const [port, file, runs] = [process.argv[2], process.argv[3], +(process.argv[4] || 3)];
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const imp = [], an = [];
  for (let i = 0; i < runs; i++) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(300);
    const t0 = Date.now(); await p.setInputFiles('#f', file);
    await p.waitForFunction(() => /Analysed|Error|could not/i.test(document.querySelector('#st').textContent), null, { timeout: 600000 });
    imp.push(Date.now() - t0);
    an.push(await p.evaluate(() => { const t = performance.now(); analyse(); return performance.now() - t; }));
    await p.context().close();
  }
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  console.log(`port ${port}: import-to-Analysed ${imp.join(' / ')} ms (median ${med(imp)}); analyse() ${an.map(Math.round).join(' / ')} ms (median ${Math.round(med(an))})`);
  await b.close();
})();
