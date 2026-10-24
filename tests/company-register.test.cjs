const {test}=require('node:test');const a=require('node:assert/strict');
const {companyByIco}=require('../.build/lib/company-register.js');
test('IČO lookup maps Slovak company identifiers and address',async()=>{
 const old=global.fetch;global.fetch=async()=>({ok:true,status:200,json:async()=>({ico:'31322832',name:'SLOVNAFT, a.s.',address:{street:'Vlčie hrdlo',building_no:'1',city:'Bratislava',zip:'82412'},dic:'2020372640',ic_dph:'SK7120001713'})});
 try{a.deepEqual(await companyByIco('31 322 832'),{name:'SLOVNAFT, a.s.',ico:'31322832',dic:'2020372640',icDph:'SK7120001713',address:'Vlčie hrdlo 1, 82412 Bratislava'});}finally{global.fetch=old;}
});
test('IČO lookup rejects malformed identifiers before network',async()=>{await a.rejects(()=>companyByIco('abc'),/6 až 8/);});
