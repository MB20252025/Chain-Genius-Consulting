const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const fs=require('fs');global.XLSX=require('xlsx');global.document={querySelector:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
const dir=process.argv[2],out=process.argv[3],wbp=process.argv[4]||__NS;
const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(dir+'/js/'+n+'.js','utf8')).join('\n');
eval(src+';globalThis.__g=()=>{WB=XLSX.readFile('+JSON.stringify(wbp)+',{cellDates:true});R=analyse();return {R,M:mrp(),F:feas(),fc:fcAll()}}');
const {R,M,F,fc}=__g(),r=(n,d=6)=>n==null||!isFinite(n)?null:+n.toFixed(d);
const o={items:[...R.fg,...R.rm].map(x=>[x.id,r(x.val,2),r(x.ss),r(x.rop),r(x.ssR,4),r(x.ropR,4),x.sev,r(x.cover,4),r(x.lt,4),r(x.exVal,2),x.abc,x.xyz,x.conf,r(x.score)]),
 sup:R.sup.map(s=>[s.id,r(s.score,4),s.cat,s.risk,s.mats,r(s.otd,4),r(s.late,4),s.n]).sort(),
 mrp:M.map(m=>[m.x.id,m.st,r(m.net,4),m.qty,r(m.val,2),m.out,m.by]).sort(),
 feas:F.rows.map(x=>[x.o.id,x.status,x.bl.map(b=>[b.id,r(b.sh,4)]),x.delay]),
 fc:Object.entries(fc).map(([k,v])=>[k,v.ok?[v.best,r(v.s3,4),r(v.s6,4),r(v.s12,4),v.f.map(a=>r(a,4)),v.hi.map(a=>r(a,4)),v.trend]:null]),
 pr:R.pr.map(p=>[p.id,p.n,p.lateN,r(p.late,4),r(p.slip,4)]).sort(),
 tot:[R.fgV,R.rmV,R.exV,R.shV,R.top10].map(v=>r(v,4)),
 fga:R.fg.map(x=>[x.id,r(x.wape,6),r(x.bias,6),r(x.mae,6),r(x.fcu,4)]),po:[R.po.invRM,R.po.invFG,R.po.snap,R.po.now],dq:R.dq.map(d=>[d.sev,d.kind,d.sheet]).sort()};
fs.writeFileSync(out,JSON.stringify(o));console.log('snapshot written',Object.keys(o).map(k=>k+':'+o[k].length).join(' '));
