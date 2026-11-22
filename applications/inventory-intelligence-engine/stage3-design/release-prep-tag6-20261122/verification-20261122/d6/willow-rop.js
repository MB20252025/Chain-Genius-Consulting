// Runs the engine of one commit (CGEngine.runEngine, as run-all.sh --emit-confidence does) on willow and lists the
// items whose verdict is 'Existing ROP insufficient' (the count behind clientQuestions "N items").
const fs=require('fs'),path=require('path'),XLSX=require('xlsx');global.XLSX=XLSX;const APP=process.argv[2];
(0,eval)(['calculations','forecasting','app','excel-import','engine/engine-api'].filter(n=>fs.existsSync(path.join(APP,'js',n+'.js'))).map(n=>fs.readFileSync(path.join(APP,'js',n+'.js'),'utf8')).join('\n')+';globalThis.__E=CGEngine;globalThis.__R=()=>R');
const wb=XLSX.readFile(path.join(APP,'tests/fixtures/structure/scenario-willow.xlsx'),{cellDates:true});
const e=__E.runEngine({workbook:wb});const q=e.clientQuestions.find(q=>/reorder points/.test(q.q));
const R=e.result;const ins=[...R.fg,...R.rm].filter(x=>x.verdict==='Existing ROP insufficient');
console.log('question evidence:',q&&q.ev);
ins.forEach(x=>console.log(x.id,'| ROP wb',x.rop,'| ROP calc',x.ropR&&x.ropR.toFixed(2),'| m',x.m&&x.m.toFixed(3),'| h',JSON.stringify(x.h)));
const t=[...R.fg,...R.rm].find(x=>x.id==='ing 017'||x.id==='ING017'||/017/.test(x.id)&&x.type==='RM');if(t)console.log('ITEM',t.id,'| verdict',t.verdict,'| ROP wb',t.rop,'| ROP calc',t.ropR,'| m',t.m,'| h',JSON.stringify(t.h),'| hc',JSON.stringify(t.hc));
