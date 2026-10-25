import type { SupabaseClient, User } from '@supabase/supabase-js';
import { validateData, normalize, customerPhoneKey, type Data } from '../domain.js';
import { equal, mergeData, syncPayload, initialBase, type ConflictChoice } from './sync-merge.js';
import { load, save, loadSyncMeta, recoverySnapshot, type SyncMeta } from './store.js';
declare global { interface Window { supabase?:typeof import('@supabase/supabase-js') } }
let client:SupabaseClient|undefined, pending:Promise<SupabaseClient>|undefined;
let user:User|null=null;
export const cloudState={email:'',enabled:false,status:'Synchronizácia nie je pripojená',conflicts:[] as string[]};
export function cloudUser():string{return user?.id||'';}
async function sdk():Promise<SupabaseClient>{
 if(client)return client;if(pending)return pending;
 pending=(async()=>{
 if(!window.supabase)await new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/supabase.js';const t=setTimeout(()=>reject(Error('Prihlásenie sa nenačítalo. Skúste znova online.')),20000);s.onload=()=>{clearTimeout(t);resolve();};s.onerror=()=>{clearTimeout(t);reject(Error('Prihlásenie sa nenačítalo.'));};document.head.append(s);});
 if(!window.supabase)throw Error('Knižnica prihlásenia nie je dostupná.');
 client=window.supabase.createClient('https://rrakzoicawqbcpnzavet.supabase.co','sb_publishable_ZZOAMeOcSHS6IGghKIu1lA_xss5sJzK',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'spektra-servis-auth'},global:{fetch:(url,init)=>fetch(url,{...init,signal:init?.signal||AbortSignal.timeout(20000)})}});
 client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;cloudState.email=user?.email||'';if(!user)cloudState.enabled=false;});
 return client;})();try{return await pending;}finally{pending=undefined;}
}
export async function initCloud():Promise<void>{const c=await sdk();const {data}=await c.auth.getSession();user=data.session?.user||null;cloudState.email=user?.email||'';const m=await loadSyncMeta();cloudState.enabled=!!user&&m?.owner===user.id&&m.enabled;cloudState.status=cloudState.enabled?'Čaká na synchronizáciu':user?'Zapnite synchronizáciu tohto zariadenia':'Prihláste sa účtom Cenových ponúk';}
export async function loginCloud(email:string,password:string):Promise<void>{const c=await sdk();const {data,error}=await c.auth.signInWithPassword({email,password});if(error||!data.user)throw Error('Prihlásenie sa nepodarilo. Použite e-mail a heslo z Cenových ponúk.');user=data.user;cloudState.email=user.email||'';const m=await loadSyncMeta();if(m&&m.owner!==user.id){await c.auth.signOut({scope:'local'});user=null;throw Error('Toto zariadenie je prepojené s iným účtom. Prihláste sa pôvodným účtom; miestne údaje neboli prenesené.');}cloudState.enabled=!!m?.enabled;cloudState.status=cloudState.enabled?'Čaká na synchronizáciu':'Prihlásené; zapnite synchronizáciu zariadenia';}
export async function logoutCloud():Promise<void>{await (await sdk()).auth.signOut({scope:'local'});user=null;cloudState.email='';cloudState.enabled=false;cloudState.status='Odhlásené · údaje zostávajú v zariadení';}
export async function enableCloud():Promise<Data>{if(!user)throw Error('Najskôr sa prihláste.');const local=await load('real'),m=await loadSyncMeta();if(m&&m.owner!==user.id)throw Error('Zariadenie patrí inému účtu.');if(!m)await recoverySnapshot(local);const result=await save('real',local,local.revision,{owner:user.id,base:m?.base||initialBase(),remoteRevision:m?.remoteRevision||0,enabled:true});cloudState.enabled=true;return result;}

function contactKeys(c:{name:string;company:string;phone:string;email:string;address:string}):string[]{
 const keys:string[]=[];const name=normalize(c.name||c.company||''),phone=customerPhoneKey(c.phone||''),email=(c.email||'').trim().toLowerCase(),address=normalize(c.address||'');
 if(name&&phone.length>=7)keys.push('np:'+name+'|'+phone);if(name&&email.includes('@'))keys.push('ne:'+name+'|'+email);
 if(name&&!phone&&!email&&address)keys.push('na:'+name+'|'+address);
 return keys;
}
async function reconcileSharedCustomers(input:Data):Promise<Data>{
 if(!user)return input;const c=await sdk();
 const {data:rows,error}=await c.from('customers').select('id,name,company,ico,dic,ic_dph,phone,email,address,notes,archived,created_at,updated_at');
 if(error)throw Error('Spoločný adresár sa nepodarilo načítať. Miestne údaje zostali zachované.');
 const next=structuredClone(input),byKey=new Map<string,any>();
 for(const row of rows||[])for(const key of contactKeys({name:row.name||'',company:row.company||'',phone:row.phone||'',email:row.email||'',address:row.address||''}))if(!byKey.has(key))byKey.set(key,row);

 for(const local of [...next.customers]){
  const remote=(rows||[]).find((row:any)=>row.id===local.id)||contactKeys(local).map(key=>byKey.get(key)).find(Boolean);
  if(remote&&remote.id!==local.id){
   for(const d of next.devices)if(d.customerId===local.id)d.customerId=remote.id;
   for(const j of next.jobs)if(j.customerId===local.id)j.customerId=remote.id;
   for(const report of next.sppReports||[])if(report.customerId===local.id)report.customerId=remote.id;
   local.id=remote.id;
  }
  if(remote&&Date.parse(remote.updated_at||'')>Date.parse(local.updatedAt||''))Object.assign(local,{name:remote.name||'',company:remote.company||'',ico:remote.ico||'',dic:remote.dic||'',icDph:remote.ic_dph||'',phone:remote.phone||'',email:remote.email||'',address:remote.address||'',notes:remote.notes||'',archived:!!remote.archived,createdAt:remote.created_at||local.createdAt,updatedAt:remote.updated_at||local.updatedAt});

 }
 for(const remote of rows||[])if(!next.customers.some(x=>x.id===remote.id))next.customers.push({id:remote.id,name:remote.name||'',company:remote.company||'',ico:remote.ico||'',dic:remote.dic||'',icDph:remote.ic_dph||'',phone:remote.phone||'',email:remote.email||'',address:remote.address||'',notes:remote.notes||'',archived:!!remote.archived,createdAt:remote.created_at||new Date().toISOString(),updatedAt:remote.updated_at||new Date().toISOString()});
 // Several local contacts may resolve to the same shared customer ID.
 // Collapse them before UPSERT and before saving the synchronized workspace.
 const unique=new Map<string,Data['customers'][number]>();
 for(const contact of next.customers){
  const previous=unique.get(contact.id);
  if(!previous){unique.set(contact.id,contact);continue;}
  const newer=Date.parse(contact.updatedAt)>Date.parse(previous.updatedAt)?contact:previous;
  const older=newer===contact?previous:contact;
  const merged={...older,...newer};
  for(const key of ['name','company','ico','dic','icDph','phone','email','address'] as const)if(!merged[key])merged[key]=older[key]||'';
  merged.notes=[...new Set([older.notes,newer.notes].filter(Boolean))].join('\n');
  merged.createdAt=older.createdAt<newer.createdAt?older.createdAt:newer.createdAt;
  unique.set(contact.id,merged);
 }
 next.customers=[...unique.values()];
 const payload=next.customers.map(x=>({id:x.id,name:x.name||x.company||'Bez mena',company:x.company||null,ico:x.ico||null,dic:x.dic||null,ic_dph:x.icDph||null,phone:x.phone||null,email:x.email||null,address:x.address||null,notes:x.notes||null,archived:x.archived,created_at:x.createdAt,updated_at:x.updatedAt,updated_by:user!.id,source_app:'servis'}));
 if(payload.length){const written=await c.from('customers').upsert(payload,{onConflict:'id'});if(written.error)throw Error('Spoločný adresár sa nepodarilo uložiť. Miestne údaje zostali zachované.');}
 return next;
}
/** Persist remote baseline and local result in ONE transaction: crash/retry cannot lose pending edits. */
export async function synchronize(choice?:ConflictChoice):Promise<Data|undefined>{
 if(!cloudState.enabled||!user)return;
 if(!navigator.onLine){cloudState.status='Offline · zmeny čakajú v zariadení';return;}
 const owner=user.id,c=await sdk();
 const meta=await loadSyncMeta();if(!meta||meta.owner!==owner||!meta.enabled)return;
 const local=await load('real');
 cloudState.status='Synchronizujem…';
 let result:{data:{revision:number;payload?:unknown}|null;error:unknown}=await c.from('servis_sync').select('revision').eq('user_id',owner).maybeSingle();
 if(!result.error&&result.data){if(Number(result.data.revision)===meta.remoteRevision)result={...result,data:{...result.data,payload:meta.base}};else result=await c.from('servis_sync').select('revision,payload').eq('user_id',owner).maybeSingle();}
 if(result.error)throw Error('Cloud nie je dostupný. Miestne zmeny zostali uložené.');
 if(user?.id!==owner)throw Error('Účet sa zmenil počas synchronizácie.');
 const remote= result.data?validateData(result.data.payload):initialBase(),revision=Number(result.data?.revision||0);
 const merged=mergeData(meta.base,local,remote,choice);
 cloudState.conflicts=merged.conflicts;
 if(merged.conflicts.length&&!choice){cloudState.status='Konflikt úprav · vyberte verziu v Nastaveniach';return;}
 if(choice)await recoverySnapshot(local);
 merged.data=await reconcileSharedCustomers(merged.data);
 let remoteRevision=revision;
 if(!result.data||!equal(syncPayload(merged.data),syncPayload(remote))){
  const sent=await c.rpc('servis_sync_write',{expected_revision:revision,new_payload:syncPayload(merged.data)});
  if(sent.error)throw Error('Zmeny sa nepodarilo odoslať. Zostali v zariadení a prenos sa zopakuje.');
  if(!sent.data){cloudState.status='Druhé zariadenie práve ukladá; prenos zopakujem';return;}
  remoteRevision=Number(sent.data);
 }
 if(user?.id!==owner)throw Error('Účet sa zmenil počas synchronizácie.');
 const m:SyncMeta={...meta,base:syncPayload(merged.data),remoteRevision};
 // Another tab may save while the network is in flight. CAS rejects and retries without discarding its changes.
 let saved:Data|undefined;
 if(remoteRevision!==meta.remoteRevision||!equal(syncPayload(local),syncPayload(merged.data)))saved=await save('real',merged.data,local.revision,m);
 cloudState.conflicts=[];cloudState.status='Synchronizované · '+new Date().toLocaleTimeString('sk-SK');return saved;
}
