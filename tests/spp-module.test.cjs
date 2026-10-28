const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {emptyData,validateData}=require('../.build/domain.js');
const {mergeData}=require('../.build/lib/sync-merge.js');

test('SPP HTML contains legally structured form, controlled pressure test and optional fourth A4 page',()=>{
 const html=fs.readFileSync('public/spp-app.html','utf8');
 for(const value of ['SOPAS','Tlaková skúška','Kontrola','Databáza','reportTemplate','Východisková','Po rekonštrukcii / oprave','Prevádzková / opakovaná','employerAuthorization','deviceId','technicalParameters','procedureArticle','strengthGaugeResolution','tightGaugeResolution','strengthDrop','tightDrop','tech-sign','customer-sign','@media print','submissionDate','spp-save','§ 16 ods. 2','STN EN 1775:2008','TPP 704 01-R1:2026','Strana ${n} / ${pages}','footer(1)','footer(3)'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('Milan Rajčan'));
 for(const value of ["strengthMinutes:'180'","strengthPressure:'600'","tightMinutes:'180'","tightPressure:'6'"])assert.ok(html.includes(value),value);
 for(const value of ["settings.technician||'Pavol Pastorek'","settings.company||'Spektra Install s.r.o.'","settings.baseAddress||'Hollého 210, Rajec'",'employerName:employerProfile()'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes("strengthStart:'600'"));
 assert.ok(!html.includes("tightStart:'6'"));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});

test('SPP reports validate, survive backup schema and merge by stable id',()=>{
 const now=new Date().toISOString(),customer={id:'c1',createdAt:now,updatedAt:now,name:'Ján Test',company:'',phone:'',email:'',address:'Rajec',notes:'',archived:false};
 const report={id:'r1',createdAt:now,updatedAt:now,reportNo:'RS-2026-0001',customerId:'c1',customerName:'Ján Test',address:'Rajec',inspectionDate:'2026-10-24',state:'draft',payload:'{"strengthStart":"600","strengthEnd":"600"}'};
 const local=emptyData();local.customers=[customer];local.sppReports=[report];
 assert.equal(validateData(local).sppReports[0].reportNo,'RS-2026-0001');
 const remote=structuredClone(local);remote.sppReports[0].state='ready';remote.sppReports[0].updatedAt=new Date(Date.now()+1000).toISOString();
 const base=structuredClone(local),merged=mergeData(base,local,remote);
 assert.equal(merged.conflicts.length,0);assert.equal(merged.data.sppReports[0].state,'ready');
 const broken=structuredClone(local);broken.sppReports[0].payload='not-json';assert.throws(()=>validateData(broken),/SPP/);
});

test('Incomplete drafts survive validation, JSON backup and sync; issued reports still require a customer',()=>{
 const now=new Date().toISOString(),data=emptyData();
 data.sppReports=[{id:'draft1',createdAt:now,updatedAt:now,reportNo:'RS-2026-0001',customerId:'',customerName:'',address:'',inspectionDate:'',state:'draft',payload:'{"scope":"Rozpracované potrubie","state":"draft"}'}];
 const restored=validateData(JSON.parse(JSON.stringify(data)));
 assert.equal(JSON.parse(restored.sppReports[0].payload).scope,'Rozpracované potrubie');
 const merged=mergeData(emptyData(),restored,emptyData());
 assert.equal(merged.conflicts.length,0);assert.equal(merged.data.sppReports[0].id,'draft1');
 data.sppReports[0].state='issued';assert.throws(()=>validateData(data),/SPP/);
 data.sppReports[0].state='draft';data.sppReports[0].reportNo='';assert.throws(()=>validateData(data),/SPP/);
});

test('SPP database combines status and accent-insensitive search and orders by dates or number',()=>{
 const html=fs.readFileSync('public/spp-app.html','utf8');
 const source=html.slice(html.indexOf('function databaseRows('),html.indexOf('\nfunction renderArchive'));
 const select=vm.runInNewContext(source+';databaseRows');
 const rows=[
  {id:'a',reportNo:'RS-2026-2',customerName:'Ján Žilina',address:'Rajec',state:'draft',inspectionDate:'2026-10-28',updatedAt:'2026-10-28T12:00:00Z'},
  {id:'b',reportNo:'RS-2026-10',customerName:'Ján Žilina',address:'Rajec',state:'issued',inspectionDate:'2026-10-20',updatedAt:'2026-10-27T12:00:00Z'},
  {id:'c',reportNo:'RS-2026-1',customerName:'Iný zákazník',address:'Bytča',state:'ready',inspectionDate:'2026-10-29',updatedAt:'2026-10-26T12:00:00Z'}
 ];
 assert.equal(select(rows,'zilina rajec','draft','updated')[0].id,'a');
 assert.equal(select(rows,'zilina','issued','updated')[0].id,'b');
 assert.equal(select(rows,'nenajdene','all','updated').length,0);
 assert.equal(select(rows,'','all','date')[0].id,'c');
 assert.equal(select(rows,'','all','number')[0].id,'b');
 assert.equal(rows[0].id,'a');
});
