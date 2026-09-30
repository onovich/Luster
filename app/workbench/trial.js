import {LayeredRenderer} from '../../src/index.js';
import {loadArtwork} from './image.js';
import {makeSoftFolds} from './soft-folds.js';
import {MapEngine} from './map-engine.js';
import {ProjectSession,normalizeRecipe} from './recipe.js';
import {createTrialHandoff} from './trial-handoff.js';
import {makeSampleFile} from './sample-artwork.js';
import {PoseTween} from '../../src/core/parameters.js';

const $=id=>document.getElementById(id);
let file=null,art=null,renderer=null,currentMaps=null,revision=0,groups=[],groupIndex=-1,selectedIndex=0,saved=[],tab='explore';
let sourceDimensions=null;
let cachedSourceBytes=null;
let project=new ProjectSession(),renderJob=0,loadJob=0,saveJob=0,saveTimer,autoFrame=0,focusBeforeModal=null;
const mapEngine=new MapEngine(16),thumbnailEngine=new MapEngine(48);
let mapJob=0,mapTask=Promise.resolve();
let view='material',foil=true,angle=5;
const pose=new PoseTween(angle),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let poseFrame=0;
function settlePose(){cancelAnimationFrame(poseFrame);poseFrame=0;pose.set(angle);}
function tiltTo(target){
  if(reducedMotion.matches){angle=target;pose.set(angle);updateAngleOnly();return;}
  pose.to(target);
  if(poseFrame)return;
  let previous=performance.now();
  const tick=now=>{poseFrame=0;pose.advance(Math.max(0,Math.min((now-previous)/1000,.1)));previous=now;angle=pose.angle;updateAngleOnly();if(pose.active)poseFrame=requestAnimationFrame(tick);else scheduleSave();};
  poseFrame=requestAnimationFrame(tick);
}
const maxSide=256;
const trialPngLimit=512;
const nextRandom=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const recipeKey=recipe=>JSON.stringify(recipe);
const currentRecipe=()=>project.read().recipe;
const templateNames={'soft-folds':'Soft folds','fine-grain':'Fine grain',prism:'Prism',smooth:'Smooth'};
function status(message){$('status').textContent=message;}
function showError(message){status(message);const notice=$('errorNotice');if(notice){notice.hidden=false;notice.textContent=message+' You can choose another image or try an example.';}}
function dimensions(scale){const longest=Math.max(art.width,art.height);return [Math.max(32,Math.round(scale*art.width/longest)),Math.max(32,Math.round(scale*art.height/longest))];}
const mapInput=(width,height,recipe)=>({template:recipe.template,width,height,seed:recipe.seed,density:recipe.density,depth:recipe.depth,direction:recipe.direction});
function groupRecipes(seed){
  const template=currentRecipe().template;
  let state=seed>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  return Array.from({length:6},(_,index)=>normalizeRecipe({
    template,
    seed:(seed+Math.imul(index+1,0x9e3779b9))>>>0,
    density:Math.round((.23+random()*.46)*100)/100,
    depth:Math.round((.09+random()*.14)*100)/100,
    direction:Math.round(-45+random()*90)
  }));
}
function activeGroup(){return groupIndex<0?[]:groupRecipes(groups[groupIndex]);}
function paintRecipe(recipe){
  recipe=normalizeRecipe(recipe);
  $('lookTitle').textContent=`${templateNames[recipe.template]} / Look ${String(recipe.seed>>>0).slice(-5).padStart(5,'0')}`;
  document.querySelector('.rightHead span').textContent=templateNames[recipe.template].toUpperCase();
  for(const button of document.querySelectorAll('[data-template]')){
    const selected=button.dataset.template===recipe.template;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  }
  $('saveLook').textContent=saved.some(item=>recipeKey(item)===recipeKey(recipe))?'Remove saved look':'Save look';
  $('saveLook').disabled=!art;
  if(art){
    renderer.setParameters({strength:recipe.strength,richness:recipe.richness,light:recipe.light});
    const [width,height]=dimensions(maxSide);
    const job=++mapJob;
    currentMaps=null;
    mapTask=mapEngine.generate(mapInput(width,height,recipe)).then(maps=>{
      if(job!==mapJob)return false;
      currentMaps=maps;
      renderer.setNormal(maps.normal);renderer.setSurface(maps.surface);render();
      document.dispatchEvent(new Event('luster:maps-ready'));
      return true;
    }).catch(error=>{if(job===mapJob&&error.name!=='AbortError')showError(error.message);return false;});
    return mapTask;
  }
  return Promise.resolve(true);
}
async function whenMapsReady(){let observed;do{observed=mapTask;await observed;}while(observed!==mapTask);return currentMaps;}
function setRecipe(recipe){
  const before=project.read(),after=project.apply(recipe,before.revision);
  const pending=paintRecipe(after.recipe);
  if(after.revision!==before.revision){
    revision++;
    document.dispatchEvent(new CustomEvent('luster:recipe-change',{detail:{revision}}));
  }
  return pending;
}
function undoRecipe(){
  const before=project.read().revision,after=project.undo(before);
  if(after.revision===before)return after;
  revision++;paintRecipe(after.recipe);drawCards();scheduleSave();
  document.dispatchEvent(new CustomEvent('luster:recipe-change',{detail:{revision}}));
  return after;
}
function redoRecipe(){
  const before=project.read().revision,after=project.redo(before);
  if(after.revision===before)return after;
  revision++;paintRecipe(after.recipe);drawCards();scheduleSave();
  document.dispatchEvent(new CustomEvent('luster:recipe-change',{detail:{revision}}));
  return after;
}
function render(){
  if(!renderer)return;
  $('preview').style.transform=view==='original'?'none':`rotateY(${angle*.8}deg)`;
  renderer.setLayers(view==='original'?{card:0,film:0}:{card:1,film:foil?1:0});
  renderer.render({angle});
}
function updateView(){
  settlePose();
  $('original').setAttribute('aria-pressed',String(view==='original'));
  $('material').setAttribute('aria-pressed',String(view==='material'));
  $('foil').disabled=view==='original';$('foil').checked=foil;
  $('angle').value=String(angle);$('angleValue').textContent=`${Number(angle).toFixed(1)}°`;
  render();scheduleSave();
}
function updateHistory(){
  $('previous').disabled=groupIndex<=0||tab!=='explore';
  $('next').disabled=!art||tab!=='explore';
  $('shuffle').disabled=!art||tab!=='explore';
  $('setLabel').textContent=`Set ${groupIndex+1} / ${groups.length}`;
  $('savedCount').textContent=String(saved.length);
  $('exploreTab').setAttribute('aria-selected',String(tab==='explore'));
  $('savedTab').setAttribute('aria-selected',String(tab==='saved'));
}
async function thumbnails(recipes,onProgress=()=>{}){
  if(!art||!recipes.length)return [];
  const [width,height]=dimensions(132),[mapWidth,mapHeight]=dimensions(96);
  const placeholder=makeSoftFolds({width:32,height:32});
  onProgress('Preparing candidate renderer…');
  const output=await LayeredRenderer.create(document.createElement('canvas'),{layout:'full',background:art,normal:placeholder.normal,surface:placeholder.surface,width,height});
  try{
    const urls=[];
    for(const [index,recipe] of recipes.entries()){
      onProgress(`Generating candidate ${index+1}/${recipes.length}…`);
      const maps=await thumbnailEngine.generate(mapInput(mapWidth,mapHeight,recipe));
      onProgress(`Rendering candidate ${index+1}/${recipes.length}…`);
      output.setParameters({strength:recipe.strength,richness:recipe.richness,light:recipe.light});
      output.setNormal(maps.normal);output.setSurface(maps.surface);output.setLayers({card:1,film:1});output.render({angle:5});
      urls.push(output.canvas.toDataURL('image/png'));
    }
    return urls;
  }finally{output.dispose();}
}
async function drawCards(){
  const job=++renderJob,list=tab==='explore'?activeGroup():saved;
  thumbnailEngine.cancel();
  updateHistory();
  $('cards').textContent='';
  $('cards').setAttribute('aria-busy','false');
  if(!art){$('cards').textContent='Choose an image to see six finishes.';return;}
  if(!list.length){$('cards').textContent=tab==='saved'?'No saved looks yet. Save a finish from Explore.':'No candidates yet.';return;}
  status('Generating candidate previews…');
  $('cards').setAttribute('aria-busy','true');
  for(let index=0;index<list.length;index++){const placeholder=document.createElement('div');placeholder.className='cardPlaceholder';placeholder.textContent=`Preparing look ${String(index+1).padStart(2,'0')}…`;$('cards').append(placeholder);}
  try{
    const urls=await thumbnails(list,message=>{if(job===renderJob)status(message);});
    if(job!==renderJob)return;
    const fragment=document.createDocumentFragment();
    list.forEach((recipe,index)=>{
      const card=document.createElement('div');card.className='card';
      const choose=document.createElement('button');choose.className='cardSelect';choose.type='button';
      choose.setAttribute('aria-label',`Select look ${index+1}`);
      choose.classList.toggle('selected',recipeKey(recipe)===recipeKey(currentRecipe()));
      const image=document.createElement('img');image.src=urls[index];image.alt='';
      const label=document.createElement('span');label.textContent=`Look ${String(index+1).padStart(2,'0')}`;
      choose.append(image,label);choose.addEventListener('click',()=>{
        if(tab==='explore')selectedIndex=index;
        setRecipe(recipe);drawCards();scheduleSave();
      });
      card.append(choose);
      if(tab==='saved'){
        const remove=document.createElement('button');remove.className='remove';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Remove saved look ${index+1}`);
        remove.addEventListener('click',()=>{saved.splice(index,1);drawCards();scheduleSave();});card.append(remove);
      }
      fragment.append(card);
    });
    $('cards').replaceChildren(fragment);
    status(`Ready · revision ${revision}`);
  }catch(error){if(job===renderJob&&error.name!=='AbortError')showError(error.message);}
  finally{if(job===renderJob)$('cards').setAttribute('aria-busy','false');}
}
async function loadFile(next,{restoring=false}={}){
  if($('errorNotice'))$('errorNotice').hidden=true;
  const job=++loadJob;status('Decoding image…');
  try{
    const loaded=await loadArtwork(next);if(job!==loadJob)return;
    const bytes=new Uint8Array(await next.arrayBuffer());if(job!==loadJob)return;
    let nextRenderer=renderer;
    if(nextRenderer){nextRenderer.setBackground(loaded.canvas);nextRenderer.resize(loaded.canvas.width,loaded.canvas.height);}
    else{
      const placeholder=makeSoftFolds({width:32,height:32});
      nextRenderer=await LayeredRenderer.create($('preview'),{layout:'full',background:loaded.canvas,normal:placeholder.normal,surface:placeholder.surface,width:loaded.canvas.width,height:loaded.canvas.height});
    }
    if(job!==loadJob){if(!renderer)nextRenderer.dispose();return;}
    file=next;cachedSourceBytes=bytes;art=loaded.canvas;renderer=nextRenderer;sourceDimensions=loaded.original;
    $('preview').style.display='block';$('welcome').hidden=true;
    $('artThumb').src=art.toDataURL('image/png');$('artThumb').hidden=false;$('artEmpty').hidden=true;
    $('imageInfo').textContent=`${next.name} · ${loaded.original[0]} × ${loaded.original[1]} px${loaded.scaled?' · preview scaled':''}`;
    $('export').disabled=false;$('saveLook').disabled=false;
    if(!groups.length){groups=[nextRandom()];groupIndex=0;selectedIndex=0;await setRecipe(activeGroup()[0]);}
    else await setRecipe(currentRecipe());
    if(job!==loadJob)return false;
    await drawCards();scheduleSave();
    return true;
  }catch(error){showError(error.message.includes('WebGL')?'Your browser could not start the material preview. Check that graphics acceleration is enabled or try another browser.':error.message);return false;}
}
async function loadExample(kind){
  const buttons=[...document.querySelectorAll('[data-sample]')];buttons.forEach(button=>button.disabled=true);
  try{await loadFile(await makeSampleFile(kind));}catch(error){showError(error.message);}
  finally{buttons.forEach(button=>button.disabled=false);}
}
function selectGroup(index){
  if(index<0||index>=groups.length)return;
  groupIndex=index;selectedIndex=0;setRecipe(activeGroup()[0]);drawCards();scheduleSave();
}
async function importProject({sourceBytes,sourceName,sourceMime,recipe,angle:importedAngle}){
  groups=[nextRandom()];groupIndex=0;selectedIndex=-1;saved=[];
  project=new ProjectSession(recipe);view='material';foil=true;angle=importedAngle;
  updateView();
  const loaded=await loadFile(new File([sourceBytes],sourceName,{type:sourceMime}),{restoring:true});
  if(!loaded)throw new Error('Project artwork could not be loaded');
}
async function resetProject(){
  stopRotation();clearTimeout(saveTimer);saveJob++;loadJob++;renderJob++;mapJob++;mapEngine.cancel();thumbnailEngine.cancel();if(renderer)renderer.dispose();
  file=null;cachedSourceBytes=null;art=null;renderer=null;currentMaps=null;sourceDimensions=null;groups=[];groupIndex=-1;selectedIndex=0;saved=[];revision++;
  project=new ProjectSession();view='material';foil=true;angle=5;
  $('preview').style.display='none';$('welcome').hidden=false;$('artThumb').hidden=true;$('artEmpty').hidden=false;
  $('imageInfo').textContent='PNG, JPEG, WebP · processed locally';$('lookTitle').textContent='Your material starts here';
  $('export').disabled=true;$('saveLook').disabled=true;$('cards').textContent='Choose an image to see six finishes.';
  updateView();updateHistory();status('Local processing');$('saveStatus').textContent='Not saved yet';
  try{const db=await database();await new Promise((resolve,reject)=>{const request=db.transaction('state','readwrite').objectStore('state').delete('current');request.onsuccess=resolve;request.onerror=()=>reject(request.error);});}catch{}
  document.dispatchEvent(new CustomEvent('luster:recipe-change',{detail:{revision}}));
}
function scheduleSave(){
  if(!file||!cachedSourceBytes)return;
  clearTimeout(saveTimer);
  const job=++saveJob,source=file,bytes=cachedSourceBytes;
  $('saveStatus').textContent='Saving locally…';
  saveTimer=setTimeout(async()=>{
    try{
      if(job!==saveJob||source!==file)return;
      const db=await database();
      if(job!==saveJob||source!==file)return;
      await new Promise((resolve,reject)=>{
        const transaction=db.transaction('state','readwrite');
        const pro=document.body.dataset.edition==='pro'?window.lusterPro?.state:null;
        const request=transaction.objectStore('state').put({key:'current',source:{name:source.name,type:source.type,bytes},groups,groupIndex,selectedIndex,saved,recipe:currentRecipe(),view,foil,angle,...(pro?{projectName:pro.projectName,dirty:pro.dirty}:{})});
        transaction.oncomplete=resolve;
        request.onerror=()=>reject(request.error||new Error('IndexedDB write failed'));
        transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));
      });
      if(job===saveJob)$('saveStatus').textContent='Saved in this browser';
    }catch(error){if(job===saveJob){$('saveStatus').textContent='Local save unavailable';console.error('Local project save failed',error);}}
  },250);
}
let databasePromise;
function database(){
  if(!databasePromise)databasePromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(document.body.dataset.edition==='pro'?'luster-pro-v1':'luster-trial-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state',{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  return databasePromise;
}
async function restore(){
  const originalLoadJob=loadJob;
  try{
    const db=await database(),record=await new Promise((resolve,reject)=>{
      const request=db.transaction('state').objectStore('state').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    if(!record||loadJob!==originalLoadJob)return;
    groups=record.groups||[];groupIndex=record.groupIndex??0;selectedIndex=record.selectedIndex??0;saved=record.saved||[];
    project=new ProjectSession(normalizeRecipe(record.recipe));view=record.view==='original'?'original':'material';foil=record.foil!==false;angle=Number.isFinite(record.angle)?record.angle:5;
    updateView();
    const restoredFile=record.file instanceof File?record.file:
      record.source?.bytes?new File([record.source.bytes],record.source.name,{type:record.source.type}):null;
    if(!restoredFile)throw new Error('Saved artwork is missing');
    return await loadFile(restoredFile,{restoring:true})?record:undefined;
  }catch(error){status(`Local restoration unavailable: ${error.message}`);}
}
async function downloadPng(){
  if(!art||!await whenMapsReady())return;
  const snapshot={revision,angle,view,foil,maps:currentMaps,art,recipe:currentRecipe()};status(`Encoding revision ${snapshot.revision}…`);
  let output;
  try{
    $('download').disabled=true;
    const pngLimit=document.body.dataset.edition==='pro'?1024:trialPngLimit;
    const scale=Math.min(1,pngLimit/Math.max(snapshot.art.width,snapshot.art.height));
    const width=Math.max(1,Math.round(snapshot.art.width*scale)),height=Math.max(1,Math.round(snapshot.art.height*scale));
    output=await LayeredRenderer.create(document.createElement('canvas'),{layout:'full',background:snapshot.art,normal:snapshot.maps.normal,surface:snapshot.maps.surface,width,height});
    output.setParameters({strength:snapshot.recipe.strength,richness:snapshot.recipe.richness,light:snapshot.recipe.light});
    output.setLayers(snapshot.view==='original'?{card:0,film:0}:{card:1,film:snapshot.foil?1:0});
    output.render({angle:snapshot.angle});
    const blob=await new Promise((resolve,reject)=>output.canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG encoding failed')),'image/png'));
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`luster-look-${snapshot.revision}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status(`PNG downloaded · revision ${snapshot.revision}`);
  }catch(error){showError(error.message);}finally{output?.dispose();$('download').disabled=false;}
}
async function downloadHandoff(){
  if(!file)return;
  const includeArtwork=$('includeArtwork').checked;
  status('Preparing trial handoff…');
  try{
    const archive=await createTrialHandoff({
      recipe:currentRecipe(),angle,includeArtwork,
      ...(includeArtwork?{
        sourceBytes:new Uint8Array(await file.arrayBuffer()),sourceMime:file.type,sourceName:file.name,
        sourceWidth:sourceDimensions[0],sourceHeight:sourceDimensions[1]
      }:{})
    });
    const url=URL.createObjectURL(new Blob([archive],{type:'application/zip'}));
    const link=document.createElement('a');link.href=url;link.download='luster-trial-handoff.lustertrial';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status(includeArtwork?'Trial handoff downloaded with artwork':'Recipe-only handoff downloaded');
  }catch(error){status(error.message);}
}
function openModal(){focusBeforeModal=$('export');$('modalBackdrop').hidden=false;$('upgradeNote').hidden=true;$('closeModal').focus();}
function closeModal(){$('modalBackdrop').hidden=true;focusBeforeModal?.focus();}
function stopRotation(){$('rotate').checked=false;if(autoFrame)cancelAnimationFrame(autoFrame);autoFrame=0;scheduleSave();}
function startRotation(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('rotate').checked=false;status('Auto rotate is off for reduced motion.');return;}
  settlePose();
  const amplitude=Math.max(4,Math.abs(angle)),start=performance.now(),phase=Math.asin(angle/amplitude);
  const tick=now=>{if(!$('rotate').checked)return;angle=amplitude*Math.sin(phase+(now-start)*Math.PI/4000);pose.set(angle);updateAngleOnly();autoFrame=requestAnimationFrame(tick);};
  autoFrame=requestAnimationFrame(tick);
}
function updateAngleOnly(){$('angle').value=String(angle);$('angleValue').textContent=`${Number(angle).toFixed(1)}°`;render();}

$('file').addEventListener('change',event=>{if(event.target.files?.[0])loadFile(event.target.files[0]);});
for(const button of document.querySelectorAll('[data-sample]'))button.addEventListener('click',()=>loadExample(button.dataset.sample));
for(const button of document.querySelectorAll('[data-template]'))button.addEventListener('click',()=>{
  if(button.dataset.template===currentRecipe().template)return;
  setRecipe({...currentRecipe(),template:button.dataset.template});drawCards();scheduleSave();
});
$('original').addEventListener('click',()=>{view='original';updateView();});
$('material').addEventListener('click',()=>{view='material';updateView();});
$('foil').addEventListener('change',event=>{foil=event.target.checked;updateView();});
$('angle').addEventListener('input',event=>{stopRotation();angle=Number(event.target.value);updateView();});
$('rotate').addEventListener('change',event=>event.target.checked?startRotation():stopRotation());
$('fit').addEventListener('click',()=>{$('canvasWrap').classList.remove('actual');$('fit').setAttribute('aria-pressed','true');$('actual').setAttribute('aria-pressed','false');});
$('actual').addEventListener('click',()=>{$('canvasWrap').classList.add('actual');$('fit').setAttribute('aria-pressed','false');$('actual').setAttribute('aria-pressed','true');});
let dragX=null,dragAngle=0;
$('preview').addEventListener('pointerdown',event=>{dragX=event.clientX;dragAngle=angle;$('preview').setPointerCapture(event.pointerId);stopRotation();});
$('preview').addEventListener('pointermove',event=>{
  if(!renderer||view==='original')return;
  if(dragX!==null){tiltTo(Math.max(-18,Math.min(18,dragAngle+(event.clientX-dragX)*.13)));return;}
  if(event.pointerType==='touch'||$('rotate').checked||reducedMotion.matches)return;
  const rect=$('preview').getBoundingClientRect(),x=event.clientX-rect.left-rect.width/2;
  const target=Math.abs(x)<rect.width*3/1190?pose.target:x<0?-4:4;
  if(pose.target!==target)tiltTo(target);
});
const releaseDrag=()=>{dragX=null;scheduleSave();};
$('preview').addEventListener('pointerup',releaseDrag);
$('preview').addEventListener('pointercancel',releaseDrag);
$('preview').addEventListener('lostpointercapture',releaseDrag);
$('preview').addEventListener('pointerleave',()=>{if(dragX===null&&!$('rotate').checked&&renderer)tiltTo(0);});
$('shuffle').addEventListener('click',()=>{groups=groups.slice(0,groupIndex+1);groups.push(nextRandom());selectGroup(groups.length-1);});
$('previous').addEventListener('click',()=>selectGroup(groupIndex-1));
$('next').addEventListener('click',()=>{if(groupIndex+1<groups.length)selectGroup(groupIndex+1);else $('shuffle').click();});
$('saveLook').addEventListener('click',()=>{
  const recipe=currentRecipe(),index=saved.findIndex(item=>recipeKey(item)===recipeKey(recipe));
  if(index>=0)saved.splice(index,1);else saved.push(recipe);
  $('saveLook').textContent=index>=0?'Save look':'Remove saved look';updateHistory();if(tab==='saved')drawCards();scheduleSave();
});
$('exploreTab').addEventListener('click',()=>{tab='explore';drawCards();});
$('savedTab').addEventListener('click',()=>{tab='saved';drawCards();});
$('export').addEventListener('click',openModal);
$('closeModal').addEventListener('click',closeModal);
$('modalBackdrop').addEventListener('click',event=>{if(event.target===$('modalBackdrop'))closeModal();});
$('download').addEventListener('click',downloadPng);
$('saveHandoff').addEventListener('click',downloadHandoff);
$('upgrade').addEventListener('click',()=>{$('upgradeNote').hidden=false;});
document.addEventListener('keydown',event=>{
  if($('modalBackdrop').hidden)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key!=='Tab')return;
  const controls=[...$('modalBackdrop').querySelectorAll('button:not(:disabled)')],first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
updateView();updateHistory();window.lusterRestoration=restore();
const requestedSample=new URL(location.href).searchParams.get('sample');
if(document.body.dataset.edition!=='pro'&&['poster','card'].includes(requestedSample)){
  window.lusterRestoration=window.lusterRestoration.then(()=>loadExample(requestedSample));
  history.replaceState(null,'',location.pathname);
}
window.lusterTrial={get state(){return {ready:!!renderer&&!!currentMaps,revision,groups:groups.length,groupIndex,selectedIndex,saved:saved.length,recipe:currentRecipe(),view,foil,angle,size:renderer?[renderer.canvas.width,renderer.canvas.height]:null};}};
window.lusterController={
  get file(){return file;},get art(){return art;},get sourceDimensions(){return sourceDimensions;},get recipe(){return currentRecipe();},get angle(){return angle;},get mapMode(){return mapEngine.mode;},whenMapsReady,
  get state(){return {...project.read(),angle};},get renderer(){return renderer;},get maps(){return currentMaps;},
  paintRecipe,commitRecipe(recipe){setRecipe(recipe);drawCards();scheduleSave();},undo:undoRecipe,redo:redoRecipe,importProject,resetProject,loadFile,status,persist:scheduleSave
};
