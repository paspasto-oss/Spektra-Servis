type CompanyResult={name:string;ico:string;dic:string;icDph:string;address:string};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
export async function companyByIco(raw:string):Promise<CompanyResult>{
 const ico=raw.replace(/\D/g,'');if(!/^\d{6,8}$/.test(ico))throw Error('IČO musí obsahovať 6 až 8 číslic.');
 const response=await fetch('https://api.subjekt.sk/v1/entity/'+encodeURIComponent(ico)+'?country=sk',{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
 if(response.status===404)throw Error('Firma s týmto IČO sa nenašla.');if(!response.ok)throw Error('Register firiem je dočasne nedostupný. Skúste znova alebo údaje vyplňte ručne.');
 const rawData=await response.json() as Record<string,unknown>;const data=(rawData.data&&typeof rawData.data==='object'?rawData.data:rawData) as Record<string,unknown>;
 const place=data.address&&typeof data.address==='object'?data.address as Record<string,unknown>:{};
 const street=[text(place.street),text(place.building_no)||text(place.number)].filter(Boolean).join(' ');const town=[text(place.zip)||text(place.postal_code),text(place.city)].filter(Boolean).join(' ');
 const address=text(data.formatted_address)||text(place.formatted)||[street,town].filter(Boolean).join(', ');
 const name=text(data.name)||text(data.business_name)||text(data.legal_name);if(!name)throw Error('Register vrátil neúplný záznam. Údaje vyplňte ručne.');
 return {name,ico:text(data.ico)||ico,dic:text(data.dic)||text(data.tax_id),icDph:text(data.ic_dph)||text(data.vat_id),address};
}
