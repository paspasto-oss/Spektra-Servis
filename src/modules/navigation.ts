import {button,e,icon} from '../ui.js';
export const MAIN_AGENDAS=[['jobs','Zákazky','Priebeh práce a dokumenty','jobs'],['calendar','Kalendár','Termíny a výjazdy','calendar'],['quotes','Cenové ponuky','Ponuky a kalkulácie','euro'],['customers','Adresár','Zákazníci a zariadenia','customers'],['commerce','Zásoby','Materiál a sklad','archive']] as const;
export function mainNavigation(route:string):string {
 return `<nav class="agenda-nav" aria-label="Hlavné agendy">${MAIN_AGENDAS.map(([id,label,hint,symbol])=>`<button type="button" data-action="route-${id}" title="${e(hint)}" class="agenda-button ${(route===id||(id==='calendar'&&route==='home'))?'selected':''}" ${(route===id||(id==='calendar'&&route==='home'))?'aria-current="page"':''}>${icon(symbol)}<span><strong>${label}</strong><small>${hint}</small></span></button>`).join('')}</nav>`;
}
export function moreNavigation():string {
 return `<details class="more-navigation"><summary>${icon('menu')} Viac</summary><nav aria-label="Ďalšie možnosti">${button('Knižnica znalostí','route-knowledge','knowledge')}${button('Súbory / OneDrive','route-files','upload')}${button('Synchronizácia a zálohy','route-settings','settings')}${button('Inštalovať aplikáciu','install','download')}</nav></details>`;
}
export function revisionPage():string {
 return `<div class="page-heading"><div><div class="eyebrow">REVÍZIE</div><h1>Vyberte revíziu</h1><p>Otvorte príslušnú agendu a pokračujte vo svojich správach.</p></div></div><div class="agenda-choices">${button('RS2 – revízne správy','route-rs2','shield','agenda-choice')}${button('SPP – plyn a tlakové skúšky','route-spp','file','agenda-choice')}</div>`;
}
export function agendaOptions(route:string,filter:string):string {
 if(route==='jobs')return `<nav class="agenda-options" aria-label="Možnosti zákaziek">${([['open','Rozpracované'],['done','Dokončené'],['','Všetky']] as const).map(([value,label])=>button(label,'jobs-view','','btn '+(value===filter?'primary':'secondary'),`data-filter="${e(value)}"`)).join('')}${button('Revízie RS2 / SPP','route-revisions','shield')}</nav>`;
 if(['revisions','rs2','spp'].includes(route))return `<nav class="agenda-options" aria-label="Revízne agendy">${([['revisions','Revízie','shield'],['rs2','RS2',''],['spp','SPP','']] as const).map(([id,label,symbol])=>button(label,'route-'+id,symbol,'btn '+(route===id?'primary':'secondary'),route===id?'aria-current="page"':'')).join('')}</nav>`;
 return '';
}

