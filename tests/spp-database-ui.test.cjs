const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function screen(){const html=fs.readFileSync('public/spp-app.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const header=html.split('<script>')[0],ids=new Map(),fields=[],outputs=new Map(),docEvents={},winEvents={},sent=[],alerts=[],printed=[];
function node(attrs='',tag='input',body=''){
 const at=n=>attrs.match(new RegExp('(?:^|\\s)'+n+'="([^"]*)"'))?.[1]||'';
 const n={id:at('id'),dataset:{},type:at('type'),defaultValue:at('value'),value:at('value'),checked:/ checked/.test(attrs),defaultChecked:/ checked/.test(attrs),hidden:false,disabled:false,innerHTML:'',textContent:'',width:600,height:280,clientWidth:300,listeners:{},classList:{toggle(){}},addEventListener(k,v){this.listeners[k]=v},getContext(){return {clearRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}}},getBoundingClientRect(){return {left:0,top:0,width:300,height:140}},toDataURL(){return 'data:image/png;base64,abc'},setPointerCapture(){},matches(s){return s.includes('[data-field]')&&!!this.dataset.field||s.includes('#customer-select')&&this.id==='customer-select'}};
 for(const m of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g))n.dataset[m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];
 if(tag==='textarea')n.value=n.defaultValue=body;
 if(tag==='select'){const m=body.match(/<option(?: value="([^"]*)")?[^>]*>([^<]*)/);n.value=n.defaultValue=m?(m[1]??m[2]):'';}
 if(n.id)ids.set(n.id,n);if(n.dataset.field)fields.push(n);if(n.dataset.output)outputs.set(n.dataset.output,n);return n;
}
for(const m of header.matchAll(/<(select|textarea)\b([^>]*)>([\s\S]*?)<\/\1>/g))node(m[2],m[1],m[3]);
for(const m of header.matchAll(/<input\b([^>]*)>/g))node(m[1],'input');
for(const m of header.matchAll(/id="([^"]+)"/g))if(!ids.has(m[1])){const n=node();n.id=m[1];ids.set(n.id,n);}
const tabs=[...header.matchAll(/<button\b([^>]*data-tab="[^"]+"[^>]*)>/g)].map(m=>node(m[1],'button'));
for(let i=0;i<8;i++)node('data-field="safe'+i+'"','select','<option>Neoverené</option>');
const views=[...header.matchAll(/<section id="([^"]+)" class="view/g)].map(m=>ids.get(m[1]));
const clears=[node('data-target="tech-sign"','button'),node('data-target="customer-sign"','button')];
const document={querySelector(s){if(s.startsWith('#'))return ids.get(s.slice(1));let m=s.match(/^\[data-(field|output)(?:="([^"]+)"|=([^\]]+))\]$/);if(m)return m[1]==='field'?fields.find(x=>x.dataset.field===(m[2]||m[3])):outputs.get(m[2]||m[3]);throw Error('Selector '+s)},querySelectorAll(s){if(s==='[data-field]')return fields;if(s==='.tabs button')return tabs;if(s==='.view')return views;if(s==='.clear-sign')return clears;throw Error('Selectors '+s)},addEventListener(k,v){docEvents[k]=v},createElement(){return {click(){}}}};
const parent={postMessage(m){sent.push(JSON.parse(JSON.stringify(m)))}},window={addEventListener(k,v){winEvents[k]=v},print(){printed.push(ids.get('printable').innerHTML)}},location={origin:'https://spp.test'},crypto={randomUUID:()=> 'report-'+Math.random().toString(36).slice(2)};
new Function('document','window','parent','location','crypto','Image','alert','confirm','Blob','URL','setTimeout',script)(document,window,parent,location,crypto,class{},m=>alerts.push(m),()=>true,class{},{},()=>{});
const deliver=m=>winEvents.message({origin:location.origin,source:parent,data:m});
const el=id=>ids.get(id),field=name=>fields.find(x=>x.dataset.field===name);
return {deliver,el,field,sent,alerts,tabs,docEvents,fields,printed};

}

test('SPP database opens, saves incomplete drafts and reopens saved fields after reload',()=>{
 const h=screen();h.deliver({type:'spp-state',customers:[],reports:[],settings:{}});
 assert.equal(h.el('archive-count').textContent,'Zobrazené 0 z 0 správ');
 h.el('new').onclick();h.field('scope').value='Rozpracované potrubie';h.docEvents.input({target:h.field('scope')});h.el('save').onclick();
 const request=h.sent.at(-1),report={...request.report,updatedAt:'2026-10-28T12:00:00Z'};
 assert.equal(request.type,'spp-save');assert.equal(report.state,'draft');assert.equal(report.customerName,'');
 h.deliver({type:'spp-state',customers:[],reports:[report],settings:{}});
 h.deliver({type:'spp-saved',id:report.id,customerId:'',updatedAt:report.updatedAt});
 assert.equal(h.el('save').disabled,false);assert.match(h.el('archive-list').innerHTML,/Pokračovať/);
 h.field('scope').value='Ďalšia úprava';h.docEvents.input({target:h.field('scope')});
 h.deliver({type:'spp-state',customers:[],reports:[report],settings:{}});
 assert.equal(h.field('scope').value,'Ďalšia úprava');
 h.field('state').value='issued';h.el('save').onclick();assert.equal(h.alerts.length,1);
 const next=screen();next.deliver({type:'spp-state',customers:[],reports:[report],settings:{}});
 next.el('archive-list').onclick({target:{closest:()=>({dataset:{open:report.id}})}});
 assert.equal(next.field('scope').value,'Rozpracované potrubie');
 next.el('save').onclick();assert.equal(next.sent.at(-1).expectedUpdatedAt,report.updatedAt);
});

function change(h,key,value){const el=h.field(key);if(el.type==='checkbox')el.checked=value;else el.value=value;el.listeners.input?.();h.docEvents.input({target:el});}
function start(){const h=screen();h.deliver({type:'spp-state',customers:[],reports:[],settings:{}});h.el('new').onclick();return h;}
test('New SPP pressure plan fills only targets and follows volume without inventing measurements',()=>{
 const h=start();assert.equal(h.field('strengthPressure').value,'');assert.equal(h.field('tightPressure').value,'');
 change(h,'mop','2');change(h,'operatingPressure','2');change(h,'volume','50');
 assert.equal(h.field('strengthPressure').value,'5');assert.equal(h.field('tightPressure').value,'2');assert.equal(h.field('strengthMinutes').value,'15');assert.equal(h.field('settlingMinutes').value,'15');
 assert.equal(h.field('strengthStart').value,'');assert.equal(h.field('strengthAssessment').value,'');assert.equal(h.field('pressureBasisConfirmed').checked,false);
 change(h,'volume','51');assert.equal(h.field('strengthMinutes').value,'30');
 change(h,'volume','');assert.equal(h.field('strengthMinutes').value,'');
 change(h,'volume','50');change(h,'pressureMode','combined');assert.equal(h.field('tightPressure').value,'5');
 change(h,'strengthStart','5.001');assert.equal(h.field('tightStart').value,'5.001');assert.equal(h.field('tightEnd').value,'');
});
test('Recorded tests are not overwritten by preset and copied reports require fresh evidence',()=>{
 const h=start();change(h,'mop','2');change(h,'operatingPressure','2');change(h,'volume','50');change(h,'strengthStart','5');change(h,'strengthEnd','5');
 h.el('apply-pressure-preset').onclick();assert.match(h.alerts.at(-1),/už zaznamenanú/);assert.equal(h.field('strengthStart').value,'5');
 h.field('pressureBasisConfirmed').checked=true;h.el('duplicate').onclick();assert.equal(h.field('strengthStart').value,'');assert.equal(h.field('strengthEnd').value,'');assert.equal(h.field('pressureBasisConfirmed').checked,false);
});
test('Legacy reports preserve saved 600/6 kPa and 180-minute measurements on load',()=>{
 const h=screen(),report={id:'legacy',reportNo:'RS-2026-7',inspectionDate:'2026-11-01',state:'draft',updatedAt:'2026-11-01T12:00:00Z',payload:JSON.stringify({strengthPressure:'600',tightPressure:'6',strengthMinutes:'180',tightMinutes:'180',strengthStart:'600',strengthEnd:'600'})};
 h.deliver({type:'spp-state',customers:[],reports:[report],settings:{}});h.el('archive-list').onclick({target:{closest:()=>({dataset:{open:'legacy'}})}});
 assert.equal(h.field('strengthPressure').value,'600');assert.equal(h.field('tightPressure').value,'6');assert.equal(h.field('strengthMinutes').value,'180');assert.equal(h.field('strengthStart').value,'600');assert.equal(h.field('pressurePreset').value,'manual');assert.equal(h.field('pressureMode').value,'');
 h.el('save').onclick();const saved=JSON.parse(h.sent.at(-1).report.payload);assert.equal(saved.strengthStart,'600');
});
test('Draft print requires a complete pressure test and exposes the missing fields',()=>{
 const h=start();change(h,'customerName','Test');change(h,'scope','Testovací úsek');h.el('print').onclick();
 assert.match(h.alerts.at(-1),/PDF nemožno vytvoriť/);assert.match(h.el('check-list').innerHTML,/skutočne namerané tlaky/);assert.match(h.el('printable').innerHTML,/PRACOVNÝ NÁHĽAD/);
});

test('New copper d22 reports have construction descriptions but no fabricated inspection evidence',()=>{
 const h=start();
 for(const key of ['scope','deviceId','technicalParameters','dimensions'])assert.match(h.field(key).value,/d22/);
 assert.match(h.field('technicalParameters').value,/22 mm/);
 assert.match(h.field('technicalParameters').value,/lisované spoje/);
 assert.equal(h.field('testedSection').value,h.field('scope').value);
 for(const key of ['pipeLength','volume','valveCount','operatingPressure','measuredPressure','mop','valves','instruments','documents','findings','group','conclusion','defectStatus','shutdownRequired','strengthGauge','strengthStart','strengthEnd','strengthAssessment','tightStart','tightEnd','tightAssessment'])assert.equal(h.field(key).value,'',key);
 assert.equal(h.field('pressureBasisConfirmed').checked,false);
 h.el('save').onclick();
 const saved=JSON.parse(h.sent.at(-1).report.payload);
 assert.equal(saved.dimensions,h.field('dimensions').value);
});

test('Copper template fills only empty draft fields and preserves recorded measurements and descriptions',()=>{
 const h=screen(),report={id:'copper-draft',reportNo:'RS-2026-25',inspectionDate:'2026-11-09',state:'draft',updatedAt:'2026-11-09T12:00:00Z',payload:JSON.stringify({scope:'Od plynomera po kotol',deviceId:'Vetva kotolne',technicalParameters:'Vlastný opis Cu d22',dimensions:'   ',strengthPressure:'6',strengthStart:'6',strengthEnd:'6',strengthAssessment:'Vyhovela',pressureBasisConfirmed:true})};
 h.deliver({type:'spp-state',customers:[],reports:[report],settings:{}});
 h.el('archive-list').onclick({target:{closest:()=>({dataset:{open:report.id}})}});
 assert.equal(h.field('dimensions').value,'   ','loading must not apply the template');
 h.el('apply-copper-template').onclick();
 assert.match(h.field('dimensions').value,/Cu d22/);
 assert.equal(h.field('scope').value,'Od plynomera po kotol');
 assert.equal(h.field('testedSection').value,'Od plynomera po kotol');
 assert.equal(h.field('deviceId').value,'Vetva kotolne');
 assert.equal(h.field('technicalParameters').value,'Vlastný opis Cu d22');
 assert.equal(h.field('strengthPressure').value,'6');
 assert.equal(h.field('strengthStart').value,'6');
 assert.equal(h.field('strengthEnd').value,'6');
 assert.equal(h.field('strengthAssessment').value,'Vyhovela');
 assert.equal(h.field('pressureBasisConfirmed').checked,false);
 assert.equal(h.sent.at(-1).dirty,true);
 h.field('pressureBasisConfirmed').checked=true;
 h.el('apply-copper-template').onclick();
 assert.equal(h.field('pressureBasisConfirmed').checked,true,'repeated application without changes is a no-op');
 assert.match(h.el('copper-template-status').textContent,/Žiadny údaj sa nezmenil/);
 h.el('save').onclick();
 assert.match(JSON.parse(h.sent.at(-1).report.payload).dimensions,/Cu d22/);
});

test('Copper template cannot change a reviewed or issued report',()=>{
 for(const state of ['ready','issued']){
  const h=start();h.field('state').value=state;h.field('dimensions').value='';
  h.el('apply-copper-template').onclick();
  assert.equal(h.field('dimensions').value,'');
  assert.match(h.alerts.at(-1),/iba do rozpracovanej/);
 }
});


test('Explicit Cu d22 example creates a separate marked draft with illustrative observations',()=>{
 const h=start();change(h,'customerName','Skutočný zákazník');h.el('save').onclick();
 const original=h.sent.at(-1).report;
 h.deliver({type:'spp-state',customers:[],reports:[original],settings:{}});
 h.deliver({type:'spp-saved',id:original.id,customerId:'',updatedAt:original.updatedAt});
 h.el('new-copper-example').onclick();
 assert.equal(h.field('exampleMode').checked,true);
 assert.equal(h.el('example-notice').hidden,false);
 assert.equal(h.field('state').disabled,true);
 assert.match(h.field('reportNo').value,/^VZOR-RS-/);
 assert.equal(h.field('strengthStart').value,'5.000');
 assert.equal(h.field('tightStart').value,'2.000');
 assert.equal(h.field('pressureBasisConfirmed').checked,false);
 assert.equal(h.field('tppApplicability').value,'');
 assert.match(h.field('technician').value,/VZOR/);
 assert.equal(h.field('saveCustomer').checked,false);
 h.el('save').onclick();
 const saved=h.sent.at(-1);
 assert.equal(saved.saveCustomer,false);assert.notEqual(saved.report.id,original.id);
 assert.equal(original.customerName,'Skutočný zákazník');
 assert.equal(JSON.parse(saved.report.payload).exampleMode,true);
 const reopened=screen();reopened.deliver({type:'spp-state',customers:[],reports:[saved.report],settings:{}});
 reopened.el('archive-list').onclick({target:{closest:()=>({dataset:{open:saved.report.id}})}});
 assert.equal(reopened.field('exampleMode').checked,true);
 assert.equal(reopened.field('state').disabled,true);
 reopened.el('print').onclick();
 assert.equal(reopened.printed.length,1);
 assert.equal((reopened.printed[0].match(/VZOR – MODELOVÉ ÚDAJE – NEJDE O VYKONANÚ REVÍZIU/g)||[]).length,4);
 assert.match(reopened.printed[0],/TPP 2026/);
});

test('Example cannot be issued or enter contacts; copies retain provenance and a new real report is clean',()=>{
 const h=start();h.el('new-copper-example').onclick();
 h.field('state').value='issued';h.el('save').onclick();
 assert.equal(h.sent.filter(m=>m.type==='spp-save').length,0);
 assert.match(h.el('check-list').innerHTML,/VZOR obsahuje modelové/);
 h.field('state').value='draft';h.field('saveCustomer').checked=true;h.el('save').onclick();
 const saved=h.sent.at(-1);assert.equal(saved.saveCustomer,false);
 h.deliver({type:'spp-saved',id:saved.report.id,customerId:'',updatedAt:saved.report.updatedAt});
 h.el('duplicate').onclick();
 assert.equal(h.field('exampleMode').checked,true);assert.match(h.field('reportNo').value,/^VZOR-/);
 assert.equal(h.field('strengthStart').value,'');assert.equal(h.field('conclusion').value,'');
 h.el('print').onclick();assert.match(h.printed.at(-1),/VZOR – MODELOVÉ ÚDAJE/);
 h.el('new').onclick();
 assert.equal(h.field('exampleMode').checked,false);assert.equal(h.el('example-notice').hidden,true);
 assert.equal(h.field('state').disabled,false);assert.equal(h.field('saveCustomer').disabled,false);
 assert.equal(h.field('customerName').value,'');assert.equal(h.field('strengthStart').value,'');
 h.el('print').onclick();assert.match(h.alerts.at(-1),/PDF nemožno vytvoriť/);
 assert.equal(h.printed.length,1,'an ordinary incomplete report still cannot print');
});

test('SPP remembers setup once and new reports reuse it without readings or approvals',()=>{
 const h=start();change(h,'strengthGauge','Manometer 123');change(h,'strengthCalibration','Doklad 2026-01');change(h,'procedureArticle','Overený článok RT');change(h,'mop','2');change(h,'operatingPressure','2');change(h,'volume','6.3');change(h,'strengthStart','5');
 h.field('pressureBasisConfirmed').checked=true;h.el('save-profile').onclick();
 const request=h.sent.at(-1);assert.equal(request.type,'spp-save-profile');assert.equal(request.expectedProfile,'null');
 assert.equal(request.values.strengthGauge,'Manometer 123');assert.equal(request.values.strengthStart,undefined);assert.equal(request.values.volume,undefined);assert.equal(request.values.pressureBasisConfirmed,undefined);
 const profile={version:1,values:request.values};h.deliver({type:'spp-profile-saved',profile});
 assert.equal(h.el('save-profile').disabled,false);h.el('new').onclick();
 assert.equal(h.field('strengthGauge').value,'Manometer 123');assert.equal(h.field('procedureArticle').value,'Overený článok RT');assert.equal(h.field('mop').value,'2');
 assert.equal(h.field('strengthStart').value,'');assert.equal(h.field('volume').value,'');assert.equal(h.field('pressureBasisConfirmed').checked,false);
 const next=screen();next.deliver({type:'spp-state',customers:[],reports:[],settings:{sppProfile:profile}});next.el('new').onclick();
 assert.equal(next.field('strengthGauge').value,'Manometer 123');
 change(next,'strengthGauge','Vlastné meradlo');next.deliver({type:'spp-state',customers:[],reports:[],settings:{sppProfile:{version:1,values:{strengthGauge:'Iné'}}}});
 assert.equal(next.field('strengthGauge').value,'Vlastné meradlo','background sync must not overwrite an open report');
 next.el('apply-profile').onclick();assert.equal(next.field('strengthGauge').value,'Vlastné meradlo');
 next.el('new-copper-example').onclick();next.el('save-profile').onclick();assert.match(next.alerts.at(-1),/Modelové údaje/);
});

test('Equal-pressure shortcut requires actual start and explicit action; generated text follows readings',()=>{
 const h=start();h.el('same-strength').onclick();assert.equal(h.field('strengthEnd').value,'');
 change(h,'strengthPressure','5');h.el('same-strength').onclick();assert.equal(h.field('strengthEnd').value,'','a target is never a measurement');
 change(h,'strengthStart','5.01');assert.equal(h.field('strengthEnd').value,'');h.el('same-strength').onclick();assert.equal(h.field('strengthEnd').value,'5.01');
 assert.equal(h.field('strengthAssessment').value,'');assert.equal(h.field('pressureBasisConfirmed').checked,false);
 change(h,'tightStart','2.02');h.el('same-tight').onclick();h.el('next-output').onclick();
 assert.match(h.field('pressureResult').value,/5.01 → 5.01/);assert.match(h.field('findings').value,/2.02 → 2.02/);
 change(h,'tightEnd','2.01');assert.match(h.field('pressureResult').value,/pokles 0.010/);
 change(h,'findings','Môj vlastný zápis');change(h,'tightEnd','2.00');assert.equal(h.field('findings').value,'Môj vlastný zápis');
 change(h,'state','issued');const previous=h.field('strengthEnd').value;change(h,'strengthStart','5.2');h.el('same-strength').onclick();assert.equal(h.field('strengthEnd').value,previous);
});

test('Profile save failures allow retry and do not change the active report',()=>{
 const h=start();change(h,'strengthGauge','Prístroj');h.el('save-profile').onclick();h.deliver({type:'spp-profile-error',message:'Skúste znova'});
 assert.equal(h.el('save-profile').disabled,false);assert.equal(h.field('strengthGauge').value,'Prístroj');
 h.el('save-profile').onclick();assert.equal(h.sent.at(-1).type,'spp-save-profile');
});

test('A new report reuses the customer address as inspection place until manually changed',()=>{
 const h=start();change(h,'street','Ulica 12');change(h,'city','Rajec');
 assert.equal(h.field('inspectionPlace').value,'Ulica 12, Rajec');
 change(h,'inspectionPlace','Iný objekt');change(h,'city','Žilina');assert.equal(h.field('inspectionPlace').value,'Iný objekt');
});
