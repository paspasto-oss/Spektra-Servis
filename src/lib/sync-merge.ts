import { emptyData, validateData, nextNumber, type Data } from '../domain.js';
export type ConflictChoice = 'local'|'remote';
export interface MergeResult { data:Data; conflicts:string[] }
export const equal = (a:unknown,b:unknown):boolean => JSON.stringify(a)===JSON.stringify(b);
/** Three-way merge: no clock-based winner. Concurrent edits of the same field require a choice. */
export function mergeData(base:Data, local:Data, remote:Data, choice?:ConflictChoice):MergeResult {
 base=structuredClone(base);local=structuredClone(local);remote=structuredClone(remote);
 const conflicts:string[]=[];
 function value(b:unknown,l:unknown,r:unknown,path:string):unknown {
  if(equal(l,r)||equal(b,r))return l;
  if(equal(b,l))return r;
  if(l&&r&&typeof l==='object'&&typeof r==='object'&&!Array.isArray(l)&&!Array.isArray(r)) {
   const out:Record<string,unknown>={},bb=(b||{}) as Record<string,unknown>,ll=l as Record<string,unknown>,rr=r as Record<string,unknown>;
   for(const key of new Set([...Object.keys(ll),...Object.keys(rr)])) {
    // These are counters/timestamps, not business fields; preserve the greatest observed value.
    if(['updatedAt','version'].includes(key)){out[key]=ll[key]!>rr[key]!?ll[key]:rr[key];continue;}
    out[key]=value(bb[key],ll[key],rr[key],path+'.'+key);
   }return out;
  }
  conflicts.push(path);return choice==='remote'?r:l;
 }
 function rows(key:'customers'|'devices'|'jobs'|'tips'|'stocks'|'attachments'):unknown[] {
  const b=new Map((base[key]||[]).map(x=>[x.id,x])),l=new Map((local[key]||[]).map(x=>[x.id,x])),r=new Map((remote[key]||[]).map(x=>[x.id,x]));
  return [...new Set([...r.keys(),...l.keys(),...b.keys()])].map(id=>value(b.get(id),l.get(id),r.get(id),key+'/'+id)).filter(x=>x!==undefined);
 }
 const out={...local,settings:value(base.settings,local.settings,remote.settings,'profil'),customers:rows('customers'),devices:rows('devices'),jobs:rows('jobs'),tips:rows('tips'),stocks:rows('stocks'),attachments:rows('attachments'),catalogImportedAt:[local.catalogImportedAt||'',remote.catalogImportedAt||''].sort().pop(),lastBackup:[local.lastBackup,remote.lastBackup].sort().pop()} as Data;
 // Offline devices can allocate the same human-readable number. Keep remote numbers stable.
 const used=new Set<string>();
 for(const j of out.jobs){if(used.has(j.number)){j.number=nextNumber(out,j.number.match(/^S-(\d{4})-/)?.[1]||new Date(j.createdAt).getUTCFullYear().toString());}used.add(j.number);}
 if(conflicts.length&&!choice)return {data:local,conflicts};
 return {data:validateData(out),conflicts};
}
export function syncPayload(data:Data):Data {const result=structuredClone(data);result.revision=0;return result;}
export const initialBase = ():Data=>emptyData();
