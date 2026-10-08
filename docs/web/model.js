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
 remove(edge){const index=this.edges.indexOf(edge);if(index<0)return null;return this.edges.splice(index,1)[0];}
 clear(){this.edges=[];this.cancel();}
}
function boundary(rect,dx,dy){
 const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;
 if(Math.hypot(dx,dy)<0.001)return {x:cx,y:cy};
 const factor=1/Math.max(Math.abs(dx)/(rect.w/2),Math.abs(dy)/(rect.h/2));
 return {x:cx+dx*factor,y:cy+dy*factor};
}
export function arrowGeometry(a,b,reverse){
 const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;
 const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
 const bend=reverse?Math.min(24,len/4):0;
 const cx=(ax+bx)/2-dy/len*bend,cy=(ay+by)/2+dx/len*bend;
 let start=boundary(a,cx-ax,cy-ay),end=boundary(b,cx-bx,cy-by);
 // If bounds overlap, clipped endpoints can cross and reverse the arrow.
 // Fall back to an interior segment that always progresses from source to target.
 if((end.x-start.x)*dx+(end.y-start.y)*dy<=0){
  start={x:ax+dx*.35,y:ay+dy*.35};end={x:ax+dx*.65,y:ay+dy*.65};
 }
 return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

// Preserve existing cards first; use the nearest available grid slots only if necessary.
export function expandLayout(names,old,width,height,w,h){
 const clamp=(n,max)=>Math.max(0,Math.min(max,n)), result=new Map(), placed=[];
 const existing=names.filter(n=>old.has(n)), added=names.filter(n=>!old.has(n));
 for(const name of existing){const p=old.get(name),q={x:clamp(p.x+(p.w-w)/2,width-w),y:clamp(p.y+(p.h-h)/2,height-h),w,h};
  if(placed.some(a=>overlaps(a,q)))break;result.set(name,q);placed.push(q);
 }
 if(result.size===existing.length){
  for(const name of added){
   const xs=new Set([0,width-w]),ys=new Set([0,height-h]);
   for(const p of placed){xs.add(clamp(p.x-w-1,width-w));xs.add(clamp(p.x+p.w+1,width-w));ys.add(clamp(p.y-h-1,height-h));ys.add(clamp(p.y+p.h+1,height-h));}
   const choices=[];for(const x of xs)for(const y of ys){const q={x,y,w,h};if(placed.every(p=>!overlaps(q,p)))choices.push(q);}
   choices.sort((a,b)=>a.y-b.y||a.x-b.x);const q=choices[0];if(!q)break;result.set(name,q);placed.push(q);
  }
  if(result.size===names.length)return result;
 }
 // A guaranteed non-overlapping grid, assigned by proximity to the student's positions.
 const slots=layoutCards(names.length,width,height,w,h,()=>.5);result.clear();
 for(const name of [...existing,...added]){
  const p=old.get(name);let best=0;
  if(p)for(let i=1;i<slots.length;i++)if((slots[i].x-p.x)**2+(slots[i].y-p.y)**2<(slots[best].x-p.x)**2+(slots[best].y-p.y)**2)best=i;
  result.set(name,slots.splice(best,1)[0]);
 }
 return result;
}
