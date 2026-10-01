export function overlaps(a,b,gap=0){return a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;}
export function layoutCards(count,width,height,w,h,random=Math.random){
 const padding=12,gap=14;let best=null;
 for(let cols=1;cols<=count;cols++){const rows=Math.ceil(count/cols),cw=(width-padding*2)/cols,ch=(height-padding*2)/rows;if(cw>=w+gap&&ch>=h+gap){const score=Math.min(cw-w,ch-h);if(!best||score>best.score)best={cols,rows,cw,ch,score};}}
 if(!best)throw new Error('畫布空間不足');
 const cells=Array.from({length:best.cols*best.rows},(_,i)=>i);
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 return cells.slice(0,count).map(i=>({x:padding+(i%best.cols)*best.cw+gap/2+random()*(best.cw-w-gap),y:padding+Math.floor(i/best.cols)*best.ch+gap/2+random()*(best.ch-h-gap),w,h}));
}
export class FoodWebModel{
 constructor(){this.edges=[];this.selected=null;this.pending=null;}
 select(name){this.selected=name;if(!this.pending){this.pending=name;return 'first';}if(this.pending===name)return 'self';const from=this.pending;this.pending=null;if(this.edges.some(e=>e.from===from&&e.to===name))return 'duplicate';this.edges.push({from,to:name});return 'added';}
 cancel(){this.pending=null;this.selected=null;}
 undo(){return this.edges.pop();}
 clear(){this.edges=[];this.cancel();}
}
function boundary(rect,dx,dy){if(Math.abs(dx)+Math.abs(dy)<0.001)return {x:rect.x+rect.w/2,y:rect.y-5};const factor=1/Math.max(Math.abs(dx)/(rect.w/2+5),Math.abs(dy)/(rect.h/2+5));return {x:rect.x+rect.w/2+dx*factor,y:rect.y+rect.h/2+dy*factor};}
export function arrowGeometry(a,b,reverse){
 const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2,len=Math.hypot(dx,dy)||1;
 const bend=reverse?24:0;
 const cx=(a.x+a.w/2+b.x+b.w/2)/2-dy/len*bend,cy=(a.y+a.h/2+b.y+b.h/2)/2+dx/len*bend;
 const start=boundary(a,cx-a.x-a.w/2,cy-a.y-a.h/2),end=boundary(b,cx-b.x-b.w/2,cy-b.y-b.h/2);
 return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}
