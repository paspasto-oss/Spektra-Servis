import type { SupabaseClient } from '@supabase/supabase-js';
export interface PohodaStock {id:string;code:string|null;plu:string|null;name:string;unit:string|null;storage_name:string|null;quantity_available:number|null;quantity_issuable?:number|null;synced_at:string|null}
export interface StockPage {rows:PohodaStock[];count:number;loadedAt:string}
export const STOCK_PAGE_SIZE=50;
export function stockSearchTerms(query:string):string[]{return query.slice(0,160).replace(/[^\p{L}\p{N}\s.\-\/]/gu,' ').trim().split(/\s+/).filter(Boolean).slice(0,10);}
export async function queryPohodaStocks(client:SupabaseClient,search:string,page:number):Promise<StockPage>{
 if(!Number.isInteger(page)||page<0)throw Error('Neplatná strana.');
 let q=client.from('spektra_live_stocks').select('id,code,plu,name,unit,storage_name,quantity_available,quantity_issuable,synced_at',{count:'exact'}).eq('active',true);
 for(const word of stockSearchTerms(search))q=q.or(`code.ilike.%${word}%,plu.ilike.%${word}%,name.ilike.%${word}%`);
 const {data,error,count}=await q.order('name').order('id').range(page*STOCK_PAGE_SIZE,(page+1)*STOCK_PAGE_SIZE-1);
 if(error)throw Error('Zásoby sa nepodarilo načítať z API. Skontrolujte pripojenie a prihlásenie.');
 return {rows:(data||[]) as PohodaStock[],count:count||0,loadedAt:new Date().toISOString()};
}
