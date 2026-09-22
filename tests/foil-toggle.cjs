const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch(launchOptions);try{
 for(const width of [390,1536]){
  const p=await b.newPage({viewport:{width,height:1024}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8798');await p.waitForFunction(()=>window.foilDemo?.state().ready);
  await p.locator('#view-material').click();await p.waitForFunction(()=>!document.body.dataset.viewTransition);
  const toggle=p.getByRole('switch',{name:'Foil layer',exact:true});assert.equal(await toggle.getAttribute('aria-checked'),'true');
  const box=await toggle.boundingBox();assert(box.height>=44&&box.width>=44);
  await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'false');
  await p.waitForFunction(()=>foilDemo.renderers[0].layers.film>0&&foilDemo.renderers[0].layers.film<1);
  await p.waitForFunction(()=>foilDemo.renderers.every(r=>r.layers.film===0));
  const dynamic=await p.evaluate(()=>{const r=foilDemo.renderers[0];r.render({angle:-4});const a=r.canvas.toDataURL();r.render({angle:4});return a!==r.canvas.toDataURL()&&r.layers.card===1;});assert(dynamic);
  await p.locator('#materialNext').click();assert.equal(await toggle.getAttribute('aria-checked'),'false');
  await p.evaluate(()=>foilDemo.restore('B11'));assert(await p.evaluate(()=>foilDemo.renderers.every(r=>r.layers.film===0)));
  await toggle.focus();await p.keyboard.press('Space');await p.waitForFunction(()=>foilDemo.renderers.every(r=>r.layers.film===1));
  await toggle.evaluate(el=>{el.click();el.click();el.click();});await p.waitForFunction(()=>foilDemo.renderers.every(r=>r.layers.film===0));
  await p.emulateMedia({reducedMotion:'reduce'});await toggle.click();assert(await p.evaluate(()=>foilDemo.renderers.every(r=>r.layers.film===1)));
  await p.locator('#view-book').click();assert(!(await toggle.isVisible()));await p.locator('#view-material').click();assert(await toggle.isVisible());
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await p.screenshot({path:`.test-output/foil-toggle-${width}.png`,fullPage:true});await p.close();
 }
 console.log('PASS: foil switch fades only sleeve, keeps card dynamic, supports keyboard/reversal/reduced motion, persists through selection and presets, desktop/mobile');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
