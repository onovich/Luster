const {chromium,launchOptions}=require('./support/browser.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch(launchOptions);try{
 fs.mkdirSync('.test-output',{recursive:true});
 const p=await browser.newPage({viewport:{width:1536,height:1024},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8798');await p.waitForFunction(()=>window.foilDemo?.state().ready,null,{timeout:120000});
 const report=await p.evaluate(async()=>{
  const diff=(a,b)=>{let sum=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++)sum+=Math.abs(a[i+c]-b[i+c]);return sum/(a.length*.75);};
  const pixels=(r,angle,layers)=>{r.setLayers(layers);r.setCardPose(0,0);r.render({angle});const a=new Uint8Array(r.canvas.width*r.canvas.height*4);r.gl.readPixels(0,0,r.canvas.width,r.canvas.height,r.gl.RGBA,r.gl.UNSIGNED_BYTE,a);return a;};
  const results=[];
  for(const variant of ['B11','B14']){
   await foilDemo.restore(variant);
   for(const [i,r] of foilDemo.renderers.entries()){
    const left=pixels(r,-4,{card:1,film:0}),right=pixels(r,4,{card:1,film:0}),near=pixels(r,3.99,{card:1,film:0});
    const light=r.parameters.light;r.setParameters({light:light+10});const relit=pixels(r,4,{card:1,film:0});r.setParameters({light});
    const both=pixels(r,4,{card:1,film:1}),film=pixels(r,4,{card:0,film:1});
    results.push({variant,i,lightChange:diff(right,relit),cardChange:diff(left,right),smallChange:diff(right,near),sleeveContribution:diff(both,right),cardContribution:diff(both,film)});
   }
  }
  const r=foilDemo.renderers[0],gl=r.gl;let uploads=0,draws=0;
  const tex=gl.texImage2D.bind(gl),draw=gl.drawArrays.bind(gl);gl.texImage2D=(...args)=>{uploads++;return tex(...args);};gl.drawArrays=(...args)=>{draws++;return draw(...args);};
  for(let i=0;i<12;i++){r.setCardPose(i*.02,i*.004);r.render({angle:i/2-3});}
  const animation={uploads,draws};gl.texImage2D=tex;gl.drawArrays=draw;
  r.setCardPose(.24,.052);r.setLayers({card:1,film:0});r.render({angle:3});const a=new Uint8Array(r.canvas.width*r.canvas.height*4);gl.readPixels(0,0,r.canvas.width,r.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);
  r.setLayers({film:1});r.render({angle:3});const b=new Uint8Array(a.length);gl.readPixels(0,0,r.canvas.width,r.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,b);
  let exposed=0,exposedFilmDelta=0,coveredDelta=0;for(let y=0;y<r.canvas.height;y++)for(let x=0;x<r.canvas.width;x++){const i=(y*r.canvas.width+x)*4;if(y>r.baseHeight+3&&a[i+3]){exposed++;for(let c=0;c<3;c++)exposedFilmDelta+=Math.abs(a[i+c]-b[i+c]);}else if(y<r.baseHeight-3)coveredDelta+=Math.abs(a[i]-b[i]);}
  const {LayeredRenderer}=await import('/src/index.js');
  const tiny=document.createElement('canvas'),art=document.createElement('canvas');art.width=art.height=2;
  const layer=await LayeredRenderer.create(tiny,{normal:{data:new Uint8Array(16).fill(128),width:2,height:2},background:art,surface:{data:new Uint8Array(16).fill(128),width:2,height:2,type:1},width:32,height:32});
  layer.resize(40,30);layer.render();const size=[tiny.width,tiny.height];let invalid=false;try{layer.setLayers({card:2});}catch{invalid=true;}
  const texture=layer.cardTexture;layer.dispose();layer.dispose();let disposed=false;try{layer.setCardPose(0,0);}catch{disposed=true;}
  const lifecycle={size,invalid,disposed,released:!layer.gl.isTexture(texture)};
  // A selected material redraw must not also draw the seven hidden cards.
  const counts=foilDemo.renderers.map(renderer=>{const g=renderer.gl,d=g.drawArrays.bind(g),counter={n:0};g.drawArrays=(...args)=>{counter.n++;return d(...args);};return counter;});
  document.getElementById('view').value='material';document.getElementById('view').dispatchEvent(new Event('change'));foilDemo.setAngle(2);
  return {lifecycle,results,animation,exposed,exposedFilmDelta,coveredDelta,drawCounts:counts.map(c=>c.n),glErrors:foilDemo.renderers.map(r=>r.gl.getError())};
 });
 for(const row of report.results){assert(row.lightChange>.1);assert(row.cardChange>.1,JSON.stringify(row));assert(row.smallChange<row.cardChange*.05,JSON.stringify(row));assert(row.sleeveContribution>.1);assert(row.cardContribution>.1);}
 assert.deepEqual(report.lifecycle,{size:[40,40],invalid:true,disposed:true,released:true});
 assert.deepEqual(report.animation,{uploads:0,draws:12});assert(report.exposed>100);assert.equal(report.exposedFilmDelta,0);assert(report.coveredDelta>100);assert(report.drawCounts[0]>0);assert(report.drawCounts.slice(1).every(v=>v===0));assert(report.glErrors.every(v=>v===0));assert.deepEqual(errors,[]);
 fs.writeFileSync('.test-output/layers-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
