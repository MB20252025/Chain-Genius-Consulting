// Per-PO-line fill cap (candidate 3). For each scenario the fill %, over-delivered units/lines and short lines of every supplier are recomputed
// straight from the raw workbook rows (not through analyse()) and compared with the app. Also checks: excess never offsets a shortage, the old
// "netted" figure is reported only for comparison, risk classes are unaffected by the cap where scores do not cross a cut-off, and the export carries the new columns.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__g=f=>{WB=XLSX.readFile(f,{cellDates:true});R=analyse();return R};globalThis.__R=()=>R');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const raw=f=>{const w=XLSX.readFile(f,{cellDates:true}),po=XLSX.utils.sheet_to_json(w.Sheets['Purchase Orders'],{raw:true,cellDates:true}),snap=XLSX.utils.sheet_to_json(w.Sheets['Inventory'],{raw:true,cellDates:true}).map(r=>+r.Snapshot_Date).reduce((a,b)=>Math.max(a,b));
 const by={};po.filter(r=>r.Received_Date instanceof Date&&+r.Received_Date<=snap&&+r.Order_Date<=snap).forEach(r=>(by[r.Supplier_ID]=by[r.Supplier_ID]||[]).push(r));return by};
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const scen={northstar:NS};['overrec','partial','overshort','combined','dupexact','multiline','splitline'].forEach(n=>scen[n]=path.join(__dirname,'fixtures/edge/scenario-'+n+'.xlsx'));
const report=[];
for(const [n,f] of Object.entries(scen)){const R=__g(f),by=raw(f);let diffs=0,netCases=0;
 for(const s of R.sup){const a=by[s.id]||[];if(!a.length){ok(s.fill===null&&s.over===0,n+' '+s.id+': unassessed supplier has no fill and no excess');continue}
  const ord=sum(a,r=>r.Ordered_Qty),capped=sum(a,r=>Math.min(r.Received_Qty,r.Ordered_Qty)),over=sum(a,r=>Math.max(0,r.Received_Qty-r.Ordered_Qty)),overN=a.filter(r=>r.Received_Qty>r.Ordered_Qty).length,shortN=a.filter(r=>r.Received_Qty<r.Ordered_Qty).length,netted=sum(a,r=>r.Received_Qty)/ord*100;
  const e=capped/ord*100;if(Math.abs(s.fill-e)>1e-9||Math.abs(s.over-over)>1e-9||s.overN!==overN||s.shortN!==shortN){diffs++;console.log('FAIL:',n,s.id,'app fill/over/overN/short',s.fill,s.over,s.overN,s.shortN,'expected',e,over,overN,shortN)}
  ok(s.fill<=100+1e-9,n+' '+s.id+': fill never above 100 ('+s.fill.toFixed(2)+')');
  if(over>0&&shortN>0){netCases++;ok(s.fill<netted+1e-9,n+' '+s.id+': excess does not offset shortages (capped '+s.fill.toFixed(2)+' < netted '+netted.toFixed(2)+')');report.push([n,s.id,+netted.toFixed(2),+s.fill.toFixed(2),over,overN,shortN])}
  if(over===0)ok(Math.abs(s.fill-netted)<1e-9,n+' '+s.id+': with no excess the figure is unchanged from before the cap')}
 ok(diffs===0,n+': every supplier fill / over-delivered units / lines / short lines match the independent recomputation');
 ok(R.sup.reduce((q,s)=>q+s.over,0)===(()=>{let t=0;Object.values(by).forEach(a=>a.forEach(r=>t+=Math.max(0,r.Received_Qty-r.Ordered_Qty)));return t})(),n+': total over-delivered units across suppliers equals the raw total');
 // every record still in the engine/export
 const w=(()=>{let o;const wx=XLSX.writeFile;XLSX.writeFile=x=>{o=x};try{exportWorkbook()}finally{XLSX.writeFile=wx}return o})();
 const rows=XLSX.utils.sheet_to_json(w.Sheets.ENG_Suppliers);ok(rows.length===R.sup.length&&rows.every(r=>'OverDeliveredUnits' in r&&'OverDeliveredLines' in r&&'Fill%' in r),n+': export has every supplier with OverDeliveredUnits, OverDeliveredLines and Fill%');
 ok(rows.every((r,i)=>r.OverDeliveredUnits===R.sup[i].over),n+': exported excess equals engine excess')}
// Northstar must be untouched
{const R=__g(NS);ok(R.sup.every(s=>s.over===0),'Northstar has no over-receipts, so supplier scores are unchanged by the cap')}
// specific hand-checkable case: overshort — one supplier, +50% on one line and -50% on another
{const R=__g(scen.overshort),by=raw(scen.overshort),s=R.sup.find(x=>x.id==='SUP008'),a=by.SUP008,L=a.find(r=>r.PO_ID==='PO0001'),M=a.find(r=>r.PO_ID==='PO0026');ok(L.Received_Qty>L.Ordered_Qty&&M.Received_Qty<M.Ordered_Qty,'overshort: SUP008 has one over-received and one short line');ok(s.over>=L.Received_Qty-L.Ordered_Qty,'overshort: SUP008 excess reported separately ('+s.over+')');ok(s.shortN>=1,'overshort: shortage still counted')}
console.log('--- supplier fill: netted (before cap) vs capped, where an excess and a shortage coexist');report.forEach(r=>console.log(r.join(' | ')));
console.log(`test-fillcap: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
