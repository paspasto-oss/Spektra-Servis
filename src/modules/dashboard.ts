import { type Data } from '../domain.js';
import { today } from '../lib/calendar.js';
import { button, type ViewState } from '../ui.js';
import { calendarPage } from './calendar-view.js';

export function dashboard(data: Data, state?: ViewState): string {
  const view: ViewState = state || { route: 'home', query: '', filter: '', customerTab: 'customers', selectedCustomer: '', date: today(), month: today().slice(0, 7), calendarMode: 'week', knowledgeTab: 'all', workspace: 'real' };
  return `<div class="home-planner"><nav class="home-shortcuts" aria-label="Rýchly prístup">${button('Servis', 'new-job', 'tool', 'btn primary')}${button('Cenová ponuka', 'route-quotes', 'euro', 'btn secondary')}${button('RS2', 'route-rs2', 'shield', 'btn secondary')}</nav>${calendarPage(data, { ...view, calendarMode: 'week' })}</div>`;
}
