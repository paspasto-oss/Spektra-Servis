import type { SupabaseClient } from '@supabase/supabase-js';
export interface PohodaStock {id:string;code:string|null;plu:string|null;name:string;unit:string|null;storage_name:string|null;quantity_available:number|null;quantity_issuable?:number|null;synced_at:string|null}
export interface StockPage {rows:PohodaStock[];count:number;loadedAt:string}
export const STOCK_PAGE_SIZE=50;
export function stockSearchTerms(query:string):string[]{return query.slice(0,160).replace(/[^\p{L}\p{N}\s.\-\/]/gu,' ').trim().split(/\s+/).filter(Boolean).slice(0,10);}
export async function queryPohodaStocks(client:SupabaseClient,search:string,page:number,category=''):Promise<StockPage>{
 if(!Number.isInteger(page)||page<0)throw Error('Neplatná strana.');
 let q=client.from('spektra_stock_browser').select('id,code,plu,name,unit,storage_name,quantity_available,quantity_issuable,synced_at',{count:'exact'}).eq('active',true);
 if(category===UNASSIGNED_CATEGORY)q=q.is('category_path',null);
 else if(category)q=q.or(stockCategoryFilter(category));
 for(const word of stockSearchTerms(search))q=q.or(`code.ilike.%${word}%,plu.ilike.%${word}%,name.ilike.%${word}%`);
 const {data,error,count}=await q.order('name').order('id').range(page*STOCK_PAGE_SIZE,(page+1)*STOCK_PAGE_SIZE-1);
 if(error)throw Error('Zásoby sa nepodarilo načítať z API. Skontrolujte pripojenie a prihlásenie.');
 return {rows:(data||[]) as PohodaStock[],count:count||0,loadedAt:new Date().toISOString()};
}

export interface StockCategory {category_path:string|null;card_count:number}
export interface StockCategoryNode {path:string;parent:string;label:string;count:number}
export const UNASSIGNED_CATEGORY='__unassigned__';
export function stockCategoryTree(categories:StockCategory[]):StockCategoryNode[]{
 const nodes=new Map<string,StockCategoryNode>();
 for(const c of categories){
  if(!c.category_path){const n=nodes.get(UNASSIGNED_CATEGORY)||{path:UNASSIGNED_CATEGORY,parent:'',label:'Bez členenia',count:0};n.count+=c.card_count;nodes.set(n.path,n);continue;}
  const parts=c.category_path.split('/');let parent='';
  for(const label of parts){const path=parent?parent+'/'+label:label;const n=nodes.get(path)||{path,parent,label,count:0};n.count+=c.card_count;nodes.set(path,n);parent=path;}
 }
 return [...nodes.values()].sort((a,b)=>a.path.localeCompare(b.path,'sk'));
}
export async function queryStockCategories(client:SupabaseClient):Promise<StockCategory[]>{
 // Page through groups too: category count is not limited by the API's default row cap.
 const rows:StockCategory[]=[];
 for(let start=0;;start+=500){
  const {data,error}=await client.from('spektra_stock_categories').select('category_path,card_count').order('category_path',{nullsFirst:true}).range(start,start+499);
  if(error)throw Error('Členenie sa nepodarilo načítať. Skúste Obnoviť.');
  rows.push(...(data||[]) as StockCategory[]);if(!data||data.length<500)return rows;
 }
}
export function stockCategoryFilter(category:string):string{
 // Quote PostgREST values; escape LIKE metacharacters so category names stay literal.
 const prefix=category.replace(/[\\%_*]/g,c=>'\\'+c);
 return `category_path.eq.${JSON.stringify(category)},category_path.like.${JSON.stringify(prefix+'/%')}`;
}
