const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
fs.mkdirSync(path.join(__dirname,'../.test-output'),{recursive:true});
(async()=>{
 const browser=await chromium.launch(launchOptions);
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8798');await page.waitForFunction(()=>window.foilDemo?.state().ready);
 const result=await page.evaluate(async()=>{
  const diffs=[];
  function pixels(angle){foilDemo.setAngle(angle);return foilDemo.renderers.map(r=>{const gl=r.gl,data=new Uint8Array(r.canvas.width*r.canvas.height*4);gl.readPixels(0,0,r.canvas.width,r.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;});}
  function difference(a,b){return a.map((data,i)=>{let sum=0;for(let k=0;k<data.length;k++)sum+=Math.abs(data[k]-b[i][k]);return sum/data.length;});}
  document.getElementById('inspect').value=1;
  for(const variant of ['B11','B14']){await foilDemo.restore(variant);const zero=pixels(0),near=pixels(.01),left=pixels(-4),right=pixels(4);diffs.push({variant,near:difference(zero,near),endpoints:difference(left,right)});}
  const {FoilRenderer}=await import('/src/webgl/renderer.js');
  const canvas=document.createElement('canvas'),background=document.createElement('canvas');background.width=2;background.height=2;const ctx=background.getContext('2d');ctx.fillStyle='#204060';ctx.fillRect(0,0,2,2);
  const data=new Uint8Array([128,0,128,0,128,0,128,0,128,0,128,0,128,0,128,0]);
  const r=await FoilRenderer.create(canvas,{normal:{data,width:2,height:2},background,width:32,height:32});r.render({angle:0});
  r.resize(64,48);r.setNormal({data,width:1,height:4});r.setBackground(background);r.render({angle:2});const gpuError=r.gl.getError();
  let invalid=false;try{r.setParameters({period:NaN});}catch(e){invalid=true;}
  const program=r.program,normal=r.normalTexture,base=r.baseTexture,buffer=r.buffer;r.dispose();r.dispose();const released=![program,normal,base,buffer].some((v,i)=>[r.gl.isProgram,r.gl.isTexture,r.gl.isTexture,r.gl.isBuffer][i].call(r.gl,v));let rejectsDisposed=false;try{r.render();}catch(e){rejectsDisposed=true;}
  return {diffs,lifecycle:{gpuError,invalid,released,rejectsDisposed,width:canvas.width,height:canvas.height}};
 });
 for(const row of result.diffs)row.near.forEach((v,i)=>{assert(v>0);assert(v<row.endpoints[i]*.05,`${row.variant} ${i} abrupt delta`);});
 assert.deepEqual(result.lifecycle,{gpuError:0,invalid:true,released:true,rejectsDisposed:true,width:64,height:48});
 fs.writeFileSync(path.join(__dirname,'../.test-output/material-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
