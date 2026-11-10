const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const fs=require('fs');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const dir=__ROOT,wbp=process.argv[2];
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(dir+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__g=()=>{WB=XLSX.readFile('+JSON.stringify(wbp)+',{cellDates:true});R=analyse();return R}');
const R=__g();fs.writeFileSync(process.argv[3],JSON.stringify(R.supRisk.map(s=>({id:s.id,name:s.name,n:s.n,score:s.score,cat:s.cat,risk:s.risk,mats:s.mats,evid:s.evid,assess:s.assess,poTotal:s.poTotal,excl:s.excl,known:s.known}))));
