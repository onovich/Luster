const {browserType,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.LUSTER_PUBLIC_URL||'http://127.0.0.1:8798/dist/';
(async()=>{
 const browser=await browserType.launch(launchOptions);
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error('Public page error:',page.url(),error.stack);});
  page.on('requestfailed',request=>console.error('Public request failed:',request.url(),request.failure()?.errorText));
  const output=path.resolve(__dirname,'../../.test-output/public');fs.mkdirSync(output,{recursive:true});
  async function navigation(current){
   assert.deepEqual(await page.locator('.siteNav a').allTextContents(),['Home','Product','Pricing','Editor']);
   assert.equal(await page.locator('.siteNav [aria-current="page"]').textContent(),current);
  }
  for(const width of [320,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base);
   await page.waitForFunction(()=>window.foilDemo?.state().ready,undefined,{timeout:60000});
   await navigation('Home');
   if(width===1440)assert(await page.locator('.console').evaluate(element=>element.getBoundingClientRect().bottom<=innerHeight),'Gallery controls must remain in the desktop viewport');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Gallery overflow at ${width}`);
   await page.screenshot({path:path.join(output,`gallery-${width}.png`),fullPage:true});
   await page.getByRole('link',{name:'Product',exact:true}).click();
   assert.equal(new URL(page.url()).pathname,new URL(`${base}product/`).pathname);
   await navigation('Product');
   await page.locator('.heroMaterial img').waitFor();
   await page.waitForFunction(()=>{const image=document.querySelector('.heroMaterial img');return image?.complete&&image.naturalWidth>0;});
   assert(await page.locator('.heroMaterial img').evaluate(image=>image.complete&&image.naturalWidth>0));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Landing overflow at ${width}`);
   await page.screenshot({path:path.join(output,`landing-${width}.png`),fullPage:true});
   assert.equal(await page.locator('.planGrid').count(),0,'Pricing comparison belongs on the pricing page');
   await page.getByRole('link',{name:'Pricing',exact:true}).click();
   await navigation('Pricing');
   assert.equal(new URL(page.url()).pathname,new URL(`${base}pricing/`).pathname);
   assert(await page.locator('.planGrid').isVisible());
   assert.equal(await page.locator('.planPrice').first().textContent(),'Free');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Pricing overflow at ${width}`);
   await page.screenshot({path:path.join(output,`pricing-${width}.png`),fullPage:true});
   await page.getByRole('link',{name:'Product',exact:true}).click();
  }
  for(const file of ['pro.html','pro.js','pro.css','project.js','export-web.mjs','export-unity.mjs','unity/Luster.shader']){
   assert.equal((await context.request.get(`${base}trial/app/workbench/${file}`)).status(),404,file);
  }
  await page.getByRole('link',{name:'Try an example →',exact:true}).click();
  await page.waitForFunction(()=>window.lusterTrial?.state.ready);
  await page.waitForFunction(()=>document.querySelectorAll('#cards .card').length===6,undefined,{timeout:60000});
  await navigation('Editor');
  await page.screenshot({path:path.join(output,'trial-example.png'),fullPage:true});
  await page.locator('#export').click();
  const download=page.waitForEvent('download');await page.locator('#download').click();
  const png=fs.readFileSync(await(await download).path());
  assert.equal(png.readUInt32BE(16),410);assert.equal(png.readUInt32BE(20),512);
  await page.locator('#closeModal').click();
  await page.locator('#file').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  await page.locator('#errorNotice').waitFor({state:'visible'});
  await page.locator('[data-sample="card"]').click();
  await page.waitForFunction(()=>window.lusterTrial?.state.ready
   &&window.lusterController.file?.name==='luster-example-card.png'
   &&[...document.querySelectorAll('[data-sample]')].every(button=>!button.disabled)
   &&document.getElementById('errorNotice').hidden);
  await page.getByRole('link',{name:'Product',exact:true}).click();
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await page.waitForFunction(()=>window.foilDemo?.state().ready,undefined,{timeout:60000});
  await page.getByRole('link',{name:'Editor',exact:true}).click();
  await page.waitForFunction(()=>!!window.lusterTrial);
  await page.evaluate(async()=>{await window.lusterRestoration;await window.lusterController.whenMapsReady();});
  assert.equal(new URL(page.url()).pathname,new URL(`${base}trial/`).pathname);
  await page.goto(`${base}trial/app/workbench/trial.html?sample=poster`);
  await page.waitForURL(url=>url.pathname===new URL(`${base}trial/`).pathname);
  await page.waitForFunction(()=>window.lusterController?.file?.name==='luster-example-poster.png'
   &&[...document.querySelectorAll('[data-sample]')].every(button=>!button.disabled));
  await page.goto(`${base}showcase/`);
  await page.waitForURL(url=>url.pathname===new URL(base).pathname);
  await page.waitForFunction(()=>window.foilDemo?.state().ready,undefined,{timeout:60000});
  assert.deepEqual(errors,[]);
  console.log('Public site: gallery home, product, Trial, legacy redirects with examples, 512px PNG and Pro exclusion passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
