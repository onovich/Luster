const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(launchOptions);
 try{
  const page=await browser.newPage();
  let release;
  const gate=new Promise(resolve=>release=resolve),errors=[];
  let shaders=0;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().endsWith('/B14.frag'))shaders++;});
  await page.route('**/normal-7.delta.gz',async route=>{await gate;await route.continue();});
  await page.goto('http://127.0.0.1:8798',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>foilDemo.renderers.filter(Boolean).length===7);
  assert.equal(await page.locator('.pocket').count(),8);
  assert.equal(await page.locator('#slot7 .base-preview').isVisible(),true);
  assert.equal(await page.locator('#pocket7').isVisible(),false);
  assert.equal(await page.locator('#pocket0').isVisible(),true);
  assert.equal(await page.locator('#variant').isDisabled(),true);
  await page.locator('#view-material').click();
  await page.locator('.material-thumb').nth(7).click();
  assert.equal(await page.locator('.pocket:visible').count(),1);
  release();
  await page.waitForFunction(()=>foilDemo.state().ready);
  assert.equal(await page.locator('#pocket7').isVisible(),true);
  assert.equal(await page.locator('#variant').isDisabled(),false);
  assert.equal(shaders,1,'Each shader is fetched only once');
  assert.deepEqual(errors,[]);
  await page.close();

  const failed=await browser.newPage();
  await failed.route('**/normal-6.delta.gz',route=>route.abort());
  await failed.goto('http://127.0.0.1:8798');
  await failed.waitForFunction(()=>document.getElementById('status').textContent.includes('请重试'));
  assert.equal(await failed.locator('#slot6 .base-preview').isVisible(),true);
  assert.equal(await failed.locator('#pocket6').isVisible(),false);
  assert.equal(await failed.locator('#pocket0').isVisible(),true);
  assert.equal(await failed.evaluate(()=>foilDemo.state().ready),false);
  await failed.close();

  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{window.DecompressionStream=undefined;});
  await fallback.goto('http://127.0.0.1:8798');
  await fallback.waitForFunction(()=>foilDemo.state().ready);
  assert.deepEqual(await fallback.evaluate(()=>foilDemo.state().errors),[]);
  console.log('PASS: progressive loading, base-image fallback, shader deduplication, failed asset isolation, raw-byte compatibility');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
