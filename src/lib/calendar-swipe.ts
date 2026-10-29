type Direction='prev'|'next';
interface Gesture {x:number;y:number;at:number;left:number;maxLeft:number;width:number;mode:string}
export function calendarSwipeDirection(start:Gesture,x:number,y:number,at:number):Direction|null{
 const dx=x-start.x,dy=y-start.y;
 if(at-start.at>1200||Math.abs(dx)<Math.min(90,Math.max(48,start.width*.16))||Math.abs(dx)<Math.abs(dy)*1.4)return null;
 if(start.mode==='week'&&((dx<0&&start.left<start.maxLeft-2)||(dx>0&&start.left>2)))return null;
 return dx<0?'next':'prev';
}
export function installCalendarSwipe(doc:Document,navigate:(direction:Direction)=>void):void{
 let start:Gesture|null=null,surface:HTMLElement|null=null,suppressClickUntil=0;
 const edge=(g:Gesture,dx:number)=>g.mode!=='week'||(dx<0?g.left>=g.maxLeft-2:g.left<=2);
 doc.addEventListener('touchstart',event=>{
  start=null;surface=null;if(event.touches.length!==1)return;
  const target=event.target instanceof Element?event.target:null,grid=target?.closest<HTMLElement>('.time-calendar,.calendar-grid');
  if(!grid||!target?.closest('.calendar-shell'))return;
  const touch=event.touches[0]!;surface=grid;start={x:touch.clientX,y:touch.clientY,at:Date.now(),left:grid.scrollLeft,maxLeft:grid.scrollWidth-grid.clientWidth,width:grid.clientWidth,mode:grid.dataset.mode||'month'};
 },{passive:true});
 doc.addEventListener('touchmove',event=>{
  if(!start||event.touches.length!==1){start=null;return;}
  const t=event.touches[0]!,dx=t.clientX-start.x,dy=t.clientY-start.y;
  if(Math.abs(dx)>16&&Math.abs(dx)>Math.abs(dy)*1.4&&edge(start,dx)&&event.cancelable)event.preventDefault();
 },{passive:false});
 doc.addEventListener('touchend',event=>{
  const gesture=start,grid=surface;start=null;surface=null;
  if(!gesture||!grid?.isConnected||event.touches.length||event.changedTouches.length!==1)return;
  const touch=event.changedTouches[0]!,direction=calendarSwipeDirection(gesture,touch.clientX,touch.clientY,Date.now());
  if(!direction)return;if(event.cancelable)event.preventDefault();suppressClickUntil=Date.now()+500;navigate(direction);
 },{passive:false});
 doc.addEventListener('touchcancel',()=>{start=null;surface=null;},{passive:true});
 doc.addEventListener('click',event=>{if(Date.now()<suppressClickUntil&&(event.target as Element)?.closest('.time-calendar,.calendar-grid')){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
}
