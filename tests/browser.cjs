const {chromium,launchOptions}=require('./support/browser.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.test-output');fs.mkdirSync(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
(async()=>{
 const browser=await chromium.launch(launchOptions);
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const report={optics:[],controls:[],sizes:[],errors};
 try{
 await page.goto('http://127.0.0.1:8798');await page.waitForFunction(()=>window.foilDemo?.state().ready,{},{timeout:90000});
 await page.screenshot({path:path.join(out,'book-b14.png'),fullPage:true});
 
 // Reference and new outputs: same GPU and raster size, reflection/normal only, no background differences.
 const ref=await browser.newPage();
 for(const variant of ['B14','B11']){
  await ref.goto(`http://127.0.0.1:8798/tests/fixtures/approved/${variant}.html`);await ref.waitForFunction(id=>window[id.toLowerCase()+'Lab']?.state().ready,variant,{timeout:90000});
  await page.evaluate(v=>foilDemo.restore(v),variant);
  for(const inspect of [1,3])for(const angle of [-4,-2,0,2,4]){
   const original=await ref.evaluate(({variant,inspect,angle})=>{document.getElementById('inspect').value=inspect;const lab=window[variant.toLowerCase()+'Lab'];lab.setAngle(angle);return lab.capture().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>x.data);},{variant,inspect,angle});
   const current=await page.evaluate(({inspect,angle})=>{document.getElementById('inspect').value=inspect;foilDemo.setAngle(angle);return foilDemo.capture();},{inspect,angle});
   const exact=current.every((x,i)=>x===original[i]);
   let rounding=null;
   if(!exact)rounding=await page.evaluate(async({original,current})=>{
    const decode=async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    let max=0,changed=0,total=0;for(let i=0;i<current.length;i++){const a=await decode(original[i]),b=await decode(current[i]);total+=a.length;for(let k=0;k<a.length;k++){const d=Math.abs(a[k]-b[k]);max=Math.max(max,d);if(d)changed++;}}return {max,changed,total};
   },{original,current});
   const matches=exact||(inspect===1&&rounding.max<=1&&rounding.changed/rounding.total<.0001);
   report.optics.push({variant,inspect,angle,exact,matches,rounding,pockets:8});
   if(!exact){for(let i=0;i<8;i++)if(current[i]!==original[i]){fs.writeFileSync(path.join(out,`${variant}-${inspect}-${angle}-${i}-old.png`),Buffer.from(original[i].split(',')[1],'base64'));fs.writeFileSync(path.join(out,`${variant}-${inspect}-${angle}-${i}-new.png`),Buffer.from(current[i].split(',')[1],'base64'));}}
  }
 }
 await ref.close();
 await page.evaluate(()=>foilDemo.restore('B14'));
 await page.locator('#inspect').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input'));});
 // Every material control commits the value to all renderer instances.
 for(const [id,value] of Object.entries({light:20,period:1,spread:1.2,strength:.4,flatFloor:.2,localBoost:2,threshold:.02,softness:.04,whiteGain:2,richness:15,bend:.3})){
  await page.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  assert.equal(await page.evaluate(id=>foilDemo.state().parameters[id],id),value);assert.equal(await page.evaluate(id=>foilDemo.renderers.every(r=>r.parameters[id]===foilDemo.state().parameters[id]),id),true);report.controls.push(id);
 }
 await page.locator('#enabled').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('input'));});assert.equal(await page.evaluate(()=>foilDemo.state().parameters.enabled),false);await page.locator('#enabled').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('input'));});
 for(const variant of ['B11','B14']){await page.evaluate(v=>foilDemo.restore(v),variant);await page.waitForFunction(v=>foilDemo.state().variant===v,variant);await page.locator('#restore').evaluate(el=>el.click());await page.waitForFunction(()=>!document.getElementById('variant').disabled);assert.deepEqual(await page.evaluate(()=>foilDemo.state().parameters),JSON.parse(fs.readFileSync(path.join(root,`tests/fixtures/approved/${variant}.json`),'utf8')));}
 await page.locator('#uniform').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>foilDemo.state().parameters.flatFloor),1);await page.locator('#resetLocal').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>foilDemo.state().parameters.flatFloor),.04);
 await page.locator('#uniformStructure').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>foilDemo.state().parameters.richness),0);await page.locator('#restoreStructure').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>foilDemo.state().parameters.richness),22);
 for(const inspect of ['1','3','4','5','0'])await page.locator('#inspect').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input'));},inspect);
 await page.locator('#angle').evaluate(el=>{el.value=1.25;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>foilDemo.state().angle),1.25);
 // Pure tween tests cover exact timing; here validate UI targets and settle, with CPU rasterization allowed extra time.
 for(const angle of [-4,4,0]){await page.evaluate(v=>foilDemo.go(v),angle);await page.waitForFunction(v=>foilDemo.state().angle===v,angle,{timeout:20000});}
 await page.mouse.move(1,1);await page.evaluate(()=>foilDemo.go(4));await page.waitForFunction(()=>foilDemo.state().angle>0&&foilDemo.state().angle<4);const reversal=await page.evaluate(()=>{const before=foilDemo.state().angle;foilDemo.go(-4);return {before,after:foilDemo.state().angle};});assert.equal(reversal.before,reversal.after);await page.waitForFunction(()=>foilDemo.state().angle===-4);
 for(const id of ['play','dwell']){await page.locator('#'+id).evaluate(el=>el.click());await page.waitForTimeout(500);await page.locator('#'+id).evaluate(el=>el.click());}
 await page.evaluate(()=>foilDemo.go(0));await page.waitForFunction(()=>!foilDemo.state().active);await page.waitForTimeout(200);const rest=await page.evaluate(()=>({count:foilDemo.state().drawCount,images:foilDemo.renderers.map(r=>r.canvas.toDataURL())}));await page.waitForTimeout(600);const rest2=await page.evaluate(()=>({count:foilDemo.state().drawCount,images:foilDemo.renderers.map(r=>r.canvas.toDataURL())}));assert.deepEqual(rest,rest2);report.rest={noFrames:true,identicalPixels:true};
 
 await page.locator('#stage').scrollIntoViewIfNeeded();const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5);await page.waitForFunction(()=>foilDemo.state().angle===-4);await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.waitForFunction(()=>foilDemo.state().angle===4);await page.mouse.move(1,1);await page.waitForFunction(()=>foilDemo.state().angle===0);
 await page.locator('#slot0').hover();await page.waitForFunction(()=>foilDemo.state().cardOffsets[0]===55/228*274);
 assert.equal(await page.locator('#slot0').evaluate(el=>getComputedStyle(el).scale),'none');
 const lifted=await page.evaluate(()=>({offset:foilDemo.state().cardOffsets[0],canvasTop:document.querySelector('#slot0 canvas').offsetTop,content:getComputedStyle(document.querySelector('#slot0 .card-content')).translate}));
 assert.equal(lifted.canvasTop,0);assert.notEqual(lifted.content,'none');
 await page.screenshot({path:path.join(out,'book-hover.png'),fullPage:true});
 await page.evaluate(()=>document.getElementById('inspect').value='3');const hoverNormals=await page.evaluate(()=>{foilDemo.setAngle(-4);return foilDemo.capture()[0];});
 await page.mouse.move(1,1);await page.waitForFunction(()=>foilDemo.state().cardOffsets[0]===0);
 const restNormals=await page.evaluate(()=>{foilDemo.setAngle(-4);return foilDemo.capture()[0];});assert.equal(hoverNormals,restNormals,'Sleeve normal field stays fixed during hover');await page.evaluate(()=>{document.getElementById('inspect').value='0';foilDemo.setAngle(-4);});
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#slot0').hover();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>foilDemo.state().cardOffsets[0]),0);await page.mouse.move(1,1);await page.emulateMedia({reducedMotion:'no-preference'});
 report.hover={cardLift:lifted.offset,stationarySleeve:true,noScaling:true,reducedMotion:true};
 await page.locator('#view-material').click();await page.waitForFunction(()=>!document.body.dataset.viewTransition);for(let i=0;i<8;i++){await page.locator('.material-thumb').nth(i).click();assert.equal(await page.locator('.pocket:visible').count(),1);}await page.locator('.material-thumb').nth(0).click();await page.screenshot({path:path.join(out,'material-b14.png'),fullPage:true});await page.locator('#view-book').click();await page.waitForFunction(()=>!document.body.dataset.viewTransition);
 for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:1000});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);report.sizes.push({width,overflow});if(width===320)await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});}
 await page.evaluate(()=>foilDemo.setAngle(-4));await page.screenshot({path:path.join(out,'book-b14.png'),fullPage:true});
 report.state=await page.evaluate(()=>foilDemo.state());assert.deepEqual(report.state.glErrors,Array(8).fill(0));assert.deepEqual(errors,[]);assert.equal(report.optics.every(x=>x.matches),true,'Reflection and normal passes must match reference pixels');
 report.passed=true;
 }finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify({passed:report.passed,comparisonCases:report.optics.length,pocketComparisons:report.optics.length*8,controls:report.controls.length,sizes:report.sizes,errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
