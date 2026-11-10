// Local test server only. Never deploy this file or its emulator configuration.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const config={firebase:{apiKey:'demo-api-key',authDomain:'demo-inlove-owned.firebaseapp.com',databaseURL:'https://demo-inlove-owned-default-rtdb.firebaseio.com',projectId:'demo-inlove-owned',appId:'1:123:web:demo'},emulators:true,site:{MINIGAMES:[],CONTACTS:{},DONATE_QR_IMAGE:'',MUSIC_URL:''}};
const types={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.ttf':'font/ttf','.png':'image/png','.mp3':'audio/mpeg'};
createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/app-config.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});res.end('window.APP_CONFIG='+JSON.stringify(config));return}
    let file=resolve(root,'.'+path);
    if(!file.startsWith(resolve(root)+sep)&&file!==resolve(root)){res.writeHead(403);res.end();return}
    if(!extname(file))file=resolve(root,'index.html');
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(4173,'127.0.0.1',()=>console.log('Test build on http://127.0.0.1:4173 (emulator config only)'));
