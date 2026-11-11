// v0.7 A1 review: synchronous-safety check of the complete execution path of CGEngine.runEngine().
// Run from tests/: NODE_PATH=<node_modules with acorn, xlsx> node test-a1-sync-path.js [appRoot]
// How: parses all five scripts, starts at CGEngine and follows every reference to a top-level function, constant or
// object (calls, callbacks, method tables such as FM) until nothing new is reached. Every reached item is then checked
// for asynchronous behaviour: async or generator functions, await, yield, Promise, .then, an object with a then
// method (a hand-made promise), timers, fetch, XMLHttpRequest, Worker, postMessage.
// Also runs the wrapper on Northstar and checks that nothing it returns is a promise.
// Limit: the bundled SheetJS library (assets/xlsx.mini.min.js) is third-party and is not analysed; the engine uses
// only its synchronous reading functions (sheet_to_json, read).
const acorn=require('acorn'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'..')),FILES=['js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js','js/engine/engine-api.js'];
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;if(!c||process.env.VERBOSE)console.log((c?'PASS ':'FAIL ')+m)};
const walk=(n,fn,parent)=>{if(!n||typeof n.type!=='string')return;fn(n,parent);for(const k in n){if(k==='loc')continue;const v=n[k];Array.isArray(v)?v.forEach(c=>walk(c,fn,n)):v&&typeof v.type==='string'&&walk(v,fn,n)}};
const isPropName=(x,p)=>p&&((p.type==='MemberExpression'&&p.property===x&&!p.computed)||(p.type==='Property'&&p.key===x&&!p.computed&&!p.shorthand)||(p.type==='MethodDefinition'&&p.key===x));

// top-level bindings of all five files
const nodes={},srcs={};
for(const f of FILES){const src=srcs[f]=fs.readFileSync(path.join(ROOT,f),'utf8'),ast=acorn.parse(src,{ecmaVersion:2022,locations:true});
 for(const s of ast.body){if(s.type==='FunctionDeclaration')nodes[s.id.name]={file:f,node:s};
  if(s.type==='VariableDeclaration')for(const d of s.declarations)if(d.id.type==='Identifier'&&d.init)nodes[d.id.name]={file:f,node:d.init}}}
const refs=n=>{const out=new Set();walk(n,(x,p)=>{if(x.type==='Identifier'&&nodes[x.name]&&!isPropName(x,p))out.add(x.name)});return out};
const reach=new Set(['CGEngine']),q=['CGEngine'];while(q.length){const k=q.shift();for(const r of refs(nodes[k].node))if(!reach.has(r)){reach.add(r);q.push(r)}}

// everything named in the A1 review brief must be on the path
const REQUIRED=['analyse','link','mrp','feas','fcAll','fcCredAll','qs','confAreas','memo','mrpCalc','feasCalc','fcast','fcCred','recFor','seasn','FM','rows','sheetHeaders','calDate','scanNotes'];
for(const r of REQUIRED)ok(reach.has(r),'on the runEngine path: '+r);
ok(reach.size>=REQUIRED.length,'path has '+reach.size+' top-level items: '+[...reach].sort().join(', '));

const ASYNC_NAMES=new Set(['Promise','setTimeout','setInterval','setImmediate','queueMicrotask','requestAnimationFrame','requestIdleCallback','fetch','XMLHttpRequest','Worker','postMessage']);
const findings=node=>{const out=[];walk(node,(n,p)=>{const L=n.loc?' line '+n.loc.start.line:'';
  if(/Function/.test(n.type)&&n.async)out.push('async function'+L);
  if(/Function/.test(n.type)&&n.generator)out.push('generator function'+L);
  if(n.type==='AwaitExpression')out.push('await'+L);
  if(n.type==='YieldExpression')out.push('yield'+L);
  if(n.type==='Identifier'&&ASYNC_NAMES.has(n.name)&&!isPropName(n,p))out.push(n.name+L);
  if(n.type==='MemberExpression'&&!n.computed&&n.property.name==='then')out.push('.then'+L);
  if((n.type==='Property'||n.type==='MethodDefinition')&&!n.computed&&n.key&&(n.key.name==='then'||n.key.value==='then'))out.push('object with a then method'+L)});return out};
for(const k of [...reach].sort()){const r=findings(nodes[k].node);ok(r.length===0,`${nodes[k].file} ${k}: synchronous (${r.length?r.join('; '):'no async features'})`)}

// the rule itself can fail
for(const [label,code] of [['async arrow','const a=async()=>1'],['await','async function a(){await b()}'],['Promise return','function a(){return Promise.resolve(1)}'],['new Promise','function a(){return new Promise(r=>r(1))}'],['then call','function a(){return b().then(c)}'],['hand-made thenable','function a(){return {then(r){r(1)}}}'],['timer','function a(){setTimeout(b,1)}'],['generator','function* g(){yield 1}']])
 ok(findings(acorn.parse(code,{ecmaVersion:2022,locations:true})).length>0,'rule detects: '+label);

// runtime: nothing returned by the wrapper is a promise
try{const XLSX=require('xlsx');global.XLSX=XLSX;const src=FILES.map(f=>srcs[f]).join('\n');
 (0,eval)(src+';globalThis.__sp={setWB:w=>{WB=w},E:CGEngine}');
 globalThis.__sp.setWB(XLSX.readFile(path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),{cellDates:true}));
 const out=globalThis.__sp.E.runEngine(),thenable=v=>v!==null&&(typeof v==='object'||typeof v==='function')&&typeof v.then==='function';
 ok(!thenable(out)&&Object.keys(out).every(k=>!thenable(out[k])),'runEngine() returns plain values, no promise (fields: '+Object.keys(out).join(', ')+')')}catch(e){ok(false,'runEngine() ran without error on Northstar ('+String(e&&e.message).slice(0,100)+')')}

console.log(`test-a1-sync-path: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
