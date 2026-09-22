const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch(launchOptions);try{
 for(const persistent of [false,true]){
  const p=await browser.newPage();let calls=0,fail=persistent;
  await p.route('**/B14.frag',r=>(++calls===1||fail)?r.fulfill({status:502,body:'Bad Gateway'}):r.continue());
  await p.goto('http://127.0.0.1:8798');
  if(persistent){await p.locator('#retry').waitFor({state:'visible'});assert.equal(calls,3);assert.equal(await p.evaluate(()=>foilDemo.state().ready),false);fail=false;await p.locator('#retry').click();}
  await p.waitForFunction(()=>foilDemo.state().ready);
  assert.equal(calls,persistent?4:2);assert.deepEqual(await p.evaluate(()=>foilDemo.state().errors),[]);
  assert.equal(await p.locator('.pocket canvas:visible').count(),8);await p.close();
 }
 console.log('PASS: shared shader 502 retries once for all eight cards; persistent failure recovers through Retry');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
