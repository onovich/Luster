const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch(launchOptions);try{
 const p=await b.newPage({viewport:{width:1536,height:1024}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8798');await p.waitForFunction(()=>window.foilDemo?.state().ready);
 const rest=()=>p.waitForFunction(()=>foilDemo.state().cardOffsets.every(v=>v===0));await rest();
 for(const index of [2,0,3,2]){await p.locator('#slot'+index).hover();await p.waitForFunction(i=>foilDemo.state().cardOffsets.every((v,n)=>n===i?v>60:v===0),index);}
 const geometry=await p.evaluate(()=>{const r=foilDemo.renderers[2],g=r.gl,a=new Uint8Array(r.canvas.width*r.canvas.height*4);r.render({angle:0});g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,a);const row=y=>{const xs=[];for(let x=0;x<r.canvas.width;x++)if(a[(y*r.canvas.width+x)*4+3])xs.push(x);return {min:xs[0],max:xs.at(-1),width:xs.length};};return {rows:[row(565),row(610)],turn:r.cardPose.turn};});
 assert.equal(geometry.turn,0);assert.deepEqual(geometry.rows,[{min:0,max:487,width:488},{min:0,max:487,width:488}],'The extracted card must retain the sleeve width and parallel edges');
 await p.screenshot({path:'.test-output/parallel-extraction.png',fullPage:true});
 await p.mouse.move(1,1);await rest();await p.locator('#slot2').hover();await p.waitForFunction(()=>foilDemo.state().cardOffsets[2]>60);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await rest();
 await p.mouse.move(1,1);await p.reload();await p.waitForFunction(()=>window.foilDemo?.state().ready);await rest();
 await p.locator('#view-material').click();await p.waitForFunction(()=>!document.body.dataset.viewTransition);
 const measure=()=>p.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect();return {main:box('main').width,bottom:box('main').bottom,gallery:box('#materialGallery').width,icon:box('.foil-icon').width,font:parseFloat(getComputedStyle(document.querySelector('.foil-toggle')).fontSize)};});
 const original=await measure();await p.setViewportSize({width:2320,height:1343});const large=await measure(),scale=large.main/original.main;
 for(const key of ['gallery','icon','font'])assert(Math.abs(large[key]/original[key]-scale)<.01,key+' follows artboard scale');assert(large.bottom<=1344);
 await p.screenshot({path:'.test-output/material-fit-large.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: no startup lift, exclusive hover, leave/blur/reload reset, coplanar parallel extraction, proportional desktop UI',geometry);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
