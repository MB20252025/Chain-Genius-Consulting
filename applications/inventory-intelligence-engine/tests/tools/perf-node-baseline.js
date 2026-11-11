// Node timings for the v0.7 baseline: analyse() alone and the full CGEngine.runEngine(); median of N runs; peak RSS.
const fs=require('fs'),XLSX=require('xlsx');global.XLSX=XLSX;const APP=process.argv[2],F=process.argv[3],N=+process.argv[4]||5;
(0,eval)(['calculations','forecasting','app','excel-import','engine/engine-api'].map(n=>fs.readFileSync(APP+'/js/'+n+'.js','utf8')).join('\n')+';globalThis.__p={setWB:w=>{WB=w},analyse:()=>analyse(),E:CGEngine}');
const t=f=>{const s=process.hrtime.bigint();f();return Number(process.hrtime.bigint()-s)/1e6};const med=a=>a.sort((x,y)=>x-y)[a.length>>1];
let peak=0;const rs=()=>{peak=Math.max(peak,process.memoryUsage().rss)};
const tr=t(()=>__p.setWB(XLSX.readFile(F,{cellDates:true})));rs();
const a=[],e=[];let out;for(let i=0;i<N;i++){a.push(t(()=>__p.analyse()));rs();e.push(t(()=>{out=__p.E.runEngine()}));rs()}
console.log(JSON.stringify({file:F.split('/').pop(),bytes:fs.statSync(F).size,readMs:Math.round(tr),analyseMedianMs:Math.round(med(a)),analyseRunsMs:a.map(Math.round),runEngineMedianMs:Math.round(med(e)),runEngineRunsMs:e.map(Math.round),peakRssMB:Math.round(peak/1048576),fg:out.result.fg.length,rm:out.result.rm.length,sup:out.result.sup.length,dq:out.result.dq.length,mrpRows:out.mrp.length,feasRows:out.feas.rows.length,clientQuestions:out.clientQuestions.length}))
