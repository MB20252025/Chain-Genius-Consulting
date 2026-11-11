// v0.7 A1 review tool: lists every write to a top-level variable on the CGEngine.runEngine() path. Run from the app folder: NODE_PATH=<node_modules with acorn> node tests/audit-shared-state-writes.js .
const acorn=require('acorn'),fs=require('fs'),path=require('path');const ROOT=process.argv[2],FILES=['js/calculations.js','js/forecasting.js','js/app.js','js/excel-import.js','js/engine/engine-api.js'];
const walk=(n,fn,parent)=>{if(!n||typeof n.type!=='string')return;fn(n,parent);for(const k in n){if(k==='loc')continue;const v=n[k];Array.isArray(v)?v.forEach(c=>walk(c,fn,n)):v&&typeof v.type==='string'&&walk(v,fn,n)}};
const isPropName=(x,p)=>p&&((p.type==='MemberExpression'&&p.property===x&&!p.computed)||(p.type==='Property'&&p.key===x&&!p.computed&&!p.shorthand));
const nodes={},TOP=new Set(),src={};
for(const f of FILES){const s=src[f]=fs.readFileSync(path.join(ROOT,f),'utf8'),ast=acorn.parse(s,{ecmaVersion:2022,locations:true});
 for(const st of ast.body){if(st.type==='FunctionDeclaration'){nodes[st.id.name]={file:f,node:st};TOP.add(st.id.name)}
  if(st.type==='VariableDeclaration')for(const d of st.declarations)if(d.id.type==='Identifier'){TOP.add(d.id.name);if(d.init)nodes[d.id.name]={file:f,node:d.init}}}}
const refs=n=>{const out=new Set();walk(n,(x,p)=>{if(x.type==='Identifier'&&nodes[x.name]&&!isPropName(x,p))out.add(x.name)});return out};
const reach=new Set(['CGEngine']),q=['CGEngine'];while(q.length){const k=q.shift();for(const r of refs(nodes[k].node))if(!reach.has(r)){reach.add(r);q.push(r)}}
const root=e=>{while(e&&e.type==='MemberExpression')e=e.object;return e&&e.type==='Identifier'?e.name:null};
const locals=n=>{const L=new Set();walk(n,x=>{if(x.type==='VariableDeclarator'&&x.id.type==='Identifier')L.add(x.id.name);if(/Function/.test(x.type))x.params.forEach(p=>walk(p,y=>{if(y.type==='Identifier')L.add(y.name)}))});return L};
const MUT=new Set(['push','pop','shift','unshift','splice','sort','reverse','fill','set','delete','clear','add','assign']);
const out={};
for(const k of reach){const n=nodes[k].node,L=locals(n);walk(n,x=>{let t=null,how='';
 if(x.type==='AssignmentExpression'){t=root(x.left);how=src[nodes[k].file].slice(x.left.start,x.left.end)+' '+x.operator}
 if(x.type==='UpdateExpression'){t=root(x.argument);how=src[nodes[k].file].slice(x.argument.start,x.argument.end)+x.operator}
 if(x.type==='CallExpression'&&x.callee.type==='MemberExpression'&&!x.callee.computed&&MUT.has(x.callee.property.name)){
   if(x.callee.object.type==='Identifier'&&x.callee.object.name==='Object'&&x.callee.property.name==='assign'){t=root(x.arguments[0]);how='Object.assign('+src[nodes[k].file].slice(x.arguments[0].start,x.arguments[0].end)+',…)'}
   else{t=root(x.callee.object);how=src[nodes[k].file].slice(x.callee.start,x.callee.end)+'()'}}
 if(t&&TOP.has(t)&&!L.has(t)){(out[t]=out[t]||[]).push(k+': '+how.slice(0,60)+' @'+nodes[k].file+':'+x.loc.start.line)}})}
for(const [t,v] of Object.entries(out)){console.log('## '+t+' ('+v.length+')');[...new Set(v)].slice(0,40).forEach(x=>console.log('   '+x))}
