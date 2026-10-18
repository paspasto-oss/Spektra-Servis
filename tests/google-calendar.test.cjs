const {test}=require('node:test');const assert=require('node:assert/strict');
const google=require('../.build/lib/google-calendar.js');
const job={id:'job-123',number:'2026-001',title:'Servis',address:'Rajec',issue:'Kontrola',start:'2026-10-20T07:00:00.000Z',duration:60,status:'planned'};
test('Google IDs are stable, valid base32hex and differ between jobs',async()=>{
 const a=await google.googleEventId(job.id);assert.match(a,/^[0-9a-v]{5,1024}$/);assert.equal(a,await google.googleEventId(job.id));assert.notEqual(a,await google.googleEventId('other'));
});
test('Google payload preserves UTC and Bratislava zone without financial details',()=>{
 const body=google.googleEventBody({...job,amount:100,payment:'paid'},{name:'Test'});
 assert.equal(body.start.dateTime,job.start);assert.equal(body.end.dateTime,'2026-10-20T08:00:00.000Z');assert.equal(body.start.timeZone,'Europe/Bratislava');assert.equal(body.summary,'Servis — Test');assert.equal(body.attendees,undefined);assert.equal(body.amount,undefined);
 assert.throws(()=>google.googleEventBody({...job,start:''}));assert.throws(()=>google.googleEventBody({...job,status:'cancelled'}));
});
test('foreign, cancelled and guest events are never overwritten',()=>{
 assert.throws(()=>google.assertOwnedEvent({},job.id));
 const owned={extendedProperties:{private:{spektraApp:'servis-v1',spektraJobId:job.id}}};
 assert.doesNotThrow(()=>google.assertOwnedEvent(owned,job.id));
 assert.throws(()=>google.assertOwnedEvent({...owned,status:'cancelled'},job.id));
 assert.throws(()=>google.assertOwnedEvent({...owned,attendees:[{email:'guest@example.test'}]},job.id));
});
test('OAuth and event flow create once, update with etag, cancel without write',async(t)=>{
 const old={window:global.window,localStorage:global.localStorage,fetch:global.fetch};
 t.after(()=>{google.disconnectGoogle();Object.assign(global,old);});
 global.localStorage={getItem:()=> '123456-test.apps.googleusercontent.com'};
 global.window={google:{accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:config=>({requestAccessToken:()=>queueMicrotask(()=>config.callback({access_token:'test-token',expires_in:3600}))})}}}};
 const requests=[];let event=null;
 global.fetch=async(url,options)=>{
  requests.push({url,...options});
  if(url.includes('calendarList'))return new Response(JSON.stringify({items:[{id:'owner@example.test',summary:'Test kalendár',primary:true,accessRole:'owner'}]}));
  if(options.method==='GET')return event?new Response(JSON.stringify(event)):new Response('',{status:404});
  const body=JSON.parse(options.body);
  if(options.method==='POST'){assert.equal(event,null);event={...body,etag:'"v1"'};}
  if(options.method==='PATCH'){assert.equal(options.headers['If-Match'],'"v1"');event={...event,...body,etag:'"v2"'};}
  return new Response(JSON.stringify(event));
 };
 await google.connectGoogle();assert.equal(google.googleState().selected,'');google.selectGoogleCalendar('owner@example.test');
 assert.equal(await google.syncGoogleJob(job,undefined,()=>true),true);
 assert.equal(await google.syncGoogleJob({...job,title:'Nový názov'},undefined,()=>true),true);
 assert.equal(event.summary,'Nový názov — ');
 assert.equal(await google.syncGoogleJob(job,undefined,()=>false),false);
 assert.deepEqual(requests.filter(r=>r.method!=='GET').map(r=>r.method),['POST','PATCH']);
 assert.ok(requests.filter(r=>r.method!=='GET').every(r=>r.url.endsWith('sendUpdates=none')));
});
