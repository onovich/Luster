const {createServer}=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const selected=process.argv.find(argument=>argument.startsWith('--browser='));
if(selected)process.env.LUSTER_BROWSER=selected.slice('--browser='.length);
const {browserType,launchOptions}=require('../support/browser.cjs');
const root=path.resolve(__dirname,'../..');
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://127.0.0.1').pathname;if(pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Spectrum regression</title>');return;}const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw new Error('Invalid path');res.setHeader('content-type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(8799,'127.0.0.1',resolve));
 const browser=await browserType.launch(launchOptions);
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8799/');
  const rows=await page.evaluate(async()=>{
   const {LayeredRenderer}=await import('/src/webgl/layered-renderer.js');
   const {makeMaterialMaps,templates}=await import('/app/workbench/material-maps.js');
   const source=await (await fetch('/src/shaders/B14.frag')).text();
   const baseline='#undef CIE_LOOKUP\n'+source;
   const background=document.createElement('canvas');background.width=128;background.height=160;
   const ctx=background.getContext('2d');ctx.fillStyle='#f2e9d2';ctx.fillRect(0,0,128,160);ctx.fillStyle='#102343';ctx.fillRect(20,20,60,80);
   const initial=makeMaterialMaps({width:128,height:160,seed:2048});
   const updated=await LayeredRenderer.create(document.createElement('canvas'),{layout:'full',background,...initial,width:128,height:160});
   if(!updated.spectrumTexture)throw new Error('The spectrum comparison requires OES_texture_float');
   const original=await LayeredRenderer.create(document.createElement('canvas'),{layout:'full',background,...initial,width:128,height:160});
   original.setVariantSource('B14',baseline);
   const rows=[];
   try{
    for(const template of templates){
     const maps=makeMaterialMaps({template,width:128,height:160,seed:2048});
     for(const r of [original,updated]){r.setNormal(maps.normal);r.setSurface(maps.surface);r.setParameters({strength:.64,richness:30,light:12});}
     for(const angle of [-18,0,18]){
      const pixels=[original,updated].map(r=>{r.render({angle});const bytes=new Uint8Array(128*160*4);r.gl.readPixels(0,0,128,160,r.gl.RGBA,r.gl.UNSIGNED_BYTE,bytes);return bytes;});
      let max=0,count=0;for(let i=0;i<pixels[0].length;i++){const difference=Math.abs(pixels[0][i]-pixels[1][i]);max=Math.max(max,difference);if(difference)count++;}
      rows.push({template,angle,max,changedChannels:count});
     }
    }
    for(const r of [original,updated]){
     if(r.gl.getError()!==r.gl.NO_ERROR)throw new Error('Spectrum renderer produced a WebGL error');
     const texture=r.spectrumTexture;r.dispose();
     if(texture&&r.gl.isTexture(texture))throw new Error('Spectrum texture was not disposed');
    }
   }finally{original.dispose();updated.dispose();}
   return rows;
  });
  console.log(JSON.stringify(rows,null,2));assert(rows.every(row=>row.max<=1));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
