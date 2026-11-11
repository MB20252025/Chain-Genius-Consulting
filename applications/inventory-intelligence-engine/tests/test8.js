const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const fs=require('fs');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const DIR=__ROOT+'/js/',WBP=__NS;
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(DIR+n+'.js','utf8')).join('\n');
eval(src+';globalThis.T={setWB:w=>{WB=w},run:()=>{R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R},cc:()=>fcCredAll(),views,CFG,ORDER,banner:()=>demoBanner()}');
let ok=0,bad=0;const chk=(n,c,d)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  >> '+(d||'')))};
const base=()=>XLSX.readFile(WBP,{cellDates:true}),S=(w,n)=>XLSX.utils.sheet_to_json(w.Sheets[n],{raw:true,cellDates:true}),put=(w,n,a)=>{w.Sheets[n]=XLSX.utils.json_to_sheet(a,{cellDates:true})};
const go=fn=>{const w=base();fn&&fn(w);T.setWB(w);return T.run()},B=base(),snap=S(B,'Inventory')[0].Snapshot_Date,dy=n=>new Date(+snap+n*864e5);
const close=(a,b,t=1e-9)=>a!=null&&b!=null&&Math.abs(a-b)<=t;
const allViews=()=>{try{T.ORDER.forEach(k=>T.views[k]());return true}catch(e){return e.message}};
// ===== TASK 1: attainment edge cases =====
{const raw=S(B,'Production Orders').filter(o=>o.SKU==='FG048');let r=go(w=>{const a=S(w,'Production Orders'),g=a.filter(o=>o.SKU==='FG048');g[0].Planned_Qty=0;delete g[1].Completed_Qty;put(w,'Production Orders',a)});const p=r.pr.find(x=>x.id==='FG048'),o3=raw[2];
 chk('T1 zero planned + missing completed excluded: 3 orders, 1 used, 2 excluded',p.n===3&&p.nQ===1&&p.exQ===2,JSON.stringify(p));
 chk('T1 totals use only the valid order (missing quantity NOT treated as zero)',p.planned===o3.Planned_Qty&&p.actual===o3.Completed_Qty&&close(p.att,o3.Completed_Qty/o3.Planned_Qty*100)&&close(p.wAtt,o3.Completed_Qty/o3.Planned_Qty*100),JSON.stringify(p));
 r=go(w=>{const a=S(w,'Production Orders');a.filter(o=>o.SKU==='FG048').forEach(o=>o.Planned_Qty=0);put(w,'Production Orders',a)});const q=r.pr.find(x=>x.id==='FG048');
 chk('T1 all orders invalid → attainment null (no NaN, no division by zero)',q.att===null&&q.wAtt===null&&q.nQ===0&&q.exQ===3);
 chk('T1 prCard renders with invalid data',allViews()===true);
 r=go(w=>{const a=S(w,'Production Orders');a.filter(o=>o.SKU==='FG048')[0].Completed_Qty=0;put(w,'Production Orders',a)});const z=r.pr.find(x=>x.id==='FG048');
 chk('T1 a genuine zero completed quantity IS counted (planned>0, actual 0)',z.nQ===3&&z.actual===398-raw[0].Completed_Qty);}
// ===== TASK 2: ranking =====
{const r=go();const s=r.supRisk;let okOrder=true;for(let i=1;i<s.length;i++){const a=s[i-1],b=s[i];if(a.risk<b.risk||(a.risk===b.risk&&(a.score>b.score||(a.score===b.score&&a.id>b.id))))okOrder=false}
 chk('T2 supRisk ordered by at-risk desc, score asc, id asc (all 15)',okOrder&&s.length===15&&r.sup.length===15);
 chk('T2 Overview panel lists the same top 5 in the same order with class, score, at-risk, supplied',(()=>{const h=T.views.Overview(),i=h.indexOf('ranked by at-risk materials'),seg=h.slice(i);return s.slice(0,5).every((x,k)=>{const at=seg.indexOf('>'+x.id+' ');return at>0&&seg.slice(at,at+400).includes(x.cat)})&&s.slice(0,5).map(x=>seg.indexOf('>'+x.id+' ')).every((v,k,a)=>k===0||v>a[k-1])})());
 const sh=T.views.Suppliers();chk('T2 Suppliers tab shows Risk rank, Score rank and the same ordering',sh.includes('Risk rank')&&sh.includes('Score rank')&&s.map(x=>sh.indexOf('>'+x.id+' ')).every((v,k,a)=>v>0&&(k===0||v>a[k-1])));
 T.CFG.pol=1;const r2=go();chk('T2 ranking recomputes under the calculated policy and stays ordered',r2.supRisk.every((x,i,a)=>i===0||a[i-1].risk>x.risk||(a[i-1].risk===x.risk&&a[i-1].score<=x.score)));T.CFG.pol=0;}
// ===== TASK 3: lead-time provenance =====
{const ords=S(B,'Production Orders');
 let r=go(w=>{put(w,'Production Orders',S(w,'Production Orders').filter(o=>o.SKU!=='FG005'))});let x=r.fg.find(v=>v.id==='FG005');
 chk('T3 no history → "Assumed (default setting)", value = setting, says not from data',x.ltInfo.source==='Assumed'&&x.lt===T.CFG.fgLT&&x.ltInfo.basis.includes('not a figure from the data')&&x.ltInfo.n===0,JSON.stringify(x.ltInfo));
 r=go(w=>{const a=S(w,'Production Orders');const keep=a.filter(o=>o.SKU!=='FG005'||a.filter(p=>p.SKU==='FG005')[0]===o);put(w,'Production Orders',keep)});x=r.fg.find(v=>v.id==='FG005');
 chk('T3 one order → "Estimated", n=1, warns fewer than 5',x.ltInfo.source==='Estimated'&&x.ltInfo.n===1&&x.ltInfo.basis.includes('fewer than 5'),JSON.stringify(x.ltInfo));
 r=go(w=>{const a=S(w,'Production Orders'),add=[];a.filter(o=>o.SKU==='FG010').forEach((o,i)=>{for(let k=0;k<2;k++)add.push({...o,Production_Order_ID:'X'+i+k})});put(w,'Production Orders',a.concat(add))});x=r.fg.find(v=>v.id==='FG010');
 const g=ords.filter(o=>o.SKU==='FG010'),d=g.map(o=>Math.max(1,Math.round((o.Actual_Finish_Date-o.Actual_Start_Date)/864e5)));
 chk('T3 9 orders → "Calculated", value = independent mean',x.ltInfo.source==='Calculated'&&x.ltInfo.n===g.length*3&&close(x.lt,d.reduce((a,b)=>a+b)/d.length),JSON.stringify(x.ltInfo));
 r=go(w=>{const a=S(w,'Production Orders'),t=a.filter(o=>o.SKU==='FG020')[0];t.Actual_Finish_Date=new Date(+t.Actual_Start_Date-864e5);put(w,'Production Orders',a)});x=r.fg.find(v=>v.id==='FG020');
 chk('T3 order with finish before start excluded and disclosed',x.ltInfo.n===ords.filter(o=>o.SKU==='FG020').length-1&&x.ltInfo.basis.includes('excluded for missing or invalid dates'),x.ltInfo.basis);
 r=go(w=>{const a=S(w,'Products');a.forEach(p=>p.Lead_Time_Days=p.SKU==='FG001'?9:undefined);put(w,'Products',a)});x=r.fg.find(v=>v.id==='FG001');
 chk('T3 lead-time column in Products → "Supplied", value 9, history shown for comparison only',x.ltInfo.source==='Supplied'&&x.lt===9&&x.ltInfo.basis.includes('Products.Lead_Time_Days')&&x.ltInfo.basis.includes('comparison only')&&!x.cw.some(w=>w.includes('proxy')),JSON.stringify(x.ltInfo));
 chk('T3 other products without a supplied value are still derived (not labelled Supplied)',r.fg.filter(v=>v.id!=='FG001').every(v=>v.ltInfo.source!=='Supplied'));
 r=go(w=>{const a=S(w,'Materials');delete a.find(m=>m.Material_ID==='RM001').Lead_Time_Days;put(w,'Materials',a)});const m=r.rm.find(v=>v.id==='RM001'),sup=S(B,'Suppliers').find(s=>s.Supplier_ID===S(B,'Materials').find(q=>q.Material_ID==='RM001').Default_Supplier_ID);
 chk('T3 material with missing lead time falls back to supplier standard and says so',m.ltInfo.label.startsWith('Supplied (supplier standard)')&&m.lt0===sup.Standard_Lead_Time_Days,JSON.stringify(m.ltInfo));
 r=go();chk('T3 baseline: all RM lead times labelled Supplied (+ calculated lateness) with PO count and date range',r.rm.every(v=>v.ltInfo.label.startsWith('Supplied')&&v.ltInfo.basis.includes('Materials.Lead_Time_Days'))&&r.rm.some(v=>v.ltInfo.basis.includes('calculated from')));
 const h=T.views['Finished goods']();chk('T3 Finished goods table shows LT source and LT basis columns',h.includes('LT source')&&h.includes('LT basis')&&h.includes('Estimated (limited sample)'));}
// ===== TASK 4: forecast credibility =====
{const demand=S(B,'Demand History');
 let r=go(w=>{const a=S(w,'Demand History');a.filter(o=>o.SKU==='FG001').slice(0,3).forEach(o=>delete o.Forecast_Units);put(w,'Demand History',a)});let x=r.fg.find(v=>v.id==='FG001'),c=T.cc()['FG001'];
 const v=demand.filter(o=>o.SKU==='FG001').slice(3),Sa=v.reduce((s,o)=>s+o.Units_Sold,0),w1=v.reduce((s,o)=>s+Math.abs(o.Forecast_Units-o.Units_Sold),0)/Sa,all=demand.filter(o=>o.SKU==='FG001'),wZero=all.reduce((s,o,i)=>s+Math.abs((i<3?0:o.Forecast_Units)-o.Units_Sold),0)/all.reduce((s,o)=>s+o.Units_Sold,0);
 chk('T4 missing forecasts excluded, not zero-filled: WAPE matches valid-pairs calc and differs from zero-fill',close(x.wape,w1)&&Math.abs(wZero-w1)>0.05&&c.fcMiss===3&&c.nV===9&&c.dq==='Limited',JSON.stringify({w:x.wape,w1,wZero,c:c.fcMiss}));
 r=go(w=>{put(w,'Demand History',S(w,'Demand History').filter(o=>o.SKU!=='FG002'||o.Month_Start<=S(B,'Demand History').filter(q=>q.SKU==='FG002')[3].Month_Start))});c=T.cc()['FG002'];
 chk('T4 under 6 periods → Insufficient, "Cannot assess", low confidence, no strong verdict',c.dq==='Insufficient'&&c.finding==='Insufficient data to assess'&&c.verdict==='Cannot assess'&&c.conf==='Low',JSON.stringify(c));
 r=go(w=>{const a=S(w,'Demand History'),g=a.filter(o=>o.SKU==='FG003');g[0].Units_Sold=0;g[5].Units_Sold=0;put(w,'Demand History',a)});c=T.cc()['FG003'];chk('T4 zero-demand periods detected (2) and data quality Limited',c.zeros===2&&c.dq==='Limited');
 r=go(w=>{const a=S(w,'Demand History'),g=a.filter(o=>o.SKU==='FG004');g[5].Units_Sold*=12;put(w,'Demand History',a)});c=T.cc()['FG004'];chk('T4 one isolated spike = 1 outlier, not a level shift',c.out===1&&c.shift===0&&c.dq==='Limited',JSON.stringify([c.out,c.shift]));
 r=go();c=T.cc()['FG003'];chk('T4 two consecutive extreme months = level shift (not an outlier); genuine bias still reported',c.out===0&&c.shift===2&&c.dir==='Under-forecast'&&c.finding==='Consistent under-forecast'&&c.dq==='Adequate',JSON.stringify([c.out,c.shift,c.finding]));
 r=go(w=>{const a=S(w,'Demand History');a.filter(o=>o.SKU==='FG006').slice(0,2).forEach(o=>o.__d=1);put(w,'Demand History',a.filter(o=>!(o.SKU==='FG006'&&o.__d)))});c=T.cc()['FG006'];chk('T4 two missing periods detected for the SKU',c.missing===2&&c.n===10&&c.dq==='Limited',JSON.stringify([c.missing,c.n]));
 r=go(w=>{const a=S(w,'Demand History');a.filter(o=>o.SKU==='FG007').forEach(o=>o.Forecast_Units=o.Units_Sold);put(w,'Demand History',a)});c=T.cc()['FG007'];chk('T4 perfect accuracy → flagged "Unusually high accuracy – validate source", never High confidence',c.hiAcc&&c.acc===100&&c.finding.startsWith('Unusually high')&&c.conf!=='High'&&c.verdict==='Very high (verify)',JSON.stringify([c.acc,c.finding,c.conf]));
 r=go();let vw=T.views['Forecast accuracy']();chk('T4 dataset-level warning appears when ≥50% of products show accuracy ≥ threshold (and says it is not itself a problem)',vw.includes('Unusually consistent accuracy')&&vw.includes('not treated as a problem')&&vw.includes('Forecast performance')&&vw.includes('Data quality')&&vw.includes('Confidence in the information'));
 r=go(w=>{const a=S(w,'Demand History');a.forEach((o,i)=>o.Forecast_Units=Math.round(o.Units_Sold*(i%2?1.25:0.78)));put(w,'Demand History',a)});vw=T.views['Forecast accuracy']();chk('T4 genuinely noisy forecasts: no "unusually consistent" warning',!vw.includes('Unusually consistent accuracy')&&Object.values(T.cc()).every(q=>!q.hiAcc));
 r=go(w=>{put(w,'Demand History',S(w,'Demand History').map(o=>{const q={...o};delete q.Forecast_Units;return q}))});chk('T4 no Forecast_Units column: clear message, nothing invented, all tabs still render',!r.hasF&&T.views['Forecast accuracy']().includes('cannot be calculated')&&allViews()===true,String(allViews()));
 r=go(w=>{const a=S(w,'Demand History'),g=a.filter(o=>o.SKU==='FG008');g.forEach((o,i)=>o.Units_Sold=0);put(w,'Demand History',a)});c=T.cc()['FG008'];chk('T4 all-zero demand: no NaN/crash, assessment says cannot judge accuracy',c.acc===null&&c.verdict!=='Good'&&allViews()===true,JSON.stringify([c.acc,c.verdict]));
 // unknown-dataset behaviour: renamed IDs, no notes sheets
 const renameFn=w=>{const ren=s=>typeof s==='string'?s.replace(/\bFG(\d{3})\b/g,'XA$1').replace(/\bRM(\d{3})\b/g,'XB$1').replace(/\bSUP(\d{3})\b/g,'XC$1'):s;for(const n of w.SheetNames)put(w,n,S(w,n).map(o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,ren(v)]))));w.SheetNames=w.SheetNames.filter(n=>!['QA NOTES','START HERE','DATA DICTIONARY'].includes(n))};
 const b0=go(),n0=[...b0.fg,...b0.rm].filter(x=>x.sev>=2).length;const rr=go(renameFn);
 chk('T4 workbook with renamed IDs and no notes sheets: no demo detection, generic banner, no errors',rr.demo===null&&T.banner().includes('Analysis of the uploaded workbook')&&!T.banner().includes('SIMULATED')&&rr.fg[0].id.startsWith('XA')&&allViews()===true,String(allViews()));
 chk('T4 same analysis on renamed workbook (High+ count identical to original: '+n0+')',[...rr.fg,...rr.rm].filter(x=>x.sev>=2).length===n0);
 r=go(w=>{const a=S(w,'QA NOTES');a[0]['Seeded pattern']='<img src=x onerror=alert(1)> FG003';put(w,'QA NOTES',a)});vw=T.views['Forecast accuracy']();
 chk('T4 workbook note with HTML payload shown escaped; declared IDs read from the file',vw.includes('&lt;img src=x onerror=alert(1)&gt;')&&!vw.includes('<img src=x')&&r.declared.includes('FG003')&&vw.includes('Mentioned in workbook test notes'));
 r=go();chk('T4 notes-derived demo banner and tags come from the workbook (START HERE statement detected)',r.demo&&r.demo.sheet==='START HERE'&&T.banner().startsWith('SIMULATED DEMONSTRATION ANALYSIS'));}
// ===== TASK 5: PO reconciliation =====
{const P=S(B,'Purchase Orders'),inv=S(B,'Inventory'),M=Object.fromEntries(S(B,'Materials').map(m=>[m.Material_ID,m]));
 const mut=w=>{const a=S(w,'Purchase Orders'),g=id=>a.find(o=>o.PO_ID===id);
  g('PO0001').PO_Status='Cancelled';
  const o2=g('PO0002');o2.PO_Status='Open';delete o2.Received_Date;delete o2.Received_Qty;o2.Promised_Date=dy(-11);
  const o4=g('PO0004');o4.PO_Status='Open';delete o4.Received_Date;delete o4.Received_Qty;o4.Promised_Date=dy(30);
  g('PO0005').Order_Date=dy(15);g('PO0005').Promised_Date=dy(40);g('PO0005').Received_Date=dy(41);
  const o6=g('PO0006');o6.PO_Status='Received';delete o6.Received_Date;
  delete g('PO0007').Received_Qty;
  g('PO0008').Received_Date=dy(0);
  g('PO0009').Ordered_Qty=0;
  put(w,'Purchase Orders',a);return a};
 let a2,r=go(w=>{a2=mut(w)});const c=r.po.PC;
 const ex={rec:{n:0,ord:0,qty:0,short:0,noQty:0,undated:0},fut:{n:0,q:0},open:{n:0,q:0,over:0,notDue:0},after:{n:0,q:0},can:{n:0,q:0},bad:{n:0}};
 const rcl=s=>/^(received|closed|complete|completed)$/i.test(s||'');
 a2.forEach(o=>{const q=o.Ordered_Qty;if(!(q>0)){ex.bad.n++;return}if(/^cancel/i.test(o.PO_Status)){ex.can.n++;ex.can.q+=q;return}if(o.Order_Date>snap){ex.after.n++;ex.after.q+=q;return}
  const rb=o.Received_Date&&o.Received_Date<=snap;if(rb||(rcl(o.PO_Status)&&!o.Received_Date)){ex.rec.n++;ex.rec.ord+=q;if(typeof o.Received_Qty==='number'){ex.rec.qty+=o.Received_Qty;ex.rec.short+=Math.max(0,q-o.Received_Qty)}else ex.rec.noQty++;if(!rb)ex.rec.undated++;return}
  if(rcl(o.PO_Status)){ex.fut.n++;ex.fut.q+=q}else{ex.open.n++;ex.open.q+=q;if(o.Promised_Date&&o.Promised_Date<=snap)ex.open.over+=q;else ex.open.notDue+=q}});
 chk('T5 mixed statuses: received/cancelled/after/undated/short/bad classified exactly as independent logic',JSON.stringify([c.rec,c.can,c.after,c.bad.n,c.fut.n,c.fut.q,c.open.n,c.open.q,c.open.over,c.open.notDue])===JSON.stringify([ex.rec,ex.can,ex.after,ex.bad.n,ex.fut.n,ex.fut.q,ex.open.n,ex.open.q,ex.open.over,ex.open.notDue]),JSON.stringify([c,ex]));
 chk('T5 every PO lands in exactly one category ('+a2.length+')',c.rec.n+c.fut.n+c.open.n+c.after.n+c.can.n+c.bad.n===a2.length);
 chk('T5 cancelled and post-snapshot POs are NOT supply; open overdue and not-yet-due ARE; received on the snapshot day is closed',r.po.snap===ex.fut.q+ex.open.q&&ex.can.n===1&&ex.open.over>0&&ex.open.notDue>0,JSON.stringify([r.po.snap,ex.fut.q+ex.open.q]));
 chk('T5 verified supply feeds the position of the right materials',(()=>{const os={};a2.forEach(o=>{if(!(o.Ordered_Qty>0)||/^cancel/i.test(o.PO_Status)||o.Order_Date>snap)return;const rb=o.Received_Date&&o.Received_Date<=snap;if(rb||(rcl(o.PO_Status)&&!o.Received_Date))return;os[o.Material_ID]=(os[o.Material_ID]||0)+o.Ordered_Qty});return r.rm.every(x=>x.oo===(os[x.id]||0))})());
 chk('T5 status for a large unexplained gap, shown in Data Quality tab with all six outputs',r.po.status==='Largely unreconciled'&&(()=>{const h=T.views['Data quality']();return ['1. Total inventory on-order','2. Verified open purchase orders','3. Future-dated supply','4. Received quantities excluded','5. Unreconciled quantity','6. Reconciliation status'].every(s=>h.includes(s))&&h.includes('does not by itself show lost stock')})());
 // statuses
 const setOO=(fnv)=>go(w=>{const a=S(w,'Inventory');a.forEach(o=>{if(o.Item_Type==='Raw_Material')o.On_Order_Qty=fnv(o)});put(w,'Inventory',a)});
 const osb={};P.forEach(o=>{if(o.Received_Date>snap)osb[o.Material_ID]=(osb[o.Material_ID]||0)+o.Ordered_Qty});
 r=setOO(o=>osb[o.Item_ID]||0);chk('T5 inventory on-order equal to PO supply → "Reconciled", gap 0, no reconciliation data issue',r.po.status==='Reconciled'&&r.po.gap===0&&!r.dq.some(d=>d.kind==='Reconciliation'));
 chk('T5 reconciled case wording says matches',T.views['Data quality']().includes('matches purchase orders'));
 const m3=P.find(o=>o.PO_ID==='PO0003').Material_ID;
 r=setOO(o=>o.Item_ID===m3?1000:0);chk('T5 30% explained → "Partly reconciled"',r.po.status==='Partly reconciled'&&close(r.po.explained,.3));
 r=setOO(o=>o.Item_ID===m3?320:0);chk('T5 94% explained → "Mostly reconciled"',r.po.status==='Mostly reconciled');
 r=setOO(o=>0);chk('T5 POs exceed inventory on-order → explicit status (not "Cannot assess")',r.po.status.startsWith('Unreconciled: purchase orders exceed')&&r.po.gap===-300,r.po.status);
 r=setOO(o=>o.Item_ID===m3?300:(osb[o.Item_ID]?0:0));const tot=Object.values(osb).reduce((a,b)=>a+b,0);
 const ks=Object.keys(osb);r=setOO(o=>osb[o.Item_ID]===undefined?0:o.Item_ID===ks[0]?osb[o.Item_ID]+25:o.Item_ID===ks[1]?osb[o.Item_ID]-25:osb[o.Item_ID]);chk('T5 totals match but materials differ → says so',r.po.gap===0&&r.po.mis>0&&r.po.status==='Totals match, but individual materials differ',r.po.status);
 r=go(w=>{put(w,'Purchase Orders',[])});chk('T5 empty Purchase Orders sheet: no crash, status cannot assess',allViews()===true&&r.po.status.startsWith('Cannot assess'),String(allViews())+r.po.status);
 r=go();chk('T5 Northstar: 300 units (4 POs) future-dated; 296 POs received before snapshot; 32,334 unreconciled',r.po.PC.fut.q===300&&r.po.PC.fut.n===4&&r.po.PC.rec.n===296&&r.po.gap===32334);}
// ===== misc: injection into every new text path + all tabs on baseline =====
{const r=go(w=>{const a=S(w,'Products');a[0].Product_Name='<script>alert(1)</script>';a[0].Product_Family='"><img src=x onerror=1>';put(w,'Products',a);const m=S(w,'Suppliers');m[0].Supplier_Name='<b onmouseover=x>S</b>';put(w,'Suppliers',m)});
 const all=T.ORDER.map(k=>T.views[k]()).join('');chk('XSS: imported names escaped on every tab',!/<script>alert|<img src=x onerror|<b onmouseover/.test(all)&&all.includes('&lt;script&gt;'));}
console.log('summary',ok,'pass',bad,'fail');
process.exitCode=bad?1:0; // v0.7 A1 D4: a failed check makes the suite exit non-zero, so run-regression.sh reports it
