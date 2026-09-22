// Run the static demo server first. Uses the same optional browser overrides as tests.
const {chromium,launchOptions}=require('../tests/support/browser.cjs');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../.test-output/cover');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch(launchOptions);
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1100}});
    await page.goto('http://127.0.0.1:8798');
    await page.waitForFunction(()=>window.foilDemo?.state().ready);
    await page.evaluate(()=>foilDemo.setAngle(-4));
    await page.locator('#stage').screenshot({path:path.join(out,'book-b14.png')});
    const captures=await page.evaluate(()=>{
      return [-4,0,4].map((angle,i)=>{
        const r=foilDemo.renderers[[0,1,3][i]];
        r.render({angle});
        return {angle,data:r.canvas.toDataURL().split(',')[1]};
      });
    });
    for(const {angle,data} of captures)fs.writeFileSync(path.join(out,`material-${angle}.png`),Buffer.from(data,'base64'));
    console.log('Captured book and three B14 material samples in .test-output/cover');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
