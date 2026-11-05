/* Chain Genius – Inventory Intelligence Engine v0.4
 * forecasting.js
 * Demand forecasting: methods, rolling back-tests, trend and seasonality tests, uncertainty ranges, recommendations.
 * Plain script (no build step). Load order in index.html: calculations → forecasting → app → excel-import.
 */
const FM={mean:(h,k)=>Array(k).fill(mean(h)),ma3:(h,k)=>Array(k).fill(mean(h.slice(-3))),ma6:(h,k)=>Array(k).fill(mean(h.slice(-6))),wma3:(h,k)=>{const [a,b,c]=h.slice(-3).reverse();return Array(k).fill((3*a+2*b+c)/6)},
 trend:(h,k)=>{const n=h.length,mx=(n-1)/2,my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(i-mx)*(y-my);sxx+=(i-mx)**2});const b=sxx?sxy/sxx:0,a=my-b*mx;return Array.from({length:k},(_,j)=>Math.max(0,a+b*(n+j)))}},
 FMIN={mean:3,ma3:3,ma6:6,wma3:3,trend:6,seasonal:24},FNAME={mean:'Average of all months',ma3:'3-month moving average',ma6:'6-month moving average',wma3:'Weighted 3-month average (3-2-1)',trend:'Linear trend',seasonal:'Seasonal index × level (EXPERIMENTAL)'};
const ols=h=>{const n=h.length,mx=(n-1)/2,my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(i-mx)*(y-my);sxx+=(i-mx)**2});const b=sxx?sxy/sxx:0;return {a:my-b*mx,b}};
function seasn(h,lm){const n=h.length;if(n<24)return null;const o=ols(h),fl=0.1*mean(h)+1e-9,t=Array(12).fill(0),c=Array(12).fill(0);h.forEach((v,i)=>{const tr=Math.max(fl,o.a+o.b*i),m=((lm-(n-1-i))%12+12)%12;t[m]+=v/tr;c[m]++});const raw=t.map((v,m)=>v/(c[m]||1)),mu=mean(raw)||1,idx=raw.map(v=>v/mu);return {idx,det:Math.max(...idx)-Math.min(...idx)>.3}}
function fcast(x,lastMs){const h=x.h,n=h.length,lm=new Date(lastMs).getUTCMonth();if(n<6)return {n,ok:false};
 const sn=seasn(h,lm),det=!!(sn&&sn.det),meth=Object.keys(FM).filter(k=>n>=FMIN[k]);if(det)meth.push('seasonal');
 const fn=(k,hh,kk,l)=>{if(k!=='seasonal')return FM[k](hh,kk);const q=seasn(hh,l);if(!q)return Array(kk).fill(mean(hh));const o=ols(hh);return Array.from({length:kk},(_,j)=>Math.max(0,(o.a+o.b*(hh.length+j))*q.idx[(l+1+j)%12]))},
  tS=Math.max(det?24:Math.max(...meth.map(k=>FMIN[k])),n-Math.max(3,Math.min(6,CFG.fcTest||6))),bt={};
 meth.forEach(k=>{let ae=0,ac=0,bs=0,se=0,p=0;for(let t=tS;t<n;t++){const l=((lm-(n-t))%12+12)%12,fv=fn(k,h.slice(0,t),1,l)[0],a=h[t];ae+=Math.abs(fv-a);ac+=a;bs+=fv-a;se+=(fv-a)**2;p++}bt[k]={wape:ac&&p?ae/ac:null,bias:ac&&p?bs/ac:null,rmse:p?Math.sqrt(se/p):null,pts:p}});
 let best=meth[0];meth.forEach(k=>{if(bt[k].wape!=null&&(bt[best].wape==null||bt[k].wape<bt[best].wape-.005))best=k});
 const fv=fn(best,h,12,lm),rm=bt[best].rmse!=null?bt[best].rmse:sd(h),mu=mean(h.slice(-12)),bd=j=>1.28*rm*Math.sqrt(1+(j+1)/n),hi=fv.map((v,j)=>v+bd(j)),lo=fv.map((v,j)=>Math.max(0,v-bd(j))),rel=mu?rm/mu:null,unc=n<12||rel==null?'High':rel<.1?'Low':rel<.2?'Medium':'High';
 const mx=(n-1)/2,my=mean(h);let sxy=0,sxx=0;h.forEach((y,i)=>{sxy+=(i-mx)*(y-my);sxx+=(i-mx)**2});const b=sxx?sxy/sxx:0,a=my-b*mx,sse=h.reduce((q,y,i)=>q+(y-a-b*i)**2,0),se=n>2&&sxx?Math.sqrt(sse/(n-2)/sxx):0,tt=se?b/se:0,tp=my?b/my*100:0,trend=n>=8&&Math.abs(tt)>2.2?(b>0?'Rising':'Falling'):'No significant trend';
 let wb=null;if(x.fc&&x.fc.length===n&&x.fc.every(v=>typeof v==='number')&&n>tS){let ae=0,ac=0;for(let t=tS;t<n;t++){ae+=Math.abs(x.fc[t]-h[t]);ac+=h[t]}wb=ac?ae/ac:null}
 const warn=[];if(n<12)warn.push('under 12 months of history');if(n<24)warn.push('no seasonality test possible (needs 24+ months)');if(bt[best].pts<6)warn.push('only '+bt[best].pts+' back-test points');
 const cf=n>=24&&unc==='Low'?'High':n>=12&&unc!=='High'?'Medium':'Low',sm=k=>fv.slice(0,k).reduce((q,v)=>q+v,0);
 return {ok:true,n,meth,bt,best,f:fv,hi,lo,s3:sm(3),s6:sm(6),s12:sm(12),act12:h.slice(-12).reduce((q,v)=>q+v,0),trend,tp,tt,unc,rel,rm,wb,wbBest:bt[best].wape,seas:sn,warn,conf:cf,confWhy:'history '+n+' months; forecast error '+(rel==null?'n/a':f(rel*100)+'% of demand')+'; '+(warn.join('; ')||'no history warnings')}}
const recFor=(F,x)=>{const r=[],c3=F.f.slice(0,3).reduce((a,b)=>a+b,0)/3,fc=c3>0?x.av/(c3/DPM):null;
 if(F.trend==='Rising')r.push(`Demand rising ~${f(F.tp,1)}%/month: review safety stock and production plan upward`);if(F.trend==='Falling')r.push(`Demand falling ~${f(-F.tp,1)}%/month: avoid building stock; review reorder policy`);
 if(x.cv>CFG.y)r.push('Volatile demand: keep a buffer and review responsiveness');
 if(fc!=null&&fc<x.lt)r.push(`Available stock covers ${f(fc,1)}d at forecast demand, below ${f(x.lt,1)}d lead time: replenish`);else if(fc!=null&&fc>CFG.excess)r.push(`Covers ${f(fc)}d at forecast demand: slow replenishment`);
 if(F.wb!=null&&F.wbBest!=null){if(F.wb>F.wbBest+.05)r.push(`Statistical method beat the existing forecast over the same ${F.bt[F.best].pts} months (WAPE ${f(F.wbBest*100)}% vs ${f(F.wb*100)}%): consider it as baseline`);else if(F.wb<F.wbBest-.05)r.push('Existing forecast outperformed the statistical methods: keep it as baseline')}
 return r.slice(0,3).join('; ')||'No change indicated'};
const fcAll=()=>R.fcm||(R.fcm=Object.fromEntries(R.fg.map(x=>{const F=fcast(x,R.months[R.months.length-1]);if(F.ok)F.rec=recFor(F,x);return [x.id,F]})));
