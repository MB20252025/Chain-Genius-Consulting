// Runs the ACTUAL application (candidate index.html) in Chrome: uploads the workbook through the file input, saves the text
// of every tab, reads the live engine result (R, mrp()), downloads the Excel export through the Settings button and checks
// it, and records console/page errors and timings. Usage: node run-app.js <app url> <workbook> <outdir> <width> <height>
const {chromium}=require('playwright'),fs=require('fs'),XLSX=require('/home/claude/testdeps/node_modules/xlsx');
(async()=>{const [url,wb,out,W,H]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:+W,height:+H},acceptDownloads:true,...(+W<600?{isMobile:true,hasTouch:true,deviceScaleFactor:2.6}:{})});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>m.type()==='error'&&errs.push('console: '+m.text()));
await p.goto(url);const t0=Date.now();await p.setInputFiles('input[type=file]',wb);
await p.waitForFunction(()=>{try{return typeof R!=='undefined'&&R&&R.fg&&R.fg.length>0&&document.querySelector('#nav button')}catch(e){return false}},null,{timeout:120000});const tLoad=Date.now()-t0;
const tabs=await p.evaluate(()=>[...document.querySelectorAll('#nav button')].map(x=>x.textContent));const tt={};
for(const t of tabs){const s=Date.now();await p.click(`#nav button[data-t="${t}"]`);await p.waitForTimeout(150);tt[t]=Date.now()-s;fs.writeFileSync(out+'/tab-'+t.replace(/[^A-Za-z]+/g,'_')+'.txt',await p.textContent('#v'));
 if(t==='Excess & dead stock'||t==='Overview')await p.screenshot({path:out+'/shot-'+t.replace(/[^A-Za-z]+/g,'_')+'.png',fullPage:false});
 const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(sw>2)errs.push('page scrolls sideways on tab '+t+' by '+sw+'px')}
await p.click('#nav button[data-t="Settings"]');const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click('#ex')]);const xf=out+'/export.xlsx';await dl.saveAs(xf);
const X=XLSX.readFile(xf),fgh=XLSX.utils.sheet_to_json(X.Sheets.ENG_FG,{header:1})[0],rmh=XLSX.utils.sheet_to_json(X.Sheets.ENG_RM,{header:1})[0];
const ex={file:dl.suggestedFilename(),sheets:X.SheetNames.filter(s=>s.startsWith('ENG_')),fgHeader:fgh.slice(0,10),rmRows:XLSX.utils.sheet_to_json(X.Sheets.ENG_RM).length,fgRows:XLSX.utils.sheet_to_json(X.Sheets.ENG_FG).length,
 nanCells:X.SheetNames.filter(s=>s.startsWith('ENG_')).reduce((n,s)=>n+XLSX.utils.sheet_to_json(X.Sheets[s],{header:1}).flat().filter(v=>v==='NaN'||(typeof v==='number'&&!isFinite(v))).length,0)};
const eng=await p.evaluate(()=>{const pick=o=>Object.fromEntries(Object.entries(o).filter(([k,v])=>v===null||['number','string','boolean'].includes(typeof v)));
 return {fgV:R.fgV,rmV:R.rmV,tot:R.tot,dq:R.dq.map(d=>({sev:d.sev,sheet:d.sheet,msg:d.msg,ex:Array.isArray(d.ex)?d.ex:String(d.ex||'')})),fg:R.fg.map(pick),rm:R.rm.map(pick),mrp:mrp().map(r=>Object.assign({id:r.x.id},Object.fromEntries(Object.entries(r).filter(([k,v])=>k!=='x'&&(v===null||['number','string','boolean'].includes(typeof v))))))}});
fs.writeFileSync(out+'/engine-live-R.json',JSON.stringify(eng));const meta={url,workbook:wb,viewport:[+W,+H],title:await p.title(),loadMs:tLoad,tabMs:tt,errors:errs,export:ex};
fs.writeFileSync(out+'/meta.json',JSON.stringify(meta,null,1));await b.close();console.log(JSON.stringify({w:+W,title:meta.title.slice(0,40),loadMs:tLoad,maxTabMs:Math.max(...Object.values(tt)),errors:errs.length,errList:errs.slice(0,4),export:ex}))})().catch(e=>{console.error(e);process.exit(1)});
