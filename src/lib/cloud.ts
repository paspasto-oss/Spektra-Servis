import type { SupabaseClient, User } from '@supabase/supabase-js';
import { validateData, type Data } from '../domain.js';
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
