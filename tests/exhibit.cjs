const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch(launchOptions);try{
 const p=await b.newPage({viewport:{width:2320,height:1343}});
 await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8798',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>window.foilDemo?.state().ready,null,{timeout:120000});
 assert.equal(new Set(await p.locator('.base-preview').evaluateAll(nodes=>nodes.map(n=>n.src))).size,8);
 await p.locator('#advanced summary').click();
 for(const variant of ['B11','B14']){await p.locator(`[data-scheme=${variant}]`).click();await p.waitForFunction(v=>foilDemo.state().variant===v&&!foilDemo.state().switching,variant);assert.equal(await p.locator(`[data-scheme=${variant}]`).getAttribute('aria-pressed'),'true');}
 await p.keyboard.press('Escape');
 const slot=await p.locator('#slot0').boundingBox();await p.mouse.move(slot.x+slot.width/2,slot.y+slot.height/2);await p.waitForFunction(()=>foilDemo.state().cardOffsets[0]>60&&foilDemo.state().angle===-4);
 assert.notEqual(await p.locator('#book').evaluate(e=>getComputedStyle(e).transform),'none');
 await p.mouse.move(1,1);await p.waitForFunction(()=>foilDemo.state().cardOffsets[0]===0&&foilDemo.state().angle===0);
 for(const [id,lo,hi] of [['angle',-4,4],['light',3,35],['strength',.05,.8]]){
  const shots=[];for(const value of [lo,hi]){await p.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);shots.push(await p.evaluate(()=>foilDemo.renderers[0].canvas.toDataURL()));}assert.notEqual(shots[0],shots[1],id+' must change rendered pixels');
 }
 await p.evaluate(()=>{foilDemo.setAngle(0);foilDemo.patch({strength:.3,light:24.39})});
 assert.deepEqual(await p.evaluate(()=>foilDemo.state().errors),[]);
 assert.equal(await p.locator('main').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
 assert.notEqual(await p.locator('body').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
 await p.screenshot({path:'.test-output/five-fixes-wide.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS: 8 unique artworks, B11/B14 selector sync, book tilt, card lift, Angle/Light/Intensity pixel changes, full-bleed backdrop, mobile overflow');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
