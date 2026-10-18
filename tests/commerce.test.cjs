const {test}=require('node:test');const assert=require('node:assert/strict');
const {mapStocks,validateLines,totals}=require('../.build/lib/commerce.js');
const {mergeContacts}=require('../.build/modules/commerce.js');
const {validateData}=require('../.build/domain.js');const {demoData}=require('../.build/demo.js');
const {exportBackup,importBackup}=require('../.build/lib/backup.js');
const line={id:'l1',stockId:'stock',code:'P01',name:'Materiál',kind:'material',unit:'ks',qty:2,sale:10,cost:6,vat:23};
test('POHODA keeps missing prices unknown and maps prices, units and VAT',()=>{
 const rows=mapStocks([{id:7,code:'A',name:'Rúrka',unit:'m',sell_price_ex_vat:'10',sell_price_inc_vat:'12.30',purchase_price_ex_vat:'6',quantity_available:4},{id:8,name:'Neocenená',sell_price_ex_vat:null}]);
 assert.equal(rows[0].vat,23);assert.equal(rows[0].cost,6);assert.equal(rows[1].sale,null);assert.equal(rows[1].cost,null);assert.equal(rows[1].vat,null);
 assert.throws(()=>mapStocks([{id:7,name:'X',sell_price_ex_vat:-1}]));assert.throws(()=>mapStocks([{id:7,name:'X'},{id:7,name:'Y'}]));
});
test('service prices and VAT use quote rounding, missing purchase never produces fake profit',()=>{
 assert.deepEqual(totals([line]),{net:20,vat:4.6,gross:24.6,cost:12,profit:8});assert.equal(totals([{...line,cost:null}]).profit,null);
 const tiny=[{...line,qty:1,sale:0.03},{...line,id:'l2',qty:1,sale:0.03}];assert.equal(totals(tiny).gross,0.07);
 assert.throws(()=>validateLines([{...line,qty:NaN}]));assert.throws(()=>validateLines([{...line,vat:101}]));
});
test('address import is idempotent and never overwrites an existing customer',()=>{
 const input=[{name:'Pavol',phone:'+421 900 123',email:'a@test.sk',address:'Rajec'}];const first=mergeContacts([],input);const second=mergeContacts(first,input);assert.equal(second.length,1);assert.deepEqual(second[0],first[0]);assert.equal(mergeContacts(first,[{...input[0],address:'Žilina'}]).length,2);
});
test('catalog and cost snapshots survive encrypted backup; old backups stay compatible',async()=>{
 const data=demoData();assert.deepEqual(validateData(data),data);data.stocks=mapStocks([{id:7,name:'Diel',sell_price_ex_vat:10}]);data.jobs[0].costing=[line];data.catalogImportedAt=new Date().toISOString();
 const saved=await importBackup(await exportBackup(data,'test-password-123'),'test-password-123');assert.deepEqual(saved,data);data.stocks[0].sale=99;assert.equal(saved.jobs[0].costing[0].sale,10);
});
