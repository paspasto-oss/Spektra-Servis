const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('public/spp-app.html','utf8');
const source=html.slice(html.indexOf('function pressurePlan('),html.indexOf('function calculate('));
const num=v=>v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
const api=vm.runInNewContext(source+';({pressurePlan,pressureIssues,clearPressureEvidence})',{num});
const base={mop:'2',operatingPressure:'2',volume:'50',pressureMode:'separate',reportTemplate:'initial'};
function completed(overrides={}){return {...base,pressurePreset:'ntl',...api.pressurePlan(base).values,pressureBasisConfirmed:true,strengthStart:'5',strengthEnd:'5',tightStart:'2',tightEnd:'2',strengthStartTime:'09:00',strengthEndTime:'09:15',tightStartTime:'09:30',tightEndTime:'09:45',strengthDeformation:'none',strengthAssessment:'Vyhovela',tightAssessment:'Vyhovela',...overrides};}

test('NTL working preset distinguishes separate and joint tests and the 50-l boundary',()=>{
 const p=api.pressurePlan(base).values;
 assert.equal(p.strengthPressure,'5');assert.equal(p.tightPressure,'2');assert.equal(p.settlingMinutes,'15');assert.equal(p.strengthMinutes,'15');
 assert.equal(api.pressurePlan({...base,volume:'50.1'}).values.strengthMinutes,'30');
 assert.equal(api.pressurePlan({...base,volume:'300'}).values.tightMinutes,'30');
 assert.equal(api.pressurePlan({...base,mop:'2.1',operatingPressure:'2.1'}).values.strengthPressure,'5.25');
 const joint=api.pressurePlan({...base,pressureMode:'combined'}).values;assert.equal(joint.tightPressure,'5');
 assert.ok(!('strengthStart' in p));assert.ok(!('strengthAssessment' in p));
});
test('Missing values, unsupported scope and periodic inspections never generate an assumed test plan',()=>{
 for(const change of [{mop:''},{volume:''},{mop:'NaN'},{volume:'0'},{volume:'300.1'},{mop:'5.01'},{operatingPressure:'3'},{pressureMode:''},{maxAppliancePower:'50'},{reportTemplate:'operational'}]){
  const result=api.pressurePlan({...base,...change});assert.equal(result.values,null,JSON.stringify(change));assert.ok(result.errors.length);
 }
});
test('Issuing requires recorded pressures, duration, RT confirmation and deformation assessment',()=>{
 assert.deepEqual(Array.from(api.pressureIssues(completed())),[]);
 for(const change of [{pressureBasisConfirmed:false},{strengthDeformation:''},{strengthDeformation:'found'},{strengthStart:''},{tightStart:'0',tightEnd:'0'},{tightStart:'2',tightEnd:'1.99'},{strengthEnd:'5.01'},{strengthMinutes:'10'},{settlingMinutes:'10'},{strengthPressure:'600'},{strengthEndTime:'09:14'},{pressureMode:''}])assert.ok(api.pressureIssues(completed(change)).length,JSON.stringify(change));
 assert.deepEqual(Array.from(api.pressureIssues(completed({strengthStartTime:'23:55',strengthEndTime:'00:10'}))),[]);
});
test('Joint tests reject inconsistent observations and instruments',()=>{
 const joint=completed({pressureMode:'combined',tightPressure:'5',tightStart:'5',tightEnd:'5',tightStartTime:'09:00',tightEndTime:'09:15',strengthGauge:'Gauge A',tightGauge:'Gauge A'});
 assert.deepEqual(Array.from(api.pressureIssues(joint)),[]);
 for(const change of [{tightPressure:'2'},{tightStartTime:'09:30'},{tightMinutes:'30'},{tightGauge:'Gauge B'}])assert.ok(api.pressureIssues({...joint,...change}).some(s=>s.includes('Spoločná skúška')));
});
test('Low-pressure tightness uses the 15 kPa ceiling in EN 1775 6.6.2, not 150 percent of MOP',()=>{
 for(const pressure of ['3.01','6','15'])assert.deepEqual(Array.from(api.pressureIssues(completed({tightPressure:pressure,tightStart:pressure,tightEnd:pressure}))),[],pressure);
 for(const pressure of ['1.99','15.01'])assert.ok(api.pressureIssues(completed({tightPressure:pressure,tightStart:pressure,tightEnd:pressure})).some(x=>x.includes('6.6.2')),pressure);
 const joint=completed({pressureMode:'combined',strengthPressure:'5',tightPressure:'15.01',tightStart:'15.01',tightEnd:'15.01'});
 assert.ok(api.pressureIssues(joint).some(x=>x.includes('6.6.2')));
});
test('A copy clears evidence and confirmations while preserving reusable equipment and targets',()=>{
 const d=completed({strengthGauge:'Gauge A',procedureArticle:'RT reference',tempStart:'20',safe0:'Potvrdené'});api.clearPressureEvidence(d);
 assert.equal(d.strengthStart,'');assert.equal(d.tightAssessment,'');assert.equal(d.tempStart,'');assert.equal(d.safe0,'Neoverené');assert.equal(d.pressureBasisConfirmed,false);assert.equal(d.strengthPressure,'5');assert.equal(d.strengthGauge,'Gauge A');assert.equal(d.procedureArticle,'RT reference');
});
test('Every saved field has one input and the script parses',()=>{
 const fields=[...html.split('<script>')[0].matchAll(/data-field="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(fields).size,fields.length);
 assert.doesNotThrow(()=>new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]));
 
});
