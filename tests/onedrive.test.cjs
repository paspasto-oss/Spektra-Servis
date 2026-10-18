const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {emptyData}=require('../.build/domain.js');const {importBackup}=require('../.build/lib/backup.js');
const storage=new Map(),requests=[];let failure=0,authConfig,loginRequest,cleared=0;
global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
global.location={origin:'https://spektra-servis.vercel.app'};
const user={homeAccountId:'personal-account',username:'test@example.test'};
global.window={msal:{PublicClientApplication:class{constructor(c){authConfig=c;}async initialize(){}async loginPopup(r){loginRequest=r;return {account:user};}async acquireTokenSilent(){return {accessToken:'unit-test-token'};}async clearCache(){cleared++;}}}};
global.fetch=async(url,init)=>{requests.push({url,init});if(failure)return {ok:false,status:failure};if(url.endsWith('/approot'))return {ok:true,json:async()=>({id:'folder-id',folder:{}})};return {ok:true,json:async()=>({id:'backup-id',name:decodeURIComponent(new URL(url).pathname.split(':/')[1]),size:Buffer.byteLength(init.body)})};};
const od=require('../.build/lib/onedrive.js');
test('OneDrive connects through personal-account MSAL with minimal folder scope and persistent MSAL cache',async()=>{
 assert.throws(()=>od.validClientId('not-a-client-secret'));await od.saveOneDriveClientId('11111111-1111-4111-8111-111111111111');await od.connectOneDrive();
 assert.equal(authConfig.auth.authority,'https://login.microsoftonline.com/consumers');assert.equal(authConfig.cache.cacheLocation,'localStorage');assert.deepEqual(loginRequest.scopes,['https://graph.microsoft.com/Files.ReadWrite.AppFolder']);assert.equal(od.oneDriveState().connected,true);assert.equal(requests[0].url,'https://graph.microsoft.com/v1.0/me/drive/special/approot');
 assert.ok([...storage.values()].every(v=>!v.includes('unit-test-token')));
});
test('upload sends decryptable encrypted data only, requires a password and uses unique filenames',async()=>{
 const before=requests.length;await assert.rejects(()=>od.uploadOneDriveBackup(emptyData(),''),/heslo/);assert.equal(requests.length,before);
 const data=emptyData(),name=await od.uploadOneDriveBackup(data,'zaloha-test-123');const request=requests.at(-1);assert.equal(request.init.method,'PUT');assert.equal(request.init.headers.Authorization,'Bearer unit-test-token');assert.match(name,/^Spektra-zaloha-.*\.spektra$/);assert.notEqual(od.backupFilename(),od.backupFilename());assert.equal(request.init.body.includes('Pavol'),false);assert.deepEqual(await importBackup(request.init.body,'zaloha-test-123'),data);assert.equal(od.oneDriveState().lastFile,name);
});
test('failed upload is not reported as saved, disconnect clears access without deleting files',async()=>{
 const previous=od.oneDriveState().lastFile;failure=507;await assert.rejects(()=>od.uploadOneDriveBackup(emptyData(),'zaloha-test-123'),/miesta/);assert.equal(od.oneDriveState().lastFile,previous);failure=0;
 await od.disconnectOneDrive();assert.equal(od.oneDriveState().connected,false);assert.ok(cleared>0);await assert.rejects(()=>od.uploadOneDriveBackup(emptyData(),'zaloha-test-123'),/pripojte/);assert.equal(requests.some(r=>r.init.method==='DELETE'),false);
});
test('dedicated redirect bridge is published and service worker does not replace callback with app shell',()=>{
 const html=fs.readFileSync('dist/onedrive-callback.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');assert.match(html,/msalRedirectBridge.broadcastResponseToMainFrame/);assert.doesNotMatch(html,/assets\/app.js/);assert.ok(sw.indexOf("endsWith('/onedrive-callback.html')")<sw.indexOf("if(req.mode==='navigate')"));assert.ok(fs.statSync('dist/vendor/msal-browser.min.js').size>1000);assert.ok(fs.statSync('dist/vendor/msal-redirect-bridge.min.js').size>1000);
});
