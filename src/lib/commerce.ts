export interface Stock { id: string; code: string; name: string; unit: string; sale: number | null; cost: number | null; vat: number | null; available: number | null; syncedAt: string }
export interface CostLine { id: string; stockId: string; code: string; name: string; unit: string; kind: 'material' | 'labor' | 'transport'; qty: number; sale: number; cost: number | null; vat: number }
const text = (v: unknown, max=400): string => { if(typeof v !== 'string' || v.length>max) throw Error('Neplatný text položky.'); return v; };
const num = (v: unknown, max=1000000): number => { if(typeof v !== 'number' || !Number.isFinite(v) || v<0 || v>max) throw Error('Neplatná cena alebo množstvo.'); return v; };
const optional = (v: unknown): number | null => v === null || v === undefined || v === '' ? null : num(Number(v));
export function validateStocks(value: unknown): Stock[] {
 if(!Array.isArray(value) || value.length>20000) throw Error('Neplatný sklad.');
 const rows=value.map((s): Stock => ({id:text(s.id,100), code:text(s.code), name:text(s.name), unit:text(s.unit,40),sale:s.sale===null?null:num(s.sale),cost:s.cost===null?null:num(s.cost),vat:s.vat===null?null:num(s.vat,100),available:s.available===null?null:(typeof s.available==='number'&&Number.isFinite(s.available)&&Math.abs(s.available)<=1000000?s.available:(()=>{throw Error('Neplatný stav skladu.');})()),syncedAt:text(s.syncedAt,40)}));
 if(rows.some(s=>!s.id || !s.name) || new Set(rows.map(s=>s.id)).size!==rows.length) throw Error('Sklad obsahuje chýbajúce alebo duplicitné karty.'); return rows;
}
export function mapStocks(value: unknown): Stock[] {
 if(!Array.isArray(value)) throw Error('Chýba zoznam skladu.');
 return validateStocks(value.filter(s=>s.active!==false).map(s=>{const sale=optional(s.sell_price_ex_vat), gross=optional(s.sell_price_inc_vat); const rate=sale!==null&&sale>=1&&gross!==null ? Math.round((gross/sale-1)*100) : null; return {id:String(s.id||s.fingerprint||''),code:String(s.code||s.plu||''),name:String(s.name||''),unit:String(s.unit||'ks'),sale,cost:optional(s.purchase_price_ex_vat),vat:rate!==null&&rate>=0&&rate<=100?rate:null,available:s.quantity_available==null?null:Number(s.quantity_available),syncedAt:String(s.synced_at||'')};}));
}
export function validateLines(value: unknown): CostLine[] {
 if(!Array.isArray(value)||value.length>500) throw Error('Neplatná kalkulácia.');
 return value.map(s=>{if(!['material','labor','transport'].includes(s.kind)) throw Error('Neplatný druh položky.');return {id:text(s.id,100),stockId:text(s.stockId,100),code:text(s.code),name:text(s.name),unit:text(s.unit,40),kind:s.kind,qty:num(s.qty),sale:num(s.sale),cost:s.cost===null?null:num(s.cost),vat:num(s.vat,100)};});
}
// Match Cenové ponuky: quantity at 3 decimals, price at 4 decimals;
// round net once per VAT rate and VAT from that rounded net.
export function totals(lines: CostLine[]): {net:number;vat:number;gross:number;cost:number|null;profit:number|null} {
 const groups=new Map<number,bigint>();let costs=0n;
 for(const l of lines){const qty=BigInt(Math.round(l.qty*1000));groups.set(l.vat,(groups.get(l.vat)||0n)+BigInt(Math.round(l.sale*10000))*qty);costs+=BigInt(Math.round((l.cost??0)*10000))*qty;}
 let net=0n,vat=0n;for(const [rate,scaled] of groups){const n=(scaled+50000n)/100000n;net+=n;vat+=(n*BigInt(Math.round(rate*100))+5000n)/10000n;}
 const cost=(costs+50000n)/100000n,known=lines.every(l=>l.cost!==null);
 return {net:Number(net)/100,vat:Number(vat)/100,gross:Number(net+vat)/100,cost:known?Number(cost)/100:null,profit:known?Number(net-cost)/100:null};
}
export const APPS={quotes:'https://cenov-ponuky.vercel.app/mobile-v4/app.html',rs2:'https://rs-2-peach.vercel.app/'};
export function openIntegration(target: keyof typeof APPS, operation: 'catalog'|'prefill', payload?: unknown): Promise<unknown> {
 const nonce=crypto.randomUUID(), url=new URL(APPS[target]);url.searchParams.set('spektraBridge',nonce);
 const popup=window.open(url.href,'spektra-'+nonce,'popup=false');
 if(!popup) return Promise.reject(Error('Povoľte otvorenie nového okna pre prepojenie aplikácií.'));
 return new Promise((resolve,reject)=>{
  let sent=false;
  const cleanup=()=>{clearTimeout(timeout);clearInterval(poll);window.removeEventListener('message',receive);};
  const timeout=setTimeout(()=>{cleanup();reject(Error('Prepojenie vypršalo. Prihláste sa v otvorenej aplikácii a skúste prenos znova.'));},300000);
  const poll=setInterval(()=>{if(popup.closed){cleanup();reject(Error('Okno prepojenia bolo zatvorené.'));}},1000);
  function receive(event:MessageEvent){if(event.origin!==url.origin||event.source!==popup||event.data?.nonce!==nonce)return;
   if(event.data.type==='spektra-ready'&&!sent){sent=true;popup!.postMessage({type:'spektra-request',nonce,operation,payload},url.origin);}
   if(event.data.type==='spektra-result'){cleanup();if(event.data.error)reject(Error(String(event.data.error)));else resolve(event.data.payload);}
  }
  window.addEventListener('message',receive);
 });
}
