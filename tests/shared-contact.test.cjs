const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const fields=['name','company','ico','dic','icDph','phone','email','address'];
const first='2026-01-01T00:00:00Z',last='2026-02-01T00:00:00Z';
async function syncContact(local,remote){
 let workspace={revision:1,customers:[{id:'customer-1',name:'Ján Test',company:'',ico:'',dic:'',icDph:'',phone:'',email:'',address:'',notes:'',archived:false,createdAt:first,updatedAt:first,...local}],devices:[],jobs:[],sppReports:[]},written;
 const meta={owner:'owner-1',enabled:true,base:{customers:[]},remoteRevision:0};
 const sdk={auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'owner-1',email:'test@example.test'}}}})},
 from(table){return table==='customers'?{select:()=>({order:()=>({range:async()=>({data:[{id:'customer-1',name:'Ján Test',created_at:first,updated_at:first,...remote}],error:null})})}),update:payload=>{written=[payload];const query={eq:()=>query,select:()=>query,maybeSingle:async()=>({data:{id:'customer-1',updated_at:payload.updated_at},error:null})};return query;}}:{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};},
 rpc:async()=>({data:1,error:null})};
 const store={load:async()=>structuredClone(workspace),loadSyncMeta:async()=>meta,recoverySnapshot:async()=>{},save:async(_space,data)=>workspace=structuredClone(data)};
 const domain={normalize:s=>s.toLowerCase(),customerPhoneKey:s=>s.replace(/\\D/g,''),validateData:x=>x};
 const merge={equal:(x,y)=>JSON.stringify(x)===JSON.stringify(y),mergeData:(_base,local)=>({data:structuredClone(local),conflicts:[]}),syncPayload:x=>x,initialBase:()=>({})};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../.build/lib/cloud.js'),'utf8'),{
 module,exports:module.exports,require:id=>id.includes('shared-contact')?require('../.build/lib/shared-contact.js'):id.includes('domain')?domain:id.includes('sync-merge')?merge:store,
 window:{supabase:{createClient:()=>sdk}},navigator:{onLine:true},structuredClone,Date,Map,Set,Error,Promise,setTimeout,clearTimeout
 });
 await module.exports.initCloud();await module.exports.synchronize();
 return {contact:workspace.customers[0],written:written?.[0]||remote};
}
test('newer partial contact keeps phone and complete identity from another module',async()=>{
 const complete={phone:'+421900123456',email:'jan@example.test',address:'Rajec 12',company:'Test s.r.o.',ico:'12345678',dic:'2020000000',icDph:'SK2020000000'};
 const {contact,written}=await syncContact(complete,{name:'Ján Test upravený',updated_at:last});
 for(const key of fields.filter(k=>k!=='name'))a.equal(contact[key],complete[key],key);
 a.equal(contact.name,'Ján Test upravený');a.equal(written.phone,complete.phone);a.equal(written.ic_dph,complete.icDph);
});
test('newer local contact receives missing shared details before being uploaded',async()=>{
 const {contact,written}=await syncContact({name:'Ján Test upravený',updatedAt:last},{phone:'+421900123456',email:'jan@example.test',address:'Rajec 12'});
 a.equal(contact.name,'Ján Test upravený');a.equal(contact.phone,'+421900123456');a.equal(written.phone,contact.phone);a.equal(written.email,'jan@example.test');a.equal(written.address,'Rajec 12');
});
test('nonempty newer details win and equal timestamps still fill missing phone',async()=>{
 const changed=await syncContact({phone:'0900111111'},{phone:'0900222222',updated_at:last});
 a.equal(changed.contact.phone,'0900222222');
 const equal=await syncContact({},{phone:'0900333333'});
 a.equal(equal.contact.phone,'0900333333');a.equal(equal.written.phone,'0900333333');
});

test('SPP enriches a matched existing contact without making a duplicate',()=>{
 const html=fs.readFileSync(require.resolve('../Spektra-Servis.html'),'utf8');
 const body=html.slice(html.indexOf('const raw = event.data.report'),html.indexOf('const old = (next.sppReports'));
 a.ok(body.length>0);
 const run=new Function('event','data','domain_js_1',body+'return next.customers;');
 const existing={id:'shared-id',name:'Ján Test',phone:'0900123456',email:'',address:'Rajec 12',updatedAt:first};
 const contacts=run({data:{saveCustomer:true,report:{payload:'{}',customerName:'Ján Test',customer:{name:'Ján Test',phone:'0900123456',email:'jan@example.test'}}}},{customers:[existing]},{
 stamp:()=>({id:'new-id',createdAt:first,updatedAt:first}),
 sameCustomer:(a,b)=>a.name===b.name&&a.phone===b.phone
 });
 a.equal(contacts.length,1);a.equal(contacts[0].id,'shared-id');a.equal(contacts[0].email,'jan@example.test');a.equal(contacts[0].phone,'0900123456');a.equal(contacts[0].address,'Rajec 12');
});
