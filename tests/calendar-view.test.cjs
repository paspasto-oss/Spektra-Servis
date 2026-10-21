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
