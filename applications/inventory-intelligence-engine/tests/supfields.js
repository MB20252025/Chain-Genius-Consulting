// Which supplier-object fields differ between Phase 3 and Phase 3B on every fixture (shared fields by value; new fields listed).
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
const load=root=>{const src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(root+'/js/'+n+'.js','utf8')).join('\n'),A={};new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();return R}')(XLSX,document,A);return A};
const O=load(fs.readFileSync('/home/claude/p3tree.txt','utf8').trim()),N=load(path.join(__dirname,'..'));
const FX=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?w(p):/\.xlsx$/.test(f)&&FX.push(p)}})(path.join(__dirname,'fixtures'));
const diffK={},newK=new Set();let rows=0;
for(const fx of FX){let a,b;try{const wb=XLSX.readFile(fx,{cellDates:true});b=O.go(wb);a=N.go(wb)}catch(e){continue}
 for(const s of (Array.isArray(a.sup)?a.sup:Object.values(a.sup))){const o=(Array.isArray(b.sup)?b.sup:Object.values(b.sup)).find(x=>x.id===s.id);if(!o)continue;rows++;for(const k of Object.keys(s)){if(!(k in o))newK.add(k);else if(JSON.stringify(s[k])!==JSON.stringify(o[k])){(diffK[k]=diffK[k]||new Set()).add(path.basename(fx)+':'+(String(o[k]).slice(0,40))+' -> '+String(s[k]).slice(0,40))}}}}
console.log('supplier rows compared:',rows);console.log('NEW fields:',[...newK].join(', '));for(const [k,v] of Object.entries(diffK))console.log('CHANGED',k,'x'+v.size,[...v].slice(0,3).join(' | '));
