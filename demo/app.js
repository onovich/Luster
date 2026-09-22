import {FoilRenderer} from '../src/index.js';
import {loadShader} from '../src/webgl/resources.js';
import {presets} from '../src/core/presets.js';
import {PoseTween} from '../src/core/parameters.js';
import {buildControls,syncControls} from './controls.js';
import {loadNormal} from './normal-loader.js';
const $=id=>document.getElementById(id), renderers=[],pose=new PoseTween(-4),errors=[];
let variant='B14',params={...presets.B14},mode=null,time=0,last=0,frame=0,drawCount=0,ready=false;
function failure(error){errors.push(error.message);$('status').textContent=error.message;console.error(error);}
function draw(){
 const inspection=+$('inspect').value;
 for(const r of renderers){if(!r)continue;r.setParameters(params);r.render({angle:pose.angle,inspect:inspection});}
 $('book').style.transform=`rotateY(${pose.angle}deg)`;syncControls(params,pose.angle,variant);drawCount++;
}
function requestTick(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
function stop(){mode=null;$('play').textContent='往返';$('dwell').textContent='停留';}
function go(angle){stop();pose.to(angle);requestTick();}
function tick(ms){
 frame=0;const dt=Math.max(0,Math.min((ms-last)/1000,.1));last=ms;
 if(mode){time+=dt;if(mode==='play')pose.set(4*Math.sin(time*Math.PI/4));
 else {const phase=time%3.16,side=phase<1.58?-1:1,t=Math.max(0,Math.min(1,(phase%1.58-1.2)/.38)),q=t*t*t*(t*(t*6-15)+10);pose.set(side*4*(1-2*q));}}
 else pose.advance(dt);
 draw();if(mode||pose.active)frame=requestAnimationFrame(tick);
}
function patch(values){params={...params,...values};draw();}
async function restore(next=variant){
 if(!ready)return;
 stop();$('status').textContent='加载…';$('variant').disabled=true;
 try{const source=await loadShader(next);for(const r of renderers)r.setVariantSource(next,source);variant=next;params={...presets[next]};$('variant').value=next;if(next==='B11'&&+$('inspect').value===5)$('inspect').value=0;draw();$('status').textContent='8 / 8';}
 catch(error){failure(error);}finally{$('variant').disabled=false;}
}
buildControls($('controls'),(id,value)=>{if(id==='angle'){stop();pose.set(value);draw();}else patch({[id]:value});});
for(const [id,value] of [['left',-4],['center',0],['right',4]])$(id).onclick=()=>go(value);
for(const id of ['play','dwell'])$(id).onclick=()=>{if(mode===id){stop();pose.set(pose.angle);draw();}else{stop();mode=id;time=id==='play'?Math.asin(pose.angle/4)*4/Math.PI:0;$(id).textContent='暂停';requestTick();}};
$('enabled').oninput=()=>patch({enabled:$('enabled').checked});$('inspect').oninput=draw;
$('variant').onchange=()=>restore($('variant').value);$('restore').onclick=()=>restore();
$('resetLocal').onclick=()=>patch(Object.fromEntries(['flatFloor','localBoost','threshold','softness','whiteGain'].map(k=>[k,presets[variant][k]])));
$('uniform').onclick=()=>patch({flatFloor:1,localBoost:1,whiteGain:1});
$('uniformStructure').onclick=()=>patch({richness:0});$('restoreStructure').onclick=()=>patch({richness:22,bend:.45});
$('stage').onpointermove=e=>{if(mode||!renderers.some(Boolean))return;const rect=$('stage').getBoundingClientRect(),next=e.clientX<rect.left+rect.width/2?-4:4;if(pose.target!==next)go(next);};
$('stage').onpointerleave=()=>{if(!mode&&renderers.some(Boolean))go(0);};
function setView(){const material=$('view').value==='material';$('book').classList.toggle('material',material);$('pocketLabel').hidden=!material;for(let i=0;i<8;i++)$(`slot${i}`).hidden=material&&i!==+$('pocket').value;}
$('view').onchange=setView;$('pocket').onchange=setView;
async function init(){
 $('variant').disabled=true;$('restore').disabled=true;
 syncControls(params,pose.angle,variant);
 const shader=loadShader(variant);
 let completed=0;
 const jobs=[];
 // Attach every base image immediately; reveal each canvas only after its first draw.
 for(let i=0;i<8;i++){
  const slot=document.createElement(i<3?'button':'div');slot.id=`slot${i}`;slot.className='pocket '+(i<3?'card':'empty');
  slot.style.left=[10.5,28.8,55.8,74.1][i%4]+'%';slot.style.top=(i<4?16.5:51.8)+'%';
  if(i<3){slot.type='button';slot.setAttribute('aria-label',`Material sample ${i+1}`);slot.onfocus=()=>go(i<2?-4:4);slot.onblur=()=>go(0);}
  const background=new Image();background.alt='';background.className='base-preview';
  background.src=new URL(`./assets/images/base-${i<3?i:3}.webp`,import.meta.url);
  const canvas=document.createElement('canvas');canvas.id=`pocket${i}`;canvas.hidden=true;
  slot.append(background,canvas);$('pockets').append(slot);$('pocket').add(new Option(String(i+1),i));
  jobs.push((async()=>{
   let renderer;
   try{
    await Promise.all([background.decode(),shader]);
    const normal=await loadNormal(i);
    renderer=await FoilRenderer.create(canvas,{normal,background});
    renderer.setParameters(params);renderer.render({angle:pose.angle,inspect:+$('inspect').value});
    renderers[i]=renderer;canvas.hidden=false;background.hidden=true;
    completed++;$('status').textContent=`材质加载 ${completed} / 8`;
   }catch(error){renderer?.dispose();errors.push(error.message);console.error(error);}
  })());
 }
 $('status').textContent='材质加载 0 / 8';
 await Promise.all(jobs);
 ready=completed===8;
 if(ready){draw();$('status').textContent='8 / 8';$('variant').disabled=false;$('restore').disabled=false;}
 else $('status').textContent=`材质已加载 ${completed} / 8，请刷新重试`;
}
// Small inspectable demo API, also used by regression tests. It is not the renderer API.
window.foilDemo={get renderers(){return renderers;},state:()=>({ready,variant,parameters:{...params},angle:pose.angle,target:pose.target,active:pose.active,drawCount,errors,glErrors:renderers.filter(Boolean).map(r=>r.gl.getError())}),setAngle(angle){stop();pose.set(angle);draw();},go,restore,patch,capture(){draw();return renderers.filter(Boolean).map(r=>r.canvas.toDataURL());}};
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);for(const r of renderers)r?.dispose();});
window.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();cancelAnimationFrame(frame);failure(new Error('WebGL 已中断，请刷新'));},true);
init().catch(failure);
