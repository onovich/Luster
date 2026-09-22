const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch(launchOptions),errors=[];
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8798');await page.waitForFunction(()=>foilDemo.state().ready);
   assert.equal(await page.locator('#advanced').getAttribute('open'),null);
   assert.equal(await page.locator('#view').inputValue(),width<=600?'material':'book');
   assert.equal(await page.locator('#angle').isVisible(),true);
   assert.equal(await page.locator('#period').isVisible(),false);
   const controls=await page.locator('button:visible,select:visible,input[type=range]:visible,summary').evaluateAll(es=>es.map(e=>({id:e.id,height:e.getBoundingClientRect().height})));
   assert.ok(controls.every(e=>e.height>=44),JSON.stringify(controls));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#angle').focus();await page.keyboard.press('End');
   assert.equal(await page.evaluate(()=>foilDemo.state().angle),4);
   assert.equal(await page.locator('#angle').inputValue(),'4');
   await page.locator('#advanced summary').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#period').isVisible(),true);
   await page.locator('#advanced summary').click();
   await page.locator('#play').click();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
   await page.locator('#play').click();assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
   await page.evaluate(()=>foilDemo.setAngle(-4));await page.mouse.move(1,1);await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`.test-output/cobalt-${width}.png`,fullPage:true});
   await page.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: four widths, mobile material default, 44px controls, keyboard angle/disclosure, playback states, no overflow/errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
