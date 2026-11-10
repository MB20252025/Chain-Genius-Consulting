// Cross-file globals and load-order check (classic <script> files share one global scope).
// 1. index.html loads the scripts in the expected order and every file exists.
// 2. No top-level name is declared in two files (a second `const`/`let`/`function` of the same name would stop a file loading).
// 3. Anything a file runs while it is loading (top-level code, not inside a function) only uses names already declared in an earlier file
//    or earlier in the same file (const/let are not usable before their line; functions are hoisted).
// Needs: acorn (npm i acorn). Run: node check-globals.js
const acorn=require('acorn'),fs=require('fs'),path=require('path'),ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),tags=[...html.matchAll(/<script[^>]*\ssrc="([^"?]+)[^"]*"/g)].map(m=>m[1]);
const EXPECT=['assets/xlsx.mini.min.js','js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js','js/engine/engine-api.js'];let bad=0,n=0; // v0.7 A1: engine wrapper added last
const ok=(c,m)=>{n++;if(!c){bad++;console.log('FAIL:',m)}};
ok(JSON.stringify(tags)===JSON.stringify(EXPECT),'script order in index.html is '+tags.join(' -> '));EXPECT.forEach(f=>ok(fs.existsSync(path.join(ROOT,f)),f+' exists'));
const FILES=EXPECT.filter(f=>f.startsWith('js/')),decl={},BUILTIN=new Set(Object.getOwnPropertyNames(globalThis).concat(['document','window','XLSX','matchMedia','location','navigator','localStorage','sessionStorage','FileReader','Blob','URL','setTimeout','clearTimeout','console','Event','MouseEvent','HTMLElement','Intl','requestAnimationFrame','performance','alert','confirm','print','undefined','arguments']));
const names=p=>p.type==='Identifier'?[p.name]:p.type==='ArrayPattern'?p.elements.flatMap(e=>e?names(e):[]):p.type==='ObjectPattern'?p.properties.flatMap(q=>names(q.value||q.argument)):p.type==='RestElement'?names(p.argument):p.type==='AssignmentPattern'?names(p.left):[];
const asts={};FILES.forEach(f=>{const ast=asts[f]=acorn.parse(fs.readFileSync(path.join(ROOT,f),'utf8'),{ecmaVersion:2022,locations:true});decl[f]=new Map();
 ast.body.forEach(s=>{if(s.type==='FunctionDeclaration')decl[f].set(s.id.name,{line:0,hoist:true});if(s.type==='VariableDeclaration')s.declarations.forEach(d=>names(d.id).forEach(x=>decl[f].set(x,{line:s.loc.start.line,end:s.end,hoist:s.kind==='var'})))})});
const seen={};FILES.forEach(f=>decl[f].forEach((_,k)=>{ok(!seen[k],'top-level name '+k+' declared in both '+seen[k]+' and '+f);seen[k]=f}));
// free identifiers evaluated at load time: walk the AST but do not enter function bodies (they run later, after every file has loaded)
const visit=(node,fn,skipFn=true)=>{if(!node||typeof node.type!=='string')return;if(skipFn&&/Function/.test(node.type)){ // default parameter values and computed keys are not evaluated at definition time either
  return}fn(node);for(const k in node){if(k==='loc')continue;const v=node[k];Array.isArray(v)?v.forEach(c=>visit(c,fn,skipFn)):v&&typeof v.type==='string'&&visit(v,fn,skipFn)}};
let loadUses=0;FILES.forEach((f,fi)=>{const earlier=new Set(FILES.slice(0,fi).flatMap(g=>[...decl[g].keys()]));
 asts[f].body.forEach(s=>{if(s.type==='FunctionDeclaration')return;const local=new Set();visit(s,x=>{if(x.type==='Identifier'){}});
  // names declared by this statement itself are not "uses"; member property names and object keys are not references
  const skip=new Set();visit(s,x=>{if(x.type==='MemberExpression'&&!x.computed)skip.add(x.property);if(x.type==='Property'&&!x.computed)skip.add(x.key);if(x.type==='VariableDeclarator')names(x.id).forEach(()=>{});if(x.type==='MethodDefinition')skip.add(x.key)});
  const own=new Set();if(s.type==='VariableDeclaration')s.declarations.forEach(d=>names(d.id).forEach(q=>own.add(q)));
  visit(s,x=>{if(x.type!=='Identifier'||skip.has(x))return;const id=x.name;if(own.has(id)||BUILTIN.has(id))return;
   // an identifier bound inside a nested arrow/function is skipped because function bodies are not entered
   const d=decl[f].get(id);if(d){loadUses++;ok(d.hoist||d.end<=s.start,f+':'+x.loc.start.line+' uses '+id+' before its declaration finishes (declared line '+d.line+')');return}
   if(earlier.has(id)){loadUses++;return}
   if(/^[A-Z_]/.test(id)&&false)return;
   // not declared in this or an earlier file: either a later file (load-order bug) or an undeclared global
   const later=FILES.slice(fi+1).find(g=>decl[g].has(id));ok(false,f+':'+x.loc.start.line+' uses '+id+' at load time'+(later?', but it is declared later in '+later:' and it is not declared anywhere'))})})});
console.log(`check-globals: ${n-bad} passed, ${bad} failed (${FILES.length} files, ${Object.values(decl).reduce((q,m)=>q+m.size,0)} top-level names, ${loadUses} load-time references checked)`);process.exit(bad?1:0)
