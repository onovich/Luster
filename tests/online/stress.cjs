const {browserType,browserName,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const browser=await browserType.launch(launchOptions);
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8798/dist-online/pro/app/workbench/pro.html');
    await page.waitForFunction(()=>!!window.lusterPro);
    const artwork=Buffer.from(await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=3072;
      const context=canvas.getContext('2d');
      context.fillStyle='#f5ecd9';context.fillRect(0,0,4096,3072);
      context.fillStyle='#1646ce';context.fillRect(320,300,2100,1600);
      context.fillStyle='#e58a20';context.fillRect(2300,1100,1100,1300);
      return canvas.toDataURL('image/png').split(',')[1];
    }),'base64');
    const started=Date.now();
    await page.locator('#file').setInputFiles({name:'large-artwork.png',mimeType:'image/png',buffer:artwork});
    await page.waitForFunction(()=>window.lusterPro?.state.ready,{},{timeout:60000});
    const initialMs=Date.now()-started;
    assert.deepEqual(await page.evaluate(()=>window.lusterController.sourceDimensions),[4096,3072]);
    assert.equal(await page.evaluate(()=>Math.max(window.lusterController.art.width,window.lusterController.art.height)),1024);
    for(const template of ['fine-grain','prism','soft-folds','smooth'])await page.locator(`[data-template="${template}"]`).click();
    for(const value of [0.2,0.5,0.7])await page.locator('[data-number="strength"]').evaluate((input,next)=>{input.value=String(next);input.dispatchEvent(new Event('change',{bubbles:true}));},value);
    await page.waitForFunction(()=>window.lusterPro?.state.ready&&window.lusterPro.state.recipe.template==='smooth'&&window.lusterPro.state.recipe.strength===0.7,{},{timeout:60000});
    const churnMs=Date.now()-started-initialMs;
    await page.waitForFunction(()=>document.getElementById('saveStatus').textContent==='Saved in this browser',{},{timeout:15000});
    await page.locator('#export').click();
    assert.equal(await page.locator('#proBackdrop').isVisible(),true);
    for(let index=0;index<8;index++){
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.getElementById('proBackdrop').contains(document.activeElement)),true,'Export focus must remain in dialog');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#proBackdrop').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'export','Escape must restore focus');
    assert.deepEqual(errors,[]);
    const report={browser:browserName,source:[4096,3072],previewMaxSide:1024,initialMs,churnMs,finalTemplate:'smooth',finalStrength:0.7,localSave:true,keyboardDialog:true,errors};
    const destination=path.resolve(__dirname,'../../.test-output');
    fs.mkdirSync(destination,{recursive:true});
    fs.writeFileSync(path.join(destination,`online-stress-${browserName}.json`),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
