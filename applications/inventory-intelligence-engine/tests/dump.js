const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const fs=require('fs');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const dir=__ROOT,wbp=process.argv[2]||__NS;
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(dir+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__g=()=>{WB=XLSX.readFile('+JSON.stringify(wbp)+',{cellDates:true});R=analyse();return {R,cc:fcCredAll()}}');
const {R,cc}=__g();
fs.writeFileSync('dump.json',JSON.stringify({pr:R.pr,supRisk:R.supRisk.map(s=>({id:s.id,cat:s.cat,risk:s.risk,mats:s.mats,score:s.score,n:s.n})),
 lt:R.fg.map(x=>({id:x.id,value:x.lt,source:x.ltInfo.source,label:x.ltInfo.label,n:x.ltInfo.n,from:x.ltInfo.from,to:x.ltInfo.to,basis:x.ltInfo.basis})),
 ltRM:R.rm.slice(0,3).map(x=>({id:x.id,value:x.lt,label:x.ltInfo.label,basis:x.ltInfo.basis})),
 fc:R.fg.map(x=>({id:x.id,...cc[x.id]})),po:R.po,demo:R.demo,declared:R.declared}));console.log('dumped');
