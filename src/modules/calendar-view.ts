import { type Data, type Job, KINDS } from '../domain.js';
import { addDays, localDate, today, dateLabel, endTime, timeLabel } from '../lib/calendar.js';
import { heading, button, e, empty, jobCard, type ViewState } from '../ui.js';
export function calendarPage(data: Data, state: ViewState): string {
  const first = state.calendarMode === 'week' ? state.date : state.month + '-01';
  const weekday = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const start = addDays(first, -weekday), days = Array.from({ length: state.calendarMode === 'week' ? 7 : 42 }, (_, i) => addDays(start, i));
  const scheduled = data.jobs.filter(j => j.start && j.status !== 'cancelled');
  const daily = scheduled.filter(j => localDate(j.start).startsWith(state.date)).sort((a, b) => a.start.localeCompare(b.start));
  return heading('PLÁNOVANIE', 'Kalendár', 'Jeden technik. Prehľadné termíny. Časové pásmo Bratislava.', button('Prepojenie Google', 'route-settings', 'calendar', 'btn secondary') + button('Naplánovať výjazd', 'new-job-day', 'plus', 'btn primary')) +
  `<div class="calendar-layout google-calendar"><section class="panel"><div class="calendar-toolbar"><div class="calendar-month">${button('Predchádzajúci', 'calendar-prev', 'left', 'icon-btn') }<h2>${e(dateLabel(state.calendarMode === 'week' ? state.date : state.month + '-01', { month: 'long', year: 'numeric' }))}</h2>${button('Nasledujúci', 'calendar-next', 'right', 'icon-btn')}</div><div class="segmented"><button data-action="calendar-mode" data-mode="week" class="${state.calendarMode === 'week' ? 'active' : ''}">Týždeň</button><button data-action="calendar-mode" data-mode="month" class="${state.calendarMode === 'month' ? 'active' : ''}">Mesiac</button></div>${button('Dnes', 'calendar-today', '', 'btn ghost')}</div>
  ${state.calendarMode === 'week' ? weekGrid(data, days, state.date) : `<div class="calendar-grid"><div class="daynames">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(d => `<span>${d}</span>`).join('')}</div><div class="days ${state.calendarMode === 'week' ? 'week' : ''}">${days.map(day => { const count = scheduled.filter(j => localDate(j.start).startsWith(day)).length; return `<button data-action="new-job-slot" data-date="${day}" data-time="09:00" aria-label="${e(dateLabel(day))}, ${count} udalostí" aria-pressed="${day === state.date}" class="day ${day === state.date ? 'selected' : ''} ${day === today() ? 'today' : ''} ${day.slice(0, 7) !== state.month && state.calendarMode === 'month' ? 'other-month' : ''}"><span>${Number(day.slice(8))}</span>${count ? `<span class="day-dots" aria-hidden="true">${Array.from({ length: Math.min(count, 3) }, () => '<i></i>').join('')}</span><small>${count} ${count === 1 ? 'výjazd' : 'výjazdy'}</small>` : ''}</button>`; }).join('')}</div></div>`}<div class="calendar-footer"><span><i class="legend-dot"></i> Výjazd v aplikácii Spektra</span>${button('Export kalendára .ics', 'export-calendar', 'download', 'btn ghost')}</div></section>
  <section class="panel agenda"><div class="panel-head"><div><span class="eyebrow">AGENDA DŇA</span><h2>${e(dateLabel(state.date, { weekday: 'long', day: 'numeric', month: 'numeric' }))}</h2></div></div>${daily.length ? daily.map(j => jobCard(j, data, true)).join('') : empty('Žiadny výjazd', 'Vyberte deň alebo naplánujte novú zákazku.', button('Pridať termín', 'new-job-day', 'plus'), 'calendar')}</section></div>
  <div class="inline-note">Google Kalendár: termín otvoríte tlačidlom v detaile zákazky a uložíte ho ručne. Automatická synchronizácia ani odosielanie upozornení zatiaľ nie sú zapnuté. Import .ics nemusí v každom kalendári preniesť pripomienku; skontrolujte ju po importe.</div>`;
}

interface Slot { job: Job; start: number; end: number; lane: number; columns: number }
const minute = (local: string): number => Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
export function daySlots(jobs: Job[], day: string): Slot[] {
  const slots: Slot[] = jobs.filter(j => j.start && j.status !== 'cancelled').flatMap(job => {
    const start = localDate(job.start), end = localDate(endTime(job));
    if (start.slice(0,10) > day || end.slice(0,10) < day || (end.slice(0,10) === day && minute(end) === 0)) return [];
    const from = start.slice(0,10) < day ? 0 : minute(start);
    const to = end.slice(0,10) > day ? 1440 : minute(end);
    return [{job, start:from, end:Math.max(from + 5, to), lane:0, columns:1}];
  }).sort((a,b) => a.start-b.start || b.end-a.end);
  let group: Slot[] = [], until = -1;
  function finish(): void {
    const ends: number[] = [];
    for (const s of group) { let lane=ends.findIndex(end => end <= s.start); if(lane<0) lane=ends.length; ends[lane]=s.end; s.lane=lane; }
    for (const s of group) s.columns=ends.length;
  }
  for (const slot of slots) { if(slot.start >= until) { finish(); group=[]; until=-1; } group.push(slot); until=Math.max(until,slot.end); }
  finish(); return slots;
}
function weekGrid(data: Data, days: string[], selected: string): string {
  const slots = days.map(day => daySlots(data.jobs, day));
  const all = slots.flat();
  const from = Math.min(7*60, ...all.map(s => Math.floor(s.start/60)*60));
  const to = Math.max(19*60, ...all.map(s => Math.ceil(s.end/60)*60));
  const height = (to-from)*1.2;
  const hours = Array.from({length:(to-from)/60}, (_,i)=>from/60+i);
  return `<div class="time-calendar" tabindex="0" aria-label="Týždenný kalendár, posúvaním zobrazíte ďalšie hodiny a dni"><div class="time-week">
    <div class="time-head"><span>Čas</span>${days.map(day=>`<button type="button" data-action="select-day" data-date="${day}" aria-pressed="${day===selected}" class="${day===today()?'is-today':''} ${day===selected?'is-selected':''}"><small>${e(dateLabel(day,{weekday:'short'}))}</small><b>${Number(day.slice(8))}</b></button>`).join('')}</div>
    <div class="time-body" style="height:${height}px"><div class="time-axis">${hours.map(h=>`<span style="top:${(h*60-from)*1.2}px">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>
    ${days.map((day,i)=>`<div class="time-day ${day===today()?'is-today':''}">${Array.from({length:(to-from)/30},(_,n)=>{ const m=from+n*30, time=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); return `<button type="button" class="time-slot" data-action="new-job-slot" data-date="${day}" data-time="${time}" aria-label="Naplánovať výjazd ${e(dateLabel(day))} o ${time}" title="Naplánovať výjazd o ${time}" style="top:${n*36}px"></button>`; }).join('')}${slots[i]!.map(s=>{
      const c=data.customers.find(c=>c.id===s.job.customerId);
      const customer=c?.name || c?.company || 'Bez zákazníka';
      const label=`${customer} · ${s.job.title} · ${timeLabel(s.job.start)}–${timeLabel(endTime(s.job))} · ${s.job.duration} min`;
      return `<button type="button" class="time-event event-${e(s.job.kind)} ${s.end-s.start<30?'short-event':''}" data-action="edit-job" data-id="${e(s.job.id)}" title="${e(label)}" aria-label="${e(label)}" style="top:${(s.start-from)*1.2}px;height:${(s.end-s.start)*1.2}px;left:calc(${s.lane*100/s.columns}% + 2px);width:calc(${100/s.columns}% - 4px)"><strong>${e(customer)}</strong><span>${e(timeLabel(s.job.start))}–${e(timeLabel(endTime(s.job)))} · ${s.job.duration} min</span><span>${e(s.job.title)}</span></button>`;
    }).join('')}</div>`).join('')}</div></div></div><div class="time-legend">${Object.entries(KINDS).map(([kind,label])=>`<span><i class="event-${kind}"></i>${label}</span>`).join('')}<span>Výška bloku = trvanie výjazdu</span></div>`;
}
