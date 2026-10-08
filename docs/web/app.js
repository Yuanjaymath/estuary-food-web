import {loadSpecies,loadSpeciesImage,appendInline} from './data.js';
import {FoodWebModel,layoutCards,overlaps,arrowGeometry,expandLayout} from './model.js';
const $=id=>document.getElementById(id),model=new FoodWebModel(),positions=new Map(),elements=new Map();let species=[],drag=null,initialized=false,resizeTimer;
let W=117.5,H=107.5;
const fixedCard="水中的氣體陽光和養分";
const activityOne=new Set(['水中的氣體陽光和養分','浮游植物','浮游動物','橈腳類','水筆仔','珠螺','花蛤','鵝茗荷','雙扇股窗蟹','彈塗魚','午仔魚','小燕鷗']);
let allSpecies=[],activity=1;const savedPositions=new Map();
function switchActivity(next){
 if(!initialized||next===activity)return;
 if(drag)endDrag(true);
 for(const [name,p] of positions)savedPositions.set(name,{...p});
 const target=next===1?allSpecies.filter(s=>activityOne.has(s.name)):allSpecies;
 const view=$('viewport'),width=view.clientWidth,height=view.clientHeight;
 const previous=species;species=target;
 const max=capacity(width,height),percent=Math.min(requestedSize,max);
 let layout;
 try{const w=117.5*percent/100,h=107.5*percent/100;layout=expandLayout(target.map(s=>s.name),savedPositions,width,height,w,h);layout=nearbyLayout(width,height,w,h,layout);if(!layout)throw new Error("空間不足");}
 catch(error){species=previous;status('空間不足，請擴大視窗再切換活動。');return;}
 activity=next;setCardSize(percent);$('card-size').max=Math.max(65,max);
 positions.clear();for(const [name,p] of layout){positions.set(name,p);savedPositions.set(name,{...p});place(name);}
 for(const [name,el] of elements)el.hidden=!positions.has(name);
 model.cancel();selectedEdge=null;update();updateLoadingProgress();
 $('activity-1').setAttribute('aria-pressed',String(next===1));$('activity-2').setAttribute('aria-pressed',String(next===2));
 status(`活動${next}：${species.length}項圖卡，所有已建立的連線均已保留。`);
}
$('activity-1').addEventListener('click',()=>switchActivity(1));
$('activity-2').addEventListener('click',()=>switchActivity(2));
let selectedEdge=null;
const svgNS='http://www.w3.org/2000/svg';
function status(message){$('status').textContent=message;}
function update(){
 if(selectedEdge&&!model.edges.includes(selectedEdge))selectedEdge=null;
 $('delete-edge').disabled=!selectedEdge;
 for(const [name,el] of elements){el.classList.toggle('selected',model.selected===name);el.classList.toggle('pending',model.pending===name);el.setAttribute('aria-pressed',String(model.selected===name));}
 $('count').textContent=`${model.edges.length} 條連線`;$('undo').disabled=!model.edges.length;$('clear').disabled=!model.edges.length;$('cancel').disabled=!model.selected&&!model.pending;
 renderEdges();
}
function renderEdges(){
 const paths=document.createDocumentFragment();
 for(const edge of model.edges){if(!positions.has(edge.from)||!positions.has(edge.to))continue;const a=imageBounds(edge.from),b=imageBounds(edge.to);const active=model.selected===edge.from||model.selected===edge.to,color=active?'blue':'yellow';const path=document.createElementNS(svgNS,'path');path.setAttribute('d',arrowGeometry(a,b,model.edges.some(e=>e.from===edge.to&&e.to===edge.from)));path.setAttribute('stroke',selectedEdge===edge?'#ff9d54':active?'#56b5ff':'#f4d351');path.setAttribute('marker-end',`url(#arrow-${color})`);path.setAttribute('class',`edge${active?' active':''}${selectedEdge===edge?' chosen':''}`);paths.append(path);
 const hit=document.createElementNS(svgNS,'path');hit.setAttribute('d',path.getAttribute('d'));hit.setAttribute('class','edge-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',`選取連線：${edge.from} → ${edge.to}`);hit.setAttribute('aria-pressed',String(selectedEdge===edge));
 const choose=()=>{model.cancel();selectedEdge=edge;update();status(`已選取「${edge.from} → ${edge.to}」，按「刪除選取連線」或 Delete 移除。`);};
 hit.addEventListener('click',choose);hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});paths.append(hit);
 }
 $('paths').replaceChildren(paths);
}
function place(name){const p=positions.get(name),el=elements.get(name);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}
function createSpeciesPicture(item){
 const canvas=document.createElement('canvas');canvas.className='species-image';
 canvas.width=item.bitmap.naturalWidth;canvas.height=item.bitmap.naturalHeight;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.name);
 canvas.getContext('2d').drawImage(item.bitmap,0,0);
 return canvas;
}
function imageBounds(name){
 const p=positions.get(name),img=elements.get(name).querySelector('.species-image');
 const box=img.getBoundingClientRect(),board=$('board').getBoundingClientRect();
 // object-fit:contain can leave empty space inside the image element.
 const ratio=img.width&&img.height?Math.min(box.width/img.width,box.height/img.height):1;
 const w=img.width?img.width*ratio:box.width,h=img.height?img.height*ratio:box.height;
 return {x:box.left-board.left+(box.width-w)/2,y:box.top-board.top+(box.height-h)/2,w,h};
}
let requestedSize=100,sizeFrame;
function capacity(width,height){
 let best=0;
 for(let cols=1;cols<=species.length;cols++)best=Math.max(best,Math.min(((width-24)/cols-14)/117.5,((height-24)/Math.ceil(species.length/cols)-14)/107.5));
 return Math.min(150,Math.floor(best*100/5)*5);
}
function setCardSize(percent){
 const scale=percent/100,board=$('board');W=117.5*scale;H=107.5*scale;
 for(const [key,value] of Object.entries({'card-width':W,'card-height':H,'image-width':107.5*scale,'image-height':101.5*scale,'card-font':10*scale,'card-padding':3*scale}))board.style.setProperty('--'+key,value+'px');
 $('card-size').value=percent;$('size-value').textContent=percent+'%';
}
function nearbyLayout(width,height,w,h,source=positions){
 const pin={x:12,y:12,w,h};
 const placed=[pin],result=new Map([[fixedCard,pin]]),clamp=(n,max)=>Math.max(0,Math.min(max,n));
 for(const [name,p] of source){
  if(name===fixedCard)continue;
  const x=clamp(p.x+(p.w-w)/2,width-w),y=clamp(p.y+(p.h-h)/2,height-h);
  const xs=new Set([x,0,width-w]),ys=new Set([y,0,height-h]);
  for(const q of placed){xs.add(clamp(q.x-w-1,width-w));xs.add(clamp(q.x+q.w+1,width-w));ys.add(clamp(q.y-h-1,height-h));ys.add(clamp(q.y+q.h+1,height-h));}
  const candidates=[];
  for(const a of xs)for(const b of ys)candidates.push({x:a,y:b,w,h,d:(a-x)**2+(b-y)**2});
  candidates.sort((a,b)=>a.d-b.d);
  const next=candidates.find(a=>placed.every(b=>!overlaps(a,b)));
  if(!next)return null;
  placed.push(next);result.set(name,next);
 }
 return result;
}
function arrange(){
 if(drag)endDrag(true);
 const board=$('board'),view=$('viewport'),width=view.clientWidth,height=view.clientHeight;
 board.style.width=width+'px';board.style.height=height+'px';
 const max=capacity(width,height),percent=Math.min(requestedSize,max);
 $('card-size').max=Math.max(65,max);setCardSize(percent);
 const layout=layoutCards(species.length,width,height,W,H);
 let pinned=nearbyLayout(width,height,W,H,new Map(species.map((s,i)=>[s.name,layout[i]])));
 if(!pinned){
  for(let cols=1;cols<=species.length&&!pinned;cols++){
   const rows=Math.ceil(species.length/cols);if(cols*(W+14)>width-24||rows*(H+14)>height-24)continue;
   const ordered=[species.find(s=>s.name===fixedCard),...species.filter(s=>s.name!==fixedCard)];
   pinned=new Map(ordered.map((s,i)=>[s.name,{x:12+(i%cols)*(W+14),y:12+Math.floor(i/cols)*(H+14),w:W,h:H}]));
  }
 }
 if(!pinned){status("空間不足，請擴大視窗。");return;}
 for(const [name,p] of pinned){positions.set(name,p);place(name);}renderEdges();
}
function resizeBoard(){
 if(drag)endDrag(true);
 const board=$('board'),view=$('viewport'),width=view.clientWidth,height=view.clientHeight;
 if(!width||!height)return;
 const max=capacity(width,height);let percent=Math.min(requestedSize,max),next;
 // Every resize starts from the user's requested size, never from a previously shrunk size.
 while(percent>=65){next=nearbyLayout(width,height,117.5*percent/100,107.5*percent/100);if(next)break;percent-=5;}
 if(!next){$('card-size').value=Math.round(W/117.5*100);status('目前空間不足以保留清楚的文字與原排列，請擴大視窗或按重新排列。');return;}
 board.style.width=width+'px';board.style.height=height+'px';
 $('card-size').max=Math.max(65,max);setCardSize(percent);
 for(const [name,p] of next){positions.set(name,p);place(name);}renderEdges();
}
$('card-size').addEventListener('input',()=>{
 requestedSize=Number($('card-size').value);cancelAnimationFrame(sizeFrame);sizeFrame=requestAnimationFrame(resizeBoard);
});
function showDetails(name){
 const item=species.find(s=>s.name===name),panel=$('details');if(!item)return;
 const picture=document.createElement('div');picture.className='detail-image';picture.append(createSpeciesPicture(item));
 const content=document.createElement('div');content.className='detail-content';const label=document.createElement('span');label.className='eyebrow';label.textContent='河口圖卡';const title=document.createElement('h2');title.textContent=name;content.append(label,title);
 const sections=item.sections.length?item.sections:[{label:'詳細介紹',text:'介紹檔中尚未找到這張圖卡的資料。'}];
 for(const section of sections){const block=document.createElement('section');block.className='detail-section';block.dataset.label=section.label;const h=document.createElement('h3');h.textContent=section.label;const p=document.createElement('p');appendInline(p,section.text);block.append(h,p);content.append(block);}
 panel.replaceChildren(picture,content);panel.scrollTop=0;
}
function select(name){
 if(name===fixedCard)return;
 selectedEdge=null;
 const first=model.pending,result=model.select(name);update();
 if(result==='first')status(`已選起點「${name}」，請點選另一張圖卡作為終點。`);
 if(result==='self')status('不能連到自己，請選另一張圖卡。');
 if(result==='duplicate')status('這條連線已經存在。請點選下一組的起點。');
 if(result==='added')status(`已建立「${first} → ${name}」。請點選下一組的起點。`);
}
function beginDrag(event,name){
 if(name===fixedCard||event.button!==0||drag)return;const p=positions.get(name);drag={name,id:event.pointerId,startX:event.clientX,startY:event.clientY,original:{...p},moved:false};elements.get(name).setPointerCapture(event.pointerId);
}
function moveDrag(event){
 if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
 if(!drag.moved&&Math.hypot(dx,dy)<6)return;drag.moved=true;const el=elements.get(drag.name);el.classList.add('dragging');const board=$('board');positions.set(drag.name,{...drag.original,x:Math.min(board.clientWidth-W,Math.max(0,drag.original.x+dx)),y:Math.min(board.clientHeight-H,Math.max(0,drag.original.y+dy))});place(drag.name);renderEdges();
}
function endDrag(cancelled=false){
 if(!drag)return;const action=drag;drag=null;const el=elements.get(action.name);el.classList.remove('dragging');if(el.hasPointerCapture(action.id))el.releasePointerCapture(action.id);
 const collision=action.moved&&[...positions.keys()].some(name=>name!==action.name&&overlaps(imageBounds(action.name),imageBounds(name)));
 if(cancelled||collision){positions.set(action.name,action.original);place(action.name);renderEdges();if(collision)status('圖卡不能重疊，已回到拖曳前的位置。');}
 else if(action.moved)status(`已移動「${action.name}」，連線已跟隨更新。`);
 else select(action.name);
}
function cancel(){if(drag)endDrag(true);selectedEdge=null;model.cancel();update();status('已取消選取。點選一張圖卡開始新的連線。');}
function deleteSelectedEdge(){const edge=model.remove(selectedEdge);selectedEdge=null;update();if(edge)status(`已刪除「${edge.from} → ${edge.to}」。其餘連線保留。`);}
$('delete-edge').addEventListener('click',deleteSelectedEdge);
document.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&selectedEdge&&!e.target.matches('input,textarea,[contenteditable="true"]')){e.preventDefault();deleteSelectedEdge();}});
$('cancel').addEventListener('click',cancel);
$('undo').addEventListener('click',()=>{const e=model.undo();update();if(e)status(`已復原「${e.from} → ${e.to}」。${model.pending?'請選取目前起點的終點。':'可繼續建立新連線。'}`);});
$('clear').addEventListener('click',()=>{model.clear();update();status('已清除全部連線。點選起點重新開始。');});
$('shuffle').addEventListener('click',()=>{arrange();status('已重新排列圖卡，所有連線均已保留。');});
const fullscreenButton=$('fullscreen');
fullscreenButton.disabled=!document.fullscreenEnabled;
if(fullscreenButton.disabled)fullscreenButton.title='此瀏覽器不支援全螢幕顯示';
fullscreenButton.addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
 }catch(error){status('無法切換全螢幕，請確認瀏覽器允許此操作。');}
});
document.addEventListener('fullscreenchange',()=>{
 const active=Boolean(document.fullscreenElement);
 fullscreenButton.textContent=active?'退出全螢幕':'全螢幕';
 fullscreenButton.setAttribute('aria-pressed',String(active));
 if(initialized)requestAnimationFrame(resizeBoard);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
window.addEventListener('resize',()=>{if(!initialized)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(resizeBoard,180);});
function updateLoadingProgress(){
 const ready=species.filter(s=>s.bitmap).length,failed=allSpecies.filter(s=>s.failed).length;
 $('load-progress').textContent=ready<species.length?`活動${activity}圖卡：${ready}/${species.length}，已顯示的圖卡可先操作`:allSpecies.some(s=>!s.bitmap&&!s.failed)?`活動${activity}圖卡已就緒；其餘圖卡背景下載中`:`活動${activity}圖卡：${ready}/${species.length}`;
 $('retry-images').hidden=!failed;$('retry-images').textContent=`重試 ${failed} 張圖卡`;
}
async function downloadCard(item,priority){
 if(item.bitmap||item.downloading)return;
 item.downloading=true;item.failed=false;const el=elements.get(item.name);el.classList.remove('load-failed');el.querySelector('.card-placeholder').textContent=item.name+'\n下載中…';
 try{item.bitmap=await loadSpeciesImage(item,priority);const img=createSpeciesPicture(item);img.setAttribute('aria-hidden','true');el.replaceChildren(img);el.disabled=false;renderEdges();}
 catch(error){item.failed=true;el.classList.add('load-failed');el.querySelector('.card-placeholder').textContent=item.name+'\n下載失敗';el.title=error.message;}
 finally{item.downloading=false;updateLoadingProgress();}
}
async function downloadGroup(items,concurrency,priority){
 let cursor=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length)await downloadCard(items[cursor++],priority);}));
}
$('retry-images').addEventListener('click',async()=>{const retry=$('retry-images');retry.disabled=true;await downloadGroup(allSpecies.filter(s=>s.failed),4,'high');retry.disabled=false;});
async function init(){
 $('loading').hidden=false;$('loading').textContent='正在載入河口圖卡清單…';$('shuffle').disabled=true;
 try{allSpecies=await loadSpecies();species=allSpecies.filter(s=>activityOne.has(s.name));activity=1;if(!species.length)throw new Error('介紹檔中沒有圖卡清單。');
  $('cards').replaceChildren();elements.clear();positions.clear();savedPositions.clear();model.clear();
  for(const item of allSpecies){const el=document.createElement('button');el.className='card';el.hidden=!activityOne.has(item.name);el.type='button';el.disabled=true;el.setAttribute('aria-label',`選取${item.name}`);if(item.name===fixedCard){el.classList.add('fixed-card');el.title='固定圖卡：右鍵查看說明，不能拖曳或連線';}else el.title='左鍵連線；右鍵查看說明';
   el.addEventListener('contextmenu',e=>{e.preventDefault();showDetails(item.name);});
   const placeholder=document.createElement('span');placeholder.className='species-image card-placeholder';placeholder.textContent=item.name+'\n等待下載…';el.append(placeholder);
   el.addEventListener('pointerdown',e=>beginDrag(e,item.name));el.addEventListener('pointermove',moveDrag);el.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)endDrag();});el.addEventListener('pointercancel',()=>endDrag(true));el.addEventListener('lostpointercapture',()=>{if(drag?.name===item.name)endDrag(true);});
   el.addEventListener('click',e=>{if(e.detail===0&&!drag)select(item.name);});elements.set(item.name,el);$('cards').append(el);
  }
  arrange();initialized=true;$('loading').hidden=true;$('shuffle').disabled=false;update();updateLoadingProgress();status('活動1：圖卡會逐張顯示。左鍵點選起點與終點；右鍵查看說明；拖曳可調整位置。');
  await downloadGroup(allSpecies.filter(s=>activityOne.has(s.name)),4,'high');
  await downloadGroup(allSpecies.filter(s=>!activityOne.has(s.name)),2,'low');
 }catch(error){$('loading').replaceChildren();const message=document.createElement('p');message.textContent=error.message;const retry=document.createElement('button');retry.textContent='重新載入';retry.onclick=init;$('loading').append(message,retry);status('資料載入失敗，請檢查檔案後重試。');}
}
init();
