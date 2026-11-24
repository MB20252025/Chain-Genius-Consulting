const fs = require('fs'), path = require('path'); global.XLSX = require('xlsx'); global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
const ROOT = process.argv[2], js = n => fs.readFileSync(path.join(ROOT, 'js', n), 'utf8');
const src = ['calculations.js', 'forecasting.js', 'app.js', 'excel-import.js', 'engine/engine-api.js', 'views/contract.js', 'views/areas.js'].map(js).join('\n'), A = {};
new Function('XLSX', 'document', 'out', src + ';out.go=wb=>{WB=wb;CFG.pol=0;R=analyse();CFG.pol=1;try{R.alt=analyse()}finally{CFG.pol=0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.V=CGVM;out.E=CGEngine;')(XLSX, document, A);
A.go(XLSX.readFile(process.argv[3], { cellDates: true }));
const t = f => { const a = performance.now(); f(); return performance.now() - a; }, med = a => a.sort((x, y) => x - y)[a.length >> 1];
const s = [], cu = []; for (let i = 0; i < 15; i++) { s.push(t(() => A.V.source())); cu.push(t(() => A.E.current())); }
// now visit heavy view-models like the screens do, then time source again
const S0 = A.V.source(); A.V.forSub(S0, 'planning', 'policy'); A.V.forSub(S0, 'planning', 'forecast'); A.V.forSub(S0, 'procurement', 'buy');
const s2 = []; for (let i = 0; i < 15; i++) s2.push(t(() => A.V.source()));
console.log(path.basename(ROOT), 'source median', med(s).toFixed(1), 'ms; current()', med(cu).toFixed(1), 'ms; source after heavy screens', med(s2).toFixed(1), 'ms');
