// X1 completion browser evidence (headless Chrome: desktop 1366x900 and Pixel 5 emulation). Not a physical phone; no import screen exists.
const puppeteer=require('puppeteer-core'),chromium=(m=>m.default||m)(require('@sparticuz/chromium')),http=require('http'),fs=require('fs'),path=require('path');
const APP=path.resolve(process.argv[2]),OUT=process.argv[3],WB=process.argv[4];fs.mkdirSync(OUT,{recursive:true});
const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);const p=path.join(APP,u==='/'?'index.html':u);fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});s.end(d)})}).listen(0);
let pass=0,fail=0;const log=[];const ok=(c,m)=>{c?pass++:fail++;log.push((c?'PASS: ':'FAIL: ')+m)};
(async()=>{const URL='http://127.0.0.1:'+srv.address().port+'/';const b=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--no-sandbox'],headless:'shell'});
 for(const m of ['desktop','pixel5']){
  // 1. blank Material_ID
  { const pg=await b.newPage(),errs=[];pg.on('console',c=>{if(c.type()==='error')errs.push(c.text())});pg.on('pageerror',e=>errs.push(e.message));
    if(m==='pixel5')await pg.emulate(puppeteer.KnownDevices['Pixel 5']);else await pg.setViewport({width:1366,height:900});
    await pg.goto(URL,{waitUntil:'networkidle0'});await (await pg.$('#f')).uploadFile(WB+'/blank-material-id.xlsx');await pg.waitForFunction(()=>/Analysed/.test(document.querySelector('#st').textContent),{timeout:300000,polling:50});
    const go=async t=>{await pg.evaluate(t=>document.querySelector('#nav [data-t="'+t+'"]').click(),t);await new Promise(r=>setTimeout(r,150))};
    await go('Materials');await pg.evaluate(()=>{document.querySelectorAll('[data-more][data-all]').forEach(e=>e.click())});await new Promise(r=>setTimeout(r,200));
    const row=await pg.evaluate(()=>{const tr=[...document.querySelectorAll('tr')].find(r=>/^\s*RM050\b/.test(r.textContent)||[...r.cells].some(c=>c.textContent.trim()==='RM050'));return tr?tr.textContent:null});
    ok(row&&/Not Assessed/.test(row)&&/usage unknown, not zero/.test(row)&&!/null/.test(row),m+' Materials: RM050 row shows Not Assessed ('+(row?row.replace(/\s+/g,' ').slice(0,260):'row not found')+')');
    const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);ok(ov<=1,m+' Materials: no page-level horizontal overflow ('+ov+' px)');
    await pg.screenshot({path:OUT+'/'+m+'-materials-blank-material-id.png'});
    await go('Data quality');const dq=await pg.evaluate(()=>document.body.innerText);ok(/BOM lines with a blank or unknown Material_ID/.test(dq)&&/row \d+ \(FG001 \/ blank\)/.test(dq),m+' Data quality: High warning names the BOM row and parent');
    await pg.screenshot({path:OUT+'/'+m+'-data-quality-blank-material-id.png'});
    await go('Production feasibility');const pf=await pg.evaluate(()=>document.body.innerText);ok(/Insufficient information/.test(pf)&&/blank Material_ID/.test(pf),m+' Production feasibility: FG001 orders "Insufficient information" with the blank Material_ID reason');
    await pg.screenshot({path:OUT+'/'+m+'-feasibility-blank-material-id.png'});
    const ex=await pg.evaluate(()=>{let cap=null;const o=XLSX.writeFile;XLSX.writeFile=(w)=>{cap=w};try{exportWorkbook()}finally{XLSX.writeFile=o}if(!cap)return null;const out={};for(const n of cap.SheetNames){const r=XLSX.utils.sheet_to_json(cap.Sheets[n]);const hit=r.find(x=>Object.values(x).some(v=>v==='RM050'));if(hit)out[n]=hit}return out});
    const exTxt=JSON.stringify(ex||{});ok(ex&&/Not Assessed/.test(exTxt)&&/structural zero cannot be established/.test(exTxt),m+' export: the RM050 row carries Not Assessed and the reason');
    ok(errs.length===0,m+' no console errors ('+errs.length+')');await pg.close() }
  // 2. issue 26: ROP column absent
  { const pg=await b.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));if(m==='pixel5')await pg.emulate(puppeteer.KnownDevices['Pixel 5']);else await pg.setViewport({width:1366,height:900});
    await pg.goto(URL,{waitUntil:'networkidle0'});await (await pg.$('#f')).uploadFile(WB+'/no-rop-column.xlsx');await pg.waitForFunction(()=>/Analysed/.test(document.querySelector('#st').textContent),{timeout:300000,polling:50});
    const t=await pg.evaluate(()=>document.body.innerText);ok(/Reorder_Point_Qty/.test(t)&&!/Risk status/.test(t),m+' issue 26: notice names Reorder_Point_Qty and no longer claims risk status is withheld');
    await pg.evaluate(()=>document.querySelector('#nav [data-t="MRP"]').click());await new Promise(r=>setTimeout(r,150));await pg.screenshot({path:OUT+'/'+m+'-mrp-no-rop-column.png'});
    const na=await pg.evaluate(()=>[...R.fg,...R.rm].filter(x=>x.sev===null).length);ok(na===0,m+' issue 26: 0 items Not Assessed (every item assessed with "No reorder point configured")');
    ok(errs.length===0,m+' issue 26: no page errors');await pg.close() } }
 await b.close();srv.close();log.push(`final-browser: ${pass} passed, ${fail} failed`);fs.writeFileSync(OUT+'/results.txt',log.join('\n')+'\n');console.log(log.join('\n'));process.exit(fail?1:0)})().catch(e=>{console.log('ERROR',e.stack);process.exit(1)});
