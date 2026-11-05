const {test}=require('node:test'),a=require('node:assert/strict');
const {mergeSharedContact,sameContactDetails}=require('../.build/lib/shared-contact.js');
const base={id:'1',name:'Test',company:'',ico:'',dic:'',icDph:'',phone:'0900111111',email:'old@example.test',address:'Rajec 1',notes:'',archived:false,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};
test('concurrent edits in different agendas merge fields even when the remote timestamp is newer',()=>{
 const r=mergeSharedContact({...base,phone:'0900222222'},{...base,email:'new@example.test',updatedAt:'2026-02-01T00:00:00Z'},base);
 a.deepEqual(r.conflicts,[]);a.equal(r.contact.phone,'0900222222');a.equal(r.contact.email,'new@example.test');
});
test('concurrent changes to the same phone require a choice, including intentional deletion',()=>{
 const local={...base,phone:''},remote={...base,phone:'0900333333'};
 const r=mergeSharedContact(local,remote,base);a.deepEqual(r.conflicts,['adresar/1/phone']);
 a.equal(mergeSharedContact(local,remote,base,'local').contact.phone,'');
 a.equal(mergeSharedContact(local,remote,base,'remote').contact.phone,'0900333333');
});
test('unchanged fields and explicit clearing do not resurrect stale details',()=>{
 a.equal(mergeSharedContact({...base,phone:''},base,base).contact.phone,'');
 a.equal(sameContactDetails(base,{...base,updatedAt:'2026-02-01T00:00:00Z'}),true);
});
