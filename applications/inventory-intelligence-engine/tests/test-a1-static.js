// v0.7 checkpoint A1: static safety rules for the Phase 1 wrapper.
// Run from tests/: NODE_PATH=<node_modules with acorn> node test-a1-static.js
// Rule 1 (no asynchronous code): the wrapper is safe only because a calculation runs from start to finish without pausing.
//   Fails if the engine files, the wrapper, or the app/import functions the engine calls contain async functions, await,
//   generators, promises, timers or network calls.
// Rule 2 (who may touch the shared globals): only the v0.6 files and the wrapper may refer to CFG, R or WB.
//   Any other file under js/ that refers to them fails. Each rule is also run on small bad examples to prove it can fail.
const acorn=require('acorn'),fs=require('fs'),path=require('path'),ROOT=path.resolve(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;if(!c||process.env.VERBOSE)console.log((c?'PASS ':'FAIL ')+m)};
const parse=s=>acorn.parse(s,{ecmaVersion:2022,locations:true});
const walk=(n,fn)=>{if(!n||typeof n.type!=='string')return;fn(n);for(const k in n){if(k==='loc')continue;const v=n[k];Array.isArray(v)?v.forEach(c=>walk(c,fn)):v&&typeof v.type==='string'&&walk(v,fn)}};
const ASYNC_NAMES=new Set(['setTimeout','setInterval','setImmediate','queueMicrotask','requestAnimationFrame','requestIdleCallback','Promise','fetch','XMLHttpRequest','Worker','postMessage']);
const asyncFindings=node=>{const out=[];walk(node,n=>{
  if(/Function/.test(n.type)&&(n.async||n.generator))out.push((n.async?'async':'generator')+' function at line '+n.loc.start.line);
  if(n.type==='AwaitExpression'||n.type==='YieldExpression')out.push(n.type+' at line '+n.loc.start.line);
  if(n.type==='Identifier'&&ASYNC_NAMES.has(n.name))out.push(n.name+' at line '+n.loc.start.line)});
  // property names such as x.then are not checked; .then( calls are
  walk(node,n=>{if(n.type==='MemberExpression'&&!n.computed&&n.property.name==='then')out.push('.then at line '+n.loc.start.line)});
  return out};
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// Rule 1, whole files
for(const f of ['js/calculations.js','js/forecasting.js','js/engine/engine-api.js']){const r=asyncFindings(parse(read(f)));ok(r.length===0,`${f}: no asynchronous code (${r.length?r.join('; '):'none found'})`)}
// Rule 1, functions in app.js / excel-import.js that the wrapper's calculation path calls
const fnBodies=(f,names)=>{const ast=parse(read(f)),found={};ast.body.forEach(s=>{if(s.type==='FunctionDeclaration'&&names.includes(s.id.name))found[s.id.name]=s;
  if(s.type==='VariableDeclaration')s.declarations.forEach(d=>{if(d.id.type==='Identifier'&&names.includes(d.id.name))found[d.id.name]=d})});return found};
for(const [f,names] of [['js/app.js',['confAreas']],['js/excel-import.js',['rows','sheetHeaders','calDate']]]){const b=fnBodies(f,names);
 for(const n of names){ok(!!b[n],`${f}: ${n} found`);if(b[n]){const r=asyncFindings(b[n]);ok(r.length===0,`${f} ${n}(): no asynchronous code (${r.length?r.join('; '):'none found'})`)}}}
// Rule 1 can fail
for(const [label,code] of [['async function','async function a(){}'],['await','async function a(){await 1}'],['timer','setTimeout(()=>{},1)'],['promise','Promise.resolve(1)'],['then','x.then(y)'],['generator','function* g(){yield 1}']])
 ok(asyncFindings(parse(code)).length>0,'rule 1 detects: '+label);

// Rule 2
const ALLOWED=new Set(['js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js','js/engine/engine-api.js']);
const GLOBALS=new Set(['CFG','R','WB']);
const freeRefs=src=>{const ast=parse(src),hits=[];walk(ast,n=>{
  if(n.type==='MemberExpression'&&!n.computed)n.property.__skip=true;if(n.type==='Property'&&!n.computed&&!n.shorthand)n.key.__skip=true;
  if(n.type==='Identifier'&&!n.__skip&&GLOBALS.has(n.name))hits.push(n.name+'@'+n.loc.start.line)});return hits};
const jsFiles=[];(function list(d){for(const e of fs.readdirSync(path.join(ROOT,d),{withFileTypes:true})){const p=d+'/'+e.name;e.isDirectory()?list(p):p.endsWith('.js')&&jsFiles.push(p)}})('js');
ok(jsFiles.length>=5,'js files found: '+jsFiles.join(', '));
for(const f of jsFiles.filter(f=>!ALLOWED.has(f))){const h=freeRefs(read(f));ok(h.length===0,`${f}: does not touch CFG, R or WB (${h.join(', ')||'none'})`)}
console.log('rule 2: files outside the allowed list: '+(jsFiles.filter(f=>!ALLOWED.has(f)).join(', ')||'none yet (rule applies to files added in A2 and later)'));
// Rule 2 can fail, and ignores property names
ok(freeRefs('const a=R.fg;').length===1&&freeRefs('CFG.z=2').length===1&&freeRefs('WB=null').length===1,'rule 2 detects R, CFG and WB references');
ok(freeRefs('const a=x.R; const o={CFG:1}; y.WB=2;').length===0,'rule 2 ignores property names');

console.log(`test-a1-static: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
