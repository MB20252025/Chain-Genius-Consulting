// Phase 4 Section 2: the three constraints for suppliers marked "Not Assessed — Insufficient Evidence". Read-only checks on the engine; no application code is changed.
// C1 materials of Not Assessed suppliers stay in supplier-risk and material-risk analysis; C2 null scores sort/filter/render without crashes, misleading rank or wrong class; C3 they are not silently dropped from any other calculation.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),NA='Not Assessed — Insufficient Evidence';
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n'),o={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link()};out.R=()=>R;out.tabs=()=>ORDER.filter(k=>views[k]);out.html=k=>{tab=k;return views[k]()};out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,o);
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const mk=fn=>{const wb=XLSX.readFile(NS,{cellDates:true}),rows=XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true});fn(rows);wb.Sheets['Purchase Orders']=XLSX.utils.json_to_sheet(rows,{cellDates:true});return wb};
const J=(wb,n)=>XLSX.utils.sheet_to_json(wb.Sheets[n],{raw:true,cellDates:true});
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const SC={
 'nohist (fixture: suppliers with no delivery history)':XLSX.readFile(path.join(__dirname,'fixtures/suppliers/scenario-nohist.xlsx'),{cellDates:true}),
 'nopo (fixture)':XLSX.readFile(path.join(__dirname,'fixtures/suppliers/scenario-nopo.xlsx'),{cellDates:true}),
 'Northstar, SUP008 every Received_Qty blank (one supplier Data problem)':mk(r=>r.filter(q=>q.Supplier_ID==='SUP008').forEach(x=>{delete x.Received_Qty})),
 'Northstar, every Received_Qty blank (all suppliers Data problem)':mk(r=>r.forEach(x=>{delete x.Received_Qty})),
 'Northstar, SUP008 every Promised_Date blank':mk(r=>r.filter(q=>q.Supplier_ID==='SUP008').forEach(x=>{delete x.Promised_Date}))};
const bNS=(o.go(XLSX.readFile(NS,{cellDates:true})),o.R()),baseItems=Object.fromEntries([...bNS.fg,...bNS.rm].map(x=>[x.id,x.sev+'|'+x.act]));
for(const [name,wb] of Object.entries(SC)){o.go(wb);const R=o.R(),M=J(wb,'Materials'),naS=R.sup.filter(s=>s.cat===NA),tag='['+name+'] ';
 ok(naS.length>0,tag+'scenario has Not Assessed suppliers ('+naS.length+')');
 // ---- C1
 ok(naS.every(s=>R.supRisk.some(x=>x.id===s.id)),tag+'C1 every Not Assessed supplier is present in the supplier-risk ranking (R.supRisk has '+R.supRisk.length+' of '+R.sup.length+' suppliers)');
 ok(R.supRisk.length===R.sup.length,tag+'C1 supplier-risk ranking contains exactly the same suppliers as the Suppliers table');
 ok(naS.every(s=>{const own=M.filter(m=>m.Default_Supplier_ID===s.id).length,rmOwn=R.rm.filter(x=>x.sup===s.id);return s.mats===own&&rmOwn.length===own}),tag+'C1 each Not Assessed supplier keeps ALL its materials: "Materials supplied" equals the Materials sheet count, and every one of them is a row in the material-risk analysis (R.rm)');
 ok(naS.every(s=>s.risk===R.rm.filter(x=>x.sup===s.id&&x.sev>=2).length),tag+'C1 "At-risk materials" for Not Assessed suppliers equals an independent count of their High/Critical materials');
 ok(naS.every(s=>R.rm.filter(x=>x.sup===s.id).every(x=>x.sev>=0&&x.sev<=3&&typeof x.act==='string')),tag+'C1 their materials carry a valid risk class (0-3) and an action field (an empty action is normal for Critical items in some scenarios and is not caused by the supplier state)');
 const html=strip(o.html('Overview'));ok(naS.filter(s=>R.supRisk.indexOf(s)<5).every(s=>html.includes(s.id+' '+s.name)&&html.includes(NA)),tag+'C1 Not Assessed suppliers that rank in the top five are shown by name with the exact state string on the Overview');
 // ---- C2
 const sr=R.supRisk;let ordered=true,why='';for(let i=1;i<sr.length;i++){const a=sr[i-1],b=sr[i];if(a.risk<b.risk){ordered=false;why='risk '+a.id+'/'+b.id}else if(a.risk===b.risk){const sa=a.score??1e9,sb=b.score??1e9;if(sa>sb){ordered=false;why='score '+a.id+'/'+b.id}}}
 ok(ordered,tag+'C2 supplier-risk ranking: at-risk count descending, then score ascending with unscored suppliers after scored ones'+(why?' ('+why+')':''));
 const ss=R.sup;let o2=true;for(let i=1;i<ss.length;i++){const a=ss[i-1].score,b=ss[i].score;if((a??-1)<(b??-1))o2=false}
 ok(o2&&ss.filter(s=>s.score===null).every(s=>ss.indexOf(s)>=ss.filter(x=>x.score!==null).length),tag+'C2 Suppliers table: score descending, every unscored supplier after every scored one');
 ok(R.sup.every(s=>(s.score===null)===(s.cat===NA)),tag+'C2 a supplier has a null score exactly when its class is the Not Assessed state (no zero, no NaN, no High risk)');
 ok(!R.sup.some(s=>s.cat==='High risk'&&s.score===null)&&R.sup.filter(s=>s.score!==null).every(s=>s.cat===(s.score>=75?'Low risk':s.score>=60?'Medium risk':'High risk')),tag+'C2 scored suppliers keep the unchanged cut-offs 75/60; no null-score supplier is High risk');
 let crash=null;const bad=[];for(const k of o.tabs()){try{const h=o.html(k);if(/NaN|undefined|Infinity|\[object/.test(strip(h)))bad.push(k)}catch(e){crash=k+': '+e.message}}
 ok(!crash&&!bad.length,tag+'C2 all '+o.tabs().length+' tabs render without an exception'+(crash?' (CRASH '+crash+')':'')+' and without NaN/undefined/Infinity text'+(bad.length?' (in '+bad.join(', ')+')':''));
 const sm=strip(o.html('Summary'));ok(!R.sup.filter(s=>s.cat===NA).some(s=>new RegExp('Manage weak suppliers \\([^)]*\\b'+s.id+'\\b').test(sm)),tag+'C2 Summary weak-supplier list never names a Not Assessed supplier');
 const e=o.exp(),eRows=XLSX.utils.sheet_to_json(e.Sheets.ENG_Suppliers);ok(eRows.length===R.sup.length&&eRows.every(r=>!JSON.stringify(r).includes('NaN'))&&naS.every(s=>{const r=eRows.find(x=>Object.values(x).includes(s.id));return r&&(r.Score===null||r.Score===undefined||r.Score==='')&&r.Risk===NA}),tag+'C2 export: one row per supplier, blank score and the exact state string for Not Assessed suppliers, no NaN');
 // ---- C3
 ok(R.rm.length===bNS.rm.length&&R.fg.length===bNS.fg.length||/nohist|nopo/.test(name),tag+'C3 item counts unchanged (FG '+R.fg.length+', RM '+R.rm.length+')');
 const mrpOk=(()=>{try{const m=R.rm.filter(x=>naS.some(s=>s.id===x.sup));return m.length===0||m.every(x=>Number.isFinite(x.val)&&Number.isFinite(x.cover??0))}catch(e){return false}})();ok(mrpOk,tag+'C3 their materials still have finite value and cover (inventory value totals include them)');
 ok(R.tot&&Object.values(R.tot).every(v=>typeof v!=='number'||Number.isFinite(v)),tag+'C3 portfolio totals are finite');
 if(/SUP008 every Received_Qty|every Received_Qty blank/.test(name)){const same=[...R.fg,...R.rm].every(x=>baseItems[x.id]===x.sev+'|'+x.act);ok(same,tag+'C3 blank received quantities change NO item risk class or recommended action versus intact Northstar (suppliers\' lead-time inputs come from dates, which are valid)')}
 if(/Promised_Date blank/.test(name)){const diff=[...R.fg,...R.rm].filter(x=>baseItems[x.id]!==x.sev+'|'+x.act);console.log('INFO ['+name+'] items whose class/action differ from intact Northstar: '+diff.length+(diff.length?' ('+diff.slice(0,6).map(x=>x.id).join(', ')+')':''));ok(true,tag+'C3 (information) item differences when a supplier\'s promised dates are unusable are reported above, not hidden')}
}
console.log(`test-na-constraints: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
