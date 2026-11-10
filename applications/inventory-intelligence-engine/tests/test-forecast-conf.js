// Phase 3B item E: approved forecast-confidence correction. A run of two or more consecutive extreme months (the existing level-shift condition, c.shift > 0) adds ONE point to the existing
// confidence counter = one level lower. Accuracy, bias, verdict, finding, data quality and outlier counts must be identical to the protected Phase 3 engine in every case.
// MAD = 0 gets an informational note only. Compares this tree with the Phase 3 tree (env P3_TREE or tests/../../ extract) over 44 patterns + fixtures.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const load=root=>{const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(root+'/js/'+n+'.js','utf8')).join('\n'),o={};new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.cred=()=>fcCredAll();out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,o);return o};
const NEW=load(path.join(__dirname,'..')),OLD=load(process.env.P3_TREE||fs.readFileSync('/home/claude/p3tree.txt','utf8').trim());
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),SKU='FG001';
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const wbFrom=rows=>{const wb=XLSX.readFile(NS,{cellDates:true});wb.Sheets['Demand History']=XLSX.utils.json_to_sheet(rows,{cellDates:true});return XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx',cellDates:true}),{cellDates:true})};
const base12=()=>XLSX.utils.sheet_to_json(XLSX.readFile(NS,{cellDates:true}).Sheets['Demand History'],{raw:true,cellDates:true});
const last=base12().reduce((m,r)=>r.Month_Start>m?r.Month_Start:m,new Date(0)),skus=[...new Set(base12().map(r=>r.SKU))];
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296;
const base36=()=>{const rows=[];seed=12345;for(const s of skus){const lvl=80+Math.round(rnd()*120);for(let k=35;k>=0;k--){const d=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth()-k,1));const a=Math.round(lvl*(1+.25*Math.sin(k*1.7)+.1*(rnd()-.5)));rows.push({Month_Start:d,SKU:s,Units_Sold:a,Customer_Orders:Math.round(a/4),Forecast_Units:Math.round(a*(1+.4*(rnd()-.5)))})}}return rows};
const PAT=[['none',[]],['1 isolated',[5]],['2 consecutive',[5,6]],['3 consecutive',[5,6,7]],['2 separated by 1',[5,7]],['2 separated by 3',[3,7]],['pair + single',[2,3,8]],['triple + single',[2,3,4,9]],['4 consecutive',[4,5,6,7]],['half block',[2,3,4,5,6,7]],['two pairs',[2,3,8,9]]];
const KIND=[['demand spike','Units_Sold'],['forecast miss','Forecast_Units']];
const LV={High:2,Medium:1,Low:0};const down=c=>c==='High'?'Medium':c==='Medium'?'Low':'Low';
function run(mk,cut,idx,col,tag){const rows=mk(),own=rows.filter(r=>r.SKU===SKU).sort((a,b)=>a.Month_Start-b.Month_Start);idx.forEach(i=>{own[i][col]*=10});const wb=wbFrom(rows);NEW.go(wb);OLD.go(wb);const n=NEW.cred()[SKU],o=OLD.cred()[SKU];
 const same=['n','nV','dq','out','shift','acc','bias','dir','consistent','share','hiAcc','finding','verdict','wb','beats'].every(k=>JSON.stringify(n[k])===JSON.stringify(o[k]));
 ok(same,tag+': accuracy, bias, direction, verdict, finding, data quality and outlier/run counts identical to Phase 3');
 const want=o.shift>0?down(o.conf):o.conf;ok(n.conf===want,tag+': confidence '+o.conf+' -> '+n.conf+' (expected '+want+(o.shift>0?', one level lower for a run of '+o.shift+' extreme months':', unchanged: no run')+')');
 const screen=strip(NEW.html('Forecast accuracy')),at=screen.indexOf(SKU+' '),row=at>=0?screen.slice(at,at+700):'';
 if(o.shift>0){ok(n.conf!=='High','level-shift warning never sits beside a High label: '+tag);ok(/possible level shift/.test(n.confWhy)&&/lowers confidence by one level/.test(n.confWhy)&&!/complete and varied/.test(n.confWhy),tag+': explanation states the level shift and the reduction, and no longer says "complete and varied"');
  ok((row.match(/level shift/gi)||[]).length===1,tag+': the level-shift wording appears once on the Forecast accuracy row (no duplicate warning)')}
 else ok(!/level shift/i.test(n.confWhy),tag+': no level-shift wording when there is no run');
 return {n,o}}
for(const [hl,mk,cut] of [['12m',base12,12],['36m',base36,36]])for(const [kl,col] of KIND)for(const [pl,idx] of PAT){if(idx.some(i=>i>=cut))continue;run(mk,cut,idx,col,hl+' '+kl+' / '+pl)}
// specific expectations stated in the approval
{const r2=run(base36,36,[5,6],'Units_Sold','36m 2 consecutive (spec)');ok(r2.o.conf==='High'&&r2.n.conf==='Medium','spec: two consecutive extreme months at 36 months: High -> Medium');
 const r3=run(base36,36,[5,6,7],'Units_Sold','36m 3 consecutive (spec)');ok(r3.o.conf==='High'&&r3.n.conf==='Medium','spec: three consecutive: High -> Medium');
 const rs=run(base36,36,[5,7],'Units_Sold','36m separated (spec)');ok(rs.o.conf===rs.n.conf&&rs.n.conf==='Medium','spec: separated extreme months unchanged at Medium (already lowered by the outlier count)');
 const rm=run(base36,36,[2,3,8],'Units_Sold','36m mixed (spec)');ok(rm.o.conf==='Medium'&&rm.n.conf==='Low','spec: mixed pair + single: Medium -> Low (the run adds one point to the existing outlier point)');
 const rn=run(base36,36,[],'Units_Sold','36m normal (spec)');ok(rn.n.conf==='High'&&rn.o.conf==='High'&&/complete and varied/.test(rn.n.confWhy),'spec: normal demand stays High with the "complete and varied" explanation')}
// MAD = 0 (constant demand 100 with one spike)
{const rows=base36();const own=rows.filter(r=>r.SKU===SKU).sort((a,b)=>a.Month_Start-b.Month_Start);own.forEach(r=>{r.Units_Sold=100;r.Forecast_Units=100});own[10].Units_Sold=1000;const wb=wbFrom(rows);NEW.go(wb);OLD.go(wb);const n=NEW.cred()[SKU],o=OLD.cred()[SKU];
 ok(n.madZero===true&&/Outlier detection was not applied/.test(n.confWhy),'MAD=0 with a spike: informational note says outlier detection was not applied');
 ok(n.conf===o.conf&&n.dq===o.dq&&n.acc===o.acc&&n.verdict===o.verdict&&n.out===o.out&&n.shift===o.shift,'MAD=0: confidence, data quality, accuracy, verdict and outlier counts unchanged (note only, no new rule): conf '+n.conf);
 ok(/does not change confidence/.test(n.confWhy),'MAD=0 note says it does not change confidence');
 ok(/Outlier detection was not applied/.test(strip(NEW.html('Forecast accuracy'))),'MAD=0 note is displayed on the Forecast accuracy tab');
 const w=NEW.exp(),rr=XLSX.utils.sheet_to_json(w.Sheets.ENG_ForecastCredibility).find(r=>r.SKU===SKU);ok(rr&&Object.values(rr).some(v=>typeof v==='string'&&/Outlier detection was not applied/.test(v)),'MAD=0 note is in the ENG_ForecastCredibility export')}
{const rows=base36();const own=rows.filter(r=>r.SKU===SKU).sort((a,b)=>a.Month_Start-b.Month_Start);own.forEach(r=>{r.Units_Sold=100;r.Forecast_Units=100});NEW.go(wbFrom(rows));const n=NEW.cred()[SKU];ok(n.madZero===false&&!/Outlier detection was not applied/.test(n.confWhy),'perfectly constant demand with no deviating month: no MAD note (nothing was left untested)')}
// every fixture: nothing else in forecasting moves
const FX=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?w(p):/\.xlsx$/.test(f)&&FX.push(p)}})(path.join(__dirname,'fixtures'));
for(const fx of FX){const wb=XLSX.readFile(fx,{cellDates:true}),nm=path.relative(path.join(__dirname,'fixtures'),fx);let a,b;try{a=NEW.go(wb);b=OLD.go(wb)}catch(e){continue}if(!a.hasF)continue;const cn=NEW.cred(),co=OLD.cred();let bad=0,lowered=0;for(const id of Object.keys(co)){const x=cn[id],y=co[id];const same=['dq','acc','bias','dir','verdict','finding','out','shift'].every(k=>JSON.stringify(x[k])===JSON.stringify(y[k]));const want=y.shift>0?down(y.conf):y.conf;if(!same||x.conf!==want)bad++;if(x.conf!==y.conf)lowered++}ok(bad===0,'fixture '+nm+': all '+Object.keys(co).length+' products: only confidence differs, and only where a run of extreme months exists ('+lowered+' lowered)')}
console.log(`test-forecast-conf: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
