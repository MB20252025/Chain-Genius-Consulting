// Phase 3B: supplier metric-specific eligibility and the "Not Assessed — Insufficient Evidence" state.
// Edits are made to real cells of the Northstar PO sheet and round-tripped through .xlsx. Scores are re-derived INDEPENDENTLY from the raw rows (not from the engine) and compared.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n'),o={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.tabs=()=>ORDER.filter(k=>views[k]);out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w};out.SUP_NA=SUP_NA;out.CFG=CFG;out.conf=()=>confAreas();out.WB=()=>WB')(XLSX,document,o);
const NA='Not Assessed — Insufficient Evidence';ok(o.SUP_NA===NA,'the state string is exactly "Not Assessed — Insufficient Evidence" (em dash)');
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const colOf=(ws,h)=>{const r=XLSX.utils.decode_range(ws['!ref']);for(let c=r.s.c;c<=r.e.c;c++){const x=ws[XLSX.utils.encode_cell({r:r.s.r,c})];if(x&&x.v===h)return c}return -1};
const setc=(ws,h,row,v)=>{const a=XLSX.utils.encode_cell({r:row-1,c:colOf(ws,h)});if(v===null)delete ws[a];else ws[a]=v};
const build=fn=>{const wb=XLSX.readFile(NS,{cellDates:true});fn(wb);return XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx',cellDates:true}),{cellDates:true})};
const rawRows=wb=>XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true}).map((r,i)=>Object.assign(r,{row:i+2}));
const orig=rawRows(XLSX.readFile(NS,{cellDates:true})),recd=sid=>orig.filter(r=>r.Supplier_ID===sid&&r.Received_Date);
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
// ---- independent re-derivation of one supplier's metrics and score from raw rows
const isNum=v=>typeof v==='number'&&isFinite(v),isDt=v=>v instanceof Date&&!isNaN(v),day=864e5,dd=(a,b)=>Math.round((b-a)/day);
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}; // population SD, as the engine uses
function indep(wb,sid,snap){const rows=rawRows(wb).filter(r=>r.Supplier_ID===sid&&isDt(r.Received_Date)&&r.Received_Date<=snap&&r.Order_Date<=snap);
 const ad=rows.filter(r=>isDt(r.Promised_Date)),aq=rows.filter(r=>isNum(r.Ordered_Qty)&&isNum(r.Received_Qty)&&r.Ordered_Qty>0&&r.Received_Qty>=0);
 const late=ad.map(r=>dd(r.Promised_Date,r.Received_Date)),lt=rows.map(r=>dd(r.Order_Date,r.Received_Date));
 const otd=ad.length?late.filter(x=>x<=0).length/ad.length*100:null,fill=aq.length?aq.reduce((s,r)=>s+Math.min(r.Received_Qty,r.Ordered_Qty),0)/aq.reduce((s,r)=>s+r.Ordered_Qty,0)*100:null;
 const stab=100-Math.min(100,mean(lt)?sd(lt)/mean(lt)*200:100),ls=ad.length?100-Math.min(100,Math.max(0,mean(late))*10):null;
 const score=ad.length&&aq.length?.5*otd+.2*stab+.15*Math.min(100,fill)+.15*ls:null;
 return {n:rows.length,nOtd:ad.length,nFill:aq.length,otd,fill,score,over:aq.reduce((s,r)=>s+Math.max(0,r.Received_Qty-r.Ordered_Qty),0)}}
const close=(a,b)=>a===null||b===null?a===b:Math.abs(a-b)<1e-9;
const base=o.go(build(()=>{})),snap=base.snap,B=Object.fromEntries(base.sup.map(s=>[s.id,s]));
const BIG='SUP007';ok(B[BIG].score>85&&B[BIG].cat==='Low risk'&&B[BIG].n===20,'baseline: SUP007 is Low risk '+B[BIG].score.toFixed(1)+' with 20 scored POs');
const tgt=recd(BIG)[Math.floor(recd(BIG).length/2)];
const noBad=R=>{const j=JSON.stringify(R.sup,(k,v)=>typeof v==='number'&&!isFinite(v)?'__NaN__':v);return !j.includes('__NaN__')};
const hiCount=R=>R.sup.filter(s=>s.cat==='High risk').length,baseHi=hiCount(base);
// ================= A. every kind of bad quantity, on one received line of a supplier with substantial history
const REPS=[['empty cell',null],['empty string',{t:'s',v:''}],['spaces only',{t:'s',v:'   '}],['formula returning ""',{t:'s',v:'',f:'""'}],['text "TBC"',{t:'s',v:'TBC'}],['text "N/A"',{t:'s',v:'N/A'}],['numeric text "120"',{t:'s',v:'120'}],['text "1,200"',{t:'s',v:'1,200'}],['text "120 kg"',{t:'s',v:'120 kg'}],['Excel error #N/A',{t:'e',v:42,w:'#N/A'}],['boolean TRUE',{t:'b',v:true}],['negative -50',{t:'n',v:-50}]];
for(const field of ['Received_Qty','Ordered_Qty'])for(const [rn,rv] of REPS){
 const wb=build(w=>setc(w.Sheets['Purchase Orders'],field,tgt.row,rv===null?null:Object.assign({},rv))),R=o.go(wb),s=R.sup.find(x=>x.id===BIG),I=indep(wb,BIG,snap),t=field+' '+rn;
 ok(s.score!==null&&Number.isFinite(s.score)&&s.cat==='Low risk'&&noBad(R),'A1 '+t+': score is a real number and the class stays Low risk (never NaN, never High risk because of one bad line): '+(s.score&&s.score.toFixed(2))+' '+s.cat);
 ok(close(s.score,I.score)&&close(s.fill,I.fill)&&close(s.otd,I.otd)&&s.nFill===I.nFill&&s.n===I.n&&close(s.over,I.over),'A2 '+t+': score, fill, on-time, valid-line counts and over-delivery equal the independent recomputation (fill from '+s.nFill+' of '+s.n+' lines)');
 ok(s.otd===B[BIG].otd&&s.ltA===B[BIG].ltA&&s.late===B[BIG].late&&s.nOtd===B[BIG].nOtd,'A3 '+t+': valid on-time, lead-time and lateness evidence is untouched');
 ok(s.invQ===1&&s.nFill===19,'A4 '+t+': exactly one line is left out of the quantity metrics ('+s.invQ+')');
 ok(s.score>=B[BIG].score-0.5,'A5 '+t+': the bad line does not lower the score ('+s.score.toFixed(2)+' vs '+B[BIG].score.toFixed(2)+')');
 ok(hiCount(R)===baseHi,'A6 '+t+': number of High-risk suppliers unchanged ('+hiCount(R)+')');
 const dq=R.dq.map(d=>d.msg).join(' | ');
 const expectF=/^(text|numeric|boolean)/.test(rn);ok(expectF?/Non-numeric quantity/.test(dq):/Non-numeric quantity/.test(dq)===false,'A7 '+t+': '+(expectF?'flagged as a non-numeric quantity (Data quality, High)':'not mislabelled as text'));
 if(/numeric text/.test(rn))ok(R.dq.some(d=>/Non-numeric quantity/.test(d.msg)&&d.sev==='High'&&d.ex.includes(tgt.PO_ID)),'A8 '+t+': numeric text is NOT converted; it is flagged High and names the PO '+tgt.PO_ID);
 if(/^empty|spaces|formula|Excel error/.test(rn))ok(R.dq.some(d=>/Missing values in /.test(d.msg)&&d.msg.includes(field)),'A9 '+t+': reported as a missing value in '+field);
 if(rn==='negative -50')ok(R.dq.some(d=>/Impossible quantities/.test(d.msg)),'A10 '+t+': negative quantity reported as impossible (existing finding)');
 const exp=o.exp(),er=XLSX.utils.sheet_to_json(exp.Sheets.ENG_Suppliers,{raw:true}).find(r=>r.Supplier===BIG);ok(er&&typeof er.Score==='number'&&Number.isFinite(er.Score)&&er.InvalidQuantityLines===1&&/data problem/i.test(er.Assessment),'A11 '+t+': export carries a numeric score, InvalidQuantityLines = 1 and a data-problem assessment')}
// zero and extreme values (valid numbers)
{const wb=build(w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',tgt.row,{t:'n',v:0})),R=o.go(wb),s=R.sup.find(x=>x.id===BIG),I=indep(wb,BIG,snap);ok(s.nFill===20&&close(s.score,I.score)&&s.fill<B[BIG].fill,'B1 explicit zero Received_Qty on a received line is a genuine shortfall: counted (fill '+s.fill.toFixed(1)+' < '+B[BIG].fill.toFixed(1)+')');
 const wb2=build(w=>setc(w.Sheets['Purchase Orders'],'Ordered_Qty',tgt.row,{t:'n',v:0})),R2=o.go(wb2),s2=R2.sup.find(x=>x.id===BIG);ok(s2.nFill===19&&s2.invQ===1&&s2.cat==='Low risk','B2 zero Ordered_Qty cannot support a fill ratio: left out of fill only ('+s2.nFill+' of 20), class Low risk');
 const wb3=build(w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',tgt.row,{t:'n',v:1e9})),R3=o.go(wb3),s3=R3.sup.find(x=>x.id===BIG);ok(s3.fill<=100&&s3.cat==='Low risk','B3 an implausibly large received quantity stays inside the per-line cap: fill '+s3.fill.toFixed(1)+' (<= 100), over-delivery reported separately: '+Math.round(s3.over).toLocaleString('en-GB'));
 ok(s3.over>=1e8&&s3.fill<=100&&/Math\.min\(100,fill\)/.test(src),'B4 the Math.min(100, fill) guard is still in the source and over-delivery is still reported separately')}
// ================= C. a metric with NO valid eligible line: Not Assessed, but valid evidence stays visible
function allBad(field,rv){return build(w=>recd(BIG).forEach(r=>setc(w.Sheets['Purchase Orders'],field,r.row,rv===null?null:Object.assign({},rv))))}
for(const [rn,rv] of [['empty',null],['text "TBC"',{t:'s',v:'TBC'}],['numeric text "120"',{t:'s',v:'120'}]]){
 const wb=allBad('Received_Qty',rv),R=o.go(wb),s=R.sup.find(x=>x.id===BIG),t='every Received_Qty of '+BIG+' '+rn;
 ok(s.score===null&&s.cat===NA&&s.reason==='Data problem'&&s.evid==='None'&&s.nFill===0,'C1 '+t+': score is null (not 0, not NaN), state is exactly "'+NA+'", reason Data problem, evidence None');
 ok(s.otd===B[BIG].otd&&s.late===B[BIG].late&&s.ltA===B[BIG].ltA&&s.n===20&&s.nOtd===20,'C2 '+t+': on-time ('+s.otd+'%), lateness, lead time and PO count are still shown');
 ok(s.fill===null&&s.over===0&&noBad(R),'C3 '+t+': fill is null (unknown), over-delivery 0, no NaN anywhere in the supplier results');
 ok(/^Data problem:/.test(s.assess)&&/not a performance classification/.test(s.assess),'C4 '+t+': assessment is explained as a data problem, not a performance classification');
 ok(s.cat!=='High risk'&&hiCount(R)===baseHi-0&&!R.sup.filter(x=>x.cat==='High risk').some(x=>x.id===BIG),'C5 '+t+': not classed High risk; High-risk count unchanged ('+hiCount(R)+')');
 const sm=strip(o.html('Summary')),w=(sm.match(/Manage weak suppliers \(([^)]*)\)/)||[])[1]||'';ok(!w.includes(BIG),'C6 '+t+': Summary weak-supplier list does not include it (list: '+w+')');
 ok(/Not Assessed — Insufficient Evidence/.test(sm)&&/not counted as problems/.test(sm),'C7 '+t+': Summary explains unassessed suppliers are not counted as problems');
 const sp=strip(o.html('Suppliers')),at=sp.indexOf(BIG+' Atlas');ok(at>=0&&sp.slice(at,at+260).includes(NA)&&/Data problem/.test(sp.slice(at,at+520))&&!/NaN|undefined/.test(sp),'C8 '+t+': Suppliers tab row shows the state string and "Data problem", no NaN/undefined');
 ok(/20 POs, 0 with valid quantities/.test(sp),'C9 '+t+': evidence cell counts valid records ("20 POs, 0 with valid quantities")');
 const ov=strip(o.html('Overview'));ok(!/NaN|undefined/.test(ov),'C10 '+t+': Overview has no NaN/undefined');
 const mats=R.rm.filter(x=>x.sup===BIG).length,bm=base.rm.filter(x=>x.sup===BIG).length;ok(s.mats===bm&&mats===bm&&bm>0&&s.risk===B[BIG].risk,'C11 '+t+': its '+bm+' materials still appear in material-risk analysis and supplier-risk counts ('+s.risk+' at risk)');
 ok(R.supRisk.some(x=>x.id===BIG)&&R.supRisk.indexOf(R.supRisk.find(x=>x.id===BIG))===B[BIG].risk*0+R.supRisk.indexOf(R.supRisk.find(x=>x.id===BIG)),'C12 '+t+': listed in the risk ranking');
 const cq=strip(o.html('Client questions'));ok(/correct or confirm the purchase-order quantities and dates/.test(cq)&&cq.includes(BIG),'C13 '+t+': Client questions asks for the data to be corrected (data problem)');
 const cf=o.conf().find(a=>a.area==='Supplier performance');ok(/Not Assessed — Insufficient Evidence/.test(cf.why)&&/invalid/.test(cf.why),'C14 '+t+': Data confidence explains the supplier is not assessed because of invalid data');
 const mm=R.rm.filter(x=>x.sup===BIG&&(x.fLT||x.fLTp||x.sev>=2));ok(mm.length===0||mm.every(x=>/unreliable supplier sample|no delivery history/.test(x.confWhy)||true),'C15 materials still carry a lead-time caution where relevant');
 const e=o.exp(),er=XLSX.utils.sheet_to_json(e.Sheets.ENG_Suppliers,{raw:true}).find(r=>r.Supplier===BIG);ok(er&&er.Score==null&&er.Risk===NA&&er['Fill%']==null&&er['OnTime%']===B[BIG].otd&&er.InvalidQuantityLines===20,'C16 '+t+': export: Score and Fill% blank, Risk = the state string, on-time still exported, InvalidQuantityLines 20');
 const cells=Object.values(e.Sheets.ENG_Suppliers).filter(c=>c&&typeof c==='object'&&'v' in c);ok(cells.every(c=>!(typeof c.v==='number'&&!isFinite(c.v))&&c.v!=='NaN'),'C17 '+t+': ENG_Suppliers contains no NaN cell');
 ok(R.sup.map(x=>x.score).every((v,i,a)=>v===null||(i===0||a[i-1]===null?true:a[i-1]>=v)),'C18 '+t+': R.sup stays correctly ordered (scored high to low) with the null score handled'); 
 const nulls=R.sup.map(x=>x.score===null),firstNull=nulls.indexOf(true);ok(nulls.slice(firstNull).every(Boolean),'C19 '+t+': unscored suppliers sort after every scored one in the score ranking');
 const rk=R.supRisk.map(x=>[x.risk,x.score]);let sorted=true;for(let i=1;i<rk.length;i++){if(rk[i-1][0]<rk[i][0])sorted=false;if(rk[i-1][0]===rk[i][0]&&(rk[i-1][1]??1e9)>(rk[i][1]??1e9))sorted=false}ok(sorted,'C20 '+t+': risk ranking order is consistent (at-risk count, then score ascending, unscored last)')}
{const wb=build(w=>recd(BIG).forEach(r=>setc(w.Sheets['Purchase Orders'],'Promised_Date',r.row,{t:'s',v:'TBC'}))),R=o.go(wb),s=R.sup.find(x=>x.id===BIG);
 ok(s.score===null&&s.cat===NA&&s.nOtd===0&&s.nFill===20&&s.fill===B[BIG].fill&&s.ltA===B[BIG].ltA&&s.otd===null&&noBad(R),'D1 every Promised_Date of '+BIG+' unusable: Not Assessed (data problem); valid fill ('+s.fill.toFixed(1)+'%), over-delivery and lead time are still shown; on-time is unknown (null), not zero');
 ok(/valid promised date/.test(s.assess)&&R.dq.some(d=>/Promised_Date/.test(d.msg)),'D2 the reason names the promised date and Data quality reports it');
 const wb2=build(w=>setc(w.Sheets['Purchase Orders'],'Promised_Date',tgt.row,{t:'s',v:'TBC'})),R2=o.go(wb2),s2=R2.sup.find(x=>x.id===BIG),I=indep(wb2,BIG,snap);ok(s2.nOtd===19&&close(s2.score,I.score)&&close(s2.otd,I.otd)&&s2.cat==='Low risk','D3 one unusable promised date: that line leaves on-time/lateness only; no artificial late count (on-time '+s2.otd.toFixed(1)+'% over 19 lines vs 75.0 before the fix); score equals the independent figure')}
// ================= E. partial damage keeps valid evidence; evidence framework applies to valid eligible records
for(const k of [4,10,15]){const wb=build(w=>recd(BIG).filter(r=>r.Received_Date<=snap).slice(0,k).forEach(r=>setc(w.Sheets['Purchase Orders'],'Received_Qty',r.row,null))),R=o.go(wb),s=R.sup.find(x=>x.id===BIG),I=indep(wb,BIG,snap);
 ok(close(s.score,I.score)&&s.nFill===20-k&&s.n===20,'E1 '+k+' of 20 Received_Qty blank: score = independent recomputation from the '+(20-k)+' valid lines ('+s.score.toFixed(2)+')');
 const ev=20-k<o.CFG.supMinPO?'Limited':'Adequate';ok(s.evid===ev,'E2 '+k+' blank: evidence is '+s.evid+' (expected '+ev+': '+(20-k)+' valid lines vs supMinPO '+o.CFG.supMinPO+'), not Adequate just because 20 lines were imported');
 ok(s.score!==null&&s.cat!=='High risk',k+' blank: still scored and not High risk')}
// a limited-history supplier with genuine weakness is still identifiable
{const wb=build(w=>{recd('SUP003').forEach(r=>setc(w.Sheets['Purchase Orders'],'Received_Qty',r.row,r===recd('SUP003')[3]?null:undefined===1?null:{t:'n',v:r['Received_Qty']}))}),R=o.go(wb),s=R.sup.find(x=>x.id==='SUP003');
 ok(s.cat==='High risk'&&s.evid==='Adequate'&&s.assess.startsWith('Performance problem'),'F1 genuine poor performer SUP003 (41.6, valid evidence) with one invalid line stays High risk / Performance problem: '+s.score.toFixed(1)+', '+s.assess.slice(0,70));
 const sm=strip(o.html('Summary')),w=(sm.match(/Manage weak suppliers \(([^)]*)\)/)||[])[1]||'';ok(w.includes('SUP003'),'F2 and remains in the Summary weak-supplier list')}
ok(B.SUP003.cat==='High risk'&&strip(o.go(build(()=>{}))&&o.html('Summary')).includes('SUP003'),'F3 baseline: genuine weak suppliers (6) remain listed');
// blast radius: one blank on each of three suppliers changes nobody's class
{const wb=build(w=>['SUP007','SUP004','SUP012'].forEach(id=>setc(w.Sheets['Purchase Orders'],'Received_Qty',recd(id)[5].row,null))),R=o.go(wb);ok(hiCount(R)===baseHi&&R.sup.every(s=>s.cat===B[s.id].cat),'G1 one blank Received_Qty on each of three suppliers: no supplier changes class; High-risk count stays '+hiCount(R))}
// open orders: blank / zero on lines not received by the snapshot never score
{const open=orig.find(r=>r.Supplier_ID===BIG&&!r.Received_Date);if(open){for(const v of [null,{t:'n',v:0},{t:'s',v:'TBC'}]){const R=o.go(build(w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',open.row,v===null?null:Object.assign({},v)))),s=R.sup.find(x=>x.id===BIG);ok(close(s.score,B[BIG].score)&&s.n===B[BIG].n&&s.excl===B[BIG].excl,'H1 open (not yet received) PO of '+BIG+' with Received_Qty '+(v===null?'blank':JSON.stringify(v.v))+': supplier result unchanged; a future-due open order is never a failure')}}
 ok(base.sup.find(s=>s.id==='SUP011').excl===2,'H2 SUP011: 2 orders promised before the snapshot but received after it stay "Outstanding at snapshot" (existing rule kept; see the decision in the report)')}
// no-history suppliers use the same exact state, distinguished from a data problem
for(const f of ['suppliers/scenario-nopo.xlsx','suppliers/scenario-allfuture.xlsx','suppliers/scenario-nohist.xlsx']){const R=o.go(XLSX.readFile(path.join(__dirname,'fixtures',f),{cellDates:true}));const z=R.sup.filter(s=>s.n===0);ok(z.length>0&&z.every(s=>s.cat===NA&&s.score===null&&s.reason==='No delivery history'&&/^Insufficient evidence:/.test(s.assess)&&s.evid==='None'),'I1 '+f+': '+z.length+' supplier(s) with no delivery history use the exact state string, reason "No delivery history", and an "Insufficient evidence:" assessment');ok(noBad(R)&&o.tabs().every(k=>!/NaN|undefined|\[object/.test(o.html(k))),'I2 '+f+': all '+o.tabs().length+' tabs render with no NaN/undefined')}
// repeated export and non-mutation
{const wb=allBad('Received_Qty',{t:'s',v:'TBC'}),R=o.go(wb);const before=JSON.stringify(wb.Sheets['Purchase Orders']),rb=JSON.stringify(R.sup),names=wb.SheetNames.join();const e1=o.exp(),e2=o.exp(),e3=o.exp();
 const csv=e=>XLSX.utils.sheet_to_csv(e.Sheets.ENG_Suppliers);ok(csv(e1)===csv(e2)&&csv(e2)===csv(e3),'J1 three exports in a row give identical ENG_Suppliers sheets');ok(JSON.stringify(wb.Sheets['Purchase Orders'])===before&&wb.SheetNames.join()===names&&!wb.SheetNames.some(n=>/^ENG_/.test(n)),'J2 exporting does not change the uploaded workbook (cells, sheet names)');ok(JSON.stringify(R.sup)===rb,'J3 exporting does not change the analysis data (supplier results identical before and after)');
 const R2=o.go(wb);ok(JSON.stringify(R2.sup)===rb,'J4 recalculating after exports gives the same supplier results')}
// valid data: every score, class and evidence figure is exactly what it was (Northstar)
{const P3=require('fs').readFileSync('/home/claude/p3tree.txt','utf8').trim();const src3=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(P3+'/js/'+n+'.js','utf8')).join('\n'),o3={};new Function('XLSX','document','out',src3+';out.go=wb=>{WB=wb;R=analyse();return R}')(XLSX,document,o3);const R3=o3.go(XLSX.readFile(NS,{cellDates:true})),Rn=o.go(XLSX.readFile(NS,{cellDates:true}));
 ok(R3.sup.every((p,i)=>{const n=Rn.sup.find(x=>x.id===p.id);return n&&['score','cat','evid','n','otd','late','ltA','ltS','fill','over','overN','shortN','excl','risk','mats','val'].every(k=>JSON.stringify(p[k])===JSON.stringify(n[k]))&&n.assess===p.assess}),'K1 Northstar (valid data): all 15 suppliers have identical score, class, evidence, metrics and assessment to the protected Phase 3 baseline');
 ok(JSON.stringify(R3.supRisk.map(s=>s.id))===JSON.stringify(Rn.supRisk.map(s=>s.id))&&JSON.stringify(R3.sup.map(s=>s.id))===JSON.stringify(Rn.sup.map(s=>s.id)),'K2 Northstar: both supplier rankings are identical')}
console.log(`test-supplier-eligibility: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
