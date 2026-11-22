// Scans every test fixture with the candidate engine (CGEngine.runEngine) for the data situations decisions A1-A3 touch.
const fs=require('fs'),path=require('path'),XLSX=require('xlsx');global.XLSX=XLSX;const APP=process.argv[2];
(0,eval)(['validation/x1-integrity','calculations','forecasting','app','excel-import','engine/engine-api'].map(n=>fs.readFileSync(path.join(APP,'js',n+'.js'),'utf8')).join('\n')+';globalThis.__E=CGEngine');
const F=path.join(APP,'tests','fixtures');const num=v=>typeof v==='number'&&isFinite(v);
for(const d of fs.readdirSync(F))for(const f of fs.readdirSync(path.join(F,d)).filter(f=>/\.xlsx$/.test(f))){
 let R;try{R=__E.runEngine({workbook:XLSX.readFile(path.join(F,d,f),{cellDates:true})}).result}catch(e){console.log(d+'/'+f,'ERROR',e.message);continue}
 const a=[...R.fg,...R.rm],L=x=>x.h&&x.h.some(v=>v>0);
 const fullyAllocNoDem=a.filter(x=>num(x.oh)&&x.oh>0&&(x.fND||!L(x))&&num(x.uncomm)&&x.uncomm<=0).map(x=>x.id);
 const unkAlloc=a.filter(x=>!num(x.al)).map(x=>x.id+':'+x.cls);
 const hasUsable=a.filter(x=>x.ua!==undefined).length, uaGtOh=a.filter(x=>num(x.ua)&&num(x.oh)&&x.ua>x.oh).map(x=>x.id), ohGtUa=a.filter(x=>num(x.ua)&&num(x.oh)&&x.oh>x.ua).length;
 const assume=a.filter(x=>num(x.ua)&&num(x.oh)&&num(x.al)&&x.oh>x.ua&&x.al>x.ua&&Math.max(x.oh,x.ua)-x.al>0).map(x=>x.id+':'+x.cls);
 const negOh=a.filter(x=>num(x.oh)&&x.oh<0).map(x=>x.id);
 const listed=a.filter(x=>x.cls&&x.cls!=='Active').length, naABC=a.filter(x=>x.abc==='Not Assessed').length;
 console.log(JSON.stringify({wb:d+'/'+f,items:a.length,listedDead:listed,fullyAllocNoDem,unkAlloc,usableCol:hasUsable,uaGtOh,ohGtUa,R2ASSUME:assume,negOh,abcNotAssessed:naABC}));
}
