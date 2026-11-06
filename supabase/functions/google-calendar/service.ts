import {APP_ORIGIN,REDIRECT_URI,SCOPES,MAIL_SCOPE,digest,eventId,legacyEventId,eventBody,jobSnapshot,eventTime,reconcile,safeEvent,safeEmail,mailRaw,dueReminders,type RecordData} from './core.ts';
const TABLE='servis_google_connections',LINKS='servis_google_links',MESSAGES='servis_google_messages';
const now=()=>new Date().toISOString();
const errorText=(e:unknown)=>e instanceof Error?e.message:'Google Kalendár nie je dostupný.';
const checked=(r:any)=>{if(r.error)throw Error('Serverové údaje sa nepodarilo uložiť. Operáciu zopakujte.');return r.data;};
const random=()=>crypto.randomUUID()+crypto.randomUUID();
export function createHandler(db:any,http:typeof fetch=fetch){
 async function rpc(name:string,args:RecordData={}){return checked(await db.rpc(name,args));}
 async function connection(user:string){return checked(await db.from(TABLE).select('*').eq('user_id',user).maybeSingle());}
 async function secret(id:string|null,value?:string){return rpc('servis_google_secret',{secret_id:id,secret_value:value??null});}
 async function update(c:RecordData,values:RecordData){checked(await db.from(TABLE).update({...values,updated_at:now()}).eq('user_id',c.user_id));Object.assign(c,values);}
 async function token(c:RecordData):Promise<string>{
  if(!c.refresh_secret_id)throw Error('Pripojte Google účet v Nastaveniach.');
  const response=await http('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:c.client_id,client_secret:await secret(c.client_secret_id),refresh_token:await secret(c.refresh_secret_id)}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok||!data.access_token){if(data.error==='invalid_grant'){await update(c,{enabled:false,refresh_secret_id:null,last_error:'Prístup ku Google vypršal alebo bol odvolaný. Znova pripojte Google účet.'});}throw Error(c.last_error||'Google prístup sa nepodarilo obnoviť. Skontrolujte nastavenia pripojenia.');}
  return data.access_token;
 }
 function google(access:string){return async(path:string,method='GET',body?:unknown,etag?:string)=>{
  const response=await http('https://www.googleapis.com/'+path,{method,headers:{Authorization:'Bearer '+access,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if((response.status===404||response.status===410)&&method==='GET')return null;
  if(!response.ok){const code=response.status;throw Error(code===412?'Udalosť sa medzitým zmenila. Prenos sa zopakuje bez prepísania novších údajov.':code===403?'Google odmietol požiadavku. Overte oprávnenia, Calendar API a pri e-mailoch Gmail API.':code===429?'Google obmedzil počet požiadaviek. Prenos sa zopakuje.':'Google požiadavka zlyhala (HTTP '+code+').');}
  return response.status===204?null:response.json();
 };}
 async function calendars(api:any){const rows:RecordData[]=[];let page='';do{const r=await api('calendar/v3/users/me/calendarList?maxResults=250'+(page?'&pageToken='+encodeURIComponent(page):''));rows.push(...(r.items||[]));page=r.nextPageToken||'';if(rows.length>2000)throw Error('Príliš veľa kalendárov.');}while(page);return rows;}
 const eventPath=(c:RecordData,id='')=>'calendar/v3/calendars/'+encodeURIComponent(c.calendar_id)+'/events'+(id?'/'+encodeURIComponent(id):'');
 async function patchJob(user:string,job:RecordData,changes:RecordData){if(!Object.keys(changes).length)return job;const result=await rpc('servis_google_job_patch',{owner_id:user,job_id:job.id,expected_job:job,changes});if(!result)throw Error('Zákazku medzitým upravilo iné zariadenie. Synchronizácia sa zopakuje.');return result;}
 async function locked(c:RecordData,run:()=>Promise<any>){const id=crypto.randomUUID();if(!await rpc('servis_google_lock',{owner_id:c.user_id,lock_id:id}))throw Error('Google synchronizácia už prebieha. Skúste o chvíľu.');try{return await run();}finally{await rpc('servis_google_lock',{owner_id:c.user_id,lock_id:id,release:true});}}
 async function saveLink(c:RecordData,job:RecordData,event:RecordData,customer:RecordData|undefined,notice=''){
  const row={user_id:c.user_id,job_id:job.id,calendar_id:c.calendar_id,event_id:event.id,etag:event.etag||null,job_snapshot:jobSnapshot(job,customer),event_snapshot:event,last_error:'',notice,synced_at:now()};
  checked(await db.from(LINKS).upsert(row,{onConflict:'user_id,job_id'}));return row;
 }
 async function reminders(c:RecordData,job:RecordData,customer:RecordData|undefined,event:RecordData,api:any){
  if(!job.customerNotifications||!job.start||['done','cancelled'].includes(job.status)||event.status==='cancelled')return event;
  const email=safeEmail(customer?.email),due=dueReminders(job.start,now());
  if(!due.length)return event;
  const attendee=event.attendees?.find((a:RecordData)=>a.email?.toLowerCase()===email.toLowerCase());
  if(attendee?.responseStatus==='declined')return event;
  for(const kind of due){
   if(kind==='three_days'&&!c.mail_enabled)throw Error('Pre trojdňové e-maily povoľte Gmail pri pripojení účtu.');
   const occurrence=await digest(c.calendar_id+'|'+event.id+'|'+job.start+'|'+email.toLowerCase());
   const claim=await db.from(MESSAGES).insert({user_id:c.user_id,job_id:job.id,kind,occurrence});
   if(claim.error?.code==='23505')continue;checked(claim);
   try{
    if(kind==='invitation'){
     // Existing guests retain their response; never forge acceptance or reset an RSVP.
     if(!attendee){event=await api(eventPath(c,event.id)+'?sendUpdates=all','PATCH',{attendees:[...(event.attendees||[]),{email,responseStatus:'needsAction'}]},event.etag);}
    }else{
     const date=new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',dateStyle:'full',timeStyle:'short'}).format(new Date(job.start));
     const body='Dobrý deň,\n\npripomíname dohodnutý servis: '+job.title+'\nTermín: '+date+'\nAdresa: '+job.address+'\n\n'+(attendee?.responseStatus==='accepted'?'Ďakujeme za potvrdenie termínu.':'Prosíme o potvrdenie termínu v pôvodnej kalendárovej pozvánke alebo odpoveď na tento e-mail.')+'\n\nSpektra Install';
     await api('gmail/v1/users/me/messages/send','POST',{raw:mailRaw(email,'Pripomienka servisu – '+job.title,body)});
    }
    checked(await db.from(MESSAGES).update({state:'sent',updated_at:now()}).match({user_id:c.user_id,job_id:job.id,kind,occurrence}));
   }catch(e){
    // Delivery may have succeeded before a network timeout. Do not send twice automatically.
    checked(await db.from(MESSAGES).update({state:'uncertain',error:errorText(e),updated_at:now()}).match({user_id:c.user_id,job_id:job.id,kind,occurrence}));throw Error('Odoslanie správy vyžaduje kontrolu: '+errorText(e));
   }
  }return event;
 }
 async function syncOne(c:RecordData,job:RecordData,customer:RecordData|undefined,link:RecordData|null,api:any,force=false){
  if(link&&link.calendar_id!==c.calendar_id)return;
  if(job.googleEvent?.calendarId&&job.googleEvent.calendarId!==c.calendar_id)return;
  if(!link){
   if(!job.start||['cancelled','done'].includes(job.status))return;
   // Read existing history first; only post-activation edits/new jobs are auto-created.
   const requested=job.googleEvent?.calendarId===c.calendar_id?job.googleEvent.eventId:'';
   let event=requested?await api(eventPath(c,requested)):await api(eventPath(c,await legacyEventId(job.id)));
   if(event&&!requested&&event.extendedProperties?.private?.spektraJobId!==job.id)event=null;
   if(requested&&!event)throw Error('Vybraná Google udalosť neexistuje.');
   if(!event&&!force&&job.updatedAt<c.activated_at)return;
   if(event){
    const other=checked(await db.from(LINKS).select('job_id').match({user_id:c.user_id,calendar_id:c.calendar_id,event_id:event.id}).maybeSingle());
    if(other&&other.job_id!==job.id)throw Error('Táto Google udalosť už patrí inej zákazke.');
    if(event.status==='cancelled')throw Error('Zrušenú udalosť nemožno pripojiť.');
    const time=eventTime(event);if(!time)throw Error('Celodenný alebo viacdňový termín najskôr zmeňte v Google na časový výjazd do 24 hodín.');
    job=await patchJob(c.user_id,job,{...time,googleEvent:{calendarId:c.calendar_id,eventId:event.id}});
   }else{
    const id=await eventId(c.user_id,job.id);event=await api(eventPath(c,id));
    if(!event){
     try{event=await api(eventPath(c)+'?sendUpdates=none','POST',{id,...eventBody(jobSnapshot(job,customer),job.id),reminders:{useDefault:true}});}catch(e){event=await api(eventPath(c,id));if(!event)throw e;}
    }
    if(event.extendedProperties?.private?.spektraJobId!==job.id)throw Error('Existujúca udalosť nepatrí zákazke.');
    if(event.status==='cancelled'){job=await patchJob(c.user_id,job,{status:'cancelled'});}
   }
   link=await saveLink(c,job,event,customer);
  }
  let event=await api(eventPath(c,link.event_id));
  if(!event)event={id:link.event_id,status:'cancelled'};
  const plan=reconcile(job,customer,event,link);
  // CAS incoming changes before any outbound write; concurrent local saves retry.
  job=await patchJob(c.user_id,job,plan.jobPatch);
  if(plan.remove&&event.status!=='cancelled'){
   if(!event.etag)throw Error('Chýba verzia Google udalosti.');
   await api(eventPath(c,event.id)+'?sendUpdates=all','DELETE',undefined,event.etag);event={id:event.id,status:'cancelled'};
  }else if(Object.keys(plan.eventPatch).length){
   if(!event.etag)throw Error('Chýba verzia Google udalosti.');
   event=await api(eventPath(c,event.id)+'?sendUpdates=all','PATCH',plan.eventPatch,event.etag);
  }
  link=await saveLink(c,job,event,customer,plan.notice);
  try{event=await reminders(c,job,customer,event,api);await saveLink(c,job,event,customer,plan.notice);}catch(e){checked(await db.from(LINKS).update({last_error:errorText(e)}).match({user_id:c.user_id,job_id:job.id}));}
 }
 async function sync(c:RecordData,api:any,jobId=''){
  if(!c.enabled||!c.calendar_id)return;
  const workspace=checked(await db.from('servis_sync').select('payload').eq('user_id',c.user_id).maybeSingle());if(!workspace)return;
  const links:RecordData[]=checked(await db.from(LINKS).select('*').eq('user_id',c.user_id));
  const all=workspace.payload.jobs||[],customers=workspace.payload.customers||[];
  const jobs=all.filter((j:RecordData)=>jobId?j.id===jobId:links.some(l=>l.job_id===j.id)||j.googleEvent||j.updatedAt>=c.activated_at||(j.start&&Date.parse(j.start)>Date.now()-30*86400000)).sort((a:RecordData,b:RecordData)=>a.id.localeCompare(b.id));
  // Rotate batches so every linked event is checked, including old moved events.
  let chosen=jobs;if(!jobId&&jobs.length>40){const index=jobs.findIndex((j:RecordData)=>j.id===c.cursor_job),offset=index<0||index===jobs.length-1?0:index+1;chosen=[...jobs.slice(offset),...jobs.slice(0,offset)].slice(0,40);}
  const deadline=Date.now()+80000;let cursor=c.cursor_job||'';
  let failures=0;
  for(const job of chosen){if(Date.now()>deadline)break;cursor=job.id;try{await syncOne(c,job,customers.find((x:RecordData)=>x.id===job.customerId),links.find(l=>l.job_id===job.id)||null,api,!!jobId);}catch(e){failures++;const old=links.find(l=>l.job_id===job.id);if(old)checked(await db.from(LINKS).update({last_error:errorText(e)}).match({user_id:c.user_id,job_id:job.id}));await update(c,{last_error:job.number+': '+errorText(e)});}}
  await update(c,{last_synced_at:now(),...(!jobId?{cursor_job:cursor}:{}),...(failures?{}:{last_error:''})});
 }
 async function events(c:RecordData,api:any,body:RecordData){
  const from=new Date(body.from||Date.now()-7*86400000),to=new Date(body.to||Date.now()+35*86400000);
  if(!Number.isFinite(+from)||!Number.isFinite(+to)||+to<=+from||+to-+from>95*86400000)throw Error('Vyberte obdobie najviac 95 dní.');
  const result:RecordData[]=[];let page='';do{const q=new URLSearchParams({timeMin:from.toISOString(),timeMax:to.toISOString(),singleEvents:'true',maxResults:'250',orderBy:'startTime',...(page?{pageToken:page}:{})});const r=await api(eventPath(c)+'?'+q);result.push(...(r.items||[]).map(safeEvent));page=r.nextPageToken||'';if(result.length>5000)throw Error('Veľa udalostí. Zvoľte kratšie obdobie.');}while(page);return result;
 }
 async function status(c:RecordData|null){
  if(!c)return {configured:false,connected:false,enabled:false,calendarId:'',calendars:[],links:[],messages:[]};
  const links=checked(await db.from(LINKS).select('job_id,calendar_id,event_id,event_snapshot,last_error,notice,synced_at').eq('user_id',c.user_id));
  const messages=checked(await db.from(MESSAGES).select('job_id,kind,state,error,created_at').eq('user_id',c.user_id).order('created_at',{ascending:false}).limit(100));
  return {configured:!!c.client_secret_id,clientId:c.client_id,connected:!!c.refresh_secret_id,enabled:c.enabled,mailEnabled:c.mail_enabled,calendarId:c.calendar_id,calendarName:c.calendar_name,account:c.account,lastSyncedAt:c.last_synced_at,error:c.last_error,links:links.map((l:RecordData)=>({...l,event_snapshot:safeEvent(l.event_snapshot)})),messages};
 }
 return async(req:Request):Promise<Response>=>{
  const origin=req.headers.get('Origin');const cors=origin===APP_ORIGIN||/^http:\/\/(localhost|127\.0\.0\.1|terminal\.local)(:\d+)?$/.test(origin||'')?origin:'';
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(cors?{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
  const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response('',{status:204,headers});
  if(req.method!=='POST')return response({error:'Použite POST.'},405);
  if(origin&&!cors)return response({error:'Nepovolený pôvod požiadavky.'},403);
  try{
   if(Number(req.headers.get('content-length')||0)>20000)return response({error:'Požiadavka je príliš veľká.'},413);
   const raw=await req.text();if(raw.length>20000)return response({error:'Požiadavka je príliš veľká.'},413);
   const body=JSON.parse(raw||'{}');
   if(body.action==='cron'){
    const supplied=req.headers.get('x-spektra-cron');if(!supplied)return response({error:'Unauthorized'},401);
    const expected=await rpc('servis_google_cron_secret');if(!expected||supplied!==expected)return response({error:'Unauthorized'},401);
    const connections=checked(await db.from(TABLE).select('*').eq('enabled',true).order('last_synced_at',{ascending:true,nullsFirst:true}).limit(10));let done=0;
    for(const c of connections){try{const active=checked(await db.from('app_users').select('active').eq('user_id',c.user_id).maybeSingle());if(!active?.active)continue;await locked(c,async()=>sync(c,google(await token(c))));done++;}catch(e){await update(c,{last_error:errorText(e)});}}
    return response({processed:done});
   }
   const bearer=req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!bearer)return response({error:'Prihláste sa do Spektry.'},401);
   const userResult=await db.auth.getUser(bearer),user=userResult.data?.user;if(userResult.error||!user)return response({error:'Prihlásenie vypršalo.'},401);
   const profile=checked(await db.from('app_users').select('active').eq('user_id',user.id).maybeSingle());if(!profile?.active)return response({error:'Účet nemá aktívny prístup.'},403);
   let c=await connection(user.id);
   if(body.action==='status')return response(await status(c));
   if(body.action==='configure'){
    if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(body.clientId||''))throw Error('Zadajte OAuth Client ID webovej aplikácie.');
    if(c?.refresh_secret_id)throw Error('Pred zmenou poverení odpojte Google účet.');
    if(typeof body.clientSecret!=='string'||body.clientSecret.length<10||body.clientSecret.length>1000)throw Error('Vložte Client secret z Google Cloud.');
    const sid=await secret(c?.client_secret_id||null,body.clientSecret);
    checked(await db.from(TABLE).upsert({user_id:user.id,client_id:body.clientId,client_secret_id:sid,mail_enabled:body.mailEnabled===true,updated_at:now()},{onConflict:'user_id'}));return response(await status(await connection(user.id)));
   }
   if(!c?.client_secret_id)throw Error('Dokončite prvé nastavenie Google pripojenia.');
   if(body.action==='connect'){
    const state=random(),verifier=random();
    checked(await db.from('servis_google_oauth').delete().eq('user_id',user.id));
    checked(await db.from('servis_google_oauth').insert({state_hash:await digest(state),user_id:user.id,verifier,expires_at:new Date(Date.now()+10*60000).toISOString()}));
    const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const q=new URLSearchParams({client_id:c.client_id,redirect_uri:REDIRECT_URI,response_type:'code',scope:[...SCOPES,...(c.mail_enabled?[MAIL_SCOPE]:[])].join(' '),access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});return response({url:'https://accounts.google.com/o/oauth2/v2/auth?'+q,state});
   }
   if(body.action==='callback'){
    if(typeof body.state!=='string'||body.state.length>200||typeof body.code!=='string'||body.code.length>3000)throw Error('Neplatná odpoveď Google.');
    const state=checked(await db.from('servis_google_oauth').delete().match({state_hash:await digest(body.state),user_id:user.id}).gt('expires_at',now()).select('*').maybeSingle());
    if(!state)throw Error('Pripojenie vypršalo. Kliknite znova Pripojiť Google.');
    const r=await http('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:body.code,client_id:c.client_id,client_secret:await secret(c.client_secret_id),redirect_uri:REDIRECT_URI,grant_type:'authorization_code',code_verifier:state.verifier}),signal:AbortSignal.timeout(12000)});const t=await r.json();
    if(!r.ok||!t.refresh_token)throw Error('Google neposkytol trvalý prístup. Pripojte účet znovu a povoľte požadované oprávnenia.');
    const scopes=String(t.scope||'').split(' ');if(!SCOPES.every(s=>scopes.includes(s))||(c.mail_enabled&&!scopes.includes(MAIL_SCOPE)))throw Error('Google neudelil všetky vyžiadané oprávnenia.');
    const list=await calendars(google(t.access_token));const account=list.find(x=>x.primary)?.id||'';
    if(c.account&&account!==c.account&&c.calendar_id)throw Error('Zvoľte pôvodný Google účet, ku ktorému sú pripojené zákazky.');
    await update(c,{refresh_secret_id:await secret(c.refresh_secret_id,t.refresh_token),account,last_error:''});return response({...await status(c),calendars:list.filter(x=>['owner','writer'].includes(x.accessRole)).map(x=>({id:x.id,summary:x.summary,primary:x.primary}))});
   }
   if(body.action==='disconnect'){
    // Best-effort Google revocation; regardless, remove the encrypted token value.
    if(c.refresh_secret_id){const refresh=await secret(c.refresh_secret_id);try{await http('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:refresh}),signal:AbortSignal.timeout(8000)});}catch{}await secret(c.refresh_secret_id,'revoked');}
    await update(c,{enabled:false,refresh_secret_id:null,last_error:''});return response(await status(c));
   }
   return await locked(c,async()=>{
    const api=google(await token(c));
    if(body.action==='calendars'){const list=await calendars(api);return response({calendars:list.filter(x=>['owner','writer'].includes(x.accessRole)).map(x=>({id:x.id,summary:x.summary,primary:x.primary}))});}
    if(body.action==='select'){
     const calendar=(await calendars(api)).find(x=>x.id===body.calendarId&&['owner','writer'].includes(x.accessRole));if(!calendar)throw Error('Vyberte kalendár, ktorý môžete upravovať.');
     const links=checked(await db.from(LINKS).select('calendar_id').eq('user_id',user.id).limit(1));if(links.length&&links[0].calendar_id!==calendar.id)throw Error('Zákazky sú spojené s pôvodným kalendárom. Jeho zmena vyžaduje presun existujúcich väzieb.');
     await update(c,{calendar_id:calendar.id,calendar_name:calendar.summary,enabled:true,activated_at:c.activated_at||now(),last_error:''});return response(await status(c));
    }
    if(!c.calendar_id)throw Error('Vyberte hlavný kalendár v Nastaveniach.');
    if(body.action==='link'){
     const workspace=checked(await db.from('servis_sync').select('payload').eq('user_id',user.id).single());const job=workspace.payload.jobs.find((j:RecordData)=>j.id===body.jobId);if(!job)throw Error('Najskôr uložte zákazku do cloudu.');
     const existing=checked(await db.from(LINKS).select('job_id').match({user_id:user.id,job_id:job.id}).maybeSingle());if(existing)throw Error('Zákazka už má prepojenú udalosť.');
     const event=await api(eventPath(c,body.eventId));const time=event&&event.status!=='cancelled'?eventTime(event):null;if(!time)throw Error('Vyberte platný časový výjazd do 24 hodín.');
     const duplicate=checked(await db.from(LINKS).select('job_id').match({user_id:user.id,calendar_id:c.calendar_id,event_id:event.id}).maybeSingle());if(duplicate)throw Error('Udalosť už patrí inej zákazke.');
     const updated=await patchJob(user.id,job,{...time,googleEvent:{calendarId:c.calendar_id,eventId:event.id}});await saveLink(c,updated,event,workspace.payload.customers.find((x:RecordData)=>x.id===job.customerId));
     return response(await status(c));
    }
    if(body.action==='sync'){await sync(c,api,typeof body.jobId==='string'?body.jobId:'');return response(await status(c));}
    if(body.action==='events')return response({...await status(c),events:await events(c,api,body)});
    throw Error('Neznáma operácia.');
   });
  }catch(e){return response({error:errorText(e)},400);}
 };
}
