const {test}=require('node:test');
const assert=require('node:assert/strict');
const {daySlots,calendarPage}=require('../.build/modules/calendar-view.js');
const {emptyData}=require('../.build/domain.js');
const job=(id,start,duration)=>({id,start,duration,status:'planned',kind:'servis',customerId:'c',title:'Servis',number:id});
test('Overlapping visits share columns; adjacent visits reuse full width',()=>{
 const slots=daySlots([job('a','2026-10-19T06:00:00Z',120),job('b','2026-10-19T07:00:00Z',60),job('c','2026-10-19T08:00:00Z',60)],'2026-10-19');
 assert.deepEqual(slots.map(s=>[s.lane,s.columns]),[[0,2],[1,2],[0,1]]);
});
test('Visit across midnight splits at local day boundary',()=>{
 const j=job('a','2026-10-19T21:00:00Z',120);
 assert.deepEqual(daySlots([j],'2026-10-19').map(s=>[s.start,s.end]),[[1380,1440]]);
 assert.deepEqual(daySlots([j],'2026-10-20').map(s=>[s.start,s.end]),[[0,60]]);
 assert.equal(daySlots([job('b','2026-10-19T21:00:00Z',60)],'2026-10-20').length,0);
});
test('Calendar escapes customer names and shows proportional duration and editor link',()=>{
 const d=emptyData(); d.customers=[{id:'c',name:'<Pavol>'}];d.jobs=[job('a','2026-10-19T06:00:00Z',60)];
 const html=calendarPage(d,{date:'2026-10-19',month:'2026-10',calendarMode:'week'});
 assert.ok(html.includes('&lt;Pavol&gt;'));assert.ok(html.includes('height:72px'));assert.ok(html.includes('data-action="edit-job"'));assert.ok(html.includes('08:00–09:00'));
});

test('Calendar menu exposes day, week and month; day view renders only the selected date',()=>{
 const d=emptyData(),state={date:'2026-10-29',month:'2026-10',calendarMode:'day'};
 const html=calendarPage(d,state);
 for(const mode of ['day','week','month'])assert.ok(html.includes('data-mode="'+mode+'"'));
 assert.ok(html.includes('class="calendar-menu"'));assert.ok(html.includes('--calendar-days:1'));
 assert.equal((html.match(/data-action="select-day"/g)||[]).length,1);
 assert.ok(html.includes('data-date="2026-10-29"'));
 assert.ok(!html.includes('data-date="2026-10-28"'));
 assert.ok(html.includes('aria-pressed="true" class="active">Deň'));
});
test('Week and month calendar retain seven days and six month rows',()=>{
 const d=emptyData(),state={date:'2026-10-29',month:'2026-10',calendarMode:'week'};
 assert.equal((calendarPage(d,state).match(/data-action="select-day"/g)||[]).length,7);
 const month=calendarPage(d,{...state,calendarMode:'month'});
 assert.equal((month.match(/class="day /g)||[]).length,42);
 assert.ok(!month.includes('class="time-calendar"'));
});
