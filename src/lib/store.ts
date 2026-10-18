import { emptyData, validateData, type Data } from '../domain.js';
const DB_NAME = 'spektra-servis-v1';
export type Workspace = 'real' | 'demo';
let openPromise: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!openPromise) openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('workspaces');
    req.onerror = () => reject(new Error('Prehliadač nepovolil miestne úložisko. Otvorte aplikáciu mimo súkromného režimu.'));
    req.onblocked = () => reject(new Error('Zatvorte ostatné karty aplikácie a skúste znova.'));
    req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
  });
  return openPromise;
}
export async function load(workspace: Workspace): Promise<Data> {
  const db = await database();
  return new Promise((resolve, reject) => { const req = db.transaction('workspaces').objectStore('workspaces').get(workspace); req.onsuccess = () => { try { resolve(req.result ? validateData(req.result) : emptyData()); } catch (e) { reject(e); } }; req.onerror = () => reject(req.error); });
}
/** Compare-and-swap inside one transaction prevents silently overwriting a second tab. */
export async function save(workspace: Workspace, value: Data, expectedRevision: number, syncMeta?: SyncMeta): Promise<Data> {
  const clean = validateData(value), db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspaces', 'readwrite'), store = tx.objectStore('workspaces'); let problem: Error | undefined;
    const req = store.get(workspace);
    req.onsuccess = () => {
      if ((req.result?.revision ?? 0) !== expectedRevision) { problem = new Error('Údaje zmenila iná karta. Zatvorte formulár, obnovte stránku a úpravu zopakujte.'); tx.abort(); return; }
      clean.revision = expectedRevision + 1;
      store.put(clean, workspace);
      if(syncMeta){store.put(syncMeta,'sync-meta');}
    };
    tx.oncomplete = () => { try { const channel = new BroadcastChannel(DB_NAME); channel.postMessage({ workspace, revision: clean.revision }); channel.close(); } catch { /* optional browser API */ } resolve(clean); };
    tx.onerror = () => reject(problem || new Error('Uloženie zlyhalo. Skontrolujte voľné miesto. Formulár zostal otvorený.'));
    tx.onabort = () => reject(problem || new Error('Údaje sa neuložili. Formulár zostal otvorený.'));
  });
}

export interface SyncMeta { owner:string; base:Data; remoteRevision:number; enabled:boolean }
export async function loadSyncMeta():Promise<SyncMeta|undefined>{const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('workspaces').objectStore('workspaces').get('sync-meta');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function recoverySnapshot(value:Data):Promise<void>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(value,'before-cloud-link');tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error);});}
export async function loadRecovery():Promise<Data|undefined>{const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('workspaces').objectStore('workspaces').get('before-cloud-link');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
