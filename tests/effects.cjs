const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch(launchOptions);try{
 const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8798');await page.waitForFunction(()=>foilDemo.state().ready);
 await page.mouse.move(0,0);await page.evaluate(()=>foilDemo.setAngle(2));await page.waitForTimeout(500);
 for(const variant of ['B11','B14']){
  await page.evaluate(v=>foilDemo.restore(v),variant);
  const before=await page.evaluate(()=>foilDemo.state()),frames=[];
  for(const effect of ['original','soft','vivid','fine']){
   await page.locator('#advanced summary').click();await page.locator(`[data-effect=${effect}]`).hover();await page.evaluate(()=>foilDemo.setAngle(2));await page.locator(`[data-effect=${effect}]`).click();
   await page.waitForFunction(()=>!foilDemo.state().effectTransition);
   const state=await page.evaluate(()=>foilDemo.state());assert.equal(state.effect,effect);assert.equal(state.angle,2);assert.equal(state.parameters.light,before.parameters.light);assert.equal(await page.locator('#advanced').getAttribute('open'),null);
   frames.push(await page.evaluate(()=>foilDemo.capture()[0]));
  }
  assert.equal(new Set(frames).size,4,'each treatment changes rendered pixels');
 }
 await page.locator('#advanced summary').click();await page.locator('[data-scheme=B11]').click();await page.waitForFunction(()=>!foilDemo.state().switching);assert.equal(await page.evaluate(()=>foilDemo.state().effect),'fine');
 await page.locator('[data-effect=original]').click();await page.waitForFunction(()=>!foilDemo.state().effectTransition);
 await page.locator('#advanced summary').click();await page.screenshot({path:'.test-output/advanced-presets.png',fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#advanced').getAttribute('open'),null);
 await page.locator('#advanced summary').click();await page.mouse.click(20,20);assert.equal(await page.locator('#advanced').getAttribute('open'),null);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#advanced summary').click();await page.locator('[data-effect=soft]').click();assert.equal(await page.evaluate(()=>foilDemo.state().effectTransition),false);
 assert.deepEqual(errors,[]);console.log('PASS: four distinct rendered treatments on both models, retained pose/light, persistent scheme treatment, dismissal and reduced motion');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
