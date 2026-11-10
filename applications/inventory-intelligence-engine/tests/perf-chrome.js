// Real-Chrome timing on a large workbook. Usage: node perf-chrome.js <workbook.xlsx> [cpuSlowdown=1]
// Measures: import-to-"Analysed." time, and per-tab switch time (script time and time until the next two animation frames).
const {chromium}=require('playwright'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
(async()=>{const file=process.argv[2],slow=+(process.argv[3]||1);const b=await chromium.launch({args:['--js-flags=--max-old-space-size=4096','--disable-dev-shm-usage']});const ctx=await b.newContext({viewport:{width:+(process.env.VW||412),height:+(process.env.VW>600?800:915)}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))});
 await p.goto('file://'+ROOT+'/index.html');
 if(slow>1){const c=await ctx.newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:slow})}
 const t0=Date.now();await p.setInputFiles('#f',file);await p.waitForFunction(()=>/Analysed|Error|could not/i.test(document.querySelector('#st').textContent),null,{timeout:600000});const imp=Date.now()-t0;
 const st=await p.$eval('#st',e=>e.textContent);console.log(`import-to-ready (file read + parse + analyse x3 + first render): ${(imp/1000).toFixed(1)} s | status: ${st}`);
 let tabs=await p.$$eval('#nav [data-t]',e=>e.map(x=>x.dataset.t));if(process.env.FIRST)tabs=[process.env.FIRST,...tabs.filter(t=>t!==process.env.FIRST)];const rows=[];
 for(const t of tabs){process.stdout.write('  trying '+t+'\r');let r;try{r=await p.evaluate(async t=>{const el=document.querySelector(`#nav [data-t="${t}"]`);const a=performance.now();el.click();const js=performance.now()-a;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {js,paint:performance.now()-a,cells:document.querySelectorAll('#v td').length}},t)}catch(e){console.log('PAGE CRASHED/FAILED on tab:',t,'-',String(e.message).split('\n')[0]);break}rows.push({t,...r})}
 await p.evaluate(()=>document.querySelector('#nav [data-t="Materials"]').click());const more=await p.evaluate(async()=>{const b=document.querySelector('[data-more]:not([data-all])');if(!b)return null;const a=performance.now();b.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-a});
 if(more!=null)console.log('Materials tab: "Show more" click to repaint:',Math.round(more),'ms');
 const lim=300;rows.sort((a,b)=>b.paint-a.paint).forEach(r=>console.log(r.t.padEnd(26),String(Math.round(r.js)).padStart(6),'ms script',String(Math.round(r.paint)).padStart(6),'ms to paint',String(r.cells).padStart(8),'cells',r.paint>lim?' > 300 ms':''));
 const over=rows.filter(r=>r.paint>lim).length;console.log(`tabs over 300 ms: ${over} of ${rows.length} | slowest ${Math.round(rows[0].paint)} ms | console/page errors: ${errs.length}`);
 await b.close()})();
