import {captureTransition} from './scheme-transition.js';
import {FoilRenderer} from '../src/index.js';
import {loadShader} from '../src/webgl/resources.js';
import {presets} from '../src/core/presets.js';
import {PoseTween} from '../src/core/parameters.js';
import {buildControls,syncControls} from './controls.js';
import {loadNormal} from './normal-loader.js';
import {CardMotion} from './card-motion.js';
const $=id=>document.getElementById(id), renderers=[],pose=new PoseTween(0),errors=[],cardMotions=[];
const artNames=['orbit','silk','ribbon','facet','diagonal','fold','grain','wave'];
let showcase=true,switching=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let variant='B14',params={...presets.B14,strength:.3},mode=null,time=0,last=0,frame=0,drawCount=0,ready=false;
function failure(error){document.body.dataset.load='error';$('retry').hidden=false;delete $('status').dataset.ready;errors.push(error.message);$('status').textContent=error.message;console.error(error);}
function draw(){
 const inspection=+$('inspect').value;
 for(let i=0;i<renderers.length;i++){const r=renderers[i];if(!r)continue;cardMotions[i]?.apply(r);r.setParameters(params);r.render({angle:pose.angle,inspect:inspection});}
 // The exhibit pose is shallow; the full optical angle still drives the shader.
 $('book').style.transform=`rotateY(${pose.angle*.8}deg)`;syncControls(params,pose.angle,variant);drawCount++;
}
function requestTick(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
function stop(){mode=null;$('play').textContent='Auto rotate';$('dwell').textContent='Dwell';for(const id of ['play','dwell'])$(id).setAttribute('aria-pressed','false');}
function go(angle){stop();pose.to(angle);requestTick();}
function tick(ms){
 frame=0;const dt=Math.max(0,Math.min((ms-last)/1000,.1));last=ms;
 if(mode){time+=dt;if(mode==='play')pose.set(4*Math.sin(time*Math.PI/4));
 else {const phase=time%3.16,side=phase<1.58?-1:1,t=Math.max(0,Math.min(1,(phase%1.58-1.2)/.38)),q=t*t*t*(t*(t*6-15)+10);pose.set(side*4*(1-2*q));}}
 else pose.advance(dt);
 for(const motion of cardMotions)motion?.advance(dt);
 draw();if(mode||pose.active||cardMotions.some(m=>m?.active))frame=requestAnimationFrame(tick);
}
function patch(values){params={...params,...values};draw();}
async function restore(next=variant){
 if(!ready||switching)return;
 switching=true;setSchemeBusy(true);
 stop();$('status').textContent='加载…';$('variant').disabled=true;let transition;
 try{const source=await loadShader(next);if(next!==variant&&!reducedMotion.matches){pose.set(pose.angle);draw();transition=captureTransition(renderers);}for(const r of renderers)r.setVariantSource(next,source);variant=next;params={...presets[next]};$('variant').value=next;if(next==='B11'&&+$('inspect').value===5)$('inspect').value=0;draw();if(transition)await transition.play();$('status').textContent='8 / 8 ready';$('status').dataset.ready='true';}
 catch(error){$('variant').value=variant;failure(error);}finally{transition?.dispose();switching=false;setSchemeBusy(false);}
}
buildControls($('controls'),(id,value)=>{if(id==='angle'){stop();pose.set(value);draw();}else patch({[id]:value});});
for(const id of ['angle','light','strength'])$('primaryControls').append($(id).closest('label'));
function setSchemeBusy(busy){for(const id of ['variant','left','center','right'])$(id).disabled=busy;}
for(const id of ['left','center','right'])$(id).onclick=()=>restore(variant==='B14'?'B11':'B14');
for(const id of ['play','dwell'])$(id).onclick=()=>{if(mode===id){stop();pose.set(pose.angle);draw();}else{stop();mode=id;time=id==='play'?Math.asin(pose.angle/4)*4/Math.PI:0;$(id).textContent=id==='play'?'Auto rotate':'Pause';$(id).setAttribute('aria-pressed','true');requestTick();}};
$('enabled').oninput=()=>patch({enabled:$('enabled').checked});$('inspect').oninput=draw;
$('variant').onchange=()=>restore($('variant').value);$('restore').onclick=()=>restore();
$('resetLocal').onclick=()=>patch(Object.fromEntries(['flatFloor','localBoost','threshold','softness','whiteGain'].map(k=>[k,presets[variant][k]])));
$('uniform').onclick=()=>patch({flatFloor:1,localBoost:1,whiteGain:1});
$('uniformStructure').onclick=()=>patch({richness:0});$('restoreStructure').onclick=()=>patch({richness:22,bend:.45});
$('stage').onpointermove=e=>{if(showcase){showcase=false;cardMotions[2]?.to(false);requestTick();}if(mode||!renderers.some(Boolean)||reducedMotion.matches)return;const rect=$('stage').getBoundingClientRect(),x=e.clientX-rect.left-rect.width/2,width=$('book').offsetWidth,material=$('view').value==='material',y=e.clientY-rect.top,outsideY=!material&&(y<rect.height*.17||y>rect.height*.83);const next=outsideY||Math.abs(x)>width*(material?.5:.44)?0:Math.abs(x)<3*width/1190?pose.target:x<0?-4:4;if(pose.target!==next)go(next);};
$('stage').onpointerleave=()=>{if(!mode&&renderers.some(Boolean))go(0);};
function setView(){for(const motion of cardMotions)motion?.to(false);requestTick();const material=$('view').value==='material';$('gestureHint').textContent=material?'Drag Angle to tilt':'Move across the album to tilt · Hover a card to lift';$('book').classList.toggle('material',material);for(const value of ['book','material'])$('view-'+value).setAttribute('aria-pressed',String($('view').value===value));$('pocketLabel').hidden=!material;for(let i=0;i<8;i++)$(`slot${i}`).hidden=material&&i!==+$('pocket').value;}
for(const value of ['book','material'])$('view-'+value).onclick=()=>{$('view').value=value;setView();};
$('view').onchange=setView;$('pocket').onchange=setView;
async function init(){
 stop();cancelAnimationFrame(frame);frame=0;
 document.body.dataset.load='loading';$('loadProgress').value=0;$('loadCount').textContent='0 / 8';
 ready=false;errors.length=0;setSchemeBusy(true);$('restore').disabled=true;$('retry').hidden=true;delete $('status').dataset.ready;
 for(const renderer of renderers)renderer?.dispose();renderers.length=0;cardMotions.length=0;$('pockets').replaceChildren();$('pocket').replaceChildren();
 syncControls(params,pose.angle,variant);
 const shader=loadShader(variant);
 const sleeve=new Image();sleeve.src=new URL('./assets/images/sleeve.svg',import.meta.url);
 const sleeveReady=sleeve.decode();
 let completed=0;
 const jobs=[];
 // Attach every base image immediately; reveal each canvas only after its first draw.
 for(let i=0;i<8;i++){
  const slot=document.createElement('div');slot.id=`slot${i}`;slot.className='pocket card';
  slot.style.left=([313,520,842,1048][i%4]/1536*100)+'%';slot.style.top=((i<4?242:514)/1024*100)+'%';
  {slot.setAttribute('aria-label',`Material sample ${i+1}`);slot.onpointerenter=()=>{if(!reducedMotion.matches&&$('view').value==='book'){cardMotions[i]?.to(true);requestTick();}};slot.onpointerleave=()=>{cardMotions[i]?.to(false);requestTick();};}
  const background=new Image();background.alt='';background.className='base-preview';
  background.src=new URL(`./assets/images/art-${artNames[i]}.webp`,import.meta.url);
  const canvas=document.createElement('canvas');canvas.id=`pocket${i}`;canvas.hidden=true;
  slot.append(background,canvas);$('pockets').append(slot);$('pocket').add(new Option(String(i+1),i));
  jobs.push((async()=>{
   let renderer;
   try{
    const [normal]=await Promise.all([loadNormal(i),background.decode(),shader,sleeveReady]);
    renderer=await FoilRenderer.create(canvas,{variant,normal,background});
    {const content=background.cloneNode();content.className='card-content';slot.insertBefore(content,canvas);cardMotions[i]=new CardMotion(slot,background,sleeve);}
    renderer.setParameters(params);renderer.render({angle:pose.angle,inspect:+$('inspect').value});
    renderers[i]=renderer;canvas.hidden=false;background.hidden=true;
    slot.classList.add('is-ready');completed++;$('loadProgress').value=completed;$('loadCount').textContent=`${completed} / 8`;$('status').textContent=`材质加载 ${completed} / 8`;
   }catch(error){renderer?.dispose();errors.push(error.message);console.error(error);}
  })());
 }
 if(matchMedia('(max-width: 600px)').matches)$('view').value='material';
 setView();
 $('status').textContent='材质加载 0 / 8';
 await Promise.all(jobs);
 ready=completed===8;
 if(ready){document.body.dataset.load='ready';loadShader(variant==='B14'?'B11':'B14').catch(()=>{});if($('view').value==='book'&&!reducedMotion.matches){cardMotions[2].to(true);requestTick();}draw();$('status').textContent='8 / 8 ready';$('status').dataset.ready='true';setSchemeBusy(false);$('restore').disabled=false;}
 else {document.body.dataset.load='error';$('status').textContent=`材质已加载 ${completed} / 8 · ${errors[0]||'加载失败'}，请重试`;$('retry').hidden=false;}
}
// Small inspectable demo API, also used by regression tests. It is not the renderer API.
window.foilDemo={get renderers(){return renderers;},state:()=>({ready,switching,variant,parameters:{...params},angle:pose.angle,target:pose.target,active:pose.active,cardOffsets:cardMotions.map(m=>m.offset),drawCount,errors,glErrors:renderers.filter(Boolean).map(r=>r.gl.getError())}),setAngle(angle){stop();pose.set(angle);draw();},go,restore,patch,capture(){draw();return renderers.filter(Boolean).map(r=>r.canvas.toDataURL());}};
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);for(const r of renderers)r?.dispose();});
window.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();cancelAnimationFrame(frame);failure(new Error('WebGL 已中断，请刷新'));},true);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('advanced').open){$('advanced').open=false;$('advanced').querySelector('summary').focus();}});
$('retry').onclick=()=>init().catch(failure);
init().catch(failure);
