const {test}=require('node:test'),assert=require('node:assert/strict');
const {calendarSwipeDirection:direction}=require('../.build/lib/calendar-swipe.js');
const start={x:300,y:300,at:0,left:0,maxLeft:350,width:390,mode:'day'};
test('Calendar lists days/months in the finger direction and ignores vertical, short and multi-axis movement',()=>{
 assert.equal(direction(start,100,310,300),'next');
 assert.equal(direction({...start,x:80},280,300,300),'prev');
 assert.equal(direction({...start,mode:'month'},100,300,300),'next');
 assert.equal(direction(start,290,100,300),null);
 assert.equal(direction(start,270,300,300),null);
 assert.equal(direction(start,100,100,300),null);
 assert.equal(direction(start,100,300,1800),null);
});
test('Week pans within its days and lists adjacent weeks only from the corresponding edge',()=>{
 const g={...start,mode:'week'};
 assert.equal(direction(g,100,300,300),null);
 assert.equal(direction({...g,left:350},100,300,300),'next');
 assert.equal(direction({...g,x:80},280,300,300),'prev');
 assert.equal(direction({...g,left:100,x:80},280,300,300),null);
});
