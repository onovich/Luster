const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch(launchOptions);try{
 const p=await b.newPage({viewport:{width:1536,height:1024},reducedMotion:'reduce'});await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8798');await p.waitForFunction(()=>window.foilDemo?.state().ready);
 const measure=()=>p.evaluate(()=>{const s=document.querySelector('#stage'),b=document.querySelector('#book'),style=getComputedStyle(s);return {width:b.offsetWidth,stage:s.clientWidth,distance:parseFloat(style.perspective),origin:style.perspectiveOrigin.split(' ').map(parseFloat),center:[b.offsetLeft+b.offsetWidth/2,b.offsetTop+b.offsetHeight/2],min:document.querySelector('#angle').min,max:document.querySelector('#angle').max,transform:b.style.transform};});
 for(const width of [1536,2320,768,390]){
  await p.setViewportSize({width,height:width===2320?1343:1024});await p.locator('#view-book').click();await p.evaluate(()=>foilDemo.setAngle(4));const album=await measure();
  await p.locator('#view-material').click();await p.evaluate(()=>foilDemo.setAngle(4));const material=await measure();
  assert(Math.abs(material.width/material.distance-album.width/album.distance)<.002);assert.deepEqual(material.origin,material.center);assert.equal(material.transform,album.transform);assert.equal(material.min,'-4');assert.equal(material.max,'4');
  await p.evaluate(()=>foilDemo.setAngle(-4));assert.equal((await measure()).transform,'rotateY(-3.2deg)');
  await p.screenshot({path:`.test-output/camera-${width}.png`,fullPage:true});
 }
 // Resize while Material remains active must update the camera as well.
 await p.setViewportSize({width:1536,height:1024});await p.waitForFunction(()=>document.querySelector('#book').offsetWidth>300);await p.waitForTimeout(100);const resized=await measure();assert(Math.abs(resized.distance-2600*resized.width/resized.stage)<.01);
 await p.locator('#view-book').click();assert.equal((await measure()).distance,2600);console.log('PASS: matched relative perspective and angle limits, centered camera, four widths, resize and Album restoration');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
