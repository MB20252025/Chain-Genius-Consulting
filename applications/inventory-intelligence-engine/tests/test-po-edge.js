// Regression test: duplicate POs and received quantity above ordered. Asserts current, documented behaviour (including limitations).
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),NS=process.env.NORTHSTAR_XLSX||path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(path.join(ROOT,'js',n+'.js'),'utf8')).join('\n');
eval(src+';globalThis.G=f=>{WB=XLSX.readFile(f,{cellDates:true});R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}return R};globalThis.CONF=()=>confAreas();globalThis.V=views;globalThis.ORD=ORDER');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const E=n=>path.join(__dirname,'fixtures/edge/scenario-'+n+'.xlsx'),dq=(R,re,sev)=>R.dq.filter(d=>d.sheet==='Purchase Orders'&&re.test(d.msg)&&(!sev||d.sev===sev)),sp=()=>CONF().find(a=>a.area==='Supplier performance');
const base=G(NS),bsup=Object.fromEntries(base.sup.map(s=>[s.id,s])),bPC=JSON.parse(JSON.stringify(base.po.PC)),bOut=base.po.snap;
ok(sp().rating==='High'&&!/purchase-order data problem/.test(sp().why),'Northstar baseline: supplier-performance confidence stays High, no PO data warning');
ok(dq(base,/Duplicate records|Impossible quantities|Possible duplicate/).length===0,'Northstar baseline: no duplicate or impossible-quantity PO flags');
const noBad=R=>ORD.every(k=>{const h=V[k]().replace(/<[^>]+>/g,' ');return h.length>20&&!/undefined|NaN|\[object|Infinity/.test(h)});
// A: exact duplicate rows
{const R=G(E('dupexact'));const d=dq(R,/Duplicate records/,'High');ok(d.length===1&&['PO0001','PO0002','PO0003'].every(i=>d[0].ex.includes(i)),'dupexact: High "Duplicate records" lists PO0001, PO0002, PO0003');
 ok(dq(R,/Possible duplicate POs/).length===0,'dupexact: not additionally listed as "possible duplicate" (same PO number; the High flag covers it)');
 ok(R.po.PC.rec.n===bPC.rec.n+2&&R.po.PC.fut.n===bPC.fut.n+1,'dupexact: duplicate rows are COUNTED (limitation): received '+bPC.rec.n+'->'+R.po.PC.rec.n+', future-dated '+bPC.fut.n+'->'+R.po.PC.fut.n);
 ok(R.po.snap===bOut+50,'dupexact: outstanding-at-snapshot quantity is double counted by the duplicated 50 (limitation): '+bOut+'->'+R.po.snap);
 ok(R.sup.find(s=>s.id==='SUP015').n===bsup.SUP015.n+1&&R.sup.find(s=>s.id==='SUP008').n===bsup.SUP008.n+1,'dupexact: duplicated received POs add to the supplier\'s scored PO count (limitation)');
 ok(sp().rating==='Medium'&&/purchase-order data problem/.test(sp().why),'dupexact: supplier-performance confidence capped at Medium with explanation');ok(noBad(R),'dupexact: all 17 views render without undefined/NaN/Infinity')}
// B: same order re-keyed under a new PO_ID
{const R=G(E('dupkey'));const d=dq(R,/Possible duplicate POs/,'Medium');ok(d.length===1&&['PO0004-DUP0','PO0005-DUP1','PO0030-DUP2'].every(i=>d[0].ex.includes(i)),'dupkey: Medium "Possible duplicate POs" lists the three re-keyed POs');
 ok(dq(R,/Duplicate records/).length===0,'dupkey: not reported as definite duplicate IDs (the PO numbers differ)');
 ok(R.po.snap===bOut+75,'dupkey: re-keyed open PO is counted (limitation): '+bOut+'->'+R.po.snap);ok(sp().rating==='High','dupkey: confidence unchanged (only a possible duplicate, which may be a genuine repeat order; limitation)');ok(noBad(R),'dupkey: all views render cleanly')}
// C: received above ordered
{const R=G(E('overrec'));const d=dq(R,/Impossible quantities/,'High');ok(d.length===1&&['PO0001','PO0002','PO0004','PO0005'].every(i=>d[0].ex.includes(i)),'overrec: High "Impossible quantities" lists the four POs');
 ok(R.sup.every(s=>s.score==null||(s.score>=0&&s.score<=100)),'overrec: no supplier score outside 0-100 (fill rate is capped at 100 inside the score)');
 const s6=R.sup.find(s=>s.id==='SUP006');ok(s6.fill<=100&&s6.over>0,'overrec: SUP006 fill % is capped per PO line ('+s6.fill.toFixed(1)+'%) and its excess ('+s6.over+' units) is reported separately; the PO is flagged (candidate 3 change: candidate 2 showed 104.1% because excess netted against shortfalls)');
 ok(R.po.PC.rec.n===bPC.rec.n&&R.po.snap===bOut,'overrec: PO classification and outstanding quantity unchanged');ok(sp().rating==='Medium'&&/purchase-order data problem/.test(sp().why),'overrec: confidence capped at Medium with explanation');ok(noBad(R),'overrec: all views render cleanly')}
// D: legitimate multi-line POs (same supplier, different materials, one PO number)
{const R=G(E('multiline'));ok(dq(R,/Duplicate records/).length===0,'multiline: NOT flagged as duplicate records');const m=dq(R,/carry lines for more than one material/,'Low');ok(m.length===1&&['PO0001','PO0002','PO0004'].every(i=>m[0].ex.includes(i)),'multiline: Low information note lists the shared PO numbers');
 ok(dq(R,/Possible duplicate|One PO number|Same PO number/).length===0,'multiline: no other PO-number warnings');ok(R.sup.every(s=>{const b=bsup[s.id];return b&&b.n===s.n&&Math.abs((b.score||0)-(s.score||0))<1e-9}),'multiline: every supplier statistic identical to Northstar (the data is the same, only the PO numbers are shared)');
 ok(sp().rating==='High','multiline: supplier-performance confidence stays High');ok(R.po.PC.rec.n===bPC.rec.n&&R.po.snap===bOut,'multiline: PO classification and outstanding quantity unchanged');ok(noBad(R),'multiline: all views render cleanly')}
// E: split delivery inside one PO number
{const R=G(E('splitline'));const d=dq(R,/Same PO number and material/,'Medium');ok(d.length===1&&d[0].ex.includes('PO0001'),'splitline: Medium "same PO number and material, different details" lists PO0001');ok(dq(R,/Duplicate records/).length===0&&dq(R,/Possible duplicate/).length===0,'splitline: not reported as duplicate');
 ok(R.sup.find(s=>s.id==='SUP008').n===bsup.SUP008.n+1,'splitline: the two lines count as two received lines for the supplier (documented: statistics are per line)');ok(sp().rating==='High','splitline: confidence unchanged');ok(noBad(R),'splitline: views render cleanly')}
// F: one PO number, two suppliers
{const R=G(E('posupconflict'));const d=dq(R,/more than one supplier/,'Medium');ok(d.length===1&&d[0].ex.includes('PO0001'),'posupconflict: Medium "more than one supplier" lists PO0001');ok(dq(R,/Duplicate records/).length===0,'posupconflict: not mislabelled as duplicate records');ok(noBad(R),'posupconflict: views render cleanly')}
console.log(`test-po-edge: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
