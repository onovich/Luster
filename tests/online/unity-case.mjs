import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createProjectPackage} from '../../app/workbench/project.js';
import {exportWebPackage} from '../../app/workbench/export-web.mjs';
import {exportUnityPackage} from '../../app/workbench/export-unity.mjs';
import {templates} from '../../app/workbench/material-maps.js';
import {readStoredZip} from '../../app/workbench/zip-store.js';

const require=createRequire(import.meta.url);
const {chromium,launchOptions}=require('../support/browser.cjs');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.join(repo,'.test-output');
const requested=process.argv[2]||'all';
const cases=requested==='all'?templates:[requested];
if(cases.some(name=>!templates.includes(name)))throw new Error('Unknown Unity case');

async function unpack(bytes,destination){
  const files=readStoredZip(bytes);
  for(const [name,content] of files){
    const target=path.resolve(destination,name);
    assert(target.startsWith(destination+path.sep),'Unsafe export path');
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,content);
  }
  return files.size;
}

async function serve(root,run){
  const server=createServer(async(request,response)=>{
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1:8799').pathname);
      if(pathname.includes('\\')||pathname.split('/').includes('..'))throw new Error('Unsafe path');
      const target=path.resolve(root,pathname.slice(1)||'index.html');
      if(!target.startsWith(root+path.sep))throw new Error('Unsafe path');
      const bytes=await readFile(target);
      const type=target.endsWith('.html')?'text/html':/\.(?:js|mjs)$/.test(target)?'text/javascript':target.endsWith('.json')?'application/json':'application/octet-stream';
      response.writeHead(200,{'content-type':type,'cache-control':'no-store'}).end(bytes);
    }catch{response.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(8799,'127.0.0.1',resolve));
  try{return await run();}finally{await new Promise(resolve=>server.close(resolve));}
}

const browser=await chromium.launch(launchOptions);
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const artwork=new Uint8Array(Buffer.from(await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
    const context=canvas.getContext('2d');
    context.fillStyle='#f5ecd9';context.fillRect(0,0,320,200);
    context.fillStyle='#1646ce';context.fillRect(28,30,140,100);
    context.fillStyle='#e58a20';context.fillRect(183,61,104,88);
    return canvas.toDataURL('image/png').split(',')[1];
  }),'base64'));
  for(const template of cases){
    const destination=path.join(output,`unity-case-${template}`);
    assert(path.dirname(destination)===output,'Unity case must stay inside test output');
    await rm(destination,{recursive:true,force:true});
    await mkdir(destination,{recursive:true});
    const recipe={template,seed:4096,density:.65,depth:.24,direction:-30,strength:.55,richness:10,light:32};
    const project=await createProjectPackage({sourceBytes:artwork,sourceName:'verification.png',sourceMime:'image/png',sourceWidth:320,sourceHeight:200,mapWidth:256,mapHeight:160,angle:-11,recipe});
    const web=await exportWebPackage(project),unity=await exportUnityPackage(project,artwork);
    const webRoot=path.join(destination,'web');
    const webFiles=await unpack(web,webRoot),unityFiles=await unpack(unity,path.join(destination,'unity'));
    await serve(webRoot,async()=>{
      await page.goto('http://127.0.0.1:8799/index.html');
      await page.waitForFunction(()=>window.lusterWeb?.ready||window.lusterWeb?.error);
      assert.equal(await page.evaluate(()=>window.lusterWeb.ready),true);
      for(const [name,layers] of Object.entries({original:{card:0,film:0},substrate:{card:1,film:0},combined:{card:1,film:1}})){
        const png=await page.evaluate(({layers})=>{
          const {renderer,manifest}=window.lusterWeb;
          renderer.setLayers(layers);renderer.render({angle:manifest.view.angle});
          return document.getElementById('material').toDataURL('image/png').split(',')[1];
        },{layers});
        await writeFile(path.join(destination,`web-${name}.png`),Buffer.from(png,'base64'));
      }
    });
    assert.deepEqual(errors,[]);
    await writeFile(path.join(destination,'case.json'),JSON.stringify({target:'Unity 6000.4.8f1 Built-in/Gamma/uGUI',template,recipe,angle:-11,webFiles,unityFiles,errors},null,2));
    console.log(`${template}: Web ${webFiles} files, Unity ${unityFiles} files`);
  }
}finally{await browser.close();}
