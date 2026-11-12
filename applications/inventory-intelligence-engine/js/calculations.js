/* Chain Genius – Inventory Intelligence Engine v0.6
 * calculations.js
 * Settings (CFG), helpers, the analysis engine (stock, risk, suppliers, data quality), MRP, production feasibility and client questions. No DOM code except via other files.
 * Plain script (no build step). Load order in index.html: calculations → forecasting → app → excel-import.
 */
const DPM=365/12;
const SUP_NA='Not Assessed — Insufficient Evidence'; // exact state string for a supplier whose overall score cannot defensibly be calculated (code, screens, exports)
const CFG={z:1.65,excess:90,fgLT:7,grace:0,otd:40,late:1,basis:12,x:.15,y:.25,hold:20,abcA:80,abcB:95,pol:0,hor:3,sup:0,fcH:12,fcTest:6,ltMinN:5,ltMinSup:30,fcHighAcc:95,fcBias:10,fcBiasShare:75,supLow:75,supMed:60,supMinPO:10,outZ:3.5,fcHighShare:50,fcMinN:6,fcAdeqN:12};
const CFG0=Object.assign({},CFG);
// Units of measure. A unit is compared after trimming spaces (including non-breaking spaces and tabs) and ignoring case. The only alias is the approved one: EA = each.
// Anything else that is not in the list (pack, pc, lb, kgs ...) stays flagged as unrecognised and is never converted or guessed.
const UOM_KNOWN=new Set(['each','kg','m','l','g','pcs','set','box']),UOM_ALIAS={ea:'each'};
const canonUom=u=>{const n=String(u??'').trim().toLowerCase();return Object.prototype.hasOwnProperty.call(UOM_ALIAS,n)?UOM_ALIAS[n]:n};
let R;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))};
const dd=(a,b)=>Math.round((b-a)/864e5),f=(n,d=0)=>n==null||!isFinite(n)?'–':Number(n).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
const gbp=n=>'£'+f(n),grp=(a,k)=>{const m={};a.forEach(r=>(m[k(r)]=m[k(r)]||[]).push(r));return m};
const tail=(a,n)=>a.slice(-n);
function analyse(){
 const dq=[],add=(sev,kind,sheet,msg,ex)=>dq.push({sev,kind,sheet,msg,ex:(ex||[]).slice(0,6).join(', ')});
 const need=['Products','Materials','BOM','Demand History','Inventory','Suppliers','Purchase Orders','Production Orders'],miss=need.filter(n=>!WB.Sheets[n]);
 if(miss.length)throw new Error('Missing sheet(s): '+miss.join(', '));
 const [P,M,B,D,I,S,PO,PR]=need.map(rows);
 // ---- missing values & duplicates
 need.forEach((n,i)=>{const a=[P,M,B,D,I,S,PO,PR][i];if(!a.length)return add('High','Data quality',n,'Sheet is empty');
  // Every column is inspected, not only those present in the first data row: the header row of the sheet plus the keys of all rows. A cell is blank when it is empty, an empty string,
  // text made only of spaces, or a formula returning an empty string; 0, false and any other value are real values. A column whose header exists but whose cells are all blank is reported
  // as holding no values; a column that is not in the sheet at all is not (it cannot be told from an optional column that was never supplied).
  const cols=[...new Set([...sheetHeaders(n),...a.flatMap(r=>Object.keys(r))])];
  cols.forEach(c=>{const isBlank=v=>v===undefined||v===null||(typeof v==='string'&&v.trim()===''),x=a.map((r,j)=>isBlank(r[c])?(r.__rowNum__!==undefined?r.__rowNum__+1:j+2):0).filter(Boolean);
   if(x.length===a.length)add('Medium','Data quality',n,`Column ${c} contains no values (every cell in the column is empty)`,[]);else if(x.length)add('Medium','Data quality',n,`Missing values in ${c}`,x)});});
 const dup=(a,k,sh)=>{const s={},d=[];a.forEach(r=>{const x=k(r);s[x]?d.push(x):s[x]=1});if(d.length)add('High','Data quality',sh,'Duplicate records',d)};
 dup(P,r=>r.SKU,'Products');dup(M,r=>r.Material_ID,'Materials');dup(B,r=>r.SKU+r.Material_ID,'BOM');dup(D,r=>r.SKU+r.Month_Start,'Demand History');dup(I,r=>r.Item_ID,'Inventory');// Purchase orders are line-level: one PO number can legitimately carry several lines (different materials, or a split delivery). Only whole-row copies are definite duplicates.
 {const key=r=>Object.keys(r).sort().map(c=>c+'='+(r[c] instanceof Date?+r[c]:r[c])).join('|'),ex=[],sup=[],spl=[],multi=[];
  Object.entries(grp(PO,r=>r.PO_ID)).forEach(([id,ls])=>{if(ls.length<2)return;const ks=ls.map(key);if(new Set(ks).size<ks.length)ex.push(id);
   if(new Set(ls.map(r=>r.Supplier_ID)).size>1)sup.push(id);const bm=grp(ls,r=>r.Material_ID);if(Object.values(bm).some(g=>new Set(g.map(key)).size>1))spl.push(id);if(Object.keys(bm).length>1)multi.push(id)});
  if(ex.length)add('High','Data quality','Purchase Orders','Duplicate records',ex);
  if(sup.length)add('Medium','Data quality','Purchase Orders','One PO number is used for more than one supplier (check the PO numbers)',sup);
  if(spl.length)add('Medium','Data quality','Purchase Orders','Same PO number and material on more than one line with different details (a split delivery, or an entry error)',spl);
  if(multi.length)add('Low','Data quality','Purchase Orders',`${multi.length} PO number(s) carry lines for more than one material; each line is treated as a separate order line in supplier statistics`,multi)}dup(S,r=>r.Supplier_ID,'Suppliers');dup(PR,r=>r.Production_Order_ID,'Production Orders');
 const badD=(a,cols,sh)=>{const x=a.filter(r=>cols.some(c=>r[c]!==undefined&&r[c]!==''&&!(r[c] instanceof Date&&!isNaN(r[c])))).map((r,i)=>r.PO_ID||r.Production_Order_ID||r.SKU||i);if(x.length)add('High','Data quality',sh,'Invalid or non-date values in date fields',x)};
 badD(PO,['Order_Date','Promised_Date','Received_Date'],'Purchase Orders');badD(PR,['Planned_Start_Date','Planned_Finish_Date','Actual_Start_Date','Actual_Finish_Date'],'Production Orders');badD(D,['Month_Start'],'Demand History');badD(I,['Snapshot_Date'],'Inventory');
 const pm=Object.fromEntries(P.map(r=>[r.SKU,r])),mm=Object.fromEntries(M.map(r=>[r.Material_ID,r])),sm=Object.fromEntries(S.map(r=>[r.Supplier_ID,r]));
 const ref=(a,fn,ok,sh,l)=>{const x=a.filter(r=>!ok(r)).map(fn);if(x.length)add('High','Data quality',sh,l,x)};
 ref(I,r=>r.Item_ID,r=>pm[r.Item_ID]||mm[r.Item_ID],'Inventory','Item not in Products/Materials');
 ref(B,r=>r.SKU+'/'+r.Material_ID,r=>pm[r.SKU]&&mm[r.Material_ID],'BOM','BOM references unknown SKU or material');
 ref(D,r=>r.SKU,r=>pm[r.SKU],'Demand History','Demand for unknown SKU');
 ref(PO,r=>r.PO_ID,r=>sm[r.Supplier_ID]&&mm[r.Material_ID],'Purchase Orders','PO references unknown supplier/material');
 ref(PR,r=>r.Production_Order_ID,r=>pm[r.SKU],'Production Orders','Production order for unknown SKU');
 ref(M,r=>r.Material_ID,r=>sm[r.Default_Supplier_ID],'Materials','Material has no valid supplier');
 const bs=new Set(B.map(r=>r.SKU)),bm=new Set(B.map(r=>r.Material_ID)),im=Object.fromEntries(I.map(r=>[r.Item_ID,r]));
 const nb=P.filter(p=>!bs.has(p.SKU)).map(p=>p.SKU);if(nb.length)add('High','Data quality','BOM','Products with no BOM (material need cannot be estimated)',nb);
 const nm=M.filter(m=>!bm.has(m.Material_ID)).map(m=>m.Material_ID);if(nm.length)add('Medium','Data quality','BOM','Materials not used in any BOM',nm);
 const ni=[...P.map(p=>p.SKU),...M.map(m=>m.Material_ID)].filter(x=>!im[x]);if(ni.length)add('Medium','Data quality','Inventory','Items with no inventory record',ni);
 const neg=I.filter(r=>[r.On_Hand_Qty,r.Allocated_Qty,r.On_Order_Qty].some(x=>x<0)).map(r=>r.Item_ID);if(neg.length)add('High','Data quality','Inventory','Negative quantities',neg);
 const ao=I.filter(r=>r.Allocated_Qty>r.On_Hand_Qty).map(r=>r.Item_ID);if(ao.length)add('High','Data quality','Inventory','Allocated exceeds on-hand',ao);
 const rs=I.filter(r=>r.Reorder_Point_Qty<r.Safety_Stock_Qty).map(r=>r.Item_ID);if(rs.length)add('Medium','Data quality','Inventory','Reorder point below safety stock',rs);
 const cm=I.filter(r=>{const c=(pm[r.Item_ID]||mm[r.Item_ID]||{}).Standard_Cost_GBP;return c==null||Math.abs(c-r.Unit_Cost_GBP)>.005}).map(r=>r.Item_ID);if(cm.length)add('Medium','Data quality','Inventory','Inventory unit cost differs from master cost / cost missing',cm);
 const nc=[...P,...M].filter(r=>!(r.Standard_Cost_GBP>0)).map(r=>r.SKU||r.Material_ID);if(nc.length)add('High','Data quality','Products/Materials','Missing or zero cost',nc);
 const ng=[...P,...M,...I].filter(r=>r.Standard_Cost_GBP<0||r.Unit_Cost_GBP<0).map(r=>r.SKU||r.Material_ID||r.Item_ID);if(ng.length)add('High','Data quality','Products/Materials/Inventory','Negative costs',ng);
 const bu=[...P,...M].filter(r=>r.Unit_of_Measure!==undefined&&!UOM_KNOWN.has(canonUom(r.Unit_of_Measure))).map(r=>r.SKU||r.Material_ID);if(bu.length)add('Medium','Data quality','Products/Materials','Unrecognised unit of measure',bu);
 const rq=PO.filter(r=>r.Received_Qty>r.Ordered_Qty||r.Received_Qty<0||r.Ordered_Qty<=0).map(r=>r.PO_ID);if(rq.length)add('High','Data quality','Purchase Orders','Impossible quantities (received > ordered, negative, or ordered <= 0)',rq);
 // Invalid quantity/date values that the supplier metrics now leave out (rather than turning into NaN or zero). Numeric text such as "120" is NOT converted in v0.6: it is invalid and flagged.
 const nonNum=v=>v!==undefined&&v!==null&&!(typeof v==='number'&&isFinite(v))&&!(typeof v==='string'&&v.trim()==='');
 const tq=PO.filter(r=>nonNum(r.Ordered_Qty)||nonNum(r.Received_Qty));if(tq.length)add('High','Data quality','Purchase Orders','Non-numeric quantity in Ordered_Qty or Received_Qty (text such as "120" or "TBC", or another non-number). Not converted: these values are left out of the fill-rate and over-delivery figures',tq.map(r=>r.PO_ID));
 const noProm=PO.filter(r=>r.Received_Date instanceof Date&&!isNaN(r.Received_Date)&&!(r.Promised_Date instanceof Date&&!isNaN(r.Promised_Date)));if(noProm.length)add('Medium','Data quality','Purchase Orders','Received lines with a missing or invalid Promised_Date: left out of the on-time and lateness figures (other metrics still use them)',noProm.map(r=>r.PO_ID));
 const lp=P.filter(p=>p.Selling_Price_GBP<p.Standard_Cost_GBP).map(p=>p.SKU);if(lp.length)add('Medium','Operational','Products','Selling price below standard cost (check pricing or cost data)',lp);
 const sc=B.filter(r=>r.Scrap_Factor_Pct>1||r.Scrap_Factor_Pct<0||!(r.Qty_Per_Finished_Unit>0)).map(r=>r.SKU+'/'+r.Material_ID);if(sc.length)add('High','Data quality','BOM','Scrap outside 0–1 (percent vs fraction?) or qty<=0',sc);
 const fr=B.filter(r=>mm[r.Material_ID]&&canonUom(mm[r.Material_ID].Unit_of_Measure)==='each'&&r.Qty_Per_Finished_Unit%1).length;if(fr)add('Low','Data quality','BOM',`${fr} BOM lines use fractional quantities of materials measured in 'each'`,[]);
 const ltm=M.filter(m=>sm[m.Default_Supplier_ID]&&sm[m.Default_Supplier_ID].Standard_Lead_Time_Days!==m.Lead_Time_Days).map(m=>m.Material_ID);if(ltm.length)add('Medium','Data quality','Materials','Material lead time differs from supplier standard',ltm);
 const snap=I.reduce((a,r)=>r.Snapshot_Date>a?r.Snapshot_Date:a,new Date(0));
 const fut=PO.filter(r=>r.Received_Date>snap).map(r=>r.PO_ID);if(fut.length)add('Medium','Data quality','Purchase Orders','Received date after inventory snapshot date but status Received',fut);
 const bd=PO.filter(r=>r.Promised_Date<r.Order_Date||r.Received_Date<r.Order_Date).map(r=>r.PO_ID);if(bd.length)add('High','Data quality','Purchase Orders','Inconsistent PO dates',bd);
 const sh=PO.filter(r=>r.Received_Qty<r.Ordered_Qty);if(sh.length)add('Low','Operational','Purchase Orders',`${sh.length} POs received short`,sh.map(r=>r.PO_ID));
 const bp=PR.filter(r=>r.Actual_Finish_Date<r.Actual_Start_Date||r.Planned_Finish_Date<r.Planned_Start_Date).map(r=>r.Production_Order_ID);if(bp.length)add('High','Data quality','Production Orders','Finish before start',bp);
 const os={},oc={},sched={},isRec=s=>/^(received|closed|complete|completed)$/i.test(String(s||'').trim()),isCan=s=>/^cancel/i.test(String(s||'').trim()),isD=v=>v instanceof Date&&!isNaN(v),isN=v=>typeof v==='number'&&isFinite(v);
 const PC={rec:{n:0,ord:0,qty:0,short:0,noQty:0,undated:0},fut:{n:0,q:0,over:0,notDue:0,ids:[]},open:{n:0,q:0,over:0,notDue:0,partial:0},after:{n:0,q:0},can:{n:0,q:0},bad:{n:0,ids:[]}};
 PO.forEach(r=>{const q=r.Ordered_Qty,id=r.Material_ID;
  if(!isN(q)||q<=0||!isD(r.Order_Date)){PC.bad.n++;PC.bad.ids.push(r.PO_ID);return}
  if(isCan(r.PO_Status)){PC.can.n++;PC.can.q+=q;return}
  if(r.Order_Date>snap){PC.after.n++;PC.after.q+=q;return}
  const rb=isD(r.Received_Date)&&r.Received_Date<=snap;
  if(rb||(isRec(r.PO_Status)&&!isD(r.Received_Date))){PC.rec.n++;PC.rec.ord+=q;if(isN(r.Received_Qty)){PC.rec.qty+=r.Received_Qty;PC.rec.short+=Math.max(0,q-r.Received_Qty)}else PC.rec.noQty++;if(!rb)PC.rec.undated++;return}
  const fut=isRec(r.PO_Status),B=fut?PC.fut:PC.open,od=isD(r.Promised_Date)&&r.Promised_Date<=snap;
  B.n++;B.q+=q;if(od)B.over+=q;else B.notDue+=q;if(fut)PC.fut.ids.push(r.PO_ID);else if(isN(r.Received_Qty)&&r.Received_Qty>0)PC.open.partial++;
  os[id]=(os[id]||0)+q;(sched[id]=sched[id]||[]).push({d:+(isD(r.Promised_Date)?r.Promised_Date:snap),q,po:r.PO_ID});
  if(!isRec(r.PO_Status))oc[id]=(oc[id]||0)+Math.max(0,q-(isN(r.Received_Qty)?r.Received_Qty:0))});
 const sv_=o=>Object.values(o).reduce((a,b)=>a+b,0),POR={invRM:I.filter(r=>mm[r.Item_ID]).reduce((s,r)=>s+(isN(r.On_Order_Qty)?r.On_Order_Qty:0),0),invFG:I.filter(r=>pm[r.Item_ID]).reduce((s,r)=>s+(isN(r.On_Order_Qty)?r.On_Order_Qty:0),0),snap:sv_(os),now:sv_(oc),PC},mis=I.filter(r=>mm[r.Item_ID]&&r.On_Order_Qty!==(os[r.Item_ID]||0)).length;
 POR.gap=POR.invRM-POR.snap;POR.explained=POR.invRM>0?Math.min(POR.snap,POR.invRM)/POR.invRM:null;POR.mis=mis;
 POR.status=!PO.length?'Cannot assess (no purchase orders)':POR.gap===0&&mis===0?'Reconciled':POR.gap===0?'Totals match, but individual materials differ':POR.gap<0?'Unreconciled: purchase orders exceed inventory on-order':POR.explained>=.9?'Mostly reconciled':POR.explained>=.1?'Partly reconciled':'Largely unreconciled';
const npo=grp(PO,r=>r.Material_ID),recon=I.filter(r=>mm[r.Item_ID]).map(r=>{const id=r.Item_ID,g=r.On_Order_Qty-(os[id]||0);return {id,name:mm[id].Material_Name,inv:r.On_Order_Qty,po:os[id]||0,gap:g,val:g*r.Unit_Cost_GBP,n:(npo[id]||[]).length,rop:r.Reorder_Point_Qty}});
 const sig={},dc=[];PO.forEach(r=>{const k=[r.Supplier_ID,r.Material_ID,+r.Order_Date,r.Ordered_Qty].join();sig[k]===undefined?sig[k]=r.PO_ID:sig[k]!==r.PO_ID&&dc.push(r.PO_ID)}); /* same-PO-number repeats are judged by the line rules above */ if(dc.length)add('Medium','Data quality','Purchase Orders','Possible duplicate POs (same supplier, material, date, qty)',dc);
 if(mis)add('High','Reconciliation','Inventory vs POs',`A reconciliation difference was detected between two source records: inventory On_Order_Qty (raw materials) is ${f(POR.invRM)} units, but purchase orders support ${f(POR.snap)} units outstanding at the snapshot date. ${f(POR.gap)} units (${mis} materials differ) cannot be explained from this workbook. This does not by itself show lost stock, mis-valued inventory or a purchasing error. Finished-goods On_Order_Qty (${f(POR.invFG)}) has no purchase-order source. On-order drives inventory position, so it should be confirmed before it is relied on.`,[]);
 // ---- demand
 const months=[...new Set(D.map(r=>+r.Month_Start))].sort(),n=cfg=>CFG.basis;
 const ds=grp(D,r=>r.SKU);Object.keys(ds).forEach(k=>ds[k].sort((a,b)=>a.Month_Start-b.Month_Start));
 const short=Object.keys(ds).filter(k=>ds[k].length<months.length);if(short.length)add('Medium','Data quality','Demand History','SKUs with missing months',short);
 const odd=D.filter(r=>r.Units_Sold<=0||!isFinite(r.Units_Sold)).map(r=>r.SKU);if(odd.length)add('Medium','Data quality','Demand History','Zero/negative demand months',odd);
 // ---- finished goods
 const dur=grp(PR,r=>r.SKU),sup={};
 const iso=ms=>new Date(ms).toISOString().slice(0,10);
 const mkLT=(pd,od,tot,sp,col)=>{const n=pd.length,avg=n?mean(pd):null,ex=tot-n,from=n?iso(Math.min(...od.map(o=>+o.Actual_Start_Date))):null,to=n?iso(Math.max(...od.map(o=>+o.Actual_Finish_Date))):null,enough=n>=CFG.ltMinN,
   calc=n?`average of (actual finish − actual start) in days over ${n} completed production order${n>1?'s':''}, minimum 1 day each; records ${from} to ${to}${ex?`; ${ex} order(s) excluded for missing or invalid dates`:''}`:'';
  if(sp!=null)return {value:sp,source:'Supplied',label:'Supplied',n,enough:true,from,to,basis:`Products.${col} as supplied by the business${n?`; production history averages ${f(avg,1)} d over ${n} orders (${from} to ${to}), shown for comparison only`:''}`};
  if(n)return {value:avg,source:enough?'Calculated':'Estimated',label:enough?'Calculated (production history)':'Estimated (limited sample)',n,enough,from,to,basis:calc+(enough?'':`; fewer than ${CFG.ltMinN} orders, so treat as an estimate`)};
  return {value:CFG.fgLT,source:'Assumed',label:'Assumed (default setting)',n:0,enough:false,from:null,to:null,basis:`no usable production history${tot?` (${tot} order(s) have missing or invalid dates)`:''}; the default setting of ${CFG.fgLT} days is used and is not a figure from the data`}};
 const fg=I.filter(r=>pm[r.Item_ID]).map(r=>{const p=pm[r.Item_ID],h=(ds[r.Item_ID]||[]).map(x=>x.Units_Sold),fc=(ds[r.Item_ID]||[]).map(x=>x.Forecast_Units);
  const m=mean(tail(h,CFG.basis)),sg=sd(h),cv=mean(h)?sg/mean(h):null,tr=h.length>=6&&mean(h.slice(0,-3))?mean(tail(h,3))/mean(h.slice(0,-3))-1:null;
  const V=h.map((a,i)=>({a,f:fc[i]})).filter(z=>isN(z.a)&&isN(z.f)),Sa=V.reduce((s,z)=>s+z.a,0),Sf=V.reduce((s,z)=>s+z.f,0),bias=Sa>0?(Sf-Sa)/Sa:null;
  const ae=V.map(z=>Math.abs(z.f-z.a)),mae=V.length?mean(ae):null,wape=Sa>0?ae.reduce((a,b)=>a+b,0)/Sa:null,fcu=Sf-Sa,
   od=(dur[r.Item_ID]||[]).filter(o=>isD(o.Actual_Start_Date)&&isD(o.Actual_Finish_Date)&&o.Actual_Finish_Date>=o.Actual_Start_Date),pd=od.map(o=>Math.max(1,dd(o.Actual_Start_Date,o.Actual_Finish_Date))),
   ltCol=Object.keys(P[0]||{}).find(c=>/lead.?time/i.test(c)),supLT=ltCol&&isN(p[ltCol])&&p[ltCol]>0?p[ltCol]:null,ltInfo=mkLT(pd,od,(dur[r.Item_ID]||[]).length,supLT,ltCol);
  return {id:r.Item_ID,name:p.Product_Name,grp:p.Product_Family,cost:r.Unit_Cost_GBP,price:p.Selling_Price_GBP,oh:r.On_Hand_Qty,al:r.Allocated_Qty,oo:CFG.sup===1?r.On_Order_Qty:0,ooI:r.On_Order_Qty,rop:r.Reorder_Point_Qty,ss:r.Safety_Stock_Qty,
   m,sg,cv,tr,bias,mae,wape,fcu,h,hd:(ds[r.Item_ID]||[]).map(z=>+z.Month_Start),nV:V.length,sgn:V.filter(z=>z.f>z.a).length,sgl:V.filter(z=>z.f<z.a).length,ltN:pd.length,fc,lt:ltInfo.value,ltInfo,ltSrc:ltInfo.source,annual:mean(h)*12,type:'FG'}});
 // ---- materials: estimated consumption via BOM (qty × (1+scrap) × units sold)
 const use={},useM={};B.forEach(b=>{(ds[b.SKU]||[]).forEach((x,i)=>{const u=x.Units_Sold*b.Qty_Per_Finished_Unit*(1+b.Scrap_Factor_Pct);(use[b.Material_ID]=use[b.Material_ID]||[])[i]=((use[b.Material_ID]||[])[i]||0)+u})});
 // supplier performance
 Object.entries(grp(PO,r=>r.Supplier_ID)).forEach(([k,all])=>{const a=all.filter(r=>r.Received_Date instanceof Date&&r.Received_Date<=snap&&r.Order_Date<=snap);if(!a.length)return;
  // Metric-specific eligibility: each metric uses only the received lines whose own inputs are valid. A blank, text, negative or otherwise invalid value is unknown, never zero, and never makes the whole supplier unassessable.
  const ad=a.filter(r=>isD(r.Promised_Date)),aq=a.filter(r=>isN(r.Ordered_Qty)&&isN(r.Received_Qty)&&r.Ordered_Qty>0&&r.Received_Qty>=0), // on-time and lateness need a valid promised date; fill needs valid quantities
   late=ad.map(r=>dd(r.Promised_Date,r.Received_Date)),lt=a.map(r=>dd(r.Order_Date,r.Received_Date)),otd=ad.length?late.filter(x=>x<=CFG.grace).length/ad.length*100:null,fill=aq.length?aq.reduce((s,r)=>s+Math.min(r.Received_Qty,r.Ordered_Qty),0)/aq.reduce((s,r)=>s+r.Ordered_Qty,0)*100:null,over=aq.reduce((s,r)=>s+Math.max(0,r.Received_Qty-r.Ordered_Qty),0),overN=aq.filter(r=>r.Received_Qty>r.Ordered_Qty).length,stab=100-Math.min(100,mean(lt)?sd(lt)/mean(lt)*200:100),ls=ad.length?100-Math.min(100,Math.max(0,mean(late))*10):null,
   score=ad.length&&aq.length?.5*otd+.2*stab+.15*Math.min(100,fill)+.15*ls:null; // existing weights and formula; null (never NaN, never zero) when a required metric has no valid eligible line
  sup[k]={poTotal:all.length,known:!!sm[k],from:iso(Math.min(...a.map(r=>+r.Order_Date))),to:iso(Math.max(...a.map(r=>+r.Received_Date))),id:k,name:(sm[k]||{}).Supplier_Name||k,n:a.length,nOtd:ad.length,nLt:a.length,nFill:aq.length,invQ:a.length-aq.length,invD:a.length-ad.length,otd,late:ad.length?mean(late):null,ltA:mean(lt),ltS:sd(lt),stated:(sm[k]||{}).Standard_Lead_Time_Days,fill,over,overN,delayed:late.filter(x=>x>CFG.grace).length,shortN:aq.filter(r=>r.Received_Qty<r.Ordered_Qty).length,excl:all.filter(r=>r.Order_Date<=snap).length-a.length,score,cat:score===null?SUP_NA:score>=CFG.supLow?'Low risk':score>=CFG.supMed?'Medium risk':'High risk',risk:0,val:0,mats:0}});
 const poBySup=grp(PO,r=>r.Supplier_ID);
 new Set([...S.map(s=>s.Supplier_ID),...M.map(m=>m.Default_Supplier_ID)].filter(Boolean)).forEach(id=>{if(sup[id])return;const all=poBySup[id]||[];sup[id]={poTotal:all.length,known:!!sm[id],from:null,to:null,id,name:(sm[id]||{}).Supplier_Name||id+' (not in Suppliers sheet)',n:0,otd:null,late:null,ltA:null,ltS:null,stated:(sm[id]||{}).Standard_Lead_Time_Days,fill:null,over:0,overN:0,delayed:0,shortN:0,nOtd:0,nLt:0,nFill:0,invQ:0,invD:0,excl:all.filter(r=>isD(r.Order_Date)&&r.Order_Date<=snap).length,score:null,cat:SUP_NA,risk:0,val:0,mats:0}});
 Object.values(sup).forEach(s=>{const ne=Math.min(s.nOtd,s.nLt,s.nFill); // evidence = the smallest number of VALID ELIGIBLE records behind any required metric (not the number of imported PO lines); same thresholds as before
  s.evid=ne===0?'None':ne<CFG.supMinPO?'Limited':'Adequate';s.reason=s.score!==null?'':s.n===0?'No delivery history':'Data problem';
  const dpn=[s.invQ?s.invQ+' received line(s) with invalid or missing quantities left out of the fill rate':'',s.invD?s.invD+' received line(s) with an invalid or missing promised date left out of on-time and lateness':''].filter(Boolean).join('; ');s.dpNote=dpn;
  s.assess=s.n===0?(s.poTotal?'Insufficient evidence: no PO received by the snapshot':'Insufficient evidence: no purchase orders on file'):s.score===null?'Data problem: '+[s.nFill===0?'none of the '+s.n+' received PO lines has valid quantities, so the fill rate cannot be assessed':'',s.nOtd===0?'none of the '+s.n+' received PO lines has a valid promised date, so on-time and lateness cannot be assessed':''].filter(Boolean).join('; ')+'. Metrics that can still be assessed are shown; no overall score is calculated, and this is not a performance classification':(s.cat==='High risk'?(s.evid==='Adequate'?'Performance problem':'Possible problem, limited history'):s.cat==='Medium risk'?'Some concern':'No performance concern')+(dpn?' (data problem: '+dpn+')':'')});
 const fgm=Object.fromEntries(fg.map(x=>[x.id,x])),bom=grp(B,r=>r.Material_ID);
 const rm=I.filter(r=>mm[r.Item_ID]).map(r=>{const m=mm[r.Item_ID],h=(use[r.Item_ID]||[]).map(x=>x||0),s=sup[m.Default_Supplier_ID]||{},sS=sm[m.Default_Supplier_ID]||{},stated=isN(m.Lead_Time_Days)&&m.Lead_Time_Days>0?m.Lead_Time_Days:null,supStd=isN(sS.Standard_Lead_Time_Days)&&sS.Standard_Lead_Time_Days>0?sS.Standard_Lead_Time_Days:null,
   base=stated!=null?stated:supStd!=null?supStd:s.ltA!=null?s.ltA:CFG.fgLT,baseSrc=stated!=null?'Supplied':supStd!=null?'Supplied (supplier standard)':s.ltA!=null?'Calculated (supplier PO history)':'Assumed (default setting)',
   adjD=CFG.late&&(stated!=null||supStd!=null)?Math.max(0,s.late||0):0,adj=base+adjD,bl=bom[r.Item_ID]||[],
   ltInfo={value:adj,source:baseSrc,label:baseSrc+(adjD>0?' + calculated lateness':''),n:s.n||0,enough:(s.n||0)>=CFG.ltMinSup,from:s.from||null,to:s.to||null,
    basis:`${stated!=null?'Materials.Lead_Time_Days':baseSrc} = ${f(base,1)} d${adjD>0?` plus ${f(adjD,1)} d average supplier lateness (calculated from ${s.n} POs, ${s.from} to ${s.to}; mean of received − promised date)`:((s.n||0)===0?'; this supplier has no delivery history, so no lateness adjustment could be calculated (it is not assumed to be zero)':'; no supplier lateness added')}${(s.n||0)>0&&(s.n||0)<CFG.ltMinSup?`; supplier history is under ${CFG.ltMinSup} POs, so the lateness adjustment is an estimate`:''}`};
  return {id:r.Item_ID,name:m.Material_Name,grp:m.Material_Name.replace(/\s*(Grade\s*)?\d+$/,''),sup:m.Default_Supplier_ID,cost:r.Unit_Cost_GBP,oh:r.On_Hand_Qty,al:r.Allocated_Qty,oo:CFG.sup===1?r.On_Order_Qty:(os[r.Item_ID]||0),ooI:r.On_Order_Qty,rop:r.Reorder_Point_Qty,ss:r.Safety_Stock_Qty,
   m:mean(tail(h,CFG.basis)),sg:sd(h),cv:mean(h)?sd(h)/mean(h):null,h,supOtd:s.otd,lt0:base,lt:adj,ltInfo,ltS:s.ltS||0,moq:m.Minimum_Order_Qty,annual:mean(h)*12,n:bl.length,
   exposed:bl.reduce((a,b)=>a+((fgm[b.SKU]||{}).m||0)*((fgm[b.SKU]||{}).price||0),0),type:'RM'}});
 const flagged=new Set([...cm,...neg,...ao,...rs]);
 const hs=x=>{const w=[],a=(n,t)=>{if(n>0)w.push([n,t])};a(x.av<=0&&x.d>0?30:x.fSS?20:0,'stockout / below safety stock');a(x.fLTp?20:x.fLT?8:0,'cover below lead time');a(x.fROP?8:0,'below reorder point');
  a(x.fEx?Math.min(25,Math.round((x.cover/CFG.excess-1)*20)+5):0,'excess cover');a(x.cv>CFG.y?10:x.cv>CFG.x?4:0,'demand variability');a(x.type==='RM'&&x.supOtd!=null&&x.supOtd<CFG.otd?8:0,'unreliable supplier');a(x.bias!=null&&Math.abs(x.bias)>.15?6:0,'forecast bias');a(flagged.has(x.id)?6:0,'data-quality flag');
  x.hp=w;x.score=Math.max(0,100-w.reduce((s,y)=>s+y[0],0));x.cat=x.score>=90?'Excellent':x.score>=75?'Healthy':x.score>=60?'Monitor':x.score>=40?'At risk':'Critical'};
 const conf=x=>{const w=[];if(x.type==='RM')w.push('consumption estimated from BOM, not recorded');if(x.h.length<CFG.fcAdeqN)w.push('short demand history');if(flagged.has(x.id))w.push('data-quality flag on this item');if(x.cv>CFG.y)w.push('volatile demand');if(x.fND)w.push(NODEM);
  if(x.fLT||x.fLTp||x.sev>=2){const q=sup[x.sup];if(x.type==='RM'){if(q&&q.n===0)w.push('supplier has no delivery history');else if(!q||q.n<CFG.ltMinSup||q.cat==='High risk'||q.score===null)w.push('lead time rests on a small or unreliable supplier sample')}if(x.type==='FG'&&x.ltInfo.source!=='Supplied'&&x.ltN<CFG.ltMinN)w.push('lead time is a proxy from too few production orders')}
  x.cw=w;fin(x)};
 const dead=x=>{const L=x.h.map((v,i)=>v>0?i:-1).reduce((a,b)=>Math.max(a,b),-1);x.msl=x.h.length&&L>=0?x.h.length-1-L:null;
  x.cls=x.oh>0&&(x.fND||L<0)?'No recorded demand':x.msl>=6&&x.oh>0?'Potentially obsolete':x.fEx?'Excess stock':(x.tr!=null&&x.tr<-.25)||(x.cover!=null&&x.cover>60)?'Slow-moving':'Active';
  x.act={'No recorded demand':'Investigate – confirm item is still sold/used','Potentially obsolete':'Investigate obsolete stock; stop purchasing','Excess stock':x.bias>.15?'Review demand forecast; reduce future purchasing/production':'Reduce future purchasing/production','Slow-moving':'Review future production/purchasing; monitor','Active':''}[x.cls]};
 const risk=x=>{const d=x.m/DPM;x.d=d;x.av=x.oh-x.al;x.pos=x.av+x.oo;x.cover=d>0?x.av/d:null;x.pcover=d>0?x.pos/d:null;x.val=x.oh*x.cost;x.ann=x.annual*x.cost;
  x.ssR=CFG.z*Math.sqrt(x.lt*(x.sg/Math.sqrt(DPM))**2+(d*(x.ltS||0))**2);x.ropR=d*x.lt+x.ssR;
  x.ssU=CFG.pol?x.ssR:x.ss;x.ropU=CFG.pol?x.ropR:x.rop;x.fSS=x.av<x.ssU;x.fROP=x.pos<x.ropU;x.fLT=x.cover!=null&&x.cover<x.lt;x.fLTp=x.pcover!=null&&x.pcover<x.lt;x.fEx=x.cover!=null&&x.cover>CFG.excess;x.fND=d===0;
  x.exQty=d>0?Math.max(0,x.av-CFG.excess*d):(x.av>0?x.av:0);x.exVal=x.exQty*x.cost;x.short=x.fSS?(x.ssU-x.av)*x.cost:0;
  x.sev=d>0&&x.av<=0||(x.fSS&&x.fLTp)?3:x.fSS||x.fLTp?2:x.fROP||x.fLT?1:0;
  x.ropGap=x.ropR>0?x.rop/x.ropR-1:null;x.verdict=x.ropGap==null?'–':x.ropGap<-.2?'Existing ROP insufficient':x.ropGap>.2?'Existing ROP possibly excessive':'Broadly aligned';
  x.why=[x.av<=0&&d>0?'no available stock':'',x.fSS?`avail ${f(x.av)} < safety ${f(x.ssU)}`:'',x.fLTp?`position cover ${f(x.pcover,1)}d < lead time ${f(x.lt,1)}d`:x.fLT?`avail cover ${f(x.cover,1)}d < lead time ${f(x.lt,1)}d (relies on open orders)`:'',x.fROP&&!x.fSS?'position below reorder point':'',x.fEx?`cover ${f(x.cover)}d > ${CFG.excess}d`:'',x.fND?'no demand':'',
   x.cv>CFG.y?'volatile demand':'',x.tr!=null&&Math.abs(x.tr)>.25?`recent trend ${f(x.tr*100)}%`:'',x.bias!=null&&Math.abs(x.bias)>.15?`forecast bias ${f(x.bias*100)}%`:''].filter(Boolean).join('; ');
  x.xyz=x.cv==null?'–':x.cv<=CFG.x?'X':x.cv<=CFG.y?'Y':'Z';hs(x);dead(x);conf(x)};
 [...fg,...rm].forEach(risk);
 [fg,rm].forEach(a=>{const t=a.reduce((s,x)=>s+x.ann,0)||1;let c=0;[...a].sort((x,y)=>y.ann-x.ann).forEach((x,i)=>{c+=x.ann;x.cum=c/t*100;x.abc=i===0||x.cum<=CFG.abcA+1e-9?'A':x.cum<=CFG.abcB+1e-9?'B':'C'})});
 rm.forEach(x=>{const s=sup[x.sup];if(s){s.val+=x.val;s.mats++;if(x.sev>=2)s.risk++}});
 const nu=[...fg,...rm].filter(x=>x.fND&&x.oh>0).map(x=>x.id);if(nu.length)add('Medium','Operational','Inventory','Stock held with no demand',nu);
 // ---- production
 const pr=Object.entries(grp(PR,r=>r.SKU)).map(([k,a])=>{const ok=a.filter(o=>isN(o.Planned_Qty)&&o.Planned_Qty>0&&isN(o.Completed_Qty)&&o.Completed_Qty>=0),dl=a.filter(o=>isD(o.Planned_Finish_Date)&&isD(o.Actual_Finish_Date)),lateN=dl.filter(o=>dd(o.Planned_Finish_Date,o.Actual_Finish_Date)>0).length,pl=ok.reduce((s,o)=>s+o.Planned_Qty,0),ac=ok.reduce((s,o)=>s+o.Completed_Qty,0);
  return {id:k,n:a.length,nDL:dl.length,lateN,late:dl.length?lateN/dl.length*100:null,slip:dl.length?mean(dl.map(o=>dd(o.Planned_Finish_Date,o.Actual_Finish_Date))):null,nQ:ok.length,exQ:a.length-ok.length,planned:pl,actual:ac,att:ok.length?mean(ok.map(o=>o.Completed_Qty/o.Planned_Qty))*100:null,wAtt:pl>0?ac/pl*100:null}}).sort((a,b)=>(b.late??-1)-(a.late??-1)||(b.slip??-99)-(a.slip??-99));
 const sum=(a,k)=>a.reduce((s,x)=>s+x[k],0),tot=sum(fg,'val')+sum(rm,'val');
 const top=[...fg,...rm].sort((a,b)=>b.val-a.val),fam={};fg.forEach(x=>fam[x.grp]=(fam[x.grp]||0)+x.val);const rg={};rm.forEach(x=>rg[x.grp]=(rg[x.grp]||0)+x.val);
 const nt=scanNotes();
 return {demo:nt.demo,declared:nt.ids,notes:nt.notes,title:(typeof WBNAME!=='undefined'&&WBNAME)||'uploaded workbook',months,prRows:PR,bomS:grp(B,r=>r.SKU),recon,sched,bom,fgm,po:POR,hasF:D.some(r=>typeof r.Forecast_Units==='number'),dq,fg,rm,sup:Object.values(sup).sort((a,b)=>(b.score??-1)-(a.score??-1)||(a.id<b.id?-1:1)),supRisk:Object.values(sup).sort((a,b)=>b.risk-a.risk||(a.score??1e9)-(b.score??1e9)||(a.id<b.id?-1:1)),pr,snap,fam,rg,top,tot,fgV:sum(fg,'val'),rmV:sum(rm,'val'),exV:sum(fg,'exVal')+sum(rm,'exVal'),exF:sum(fg,'exVal'),exR:sum(rm,'exVal'),shV:sum(fg,'short')+sum(rm,'short'),
  top10:top.slice(0,10).reduce((s,x)=>s+x.val,0)/tot*100,cogsF:sum(fg,'ann'),cogsR:sum(rm,'ann')}}
const NODEM='no demand recorded, so cover and risk cannot be judged';
const fin=x=>{x.confWhy=x.cw.join('; ')||'recorded data, full history, stable demand';x.conf=x.cw.includes(NODEM)?'Cannot assess':x.cw.length===0?'High':x.cw.length===1?'Medium':'Low'};
function memo(k,fn){const g=k+JSON.stringify(CFG);R.memo=R.memo||{};return R.memo[g]||(R.memo[g]=fn())}
function mrp(){return memo('mrp',mrpCalc)}
function feas(){return memo('feas',feasCalc)}
function mrpCalc(){const H=Math.min(12,Math.max(1,CFG.hor)),t0=+R.snap;return R.rm.map(x=>{const rc=(R.sched[x.id]||[]).filter(r=>(r.d-t0)/864e5<=H*DPM),rqV=rc.reduce((q,r)=>q+r.q,0),rq=CFG.sup===1?x.ooI:rqV,alt=CFG.sup===1?rqV:x.ooI,gross=x.m*H,need=gross+x.ssU-x.av,net=Math.max(0,need-rq),netU=Math.max(0,need-alt),qty=net>0?Math.ceil(net/(x.moq||1))*(x.moq||1):0,days=x.d>0?(x.av+rq)/x.d:null,ob=days==null?null:days-x.lt,
  dt=d=>d==null?'–':new Date(t0+Math.max(0,d)*864e5).toISOString().slice(0,10),st=net<=0?'Covered':ob<=0?'ORDER NOW':ob<=14?'Order soon':'Plan',
  aff=(R.bom[x.id]||[]).map(b=>b.SKU+' ('+f(((R.fgm[b.SKU]||{}).m||0))+'/mo)').join(', ');
  return {x,rq,gross,net,netU,qty,val:qty*x.cost,out:dt(days),by:ob!=null&&ob<=0?'overdue by '+f(-ob)+'d':dt(ob),st,aff}})}
const openPR=()=>R.prRows.filter(o=>!['complete','completed','closed','cancelled'].includes(String(o.Order_Status).toLowerCase())||o.Planned_Start_Date>R.snap);
function feasCalc(){const t0=+R.snap,day=864e5,pool={},sd=d=>new Date(d).toISOString().slice(0,10);
 R.rm.forEach(x=>{const rc=CFG.sup===1?(x.ooI>0?[{d:t0+x.lt*day,q:x.ooI}]:[]):(R.sched[x.id]||[]).map(r=>({d:Math.max(r.d,t0),q:r.q}));pool[x.id]={a:Math.max(0,x.av),r:rc.sort((p,q)=>p.d-q.d),x}});
 const op=openPR().map(o=>({id:o.Production_Order_ID,sku:o.SKU,q:o.Planned_Qty,st:+o.Planned_Start_Date})),sim=!op.length,
  ord=(sim?R.fg.filter(x=>x.m>0).sort((a,b)=>(a.cover??1e9)-(b.cover??1e9)).map((x,i)=>({id:'SIM'+(i+1),sku:x.id,q:Math.round(x.m),st:t0+(1+i)*day})):op).sort((a,b)=>a.st-b.st);
 return {sim,rows:ord.map(o=>{const L=R.bomS[o.sku]||[],bl=[];let inc=0,risk=0,miss=!L.length,use=[];
  L.forEach(l=>{const m=pool[l.Material_ID];if(!m){miss=true;return}const req=o.q*l.Qty_Per_Finished_Unit*(1+l.Scrap_Factor_Pct),by=m.a+m.r.filter(r=>r.d<=o.st).reduce((q,r)=>q+r.q,0);use.push([m,req]);
   if(m.a>=req)return;if(by>=req){inc++;const sp=R.sup.find(z=>z.id===m.x.sup);if(CFG.sup===1||(sp&&sp.otd!=null&&sp.otd<CFG.otd))risk++;return}
   let c=m.a,when=null;for(const r of m.r){c+=r.q;if(c>=req){when=r.d;break}}bl.push({id:m.x.id,sh:req-by,when:when==null?t0+m.x.lt*day:when,sched:when!=null})});
  const dl=bl.length?Math.max(...bl.map(b=>(b.when-o.st)/day)):0,status=miss?'Insufficient information':bl.length?'Material shortage':inc?(risk?'At risk':'Feasible with incoming materials'):'Feasible';
  if(!bl.length&&!miss)use.forEach(([m,req])=>{let t=Math.min(m.a,req);m.a-=t;let rem=req-t;for(const r of m.r){if(rem<=0)break;const u=Math.min(r.q,rem);r.q-=u;rem-=u}});
  const w=[sim?'illustrative order, not in workbook':'',risk&&CFG.sup===1?'relies on unverified on-order':risk?'depends on supplier with weak on-time record':'',bl.some(b=>!b.sched)?'availability assumes a new order today':''].filter(Boolean),d=w.length;
  return {o,status,bl,dl,delay:status==='Material shortage'?'Likely: ~'+f(dl)+'d':status==='At risk'?'Possible':status==='Insufficient information'?'Unknown':'Not from materials',start:sd(o.st),conf:d===0?'High':d===1?'Medium':'Low',why:(w.join('; ')||'recorded stock and PO data')+'; materials only (no capacity or routing data)',sd}})}}
const minC=a=>a.some(x=>x.conf==='Low'||x.conf==='Cannot assess')?'Low':a.some(x=>x.conf==='Medium')?'Medium':'High';
function qs(){const o=[],P=R.po,d=m=>R.dq.some(x=>x.msg.includes(m)),add=(pri,q,why,ev)=>o.push({pri,q,why,ev});
 if(P.invRM!==P.snap)add('High','How does the inventory system calculate On_Order_Qty? Does it include planned or unconfirmed orders, orders outside this PO list, or forecast-based orders? Please provide the open PO ledger at the snapshot date.','Inventory on-order differs from snapshot-dated POs; it drives inventory position, MRP and risk classes.',`${f(P.invRM)} recorded vs ${f(P.snap)} on POs: ${f(P.invRM-P.snap)} units unexplained`);
 if(P.invFG>0)add('High','What do finished-goods On_Order_Qty figures represent, and which production orders support them?','No source for them in the workbook.',`${f(P.invFG)} units`);
 if(!openPR().length)add('High','Please provide open and planned production orders, with materials already issued.','All production orders are complete, so feasibility can only be tested on illustrative orders.',`${R.prRows.length} orders, none open`);
 if(d('Received date after'))add('Medium','Why do some POs marked Received carry receipt dates after the inventory snapshot? Were expected dates entered early?','Affects outstanding supply and supplier performance.',R.dq.find(x=>x.msg.includes('Received date after')).ex);
 if(d('received short'))add('Medium','When a PO is received short, is the balance back-ordered or closed?','Decides whether short receipts remain outstanding supply.',R.dq.find(x=>x.msg.includes('received short')).msg);
 if(d('Selling price below'))add('Medium','Are standard costs current, and are these low-priced products intentional (contract or loss-leader pricing)?','Margins below cost affect value-based priorities.',R.dq.find(x=>x.msg.includes('Selling price below')).ex);
 if(d('fractional'))add('Low','Please confirm units of measure and BOM quantities for materials counted in "each".','Fractional quantities of discrete units distort estimated usage.',R.dq.find(x=>x.msg.includes('fractional')).msg);
 const ins=[...R.fg,...R.rm].filter(x=>x.verdict==='Existing ROP insufficient').length;if(ins)add('Medium','How are reorder points and safety stocks set, and are supplier lead times and lateness considered?','Calculated policy suggests existing reorder points are too low for some items.',`${ins} items`);
 const ws=R.sup.filter(s=>s.cat==='High risk');if(ws.length)add('Medium','Is the promised date confirmed by the supplier or requested by the buyer? Any expediting or contract terms?','Weak on-time delivery shapes lead-time risk.',ws.map(s=>s.id+' '+f(s.otd)+'%').join(', '));
 const nh=R.sup.filter(s=>s.n===0);if(nh.length)add('Medium','Can you provide delivery history for suppliers that have no purchase order received by the snapshot?','These suppliers cannot be scored, so they are shown as '+SUP_NA+' rather than as good or bad; their materials still count in the risk results.',nh.map(s=>s.id).join(', '));
 const dpS=R.sup.filter(s=>s.reason==='Data problem');if(dpS.length)add('Medium','Can you correct or confirm the purchase-order quantities and dates for these suppliers?','Their received lines contain invalid or missing values, so no overall score can be calculated. This is a data problem, not a performance finding; the metrics that can be assessed are still shown.',dpS.map(s=>s.id).join(', '));
 if(R.fg[0]&&R.fg[0].h.length<24)add('Low','Can you provide 24–36 months of demand history?','Under 24 months prevents seasonality testing and weakens forecasts.',R.fg[0].h.length+' months supplied');
 return o}
function link(){const m=Object.fromEntries([...R.altS.fg,...R.altS.rm].map(x=>[x.id,x]));[...R.fg,...R.rm].forEach(x=>{if(m[x.id].sev!==x.sev){x.cw.push('risk class changes with the supply source (on-order does not reconcile to POs)');fin(x)}})}

function scanNotes(){const req=['Products','Materials','BOM','Demand History','Inventory','Suppliers','Purchase Orders','Production Orders'],o={demo:null,ids:[],notes:[]},re=/synthetic|fictional|simulated|seeded|demonstration|test data/i;
 WB.SheetNames.filter(n=>!req.includes(n)).forEach(n=>{const ra=XLSX.utils.sheet_to_json(WB.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(v=>String(v)).filter(Boolean)).filter(r=>r.length),lines=ra.map(r=>r.join(' | '));
  const hit=lines.find(t=>re.test(t));if(hit&&!o.demo)o.demo={sheet:n,text:hit.slice(0,220)};
  if(/qa|seed|scenario|test/i.test(n)){o.notes.push({sheet:n,rows:lines.slice(0,25)});(lines.join(' ').match(/\b[A-Z]{2,4}-?\d{2,5}\b/g)||[]).forEach(id=>{if(!o.ids.includes(id))o.ids.push(id)})}});
 return o}
