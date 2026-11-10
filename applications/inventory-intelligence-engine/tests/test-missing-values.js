// Phase 3 item 2: missing-value detection. Every column is inspected (not only those in the first data row); each blank representation is tested separately;
// zero and other real values are not flagged; an all-blank column is reported as holding no values; an absent column is not; text values are not "missing".
// Screens (Data quality, Client questions, Summary) and the ENG_DataQuality export are checked. Cells are written as real workbook cells and round-tripped through .xlsx.
const fs=require('fs'),path=require('path');global.XLSX=require('xlsx');global.document={querySelector:()=>({textContent:'',innerHTML:''}),addEventListener(){},querySelectorAll:()=>[]};
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const ROOT=path.join(__dirname,'..'),src=['calculations','forecasting','app','excel-import'].map(n=>fs.readFileSync(ROOT+'/js/'+n+'.js','utf8')).join('\n'),A={};
new Function('XLSX','document','out',src+';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};out.html=k=>{tab=k;return views[k]()};out.exp=()=>{let w;const x=XLSX.writeFile;XLSX.writeFile=q=>{w=q};try{exportWorkbook()}finally{XLSX.writeFile=x}return w}')(XLSX,document,A);
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
// ---- helpers: edit real cells, then write and re-read as an .xlsx file
const colOf=(ws,h)=>{const r=XLSX.utils.decode_range(ws['!ref']);for(let c=r.s.c;c<=r.e.c;c++){const x=ws[XLSX.utils.encode_cell({r:r.s.r,c})];if(x&&x.v===h)return c}return -1};
const cell=(ws,h,row,v)=>{const a=XLSX.utils.encode_cell({r:row-1,c:colOf(ws,h)});if(v===null)delete ws[a];else ws[a]=v};   // row = spreadsheet row number (2 = first data row)
const build=(fn)=>{const wb=XLSX.readFile(NS,{cellDates:true});fn(wb);const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx',cellDates:true});return XLSX.read(buf,{cellDates:true})};
const miss=(R,sheet,col)=>R.dq.find(d=>d.sheet===sheet&&d.msg==='Missing values in '+col),none=(R,sheet,col)=>R.dq.find(d=>d.sheet===sheet&&new RegExp('^Column '+col+' contains no values').test(d.msg));
const base=A.go(build(()=>{})),nDQ=base.dq.length;
ok(!base.dq.some(d=>/Missing values|contains no values/.test(d.msg)),'M0 Northstar as supplied: no missing-value and no blank-column findings (as before)');
const S='Suppliers',C='Country';
// ---- each representation of a blank, in the FIRST data row, in a LATER row, and in both
const REPS=[['truly empty cell',null],['empty string',{t:'s',v:''}],['spaces only',{t:'s',v:'    '}],['tab and non-breaking space',{t:'s',v:'\t  '}],['formula returning an empty string',{t:'s',v:'',f:'""'}]];
for(const [name,v] of REPS){
 {const R=A.go(build(wb=>cell(wb.Sheets[S],C,2,v)));const f=miss(R,S,C);ok(!!f&&f.ex==='2'&&!none(R,S,C),'M1 '+name+' in the FIRST data row (row 2): "Missing values in '+C+'" is reported with row 2 (examples: '+(f&&f.ex)+')')}
 {const R=A.go(build(wb=>cell(wb.Sheets[S],C,6,v)));const f=miss(R,S,C);ok(!!f&&f.ex==='6','M2 '+name+' in a LATER row (row 6): reported with the true row number 6 (examples: '+(f&&f.ex)+')')}
 {const R=A.go(build(wb=>{cell(wb.Sheets[S],C,2,v);cell(wb.Sheets[S],C,6,v);cell(wb.Sheets[S],C,9,v)}));const f=miss(R,S,C);ok(!!f&&f.ex==='2, 6, 9','M3 '+name+' in rows 2, 6 and 9: all three are listed (examples: '+(f&&f.ex)+')')}
 {const R=A.go(build(wb=>{const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,C,r,v)}));const f=none(R,S,C);ok(!!f&&!miss(R,S,C)&&f.sev==='Medium'&&/every cell in the column is empty/.test(f.msg),'M4 '+name+' in EVERY row: reported as "Column '+C+' contains no values" (Medium), not as scattered missing values')}}
// ---- real values are not blanks
{const R=A.go(build(wb=>{cell(wb.Sheets[S],'Standard_Lead_Time_Days',2,{t:'n',v:0})}));ok(!miss(R,S,'Standard_Lead_Time_Days')&&!none(R,S,'Standard_Lead_Time_Days'),'M5 a zero in the first row is a real value: not flagged')}
{const R=A.go(build(wb=>{const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Standard_Lead_Time_Days',r,{t:'n',v:0})}));ok(!miss(R,S,'Standard_Lead_Time_Days')&&!none(R,S,'Standard_Lead_Time_Days'),'M5 a whole column of zeros is real data: not flagged as missing, not reported as "no values"')}
{const R=A.go(build(wb=>{const ws=wb.Sheets.Inventory;cell(ws,'Allocated_Qty',2,{t:'n',v:0});cell(ws,'Allocated_Qty',4,{t:'n',v:0})}));ok(!miss(R,'Inventory','Allocated_Qty'),'M5 zero Allocated_Qty on inventory rows 2 and 4: not flagged')}
{const R=A.go(build(wb=>{cell(wb.Sheets[S],C,2,{t:'b',v:false});cell(wb.Sheets[S],C,3,{t:'s',v:'0'})}));ok(!miss(R,S,C),'M5 FALSE and the text "0" are values: not flagged')}
// ---- text values are not "missing" (they are a different issue: invalid data)
for(const t of ['n/a','TBC','unknown','-']){const R=A.go(build(wb=>cell(wb.Sheets[S],'Standard_Lead_Time_Days',3,{t:'s',v:t})));ok(!miss(R,S,'Standard_Lead_Time_Days')&&!none(R,S,'Standard_Lead_Time_Days'),'M6 the text "'+t+'" in a number column is not reported as missing (a separate invalid-value question, see the blank-quantity investigation)')}
// ---- error cells (#N/A) are dropped by the reader, so they are reported as missing
{const R=A.go(build(wb=>cell(wb.Sheets[S],C,4,{t:'e',v:42,w:'#N/A'})));ok(!!miss(R,S,C)&&miss(R,S,C).ex==='4','M7 an Excel error cell (#N/A) in row 4 reads as blank and is reported as missing (row 4)')}
// ---- entire column blank: header present, no cells below
{const R=A.go(build(wb=>{const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Payment_Terms',r,null)}));const f=none(R,S,'Payment_Terms');ok(!!f&&f.sheet===S&&!miss(R,S,'Payment_Terms'),'M8 header present, every cell empty: "'+(f&&f.msg)+'"')}
// ---- column ABSENT (header removed too) is not reported as blank
{const R=A.go(build(wb=>{const ws=wb.Sheets[S],r=XLSX.utils.decode_range(ws['!ref']),c=colOf(ws,'Payment_Terms');for(let k=r.s.r;k<=r.e.r;k++)delete ws[XLSX.utils.encode_cell({r:k,c})]}));ok(!none(R,S,'Payment_Terms')&&!miss(R,S,'Payment_Terms'),'M9 column removed completely (header and cells): no blank-column finding and no missing-value finding for it')}
// ---- one real value in an otherwise blank column: missing values, not "no values"
{const R=A.go(build(wb=>{const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Payment_Terms',r,r===7?{t:'s',v:'Net 30'}:null)}));const f=miss(R,S,'Payment_Terms');ok(!!f&&!none(R,S,'Payment_Terms')&&f.ex.split(', ').length===6,'M10 one value in a blank column: "Missing values" (examples capped at 6 rows), not "no values"')}
// ---- every sheet
for(const [sh,col] of [['Products','Product_Family'],['Materials','Active_YN'],['BOM','Scrap_Factor_Pct'],['Inventory','Location'],['Suppliers','Country'],['Purchase Orders','PO_Status'],['Production Orders','Production_Line_ID'],['Demand History','Customer_Orders']]){
 const R=A.go(build(wb=>{const ws=wb.Sheets[sh],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,col,r,null)}));const f=none(R,sh,col);ok(!!f&&f.sheet===sh,'M11 '+sh+'.'+col+' entirely blank: reported against sheet "'+sh+'"')
 const R2=A.go(build(wb=>cell(wb.Sheets[sh],col,2,null)));const g=miss(R2,sh,col);ok(!!g&&g.ex==='2','M12 '+sh+'.'+col+' blank in the first data row: reported (row 2)')}
// ---- duplicate header names
{const R=A.go(build(wb=>{const ws=wb.Sheets[S],r=XLSX.utils.decode_range(ws['!ref']);const c=r.e.c+1;ws['!ref']=XLSX.utils.encode_range({s:r.s,e:{r:r.e.r,c:c+1}});ws[XLSX.utils.encode_cell({r:0,c})]={t:'s',v:'Notes'};ws[XLSX.utils.encode_cell({r:0,c:c+1})]={t:'s',v:'Notes'};ws[XLSX.utils.encode_cell({r:2,c})]={t:'s',v:'x'}}));ok(!!miss(R,S,'Notes')&&!!none(R,S,'Notes_1'),'M13 two columns both headed "Notes": the first has one value (missing elsewhere), the second is entirely blank ("Notes_1")')}
// ---- calculations are untouched by the reporting change
const key=R=>JSON.stringify({fg:R.fg.map(x=>[x.id,x.sev,x.act,x.ss,x.rop]),rm:R.rm.map(x=>[x.id,x.sev,x.act,x.ss,x.rop]),sup:R.sup.map(s=>[s.id,s.score,s.cat]),tot:R.tot});
{const R=A.go(build(wb=>{cell(wb.Sheets[S],C,2,null);const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Payment_Terms',r,null)}));ok(key(R)===key(base),'M14 blanks in unused columns: items, risk classes, actions, safety stock, ROP, suppliers and totals are identical to the unedited workbook')}
// ---- screens and export for a combined case: blank in the first row (hidden before), an all-blank column, scattered blanks
{const R=A.go(build(wb=>{cell(wb.Sheets[S],C,2,null);const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Payment_Terms',r,{t:'s',v:'  '});cell(wb.Sheets.Products,'Product_Family',5,{t:'s',v:''})}));
 const dq=strip(A.html('Data quality'));ok(/Missing values in Country/.test(dq)&&/Column Payment_Terms contains no values/.test(dq)&&/Missing values in Product_Family/.test(dq),'S1 Data quality tab lists all three findings');
 ok(/\b3\b[^.]{0,40}Warnings|Warnings/.test(dq)&&R.dq.length===nDQ+3,'S2 the finding count rose by exactly 3 ('+nDQ+' -> '+R.dq.length+')');
 ok(/Sheets affected/.test(dq),'S3 the "Sheets affected" figure is shown ('+(dq.match(/(\d+)\s*Sheets affected/)||[])[1]+')');
 const cq=A.html('Client questions'),sm=A.html('Summary');ok(!/undefined|NaN|\[object/.test(cq+sm+A.html('Data quality')),'S4 Client questions, Summary and Data quality contain no undefined/NaN');
 ok(strip(sm)===strip((A.go(build(()=>{})),A.html('Summary'))),'S5 Summary is unchanged by Medium missing-value findings (it counts only High-severity data issues)');
 A.go(build(wb=>{cell(wb.Sheets[S],C,2,null);const ws=wb.Sheets[S],n=XLSX.utils.decode_range(ws['!ref']).e.r+1;for(let r=2;r<=n;r++)cell(ws,'Payment_Terms',r,{t:'s',v:'  '});cell(wb.Sheets.Products,'Product_Family',5,{t:'s',v:''})}));
 const e=A.exp(),rows=XLSX.utils.sheet_to_json(e.Sheets.ENG_DataQuality),has=m=>rows.some(r=>Object.values(r).some(v=>typeof v==='string'&&v.includes(m)));
 ok(rows.length===nDQ+3&&has('Missing values in Country')&&has('Column Payment_Terms contains no values')&&has('Missing values in Product_Family'),'E1 ENG_DataQuality has every finding ('+rows.length+' rows = engine '+(nDQ+3)+')');
 ok(rows.find(r=>Object.values(r).includes('Missing values in Country'))&&Object.values(rows.find(r=>Object.values(r).includes('Missing values in Country'))).includes('2'),'E2 the export row for the first-row blank carries the example row "2"');
 ok(!/NaN|undefined/.test(JSON.stringify(rows)),'E3 no NaN or undefined in the ENG_DataQuality sheet')}
// ---- existing data-quality findings are untouched on a workbook that has them (Northstar-derived edge cases)
for(const f of ['edge/scenario-dupexact.xlsx','edge/scenario-overrec.xlsx','suppliers/scenario-nopo.xlsx','structure/scenario-willow.xlsx']){const R=A.go(XLSX.readFile(path.join(__dirname,'fixtures',f),{cellDates:true}));ok(R.dq.every(d=>d.sev&&d.msg&&d.sheet!==undefined),'D1 '+f+': every finding is well formed ('+R.dq.length+')')}
console.log(`test-missing-values: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)
