// Pure calendar rules shared by the worker and its regression tests.
export type RecordData = Record<string, any>;
export const APP_ORIGIN = 'https://spektra-servis.vercel.app';
export const REDIRECT_URI = APP_ORIGIN + '/google-callback.html';
export const SCOPES = ['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
export const MAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const jobSnapshot = (j:RecordData,c?:RecordData) => ({start:j.start,duration:j.duration,status:j.status==='cancelled'?'cancelled':'scheduled',summary:j.title+' — '+(c?.name||c?.company||''),location:j.address||'',description:'Spektra Servis · '+j.number+'\n'+(j.issue||'')+'\n\n'+APP_ORIGIN+'/#jobs'});
export function eventTime(e:RecordData): {start:string;duration:number}|null {
 if(!e.start?.dateTime||!e.end?.dateTime)return null;
 const start=Date.parse(e.start.dateTime),end=Date.parse(e.end.dateTime),duration=(end-start)/60000;
 if(!Number.isFinite(start)||!Number.isInteger(duration)||duration<5||duration>1440)return null;
 return {start:new Date(start).toISOString(),duration};
}
export function eventBody(snapshot:RecordData,jobId:string):RecordData {
 if(!snapshot.start||!Number.isFinite(Date.parse(snapshot.start)))throw Error('Zákazka nemá platný termín.');
 return {summary:snapshot.summary,location:snapshot.location,description:snapshot.description,start:{dateTime:snapshot.start,timeZone:'Europe/Bratislava'},end:{dateTime:new Date(Date.parse(snapshot.start)+snapshot.duration*60000).toISOString(),timeZone:'Europe/Bratislava'},extendedProperties:{private:{spektraApp:'servis-v1',spektraJobId:jobId}}};
}
export async function eventId(userId:string,jobId:string):Promise<string>{return 'ss'+await digest('spektra-servis-v2:'+userId+':'+jobId);}
export async function legacyEventId(jobId:string):Promise<string>{return 'ss'+await digest('spektra-servis-v1:'+jobId);}
export async function digest(value:string):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function reconcile(job:RecordData,customer:RecordData|undefined,event:RecordData,link:RecordData):{jobPatch:RecordData;eventPatch:RecordData;remove:boolean;notice:string} {
 const next=jobSnapshot(job,customer),base=link.job_snapshot||{},previous=link.event_snapshot||{};
 const jobPatch:RecordData={},eventPatch:RecordData={};let notice='';
 // Google cancellation keeps the service record and its documents.
 if(event.status==='cancelled')return {jobPatch:{status:'cancelled'},eventPatch,remove:false,notice:'Termín bol zrušený v Google.'};
 if(job.status==='cancelled'||!job.start)return {jobPatch,eventPatch,remove:true,notice:''};
 const time=eventTime(event);
 if(!time)throw Error('Prepojený výjazd musí mať konkrétny čas a trvať 5 minút až 24 hodín. Upravte termín v Google.');
 const oldTime=eventTime(previous);
 if(!oldTime||time.start!==oldTime.start||time.duration!==oldTime.duration){
  if(time.start!==job.start||time.duration!==job.duration){Object.assign(jobPatch,time);if(base.start&&(next.start!==base.start||next.duration!==base.duration))notice='Súbežná zmena termínu: prevzatý aktuálny termín z Google.';}
 }else if(next.start!==base.start||next.duration!==base.duration){Object.assign(eventPatch,{start:{dateTime:next.start,timeZone:'Europe/Bratislava'},end:{dateTime:new Date(Date.parse(next.start)+next.duration*60000).toISOString(),timeZone:'Europe/Bratislava'}});}
 for(const key of ['summary','location','description'] as const)if(next[key]!==base[key])eventPatch[key]=next[key];
 return {jobPatch,eventPatch,remove:false,notice};
}
export const localDay=(iso:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export function monthsBefore(day:string):string {
 const [y,m,d]=day.split('-').map(Number);const first=new Date(Date.UTC(y!,m!-2,1));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d!,last));return first.toISOString().slice(0,10);
}
export function dueReminders(start:string,now:string):string[]{
 if(Date.parse(start)<=Date.parse(now))return [];
 const day=localDay(start),current=localDay(now),three=new Date(Date.parse(day+'T12:00:00Z')-3*86400000).toISOString().slice(0,10);
 return [...(current>=monthsBefore(day)?['invitation']:[]),...(current>=three?['three_days']:[])];
}
export function safeEvent(event:RecordData):RecordData {
 return {id:event.id,etag:event.etag,status:event.status,summary:event.summary||'(Bez názvu)',location:event.location||'',start:event.start,end:event.end,htmlLink:typeof event.htmlLink==='string'&&event.htmlLink.startsWith('https://www.google.com/calendar/')?event.htmlLink:typeof event.htmlLink==='string'&&event.htmlLink.startsWith('https://calendar.google.com/')?event.htmlLink:'',attendees:(event.attendees||[]).map((a:RecordData)=>({email:a.email,responseStatus:a.responseStatus,self:a.self})),recurringEventId:event.recurringEventId};
}
export function safeEmail(email:unknown):string{if(typeof email!=='string'||email.length>200||! /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email))throw Error('Zákazník nemá platný e-mail.');return email;}
export function mailRaw(email:string,subject:string,text:string):string{
 safeEmail(email);const b64=(s:string)=>btoa(String.fromCharCode(...new TextEncoder().encode(s)));
 const mime='To: '+email+'\r\nSubject: =?UTF-8?B?'+b64(subject)+'?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+b64(text).match(/.{1,76}/g)!.join('\r\n');
 return b64(mime).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
