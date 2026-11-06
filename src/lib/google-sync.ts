import {googleServerRequest,cloudUser} from './cloud.js';
import {type Data,type Job} from '../domain.js';
import {toUtc} from './calendar.js';
export interface CalendarEvent {id:string;summary:string;status?:string;location:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string};htmlLink?:string;attendees?:{email:string;responseStatus:string}[];recurringEventId?:string}
export interface CalendarLink {job_id:string;calendar_id:string;event_id:string;event_snapshot:CalendarEvent;last_error:string;notice:string;synced_at:string}
export interface GoogleSyncState {configured:boolean;connected:boolean;enabled:boolean;mailEnabled:boolean;clientId:string;calendarId:string;calendarName:string;account:string;lastSyncedAt:string;error:string;calendars:{id:string;summary:string;primary?:boolean}[];events:CalendarEvent[];links:CalendarLink[];messages:{job_id:string;kind:string;state:string;error:string}[];loading:boolean;loadedRange:string}
const initial=():GoogleSyncState=>({configured:false,connected:false,enabled:false,mailEnabled:false,clientId:'',calendarId:'',calendarName:'',account:'',lastSyncedAt:'',error:'',calendars:[],events:[],links:[],messages:[],loading:false,loadedRange:''});
let state=initial(),owner='',attemptRange='',attemptAt=0;
export function googleSyncState():GoogleSyncState {if(owner!==cloudUser()){owner=cloudUser();state=initial();attemptRange='';attemptAt=0;}return state;}
export function resetGoogleSync():void{owner='';state=initial();attemptRange='';attemptAt=0;}
export async function googleAction(action:string,args:Record<string,unknown>={}):Promise<any>{
 googleSyncState();const user=cloudUser();if(!user)throw Error('Najskôr sa prihláste do Spektry.');
 const result=await googleServerRequest({action,...args});if(user!==cloudUser())throw Error('Účet sa počas prenosu zmenil.');
 state={...state,...result};return result;
}
export async function loadGoogleState():Promise<void>{if(cloudUser())await googleAction('status');}
export async function beginGoogleConnect():Promise<void>{
 if(location.origin!=='https://spektra-servis.vercel.app')throw Error('Google pripojenie nastavte na spektra-servis.vercel.app.');
 const result=await googleAction('connect');sessionStorage.setItem('spektra-google-state',result.state);location.assign(result.url);
}
export async function finishGoogleConnect():Promise<boolean>{
 const raw=sessionStorage.getItem('spektra-google-return');if(!raw)return false;sessionStorage.removeItem('spektra-google-return');
 const result=JSON.parse(raw),expected=sessionStorage.getItem('spektra-google-state');sessionStorage.removeItem('spektra-google-state');
 if(result.error)throw Error('Google prístup nebol povolený.');if(!expected||result.state!==expected)throw Error('Google odpoveď nepatrí tomuto pripojeniu. Skúste znova.');
 await googleAction('callback',{code:result.code,state:result.state});return true;
}
export async function loadGoogleEvents(from:string,to:string,force=false):Promise<void>{
 const current=googleSyncState(),range=from+'|'+to;if(!current.connected||!current.calendarId||current.loading)return;
 if(!force&&(current.loadedRange===range||(attemptRange===range&&Date.now()-attemptAt<60000)))return;
 attemptRange=range;attemptAt=Date.now();current.loading=true;
 try{await googleAction('events',{from,to});state.loadedRange=range;}catch(e){state.error=e instanceof Error?e.message:'Google udalosti sa nenačítali.';throw e;}finally{state.loading=false;}
}
export function googleLink(jobId:string):CalendarLink|undefined{return googleSyncState().links.find(x=>x.job_id===jobId);}
export function googleUrl(event?:CalendarEvent):string{
 if(event?.htmlLink){try{const u=new URL(event.htmlLink);if(u.protocol==='https:'&&['calendar.google.com','www.google.com'].includes(u.hostname))return u.href;}catch{}}
 const id=googleSyncState().calendarId;return 'https://calendar.google.com/calendar/u/0/r'+(id?'?cid='+encodeURIComponent(id):'');
}
export function eventRange(event:CalendarEvent):{start:string;duration:number}|null{
 try{const start=event.start?.dateTime?new Date(event.start.dateTime).toISOString():event.start?.date?toUtc(event.start.date+'T00:00'):'';const end=event.end?.dateTime?new Date(event.end.dateTime).toISOString():event.end?.date?toUtc(event.end.date+'T00:00'):'';if(!start||!end)return null;const duration=(Date.parse(end)-Date.parse(start))/60000;return duration>0?{start,duration}:null;}catch{return null;}
}
export const externalId=(eventId:string):string=>'google_'+eventId;
/** View-only projection: external calendar events never become customer/job records by accident. */
export function googleCalendarData(data:Data):Data{
 const current=googleSyncState();if(!current.connected||!current.calendarId)return data;
 const eventById=new Map(current.events.map(e=>[e.id,e]));
 const jobs=data.jobs.map(j=>{
  const link=current.links.find(x=>x.job_id===j.id&&x.calendar_id===current.calendarId);if(!link)return j;
  const event=eventById.get(link.event_id)||link.event_snapshot,range=eventRange(event);
  return {...j,...(range||{}),...(event.status==='cancelled'?{status:'cancelled' as const}:{})};
 });
 for(const event of current.events){
  if(event.status==='cancelled'||current.links.some(x=>x.calendar_id===current.calendarId&&x.event_id===event.id&&data.jobs.some(j=>j.id===x.job_id)))continue;
  const range=eventRange(event);if(!range)continue;
  jobs.push({id:externalId(event.id),number:'Google',title:event.summary,customerId:'',deviceId:'',kind:'servis',status:'planned',...range,address:event.location||'',issue:'',resolution:'',result:'pending',payment:'unpaid',amount:null,version:0,createdAt:range.start,updatedAt:range.start} as Job);
 }
 return {...data,jobs};
}
export function customerReply(jobId:string,email:string):string {
 const attendee=googleLink(jobId)?.event_snapshot.attendees?.find(a=>a.email.toLowerCase()===email.toLowerCase());
 return ({accepted:'Potvrdené',declined:'Odmietnuté',tentative:'Predbežne potvrdené',needsAction:'Čaká na odpoveď'} as Record<string,string>)[attendee?.responseStatus||'']||'Pozvánka ešte nebola odoslaná';
}
