const {chromium,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve(__dirname,'../../.test-output/layout');

(async()=>{
  const browser=await chromium.launch(launchOptions);
  try{
    const cases=[[320,568],[768,768],[1024,768],[1366,768],[1440,900],[1920,1080]];
    const report=[];
    for(const [width,height] of cases){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:8798/dist-online/pro/app/workbench/pro.html');
      await page.waitForFunction(()=>!!window.lusterPro);
      const base64=await page.evaluate(()=>{
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
        const x=canvas.getContext('2d');x.fillStyle='#f5ecd9';x.fillRect(0,0,320,200);
        x.fillStyle='#1646ce';x.fillRect(30,30,140,100);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      await page.locator('#file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
      await page.waitForFunction(()=>window.lusterPro?.state.ready);
      const frame=await page.evaluate(()=>{
        const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
        return {scrollWidth:document.documentElement.scrollWidth,actions:['newProject','openLabel','saveProject','export'].map(rect),preview:rect('preview')};
      });
      for(const action of frame.actions){
        assert(action.left>=0&&action.right<=width,`Header action clipped at ${width}`);
        assert(action.top>=0&&action.bottom<=height,`Header action vertically clipped at ${width}`);
      }
      assert(frame.scrollWidth<=width+1,`Horizontal overflow at ${width}: ${frame.scrollWidth}`);
      if(width===320){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'pro-320x568-base.png')});}
      await page.locator('#export').click();
      const modal=await page.evaluate(()=>{const r=document.getElementById('proBackdrop').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
      assert(modal.left>=0&&modal.right<=width+1&&modal.bottom<=height+1);
      await page.locator('#unityTab').click();
      await page.locator('#proExportUnity').scrollIntoViewIfNeeded();
      assert(await page.locator('#proExportUnity').isVisible());
      fs.mkdirSync(output,{recursive:true});
      await page.screenshot({path:path.join(output,`pro-${width}x${height}.png`)});
      assert.deepEqual(errors,[]);
      report.push({width,height,frame,modal,errors});
      await page.close();
    }
    for(const [width,height] of [[320,568],[768,768],[1440,900]]){
      const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:8798/dist-online/trial/app/workbench/trial.html');
      await page.waitForFunction(()=>!!window.lusterTrial);
      const base64=await page.evaluate(()=>{
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
        const x=canvas.getContext('2d');x.fillStyle='#f5ecd9';x.fillRect(0,0,320,200);
        x.fillStyle='#1646ce';x.fillRect(30,30,140,100);
        return canvas.toDataURL('image/png').split(',')[1];
      });
      await page.locator('#file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
      await page.waitForFunction(()=>window.lusterTrial.state.ready);
      const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert(scrollWidth<=width+1,`Trial horizontal overflow at ${width}`);
      await page.locator('#export').click();
      await page.locator('#download').scrollIntoViewIfNeeded();
      assert(await page.locator('#download').isVisible());
      await page.screenshot({path:path.join(output,`trial-${width}x${height}.png`)});
      await page.locator('#saveHandoff').scrollIntoViewIfNeeded();
      assert(await page.locator('#saveHandoff').isVisible());
      assert.deepEqual(errors,[]);
      report.push({edition:'trial',width,height,scrollWidth,errors});
      await page.close();
    }
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report.map(({edition='pro',width,height,frame,scrollWidth})=>({edition,width,height,scrollWidth:frame?.scrollWidth??scrollWidth})),null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
