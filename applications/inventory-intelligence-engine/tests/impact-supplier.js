// Phase 3 -> Phase 3B supplier impact report over every fixture workbook (read-only comparison with the protected Phase 3 source).
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const load=root=>{const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(root+'/js/'+n+'.js','utf8')).join('\n'),A={};new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()}')(XLSX,document,A);return A};
const P3=process.env.P3_TREE||fs.readFileSync('/home/claude/p3tree.txt','utf8').trim();const NEW=load(path.join(__dirname,'..')),OLD=load(P3);
const FX=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?w(p):/\.xlsx$/.test(f)&&FX.push(p)}})(path.join(__dirname,'fixtures'));
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');const f1=v=>v==null?'null':Number.isFinite(v)?v.toFixed(1):String(v);
const out=[];let changed=0,total=0,toHigh2NA=0;const wk=h=>{const m=strip(h).match(/Summary[^]*?weak[^]*?\./i);return m?m[0].slice(0,200):''};
for(const fx of FX){const nm=path.relative(path.join(__dirname,'fixtures'),fx);let a,b;try{const wb=XLSX.readFile(fx,{cellDates:true});b=OLD.go(wb);a=NEW.go(wb)}catch(e){continue}
 const rows=[];for(const s of a.supRisk){const o=b.supRisk.find(x=>x.id===s.id);total++;if(!o)continue;
  const d=[];if(f1(o.score)!==f1(s.score))d.push('score '+f1(o.score)+' -> '+f1(s.score));if(o.cat!==s.cat)d.push('class "'+o.cat+'" -> "'+s.cat+'"');if(o.evid!==s.evid)d.push('evidence '+o.evid+' -> '+s.evid);
  if(d.length){changed++;if(o.cat==='High risk'&&(s.cat!=='High risk'))toHigh2NA++;rows.push('  '+s.id+' '+s.name+': '+d.join('; ')+(s.reason?' [reason: '+s.reason+']':''))}}
 const sA=strip(NEW.html('Summary')),sB=strip(OLD.html('Summary')),i=sB.indexOf('upplier'),sd=sA!==sB;
 if(rows.length||sd)out.push('### '+nm+'\n'+(rows.join('\n')||'  (no supplier score/class change)')+'\n  Summary text changed: '+(sd?'yes':'no'))}
console.log('# Supplier impact, Phase 3 -> Phase 3B\n\nFixtures compared: '+FX.length+'; supplier rows compared: '+total+'; rows with a score/class/evidence change: '+changed+'; High risk -> not High risk: '+toHigh2NA+'\n');console.log(out.join('\n\n')||'No changes in any fixture.');

// ---- damaged-data scenarios (derived from Northstar): where Phase 3 produced NaN / High risk
{const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
 const mk=fn=>{const wb=XLSX.readFile(NS,{cellDates:true}),rows=XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true});fn(rows);wb.Sheets['Purchase Orders']=XLSX.utils.json_to_sheet(rows,{cellDates:true});return wb};
 const sc={'one blank Received_Qty on a SUP008 received line':r=>{delete r.filter(q=>q.Received_Date&&q.Supplier_ID==='SUP008')[1].Received_Qty},
  'one text quantity ("120") on a SUP008 received line':r=>{r.filter(q=>q.Received_Date&&q.Supplier_ID==='SUP008')[1].Received_Qty='120'},
  'one negative Received_Qty on a SUP008 received line':r=>{r.filter(q=>q.Received_Date&&q.Supplier_ID==='SUP008')[1].Received_Qty=-5},
  'every Received_Qty blank (all suppliers)':r=>r.forEach(x=>{delete x.Received_Qty}),
  'one blank Promised_Date on a SUP008 received line':r=>{delete r.filter(q=>q.Received_Date&&q.Supplier_ID==='SUP008')[1].Promised_Date}};
 console.log('\n\n## Damaged-data scenarios (Northstar with the edit shown): suppliers whose class changed\n');
 for(const [k,fn] of Object.entries(sc)){const wb=mk(fn),b=OLD.go(wb),a=NEW.go(wb);const lines=[];
  for(const s of a.supRisk){const o=b.supRisk.find(x=>x.id===s.id);if(!o)continue;if(f1(o.score)!==f1(s.score)||o.cat!==s.cat)lines.push('  '+s.id+': Phase 3 '+f1(o.score)+' / '+o.cat+'  ->  Phase 3B '+f1(s.score)+' / '+s.cat+(s.reason?' ['+s.reason+']':'')+(s.otd!=null?'; OTD kept '+f1(s.otd)+'%':''))}
  const hb=b.supRisk.filter(x=>x.cat==='High risk').length,ha=a.supRisk.filter(x=>x.cat==='High risk').length,na=a.supRisk.filter(x=>x.score===null&&x.n>0).length;
  console.log('### '+k+'\n  High-risk suppliers: Phase 3 '+hb+' -> Phase 3B '+ha+'; Not Assessed with POs: '+na+'\n'+(lines.slice(0,8).join('\n')||'  (no change)')+(lines.length>8?'\n  ... and '+(lines.length-8)+' more with the same pattern':'')+'\n')}}
