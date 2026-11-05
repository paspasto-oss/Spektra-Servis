const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {embeddedApp}=require('../.build/modules/apps.js');
test('background render preserves the live quote or RS2 frame and its unsaved form',()=>{
 const app=fs.readFileSync('.build/app.js','utf8');const start=app.indexOf('function render() {'),end=app.indexOf('\n}',start)+2;
 for(const route of ['quotes','rs2']){
  const frame={dataset:{agenda:route},draft:'unfinished form'},root={};let statuses=0;
  Object.defineProperty(root,'innerHTML',{set(){throw Error('iframe was destroyed');}});
  const context={ready:true,state:{route},scheduleStocks(){},showSyncStatus(){statuses++;},root,document:{querySelector:selector=>selector.includes('data-agenda')?frame:null}};
  vm.runInNewContext(app.slice(start,end)+';render();',context);
  a.equal(statuses,1);a.equal(frame.draft,'unfinished form');a.ok(embeddedApp(route).includes('data-agenda="'+route+'"'));
 }
});
