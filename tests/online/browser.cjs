const {browserType,launchOptions}=require('../support/browser.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const repo=path.resolve(__dirname,'../..'),output=path.join(repo,'.test-output');
const trialBase='http://127.0.0.1:8798/dist-online/trial/';
const proBase='http://127.0.0.1:8798/dist-online/pro/';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function waitForReady(page,edition){
  try{await page.waitForFunction(key=>window[key]?.state.ready,edition);}
  catch(error){
    console.error('Workbench did not become ready:',await page.evaluate(key=>({
      edition:key,state:window[key]?.state,status:document.getElementById('status')?.textContent,
      mapMode:window.lusterController?.mapMode,webgl:!!document.createElement('canvas').getContext('webgl')
    }),edition));
    throw error;
  }
}
async function waitForCandidates(page,edition){
  const started=Date.now();
  try{await page.waitForFunction(()=>document.querySelectorAll('#cards .card').length===6,undefined,{timeout:60000});}
  catch(error){
    console.error(`${edition} candidates did not finish:`,await page.evaluate(()=>({
      count:document.querySelectorAll('#cards .card').length,status:document.getElementById('status')?.textContent
    })));
    throw error;
  }
  console.log(`${edition} candidates ready in ${Date.now()-started}ms`);
}
(async()=>{
  const {readStoredZip}=await import('../../app/workbench/zip-store.js');
  const {openProjectPackage}=await import('../../app/workbench/project.js');
  const browser=await browserType.launch(launchOptions);
  try{
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:1366,height:768}});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:8798/'))external.push(request.url());});
    assert.equal((await context.request.get(`${trialBase}app/workbench/pro.html`)).status(),404);
    await page.goto(trialBase);
    fs.mkdirSync(path.join(output,'online-preview'),{recursive:true});
    await page.screenshot({path:path.join(output,'online-preview','trial-entry.png')});
    await page.getByRole('link',{name:'Open Trial'}).click();
    await page.waitForFunction(()=>!!window.lusterTrial);
    const art=Buffer.from(await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=500;
      const x=canvas.getContext('2d');x.fillStyle='#121629';x.fillRect(0,0,400,500);
      x.fillStyle='#f2e9d2';x.fillRect(25,25,350,450);
      x.fillStyle='#102343';x.font='bold 68px Arial';
      x.fillText('FORM',38,125);x.fillText('FOLLOWS',38,200);x.fillText('LIGHT',38,275);
      x.font='bold 18px Arial';x.fillText('MATERIAL STUDY',40,430);
      return canvas.toDataURL('image/png').split(',')[1];
    }),'base64');
    await page.locator('#file').setInputFiles({name:'typography.png',mimeType:'image/png',buffer:art});
    await waitForReady(page,'lusterTrial');
    await waitForCandidates(page,'Trial');
    await page.locator('#export').click();
    const pngDownload=page.waitForEvent('download');await page.locator('#download').click();
    const png=fs.readFileSync(await (await pngDownload).path());
    assert.equal(png[0],137);assert(png.length>1000);
    await page.goto(proBase);
    await page.screenshot({path:path.join(output,'online-preview','pro-entry.png')});
    await page.getByRole('link',{name:'Open Pro'}).click();
    await page.waitForFunction(()=>!!window.lusterPro);
    assert.equal(await page.locator('.mcpStatus').count(),0);
    assert.equal(await page.locator('#saveAsProject').count(),0);
    assert.equal(await page.evaluate(()=>window.lusterDesktop),undefined);
    await page.locator('#file').setInputFiles({name:'typography.png',mimeType:'image/png',buffer:art});
    await waitForReady(page,'lusterPro');
    await waitForCandidates(page,'Pro');
    await page.locator('[data-template="prism"]').click();
    await page.waitForFunction(()=>window.lusterPro?.state.ready&&window.lusterPro.state.recipe.template==='prism');
    for(const [key,value] of [['strength',0.64],['richness',30],['light',12]]){
      await page.locator(`[data-number="${key}"]`).evaluate((input,next)=>{input.value=String(next);input.dispatchEvent(new Event('change',{bubbles:true}));},value);
    }
    await page.waitForFunction(()=>window.lusterPro.state.ready&&window.lusterPro.state.recipe.strength===0.64&&window.lusterPro.state.recipe.richness===30&&window.lusterPro.state.recipe.light===12);
    const preview=Buffer.from((await page.locator('#preview').evaluate(canvas=>canvas.toDataURL('image/png'))).split(',')[1],'base64');
    const projectDownload=page.waitForEvent('download');await page.locator('#saveProject').click();
    const project=await projectDownload;
    const projectBytes=new Uint8Array(fs.readFileSync(await project.path()));
    assert.equal((await openProjectPackage(projectBytes)).recipe.template,'prism');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#saveStatus').textContent(),'Saved in this browser','Project must be saved locally before navigation');
    await page.locator('#export').click();
    const proPngDownload=page.waitForEvent('download');await page.locator('#proDownloadPng').click();
    const proPng=fs.readFileSync(await (await proPngDownload).path());
    assert.equal(sha(proPng),sha(preview),'Pro PNG must match the edited preview');
    assert.equal(await page.locator('#proExportWeb').isDisabled(),false);
    assert.equal(await page.locator('#proExportUnity').isDisabled(),false);
    await page.locator('#webTab').click();
    const webDownload=page.waitForEvent('download');await page.locator('#proExportWeb').click();
    const web=new Uint8Array(fs.readFileSync(await (await webDownload).path()));
    const webFiles=readStoredZip(web),webManifest=JSON.parse(new TextDecoder().decode(webFiles.get('manifest.json')));
    assert.equal(webManifest.template,'prism');assert(webFiles.has('src/shaders/B14.frag'));
    const targetRoot=path.join(output,'online-web-export');
    for(const [name,bytes] of webFiles){const target=path.resolve(targetRoot,name);assert(target.startsWith(targetRoot+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
    await page.goto('http://127.0.0.1:8798/.test-output/online-web-export/');
    await page.waitForFunction(()=>window.lusterWeb?.ready||window.lusterWeb?.error);
    assert.equal(await page.evaluate(()=>window.lusterWeb.ready),true);
    const exported=Buffer.from((await page.locator('#material').evaluate(canvas=>canvas.toDataURL('image/png'))).split(',')[1],'base64');
    assert.equal(sha(exported),sha(preview));
    await page.goto(`${proBase}app/workbench/pro.html`);
    try{await page.waitForFunction(()=>window.lusterPro?.state.ready&&window.lusterPro.state.recipe.template==='prism');}
    catch(error){console.error('Pro restoration state:',await page.evaluate(()=>({pro:window.lusterPro?.state,trial:window.lusterTrial?.state,status:document.getElementById('status')?.textContent,saveStatus:document.getElementById('saveStatus')?.textContent})));throw error;}
    await page.locator('#export').click();await page.locator('#unityTab').click();
    const unityDownload=page.waitForEvent('download');await page.locator('#proExportUnity').click();
    const unity=new Uint8Array(fs.readFileSync(await (await unityDownload).path()));
    const unityFiles=readStoredZip(unity),unityManifest=JSON.parse(new TextDecoder().decode(unityFiles.get('Assets/LusterExport/manifest.json')));
    assert.equal(unityManifest.template,'prism');assert(unityFiles.has('Assets/LusterExport/Runtime/LayeredUI.shader'));
    await page.locator('#openProject').setInputFiles({name:'named-project.luster',mimeType:'application/zip',buffer:Buffer.from(projectBytes)});
    await page.waitForFunction(()=>window.lusterPro?.state.projectName==='named-project'&&!window.lusterPro.state.dirty);
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForFunction(()=>window.lusterPro?.state.ready&&window.lusterPro.state.projectName==='named-project');
    assert.equal(await page.evaluate(()=>window.lusterPro.state.dirty),false,'Restored project must retain saved state');
    await page.evaluate(async base64=>{
      const original=createImageBitmap;
      let release;
      const blocked=new Promise(resolve=>{release=resolve;});
      window.createImageBitmap=(...args)=>blocked.then(()=>original(...args));
      try{
        const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
        const loading=window.lusterController.loadFile(new File([bytes],'late.png',{type:'image/png'}));
        await window.lusterController.resetProject();
        release();await loading;
      }finally{release();window.createImageBitmap=original;}
    },art.toString('base64'));
    assert.equal(await page.evaluate(()=>window.lusterTrial.state.ready),false,'New project must invalidate an in-flight image load');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    const report={webFiles:webFiles.size,unityFiles:unityFiles.size,previewSha256:sha(preview),exportSha256:sha(exported),trialPngBytes:png.length,errors,external};
    fs.writeFileSync(path.join(output,'online-browser-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
