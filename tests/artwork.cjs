const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(launchOptions);
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8798');
  await page.waitForFunction(()=>foilDemo.state().ready);
  const comparisons=await page.evaluate(async()=>{
   const originals=await Promise.all([0,1,2,3,4,5,6,7].map(async i=>{
    const image=new Image();image.src=`./demo/assets/images/art-${['orbit','silk','ribbon','facet','diagonal','fold','grain','wave'][i]}.png`;await image.decode();return image;
   }));
   const rows=[];
   for(const variant of ['B11','B14']){
    await foilDemo.restore(variant);
    for(const angle of [-4,0,4])for(let i=0;i<8;i++){
     const renderer=foilDemo.renderers[i],webp=document.querySelector(`#slot${i} .base-preview`);
     renderer.setBackground(webp);renderer.render({angle});const optimized=renderer.canvas.toDataURL();
     renderer.setBackground(originals[i]);renderer.render({angle});const original=renderer.canvas.toDataURL();
     rows.push({variant,angle,index:i,exact:optimized===original});
     renderer.setBackground(webp);
    }
   }
   return rows;
  });
  assert(comparisons.every(row=>row.exact),JSON.stringify(comparisons.filter(row=>!row.exact)));
  console.log(`PASS: ${comparisons.length} complete material composites exactly match PNG originals`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
