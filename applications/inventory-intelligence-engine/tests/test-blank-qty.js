// Blank purchase-order quantities. Phases 1-3 CHARACTERISED the NaN defect here (one blank made a supplier High risk). Phase 3B applied the approved minimum safe fix, so these expectations now describe the CORRECTED behaviour:
// the blank line is left out of the quantity metrics only, the score is a real number, and no supplier becomes High risk because of a data fault.
// Findings: (1) one blank Received_Qty/Ordered_Qty on a scored (received) line makes that supplier's fill and score NaN; (2) NaN fails every ">=" cut-off, so the supplier is classed High risk
// ("Performance problem") even with 21 POs of evidence; (3) the screen shows "–" but the export carries NaN; (4) the "Missing values" flag works only for columns present in the FIRST data row;
// (5) a blank on an open (not yet received) line does not touch supplier scoring; (6) item risk classes are unaffected in this data.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n'),o={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link()};out.R=()=>R;out.html=k=>{tab=k;return views[k]()};out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,o);
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const mk=fn=>{const wb=XLSX.readFile(NS,{cellDates:true}),rows=XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true});fn(rows);wb.Sheets['Purchase Orders']=XLSX.utils.json_to_sheet(rows,{cellDates:true});return wb};
const sup8=rows=>rows.filter(q=>q.Received_Date&&q.Supplier_ID==='SUP008'),strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
o.go(mk(()=>{}));const B=o.R(),bHigh=B.supRisk.filter(s=>s.cat==='High risk').length,bItems=Object.fromEntries([...B.fg,...B.rm].map(x=>[x.id,x.sev+'|'+x.act])),b8=B.supRisk.find(s=>s.id==='SUP008');
ok(Number.isFinite(b8.score)&&b8.cat==='Medium risk','baseline: SUP008 has a finite score ('+b8.score.toFixed(1)+') and is Medium risk; '+bHigh+' suppliers are High risk');
for(const [col,label] of [['Received_Qty','blank Received_Qty'],['Ordered_Qty','blank Ordered_Qty']]){
 o.go(mk(r=>{delete sup8(r)[1][col]}));const R=o.R(),s=R.supRisk.find(x=>x.id==='SUP008');
 ok(Number.isFinite(s.score)&&Number.isFinite(s.fill)&&s.nFill===s.n-1&&s.invQ===1,label+' on one scored line of SUP008: score and fill are real numbers; exactly that line is left out of the quantity metrics');
 ok(s.cat==='Medium risk'&&s.evid==='Adequate'&&/^Some concern/.test(s.assess)&&/data problem/.test(s.assess),'...so SUP008 stays Medium risk (as before the edit) with a data-problem note, and is NOT classed High risk / "Performance problem"');
 ok(R.supRisk.filter(x=>x.cat==='High risk').length===bHigh,'...and the High-risk supplier count stays at '+bHigh);
 ok(R.dq.some(d=>d.msg==='Missing values in '+col&&d.sev==='Medium'),'...a Medium "Missing values in '+col+'" flag is raised (blank is not in the first data row)');
 const h=strip(o.html('Suppliers'));ok(!/NaN|undefined/.test(h)&&/SUP008 Summit Packaging Ltd \d+ Medium risk Adequate \(21 POs, 20 with valid quantities\)/.test(h),'...the Suppliers screen shows a real score, "Medium risk" and the evidence "21 POs, 20 with valid quantities" (no NaN text)');
 const e=o.exp(),row=XLSX.utils.sheet_to_json(e.Sheets.ENG_Suppliers).find(r=>Object.values(r).includes('SUP008'));ok(Number.isFinite(row.Score)&&Number.isFinite(row['Fill%'])&&row.Risk==='Medium risk'&&row.InvalidQuantityLines===1,'...the export carries a numeric Score and Fill%, Risk "Medium risk", InvalidQuantityLines 1');
 ok([...R.fg,...R.rm].every(x=>bItems[x.id]===x.sev+'|'+x.act),'...no item risk class or recommended action changes (Northstar data)')}
// blank in the FIRST data row: the column drops out of the missing-value check
o.go(mk(r=>{delete r[0].Received_Qty}));ok(o.R().dq.some(d=>/Missing values in Received_Qty/.test(d.msg)),'blank Received_Qty in the FIRST data row: the "Missing values" flag IS raised (corrected in Phase 3 item 2; before Phase 3 the check looked only at columns present in row 1)');
// blank on an open line
o.go(mk(r=>{const x=r.find(q=>!q.Received_Date);if(x)delete x.Ordered_Qty}));const Ro=o.R();ok(Ro.supRisk.every(s=>Number.isFinite(s.score)===Number.isFinite(B.supRisk.find(z=>z.id===s.id).score)&&(s.score==null||Math.abs(s.score-B.supRisk.find(z=>z.id===s.id).score)<1e-9)),'blank Ordered_Qty on an open (unreceived) line leaves every supplier score unchanged');
// every received line blank: no overall score can be calculated, but nobody is called a High-risk performer
o.go(mk(r=>r.forEach(x=>{delete x.Received_Qty})));const Ra=o.R();ok(Ra.supRisk.filter(s=>s.n>0).every(s=>s.score===null&&s.cat==='Not Assessed — Insufficient Evidence'&&s.reason==='Data problem'&&Number.isFinite(s.otd)),'every Received_Qty blank: every supplier with received POs has a null score, the exact state "Not Assessed — Insufficient Evidence", reason Data problem and a valid on-time rate ('+Ra.supRisk.filter(s=>s.n>0).length+')');
ok(!Ra.supRisk.some(s=>s.cat==='High risk')&&!JSON.stringify(Ra.sup,(k,v)=>typeof v==='number'&&!isFinite(v)?'NaN':v).includes('"NaN"'),'...and no supplier is High risk and no supplier result contains NaN');
console.log(`test-blank-qty: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
