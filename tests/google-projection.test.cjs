const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');
function fixture(){
 let owner='user1',calls=0,result={},failure=false;
 const filename=path.resolve(__dirname,'../.build/lib/google-sync.js');const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
 m.require=name=>name==='./cloud.js'?{cloudUser:()=>owner,googleServerRequest:async()=>{calls++;if(failure)throw Error('Offline');return result;}}:require(path.resolve(path.dirname(filename),name));
 m._compile(fs.readFileSync(filename,'utf8'),filename);
 return {g:m.exports,setOwner:x=>owner=x,setResult:x=>result=x,setFailure:x=>failure=x,calls:()=>calls};
}
test('calendar projection shows Google time once and leaves stored job data untouched',()=>{
 const {g}=fixture(),ev={id:'event1',summary:'Google servis',location:'Rajec',start:{dateTime:'2026-12-01T09:00:00Z'},end:{dateTime:'2026-12-01T10:00:00Z'}};
 Object.assign(g.googleSyncState(),{connected:true,calendarId:'calendar1',events:[ev],links:[{job_id:'job1',calendar_id:'calendar1',event_id:'event1',event_snapshot:ev}]});
 const original={jobs:[{id:'job1',start:'2026-12-01T08:00:00Z',duration:60,title:'Servis',amount:123}]};const projected=g.googleCalendarData(original);
 assert.equal(projected.jobs.length,1);assert.equal(projected.jobs[0].start,'2026-12-01T09:00:00.000Z');assert.equal(projected.jobs[0].amount,123);assert.equal(original.jobs[0].start,'2026-12-01T08:00:00Z');
 g.googleSyncState().links=[];assert.equal(g.googleCalendarData({jobs:[]}).jobs[0].id,'google_event1');assert.equal(original.jobs.length,1);
});
test('failed event refresh preserves previous data and throttles automatic rerender retries',async()=>{
 const f=fixture(),g=f.g;Object.assign(g.googleSyncState(),{connected:true,calendarId:'calendar1',events:[{id:'old'}]});f.setFailure(true);
 await assert.rejects(g.loadGoogleEvents('2026-12-01','2026-12-31'),/Offline/);
 await g.loadGoogleEvents('2026-12-01','2026-12-31');assert.equal(f.calls(),1);assert.equal(g.googleSyncState().events[0].id,'old');assert.equal(g.googleSyncState().loading,false);
 f.setFailure(false);f.setResult({events:[{id:'fresh'}],error:''});await g.loadGoogleEvents('2026-12-01','2026-12-31',true);assert.equal(g.googleSyncState().events[0].id,'fresh');
 f.setOwner('user2');assert.equal(g.googleSyncState().events.length,0);assert.equal(g.googleSyncState().connected,false);
});
