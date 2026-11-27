/* Chain Genius – Inventory Intelligence Engine v0.6
 * forecasting.js
 * Demand forecasting: methods, rolling back-tests, trend and seasonality tests, uncertainty ranges, recommendations.
 * Plain script (no build step). Load order in index.html: calculations → forecasting → app → excel-import.
 */
const FM={mean:(h,k)=>Array(k).fill(mean(h)),ma3:(h,k)=>Array(k).fill(mean(h.slice(-3))),ma6:(h,k)=>Array(k).fill(mean(h.slice(-6))),wma3:(h,k)=>{const [a,b,c]=h.slice(-3).reverse();return Array(k).fill((3*a+2*b+c)/6)},
 trend:(h,k)=>{const n=h.length,mx=(n-1)/2,my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(i-mx)*(y-my);sxx+=(i-mx)**2});const b=sxx?sxy/sxx:0,a=my-b*mx;return Array.from({length:k},(_,j)=>Math.max(0,a+b*(n+j)))}},
 FMIN={mean:3,ma3:3,ma6:6,wma3:3,trend:6,seasonal:24},FNAME={mean:'Average of all months',ma3:'3-month moving average',ma6:'6-month moving average',wma3:'Weighted 3-month average (3-2-1)',trend:'Linear trend',seasonal:'Seasonal index × level (EXPERIMENTAL)'};
/* X1 WP6 (owner D6, 21 Nov 2026): a missing demand month is UNKNOWN, never 0. SUPERSEDED in part by Stage 3B Phase 3 (owner rules D–F,
 * 25 Nov 2026; stage3-design/stage3b/phase3/): the forecast no longer uses only the last unbroken run of months. Every usable month is
 * kept at its true CALENDAR position (x.hc, null = missing); nothing is filled in or squeezed together; every product's forecast starts
 * the month after the GLOBAL boundary (the last month with data anywhere in the workbook).
 * How each method meets the calendar (FMIN = least usable months):
 *  - mean (3): the average of the usable months; their order does not matter, so gaps are safe.
 *  - ma3 / wma3 (3), ma6 (6): need the 3 or 6 calendar months just before the month forecast all recorded; otherwise the method is not
 *    used for that forecast (never averaged across a gap, which would make it a different method).
 *  - trend (6): straight line fitted to the usable months at their calendar positions (elapsed time), extended to the months forecast.
 *  - seasonal (24, experimental): month-of-year indices from the usable months at their calendar months; level and trend as above.
 * When the months used have no gap (the usual case) the original arithmetic runs unchanged (identical results, proven); positions
 * only matter when there are gaps. A gap alone never refuses a forecast. SUPERSEDED (owner decision 27 Nov 2026): the single 6-month
 * product gate is removed; each method keeps its own minimum (FMIN), a product is forecast when at least one method can calculate
 * (3 usable months), and every result carries its reliability level (levels, tier, tierWhy) so limited reliability is stated. Missing months at the end widen the uncertainty range (it grows with the distance from the last recorded
 * month) and lower confidence one level. */
const calObs=x=>{const hc=Array.isArray(x.hc)?x.hc:(x.h||[]),ix=[];hc.forEach((v,i)=>{if(v!==null&&v!==undefined)ix.push(i)});
 if(!ix.length)return {n:0,p:[],v:[],gaps:0,trail:0,lead:hc.length,T:0,M:hc.length};const a=ix[0],b=ix[ix.length-1];
 return {n:ix.length,p:ix.map(i=>i-a),v:ix.map(i=>hc[i]),gaps:hc.slice(a,b+1).filter(v=>v===null).length,trail:hc.length-1-b,lead:a,T:hc.length-a,M:hc.length,a}},
 gapTxt=G=>[G.gaps?G.gaps+' missing month(s) inside the history':'',G.trail?G.trail+' missing month(s) at the end':''].filter(Boolean).join(' and ')+' are unknown, not zero, and are left as gaps (never filled in); the forecast still starts the month after the last month in the workbook, and methods that need the most recent consecutive months are not used';
const ols=h=>{const n=h.length,mx=(n-1)/2,my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(i-mx)*(y-my);sxx+=(i-mx)**2});const b=sxx?sxy/sxx:0;return {a:my-b*mx,b}};
const olsP=(P,V)=>{const n=V.length,mx=mean(P),my=mean(V);let sxy=0,sxx=0;V.forEach((y,i)=>{sxy+=(P[i]-mx)*(y-my);sxx+=(P[i]-mx)**2});const b=sxx?sxy/sxx:0;return {a:my-b*mx,b}};
function seasn(h,lm){const n=h.length;if(n<24)return null;const o=ols(h),fl=0.1*mean(h)+1e-9,t=Array(12).fill(0),c=Array(12).fill(0);h.forEach((v,i)=>{const tr=Math.max(fl,o.a+o.b*i),m=((lm-(n-1-i))%12+12)%12;t[m]+=v/tr;c[m]++});const raw=t.map((v,m)=>v/(c[m]||1)),mu=mean(raw)||1,idx=raw.map(v=>v/mu);return {idx,det:Math.max(...idx)-Math.min(...idx)>.3}}
/* seasonal indices from months at their calendar positions (Phase 3; used only when the months have gaps) */
function seasnP(P,V,moy){const n=V.length;if(n<24)return null;const o=olsP(P,V),fl=0.1*mean(V)+1e-9,t=Array(12).fill(0),c=Array(12).fill(0);V.forEach((v,i)=>{const tr=Math.max(fl,o.a+o.b*P[i]),m=moy(P[i]);t[m]+=v/tr;c[m]++});const raw=t.map((v,m)=>v/(c[m]||1)),mu=mean(raw)||1,idx=raw.map(v=>v/mu);return {idx,det:Math.max(...idx)-Math.min(...idx)>.3}}
const WIN={ma3:3,ma6:6,wma3:3};
/* forecast kk months starting at relative calendar position t from the usable months before t; null = the method cannot be used */
function fnC(k,O,t,kk,moy){let j=0;while(j<O.n&&O.p[j]<t)j++;const P=O.p.slice(0,j),V=O.v.slice(0,j);if(!j)return null;
 if(P[j-1]===t-1&&P[j-1]-P[0]===j-1){/* no gap in the months used and none before t: the original arithmetic, unchanged */
  if(k!=='seasonal')return FM[k](V,kk);const l=moy(t-1),q=seasn(V,l);if(!q)return Array(kk).fill(mean(V));const o=ols(V);return Array.from({length:kk},(_,i)=>Math.max(0,(o.a+o.b*(V.length+i))*q.idx[(l+1+i)%12]))}
 if(k==='mean')return Array(kk).fill(mean(V));
 if(WIN[k]){const w=WIN[k],need=Array.from({length:w},(_,i)=>t-w+i);if(!need.every(q=>P.includes(q)))return null;const W=need.map(q=>V[P.indexOf(q)]);return FM[k](W,kk)}
 const R0=P.map(q=>q-P[0]),t0=t-P[0];
 if(k==='trend'){const o=olsP(R0,V);return Array.from({length:kk},(_,i)=>Math.max(0,o.a+o.b*(t0+i)))}
 if(k==='seasonal'){const q=seasnP(R0,V,r=>moy(r+P[0]));if(!q)return Array(kk).fill(mean(V));const o=olsP(R0,V);return Array.from({length:kk},(_,i)=>Math.max(0,(o.a+o.b*(t0+i))*q.idx[moy(t+i)]))}
 return null}
function fcast(x,lastMs){const O=calObs(x),n=O.n,h=O.v,bm=new Date(lastMs).getUTCMonth(),moy=r=>((bm-(O.T-1-r))%12+12)%12,G={gaps:O.gaps,trail:O.trail},
 start=isFinite(lastMs)?(d=>Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1))(new Date(lastMs)):null;
 const MINN=Math.min(...Object.values(FMIN));if(n<MINN)return {n,ok:false,gaps:G.gaps,trail:G.trail,lead:O.lead,start,levels:Object.fromEntries(Object.keys(FMIN).map(k=>[k,'insufficient'])),why:`fewer than ${MINN} usable months of history: no method can calculate a forecast`+(G.gaps||G.trail?' ('+gapTxt(G)+')':'')};
 const full=!G.gaps&&!G.trail,sn=full?seasn(h,moy(O.T-1)):seasnP(O.p,h,moy),det=!!(sn&&sn.det);
 const na={};const meth=Object.keys(FM).filter(k=>{if(n<FMIN[k]){na[k]=`needs at least ${FMIN[k]} usable months (${n} available)`;return false}if(fnC(k,O,O.T,1,moy)===null){na[k]=`needs the ${WIN[k]} calendar months before the forecast start all recorded`;return false}return true});if(det)meth.push('seasonal');else na.seasonal=n<24?'needs at least 24 usable months':'no seasonal pattern detected';
 /* Back-test: every compared method is tested on the SAME months (the last W observations from where all of them can forecast).
    Owner decision 27 Nov 2026: a method must not stop the others being tested. If the compared methods share fewer than 3 test months,
    the method with the fewest testable months of its own (the longest-history one first) is left out of the comparison, repeatedly,
    keeping the largest shared set; a method left out stays usable only as "calculated, untested" and is never chosen over a tested one.
    With 3+ shared months nothing is left out, so the result is exactly the original rule: every gap-free series of 9+ months, except
    24–26 months with a detected seasonal pattern (seasonal, which needs 24 before its first test month, is then left out instead of
    leaving every method untested). */
 const W=Math.max(3,Math.min(6,CFG.fcTest||6)),btSet=M=>{const s0=Math.max(det&&M.includes('seasonal')?24:Math.max(...M.map(k=>FMIN[k])),n-W),out=[];let sk=0;for(let j=s0;j<n;j++){const t=O.p[j],pr=M.map(k=>{const r=fnC(k,O,t,1,moy);return r?r[0]:null});if(pr.some(v=>v===null)){sk++;continue}out.push({j,t,pr})}return {tg:out,sk}};
 let M=meth.slice(),B=btSet(M),cmpM=M,cmpB=B;
 while(cmpB.tg.length<3&&M.length>1){const own=M.map(k=>[k,btSet([k]).tg.length]).sort((a,b)=>a[1]-b[1]||FMIN[b[0]]-FMIN[a[0]]);M=M.filter(k=>k!==own[0][0]);B=btSet(M);if(B.tg.length>cmpB.tg.length){cmpM=M;cmpB=B}}
 const tg=cmpB.tg,skipped=cmpB.sk,bt={},untested=meth.filter(k=>!cmpM.includes(k));
 cmpM.forEach((k,mi)=>{let ae=0,ac=0,bs=0,se=0,p=0;tg.forEach(g=>{const fv=g.pr[mi],a=h[g.j];ae+=Math.abs(fv-a);ac+=a;bs+=fv-a;se+=(fv-a)**2;p++});bt[k]={wape:ac&&p?ae/ac:null,bias:ac&&p?bs/ac:null,rmse:p?Math.sqrt(se/p):null,pts:p}});
 untested.forEach(k=>{bt[k]={wape:null,bias:null,rmse:null,pts:0}});
 let best=meth[0];meth.forEach(k=>{if(bt[k].wape!=null&&(bt[best].wape==null||bt[k].wape<bt[best].wape-.005))best=k});
 const fv=fnC(best,O,O.T,12,moy),rm=bt[best].rmse!=null?bt[best].rmse:sd(h),rec12=h.filter((v,i)=>O.p[i]>=O.T-12),mu=mean(full?h.slice(-12):rec12),bd=j=>1.28*rm*Math.sqrt(1+(j+1+G.trail)/n),hi=fv.map((v,j)=>v+bd(j)),lo=fv.map((v,j)=>Math.max(0,v-bd(j))),rel=mu?rm/mu:null,unc=n<12||rel==null?'High':rel<.1?'Low':rel<.2?'Medium':'High';
 const P=O.p,mx=full?(n-1)/2:mean(P),my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(P[i]-mx)*(y-my);sxx+=(P[i]-mx)**2});const b=sxx?sxy/sxx:0,a=my-b*mx,sse=h.reduce((q,y,i)=>q+(y-a-b*P[i])**2,0),se=n>2&&sxx?Math.sqrt(sse/(n-2)/sxx):0,tt=se?b/se:0,tp=my?b/my*100:0,trend=n>=8&&Math.abs(tt)>2.2?(b>0?'Rising':'Falling'):'No significant trend';
 let wb=null;if(x.fc&&x.fc.length===n&&x.fc.every(v=>typeof v==='number')&&tg.length){let ae=0,ac=0;tg.forEach(g=>{ae+=Math.abs(x.fc[g.j]-h[g.j]);ac+=h[g.j]});wb=ac?ae/ac:null}
 const warn=[];if(G.gaps||G.trail)warn.push(gapTxt(G));if(G.trail)warn.push(`the last recorded month is ${G.trail} month(s) before the forecast start, so the forecast reaches further from known demand and is less reliable`);if(skipped)warn.push(`${skipped} back-test month(s) skipped because a method could not be tested across a gap`);if(untested.length)warn.push(`${untested.map(k=>FNAME[k].toLowerCase()).join(', ')} not tested (${G.gaps?'a missing month or too little history before the test months':'too little history before the test months'}), so not compared with the other methods`);if(n<6)warn.push(`only ${n} usable months: only ${meth.map(k=>FNAME[k].toLowerCase()).join(', ')} can be calculated, and the result is of limited reliability`);if(n<12)warn.push('under 12 months of history');if(n<24)warn.push('no seasonality test possible (needs 24+ months)');if(bt[best].pts<6)warn.push('only '+bt[best].pts+' back-test points');
 const cf0=n>=24&&unc==='Low'?'High':n>=12&&unc!=='High'?'Medium':'Low',cf=G.trail?(cf0==='High'?'Medium':'Low'):cf0,sm=k=>fv.slice(0,k).reduce((q,v)=>q+v,0);
 /* reliability level of each method (Phase 3 follow-up, owner decision 27 Nov 2026): insufficient = cannot calculate; calculable = calculated,
    never tested (no earlier month to test against); limited = tested on 1–2 months (accuracy not meaningful); tested = 3+ back-test months;
    comparable = 6+ back-test months, the same months for every method, with 2+ methods tested (a reliable comparison). */
 const lv=k=>!bt[k]?(n<FMIN[k]?'insufficient':'not used'):bt[k].pts===0?'calculable':bt[k].pts<3?'limited':bt[k].pts>=6&&meth.filter(q=>bt[q].pts>=6).length>=2?'comparable':'tested',
  levels=Object.fromEntries(Object.keys(FMIN).map(k=>[k,lv(k)])),tier=levels[best],pb=bt[best].pts,
  tierWhy=tier==='calculable'?`calculated from ${n} usable month(s), but there is no earlier month to test it against, so its accuracy is unknown`:tier==='limited'?`tested on only ${pb} month(s), too few to judge its accuracy`:tier==='tested'?`tested on ${pb} months; ${meth.length<2?'only one method could be tested':'too few months for a reliable comparison between methods'}`:`every method tested on the same ${pb} months: the methods are compared reliably`;
 return {ok:true,n,gaps:G.gaps,trail:G.trail,lead:O.lead,start,meth,na,levels,tier,tierWhy,bt,best,f:fv,hi,lo,s3:sm(3),s6:sm(6),s12:sm(12),act12:(full?h.slice(-12):rec12).reduce((q,v)=>q+v,0),act12n:full?Math.min(12,n):rec12.length,trend,tp,tt,unc,rel,rm,wb,wbBest:bt[best].wape,seas:sn,warn,conf:cf,confWhy:'history '+n+' months; forecast error '+(rel==null?'n/a':f(rel*100)+'% of demand')+'; '+(warn.join('; ')||'no history warnings')}}
const recFor=(F,x)=>{const r=[],c3=F.f.slice(0,3).reduce((a,b)=>a+b,0)/3,fc=c3>0?x.av/(c3/DPM):null;
 if(F.trend==='Rising')r.push(`Demand rising ~${f(F.tp,1)}%/month: review safety stock and production plan upward`);if(F.trend==='Falling')r.push(`Demand falling ~${f(-F.tp,1)}%/month: avoid building stock; review reorder policy`);
 if(x.cv>CFG.y)r.push('Volatile demand: keep a buffer and review responsiveness');
 if(fc!=null&&fc<x.lt)r.push(`Available stock covers ${f(fc,1)}d at forecast demand, below ${f(x.lt,1)}d lead time: replenish`);else if(fc!=null&&fc>CFG.excess)r.push(`Covers ${f(fc)}d at forecast demand: slow replenishment`);else if(fc!=null&&!isFinite(fc))r.push('Stock cover not assessed: available stock is unknown (On_Hand_Qty or Allocated_Qty missing or invalid), so no replenishment advice can be given');/* X1 (21 Nov 2026): say why, never drop the advice silently */
 if(F.wb!=null&&F.wbBest!=null){if(F.wb>F.wbBest+.05)r.push(`Statistical method beat the existing forecast over the same ${F.bt[F.best].pts} months (WAPE ${f(F.wbBest*100)}% vs ${f(F.wb*100)}%): consider it as baseline`);else if(F.wb<F.wbBest-.05)r.push('Existing forecast outperformed the statistical methods: keep it as baseline')}
 return r.slice(0,3).join('; ')||'No change indicated'};
const fcAll=()=>R.fcm||(R.fcm=Object.fromEntries(R.fg.map(x=>{const F=fcast(x,R.months[R.months.length-1]);if(F.ok)F.rec=recFor(F,x);return [x.id,F]})));

const med=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
function fcCred(x,exp){const h=x.h,n=h.length,seen=new Set((x.hd||[]).filter(v=>exp.includes(v))),missing=Math.max(0,exp.length-seen.size),zeros=h.filter(v=>v<=0).length,
 md=med(h),mad=h.length?med(h.map(v=>Math.abs(v-md))):0,fl=h.length>=CFG.fcMinN&&mad>0?h.map(v=>Math.abs(v-md)/(1.4826*mad)>CFG.outZ):h.map(()=>false),out=fl.filter((b,i)=>b&&!fl[i-1]&&!fl[i+1]).length,shift=fl.filter(Boolean).length-out,madZero=h.length>=CFG.fcMinN&&mad===0&&h.some(v=>v!==md),nV=x.nV||0,fcMiss=n-nV,ins=n<CFG.fcMinN||nV<CFG.fcMinN,iss=[];
 if(n<CFG.fcAdeqN)iss.push('only '+n+' periods of history');if(missing)iss.push(missing+' missing period(s) in demand history');if(zeros)iss.push(zeros+' zero-demand period(s)');if(out)iss.push(out+' statistical outlier(s)');if(fcMiss>0)iss.push(fcMiss+' period(s) without a usable forecast');if(nV>=CFG.fcMinN&&nV<CFG.fcAdeqN)iss.push('only '+nV+' forecast/actual pairs');
 const dq=ins?'Insufficient':iss.length?'Limited':'Adequate',acc=x.wape==null?null:Math.max(0,(1-x.wape)*100),bias=x.bias==null?null:x.bias*100,band=CFG.fcBias,dir=bias==null?null:bias>band?'Over-forecast':bias<-band?'Under-forecast':'Balanced',
 sh=nV?(dir==='Over-forecast'?x.sgn:dir==='Under-forecast'?x.sgl:0)/nV*100:0,consistent=(dir==='Over-forecast'||dir==='Under-forecast')&&sh>=CFG.fcBiasShare,hiAcc=acc!=null&&acc>=CFG.fcHighAcc;
 const na=ins||acc==null,finding=ins?'Insufficient data to assess':acc==null?'Cannot assess: no demand in the compared periods':dir==='Balanced'?(hiAcc?'Unusually high accuracy – validate source':'Balanced'):(consistent?'Consistent '+dir.toLowerCase():'Biased overall, but not consistent period to period')+(dq==='Limited'?' (data limited)':'');
 const why=[],fix=[];let pts=0;if(n<24){why.push('The history is under 24 months, so seasonality cannot be tested.');fix.push('provide 24–36 months of demand history');pts++}if(dq==='Limited'){why.push('The data has gaps or irregularities ('+iss.join('; ')+').');fix.push('correct or explain the flagged periods');pts++}if(dq==='Insufficient'){why.push('There are too few periods to judge forecast quality.');fix.push('provide more months of paired forecasts and actuals');pts+=3}if(shift>0){why.push('Two or more consecutive months are extreme ('+shift+' periods: a possible level shift). They are not counted as outliers, so the outlier test cannot tell a lasting change in demand from a one-off run; this lowers confidence by one level.');fix.push('confirm whether demand changed permanently or the run was a one-off');pts++}if(hiAcc){why.push('Accuracy is unusually high, which can mean the forecasts were recorded after the fact.');fix.push('confirm when and how the forecasts were produced');pts++}
 return {n,expected:exp.length,missing,zeros,out,shift,madZero,nV,fcMiss,dq,iss,acc,bias,dir,consistent,share:sh,hiAcc,finding,verdict:na?'Cannot assess':hiAcc?'Very high (verify)':acc>=85?'Good':acc>=70?'Fair':'Poor',conf:pts===0?'High':pts===1?'Medium':'Low',confWhy:(why.join(' ')||'The history is complete and varied, and accuracy is not unusually high.')+(madZero?' Outlier detection was not applied: demand is mostly constant (median absolute deviation is zero), so no month could be tested as an outlier. This is informational and does not change confidence.':''),confFix:fix.join('; ')}}
const fcCredAll=()=>R.fcc||(R.fcc=Object.fromEntries(R.fg.map(x=>{const c=fcCred(x,R.months),F=fcAll()[x.id];c.wb=F&&F.ok?F.wb:null;c.wbBest=F&&F.ok?F.wbBest:null;c.beats=c.wb!=null&&c.wbBest!=null&&c.wbBest>0&&c.wb<0.5*c.wbBest;return [x.id,c]})));
