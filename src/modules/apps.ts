import {APPS} from '../lib/commerce.js';
import {e,heading} from '../ui.js';
export function embeddedApp(kind:'quotes'|'rs2'):string{
 const title=kind==='quotes'?'Cenové ponuky':'RS2 – revízne správy';
 return heading('SPEKTRA · JEDNA APLIKÁCIA',title,kind==='quotes'?'Tvorba ponúk, obhliadky a PDF dokumenty.':'Revízne správy a spoločný adresár zákazníkov.')+`<section class="panel app-module"><div class="module-bar"><strong>${e(title)}</strong><a class="btn secondary" href="${e(APPS[kind])}" target="_blank" rel="noopener noreferrer">Otvoriť na celej obrazovke</a></div><iframe class="module-frame" src="${e(APPS[kind])}" title="${e(title)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></section>`;
}

export function sppRevisionPage():string{
 return heading('SPEKTRA · JEDNA APLIKÁCIA','SPP – revízne správy','HTML formulár podľa poslednej Excel revízie: SOPAS, tlaková skúška, automatické kontroly, evidencia a PDF.')+`<section class="panel app-module"><iframe class="module-frame spp-frame" src="./spp-app.html" title="SPP – revízne správy" loading="eager" referrerpolicy="same-origin"></iframe></section>`;
}
