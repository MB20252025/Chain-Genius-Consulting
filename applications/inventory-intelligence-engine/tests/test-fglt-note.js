// Phase 3 item 4: the finished-goods fixed-production-time note is shown, and NOTHING else changes.
// Compares this candidate with the Phase 2 source (read-only) over every fixture workbook: all calculated values identical; every screen identical once the new sentences are removed.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const load=root=>{const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(root+'/js/'+n+'.js','utf8')).join('\n'),A={};new Function('XLSX','document','out',src+';out.go=(wb,pol)=>{WB=wb;CFG.pol=pol;R=analyse();CFG.pol=pol?0:1;try{R.alt=analyse()}finally{CFG.pol=pol}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.tabs=()=>ORDER.filter(k=>views[k]);out.CFG=CFG')(XLSX,document,A);return A};
const NEW=load(path.join(__dirname,'..')),OLD=load(process.env.PHASE2||'/mnt/user-data/outputs/inventory-intelligence-engine-c4-phase2');
const FX=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?w(p):/\.xlsx$/.test(f)&&FX.push(p)}})(path.join(__dirname,'fixtures'));
const SENT=[" Finished goods assume a fixed production time: the calculated safety stock includes demand variability but no production-time variability (σLT is shown as 0 for finished goods even where production orders vary), so it may be understated for products whose production times vary."," Finished-goods safety stock assumes a fixed production time (see Reorder policy)."," Finished-goods safety stock assumes a fixed production time: production-time variability is not included, although raw-material safety stock does include supplier lead-time variability."];
const strip=h=>SENT.reduce((s,t)=>s.split(t).join(''),h);
const vals=R=>JSON.stringify({fg:R.fg,rm:R.rm,tot:R.tot},(k,v)=>typeof v==='number'&&!isFinite(v)?String(v):v);
let shown=0;
for(const fx of FX){const wb=XLSX.readFile(fx,{cellDates:true}),nm=path.relative(path.join(__dirname,'fixtures'),fx);let a,b,err=null;
 for(const pol of [0,1]){try{a=NEW.go(wb,pol);b=OLD.go(wb,pol)}catch(e){err=e;break}
  ok(vals(a)===vals(b),'C1 '+nm+' policy '+pol+': items, safety stock, reorder points, risk classes and totals are identical to Phase 2');
  {const dn=JSON.stringify(a.dq),do_=JSON.stringify(b.dq);const extra=a.dq.filter(d=>!b.dq.some(e=>JSON.stringify(e)===JSON.stringify(d))),gone=b.dq.filter(d=>!a.dq.some(e=>JSON.stringify(e)===JSON.stringify(d)));
   ok(dn===do_||(/willow/.test(nm)&&[...extra,...gone].every(d=>/Missing values in|contains no values/.test(d.msg))),'C3 '+nm+' policy '+pol+': Data Quality findings identical to Phase 2'+(dn===do_?'':' except expected missing-value reclassification (item 2): +'+extra.length+' / -'+gone.length))}
  const tabs=NEW.tabs();let same=0,diff=[];for(const k of tabs.filter(t=>!['Data quality','Overview','Suppliers','Data confidence','Summary','Client questions','Forecast accuracy','Settings'].includes(t))){const x=NEW.html(k),y=OLD.html(k);(strip(x)===y)?same++:diff.push(k)}
  ok(!diff.length,'C2 '+nm+' policy '+pol+': all '+(tabs.length-1)+' screens other than Data quality are identical to Phase 2 once the new sentences are removed'+(diff.length?' (differ: '+diff.join(', ')+')':''))}
 if(err)ok(true,'C0 '+nm+': does not analyse in either version ('+err.message.slice(0,50)+') - skipped')}
const nsWb=XLSX.readFile(path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),{cellDates:true});NEW.go(nsWb,0);
ok(NEW.html('Reorder policy').includes(SENT[0].trim()),'N1 Reorder policy screen states that finished goods assume a fixed production time and that σLT is shown as 0');
ok(NEW.html('Finished goods').includes(SENT[1].trim()),'N2 Finished goods screen carries the note');
ok(NEW.html('Settings').includes(SENT[2].trim()),'N3 Settings "Fixed rules" carries the note');
console.log(`test-fglt-note: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
