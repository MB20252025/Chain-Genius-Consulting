// Engine timing on a large workbook (Node, no browser). Usage: node perf-node.js <workbook.xlsx>
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const DIR=path.join(__dirname,'..','js')+'/';const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(DIR+n+'.js','utf8')).join('\n');
eval(src+';globalThis.T={set:w=>{WB=w},run:()=>{R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}return R},one:()=>analyse(),views,ORDER,get R(){return R}}');
const ms=f=>{const t=process.hrtime.bigint();const r=f();return [Number(process.hrtime.bigint()-t)/1e6,r]};
let [tr,wb]=ms(()=>XLSX.read(fs.readFileSync(process.argv[2]),{cellDates:true}));console.log('XLSX.read (parse file):',tr.toFixed(0),'ms');T.set(wb);
const a=[];for(let i=0;i<5;i++)a.push(ms(()=>T.one())[0]);console.log('analyse() x5 (ms):',a.map(x=>x.toFixed(0)).join(', '),'| median',a.sort((p,q)=>p-q)[2].toFixed(0));
const [tf]=ms(()=>T.run());console.log('run() = analyse x3 (main + 2 comparison):',tf.toFixed(0),'ms; FG',T.R.fg.length,'RM',T.R.rm.length);
const v={};T.ORDER.forEach(k=>{const t=[];for(let i=0;i<3;i++)t.push(ms(()=>T.views[k]())[0]);v[k]=Math.max(...t)});
Object.entries(v).sort((p,q)=>q[1]-p[1]).forEach(([k,t])=>console.log('view',k.padEnd(26),t.toFixed(0).padStart(6),'ms'));
