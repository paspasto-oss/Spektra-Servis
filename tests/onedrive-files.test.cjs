const {test}=require('node:test');const assert=require('node:assert/strict');
const storage=new Map([['spektra-onedrive-account','owner']]),requests=[];let status=200;
global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
global.location={origin:'https://spektra-servis.vercel.app'};
global.window={msal:{PublicClientApplication:class{async initialize(){}getAllAccounts(){return [{homeAccountId:'unselected'},{homeAccountId:'owner',username:'test@example.test'}];}async acquireTokenSilent(){return {accessToken:'test-token'};}async clearCache(){}}}};
global.fetch=async(url,init)=>{requests.push({url,init});return {ok:status===200,status,json:async()=>url.endsWith('/approot')?{id:'folder',folder:{}}:init.method==='PUT'?{id:'item',size:init.body.size}:{'@microsoft.graph.downloadUrl':'https://files.example.test/signed'},blob:async()=>new Blob(['%PDF-test'])};};
const od=require('../.build/lib/onedrive.js');
test('resume selects only previously authorized account; attachment retry uses same path; download never forwards bearer',async()=>{
 await od.resumeOneDrive();assert.equal(od.oneDriveAccountId(),'owner');assert.equal(od.oneDriveState().connected,true);
 const file=new Blob(['%PDF-test']);await assert.rejects(()=>od.uploadAttachment(file,'file1','application/pdf','other'),/pôvodný/);
 assert.equal(await od.uploadAttachment(file,'file1','application/pdf','owner'),'item');const path=requests.at(-1).url;
 status=503;await assert.rejects(()=>od.uploadAttachment(file,'file1','application/pdf','owner'),/503/);status=200;
 await od.uploadAttachment(file,'file1','application/pdf','owner');assert.equal(requests.at(-1).url,path);
 const blob=await od.attachmentBlob('item','owner');assert.equal(await blob.text(),'%PDF-test');assert.equal(requests.at(-2).init.headers.Authorization,'Bearer test-token');assert.equal(requests.at(-1).init.headers,undefined);assert.equal(requests.at(-1).init.credentials,'omit');
});
