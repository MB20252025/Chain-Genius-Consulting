const P=require('path'),fs=require('fs');const ROOT=P.resolve(process.argv[2]);global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const src=['validation/x1-integrity','calculations','forecasting','app','excel-import'].filter(n=>fs.existsSync(ROOT+'/js/'+n+'.js')).map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__g=(f)=>{WB=XLSX.readFile(f,{cellDates:true});R=analyse();return {R,CFG}}');
const {R,CFG}=__g(process.argv[3]);const pick=o=>Object.fromEntries(Object.entries(o).filter(([k,v])=>v===null||['number','string','boolean'].includes(typeof v)));
fs.writeFileSync(process.argv[4],JSON.stringify({fg:R.fg.map(pick),rm:R.rm.map(pick),totals:{fgV:R.fgV,rmV:R.rmV,exV:R.exV,shV:R.shV,tot:R.tot,snap:R.snap,months:R.months,cfg:pick(CFG)},keys:Object.keys(R)}));
