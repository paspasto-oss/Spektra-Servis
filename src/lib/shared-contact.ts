import type { Customer } from '../domain.js';
import type { ConflictChoice } from './sync-merge.js';

export const contactFields = ['name','company','ico','dic','icDph','phone','email','address','notes','archived'] as const;
export function sharedContact(row: any): Customer {
 return {id:row.id,name:row.name||'',company:row.company||'',ico:row.ico||'',dic:row.dic||'',icDph:row.ic_dph||'',phone:row.phone||'',email:row.email||'',address:row.address||[row.street,row.city].filter(Boolean).join(', '),notes:row.notes||'',archived:!!row.archived,createdAt:row.created_at,updatedAt:row.updated_at};
}
/** Compare business fields, not timestamps or the app that last wrote the record. */
export function sameContactDetails(a:Customer,b:Customer):boolean {
 return contactFields.every(key=>(a[key]??'')===(b[key]??''));
}
export function mergeSharedContact(local:Customer, remote:Customer, base?:Customer, choice?:ConflictChoice):{contact:Customer;conflicts:string[]} {
 const contact={...local,id:remote.id},conflicts:string[]=[];
 const newer=Date.parse(remote.updatedAt)>Date.parse(local.updatedAt)?remote:local;
 for(const key of contactFields){
  const l=local[key]??'',r=remote[key]??'',b=base?.[key]??'';
  let value:unknown;
  if(l===r)value=l;
  else if(base&&l===b)value=r;
  else if(base&&r===b)value=l;
  else if(!base){
   // First connection: older modules may only have saved a partial contact.
   value=key==='archived'?newer[key]:(newer[key]||local[key]||remote[key]||'');
  }else{
   conflicts.push('adresar/'+remote.id+'/'+key);
   value=choice==='remote'?r:l;
  }
  Object.assign(contact,{[key]:value});
 }
 contact.createdAt=remote.createdAt||local.createdAt;
 contact.updatedAt=newer.updatedAt;
 return {contact,conflicts};
}
