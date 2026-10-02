"use strict";
(async function(){
function parseSpeciesMarkdown(text) {
 const result=new Map();let current=null;
 for(const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
  const title=line.match(/^##\s+\d+｜(.+)$/);
  if(title){current=[];result.set(title[1].trim(),current);continue;}
  if(/^##\s/.test(line)){current=null;continue;}
  if(!current)continue;
  const field=line.match(/^\*\*([^*]+?)：\*\*\s*(.*)$/);
  if(field)current.push({label:field[1],text:field[2]});
  else if(line.trim()&&current.length)current.at(-1).text+='\n'+line.trim();
 }
 return result;
}
function safeURL(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
async function loadSpecies(){
 const base=new URL('./docs/species/',document.baseURI);
 if(location.protocol==='file:'){
  if(typeof window.FOOD_WEB_MARKDOWN!=='string')throw new Error('離線介紹資料未載入，請確認 docs/species/offline-data.js 存在。');
  return [...parseSpeciesMarkdown(window.FOOD_WEB_MARKDOWN)].map(([name,sections])=>({name,sections,small:new URL('small/'+encodeURIComponent(name+'.png'),base).href,big:new URL('big/'+encodeURIComponent(name+'.png'),base).href}));
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 let response;
 try{response=await fetch(new URL(encodeURIComponent('河口食物網_26項圖卡詳細介紹.md'),base),{cache:'no-store',signal:controller.signal});}
 catch(error){if(error.name==='AbortError')throw new Error('介紹資料載入超時。請確認本機服務仍在執行，然後按重新載入。');throw error;}
 finally{clearTimeout(timeout);}
 if(!response.ok)throw new Error('無法讀取介紹檔，請確認 docs/species 資料夾完整後重試。');
 const sections=parseSpeciesMarkdown(await response.text());
 return [...sections].map(([name,sections])=>({name,sections,small:new URL('small/'+encodeURIComponent(name+'.png'),base).href,big:new URL('big/'+encodeURIComponent(name+'.png'),base).href}));
}
// Render only this document's inline Markdown; never interpret raw HTML.
function appendInline(parent,text){
 const pattern=/\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;let last=0;
 for(const match of text.matchAll(pattern)){
  parent.append(document.createTextNode(text.slice(last,match.index)));let el;
  if(match[1]){const url=safeURL(match[2]);el=document.createElement(url?'a':'span');el.textContent=match[1];if(url){el.href=url;el.target='_blank';el.rel='noopener noreferrer';}}
  else{el=document.createElement(match[3]?'strong':'em');el.textContent=match[3]||match[4];}
  parent.append(el);last=match.index+match[0].length;
 }
 parent.append(document.createTextNode(text.slice(last)));
}

function overlaps(a,b,gap=0){return a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;}
function layoutCards(count,width,height,w,h,random=Math.random){
 const padding=12,gap=14;let best=null;
 for(let cols=1;cols<=count;cols++){const rows=Math.ceil(count/cols),cw=(width-padding*2)/cols,ch=(height-padding*2)/rows;if(cw>=w+gap&&ch>=h+gap){const score=Math.min(cw-w,ch-h);if(!best||score>best.score)best={cols,rows,cw,ch,score};}}
 if(!best)throw new Error('畫布空間不足');
 const cells=Array.from({length:best.cols*best.rows},(_,i)=>i);
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 return cells.slice(0,count).map(i=>({x:padding+(i%best.cols)*best.cw+gap/2+random()*(best.cw-w-gap),y:padding+Math.floor(i/best.cols)*best.ch+gap/2+random()*(best.ch-h-gap),w,h}));
}
class FoodWebModel{
 constructor(){this.edges=[];this.selected=null;this.pending=null;}
 select(name){this.selected=name;if(!this.pending){this.pending=name;return 'first';}if(this.pending===name)return 'self';const from=this.pending;this.pending=null;if(this.edges.some(e=>e.from===from&&e.to===name))return 'duplicate';this.edges.push({from,to:name});return 'added';}
 cancel(){this.pending=null;this.selected=null;}
 undo(){return this.edges.pop();}
 clear(){this.edges=[];this.cancel();}
}
function boundary(rect,dx,dy){if(Math.abs(dx)+Math.abs(dy)<0.001)return {x:rect.x+rect.w/2,y:rect.y-5};const factor=1/Math.max(Math.abs(dx)/(rect.w/2+5),Math.abs(dy)/(rect.h/2+5));return {x:rect.x+rect.w/2+dx*factor,y:rect.y+rect.h/2+dy*factor};}
function arrowGeometry(a,b,reverse){
 const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2,len=Math.hypot(dx,dy)||1;
 const bend=reverse?24:0;
 const cx=(a.x+a.w/2+b.x+b.w/2)/2-dy/len*bend,cy=(a.y+a.h/2+b.y+b.h/2)/2+dx/len*bend;
 const start=boundary(a,cx-a.x-a.w/2,cy-a.y-a.h/2),end=boundary(b,cx-b.x-b.w/2,cy-b.y-b.h/2);
 return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

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


}()).catch(function(error){const box=document.getElementById("loading");box.hidden=false;box.textContent="程式啟動失敗："+error.message;});
