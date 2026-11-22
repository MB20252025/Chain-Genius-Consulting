// Runs the ACTUAL application (index.html of the candidate) in Chrome, uploads a workbook through the file input,
// then (1) saves the visible text of every tab and (2) reads the engine's live result object R and mrp() from the page.
// Usage: node run-app.js <url of app index.html> <workbook> <outdir>
const {chromium}=require('playwright'),fs=require('fs');
(async()=>{const [url,wb,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});const errs=[];
p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>m.type()==='error'&&errs.push('console: '+m.text()));
await p.goto(url);await p.setInputFiles('input[type=file]',wb);
await p.waitForFunction(()=>{try{return typeof R!=='undefined'&&R&&R.fg&&R.fg.length>0}catch(e){return false}},null,{timeout:60000});
const meta=await p.evaluate(()=>({title:document.title,header:(document.querySelector('header small')||{}).textContent,tabs:[...document.querySelectorAll('#nav button')].map(x=>x.textContent),CFG:{z:CFG.z,hor:CFG.hor,sup:CFG.sup,pol:CFG.pol,excess:CFG.excess,abcA:CFG.abcA,abcB:CFG.abcB},snap:new Date(R.snap).toISOString()}));
for(const t of meta.tabs){await p.click(`#nav button[data-t="${t}"]`);await p.waitForTimeout(400);fs.writeFileSync(out+'/tab-'+t.replace(/[^A-Za-z]+/g,'_')+'.txt',await p.textContent('#v'))}
const eng=await p.evaluate(()=>{const pick=o=>Object.fromEntries(Object.entries(o).filter(([k,v])=>v===null||['number','string','boolean'].includes(typeof v)));
 const M=mrp();return {fgV:R.fgV,rmV:R.rmV,tot:R.tot,fg:R.fg.map(pick),rm:R.rm.map(pick),mrp:M.map(r=>Object.assign({id:r.x.id},Object.fromEntries(Object.entries(r).filter(([k,v])=>k!=='x'&&(v===null||['number','string','boolean'].includes(typeof v))))))}});
fs.writeFileSync(out+'/engine-live-R.json',JSON.stringify(eng,null,1));fs.writeFileSync(out+'/meta.json',JSON.stringify(Object.assign(meta,{errors:errs,url,workbook:wb}),null,1));
await p.screenshot({path:out+'/last-tab.png'});await b.close();console.log('done',meta.title,'errors:',errs.length)})().catch(e=>{console.error(e);process.exit(1)});
