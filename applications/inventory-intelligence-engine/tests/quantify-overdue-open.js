const fs=require('fs');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const T=require('path').join(__dirname,'..');const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(T+'/js/'+n+'.js','utf8')).join('\n'),o={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();return R};out.CFG=CFG')(XLSX,document,o);
const R=o.go(XLSX.readFile(T+'/tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx',{cellDates:true}));
const s=R.supRisk.find(x=>x.id==='SUP011');console.log(JSON.stringify({id:s.id,n:s.n,otd:s.otd,ls:s.ls,score:s.score,cat:s.cat,nOtd:s.nOtd}));
const late0=Math.round(s.n*(1-s.otd/100));const otd2=100*(s.n-late0)/(s.n+2);const dO=otd2-s.otd;
console.log('late now',late0,'-> OTD if 2 overdue-at-snapshot lines counted late:',otd2.toFixed(1),'(change',dO.toFixed(1),'pts); score effect via the 50% OTD weight alone:',(0.5*dO).toFixed(1),'pts; plus up to 15% of the lateness-score change');
const rk=R.supRisk.filter(x=>x.score!=null).sort((a,b)=>a.score-b.score);console.log('SUP011 score',s.score.toFixed(1),'; class cut-offs 75/60; others near:',rk.slice(0,8).map(x=>x.id+':'+x.score.toFixed(1)).join(', '));
