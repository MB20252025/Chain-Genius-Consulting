// Stage 3B Phase 2 completion (24 Nov 2026): where do the original Demand forecast chart and the new demand timeline put
// each month's actual demand and recorded forecast, when a product's history has missing months?
// Truth is read from the workbook's dated rows directly (SheetJS, not the engine). The original chart's SVG is parsed and
// every point's x position is converted back to a slot on its axis. Usage: node investigate-forecast-gaps.js <app-dir> <workbook>
const fs = require('fs'), path = require('path');
global.XLSX = require('xlsx'); global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
const [APP, WBF] = process.argv.slice(2), js = n => fs.readFileSync(path.join(APP, 'js', n), 'utf8');
const A = {};
new Function('XLSX', 'document', 'out', ['calculations.js', 'forecasting.js', 'app.js', 'excel-import.js', 'engine/engine-api.js', 'views/contract.js', 'views/areas.js'].map(js).join('\n') +
  ';out.go=wb=>{WB=wb;R=analyse();return R};out.tab=(k,s)=>{tab=k;fsku=s;return views[k]()};out.V=CGVM;')(XLSX, document, A);
const wb = XLSX.readFile(WBF, { cellDates: true }), R = A.go(wb), S = A.V.source();
// truth from the sheet itself
const raw = XLSX.utils.sheet_to_json(XLSX.readFile(WBF).Sheets['Demand History'], { defval: null, raw: true });
const cal = [...new Set(raw.map(r => r.Month_Start))].sort((a, b) => a - b);
const ym = serial => { const d = new Date(Date.UTC(1899, 11, 30) + serial * 864e5); return d.toISOString().slice(0, 7); };
const report = [];
for (const id of ['FG001', 'FG002', 'FG003', 'FG004', 'FG005', 'FG006', 'FG007']) {
  const mine = raw.filter(r => r.SKU === id), truth = cal.map(m => { const rs = mine.filter(r => r.Month_Start === m); return { month: ym(m), rows: rs.length, units: rs.map(r => r.Units_Sold), fc: rs.map(r => r.Forecast_Units) }; });
  const x = R.fg.find(y => y.id === id), F = S.fc[id];
  // original chart: parse
  const html = A.tab('Demand forecast', id), svg = html.slice(html.indexOf('<svg'), html.indexOf('</svg>'));
  const h = Array.isArray(x.hc) && x.hc.length >= x.h.length ? x.hc : x.h, n = h.length, N = n + 12, W = 640, p = 34, slot = X => Math.round((X - p) * (N - 1) / (W - 2 * p));
  const pts = colour => { const o = []; const re = new RegExp(`(?:<polyline[^>]*stroke="var\\(--${colour}\\)"[^>]*points="([^"]*)"|<circle cx="([\\d.]+)"[^>]*fill="var\\(--${colour}\\)")`, 'g'); let m; while ((m = re.exec(svg))) { if (m[1]) m[1].split(' ').forEach(q => o.push(slot(+q.split(',')[0]))); else o.push(slot(+m[2])); } return o; };
  const orig = { axis: h === x.hc ? 'calendar (x.hc)' : 'rows (x.h)', slots: n, actualSlots: pts('a'), recordedForecastSlots: pts('o'), recordedForecastDrawn: pts('o').length > 0, statisticalStartsAtSlot: Math.min(...pts('g')) };
  // new timeline
  const tl = A.V.forecastFor(S, id).find(v => v.id === 'df-chart');
  if (!tl) { report.push({ id, notForecast: true, ok: F && F.ok, n: F && F.n, truthMonths: truth.filter(t => t.rows).length, orig }); continue; }
  const lab = tl.labels.filter(l => l && typeof l === 'object').map(l => new Date(l.month));
  const series = Object.fromEntries(tl.series.map(s => [s.name, s.data]));
  const nw = lab.map((d, i) => ({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, actual: series['Actual demand'][i], recorded: series['Existing workbook forecast (recorded)'][i] }));
  report.push({ id, truth, engine: { months: R.months.length, h: x.h.length, hc: x.hc && x.hc.length, hd: x.hd.map(t => new Date(t).toISOString().slice(0, 10)), fc: x.fc }, orig, new: nw, statFirstLabel: tl.labels[lab.length] });
}
console.log(JSON.stringify(report, null, 1));
