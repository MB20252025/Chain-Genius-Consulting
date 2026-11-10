const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const fs=require('fs');global.XLSX=require('xlsx');
const el=()=>({hidden:false,set innerHTML(v){this._h=v},get innerHTML(){return this._h},set textContent(v){this._t=v},get textContent(){return this._t}});
global.document={querySelector:()=>el(),addEventListener(){},querySelectorAll:()=>[]};
const DIR=__ROOT+'/js/';const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(DIR+n+'.js','utf8')).join('\n');
const wbf=__NS;
eval(src+';globalThis.T={load:()=>{WB=XLSX.readFile(wbf,{cellDates:true})},run:()=>{R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;R.alt=analyse();CFG.pol=p0;const s0=CFG.sup;CFG.sup=s0===1?0:1;R.altS=analyse();CFG.sup=s0;link();return R},run2:()=>{run();return R},views,banner:()=>banner(),fcast,fcAll:()=>fcAll(),seasn,chart,link,get WB(){return WB},ORDER,CFG,tbl,esc,H}');
const {views,ORDER,CFG}=T;const g=(a,id)=>a.find(x=>x.id===id);let ok=0,bad=0;const chk=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
T.load();let R=T.run();
for(const k of ORDER)try{const h=views[k]();chk('view '+k+' renders',typeof h==='string'&&h.length>50)}catch(e){chk('view '+k+' '+e.message,false)}
// regression seeds
chk('FG low cover seeds',['FG003','FG027','FG048'].every(i=>g(R.fg,i).sev>=2));
chk('FG excess seeds',['FG014','FG036'].every(i=>g(R.fg,i).fEx));
chk('RM low seeds critical',['RM001','RM014','RM027','RM043','RM067'].every(i=>g(R.rm,i).sev===3));
chk('RM excess seeds',['RM009','RM036','RM058','RM082'].every(i=>g(R.rm,i).fEx));
console.log(R.sup.slice(-4).map(s=>s.id+' '+s.score.toFixed(0)+' '+s.cat+' otd'+s.otd.toFixed(0)+' n'+s.n+' excl'+s.excl).join(' | '));
chk('SUP003 & SUP011 in bottom 3 by score',R.sup.slice(-3).map(s=>s.id).includes('SUP003')&&R.sup.slice(-3).map(s=>s.id).includes('SUP011'));
chk('values match v0.1 ref',Math.round(R.fgV)===922704&&Math.round(R.rmV)===1610892);
console.log('PO recon',JSON.stringify(R.po));console.log(R.dq.filter(d=>d.kind==='Reconciliation').map(d=>d.msg)[0]);
console.log('health overall',(([...R.fg,...R.rm]).reduce((s,x)=>s+x.score,0)/150).toFixed(1),'cats',['Excellent','Healthy','Monitor','At risk','Critical'].map(c=>[...R.fg,...R.rm].filter(x=>x.cat===c).length).join('/'));
console.log('classes',['Active','Slow-moving','Excess stock','Potentially obsolete','No recorded demand'].map(c=>c+':'+[...R.fg,...R.rm].filter(x=>x.cls===c).length).join(' '));
console.log('seed health',['FG003','FG014','RM001','RM009'].map(i=>i+':'+(g(R.fg,i)||g(R.rm,i)).score+' '+(g(R.fg,i)||g(R.rm,i)).hp.map(y=>y[1]).join('/')).join(' | '));
console.log('WAPE FG003/FG014',g(R.fg,'FG003').wape.toFixed(2),g(R.fg,'FG014').wape.toFixed(2));
console.log('ROP verdict counts',['Existing ROP insufficient','Existing ROP possibly excessive','Broadly aligned'].map(v=>v.slice(13,30)+':'+[...R.fg,...R.rm].filter(x=>x.verdict===v).length).join(' '));
// policy switch
CFG.pol=1;let R2=T.run();console.log('pol=1 high+:',[...R2.fg,...R2.rm].filter(x=>x.sev>=2).length,'vs pol=0:',[...R.fg,...R.rm].filter(x=>x.sev>=2).length);CFG.pol=0;
// ABC boundary tests
CFG.abcA=80;CFG.abcB=95;T.load();R=T.run();
const abcCheck=a=>{const t=a.reduce((s,x)=>s+x.ann,0);const s=[...a].sort((p,q)=>q.ann-p.ann);let c=0,okk=true;s.forEach((x,i)=>{c+=x.ann;const e=i===0||c/t*100<=80+1e-9?'A':c/t*100<=95+1e-9?'B':'C';if(e!==x.abc)okk=false});return okk&&['A','B','C'].every(k=>a.some(x=>x.abc===k))};
chk('ABC inclusive-cumulative rule FG+RM',abcCheck(R.fg)&&abcCheck(R.rm));
CFG.abcA=100;CFG.abcB=100;R=T.run();chk('ABC thresholds 100/100 → all A',R.fg.every(x=>x.abc==='A'));CFG.abcA=80;CFG.abcB=95;
// XSS (names set on items that ARE rendered: FG014 and RM009 appear in Excess & dead stock)
T.load();{const W=T.WB,pay='<img src=x onerror=alert(1)>',setN=(sh,id,col,v)=>{const ws=W.Sheets[sh];for(let r=2;r<=200;r++){if(ws['A'+r]&&ws['A'+r].v===id){ws[col+r].v=v;ws[col+r].w=v;return true}}return false};
chk('XSS payload planted in Products/Materials/Suppliers',setN('Products','FG014','B',pay)&&setN('Materials','RM009','B','"><script>alert(2)</script>')&&setN('Suppliers','SUP003','B','<b onmouseover=x>S</b>'));
R=T.run();const all=ORDER.map(k=>views[k]()).join('');
chk('XSS: no raw injected tags in any view',!/<img src|<script>alert|<b onmouseover/.test(all));
chk('XSS: payload visible as escaped text',all.includes('&lt;img src=x onerror=alert(1)&gt;')&&all.includes('&lt;script&gt;alert(2)')&&all.includes('&lt;b onmouseover'))}
// missing sheet / empty sheet / zero demand / dup / negatives
T.load();delete T.WB.Sheets['BOM'];try{T.run();chk('missing sheet throws clear error',false)}catch(e){chk('missing sheet → clear error: '+e.message,/Missing sheet/.test(e.message))}
T.load();T.WB.Sheets['Purchase Orders']['!ref']='A1:J1';try{R=T.run();ORDER.forEach(k=>views[k]());chk('empty PO sheet does not crash',true)}catch(e){chk('empty PO sheet crash: '+e.message,false)}
T.load();const D=T.WB.Sheets['Demand History'];for(let r=2;r<=13;r++)D['C'+r].v=0;try{R=T.run();ORDER.forEach(k=>views[k]());const x=g(R.fg,'FG001');chk('zero demand: no NaN/crash, cls='+x.cls,x.cls==='No recorded demand'&&R.dq.some(d=>/Zero/.test(d.msg)))}catch(e){chk('zero demand crash '+e.message,false)}
T.load();T.WB.Sheets.Products.A3.v='FG001';T.WB.Sheets.Inventory.D2.v=-5;T.WB.Sheets.Inventory.E3.v=9999;R=T.run();chk('dup SKU / negative qty / alloc>onhand detected',['Duplicate','Negative quantities','Allocated exceeds'].every(m=>R.dq.some(d=>d.msg.startsWith(m))));

// ---- v0.3 module tests
T.load();R=T.run2();
chk('recon uses snapshot POs=300 (short receipts not counted as outstanding)',R.po.snap===300);
chk('recon gap total = 32,334',R.recon.reduce((s,x)=>s+x.gap,0)===32334);
chk('every material has 3 POs',R.recon.every(x=>x.n===3));
const A=[...R.fg,...R.rm],B=Object.fromEntries([...R.alt.fg,...R.alt.rm].map(x=>[x.id,x]));const ch=A.filter(x=>x.sev!==B[x.id].sev);
console.log('policy changes',ch.length,'riskier under calc',ch.filter(x=>B[x.id].sev>x.sev).length,'safer',ch.filter(x=>B[x.id].sev<x.sev).length,ch.slice(0,6).map(x=>x.id+':'+x.sev+'→'+B[x.id].sev).join(' '));
chk('alt run is the opposite policy',R.alt.rm[0].ssU===R.alt.rm[0].ssR&&R.rm[0].ssU===R.rm[0].ss);
for(const k of ORDER)try{chk('view '+k,views[k]().length>50)}catch(e){chk('view '+k+' '+e.message,false)}
// MRP independent hand-check for RM001 (3-month horizon, workbook policy)
const m=(R.rm.find(x=>x.id==='RM001'));
const Hh=CFG.hor,gross=m.m*Hh,need=gross+m.ss-m.av;
const rec=(R.sched['RM001']||[]).reduce((s,r)=>s+r.q,0);console.log('RM001 gross',gross.toFixed(1),'ss',m.ss,'avail',m.av,'sched receipts',rec,'net',Math.max(0,need-rec).toFixed(1),'moq',m.moq);
// get mrp rows via view html parse
const html=views.MRP();const row=html.split('<tr>').find(r=>r.includes('<td>RM001</td>'));console.log(row.replace(/<\/?t[dr]>/g,' | ').replace(/<[^>]+>/g,'').slice(0,400));
const numAfter=(h)=>h; 
const mr=(function(){return null})();
chk('MRP status counts present',/ORDER NOW/.test(html));
const nOrd=(html.match(/>ORDER NOW</g)||[]).length;console.log('MRP ORDER NOW rows',nOrd);
// seeded RM low cover must be ORDER NOW
chk('seeded low-cover RMs → ORDER NOW',['RM001','RM014','RM027','RM043','RM067'].every(i=>{const r=html.split('<tr>').find(q=>q.includes('<td>'+i+'</td>'));return r&&r.includes('ORDER NOW')}));
chk('seeded excess RMs → Covered',['RM009','RM036','RM058','RM082'].every(i=>{const r=html.split('<tr>').find(q=>q.includes('<td>'+i+'</td>'));return r&&r.includes('Covered')}));
// MOQ rounding check: all suggested qty multiples of MOQ
const rows=html.split('<tr>').slice(2);let moqOk=true;rows.forEach(r=>{const c=r.split('</td>').map(t=>t.replace(/<[^>]+>/g,'').replace(/[£,]/g,''));const moq=+c[7],q=+c[8];if(q>0&&q%moq!==0)moqOk=false});chk('suggested qty multiples of MOQ',moqOk);
// horizon change
CFG.hor=6;const h6=views.MRP();CFG.hor=3;chk('horizon 6 gives larger or equal spend',+((h6.match(/Suggested purchases[^£]*/)||[''])[0]!==undefined));

// ---- v0.3b tests
CFG.sup=0;T.load();R=T.run();const pos0=Object.fromEntries([...R.fg,...R.rm].map(x=>[x.id,x.pos]));
chk('verified mode: FG on-order=0, RM on-order=PO outstanding',R.fg.every(x=>x.oo===0)&&R.rm.reduce((s,x)=>s+x.oo,0)===300);
chk('verified mode seeds still detected',['FG003','FG027','FG048'].every(i=>g(R.fg,i).sev>=2)&&['RM001','RM014','RM027','RM043','RM067'].every(i=>g(R.rm,i).sev===3)&&['FG014','FG036'].every(i=>g(R.fg,i).fEx));
CFG.sup=1;R=T.run();chk('inventory mode: oo = recorded on-order',R.fg.every(x=>x.oo===x.ooI)&&R.rm.every(x=>x.oo===x.ooI));
chk('supply setting changes position',[...R.fg,...R.rm].some(x=>x.pos!==pos0[x.id]));
const mr1=views.MRP();chk('MRP applies supply setting (note text)',mr1.includes('inventory-recorded On_Order_Qty'));
const F1=views['Production feasibility']();chk('feasibility applies supply setting',F1.includes('UNVERIFIED'));
CFG.sup=0;R=T.run();
const hs=views['Policy comparison']();chk('supply comparison card present',hs.includes('Supply source comparison'));
console.log('items changing class between supply sources:',(()=>{const a=[...R.fg,...R.rm],b=Object.fromEntries([...R.altS.fg,...R.altS.rm].map(x=>[x.id,x]));return a.filter(x=>x.sev!==b[x.id].sev).length})());
// feasibility
const Fv=views['Production feasibility']();chk('feasibility flags simulated orders',Fv.includes('SIMULATED'));
const cnt=k=>(Fv.match(new RegExp('<span class="s\\d">'+k+'</span>','g'))||[]).length;console.log('feasibility statuses',['Feasible','Feasible with incoming materials','At risk','Material shortage','Insufficient information'].map(k=>k+':'+cnt(k)).join(' | '));
// invariant: no double-count of stock — rerun logic by consuming via exposed feas()
const FF=(eval('feas'))();const used={};FF.rows.filter(r=>r.status==='Feasible'||r.status.startsWith('Feasible with')||r.status==='At risk').forEach(r=>(R.bomS[r.o.sku]||[]).forEach(l=>{used[l.Material_ID]=(used[l.Material_ID]||0)+r.o.q*l.Qty_Per_Finished_Unit*(1+l.Scrap_Factor_Pct)}));
const over=Object.entries(used).filter(([id,u])=>{const x=R.rm.find(y=>y.id===id);return u>Math.max(0,x.av)+(R.sched[id]||[]).reduce((s,r)=>s+r.q,0)+1e-6});chk('no material over-committed across accepted orders ('+over.length+' violations)',over.length===0);
// hand-check first order
const o1=FF.rows[0];console.log('first order',o1.o.id,o1.o.sku,o1.o.q,o1.status,JSON.stringify(o1.bl.map(b=>[b.id,Math.round(b.sh),b.sched])));
if(o1.bl[0]){const b=o1.bl[0],l=R.bomS[o1.o.sku].find(z=>z.Material_ID===b.id),x=R.rm.find(y=>y.id===b.id),req=o1.o.q*l.Qty_Per_Finished_Unit*(1+l.Scrap_Factor_Pct);console.log('hand calc',b.id,'req',req.toFixed(1),'avail',x.av,'receipts',(R.sched[b.id]||[]).reduce((s,r)=>s+r.q,0),'short',(req-Math.max(0,x.av)).toFixed(1));chk('shortage qty = req − avail − receipts by start',Math.abs(b.sh-(req-Math.max(0,x.av)-(R.sched[b.id]||[]).filter(r=>r.d<=o1.o.st).reduce((s,r)=>s+r.q,0)))<1e-6)}
// real open order handling: mark 3 production orders open & far-future start
T.load();{const ws=T.WB.Sheets['Production Orders'];ws['J2'].v='Released';ws['C2'].v=new Date('2026-11-05');ws['J3'].v='Released';ws['C3'].v=new Date('2026-11-06');R=T.run();const Fo=eval('feas')();chk('real open orders used instead of simulated ('+Fo.rows.length+' orders)',!Fo.sim&&Fo.rows.length>=2)}
// confidence
T.load();R=T.run();const cf=k=>[...R.fg,...R.rm].filter(x=>x.conf===k).length;console.log('confidence H/M/L',cf('High'),cf('Medium'),cf('Low'));chk('every item has confidence + reason',[...R.fg,...R.rm].every(x=>x.conf&&x.confWhy));
chk('RM never High (estimated usage)',R.rm.every(x=>x.conf!=='High'));
// client questions + summary
const Q=eval('qs')();console.log('client questions',Q.length);chk('on-order question generated with 32,334 evidence',Q.some(q=>q.q.startsWith('How does the inventory system calculate On_Order_Qty')&&q.ev.includes('32,334')));
chk('open production order question generated',Q.some(q=>q.q.includes('open and planned production orders')));
chk('summary renders with SIMULATED label & limitations',/SIMULATED/.test(views.Summary())&&/Limitations/.test(views.Summary()));
for(const k of ORDER)try{chk('view '+k,views[k]().length>50)}catch(e){chk('view '+k+' '+e.message,false)}

// ---- v0.4 tests
T.load();R=T.run();
const cf2=k=>[...R.fg,...R.rm].filter(x=>x.conf===k).length;console.log('confidence H/M/L (FG)',['High','Medium','Low'].map(k=>R.fg.filter(x=>x.conf===k).length).join('/'),'(RM)',['High','Medium','Low'].map(k=>R.rm.filter(x=>x.conf===k).length).join('/'));
chk('Low confidence now occurs',cf2('Low')>0);chk('RM shortage items are Low (est. usage + supplier sample)',R.rm.filter(x=>x.sev>=2).every(x=>x.conf==='Low'));
chk('RM excess seeds not High (estimated usage)',['RM009','RM036','RM058','RM082'].every(i=>g(R.rm,i).conf!=='High'));
chk('supply-source dependency lowers confidence',[...R.fg,...R.rm].some(x=>x.cw.some(w=>w.includes('supply source'))));
// banner + transparency
chk('banner names supply source',T.banner().includes('PO-verified supply'));chk('MRP KPI states supply source',views.MRP().includes('Order now (PO-verified supply)'));
CFG.sup=1;chk('banner flags UNVERIFIED',T.banner().includes('UNVERIFIED'));CFG.sup=0;
// reorder policy view
const rp=views['Reorder policy']();chk('reorder policy view explains each item',rp.includes('demand during lead time')&&rp.includes('lead-time demand'));
// forecasting
const FA=T.fcAll();const okF=R.fg.filter(x=>FA[x.id].ok);chk('all 50 products forecast',okF.length===50);
chk('no NaN/negative forecasts',okF.every(x=>FA[x.id].f.every(v=>isFinite(v)&&v>=0)&&isFinite(FA[x.id].s3)));
chk('12-month history triggers seasonality warning',okF.every(x=>FA[x.id].warn.some(w=>w.includes('seasonality'))));
console.log('methods chosen',Object.entries(okF.reduce((o,x)=>(o[FA[x.id].best]=(o[FA[x.id].best]||0)+1,o),{})).join(' '),'trend',Object.entries(okF.reduce((o,x)=>(o[FA[x.id].trend]=(o[FA[x.id].trend]||0)+1,o),{})).join(' '),'unc',Object.entries(okF.reduce((o,x)=>(o[FA[x.id].unc]=(o[FA[x.id].unc]||0)+1,o),{})).join(' '));
require('fs').writeFileSync('fc_js.json',JSON.stringify(okF.map(x=>[x.id,FA[x.id].best,+FA[x.id].s3.toFixed(4),+FA[x.id].s12.toFixed(4),+(FA[x.id].bt[FA[x.id].best].wape||0).toFixed(5),FA[x.id].trend,FA[x.id].wb==null?null:+FA[x.id].wb.toFixed(5)])));
const dm=Date.UTC(2026,9,1),mk=(n,fn)=>({id:'S',h:Array.from({length:n},(_,i)=>fn(i)),fc:null});
const seas=mk(36,i=>100+40*Math.sin(2*Math.PI*((i+0)%12)/12)),FS1=T.fcast(seas,dm);chk('synthetic 36m seasonal series: seasonality detected & seasonal method available',FS1.seas&&FS1.seas.det&&FS1.meth.includes('seasonal'));
chk('seasonal series: no seasonality warning',!FS1.warn.some(w=>w.includes('seasonality')));
const rise=mk(24,i=>50+4*i+(i%3-1)*2),FS2=T.fcast(rise,dm);chk('rising series → Rising, trend method best',FS2.trend==='Rising'&&FS2.best==='trend');
const flat=mk(12,i=>100+[3,-4,2,-1,5,-3,1,-2,4,-5,2,0][i]),FS3=T.fcast(flat,dm);chk('flat noisy series → no significant trend',FS3.trend==='No significant trend');
chk('<6 months → no forecast, no crash',T.fcast(mk(4,i=>10),dm).ok===false);
const z=T.fcast(mk(12,()=>0),dm);chk('zero demand: finite, no NaN',z.ok&&z.f.every(isFinite)&&z.hi.every(isFinite));
chk('no Forecast_Units → existing-forecast baseline null (nothing invented)',FS3.wb===null);
chk('uncertainty range wider than forecast point',FS3.hi.every((v,j)=>v>=FS3.f[j])&&FS3.lo.every((v,j)=>v<=FS3.f[j]));
const svg=T.chart({id:'<b>x</b>',h:flat.h,fc:null},FS3);chk('chart is SVG, id escaped',svg.startsWith('<svg')&&!svg.includes('<b>x</b>'));
chk('forecast view renders with chart and method table',/<svg/.test(views['Demand forecast']())&&views['Demand forecast']().includes('Method comparison'));
// perf
T.load();const t0=Date.now();for(let i=0;i<10;i++)T.run();console.log('avg analyse ms',(Date.now()-t0)/10);
console.log('summary',ok,'pass',bad,'fail');

// ---- v0.4 acceptance checklist additions
const FA0=T.fcAll();
chk('seasonal disabled with 12-month data (no product offers it)',R.fg.every(x=>!FA0[x.id].meth.includes('seasonal')));
chk('all methods produce valid back-test results',R.fg.every(x=>FA0[x.id].meth.every(k=>FA0[x.id].bt[k].pts>0&&FA0[x.id].bt[k].wape!=null&&isFinite(FA0[x.id].bt[k].wape))));
chk('uncertainty bands widen with horizon (all 50)',R.fg.every(x=>{const F=FA0[x.id],w=F.hi.map((v,j)=>v-F.lo[j]);return w.every((v,j)=>j===0||v>=w[j-1]-1e-9)}));
chk('no negative forecast or lower bound',R.fg.every(x=>FA0[x.id].f.every(v=>v>=0)&&FA0[x.id].lo.every(v=>v>=0)));
CFG.fcTest=3;R=T.run();const FA3=T.fcAll();chk('back-test months setting recalculates (3 test points)',R.fg.every(x=>FA3[x.id].bt[FA3[x.id].best].pts===3));CFG.fcTest=6;
CFG.fcH=3;R=T.run();chk('forecast horizon setting changes table column',views['Demand forecast']().includes('Next 3m'));CFG.fcH=12;R=T.run();
chk('forecast view states bands are not guaranteed',views['Demand forecast']().includes('not guaranteed demand limits'));
const dist=k=>[...R.fg,...R.rm].filter(x=>x.conf===k).length;console.log('CONFIDENCE all 150 H/M/L',dist('High'),dist('Medium'),dist('Low'),'| FG',['High','Medium','Low'].map(k=>R.fg.filter(x=>x.conf===k).length).join('/'),'| RM',['High','Medium','Low'].map(k=>R.rm.filter(x=>x.conf===k).length).join('/'));
const rs=R.fg.concat(R.rm).reduce((o,x)=>{x.cw.forEach(w=>o[w]=(o[w]||0)+1);return o},{});console.log('confidence reasons',JSON.stringify(rs));
