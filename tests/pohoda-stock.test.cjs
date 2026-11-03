const {test}=require('node:test');const assert=require('node:assert/strict');
const {queryPohodaStocks,stockSearchTerms}=require('../.build/lib/pohoda-stock.js');
const {stocksPage}=require('../.build/modules/stocks.js');
test('reads active stock through API with stable pagination and search',async()=>{const calls=[];const q={};for(const key of ['select','eq','or','order'])q[key]=(...args)=>{calls.push([key,...args]);return q;};q.range=async(...args)=>{calls.push(['range',...args]);return {data:[{id:'1',quantity_available:0}],error:null,count:51};};const c={from:table=>{assert.equal(table,'spektra_stock_browser');return q;}};const result=await queryPohodaStocks(c,'Rehau 16',1);assert.equal(result.count,51);assert.equal(result.rows[0].quantity_available,0);assert.deepEqual(calls.at(-1),['range',50,99]);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='active'&&c[2]===true));assert.equal(calls.filter(c=>c[0]==='or').length,2);assert.deepEqual(stockSearchTerms('a%,(b)'),['a','b']);});
test('API error does not become empty successful inventory',async()=>{const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({error:{message:'offline'}})};await assert.rejects(queryPohodaStocks({from:()=>q},'',0));});
test('inventory shows POHODA quantities and source timestamp, never local movements',()=>{const result={rows:[{id:'1',name:'<Rúra>',code:'A',quantity_available:0,quantity_issuable:2,unit:'ks',storage_name:'Rajec',synced_at:'2026-10-21T05:26:23Z'},{id:'2',name:'X',quantity_available:null}],count:2,loadedAt:new Date().toISOString()};const html=stocksPage({result,loading:false,error:'',page:0},'',true,false);assert.match(html,/0 ks/);assert.match(html,/Na výdaj: 2 ks/);assert.match(html,/ID POHODA: 1/);assert.match(html,/Neznáme množstvo/);assert.match(html,/21\. 10\. 2026/);assert.match(html,/&lt;Rúra&gt;/);assert.ok(!html.includes('stock-edit'));assert.ok(!html.includes('import-commerce'));assert.match(stocksPage({result:null,loading:false,error:'',page:0},'',false,false),/Prihlásiť sa/);});
const {stockCategoryTree,stockCategoryFilter,UNASSIGNED_CATEGORY,queryStockCategories}=require('../.build/lib/pohoda-stock.js');
const {stockCategoryControls}=require('../.build/modules/stocks.js');
test('category tree includes parent stock and descendants without mixing similar prefixes',()=>{
 const tree=stockCategoryTree([{category_path:'Predaj/Tvarovky',card_count:2},{category_path:'Predaj/Tvarovky/Mosadz',card_count:3},{category_path:'Predaj/Tvarovky extra',card_count:7},{category_path:null,card_count:1}]);
 assert.equal(tree.find(n=>n.path==='Predaj').count,12);
 assert.equal(tree.find(n=>n.path==='Predaj/Tvarovky').count,5);
 assert.equal(tree.find(n=>n.path===UNASSIGNED_CATEGORY).count,1);
});
test('category filter quotes commas and selects exact parent or descendants with slash boundary',async()=>{
 const calls=[];const q={};for(const k of ['select','eq','or','is','order'])q[k]=(...a)=>{calls.push([k,...a]);return q};q.range=async()=>({data:[],count:0});
 await queryPohodaStocks({from:()=>q},'koleno',0,'Predaj/Kanál, odpad');
 assert.ok(calls.some(c=>c[0]==='or'&&c[1]==='category_path.eq."Predaj/Kanál, odpad",category_path.like."Predaj/Kanál, odpad/%"'));
 assert.equal(calls.filter(c=>c[0]==='or').length,2);
 calls.length=0;await queryPohodaStocks({from:()=>q},'',0,UNASSIGNED_CATEGORY);assert.ok(calls.some(c=>c[0]==='is'&&c[1]==='category_path'&&c[2]===null));
 assert.ok(stockCategoryFilter('Predaj/50%').includes('50\\\\%'));
});
test('cascading controls show selected ancestors, child counts and escaped labels',()=>{
 const html=stockCategoryControls({category:'Predaj/Tvarovky',categories:[{category_path:'Predaj/Tvarovky/<Mosadz>',card_count:3},{category_path:'Predaj/Iné',card_count:2}]});
 assert.equal((html.match(/<select /g)||[]).length,3);assert.match(html,/&lt;Mosadz&gt; \(3\)/);assert.match(html,/Predaj → Tvarovky/);assert.match(html,/Zrušiť členenie/);
});
test('category query reads beyond API row limits and fails visibly',async()=>{
 const ranges=[];const q={select:()=>q,order:()=>q,range:async(a,b)=>{ranges.push([a,b]);return {data:a===0?Array(500).fill({category_path:'A',card_count:1}):[{category_path:'B',card_count:1}]}}};
 assert.equal((await queryStockCategories({from:()=>q})).length,501);assert.deepEqual(ranges,[[0,499],[500,999]]);
 q.range=async()=>({error:{message:'offline'}});await assert.rejects(queryStockCategories({from:()=>q}),/Členenie/);
});
