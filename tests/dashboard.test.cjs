const {test}=require('node:test');
const assert=require('node:assert/strict');
const {dashboard}=require('../.build/modules/dashboard.js');
const {emptyData}=require('../.build/domain.js');
test('Home always shows the selected week with visits and quick actions',()=>{
 const data=emptyData();
 data.customers=[{id:'c',name:'Pavol'}];
 data.jobs=[{id:'j',start:'2026-10-29T08:00:00Z',duration:60,status:'planned',kind:'servis',customerId:'c',title:'Servis kotla',number:'1'}];
 const html=dashboard(data,{date:'2026-10-29',month:'2026-10',calendarMode:'month'});
 assert.ok(html.includes('data-mode="week"'));
 assert.ok(html.includes('Servis kotla'));
 assert.ok(html.includes('data-id="j"'));
 for(const action of ['new-job','route-quotes','route-rs2'])assert.ok(html.includes('data-action="'+action+'"'));
 assert.ok(!html.includes('Dobrý deň'));
 assert.ok(!html.includes('stats'));
});
