// Phase 3 item 1 - INVESTIGATION ONLY. Nothing here changes the application. It runs the real engine, and for each candidate treatment an in-memory
// patched copy of the supplier block, over realistic edits of the Northstar PO data, and records what each treatment would do.
// Output: results/blank-qty-investigation.json (full) and a console summary.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),RAW=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8'));
const A0="const a=all.filter(r=>r.Received_Date instanceof Date&&r.Received_Date<=snap&&r.Order_Date<=snap);if(!a.length)return;";
const F0="fill=a.reduce((s,r)=>s+Math.min(r.Received_Qty,r.Ordered_Qty),0)/(a.reduce((s,r)=>s+r.Ordered_Qty,0)||1)*100,over=a.reduce((s,r)=>s+Math.max(0,r.Received_Qty-r.Ordered_Qty),0),overN=a.filter(r=>r.Received_Qty>r.Ordered_Qty).length";
const SC0="score=.5*otd+.2*stab+.15*Math.min(100,fill)+.15*ls;";
const once=(s,t)=>{if(s.split(t).length!==2)throw new Error('patch target not unique: '+t.slice(0,50));return s};
const BAD="(r=>!(isN(r.Received_Qty)&&isN(r.Ordered_Qty)))";   // a scored line whose two quantities are not both finite numbers
const VARIANTS={
 V0:{name:'Current behaviour (no change)',patch:s=>s},
 V1:{name:'Blank/invalid quantity = 0',patch:s=>s.replace(A0,"const a=all.filter(r=>r.Received_Date instanceof Date&&r.Received_Date<=snap&&r.Order_Date<=snap).map(r=>Object.assign({},r,{Received_Qty:isN(r.Received_Qty)?r.Received_Qty:0,Ordered_Qty:isN(r.Ordered_Qty)?r.Ordered_Qty:0}));if(!a.length)return;")},
 V2:{name:'Skip the line for fill only (line still counts for on-time, lead time, PO count)',patch:s=>s.replace(F0,"fill=(g=>g.reduce((s,r)=>s+Math.min(r.Received_Qty,r.Ordered_Qty),0)/(g.reduce((s,r)=>s+r.Ordered_Qty,0)||1)*100)(a.filter(r=>isN(r.Received_Qty)&&isN(r.Ordered_Qty))),over=a.filter(r=>isN(r.Received_Qty)&&isN(r.Ordered_Qty)).reduce((s,r)=>s+Math.max(0,r.Received_Qty-r.Ordered_Qty),0),overN=a.filter(r=>isN(r.Received_Qty)&&isN(r.Ordered_Qty)&&r.Received_Qty>r.Ordered_Qty).length")},
 V3:{name:'Exclude the whole PO line from supplier assessment',patch:s=>s.replace(A0,"const a=all.filter(r=>r.Received_Date instanceof Date&&r.Received_Date<=snap&&r.Order_Date<=snap&&isN(r.Received_Qty)&&isN(r.Ordered_Qty));if(!a.length)return;")},
 V4:{name:'Do not score fill when any scored line is invalid (re-weight the other 85%)',patch:s=>s.replace(SC0,"score=a.some"+BAD+"?(.5*otd+.2*stab+.15*ls)/.85:.5*otd+.2*stab+.15*Math.min(100,fill)+.15*ls;")},
 V5:{name:'Supplier not assessed (data problem) when any scored line is invalid',patch:s=>s.replace(SC0,"score=a.some"+BAD+"?null:.5*otd+.2*stab+.15*Math.min(100,fill)+.15*ls;")}};
// V5 needs the category to follow the null score
VARIANTS.V5.patch=(p=>s=>{let t=p(s);const c="cat:score>=CFG.supLow?'Low risk':score>=CFG.supMed?'Medium risk':'High risk'";if(t.split(c).length!==2)throw new Error('cat target');return t.replace(c,"cat:score===null?'Not assessed':score>=CFG.supLow?'Low risk':score>=CFG.supMed?'Medium risk':'High risk'")})(VARIANTS.V5.patch);
const load=v=>{const [c,fc,ap,ei]=RAW;let cs=c;for(const t of [A0,F0,SC0])once(cs,t);cs=VARIANTS[v].patch(cs);if(v!=='V0'&&cs===c)throw new Error('patch for '+v+' changed nothing');
 const src=[cs,fc,ap,ei].join('\n'),o={};new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,o);return o};
const ENG={};for(const v of Object.keys(VARIANTS))ENG[v]=load(v);
// ---------- workbook edits (real cells, round-tripped through .xlsx)
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const colOf=(ws,h)=>{const r=XLSX.utils.decode_range(ws['!ref']);for(let c=r.s.c;c<=r.e.c;c++){const x=ws[XLSX.utils.encode_cell({r:r.s.r,c})];if(x&&x.v===h)return c}return -1};
const setc=(ws,h,row,v)=>{const a=XLSX.utils.encode_cell({r:row-1,c:colOf(ws,h)});if(v===null)delete ws[a];else ws[a]=v};
const build=fn=>{const wb=XLSX.readFile(NS,{cellDates:true});fn(wb);return XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx',cellDates:true}),{cellDates:true})};
const poRows=(()=>{const wb=XLSX.readFile(NS,{cellDates:true});return XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true}).map((r,i)=>Object.assign(r,{row:i+2}))})();
const recd=poRows.filter(r=>r.Received_Date);const bySup={};recd.forEach(r=>(bySup[r.Supplier_ID]=bySup[r.Supplier_ID]||[]).push(r));
const sups=Object.entries(bySup).map(([k,a])=>[k,a.length]).sort((a,b)=>b[1]-a[1]);
const BIG='SUP007',SMALL='SUP004',BORDER='SUP008';   // BIG: 20 received POs, 87.4 Low risk (12 points clear of any cut-off); SMALL = mid-range supplier (67.4); BORDER: 0.4 above the Medium cut-off
const REPS={'empty cell':null,'empty string':{t:'s',v:''},'spaces only':{t:'s',v:'   '},'text "TBC"':{t:'s',v:'TBC'},'text "N/A"':{t:'s',v:'N/A'},'numeric text "120"':{t:'s',v:'120'},'text with comma "1,200"':{t:'s',v:'1,200'},'text with unit "120 kg"':{t:'s',v:'120 kg'},'Excel error #N/A':{t:'e',v:42,w:'#N/A'},'negative -50':{t:'n',v:-50},'zero':{t:'n',v:0},'extreme 1e9':{t:'n',v:1e9},'boolean TRUE':{t:'b',v:true}};
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const num=v=>v===null||v===undefined?v:(typeof v==='number'&&!isFinite(v)?String(v):v);
function measure(v,wb,sid,base){const o=ENG[v];let R;try{R=o.go(wb)}catch(e){return {error:e.message.slice(0,120)}}
 const s=R.sup.find(x=>x.id===sid),hi=R.sup.filter(x=>x.cat==='High risk').length,items=[...R.fg,...R.rm];
 let chg={sev:0,act:0,conf:0,ids:[]};if(base){const m=Object.fromEntries([...base.fg,...base.rm].map(x=>[x.id,x]));items.forEach(x=>{const b=m[x.id];let c=false;if(b.sev!==x.sev){chg.sev++;c=true}if(b.act!==x.act){chg.act++;c=true}if(b.conf!==x.conf||b.confWhy!==x.confWhy){chg.conf++;c=true}if(c&&chg.ids.length<5)chg.ids.push(x.id)})}
 const sh=strip(o.html('Suppliers')),row=(sh.match(new RegExp(sid+'[^A-Z]{0,400}'))||[''])[0].slice(0,160);
 const w=o.exp(),ex=XLSX.utils.sheet_to_json(w.Sheets.ENG_Suppliers,{raw:true}).find(r=>Object.values(r).includes(sid))||{};
 const exNaN=Object.entries(ex).filter(([k,x])=>typeof x==='number'&&!isFinite(x)||x==='NaN'||x===null).map(([k])=>k);
 const dq=R.dq.filter(d=>/quantit|Missing values in (Received|Ordered)_Qty|contains no values/i.test(d.msg)).map(d=>d.sev+': '+d.msg);
 const sm=strip(o.html('Summary')),cq=strip(o.html('Client questions'));
 return {score:num(s.score),cat:s.cat,n:s.n,poTotal:s.poTotal,evid:s.evid,assess:s.assess,fill:num(s.fill),over:num(s.over),overN:s.overN,shortN:s.shortN,otd:num(s.otd),highRiskSuppliers:hi,
  itemsChanged:chg,screenRowHasNaN:/NaN|undefined/.test(row),screenRow:row,exportNaNorBlank:exNaN,dq,summaryNaN:/NaN|undefined/.test(sm),clientQuestionsSupplierWeak:/weak on-time|High risk|poor on-time|supplier.*(weak|poor)/i.test(cq),
  conf:{materialsCitingSupplierSample:R.rm.filter(x=>x.sup===sid&&/small or unreliable supplier sample/.test(x.confWhy||'')).length,materialsOfSupplier:R.rm.filter(x=>x.sup===sid).length}}}
const OUT={meta:{big:BIG,bigReceivedPOs:bySup[BIG].length,small:SMALL,smallReceivedPOs:bySup[SMALL].length,variants:Object.fromEntries(Object.entries(VARIANTS).map(([k,v])=>[k,v.name]))},baseline:{},representations:[],scenarios:[]};
const baseWb=build(()=>{});const baseR={};for(const v of Object.keys(VARIANTS))baseR[v]=ENG[v].go(baseWb);
for(const v of Object.keys(VARIANTS)){OUT.baseline[v]={};for(const sid of [BIG,SMALL])OUT.baseline[v][sid]=measure(v,baseWb,sid,baseR[v])}
// A. each representation, in each field, on ONE received line of the big supplier (and on the small supplier)
const target=sid=>bySup[sid][Math.floor(bySup[sid].length/2)];
for(const sid of [BIG,SMALL])for(const field of ['Received_Qty','Ordered_Qty'])for(const [rn,rv] of Object.entries(REPS)){const t=target(sid);
 const wb=build(w=>setc(w.Sheets['Purchase Orders'],field,t.row,rv===null?null:Object.assign({},rv)));
 const rec={supplier:sid,field,representation:rn,row:t.row,original:t[field],results:{}};
 for(const v of Object.keys(VARIANTS))rec.results[v]=measure(v,wb,sid,baseR[v]);OUT.representations.push(rec)}
// B. scenarios (empty-cell representation unless stated)
const scen=[
 ['S1 one blank Received_Qty among '+bySup[BIG].length+' received POs ('+BIG+')',BIG,w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',target(BIG).row,null)],
 ['S2 about half the received POs of '+BIG+' have a blank Received_Qty',BIG,w=>bySup[BIG].filter((r,i)=>i%2===0).forEach(r=>setc(w.Sheets['Purchase Orders'],'Received_Qty',r.row,null))],
 ['S3 every received PO of '+BIG+' has a blank Received_Qty',BIG,w=>bySup[BIG].forEach(r=>setc(w.Sheets['Purchase Orders'],'Received_Qty',r.row,null))],
 ['S4 one blank Received_Qty on '+SMALL+' ('+bySup[SMALL].length+' received POs, mid-range score)',SMALL,w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',target(SMALL).row,null)],
 ['S5 the LATEST-delivered, worst-late PO of '+BIG+' has a blank Received_Qty (skip vs exclude differ)',BIG,w=>{const r=bySup[BIG].slice().sort((a,b)=>(b.Received_Date-b.Promised_Date)-(a.Received_Date-a.Promised_Date))[0];setc(w.Sheets['Purchase Orders'],'Received_Qty',r.row,null)}],
 ['S6 blank Received_Qty on an OPEN (not yet received) PO of '+BIG,BIG,w=>{const o=poRows.find(r=>r.Supplier_ID===BIG&&!r.Received_Date);if(o)setc(w.Sheets['Purchase Orders'],'Received_Qty',o.row,null)}],
 ['S7 one blank Ordered_Qty among '+bySup[BIG].length+' received POs ('+BIG+')',BIG,w=>setc(w.Sheets['Purchase Orders'],'Ordered_Qty',target(BIG).row,null)],
 ['S4b one blank Received_Qty on '+BORDER+' (score 60.4, 0.4 above the Medium-risk cut-off): the class flips on tiny changes',BORDER,w=>setc(w.Sheets['Purchase Orders'],'Received_Qty',target(BORDER).row,null)],
 ['S8 one blank Received_Qty on each of three different suppliers (blast radius)',BIG,w=>{[BIG,'SUP004','SUP012'].forEach(sid=>setc(w.Sheets['Purchase Orders'],'Received_Qty',target(sid).row,null))}]];
const trim=w=>bySup[BIG].slice(6).forEach(r=>{setc(w.Sheets['Purchase Orders'],'Received_Date',r.row,null)});   // leaves 6 received POs = Limited evidence
const limBase=build(trim),limR={};for(const v of Object.keys(VARIANTS))limR[v]=ENG[v].go(limBase);
for(const [nm,fn] of [['S9 limited evidence: '+BIG+' with only 6 received POs, one blank Received_Qty',w=>{trim(w);setc(w.Sheets['Purchase Orders'],'Received_Qty',bySup[BIG][2].row,null)}],['S9b limited evidence: same 6 POs, one Received_Qty = text "TBC"',w=>{trim(w);setc(w.Sheets['Purchase Orders'],'Received_Qty',bySup[BIG][2].row,{t:'s',v:'TBC'})}]]){const wb=build(fn),rec={scenario:nm,supplier:BIG,baselineLimited:true,results:{}};for(const v of Object.keys(VARIANTS))rec.results[v]=measure(v,wb,BIG,limR[v]);OUT.scenarios.push(rec)}
for(const [name,sid,fn] of scen){const wb=build(fn),rec={scenario:name,supplier:sid,results:{}};for(const v of Object.keys(VARIANTS))rec.results[v]=measure(v,wb,sid,baseR[v]);OUT.scenarios.push(rec)}
// C. how many suppliers does S8 move to High risk under each variant
for(const rec of OUT.scenarios)if(rec.scenario.startsWith('S8')){const wb=build(scen[scen.length-1][2]);rec.allSuppliers={};for(const v of Object.keys(VARIANTS)){const R=ENG[v].go(wb);rec.allSuppliers[v]=R.sup.map(s=>s.id+':'+(s.cat)).join(' ')}}
fs.writeFileSync(path.join(__dirname,'results/blank-qty-investigation.json'),JSON.stringify(OUT,null,1));
// ---------- console summary
const P=(r)=>r.error?'ERROR '+r.error:`${r.score===null?'null':typeof r.score==='number'?r.score.toFixed(1):r.score}|${r.cat}|n=${r.n}|${r.evid}|HRsup=${r.highRiskSuppliers}|items±${r.itemsChanged.sev}/${r.itemsChanged.act}/${r.itemsChanged.conf}`;
console.log('big supplier',BIG,bySup[BIG].length,'small',SMALL,bySup[SMALL].length);
console.log('BASELINE');for(const v of Object.keys(VARIANTS))console.log(' ',v,P(OUT.baseline[v][BIG]));
console.log('REPRESENTATIONS on',BIG);for(const r of OUT.representations.filter(r=>r.supplier===BIG))console.log(' ',r.field.padEnd(12),r.representation.padEnd(26),Object.keys(VARIANTS).map(v=>v+'='+P(r.results[v])).join('  ').slice(0,400));
console.log('SCENARIOS');for(const r of OUT.scenarios){console.log(' ',r.scenario);for(const v of Object.keys(VARIANTS))console.log('     ',v,P(r.results[v]))}
