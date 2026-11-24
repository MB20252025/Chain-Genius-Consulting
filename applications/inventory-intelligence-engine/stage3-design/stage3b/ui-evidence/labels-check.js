// For each viewport: open Demand forecast, measure the method-comparison chart's category labels (Chart.js instance):
// every label present, the wrapped lines join back to the full label, and every line fits inside the axis box.
const { chromium } = require('playwright');
(async () => {
  const [WB, ...widths] = process.argv.slice(2);
  const b = await chromium.launch(); const out = [];
  for (const w of widths.map(Number)) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: w < 600 ? 2.625 : 1, isMobile: w < 600, hasTouch: w < 900 })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForFunction(() => typeof CGShell !== 'undefined');
    await p.setInputFiles('#f', WB); await p.waitForFunction(() => /Analysed/.test(document.querySelector('#st').textContent), null, { timeout: 120000 });
    await p.evaluate(() => CGShell.go('planning', 'forecast')); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const ch = [...document.querySelectorAll('#scie-view canvas')].map(c => Chart.getChart(c)).find(c => c && c.data.labels.some(l => /\(selected\)/.test(Array.isArray(l) ? l.join(' ') : l))), cv = ch && ch.canvas; if (!ch) return { err: 'no chart' };
      const y = ch.scales.y, ctx = ch.ctx; ctx.save(); ctx.font = Chart.helpers.toFont(y.options.ticks.font).string;
      const want = ch.data.labels.map(l => (Array.isArray(l) ? l.join(' ') : l));
      const lines = ch.data.labels.flatMap(l => (Array.isArray(l) ? l : [l]));
      const widest = Math.max(...lines.map(t => ctx.measureText(t).width)); const lh = Chart.helpers.toFont(y.options.ticks.font).lineHeight, maxLines = Math.max(...ch.data.labels.map(l => (Array.isArray(l) ? l.length : 1))), slot = y.height / ch.data.labels.length; ctx.restore();
      return { canvas: cv.clientWidth, axisWidth: Math.round(y.width), widestLine: Math.round(widest), fits: widest <= y.width, wrapped: ch.data.labels.some(Array.isArray), labels: want, ticksShown: y.ticks.length, categories: ch.data.labels.length, noOverlap: maxLines * lh <= slot, maxLines, slot: Math.round(slot) };
    });
    out.push({ w, ...r, errors: errs.length });
    await p.context().close();
  }
  if (out[0].err) console.log("ERR", out[0].err);
  for (const o of out) console.log(`${String(o.w).padStart(5)} px | canvas ${o.canvas} | axis ${o.axisWidth} | widest line ${o.widestLine} | fits ${o.fits} | wrapped ${o.wrapped} | ticks ${o.ticksShown}/${o.categories} | lines ${o.maxLines} in ${o.slot}px no overlap ${o.noOverlap} | errors ${o.errors}`);
  console.log('labels (joined):', JSON.stringify(out[0].labels));
  await b.close();
})();
