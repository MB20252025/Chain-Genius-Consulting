// Candidate 3 (B2): exporting must not change the uploaded workbook, the results, or later exports.
const fs=require('fs'),path=require('path'),crypto=require('crypto');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__T={load:w=>{WB=w;R=analyse();link&&0},get WB(){return WB},get R(){return R},exp:()=>{let o;const wx=XLSX.writeFile;XLSX.writeFile=x=>{o=x};try{exportWorkbook()}finally{XLSX.writeFile=wx}return o}}');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const H=s=>crypto.createHash('md5').update(s).digest('hex');
const sig=w=>JSON.stringify(w.SheetNames)+'|'+w.SheetNames.map(n=>n+':'+H(XLSX.utils.sheet_to_csv(w.Sheets[n]))).join(',');
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const results=()=>H(JSON.stringify([__T.R.fg.map(x=>[x.id,x.sev,x.act,x.rop,x.ss]),__T.R.rm.map(x=>[x.id,x.sev,x.act,x.rop,x.ss]),__T.R.sup.map(s=>[s.id,s.score,s.fill,s.over]),__T.R.tot]));
for(const f of [NS,path.join(__dirname,'fixtures/edge/scenario-combined.xlsx')]){const n=path.basename(f);
 const wb=XLSX.readFile(f,{cellDates:true});__T.load(wb);const before=sig(wb),names=[...wb.SheetNames],sheetsRef=wb.Sheets,r0=results();
 const e1=__T.exp(),afterOne=sig(wb);
 ok(afterOne===before,n+': uploaded workbook unchanged after one export (sheet names and every cell)');ok(wb.SheetNames.length===names.length&&wb.Sheets===sheetsRef,n+': workbook object and Sheets map not replaced or extended');
 ok(!wb.SheetNames.some(s=>s.startsWith('ENG_')),n+': no ENG_ sheet left behind in the uploaded workbook');
 ok(results()===r0,n+': results (items, classes, actions, suppliers, totals) unchanged by the export');
 const e2=__T.exp(),e3=__T.exp();ok(sig(e2)===sig(e1)&&sig(e3)===sig(e1),n+': three consecutive exports are identical (names and cell contents)');
 const eng=e1.SheetNames.filter(s=>s.startsWith('ENG_'));ok(eng.length===10||eng.length===9,n+': export carries the engine sheets ('+eng.length+')');
 ok(new Set(e1.SheetNames).size===e1.SheetNames.length,n+': no duplicate sheet names in the export');
 ok(names.every(s=>H(XLSX.utils.sheet_to_csv(e1.Sheets[s]))===H(XLSX.utils.sheet_to_csv(wb.Sheets[s]))),n+': every original sheet in the export is cell-identical to the upload');
 // after exporting, a recalculation gives the same results
 __T.load(wb);ok(results()===r0,n+': recalculating after exports gives the same results');
 // an already-exported workbook (contains ENG_ sheets) is re-imported and exported again
 const buf=XLSX.write(e1,{type:'buffer',bookType:'xlsx',cellDates:true}),w2=XLSX.read(buf,{cellDates:true});__T.load(w2);const s2=sig(w2),e4=__T.exp();
 ok(sig(w2)===s2,n+': re-imported exported workbook is not changed by exporting it again');ok(e4.SheetNames.filter(s=>s==='ENG_FG').length===1&&e4.SheetNames.filter(s=>s.startsWith('ENG_')).length===eng.length,n+': ENG_ sheets are replaced, not duplicated, when the upload already holds them');
 ok(H(XLSX.utils.sheet_to_csv(e4.Sheets.ENG_RM))===H(XLSX.utils.sheet_to_csv(e1.Sheets.ENG_RM)),n+': ENG_RM from the re-exported workbook equals the first export')}
console.log(`test-export-repeat: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
