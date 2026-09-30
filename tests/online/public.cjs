const {browserType,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.LUSTER_PUBLIC_URL||'http://127.0.0.1:8798/dist/';
const paths={home:'',product:'product/',pricing:'pricing/',editor:'trial/'};
(async()=>{
 const browser=await browserType.launch(launchOptions);
 try{
  const context=await browser.newContext({acceptDownloads:true,locale:'en-US'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack);});
  const output=path.resolve(__dirname,'../../.test-output/public');fs.mkdirSync(output,{recursive:true});
  async function ready(key){
   await page.waitForFunction(key=>document.getElementById('pageFrames').getAttribute('aria-busy')==='false'&&!!document.querySelector(`iframe[data-page="${key}"]:not([hidden])`),key);
   await page.waitForFunction(()=>getComputedStyle(document.getElementById('pageFrames')).opacity==='1');
   const frame=page.frame({name:`luster-${key}`});assert(frame);return frame;
  }
  async function go(key){
   await page.locator('.siteNav a').nth(Object.keys(paths).indexOf(key)).click();
   await page.waitForURL(url=>url.pathname===new URL(paths[key],base).pathname);
   return ready(key);
  }
  for(const width of [320,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base);let view=await ready('home');
   await view.waitForFunction(()=>window.foilDemo?.state().ready,undefined,{timeout:60000});
   assert.deepEqual(await page.locator('.siteNav a').allTextContents(),['Home','Product','Pricing','Editor']);
   assert.equal(await page.locator('#pageFrames').evaluate(el=>getComputedStyle(el).transitionDuration),'0.16s');
   await page.evaluate(()=>document.querySelector('.siteHeader').dataset.identity='persistent');
   const header=await page.locator('.siteHeader').boundingBox();
   assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===1440)assert(await view.locator('.console').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
   await page.screenshot({path:path.join(output,`gallery-${width}.png`)});
   view=await go('product');
   assert.equal(await page.locator('.siteHeader').getAttribute('data-identity'),'persistent');
   assert.deepEqual(await page.locator('.siteHeader').boundingBox(),header);
   await view.waitForFunction(()=>{const image=document.querySelector('.heroMaterial img');return image?.complete&&image.naturalWidth>0;});
   assert.equal(await view.locator('.planGrid').count(),0);
   assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(output,`product-${width}.png`)});
   view=await go('pricing');assert(await view.locator('.planGrid').isVisible());
   assert.equal(await view.locator('.planPrice').first().textContent(),'Free');
   assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(await page.locator('.siteHeader').boundingBox(),header);
   await page.screenshot({path:path.join(output,`pricing-${width}.png`)});
   await go('product');
  }
  let view=page.frame({name:'luster-product'});
  await view.getByRole('link',{name:'Try an example →',exact:true}).click();
  await page.waitForURL(url=>url.pathname===new URL('trial/',base).pathname);view=await ready('editor');
  await view.waitForFunction(()=>window.lusterTrial?.state.ready&&document.querySelectorAll('#cards .card').length===6,undefined,{timeout:60000});
  assert.equal(await page.locator('.siteHeader #export').count(),0);
  assert.equal(await view.locator('.editorActions #export').count(),1);
  const recipe=await view.evaluate(()=>JSON.stringify(window.lusterTrial.state.recipe));
  await page.screenshot({path:path.join(output,'editor-en.png')});
  await view.locator('#export').click();const download=page.waitForEvent('download');await view.locator('#download').click();
  const png=fs.readFileSync(await(await download).path());assert.equal(png.readUInt32BE(16),410);assert.equal(png.readUInt32BE(20),512);
  await view.locator('#closeModal').click();
  await go('product');view=await go('editor');assert.equal(await view.evaluate(()=>JSON.stringify(window.lusterTrial.state.recipe)),recipe);
  await page.locator('#siteLanguage').selectOption('zh-CN');
  await view.getByRole('button',{name:'导出',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.siteNav a').allTextContents(),['首页','产品','价格','编辑器']);
  await view.locator('#export').click();assert(await view.getByRole('button',{name:'下载 PNG 预览',exact:true}).isVisible());await view.locator('#closeModal').click();
  await view.locator('#file').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  await view.waitForFunction(()=>document.getElementById('errorNotice').textContent.includes('请选择'));
  await view.locator('[data-sample="card"]').click();
  await view.waitForFunction(()=>window.lusterController.file?.name==='luster-example-card.png'&&[...document.querySelectorAll('[data-sample]')].every(button=>!button.disabled));
  await page.screenshot({path:path.join(output,'editor-zh.png')});
  await page.setViewportSize({width:320,height:900});
  assert(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Chinese editor overflow');
  await page.screenshot({path:path.join(output,'editor-zh-320.png')});
  await page.setViewportSize({width:1440,height:900});
  view=await go('pricing');await view.getByText('价格待公布。',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'pricing-zh.png')});
  await page.goBack();await ready('editor');
  await page.reload();view=await ready('editor');assert.equal(await page.locator('#siteLanguage').inputValue(),'zh-CN');
  await page.locator('#siteLanguage').selectOption('en');
  await page.goto(`${base}trial/app/workbench/trial.html?sample=poster`);
  await page.waitForURL(url=>url.pathname===new URL('trial/',base).pathname);view=await ready('editor');
  await view.waitForFunction(()=>window.lusterController?.file?.name==='luster-example-poster.png'&&[...document.querySelectorAll('[data-sample]')].every(button=>!button.disabled));
  for(const file of ['pro.html','pro.js','project.js','export-web.mjs','export-unity.mjs'])assert.equal((await context.request.get(`${base}trial/app/workbench/${file}`)).status(),404);
  await page.goto(`${base}showcase/`);await page.waitForURL(url=>url.pathname===new URL(base).pathname);await ready('home');
  const zh=await browser.newContext({locale:'zh-CN',reducedMotion:'reduce'}),zhPage=await zh.newPage();
  await zhPage.goto(`${base}product/`);await zhPage.waitForFunction(()=>document.getElementById('siteLanguage').value==='zh-CN');
  assert.equal(await zhPage.locator('.siteNav [aria-current="page"]').textContent(),'产品');
  assert.equal(await zhPage.locator('#pageFrames').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await zh.close();assert.deepEqual(errors,[]);
  console.log('Public shell: persistent bilingual navigation, fading views, editor retention, downloads, history, language persistence and legacy links passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
