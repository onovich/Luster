const {browserType,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const base=process.env.LUSTER_PUBLIC_URL||'http://127.0.0.1:8798/dist-public/';
(async()=>{
 const browser=await browserType.launch(launchOptions);
 try{
  const context=await browser.newContext({locale:'en-US'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const width of [320,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base);
   await page.waitForFunction(()=>document.getElementById('pageFrames').getAttribute('aria-busy')==='false');
   const view=page.frame({name:'luster-home'});
   await view.waitForFunction(()=>window.foilDemo?.state().ready,undefined,{timeout:60000});
   assert.deepEqual(await page.locator('.siteNav a').allTextContents(),['Home']);
   assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await view.locator('#view-material').click();
   await view.locator('#materialGallery').waitFor({state:'visible'});
   await page.locator('#siteLanguage').selectOption('zh-CN');
   await page.getByRole('link',{name:'首页',exact:true}).waitFor();
   await page.locator('#siteLanguage').selectOption('en');
  }
  for(const route of ['product/','pricing/','trial/','content/product.html','content/pricing.html','content/editor.html','trial/app/workbench/trial.html','trial/app/workbench/trial.js']){
   assert.equal((await context.request.get(new URL(route,base).href)).status(),404,route);
  }
  assert.deepEqual(errors,[]);
  console.log('Published gallery passed: responsive, bilingual, interactive; hidden routes and editor resources return 404.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
