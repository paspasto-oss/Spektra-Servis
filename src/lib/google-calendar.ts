import { type Job, type Customer, ZONE } from '../domain.js';
import { endTime } from './calendar.js';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
const KEY = 'spektra-google-client-id';
interface TokenResponse { access_token?: string; expires_in?: number; error?: string; scope?: string }
interface Identity { accounts: { oauth2: { initTokenClient(config: Record<string, unknown>): { requestAccessToken(options: Record<string,string>): void }; hasGrantedAllScopes(response: TokenResponse,...scopes: string[]): boolean; revoke(token: string, callback: (result: {successful:boolean})=>void): void } } }
interface GoogleWindow extends Window { google?: Identity }
export interface GoogleCalendar { id: string; summary: string; primary?: boolean; accessRole: string }
interface GoogleEvent { id?: string; etag?: string; status?: string; summary?: string; attendees?: unknown[]; extendedProperties?: {private?:Record<string,string>} }
let token='', expires=0, scriptPromise: Promise<void> | undefined, connecting=false;
let calendars: GoogleCalendar[] = [], selected='', account='', syncing=false;
export function googleClientId(): string { try { return localStorage.getItem(KEY)||''; } catch { return ''; } }
export function googleState() { return {connected:!!token && Date.now()<expires,calendars,selected,account,syncing}; }
export function disconnectGoogle(): void { token='';expires=0;calendars=[];selected='';account=''; }
export async function saveGoogleClientId(value: string): Promise<void> {
  value=value.trim();
  if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value))throw new Error('Vložte Google OAuth Client ID pre webovú aplikáciu, nie tajný kľúč.');
  if(syncing || connecting)throw new Error('Počkajte na dokončenie operácie.');
  localStorage.setItem(KEY,value);disconnectGoogle();await prepareGoogle();
}
export function prepareGoogle(): Promise<void> {
  if((window as GoogleWindow).google?.accounts.oauth2)return Promise.resolve();
  if(!scriptPromise)scriptPromise=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    const timeout=setTimeout(()=>{script.remove();scriptPromise=undefined;reject(new Error('Google sa nenačítal. Skontrolujte internet a blokovanie skriptov.'));},15000);
    script.onload=()=>{clearTimeout(timeout);resolve();};
    script.onerror=()=>{clearTimeout(timeout);script.remove();scriptPromise=undefined;reject(new Error('Google prihlásenie sa nepodarilo načítať.'));};
    document.head.append(script);
  });
  return scriptPromise;
}
export async function googleRequest(path: string, method='GET', body?: unknown, etag?: string): Promise<any> {
  if(!token || Date.now()>=expires){disconnectGoogle();throw new Error('Pripojenie vypršalo. V nastaveniach sa znova pripojte ku Google.');}
  const response=await fetch('https://www.googleapis.com/calendar/v3/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401){disconnectGoogle();throw new Error('Google prístup vypršal. Pripojte účet znova.');}
  if(response.status===404 && method==='GET')return null;
  if(!response.ok){
    const messages:Record<number,string>={403:'Google odmietol prístup. Overte zapnutie Calendar API a udelené oprávnenia.',409:'Udalosť už vznikla v inom okne. Zopakujte prenos; nevytvárajte ručnú kópiu.',410:'Udalosť bola v Google odstránená. Obnovte ju v Google alebo vytvorte novú zákazku.',412:'Udalosť medzitým zmenil iný používateľ alebo zariadenie. Zopakujte kontrolu a prenos.',429:'Google dočasne obmedzil počet požiadaviek. Skúste prenos neskôr.'};
    throw new Error(messages[response.status]||'Google Kalendár nie je dostupný (HTTP '+response.status+'). Skúste znova.');
  }
  return response.status===204?null:response.json();
}
export function connectGoogle(): Promise<void> {
  if(connecting || syncing)return Promise.reject(new Error('Počkajte na dokončenie operácie.'));
  const clientId=googleClientId(), identity=(window as GoogleWindow).google?.accounts.oauth2;
  if(!clientId)return Promise.reject(new Error('Najskôr nastavte Google OAuth Client ID.'));
  if(!identity){void prepareGoogle().catch(()=>{});return Promise.reject(new Error('Načítavam Google prihlásenie. O chvíľu kliknite Pripojiť Google znova.'));}
  disconnectGoogle();connecting=true;
  return new Promise<void>((resolve,reject)=>{
    let done=false;
    const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timeout);connecting=false;if(error){disconnectGoogle();reject(error);}else resolve();};
    const timeout=setTimeout(()=>finish(new Error('Prihlásenie nebolo dokončené. Skúste znova.')),120000);
    const client=identity.initTokenClient({client_id:clientId,scope:SCOPES.join(' '),include_granted_scopes:false,
      callback:async(response:TokenResponse)=>{
        if(done)return;
        if(response.error || !response.access_token || !identity.hasGrantedAllScopes(response,...SCOPES)){finish(new Error('Google prístup nebol povolený pre obe potrebné oprávnenia.'));return;}
        token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in||0)-60)*1000;
        try {
          let next='';const found:GoogleCalendar[]=[];
          do { const result=await googleRequest('users/me/calendarList?minAccessRole=owner&maxResults=250'+(next?'&pageToken='+encodeURIComponent(next):''));found.push(...(result.items||[]));next=result.nextPageToken||''; }while(next);
          if(done)return;
          calendars=found.filter(c=>c.accessRole==='owner');account=calendars.find(c=>c.primary)?.id||'Pripojený Google účet';selected='';
          finish();
        }catch(error){finish(error instanceof Error?error:new Error('Kalendáre sa nenačítali.'));}
      },error_callback:()=>finish(new Error('Prihlasovacie okno bolo zatvorené alebo zablokované. Povoľte vyskakovacie okno pre Spektra Servis.'))});
    client.requestAccessToken({prompt:'select_account'});
  });
}
export function selectGoogleCalendar(id:string):void {
  if(syncing)throw new Error('Počkajte na dokončenie prenosu.');
  if(!calendars.some(c=>c.id===id))throw new Error('Vyberte jeden z pripojených kalendárov.');selected=id;
}
export async function googleEventId(jobId:string):Promise<string>{
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('spektra-servis-v1:'+jobId));
  return 'ss'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
export function googleEventBody(job:Job,customer?:Customer) {
  if(!job.start || job.status==='cancelled')throw new Error('Prenášať možno iba nezrušenú zákazku s termínom.');
  return {summary:job.title+' — '+(customer?.name||customer?.company||''),location:job.address,
    description:'Spektra Servis · '+job.number+'\n'+job.issue+'\n\nPrenos zo Spektra Servisu. Zmeny v Google sa nevracajú do zákazky.',
    start:{dateTime:job.start,timeZone:ZONE},end:{dateTime:endTime(job),timeZone:ZONE},
    extendedProperties:{private:{spektraApp:'servis-v1',spektraJobId:job.id}}};
}
export function assertOwnedEvent(event:GoogleEvent,jobId:string):void{
  if(event.status==='cancelled')throw new Error('Udalosť je v Google odstránená. Najskôr ju obnovte v Google.');
  if(event.extendedProperties?.private?.spektraApp!=='servis-v1'||event.extendedProperties?.private?.spektraJobId!==jobId)throw new Error('Existujúca udalosť nepatrí tejto zákazke. Nebude prepísaná.');
  if(event.attendees?.length)throw new Error('Udalosť má pozvaných účastníkov. Upravte ju priamo v Google; automatický prenos ju neprepíše.');
}
export async function syncGoogleJob(job:Job,customer:Customer|undefined,approve:(text:string)=>boolean=confirm):Promise<boolean>{
  if(syncing)throw new Error('Prenos už prebieha.');
  const calendar=calendars.find(c=>c.id===selected);if(!calendar)throw new Error('V Nastaveniach pripojte Google a vyberte cieľový kalendár.');
  syncing=true;
  try {
    const body=googleEventBody(job,customer),id=await googleEventId(job.id),path='calendars/'+encodeURIComponent(calendar.id)+'/events';
    const existing:GoogleEvent|null=await googleRequest(path+'/'+id);
    if(existing)assertOwnedEvent(existing,job.id);
    if(!approve(`${existing?'Aktualizovať':'Vytvoriť'} udalosť v Google?\n\nÚčet: ${account}\nKalendár: ${calendar.summary}\nZákazka: ${job.number} · ${job.title}\nTermín: ${new Date(job.start).toLocaleString('sk-SK',{timeZone:ZONE})}\n\nPrenesie sa meno zákazníka, adresa a zadanie. ${existing?'Názov, termín, adresa a popis v Google sa nahradia uloženými údajmi zákazky.':''}`))return false;
    if(existing){
      if(!existing.etag)throw new Error('Chýba kontrolná verzia udalosti. Zopakujte prenos.');
      const merged={...body,extendedProperties:{private:{...existing.extendedProperties?.private,...body.extendedProperties.private}}};
      await googleRequest(path+'/'+id+'?sendUpdates=none','PATCH',merged,existing.etag);
    }else await googleRequest(path+'?sendUpdates=none','POST',{id,...body,reminders:{useDefault:true}});
    return true;
  } finally {syncing=false;}
}
