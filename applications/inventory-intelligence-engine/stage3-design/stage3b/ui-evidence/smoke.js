const { chromium } = require('playwright'); const path = require('path');
const APP = process.argv[2], OUT = process.argv[3], WB = path.join(APP, 'tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const [name, w, h, mobile] of [['desktop', 1280, 900, false], ['tablet', 768, 1024, true], ['phone', 412, 915, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.waitForFunction(() => window.CGShell, null, { timeout: 15000 });
    await page.setInputFiles('#f', WB);
    await page.waitForSelector('body.scie-on #scie-view .scie-kpi', { timeout: 20000 });
    await page.waitForTimeout(300);
    const shot = async n => page.screenshot({ path: path.join(OUT, `${name}-${n}.png`), fullPage: true });
    await shot('overview');
    const areas = await page.$$eval('#scie-side [data-go]', bs => [...new Set(bs.map(b => b.dataset.go))]);
    const times = [];
    for (const g of areas) {
      const t0 = Date.now();
      await page.evaluate(g => { const [a, s] = g.split('/'); CGShell.go(a, s); }, g);
      await page.waitForTimeout(60);
      const o = await page.evaluate(() => { const W = innerWidth, bad = []; document.querySelectorAll('body *').forEach(e => { if (e.closest('.w') || e.closest('nav') || e.closest('#scie-item')) return; const r = e.getBoundingClientRect(); if (r.width && r.right > W + 1) bad.push(e.tagName + '.' + e.className + '@' + Math.round(r.right)); }); return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 3), nan: /NaN|undefined/.test(document.querySelector('#scie-view').innerText.replace('never written as 0 or NaN','')), wip: !!document.querySelector('#scie-view .scie-wip'), mode: CGShell.state().mode }; });
      times.push([g, Date.now() - t0]);
      res.push({ vp: name, g, overflow: o.sw > o.W + 1 || o.bad.length ? o.bad : 0, nan: o.nan, wip: o.wip, mode: o.mode });
      if (['inventory/stock', 'inventory/health', 'planning/forecast', 'procurement/suppliers', 'production/attainment', 'scenarios/recommendations'].includes(g)) await shot(g.replace('/', '-'));
    }
    // advanced view still works: click an original tab
    const tb = (await page.$$('#nav [data-t]'))[4]; mobile ? await tb.tap() : await tb.click(); await page.waitForTimeout(100);
    const adv = await page.evaluate(() => ({ mode: CGShell.state().mode, vVisible: getComputedStyle(document.querySelector('#v')).display !== 'none', len: document.querySelector('#v').innerHTML.length, on: document.querySelector('#nav .on').textContent }));
    await shot('advanced');
    console.log(name, 'errors:', errs.length, errs.slice(0, 4).join(' | ').slice(0, 300));
    console.log(name, 'advanced:', JSON.stringify(adv));
    console.log(name, 'switch ms (incl. 60 ms wait):', times.map(t => `${t[0]}=${t[1]}`).join(' '));
    await ctx.close();
  }
  for (const r of res) if (r.overflow || r.nan || r.wip || r.mode !== 'new') console.log('ISSUE', JSON.stringify(r));
  console.log('screens checked:', res.length);
  await b.close();
})().catch(e => { console.error('SMOKE FAILED', e.message); process.exit(1); });
