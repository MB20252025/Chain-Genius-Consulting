// Applies the 24 Nov 2026 chart correction (js/app.js chart(): defects A and B) to an older app.js, byte for byte as
// committed, so the S1–S11 refactor proofs can compare like with like: baseline + the same chart correction vs current.
// Usage: node apply-chart-correction.js <current app.js> <baseline app.js> <out app.js>
const fs = require('fs');
const [cur, base, out] = process.argv.slice(2), C = fs.readFileSync(cur, 'utf8'), B = fs.readFileSync(base, 'utf8');
const startC = C.indexOf('const chart=(x,F)=>'), endC = C.indexOf("views['Demand forecast']=", startC);
const startB = B.indexOf('const chart=(x,F)=>'), endB = B.indexOf("views['Demand forecast']=", startB);
if (startC < 0 || startB < 0 || endC < 0 || endB < 0) throw new Error('chart() not found');
fs.writeFileSync(out, B.slice(0, startB) + C.slice(startC, endC) + B.slice(endB));
console.log(`chart() replaced: ${endB - startB} -> ${endC - startC} characters`);
