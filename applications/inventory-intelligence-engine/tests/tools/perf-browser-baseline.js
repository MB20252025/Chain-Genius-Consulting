// Browser import timing for the v0.7 baseline (headless Chrome, not a physical phone).
// Desktop: no throttling. Emulated mobile: Pixel 5 device emulation + CPU slowed 4x (Chrome DevTools throttling).
// Measures from uploadFile() to the status line reading "Analysed." (read + parse + analyse x3 + first render).
const puppeteer=require('puppeteer-core'),chromium=(m=>m.default||m)(require('@sparticuz/chromium')),http=require('http'),fs=require('fs'),path=require('path');
const APP=path.resolve(process.argv[2]),FILE=process.argv[3],RUNS=+process.argv[4]||3,MODES=(process.argv[5]||'desktop,mobile4x').split(',');
const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);const p=path.join(APP,u==='/'?'index.html':u);fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});s.end(d)})}).listen(0);
(async()=>{const URL='http://127.0.0.1:'+srv.address().port+'/';const b=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,'--no-sandbox'],headless:'shell'});
 const res={};for(const m of MODES){res[m]=[];for(let i=0;i<RUNS;i++){const pg=await b.newPage();if(m!=='desktop'){await pg.emulate(puppeteer.KnownDevices['Pixel 5']);const c=await pg.createCDPSession();await c.send('Emulation.setCPUThrottlingRate',{rate:4})}
  await pg.goto(URL,{waitUntil:'networkidle0'});const inp=await pg.$('#f');const t0=Date.now();await inp.uploadFile(FILE);
  await pg.waitForFunction(()=>/Analysed/.test(document.querySelector('#st').textContent),{timeout:600000,polling:50});const ms=Date.now()-t0;
  const tabs=await pg.$$eval('#nav [data-t]',x=>x.length);const heap=await pg.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null);
  res[m].push({ms,tabs,heapMB:heap});await pg.close()}}
 await b.close();srv.close();const med=a=>a.map(x=>x.ms).sort((x,y)=>x-y)[a.length>>1];
 console.log(JSON.stringify({file:path.basename(FILE),results:Object.fromEntries(Object.entries(res).map(([k,v])=>[k,{medianMs:med(v),runsMs:v.map(x=>x.ms),tabs:v[0].tabs,jsHeapMB:v.map(x=>x.heapMB)}]))}))})().catch(e=>{console.log('ERROR',e.message);process.exit(1)});
