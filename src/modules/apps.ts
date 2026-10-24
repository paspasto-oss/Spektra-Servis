import {APPS} from '../lib/commerce.js';
import {e,heading} from '../ui.js';
export function embeddedApp(kind:'quotes'|'rs2'):string{
 const title=kind==='quotes'?'Cenové ponuky':'RS2 – revízne správy';
 return heading('SPEKTRA · JEDNA APLIKÁCIA',title,kind==='quotes'?'Tvorba ponúk, obhliadky a PDF dokumenty.':'Revízne správy a spoločný adresár zákazníkov.')+`<section class="panel app-module"><div class="module-bar"><strong>${e(title)}</strong><a class="btn secondary" href="${e(APPS[kind])}" target="_blank" rel="noopener noreferrer">Otvoriť na celej obrazovke</a></div><iframe class="module-frame" src="${e(APPS[kind])}" title="${e(title)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></section>`;
}

const SPP_LATEST={
 name:'SPP revízna správa – aktuálna pracovná verzia',
 modified:'11. 10. 2026, 12:55',
 url:'https://chatgpt.com/api/library/files/libfile_663ccd0055e081919d958d8695ad8c3d/download'
};

export function sppRevisionPage():string{
 return heading('SPEKTRA · JEDNA APLIKÁCIA','SPP – revízne správy','Posledná pracovná verzia Excelu pre odbornú prehliadku a tlakovú skúšku plynového zariadenia.')+`<section class="panel app-module"><div class="module-bar"><div><strong>Posledná verzia Excelu</strong><p class="tiny muted">Aktualizované ${e(SPP_LATEST.modified)}</p></div><a class="btn primary" href="${e(SPP_LATEST.url)}" target="_blank" rel="noopener noreferrer">Otvoriť Excel</a></div><div class="module-grid"><div class="module-item"><span class="tiny muted">SÚBOR</span><h3>${e(SPP_LATEST.name)}</h3><p>Aktuálna vyplnená revízia SPP. Pri ďalšej zákazke najskôr vytvorte kópiu a až potom nahraďte údaje zákazníka.</p></div><div class="module-item"><span class="tiny muted">OBSAH</span><h3>4 pracovné časti</h3><p>SOPAS, zápis o tlakovej skúške, údaje SPP a kontrola, evidencia revíznych správ.</p></div><div class="module-item"><span class="tiny muted">OCHRANA ÚDAJOV</span><h3>Súkromný prístup</h3><p>Súbor zostáva v účte a nie je uložený vo verejnej časti aplikácie. Pri otvorení môže byť potrebné prihlásenie.</p></div></div><div class="form-error" role="note">Ide o vyplnenú zákaznícku revíziu so stavom „pracovný návrh“. Pred vydaním správy skontrolujte merania, doklady, číslo správy a odborný záver revízneho technika.</div></section>`;
}
