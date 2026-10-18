export interface PendingFile { id:string; owner:string; driveAccount:string; name:string; mime:string; jobId:string; manualId:string; file:Blob; createdAt:string }
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('spektra-file-queue-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function queuedFiles():Promise<PendingFile[]>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files'),r=t.objectStore('files').getAll();t.oncomplete=()=>{d.close();resolve(r.result);};t.onerror=()=>{d.close();reject(t.error);};});}
export async function queueFile(file:PendingFile|string):Promise<void>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files','readwrite'),s=t.objectStore('files');if(typeof file==='string')s.delete(file);else s.put(file);t.oncomplete=()=>{d.close();resolve();};t.onerror=t.onabort=()=>{d.close();reject(Error('Súbor sa neuložil v zariadení. Skontrolujte voľné miesto.'));};});}
export async function fileType(file:Blob,name:string):Promise<string>{
 if(!file.size||file.size>100*1024*1024)throw Error('Príloha musí mať 1 B až 100 MB.');
 const b=new Uint8Array(await file.slice(0,16).arrayBuffer()),s=String.fromCharCode(...b);
 if(s.startsWith('%PDF-'))return 'application/pdf';
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b[0]===137&&s.slice(1,4)==='PNG')return 'image/png';
 if(s.startsWith('RIFF')&&s.slice(8,12)==='WEBP')return 'image/webp';
 if(s.slice(4,8)==='ftyp'&&['heic','heix','hevc','hevx','mif1'].includes(s.slice(8,12)))return 'image/heic';
 throw Error('Podporované sú PDF a fotografie JPG, PNG, WebP alebo HEIC: '+name);
}
