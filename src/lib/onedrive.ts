import type { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { exportBackup } from './backup.js';
import type { Data } from '../domain.js';
const KEY='spektra-onedrive-client-id';
export const ONE_DRIVE_SCOPE='https://graph.microsoft.com/Files.ReadWrite.AppFolder';
export const ONE_DRIVE_REDIRECT='https://spektra-servis.vercel.app/onedrive-callback.html';
const GRAPH='https://graph.microsoft.com/v1.0';
declare global { interface Window { msal?: typeof import('@azure/msal-browser') } }
let client:PublicClientApplication|null=null, account:AccountInfo|null=null, rootId='', initialization:Promise<void>|null=null;
let lastFile='';
export function oneDriveClientId():string { return localStorage.getItem(KEY)||''; }
export function oneDriveState():{connected:boolean;account:string;lastFile:string} {return {connected:!!account&&!!rootId,account:account?.username||account?.name||'',lastFile};}
export function validClientId(value:string):string {const id=value.trim();if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw Error('Vložte Application (client) ID z Microsoft registrácie – identifikátor vo formáte UUID.');return id;}
export async function saveOneDriveClientId(value:string):Promise<void>{const id=validClientId(value);await disconnectOneDrive();localStorage.setItem(KEY,id);client=null;initialization=null;await prepareOneDrive();}
function library():Promise<void>{
 if(window.msal)return Promise.resolve();
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/msal-browser.min.js';s.async=true;let done=false;
 const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);if(error){s.remove();reject(error);}else resolve();};
 const timer=setTimeout(()=>finish(Error('Knižnica Microsoft sa nenačítala. Obnovte aplikáciu a skúste znova.')),20000);
 s.onload=()=>finish(window.msal?undefined:Error('Knižnica Microsoft nie je dostupná.'));s.onerror=()=>finish(Error('Nepodarilo sa načítať prihlásenie Microsoft.'));document.head.append(s);});
}
export function prepareOneDrive():Promise<void>{
 if(initialization)return initialization;
 initialization=(async()=>{if(location.origin!=='https://spektra-servis.vercel.app')throw Error('OneDrive pripájajte z produkčnej adresy spektra-servis.vercel.app.');
 const id=validClientId(oneDriveClientId());await library();
 client=new window.msal!.PublicClientApplication({auth:{clientId:id,authority:'https://login.microsoftonline.com/consumers',redirectUri:ONE_DRIVE_REDIRECT},cache:{cacheLocation:'memoryStorage'},system:{loggerOptions:{piiLoggingEnabled:false}}});await client.initialize();})();
 initialization.catch(()=>{initialization=null;client=null;});return initialization;
}
async function accessToken():Promise<string>{if(!client||!account)throw Error('Najskôr pripojte OneDrive.');
 try{return (await client.acquireTokenSilent({account,scopes:[ONE_DRIVE_SCOPE]})).accessToken;}catch{throw Error('Prístup k OneDrivu vypršal. Kliknite Pripojiť / zmeniť účet a potvrďte prihlásenie.');}}
async function graph(path:string,init:RequestInit={}):Promise<Record<string,unknown>> {
 if(!path.startsWith('/me/drive/'))throw Error('Neplatná cesta OneDrive.');
 const response=await fetch(GRAPH+path,{...init,headers:{...init.headers,Authorization:'Bearer '+await accessToken()},signal:AbortSignal.timeout(60000)});
 if(!response.ok){const reason=response.status===401?'Prihlásenie vypršalo; pripojte účet znova.':response.status===403?'Microsoft nepovolil prístup k priečinku aplikácie. Skontrolujte oprávnenie Files.ReadWrite.AppFolder.':response.status===429?'OneDrive je dočasne vyťažený. Skúste neskôr.':response.status===507?'OneDrive nemá dostatok voľného miesta.':'OneDrive neuložil požiadavku (HTTP '+response.status+').';throw Error(reason);}
 return response.json();
}
export async function connectOneDrive():Promise<void>{await prepareOneDrive();
 const response=await client!.loginPopup({scopes:[ONE_DRIVE_SCOPE],prompt:'select_account',redirectUri:ONE_DRIVE_REDIRECT});
 if(!response.account)throw Error('Microsoft nevrátil prihlásený účet.');account=response.account;rootId='';lastFile='';
 try {const root=await graph('/me/drive/special/approot');if(typeof root.id!=='string'||!root.folder)throw Error('Priečinok aplikácie na OneDrive nie je dostupný.');rootId=root.id;}
 catch(error){await disconnectOneDrive();throw error;}
}
export async function disconnectOneDrive():Promise<void>{const old=account;account=null;rootId='';lastFile='';if(client)await client.clearCache(old?{account:old}:undefined);}
export function backupFilename(now=new Date()):string{return 'Spektra-zaloha-'+now.toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)+'.spektra';}
export async function uploadOneDriveBackup(data:Data,password:string):Promise<string>{
 if(!account||!rootId)throw Error('Najskôr pripojte OneDrive.');if(password.length<10)throw Error('Pre cloudovú zálohu zadajte heslo s aspoň 10 znakmi. Heslo si bezpečne uložte.');
 const owner=account.homeAccountId,folder=rootId,content=await exportBackup(data,password);
 if(new TextEncoder().encode(content).length>25*1024*1024)throw Error('Záloha je väčšia ako 25 MB. Ukladanie sa nespustilo.');
 if(account?.homeAccountId!==owner||rootId!==folder)throw Error('Pripojený účet sa zmenil. Zálohu zopakujte.');
 const name=backupFilename();const result=await graph('/me/drive/items/'+encodeURIComponent(folder)+':/'+encodeURIComponent(name)+':/content', {method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:content});
 if(typeof result.id!=='string'||result.name!==name||typeof result.size!=='number'||result.size!==new TextEncoder().encode(content).length)throw Error('OneDrive nepotvrdil celý súbor. Overte zálohu v OneDrive.');
 lastFile=name;return name;
}
