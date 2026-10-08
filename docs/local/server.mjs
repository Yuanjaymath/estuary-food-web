import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.md':'text/plain; charset=utf-8'};
export function createServer(){return http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  // Expose only application assets, not unrelated documents in this workspace.
  if(pathname!=='/'&&pathname!=='/index.html'&&!/^\/docs\/(web|species)\//.test(pathname)){res.writeHead(404);res.end('Not found');return;}
  const file=await realpath(path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)));
  const allowed=file===path.join(root,'index.html')||['web','species'].some(dir=>file.startsWith(path.join(root,'docs',dir)+path.sep));
  if(!allowed){res.writeHead(403);res.end('Forbidden');return;}
  const extension=path.extname(file);if(!mime[extension]){res.writeHead(404);res.end('Not found');return;}
  const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extension],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('找不到檔案');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createServer();const preferred=Number(process.env.PORT)||8765;
 server.on('error',e=>{if(e.code==='EADDRINUSE'){server.listen(0,'127.0.0.1');}else{console.error(e);process.exitCode=1;}});
 server.on('listening',()=>{const url=`http://127.0.0.1:${server.address().port}`;console.log(`共建河口食物網：${url}\n保持此視窗開啟；按 Ctrl+C 結束服務。`);if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true});});
 server.listen(preferred,'127.0.0.1');
}

