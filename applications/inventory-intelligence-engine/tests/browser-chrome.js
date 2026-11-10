// Real-browser test: headless Chrome (desktop + mobile EMULATION). Emulation is NOT a physical Android device.
// Run: NODE_PATH=<node_modules with puppeteer-core and @sparticuz/chromium and xlsx> node browser-chrome.js [screenshotDir]
const fs=require('fs'),path=require('path'),http=require('http'),os=require('os');global.XLSX=require('xlsx');
const ROOT=process.env.APP_ROOT?path.resolve(process.env.APP_ROOT):path.resolve(__dirname,'..'),NS=process.env.NORTHSTAR_XLSX||path.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),BASE='/chain-genius/applications/inventory-intelligence-engine/';
const SHOTS=process.argv.filter(a=>!a.startsWith('--'))[2]||path.join(__dirname,'logs','screens-'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z');fs.mkdirSync(SHOTS,{recursive:true});
const NONVISUAL=process.argv.includes('--non-visual');let skipped=0;
let ok=0,bad=0;const chk=(n,c,d)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'  >> '+(d===undefined?'':typeof d==='string'?d:JSON.stringify(d))))};
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain'},reqs=[];
const server=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);reqs.push(u);if(!u.startsWith(BASE)){s.writeHead(404);return s.end('nf')}let f=path.join(ROOT,u.slice(BASE.length)||'index.html');if(f.endsWith(path.sep))f+='index.html';if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('nf')}s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s)});
const visualChk=(n,c,d)=>{if(NONVISUAL){skipped++;console.log('EXCLUDED (visual check; colour/theme work deferred by the owner) '+n);return}chk(n,c,d)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const PORT=server.address().port,URL='http://127.0.0.1:'+PORT+BASE;
 const m=require('@sparticuz/chromium'),chromium=m.default||m,puppeteer=require('puppeteer-core');
 const browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--no-sandbox'],headless:'shell'});
 console.log('Browser:',await browser.version(),'| served at',URL);
 const dl=fs.mkdtempSync(path.join(os.tmpdir(),'dl-')),cdp=await browser.target().createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dl});
 for(const mode of ['desktop','mobile']){
  console.log('\n===== '+mode.toUpperCase()+(mode==='mobile'?' (Pixel 5 EMULATION: 393x851, touch, Android Chrome UA)':' (1280x800)')+' =====');
  const page=await browser.newPage(),errs=[],fails=[];reqs.length=0;
  page.on('console',x=>{if(x.type()==='error'||x.type()==='warning')errs.push(x.type()+': '+x.text().slice(0,140))});page.on('pageerror',e=>errs.push('pageerror: '+String(e.message).slice(0,140)));page.on('requestfailed',r=>fails.push(r.url().slice(0,100)+' '+(r.failure()||{}).errorText));
  if(mode==='mobile')await page.emulate(puppeteer.KnownDevices['Pixel 5']);else await page.setViewport({width:1280,height:800});
  await page.goto(URL,{waitUntil:'networkidle0'});
  const ext=reqs.filter(u=>!u.startsWith(BASE)),loaded=reqs.map(u=>u.replace(BASE,''));
  chk(mode+': page loads under a GitHub-Pages-style subpath; all 6 assets served (200)',['','css/styles.css','assets/xlsx.mini.min.js','js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js'].every(a=>loaded.includes(a))&&!fails.length,{loaded,fails});
  chk(mode+': no requests outside the app folder (fully client-side, no CDN)',ext.length===0&&reqs.every(u=>u.startsWith(BASE)),ext);
  chk(mode+': viewport meta honoured (layout viewport = device width)',await page.evaluate(()=>innerWidth)===(mode==='mobile'?393:1280));
  // real file upload through the file input
  const inp=await page.$('#f');await inp.uploadFile(NS);await page.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',{timeout:20000}).catch(()=>{});
  chk(mode+': Northstar workbook imports through the real file input → "Analysed."',await page.$eval('#st',e=>e.textContent)==='Analysed.');
  const tot=await page.evaluate(()=>[R.fgV,R.rmV,R.exV,R.shV,R.top10].map(v=>+v.toFixed(4))),g5=require('./snapshots/'+fs.readdirSync(path.join(__dirname,'snapshots')).find(f=>/^v0\.5-golden/.test(f))||'x');
  chk(mode+': results in real Chrome equal the saved v0.5 golden totals',JSON.stringify(tot)===JSON.stringify(g5.tot),{tot,g5:g5.tot});
  const tm=await page.evaluate(()=>{const t=performance.now();for(let i=0;i<5;i++){analyse()}return (performance.now()-t)/5});console.log('   analysis time in this browser: '+tm.toFixed(0)+' ms per run');chk(mode+': analysis under 2 s',tm<2000,tm);
  // every tab: real click / touch tap
  const names=await page.$$eval('#nav [data-t]',b=>b.map(x=>x.dataset.t));chk(mode+': 17 tabs',names.length===17,names.length);let tabsOk=true,aria=true;const seen=new Set();
  for(const n of names){const e0=errs.length;const b=(await page.$$('#nav [data-t]'))[names.indexOf(n)];mode==='mobile'?await b.tap():await b.click();await sleep(40);
   const r=await page.evaluate(()=>({act:document.querySelector('#nav .on').textContent,aria:document.querySelector('#nav .on').getAttribute('aria-current'),len:document.querySelector('#v').innerHTML.length,bad:/undefined|NaN/.test(document.querySelector('#v').innerHTML),h:document.querySelector('#v').innerHTML.slice(0,3000)}));
   if(errs.length>e0){tabsOk=false;console.log('   console error while opening tab',n,errs.slice(e0))}if(r.act!==n||r.len<150||r.bad){tabsOk=false;console.log('   problem tab',n,r.act,r.len,r.bad)}if(r.aria!=='page')aria=false;seen.add(r.h)}
  chk(mode+': all 17 tabs respond to '+(mode==='mobile'?'touch taps':'clicks')+', render, and show distinct content ('+seen.size+')',tabsOk&&seen.size===names.length);chk(mode+': active tab exposes aria-current',aria);
  // layout (mobile focus, desktop too)
  const tabsToCheck=['Overview','Finished goods','Suppliers','Forecast accuracy','Data quality','Data confidence','Settings','Summary'];let overflow=[];
  for(const n of tabsToCheck){const b=(await page.$$('#nav [data-t]'))[names.indexOf(n)];mode==='mobile'?await b.tap():await b.click();await sleep(40);
   const o=await page.evaluate(()=>{const W=innerWidth,bad=[];document.querySelectorAll('body *').forEach(e=>{if(e.closest('.w')||e.closest('nav'))return;const r=e.getBoundingClientRect();if(r.width&&r.right>W+1)bad.push(e.tagName+'.'+e.className+'@'+Math.round(r.right))});return {sw:document.documentElement.scrollWidth,W,n:bad.length,bad:bad.slice(0,3)}});
   if(o.sw>o.W+1||o.n)overflow.push([n,o])}
  chk(mode+': no page-level horizontal overflow on 8 key tabs (wide tables scroll inside their own container)',overflow.length===0,overflow);
  // tap targets and input size
  await (await page.$$('#nav [data-t]'))[names.indexOf('Settings')][mode==='mobile'?'tap':'click']();await sleep(40);
  const sz=await page.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]});const min=a=>a.reduce((m,x)=>[Math.min(m[0],x[0]),Math.min(m[1],x[1])],[1e9,1e9]);return {nav:min(q('#nav button')),btn:min(q('button.p')),inp:min(q('input[type=number]')),font:getComputedStyle(document.querySelector('input[type=number]')).fontSize}});
  console.log('   smallest nav button',sz.nav,'| action button',sz.btn,'| number input',sz.inp,'| input font',sz.font);chk(mode+': touch targets at least 40px high; input font 16px (no mobile zoom-on-focus)',sz.nav[1]>=40&&sz.btn[1]>=40&&sz.inp[1]>=40&&sz.font==='16px',sz);
  // sticky first column keeps the item visible while scrolling a wide table
  await (await page.$$('#nav [data-t]'))[names.indexOf('Finished goods')][mode==='mobile'?'tap':'click']();await sleep(60);
  const st=await page.evaluate(()=>{const w=document.querySelector('#v .w'),t=w.querySelector('table'),c=t.querySelector('td:first-child'),pos=getComputedStyle(c).position;const before=c.getBoundingClientRect().left-w.getBoundingClientRect().left;w.scrollLeft=600;const after=c.getBoundingClientRect().left-w.getBoundingClientRect().left;return {sticky:t.className.includes('sticky1'),pos,before:Math.round(before),after:Math.round(after),canScroll:w.scrollWidth>w.clientWidth}});
  chk(mode+': wide table scrolls inside its container and the Item column stays in view (sticky)',st.sticky&&st.pos==='sticky'&&st.canScroll&&Math.abs(st.after-st.before)<=2,st);
  // settings validation in the real DOM
  await (await page.$$('#nav [data-t]'))[names.indexOf('Settings')][mode==='mobile'?'tap':'click']();await sleep(40);
  await page.$eval('[data-k="z"]',e=>e.value='abc');await page.$eval('[data-k="excess"]',e=>e.value='0');await page.$eval('[data-k="x"]',e=>e.value='0.9');
  await (mode==='mobile'?(await page.$('#rc')).tap():(await page.$('#rc')).click());await sleep(120);
  const sm=await page.evaluate(()=>({boxes:[...document.querySelectorAll('#v .warn')].map(e=>e.textContent),z:CFG.z,ex:CFG.excess,x:CFG.x,y:CFG.y}));
  const smsg=sm.boxes.find(b=>!/^Supply source/.test(b.trim()))||'';
  chk(mode+': Settings corrects invalid input (text, below minimum, X ≥ Y) and tells the user',sm.z===1.65&&sm.ex===1&&sm.x===.15&&sm.y===.25&&/not a number/.test(smsg)&&/below the minimum/.test(smsg)&&/must be lower/.test(smsg),sm);
  await (mode==='mobile'?(await page.$('#rs')).tap():(await page.$('#rs')).click());await sleep(120);chk(mode+': Reset to defaults restores every threshold',await page.evaluate(()=>JSON.stringify(CFG)===JSON.stringify(CFG0)));
  // export: real download
  fs.readdirSync(dl).forEach(f=>fs.unlinkSync(path.join(dl,f)));await (mode==='mobile'?(await page.$('#ex')).tap():(await page.$('#ex')).click());let file=null;for(let i=0;i<40&&!file;i++){await sleep(250);file=fs.readdirSync(dl).find(f=>f.endsWith('.xlsx'))}
  let sheets=[];if(file){try{sheets=XLSX.readFile(path.join(dl,file)).SheetNames}catch(e){}}
  chk(mode+': Export downloads a real .xlsx keeping the original sheets and adding the ENG_ sheets ('+(file||'no file')+', '+sheets.filter(s=>s.startsWith('ENG_')).length+' ENG sheets)',!!file&&['Products','Purchase Orders','QA NOTES'].every(s=>sheets.includes(s))&&['ENG_FG','ENG_Attainment','ENG_POReconciliation','ENG_ForecastCredibility','ENG_Confidence','ENG_Suppliers'].every(s=>sheets.includes(s)),sheets);
  chk(mode+': Export success message shown to the user',/Export created/.test(await page.$eval('#st',e=>e.textContent)));
  // print
  await page.emulateMediaType('print');await (await page.$$('#nav [data-t]'))[names.indexOf('Summary')]&&await page.evaluate(()=>{tab='Summary';show()});
  const pr=await page.evaluate(()=>({nav:getComputedStyle(document.querySelector('nav')).display,up:getComputedStyle(document.querySelector('#up')).display,btn:getComputedStyle(document.querySelector('button.p')||document.body).display}));
  const pdf=Buffer.from(await page.pdf({format:'A4',printBackground:true}));fs.writeFileSync(path.join(SHOTS,mode+'-summary-print.pdf'),pdf);
  const parsed=await require('pdf-parse')(pdf),ptxt=parsed.text,domTxt=await page.$eval('#v',e=>e.innerText),raw=pdf.toString('latin1'),rawPages=(raw.match(/\/Type\s*\/Page[^s]/g)||[]).length,mb=raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/),leaked=[...names.filter(n=>!domTxt.includes(n)),'Export to Excel','Reset to defaults','Print / save as PDF','Load a workbook'].filter(s=>ptxt.includes(s));
  chk(mode+': print view hides navigation, upload card and buttons (computed styles in print media)',pr.nav==='none'&&pr.up==='none'&&pr.btn==='none',pr);
  chk(mode+': PDF is a valid A4 document ('+pdf.length+' bytes; parser counts '+parsed.numpages+' page(s), raw scan '+rawPages+')',pdf.length>5000&&parsed.numpages>=1&&parsed.numpages===rawPages&&!!mb&&Math.abs(+mb[1]-595)<2&&Math.abs(+mb[2]-842)<2,{pages:parsed.numpages,rawPages,mb:mb&&[mb[1],mb[2]]});
  chk(mode+': PDF contains the Summary (heading, recommendations, limitations, simulated-demonstration label)',/Management summary/.test(ptxt)&&/Recommendations/.test(ptxt)&&/Limitations/.test(ptxt)&&/SIMULATED DEMONSTRATION/.test(ptxt));
  chk(mode+': PDF text has no navigation labels, upload prompt or button labels ('+leaked.length+' leaked)',leaked.length===0,leaked);await page.emulateMediaType('screen');
  // dark mode + contrast
  const contrast=()=>page.evaluate(()=>{const lum=c=>{const [r,g,b]=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};const bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement}return 'rgb(255,255,255)'};const ratio=e=>{const a=lum(getComputedStyle(e).color),b=lum(bg(e)),[hi,lo]=a>b?[a,b]:[b,a];return (hi+.05)/(lo+.05)};
   const out={};for(const [k,s] of Object.entries({body:'body',card:'.card',warn:'.warn',note:'.note',nav:'#nav button',navOn:'#nav button.on',th:'th',td:'td',s3:'.s3',s2:'.s2',tag:'.tag'})){const e=document.querySelector(s);if(e)out[k]=+ratio(e).toFixed(2)}return out});
  await (await page.$$('#nav [data-t]'))[names.indexOf('Overview')][mode==='mobile'?'tap':'click']();await sleep(40);const light=await contrast();
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await sleep(80);const dark=await contrast(),bgd=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  await (await page.$$('#nav [data-t]'))[names.indexOf('Settings')][mode==='mobile'?'tap':'click']();await sleep(40);const darkS=await contrast();
  console.log('   contrast ratios light:',JSON.stringify(light),'\n                   dark :',JSON.stringify(dark),'| settings(dark):',JSON.stringify(darkS));
  const minL=Math.min(...Object.values(light)),minD=Math.min(...Object.values({...dark,...darkS}));
  chk(mode+': dark mode applies (page background is dark)',/rgb\(/.test(bgd)&&Math.max(...bgd.match(/\d+/g).slice(0,3).map(Number))<80,bgd);
  visualChk(mode+': every sampled text/background pair has contrast ≥ 4.5:1 in light and dark ('+minL+' / '+minD+')',minL>=4.5&&minD>=4.5,{light,dark,darkS});
  await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
  // offline: everything is client-side
  await page.setOfflineMode(true);await (await page.$$('#nav [data-t]'))[names.indexOf('Overview')][mode==='mobile'?'tap':'click']();await (await page.$('#f')).uploadFile(NS);await page.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',{timeout:15000}).catch(()=>{});
  chk(mode+': works offline after loading (import + analysis need no network)',await page.$eval('#st',e=>e.textContent)==='Analysed.');await page.setOfflineMode(false);
  // failure cases
  const bt=path.join(os.tmpdir(),'notes.txt'),bx=path.join(os.tmpdir(),'broken.xlsx');fs.writeFileSync(bt,'hello');fs.writeFileSync(bx,Buffer.from('PK\u0003\u0004 this is not a real workbook'.repeat(20)));
  await (await page.$('#f')).uploadFile(bt);await sleep(200);const m1=await page.$eval('#st',e=>e.textContent);await (await page.$('#f')).uploadFile(bx);await sleep(500);const m2=await page.$eval('#st',e=>e.textContent);
  chk(mode+': wrong file type and a corrupted .xlsx give clear messages, not a crash ("'+m1+'" / "'+m2.slice(0,50)+'")',/\.xlsx/.test(m1)&&/Could not read|Missing sheet|Error/.test(m2));
  await (await page.$('#f')).uploadFile(NS);await page.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',{timeout:15000}).catch(()=>{});chk(mode+': app recovers and analyses a good file after bad ones',await page.$eval('#st',e=>e.textContent)==='Analysed.');
  // screenshots
  for(const n of ['Overview','Suppliers','Settings','Data confidence']){await (await page.$$('#nav [data-t]'))[names.indexOf(n)][mode==='mobile'?'tap':'click']();await sleep(60);await page.screenshot({path:path.join(SHOTS,mode+'-'+n.replace(/ /g,'-')+'.png'),fullPage:false})}
  chk(mode+': no console errors, warnings or uncaught exceptions during the whole session ('+errs.length+')',errs.length===0,errs.slice(0,5));await page.close();
 }
 // missing asset
 {const page=await browser.newPage(),errs=[];await page.setRequestInterception(true);page.on('request',r=>r.url().includes('xlsx.mini.min.js')?r.abort():r.continue());page.on('pageerror',e=>errs.push(String(e.message)));await page.goto(URL,{waitUntil:'load'});await sleep(200);const msg=await page.$eval('#st',e=>e.textContent);chk('failure case: Excel library blocked/missing → clear message and no uncaught error ("'+msg.slice(0,60)+'")',/Excel library did not load/.test(msg)&&errs.length===0,errs);await page.close()}
 await browser.close();server.close();console.log('\nsummary',ok,'pass',bad,'fail',NONVISUAL?'| excluded visual checks: '+skipped:'');process.exitCode=bad?1:0})().catch(e=>{console.log('SCRIPT ERROR',e.stack);process.exit(2)});
