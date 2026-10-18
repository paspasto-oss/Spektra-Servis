const {test}=require('node:test');
const assert=require('node:assert/strict');
const {searchManuals}=require('../.build/lib/manual-search.js');
const manual={id:'a',title:'Návod',manufacturer:'Výrobca',model:'Model A',blankPages:0,pages:[{number:12,text:'F.022\nNízky tlak vo vykurovacom okruhu.'},{number:13,text:'F.0220\nIná porucha.'},{number:14,text:'Čerpadlo\nnie je v prevádzke'}]};
test('manual search normalizes fault punctuation without matching longer codes',()=>{
 for(const query of ['F22','f22','F022','F.022','F.22','f 022','F 22','F00022']) assert.deepEqual(searchManuals([manual],query).map(x=>x.page.number),[12]);
});
test('manual search ignores accents and searches across lines',()=>{
 assert.deepEqual(searchManuals([manual],'nizky tlak').map(x=>x.page.number),[12]);
 assert.deepEqual(searchManuals([manual],'cerpadlo prevadzke').map(x=>x.page.number),[14]);
});
test('manual search respects model selection and returns no guessed match',()=>{
 const other={...manual,id:'b',model:'Model B'};
 assert.deepEqual(searchManuals([manual,other],'F022','b').map(x=>x.manual.id),['b']);
 assert.equal(searchManuals([manual],'F999').length,0);
 assert.equal(searchManuals([manual],'').length,0);
});

test('short fault query matches zero-padded source but not a longer code',()=>{
 assert.deepEqual(searchManuals([manual],'F22').map(x=>x.page.number),[12]);
 assert.deepEqual(searchManuals([manual],'F220').map(x=>x.page.number),[13]);
 assert.equal(searchManuals([manual],'F2').length,0);
});
