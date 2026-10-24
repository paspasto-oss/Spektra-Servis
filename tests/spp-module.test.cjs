const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {emptyData,validateData}=require('../.build/domain.js');
const {mergeData}=require('../.build/lib/sync-merge.js');

test('SPP HTML contains legally structured form, controlled pressure test and three-page A4 output',()=>{
 const html=fs.readFileSync('public/spp-app.html','utf8');
 for(const value of ['SOPAS','Tlaková skúška','Kontrola','Evidencia','reportTemplate','Východisková','Po rekonštrukcii / oprave','Prevádzková / opakovaná','employerAuthorization','deviceId','technicalParameters','procedureArticle','strengthGaugeResolution','tightGaugeResolution','strengthDrop','tightDrop','tech-sign','customer-sign','@media print','submissionDate','spp-save','§ 16 ods. 2','STN EN 1775:2008','TPP 704 01-R1:2026','Strana ${n} / 3','footer(1)','footer(3)'])assert.ok(html.includes(value),value);
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
