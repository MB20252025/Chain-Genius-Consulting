// Compare two versions of the app on a set of workbooks: which analysis results and which of the 17 tabs differ, and how. Usage: node compare-trees.js <oldTree> <newTree>
// Covers every fixture plus Northstar written with unit variants. Prints only differences, then a summary. Exit code 0 always (it reports; the tests decide).
const fs=require('fs'),path=require('path'),crypto=require('crypto');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const harness=dir=>{const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(dir+'/js/'+n+'.js','utf8')).join('\n'),o={};new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.mrp=mrp;out.feas=feas;out.keys=()=>Object.keys(views);out.html=k=>{tab=k;return views[k]()};out.conf=confAreas;out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,o);return o};
const [OLD,NEW]=process.argv.slice(2).map(harness),T=path.join(__dirname),NS=T+'/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx';
const H=s=>crypto.createHash('md5').update(String(s)).digest('hex').slice(0,8),J=o=>JSON.stringify(o,(k,v)=>v instanceof Date?+v:typeof v==='number'&&!isFinite(v)?String(v):v);
const files=[['Northstar',()=>XLSX.readFile(NS,{cellDates:true})]];for(const d of ['suppliers','edge','structure'])for(const f of fs.readdirSync(T+'/fixtures/'+d).filter(f=>/\.xlsx$/.test(f)))files.push([d+'/'+f,()=>XLSX.readFile(T+'/fixtures/'+d+'/'+f,{cellDates:true})]);
const units=u=>()=>{const wb=XLSX.readFile(NS,{cellDates:true});for(const sh of ['Materials','Products']){const r=XLSX.utils.sheet_to_json(wb.Sheets[sh],{raw:true,cellDates:true});r.forEach(x=>{if(x.Unit_of_Measure!==undefined)x.Unit_of_Measure=typeof u==='function'?u(x):u});wb.Sheets[sh]=XLSX.utils.json_to_sheet(r,{cellDates:true})}return wb};
for(const u of ['Each','EA',' each ',' kg','pack']) files.push(['Northstar, every unit written as '+JSON.stringify(u),units(u)]);
files.push(['Northstar, "each" materials written as "EA" (others unchanged)',units(x=>x.Unit_of_Measure==='each'?'EA':x.Unit_of_Measure)]);
let nDiff=0;
for(const [n,mk] of files){const a=OLD.go(mk()),b=NEW.go(mk()),out=[];
 for(const s of ['fg','rm','sup','tot','po','dq']) if(J(a[s])!==J(b[s])){out.push('  result "'+s+'" differs'+(s==='dq'?': '+dqDiff(a.dq,b.dq):''))}
 OLD.go(mk());NEW.go(mk());const mA=J(OLD.mrp().map(r=>[r.x.id,r.net,r.qty,r.st])),fA=J(OLD.feas().rows.map(r=>[r.o.id,r.status])),cA=J(OLD.conf());const mB=J(NEW.mrp().map(r=>[r.x.id,r.net,r.qty,r.st])),fB=J(NEW.feas().rows.map(r=>[r.o.id,r.status])),cB=J(NEW.conf());
 if(mA!==mB)out.push('  MRP differs');if(fA!==fB)out.push('  production feasibility differs');if(cA!==cB)out.push('  confidence areas differ: '+confDiff(OLD.conf(),NEW.conf()));
 // keep both in sync with their own R for the views
 OLD.go(mk());NEW.go(mk());const tabs=OLD.keys().filter(k=>NEW.keys().includes(k)),dt=tabs.filter(k=>H(OLD.html(k))!==H(NEW.html(k)));if(dt.length)out.push('  tabs that render differently: '+dt.join(', '));
 const ea=OLD.exp(),eb=NEW.exp(),ds=ea.SheetNames.filter(s=>!eb.Sheets[s]||XLSX.utils.sheet_to_csv(ea.Sheets[s])!==XLSX.utils.sheet_to_csv(eb.Sheets[s]));if(ds.length)out.push('  export sheets that differ: '+ds.join(', '));
 console.log((out.length?'DIFF  ':'same  ')+n);out.forEach(l=>console.log(l));if(out.length)nDiff++}
function dqDiff(x,y){const mx=x.map(d=>d.sev+' | '+d.msg),my=y.map(d=>d.sev+' | '+d.msg);return [...mx.filter(m=>!my.includes(m)).map(m=>'removed "'+m.slice(0,70)+'"'),...my.filter(m=>!mx.includes(m)).map(m=>'added "'+m.slice(0,70)+'"')].join('; ')}
function confDiff(x,y){return x.map((a,i)=>a.rating!==y[i].rating?a.area+' '+a.rating+' -> '+y[i].rating:null).filter(Boolean).join('; ')||'(wording only)'}
console.log('\n'+nDiff+' of '+files.length+' workbooks differ');
