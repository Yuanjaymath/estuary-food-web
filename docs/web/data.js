export function parseSpeciesMarkdown(text) {
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
export function safeURL(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export async function loadSpecies(){
 const base=new URL('./docs/species/',document.baseURI);
 if(location.protocol==='file:'){
  if(typeof window.FOOD_WEB_MARKDOWN!=='string')throw new Error('離線介紹資料未載入，請確認 docs/species/offline-data.js 存在。');
  return [...parseSpeciesMarkdown(window.FOOD_WEB_MARKDOWN)].map(([name,sections])=>({name,sections,image:new URL(encodeURIComponent(name+'.webp'),base).href}));
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 let response;
 try{response=await fetch(new URL(encodeURIComponent('河口食物網_26項圖卡詳細介紹.md'),base),{cache:'no-store',signal:controller.signal});}
 catch(error){if(error.name==='AbortError')throw new Error('介紹資料載入超時。請確認本機服務仍在執行，然後按重新載入。');throw error;}
 finally{clearTimeout(timeout);}
 if(!response.ok)throw new Error('無法讀取介紹檔，請確認 docs/species 資料夾完整後重試。');
 const sections=parseSpeciesMarkdown(await response.text());
 return [...sections].map(([name,sections])=>({name,sections,image:new URL(encodeURIComponent(name+'.webp'),base).href}));
}
const speciesImageCache=new Map();
export function loadSpeciesImage(item,priority="high"){
 if(!speciesImageCache.has(item.image)){
  const pending=new Promise((resolve,reject)=>{
   const image=new Image();image.fetchPriority=priority;
   const timeout=setTimeout(()=>{image.onload=image.onerror=null;reject(new Error(`「${item.name}」下載逾時，請重試。`));},30000);
   image.onload=()=>{clearTimeout(timeout);resolve(image);};
   image.onerror=()=>{clearTimeout(timeout);reject(new Error(`無法載入「${item.name}」圖卡，請重試。`));};
   image.src=item.image;
  }).catch(error=>{speciesImageCache.delete(item.image);throw error;});
  speciesImageCache.set(item.image,pending);
 }
 return speciesImageCache.get(item.image);
}
// Render only this document's inline Markdown; never interpret raw HTML.
export function appendInline(parent,text){
 const pattern=/\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;let last=0;
 for(const match of text.matchAll(pattern)){
  parent.append(document.createTextNode(text.slice(last,match.index)));let el;
  if(match[1]){const url=safeURL(match[2]);el=document.createElement(url?'a':'span');el.textContent=match[1];if(url){el.href=url;el.target='_blank';el.rel='noopener noreferrer';}}
  else{el=document.createElement(match[3]?'strong':'em');el.textContent=match[3]||match[4];}
  parent.append(el);last=match.index+match[0].length;
 }
 parent.append(document.createTextNode(text.slice(last)));
}
