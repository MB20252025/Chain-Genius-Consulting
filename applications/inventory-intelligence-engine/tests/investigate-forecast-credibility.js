// Phase 3 item 3 - INVESTIGATION ONLY (no forecasting method, rule or threshold changed).
// Probes how fcCred() (js/forecasting.js line 32) treats runs of extreme months. Two kinds of "extreme month" are tested separately because the code treats them very differently:
//   DEMAND spike  : Units_Sold is far above normal, forecast unchanged (the outlier test runs on demand history, x.h)
//   FORECAST miss : Forecast_Units is 10x the actual, demand unchanged (the outlier test never looks at forecasts; only accuracy/bias do)
// Each pattern is run on 12 months (Northstar FG001, under the 24-month threshold) and on a 36-month synthetic history (so the 24-month point does not mask the effect).
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n'),o={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.cred=()=>fcCredAll();out.CFG=CFG')(XLSX,document,o);
const PROP="if(out)iss.push(out+' statistical outlier(s)');";const fsrc=fs.readFileSync(ROOT+'/js/forecasting.js','utf8');if(fsrc.split(PROP).length!==2)throw new Error('P1 patch target');
const src2=['calculations'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).concat([fsrc.replace(PROP,PROP+"if(shift>=2)iss.push('run of '+shift+' consecutive extreme periods');"),fs.readFileSync(ROOT+'/js/app.js','utf8'),fs.readFileSync(ROOT+'/js/excel-import.js','utf8')]).join('\n'),o2={};
new Function('XLSX','document','out',src2+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.cred=()=>fcCredAll()')(XLSX,document,o2);
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const SKU='FG001';
function wbFrom(demandRows){const wb=XLSX.readFile(NS,{cellDates:true});wb.Sheets['Demand History']=XLSX.utils.json_to_sheet(demandRows,{cellDates:true});return XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx',cellDates:true}),{cellDates:true})}
const base12=()=>XLSX.utils.sheet_to_json(XLSX.readFile(NS,{cellDates:true}).Sheets['Demand History'],{raw:true,cellDates:true});
const last=base12().reduce((m,r)=>r.Month_Start>m?r.Month_Start:m,new Date(0));
const skus=[...new Set(base12().map(r=>r.SKU))];
// deterministic pseudo-random so the synthetic history is reproducible
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
const base36=()=>{const rows=[];seed=12345;for(const s of skus){const lvl=80+Math.round(rnd()*120);for(let k=35;k>=0;k--){const d=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth()-k,1));const a=Math.round(lvl*(1+.25*Math.sin(k*1.7)+.1*(rnd()-.5)));rows.push({Month_Start:d,SKU:s,Units_Sold:a,Customer_Orders:Math.round(a/4),Forecast_Units:Math.round(a*(1+.4*(rnd()-.5)))})}}return rows};
const PATTERNS=[['control (no extreme month)',[]],['1 isolated extreme month',[5]],['2 consecutive extreme months',[5,6]],['3 consecutive extreme months',[5,6,7]],['2 extreme months separated by one normal month',[5,7]],['2 extreme months separated by three normal months',[3,7]],['mixed: a consecutive pair plus a separate single',[2,3,8]],['mixed: a consecutive triple plus a separate single',[2,3,4,9]],['4 consecutive extreme months',[4,5,6,7]],['half the months extreme, in one block',[2,3,4,5,6,7]],['two separate consecutive pairs',[2,3,8,9]]];
const KINDS=[['DEMAND spike (Units_Sold x10, forecast unchanged)','Units_Sold'],['FORECAST miss (Forecast_Units x10, demand unchanged)','Forecast_Units']];
const out={meta:{sku:SKU,note:'outlier test runs on demand history'},runs:[]};
function run(label,rows,idxs,col){const own=rows.filter(r=>r.SKU===SKU).sort((a,b)=>a.Month_Start-b.Month_Start);idxs.forEach(i=>{own[i][col]=own[i][col]*10});
 const wbk=wbFrom(rows),R=o.go(wbk),c=o.cred()[SKU],x=R.fg.find(z=>z.id===SKU);o2.go(wbk);const c2=o2.cred()[SKU];const A=own.map(r=>r.Units_Sold),F=own.map(r=>r.Forecast_Units),indep=Math.max(0,(1-A.reduce((t,a,i)=>t+Math.abs(F[i]-a),0)/A.reduce((t,a)=>t+a,0))*100);
 const scr=strip(o.html('Forecast accuracy')),at=scr.indexOf(SKU+' ');const shown=at>=0?scr.slice(at,at+260):'';
 return {history:label,months:own.length,extreme:idxs.map(i=>i+1),out:c.out,shift:c.shift,dq:c.dq,reasons:c.iss,acc:c.acc==null?null:+c.acc.toFixed(1),bias:c.bias==null?null:+c.bias.toFixed(0),dir:c.dir,consistent:c.consistent,finding:c.finding,verdict:c.verdict,conf:c.conf,confWhy:c.confWhy,confFix:c.confFix,screen:shown,independentAcc:+indep.toFixed(1),accMatches:Math.abs(indep-c.acc)<0.06,proposed:{conf:c2.conf,dq:c2.dq,acc:c2.acc==null?null:+c2.acc.toFixed(1),verdict:c2.verdict,reasons:c2.iss,sameAccuracyAndVerdict:c2.verdict===c.verdict&&Math.abs(c2.acc-c.acc)<1e-9}}}
for(const [hl,mk,cut] of [['12 months (Northstar)',base12,12],['36 months (synthetic)',base36,36]])for(const [kl,col] of KINDS)for(const [pl,idx] of PATTERNS){if(idx.some(i=>i>=cut))continue;const r=run(hl,mk(),idx,col);r.kind=kl;r.pattern=pl;out.runs.push(r)}
// MAD = 0 constant-demand edge (already documented in candidate 3): demand 100 every month, one spike
{const rows=base36();rows.filter(r=>r.SKU===SKU).forEach(r=>{r.Units_Sold=100;r.Forecast_Units=100});const own=rows.filter(r=>r.SKU===SKU).sort((a,b)=>a.Month_Start-b.Month_Start);own[10].Units_Sold=1000;const R=o.go(wbFrom(rows)),c=o.cred()[SKU];out.runs.push({history:'36 months (constant demand 100)',kind:'DEMAND spike (Units_Sold x10, forecast unchanged)',pattern:'1 isolated extreme month, MAD = 0',months:36,extreme:[11],out:c.out,shift:c.shift,dq:c.dq,reasons:c.iss,acc:+c.acc.toFixed(1),bias:+c.bias.toFixed(0),dir:c.dir,consistent:c.consistent,finding:c.finding,verdict:c.verdict,conf:c.conf,confWhy:c.confWhy,screen:''})}
fs.writeFileSync(path.join(__dirname,'results/forecast-credibility-investigation.json'),JSON.stringify(out,null,1));
for(const r of out.runs)console.log((r.history.slice(0,9)+' | '+r.kind.slice(0,6)+' | '+r.pattern).padEnd(100),'out='+r.out,'shift='+r.shift,r.dq.padEnd(8),'acc='+r.acc,r.verdict.padEnd(7),'conf='+r.conf,'|',r.dir,r.consistent?'consistent':'',' ',(r.reasons||[]).join('; ').slice(0,70));
const withIndep=out.runs.filter(r=>r.independentAcc!==undefined);
console.log('independent accuracy (recomputed from the raw rows) matches the engine in',withIndep.filter(r=>r.accMatches).length,'of',withIndep.length,'runs');
const withP=out.runs.filter(r=>r.proposed);
console.log('Proposed rule P1 (a run of >=2 consecutive extreme periods counts as a data issue), run in memory only: confidence changes in',withP.filter(r=>r.proposed.conf!==r.conf).length,'of',withP.length,'runs; accuracy and verdict unchanged in',withP.filter(r=>r.proposed.sameAccuracyAndVerdict).length,'of',withP.length);
for(const r of withP.filter(r=>r.proposed.conf!==r.conf))console.log('  P1:',(r.history.slice(0,9)+' | '+r.kind.slice(0,6)+' | '+r.pattern).padEnd(88),r.conf,'->',r.proposed.conf);
