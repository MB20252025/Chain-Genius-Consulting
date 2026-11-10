// Regression test: export must work for scenarios where suppliers have no scored delivery history.
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path'),ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
(async()=>{for(const sc of ['nohist','nopo','allfuture']){
 const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,120)));
 const dom=await JSDOM.fromFile(path.join(ROOT,'index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;await new Promise(r=>w.addEventListener('load',r));
 const $=s=>w.document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const buf=fs.readFileSync(path.join(ROOT,`tests/fixtures/suppliers/scenario-${sc}.xlsx`)),ab=new w.Uint8Array(buf).buffer;
 Object.defineProperty($('#f'),'files',{value:[{name:sc+'.xlsx',size:buf.length,arrayBuffer:async()=>ab}],configurable:true});$('#f').dispatchEvent(new w.Event('change'));await wait(900);
 ok($('#st').textContent==='Analysed.',sc+': analysed ('+$('#st').textContent.slice(0,50)+')');
 [...w.document.querySelectorAll('#nav [data-t]')].find(b=>b.dataset.t==='Settings').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));let wbOut=null;w.XLSX.writeFile=wb=>{wbOut=wb};$('#ex').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await wait(100);
 ok(!!wbOut&&/^Export created/.test($('#st').textContent),sc+': export created ('+$('#st').textContent.slice(0,60)+')');
 if(wbOut){const rows=w.XLSX.utils.sheet_to_json(wbOut.Sheets.ENG_Suppliers);const na=rows.filter(r=>r.Risk==='Not Assessed — Insufficient Evidence');
  ok(rows.length>0,sc+': ENG_Suppliers has rows');ok(rows.every(r=>!/NaN|undefined|Infinity/.test(JSON.stringify(r))),sc+': no NaN/undefined/Infinity in supplier rows');
  if(sc==='nohist')ok(na.length>0&&na.every(r=>r.Score===undefined||r.Score===''||r.Score===null),sc+': unassessed suppliers exported with blank score');
  ok(!!wbOut.Sheets.ENG_Confidence&&!!wbOut.Sheets.ENG_DataQuality,sc+': Confidence and DataQuality sheets present')}
 ok(errs.length===0,sc+': no script errors')}
 console.log(`test-export-nohistory: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
