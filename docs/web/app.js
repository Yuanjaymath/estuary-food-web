import {loadSpecies,appendInline} from './data.js';
import {FoodWebModel,layoutCards,overlaps,arrowGeometry} from './model.js';
const $=id=>document.getElementById(id),model=new FoodWebModel(),positions=new Map(),elements=new Map();let species=[],drag=null,initialized=false,resizeTimer;
let W=117.5,H=107.5;
const svgNS='http://www.w3.org/2000/svg';
function status(message){$('status').textContent=message;}
function update(){
 for(const [name,el] of elements){el.classList.toggle('selected',model.selected===name);el.classList.toggle('pending',model.pending===name);el.setAttribute('aria-pressed',String(model.selected===name));}
 $('count').textContent=`${model.edges.length} 條連線`;$('undo').disabled=!model.edges.length;$('clear').disabled=!model.edges.length;$('cancel').disabled=!model.selected&&!model.pending;
 renderEdges();
}
function renderEdges(){
 const paths=document.createDocumentFragment();
 for(const edge of model.edges){const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)continue;const active=model.selected===edge.from||model.selected===edge.to,color=active?'blue':'yellow';const path=document.createElementNS(svgNS,'path');path.setAttribute('d',arrowGeometry(a,b,model.edges.some(e=>e.from===edge.to&&e.to===edge.from)));path.setAttribute('stroke',active?'#56b5ff':'#f4d351');path.setAttribute('marker-end',`url(#arrow-${color})`);path.setAttribute('class',`edge${active?' active':''}`);paths.append(path);}
 $('paths').replaceChildren(paths);
}
function place(name){const p=positions.get(name),el=elements.get(name);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}
function imageBounds(name){
 const p=positions.get(name),img=elements.get(name).querySelector('img');
 const box=img.getBoundingClientRect(),board=$('board').getBoundingClientRect();
 // object-fit:contain can leave empty space inside the image element.
 const ratio=img.naturalWidth&&img.naturalHeight?Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight):1;
 const w=img.naturalWidth?img.naturalWidth*ratio:box.width,h=img.naturalHeight?img.naturalHeight*ratio:box.height;
 return {x:box.left-board.left+(box.width-w)/2,y:box.top-board.top+(box.height-h)/2,w,h};
}
function arrange(){
 if(drag)endDrag(true);
 const view=$('viewport');
 const board=$('board'),width=view.clientWidth,height=view.clientHeight;
 board.style.width=`${width}px`;board.style.height=`${height}px`;
 // Fit every card inside the visible area while retaining the enlarged size when possible.
 let scale=1;
 for(let cols=1;cols<=species.length;cols++){
  const rows=Math.ceil(species.length/cols);
  const candidate=Math.min(1,((width-24)/cols-14)/117.5,((height-24)/rows-14)/107.5);
  if(cols===1||candidate>scale)scale=candidate;
 }
 scale=Math.max(0.01,scale);W=117.5*scale;H=107.5*scale;
 board.style.setProperty('--card-width',`${W}px`);board.style.setProperty('--card-height',`${H}px`);
 board.style.setProperty('--image-width',`${107.5*scale}px`);board.style.setProperty('--image-height',`${70*scale}px`);
 board.style.setProperty('--card-font',`${10*scale}px`);board.style.setProperty('--card-padding',`${3*scale}px`);
 const layout=layoutCards(species.length,width,height,W,H);
 species.forEach((s,i)=>{positions.set(s.name,layout[i]);place(s.name);});renderEdges();
}
function showDetails(name){
 const item=species.find(s=>s.name===name),panel=$('details');if(!item)return;
 const picture=document.createElement('div');picture.className='detail-image';const img=document.createElement('img');img.src=item.big;img.alt=name;img.addEventListener('error',()=>{const hint=document.createElement('span');hint.className='image-error';hint.textContent='放大圖暫時無法載入';picture.replaceChildren(hint);});picture.append(img);
 const content=document.createElement('div');content.className='detail-content';const label=document.createElement('span');label.className='eyebrow';label.textContent='河口圖卡';const title=document.createElement('h2');title.textContent=name;content.append(label,title);
 const sections=item.sections.length?item.sections:[{label:'詳細介紹',text:'介紹檔中尚未找到這張圖卡的資料。'}];
 for(const section of sections){const block=document.createElement('section');block.className='detail-section';block.dataset.label=section.label;const h=document.createElement('h3');h.textContent=section.label;const p=document.createElement('p');appendInline(p,section.text);block.append(h,p);content.append(block);}
 panel.replaceChildren(picture,content);panel.scrollTop=0;
}
function select(name){
 const first=model.pending,result=model.select(name);showDetails(name);update();
 if(result==='first')status(`已選起點「${name}」，請點選另一張圖卡作為終點。`);
 if(result==='self')status('不能連到自己，請選另一張圖卡。');
 if(result==='duplicate')status('這條連線已經存在。請點選下一組的起點。');
 if(result==='added')status(`已建立「${first} → ${name}」。請點選下一組的起點。`);
}
function beginDrag(event,name){
 if(event.button!==0||drag)return;const p=positions.get(name);drag={name,id:event.pointerId,startX:event.clientX,startY:event.clientY,original:{...p},moved:false};elements.get(name).setPointerCapture(event.pointerId);
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
function cancel(){if(drag)endDrag(true);model.cancel();update();status('已取消選取。點選一張圖卡開始新的連線。');}
$('cancel').addEventListener('click',cancel);
$('undo').addEventListener('click',()=>{const e=model.undo();update();if(e)status(`已復原「${e.from} → ${e.to}」。${model.pending?'請選取目前起點的終點。':'可繼續建立新連線。'}`);});
$('clear').addEventListener('click',()=>{model.clear();update();status('已清除全部連線。點選起點重新開始。');});
$('shuffle').addEventListener('click',()=>{arrange();status('已重新排列圖卡，所有連線均已保留。');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
window.addEventListener('resize',()=>{if(!initialized)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(arrange,180);});
async function init(){
 $('loading').hidden=false;$('loading').textContent='正在載入河口圖卡…';$('shuffle').disabled=true;
 try{species=await loadSpecies();if(!species.length)throw new Error('small 資料夾中沒有 PNG 圖卡。');
  $('cards').replaceChildren();elements.clear();positions.clear();model.clear();
  for(const item of species){const el=document.createElement('button');el.className='card';el.type='button';el.setAttribute('aria-label',`選取${item.name}`);const img=document.createElement('img');img.src=item.small;img.alt='';img.draggable=false;el.append(img);
   el.addEventListener('pointerdown',e=>beginDrag(e,item.name));el.addEventListener('pointermove',moveDrag);el.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)endDrag();});el.addEventListener('pointercancel',()=>endDrag(true));el.addEventListener('lostpointercapture',()=>{if(drag?.name===item.name)endDrag(true);});
   el.addEventListener('click',e=>{if(e.detail===0&&!drag)select(item.name);});elements.set(item.name,el);$('cards').append(el);
  }
  arrange();initialized=true;$('loading').hidden=true;$('shuffle').disabled=false;update();status(`已載入 ${species.length} 張圖卡。點選起點，再點選終點；拖曳可調整位置。`);
 }catch(error){$('loading').replaceChildren();const message=document.createElement('p');message.textContent=error.message;const retry=document.createElement('button');retry.textContent='重新載入';retry.onclick=init;$('loading').append(message,retry);status('資料載入失敗，請檢查檔案後重試。');}
}
init();

