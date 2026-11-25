// Stage 3B Phase 3 evidence: compare two engine versions field by field on workbooks (SKIP=gap by default: the new gap field). Usage: OLDFC=<old forecasting.js> node cmp-engine.js <old calculations.js> <new calculations.js> <xlsx>...
// Compare two engine versions (calculations.js) on workbooks: every fg/rm field and the issues list. Usage: node cmp-engine.js <old calc.js> <new calc.js> <xlsx>...
const fs=require('fs'),path=require('path'),util=require('util');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const APP=path.resolve(__dirname,'../../..'),js=n=>fs.readFileSync(path.join(APP,'js',n),'utf8');
const mk=(calc,fc)=>{const A={};new Function('XLSX','document','out',calc+'\n'+(fc||js('forecasting.js'))+'\n'+js('app.js')+'\n'+js('excel-import.js')+';out.go=wb=>{WB=wb;R=analyse();R.fcAll=fcAll();R.fcc=R.hasF?fcCredAll():null;return R}')(XLSX,document,A);return A};
const [oldC,newC,...books]=process.argv.slice(2),O=mk(fs.readFileSync(oldC,'utf8'),process.env.OLDFC&&fs.readFileSync(process.env.OLDFC,'utf8')),N=mk(fs.readFileSync(newC,'utf8'));
const skip=new Set((process.env.SKIP||'gap').split(','));
for(const b of books){let ro,rn;try{ro=O.go(XLSX.readFile(b,{cellDates:true}))}catch(e){ro={err:e.message}}try{rn=N.go(XLSX.readFile(b,{cellDates:true}))}catch(e){rn={err:e.message}}
 if(ro.err||rn.err){console.log(path.basename(b),'ERR',ro.err,'|',rn.err);continue}
 const diffs=[];for(const t of ['fg','rm'])ro[t].forEach((x,i)=>{const y=rn[t][i];for(const k of Object.keys(x)){if(skip.has(k))continue;if(!util.isDeepStrictEqual(x[k],y[k]))diffs.push(`${t} ${x.id}.${k}`)}});
 const mo=JSON.stringify(ro.months),mn=JSON.stringify(rn.months);if(mo!==mn)diffs.push('months');
 const dqo=ro.dq.map(d=>d.msg+'|'+d.ex),dqn=rn.dq.map(d=>d.msg+'|'+d.ex);const lost=dqo.filter(x=>!dqn.includes(x)),added=dqn.filter(x=>!dqo.includes(x));
 const J=o=>JSON.parse(JSON.stringify(o)),fcd=Object.keys(ro.fcAll).filter(k=>{const a=J(ro.fcAll[k]),b=J(rn.fcAll[k]);return Object.keys(a).some(q=>!util.isDeepStrictEqual(a[q],b[q]))});global.LASTFC=[ro.fcAll,rn.fcAll];
 console.log(path.basename(b),'| field diffs',diffs.length,diffs.slice(0,6).join(' '),'| dq lost',lost.length,'added',added.length,added.map(x=>x.slice(0,70)).join(' // '),'| forecasts differing',fcd.length,fcd.slice(0,5).join(','));}
