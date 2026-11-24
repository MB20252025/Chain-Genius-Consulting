const { chromium } = require('playwright');
(async () => {
  const [WB, ...widths] = process.argv.slice(2); const b = await chromium.launch();
  for (const w of widths.map(Number)) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
    await p.setInputFiles('#f', WB); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
    const all = await p.evaluate(() => { const o = []; for (const a of CGVM.primary(CGVM.source()).concat(CGVM.NAV.utility || [])) for (const s of (a.subs || [])) o.push(`${a.id}/${s.id}`); return o; }).catch(() => null);
    const subs = all || ['overview/dashboard','inventory/stock','inventory/health','inventory/excess','planning/forecast','planning/accuracy','planning/policy','procurement/buy','procurement/suppliers','procurement/reconciliation','production/feasibility','production/attainment','scenarios/recommendations','scenarios/comparison'];
    const issues = [];
    for (const g of subs) { const [a, s] = g.split('/'); await p.evaluate(([a, s]) => CGShell.go(a, s), [a, s]); await p.waitForTimeout(80);
      const r = await p.evaluate(() => [...document.querySelectorAll('#scie-view canvas')].map(c => Chart.getChart(c)).filter(ch => ch && ch.options.indexAxis !== 'y' && ch.config.type === 'bar').map(ch => ({ t: (ch.canvas.closest('.scie-panel') && (ch.canvas.closest('.scie-panel').querySelector('h2,h3') || {}).textContent) || '?', shown: ch.scales.x.ticks.length, cats: ch.data.labels.length })));
      r.filter(x => x.shown !== x.cats).forEach(x => issues.push(`${g} "${x.t}" ${x.shown}/${x.cats}`)); }
    console.log(`${w}px vertical bar charts with skipped labels: ${issues.length ? issues.join(' | ') : 'none'}`);
    await p.context().close();
  }
  await b.close();
})();
