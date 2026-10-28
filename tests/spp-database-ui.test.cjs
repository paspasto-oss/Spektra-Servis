const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function screen(){const html=fs.readFileSync('public/spp-app.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const header=html.split('<script>')[0],ids=new Map(),fields=[],outputs=new Map(),docEvents={},winEvents={},sent=[],alerts=[];
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
const parent={postMessage(m){sent.push(JSON.parse(JSON.stringify(m)))}},window={addEventListener(k,v){winEvents[k]=v},print(){}},location={origin:'https://spp.test'},crypto={randomUUID:()=> 'report-'+Math.random().toString(36).slice(2)};
new Function('document','window','parent','location','crypto','Image','alert','confirm','Blob','URL','setTimeout',script)(document,window,parent,location,crypto,class{},m=>alerts.push(m),()=>true,class{},{},()=>{});
const deliver=m=>winEvents.message({origin:location.origin,source:parent,data:m});
const el=id=>ids.get(id),field=name=>fields.find(x=>x.dataset.field===name);
return {deliver,el,field,sent,alerts,tabs,docEvents,fields};

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
