const {test}=require('node:test');const a=require('node:assert/strict');require('fake-indexeddb/auto');
const {demoData}=require('../.build/demo.js');const {emptyData}=require('../.build/domain.js');const store=require('../.build/lib/store.js');
Object.defineProperty(global,'navigator',{value:{onLine:true},configurable:true});
let sessionUser={id:'owner-1',email:'owner@example.test'},row=null,customerRows=[],casReject=false,networkError=false,race=null,authChange;
let customerWrites=0,customerRace=null;
function customerWrite(payload){
 const filters={};const query={eq:(k,v)=>{filters[k]=v;return query;},select:()=>query,maybeSingle:async()=>{
  if(customerRace){const race=customerRace;customerRace=null;race();}
  const id=filters.id||payload.id,index=customerRows.findIndex(x=>x.id===id);
  if(filters.updated_at&&customerRows[index]?.updated_at!==filters.updated_at)return {data:null,error:null};
  customerWrites++;const row={...(customerRows[index]||{}),...structuredClone(payload),id};
  if(index<0)customerRows.push(row);else customerRows[index]=row;
  return {data:{id,updated_at:row.updated_at},error:null};
 }};return query;
}
const sdk={auth:{onAuthStateChange:fn=>{authChange=fn},getSession:async()=>({data:{session:{user:sessionUser}}}),signInWithPassword:async()=>({data:{user:sessionUser}}),signOut:async()=>authChange('SIGNED_OUT',null)},from:table=>table==='customers'?({select:()=>({order:()=>({range:async()=>({data:structuredClone(customerRows),error:null})})}),update:payload=>customerWrite(payload),insert:payload=>customerWrite(payload)}):({select:()=>({eq:()=>({maybeSingle:async()=>({data:row?structuredClone(row):null,error:networkError?new Error():null})})})}),rpc:async(_name,args)=>{
 if(casReject)return {data:0};if(args.expected_revision!==(row?.revision||0))return {data:0};row={payload:structuredClone(args.new_payload),revision:(row?.revision||0)+1};if(race){const r=race;race=null;await r();}return {data:row.revision};}};
global.window={supabase:{createClient:()=>sdk}};
const cloud=require('../.build/lib/cloud.js');
test('real IndexedDB: initial union, offline queue, CAS retry, conflict and account isolation',async()=>{
 let local=demoData();local=await store.save('real',local,0);await cloud.initCloud();a.equal(cloud.cloudState.enabled,false);
 await cloud.enableCloud();a.ok(await store.loadRecovery());await cloud.synchronize();a.equal(row.payload.jobs.length,3);
 let meta=await store.loadSyncMeta();a.equal(meta.remoteRevision,row.revision);
 const written=customerWrites;await cloud.synchronize();a.equal(customerWrites,written,'unchanged polling must not rewrite the directory');
 // A different agenda writes while the local contact is being sent.
 local=await store.load('real');local.customers[0].phone='0900111222';local.customers[0].updatedAt=new Date().toISOString();await store.save('real',local,local.revision);
 customerRace=()=>{customerRows[0].email='other-agenda@example.test';customerRows[0].updated_at='2027-01-01T00:00:00Z';};
 await a.rejects(()=>cloud.synchronize(),/Adresár/);
 a.equal((await store.load('real')).customers[0].phone,'0900111222');
 await cloud.synchronize();local=await store.load('real');
 a.equal(local.customers[0].phone,'0900111222');a.equal(local.customers[0].email,'other-agenda@example.test');
 // Two local copies resolve to the same shared contact; preserve every link.
 local=await store.load('real');const canonical=local.customers[0];
 const duplicate={...canonical,id:crypto.randomUUID(),notes:'duplicate note'};
 local.customers.push(duplicate);local.jobs[0].customerId=duplicate.id;
 local.devices[0].customerId=duplicate.id;
 await store.save('real',local,local.revision);await cloud.synchronize();
 local=await store.load('real');
 a.equal(local.customers.filter(x=>x.id===canonical.id).length,1);
 a.ok(!local.customers.some(x=>x.id===duplicate.id));
 a.equal(local.jobs[0].customerId,canonical.id);a.equal(local.devices[0].customerId,canonical.id);
 a.ok(local.customers.find(x=>x.id===canonical.id).notes.includes('duplicate note'));
 // A remote device updates one field while the local device is offline.
 row.payload.jobs[0].resolution='from PC';row.revision++;
 navigator.onLine=false;local=await store.load('real');local.jobs[0].issue='offline mobile';await store.save('real',local,local.revision);a.equal(await cloud.synchronize(),undefined);
 navigator.onLine=true;await cloud.synchronize();a.equal(row.payload.jobs[0].resolution,'from PC');a.equal(row.payload.jobs[0].issue,'offline mobile');
 // A server compare-and-swap refusal leaves the local revision and baseline unchanged.
 local=await store.load('real');local.jobs[0].address='new address';await store.save('real',local,local.revision);meta=await store.loadSyncMeta();casReject=true;await cloud.synchronize();a.deepEqual(await store.loadSyncMeta(),meta);casReject=false;await cloud.synchronize();a.equal(row.payload.jobs[0].address,'new address');
 // Another tab saves while upload is in-flight: cloud succeeds but local CAS fails, retry preserves both.
 local=await store.load('real');local.jobs[0].issue='before race';await store.save('real',local,local.revision);
 race=async()=>{const newer=await store.load('real');newer.jobs[0].resolution='another tab';await store.save('real',newer,newer.revision);};
 await a.rejects(()=>cloud.synchronize(),/iná karta/);await cloud.synchronize();a.equal(row.payload.jobs[0].resolution,'another tab');a.equal(row.payload.jobs[0].issue,'before race');
 // Conflict blocks writes; explicit resolution merges unrelated changes.
 local=await store.load('real');local.jobs[0].issue='mobile version';await store.save('real',local,local.revision);row.payload.jobs[0].issue='PC version';row.revision++;const previous=structuredClone(row);
 await cloud.synchronize();a.ok(cloud.cloudState.conflicts.length);a.deepEqual(row,previous);await cloud.synchronize('remote');a.equal((await store.load('real')).jobs[0].issue,'PC version');
 networkError=true;await a.rejects(()=>cloud.synchronize(),/Cloud/);networkError=false;
 await cloud.logoutCloud();sessionUser={id:'other-user',email:'other@example.test'};await a.rejects(()=>cloud.loginCloud('other','password'),/iným účtom/);a.equal(cloud.cloudUser(),'');a.equal((await store.loadSyncMeta()).owner,'owner-1');
});
