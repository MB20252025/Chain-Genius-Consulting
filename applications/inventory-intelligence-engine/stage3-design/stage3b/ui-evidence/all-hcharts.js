// Every horizontal bar chart on every SCIE screen, at the given widths: all category labels drawn and fitting the axis.
// Then a rotation (phone portrait -> landscape -> portrait) on Demand forecast: labels re-wrap for the new width.
const { chromium } = require('playwright');
(async () => {
  const [WB, ...widths] = process.argv.slice(2); const b = await chromium.launch(); let bad = 0, n = 0;
  const measure = p => p.evaluate(() => [...document.querySelectorAll('#scie-view canvas')].map(c => Chart.getChart(c)).filter(ch => ch && ch.options.indexAxis === 'y').map(ch => {
    const y = ch.scales.y, ctx = ch.ctx; ctx.save(); ctx.font = Chart.helpers.toFont(y.options.ticks.font).string;
    const lines = ch.data.labels.flatMap(l => (Array.isArray(l) ? l : [String(l)])), widest = Math.max(...lines.map(t => ctx.measureText(t).width)); ctx.restore(); const lh = Chart.helpers.toFont(y.options.ticks.font).lineHeight, ml = Math.max(...ch.data.labels.map(l => (Array.isArray(l) ? l.length : 1))), slot = y.height / ch.data.labels.length;
    return { title: ch.canvas.closest('.scie-panel') ? (ch.canvas.closest('.scie-panel').querySelector('h2,h3') || {}).textContent : '?', fits: widest <= y.width, noOverlap: ml * lh <= slot, slot: Math.round(slot), shown: y.ticks.length, cats: ch.data.labels.length, wrapped: ch.data.labels.some(Array.isArray) };
  }));
  for (const w of widths.map(Number)) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
    await p.setInputFiles('#f', WB); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
    const subs = await p.evaluate(() => [...new Set([...document.querySelectorAll('#scie-side [data-go]')].map(x => x.dataset.go))]);
    const all = []; for (const g of subs) { if (!g.includes('/')) { await p.evaluate(g => document.querySelector(`#scie-side [data-go="${g}"]`).click(), g); const s2 = await p.$$eval('#scie-view [data-go]', e => e.map(x => x.dataset.go).filter(x => x.includes('/'))); s2.forEach(x => all.includes(x) || all.push(x)); } else if (!all.includes(g)) all.push(g); }
    let issues = [];
    for (const g of all) { const [a, s] = g.split('/'); await p.evaluate(([a, s]) => CGShell.go(a, s), [a, s]); await p.waitForTimeout(80); for (const m of await measure(p)) { n++; if (!m.fits || m.shown !== m.cats || !m.noOverlap) { bad++; issues.push(`${g} "${m.title}" fits ${m.fits} shown ${m.shown}/${m.cats} slot ${m.slot}px overlap-free ${m.noOverlap}`); } } }
    console.log(`${w} px: ${all.length} screens; horizontal charts checked so far ${n}; issues: ${issues.length ? issues.join(' | ') : 'none'}`);
    await p.context().close();
  }
  // rotation
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
  await p.setInputFiles('#f', WB); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
  await p.evaluate(() => CGShell.go('planning', 'forecast')); await p.waitForTimeout(200);
  const w1 = (await measure(p)).find(m => /method/i.test(m.title)); await p.setViewportSize({ width: 915, height: 412 }); await p.waitForTimeout(700);
  const w2 = (await measure(p)).find(m => /method/i.test(m.title)); await p.setViewportSize({ width: 412, height: 915 }); await p.waitForTimeout(700);
  const w3 = (await measure(p)).find(m => /method/i.test(m.title));
  const rot = w1.wrapped && !w2.wrapped && w3.wrapped && [w1, w2, w3].every(m => m.fits && m.shown === m.cats);
  console.log(`rotation 412 -> 915 -> 412: wrapped ${w1.wrapped} -> ${w2.wrapped} -> ${w3.wrapped}; all fit and shown: ${rot}`);
  if (!rot) bad++;
  console.log(`TOTAL horizontal charts ${n}; problems ${bad}`); await b.close(); process.exit(bad ? 1 : 0);
})();
