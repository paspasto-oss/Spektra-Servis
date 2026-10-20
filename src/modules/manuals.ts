import { e, button, field } from '../ui.js';
import { searchManuals } from '../lib/manual-search.js';
import { listManuals, writeManual, type StoredManual } from '../lib/manual-store.js';

let manuals: StoredManual[] = [], status = '', loading = false, loaded = false, filter = '';
let refresh: () => void = () => {};
const urls = new Map<string,string>();
const BUILTIN_MANUALS = [
  { title: 'MINI NIKE 24 3 E — návod na inštaláciu a obsluhu', manufacturer: 'Immergas', model: 'MINI NIKE 24 3 E (cca 2012)', url: './manuals/immergas-mini-nike-24-3e-manual.pdf', note: 'Svorky 38–39: vonkajšia sonda · svorky 40–41: CAR V2 alebo beznapäťový ON/OFF termostat po odstránení prepojky X40.' },
  { title: 'ELITE RX-105 / RX-136 — montážny návod', manufacturer: 'HydroSoft', model: 'ELITE RX-105, RX-136', url: './manuals/hydrosoft-elite-rx105-rx136-montazny-navod.pdf', note: 'Montáž, prvé spustenie a servisné nastavenie zmäkčovača.' },
  { title: 'ELITE — používateľský manuál a záručný list', manufacturer: 'HydroSoft', model: 'ELITE', url: './manuals/hydrosoft-elite-pouzivatelsky-manual.pdf', note: 'Obsluha, regenerácia, údržba a záručné podmienky.' },
  { title: 'ETR-868 — slovenský návod', manufacturer: 'ENGO Controls', model: 'ETR-868', url: './manuals/engo-etr-868-manual-sk.pdf', note: 'Zapojenie a nastavenie regulátora.' },
  { title: 'RAY V5 — technický návod', manufacturer: 'Protherm', model: 'RAY V5', url: './manuals/protherm-ray-v5-manual.pdf', note: 'Inštalácia, nastavenie a servis elektrického kotla.' },
  { title: 'MRM55 — návod odsávacej stanice', manufacturer: 'Wipcool', model: 'MRM55', url: './manuals/wipcool-mrm55-manual.pdf', note: 'Obsluha a servis odsávacej stanice chladiva.' }
];
const pdfUrl = (manual: StoredManual): string => {
  let url = urls.get(manual.id);
  if (!url) { url = URL.createObjectURL(manual.file); urls.set(manual.id,url); }
  return url;
};
export function setManualRefresh(fn: () => void): void { refresh = fn; }
export async function refreshManuals(): Promise<void> { manuals = await listManuals(); loaded = true; }
export function manualsPage(query: string, demo: boolean): string {
  if (demo) return '<div class="inline-note">Návody nahrávajte vo vlastnom pracovnom priestore. Ukážkové údaje sú oddelené.</div>';
  if (!loaded && !loading) {
    loading = true;
    void refreshManuals().catch(err => { status = String(err.message); loaded = true; }).finally(() => { loading = false; refresh(); });
  }
  const hits = searchManuals(manuals, query, filter);
  const builtInCards = BUILTIN_MANUALS.map(manual => `<article class="panel manual-hit"><span class="tag">${e(manual.manufacturer)} · ${e(manual.model)}</span><h3>${e(manual.title)}</h3><p>${e(manual.note)}</p><div class="card-actions"><a class="btn secondary" href="${e(manual.url)}" target="_blank" rel="noopener noreferrer">Otvoriť PDF návod</a></div></article>`).join('');
  const controls = `<div class="inline-note">PDF sa spracúva a uchováva iba v tomto prehliadači. Nie je súčasťou JSON zálohy zákaziek. Originály si ponechajte; na inom zariadení ich nahrajte znova.</div>
  <details class="manual-upload"><summary>Nahrať servisný návod PDF</summary><form id="manual-form"><div class="form-grid">${field('Názov návodu *','manualTitle','','text','required maxlength="200"')}${field('Výrobca *','manualManufacturer','','text','required maxlength="100"')}${field('Model / modelový rad *','manualModel','','text','required maxlength="200"')}<label class="field"><span>PDF (najviac 50 MB / 600 strán)</span><input type="file" name="manualFile" accept="application/pdf,.pdf" required></label></div><button class="btn primary" type="submit" ${loading ? 'disabled' : ''}>${loading ? 'Spracúvam…' : 'Nahrať a pripraviť vyhľadávanie'}</button></form></details>
  <p role="status" aria-live="polite" id="manual-status">${e(status)}</p>
  <label class="field"><span>Hľadať v návode pre konkrétny model</span><select id="manual-filter"><option value="">Všetky návody</option>${manuals.map(m=>`<option value="${e(m.id)}" ${filter===m.id?'selected':''}>${e(m.manufacturer+' · '+m.model+' · '+m.title)}</option>`).join('')}</select></label>
`;
  return `${query.trim() ? '' : controls}
  ${query.trim() ? `<p>${hits.length} nájdených strán${hits.length>50?' · zobrazených prvých 50':''}.</p><div class="manual-results">${hits.slice(0,50).map(h=>`<article class="panel manual-hit"><span class="tag">${e(h.manual.manufacturer)} · ${e(h.manual.model)}</span><h3>${e(h.manual.title)} — PDF strana ${h.page.number}</h3><pre>${e(h.excerpt)}</pre><a class="btn secondary" href="${pdfUrl(h.manual as StoredManual)}#page=${h.page.number}" target="_blank" rel="noopener noreferrer">Otvoriť PDF na strane ${h.page.number}</a></article>`).join('') || '<div class="inline-note">V nahratých návodoch sa nenašla zhoda. Skúste kratší výraz alebo iný model. Riešenie neodhadujeme.</div>'}</div>` : `<div class="knowledge-grid">${builtInCards}${manuals.map(m=>`<article class="panel manual-hit"><span class="tag">${e(m.manufacturer)} · ${e(m.model)}</span><h3>${e(m.title)}</h3><p>${m.pages.length} strán · ${(m.bytes/1048576).toFixed(1)} MB</p>${m.blankPages ? `<p>${m.blankPages} strán bez rozpoznaného textu. Na týchto stranách vyhľadávanie nefunguje; môžu vyžadovať OCR.</p>`:''}<div class="card-actions"><a class="btn secondary" href="${pdfUrl(m)}" download="${e(m.filename)}">Stiahnuť PDF</a>${button('Odstrániť','manual-delete','','btn ghost',`data-id="${e(m.id)}"`)}</div></article>`).join('')}</div>`}
  ${query.trim() ? controls : ''}
  <p class="tiny muted">Výsledok je úryvok zo zdroja, nie automatická diagnóza. Overte presný model a celý postup v PDF. Číslo PDF strany sa môže líšiť od tlačeného číslovania; niektoré mobilné prehliadače otvoria PDF od začiatku.</p>`;
}
export function manualFilter(value: string): void { filter = value; refresh(); }
export async function deleteManual(id: string): Promise<void> {
  if (loading) throw new Error('Počkajte na dokončenie spracovania.');
  const manual = manuals.find(m=>m.id===id);
  if (!manual || !confirm('Odstrániť návod „'+manual.title+'“ z tohto zariadenia?')) return;
  await writeManual(id); const url=urls.get(id); if(url) URL.revokeObjectURL(url); urls.delete(id);
  if(filter===id)filter=''; await refreshManuals(); refresh();
}
export async function uploadManual(form: HTMLFormElement): Promise<void> {
  if (loading) return;
  if (location.protocol==='file:') throw new Error('PDF nahrávajte v online aplikácii Spektra Servis.');
  const fields = new FormData(form), file = fields.get('manualFile');
  if (!(file instanceof File) || !file.size || file.size>50*1048576) throw new Error('Vyberte PDF do 50 MB.');
  const title=String(fields.get('manualTitle')||'').trim(), manufacturer=String(fields.get('manualManufacturer')||'').trim(), model=String(fields.get('manualModel')||'').trim();
  if(!title || !manufacturer || !model) throw new Error('Vyplňte názov, výrobcu a model.');
  const bytes = await file.arrayBuffer();
  if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-')) throw new Error('Súbor nemá platnú hlavičku PDF.');
  loading=true;
  const submit=form.querySelector<HTMLButtonElement>('[type=submit]'); if(submit)submit.disabled=true;
  const progress=(text:string) => { status=text; const el=document.querySelector('#manual-status'); if(el)el.textContent=text; };
  let task: any;
  try {
    progress('Načítavam PDF…');
    const digest = await crypto.subtle.digest('SHA-256',bytes);
    const id=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    if(manuals.some(m=>m.id===id)) throw new Error('Tento PDF súbor už v knižnici je.');
    const moduleUrl=new URL('./vendor/pdf.mjs',location.href).href;
    const pdfjs=await import(moduleUrl);
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',location.href).href;
    task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',location.href).href,cMapUrl:new URL('./vendor/cmaps/',location.href).href,cMapPacked:true});
    const pdf=await task.promise;
    if(pdf.numPages>600)throw new Error('Návod má viac než 600 strán. Rozdeľte ho na menšie súbory.');
    const pages=[]; let blankPages=0;
    for(let number=1;number<=pdf.numPages;number++) {
      progress(`Spracúvam stranu ${number} / ${pdf.numPages}…`);
      const page=await pdf.getPage(number), content=await page.getTextContent();
      const text=content.items.filter((x:any)=>typeof x.str==='string').map((x:any)=>x.str+(x.hasEOL?'\n':' ')).join('');
      if(text.trim().length<15)blankPages++;
      pages.push({number,text}); page.cleanup();
    }
    if(blankPages===pages.length)throw new Error('PDF nemá vyhľadateľný text. Tento sken potrebuje OCR, ktoré zatiaľ nie je pripojené.');
    await writeManual({id,title,manufacturer,model,pages,blankPages,file,filename:file.name,bytes:file.size,createdAt:new Date().toISOString()});
    await refreshManuals(); filter=id; progress(`Návod uložený. Vyhľadávanie je pripravené v ${pages.length-blankPages} z ${pages.length} strán.`); form.reset();
  } catch(error) { status=error instanceof Error ? error.message : 'Spracovanie PDF zlyhalo.'; throw new Error(status); }
  finally { if(task)await task.destroy().catch(()=>{}); loading=false; if(submit)submit.disabled=false; refresh(); }
}
