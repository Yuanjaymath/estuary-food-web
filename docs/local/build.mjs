// Rebuild the offline copy from the editable Markdown and application sources.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const md=await readFile(path.join(root,'docs/species/河口食物網_26項圖卡詳細介紹.md'),'utf8');
await writeFile(path.join(root,'docs/species/offline-data.js'),'window.FOOD_WEB_MARKDOWN = '+JSON.stringify(md)+';\n','utf8');
let bundle='"use strict";\n(async function(){\n';
for(const file of ['data.js','model.js','app.js']){
 const source=await readFile(path.join(root,'docs/web',file),'utf8');
 bundle+=source.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
}
bundle+='}()).catch(function(error){const box=document.getElementById("loading");box.hidden=false;box.textContent="程式啟動失敗："+error.message;});\n';
await writeFile(path.join(root,'docs/web/app.bundle.js'),bundle,'utf8');
console.log('已更新離線介紹與網頁程式。');
