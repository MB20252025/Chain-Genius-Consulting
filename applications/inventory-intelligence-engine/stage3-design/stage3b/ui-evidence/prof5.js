const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const port of [8767, 8765]) for (const rep of [1, 2]) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForFunction(() => typeof CGShell !== 'undefined');
    await p.setInputFiles('#f', process.argv[2]); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
    const r = await p.evaluate(async () => {
      const subs = ['overview/dashboard','inventory/stock','inventory/health','inventory/excess','planning/forecast','planning/accuracy','planning/policy','procurement/buy','procurement/suppliers','procurement/reconciliation'];
      const T = {}; const f = CGVM.forSub; CGVM.forSub = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { T.vm = performance.now() - t; } };
      const out = []; for (const pass of [0, 1]) for (const g of subs) { const [a, s] = g.split('/'); T.vm = 0; const t0 = performance.now(); CGShell.go(a, s); const t1 = performance.now(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const t2 = performance.now(); if (g.endsWith('suppliers') || g.endsWith('policy')) out.push(`${pass ? 'warm' : 'cold'} ${s}: script ${Math.round(t1 - t0)} (view-models ${Math.round(T.vm)}) + frames ${Math.round(t2 - t1)}`); }
      return out;
    });
    console.log(port, rep, r.join(' | '));
    await p.context().close();
  }
  await b.close();
})();
