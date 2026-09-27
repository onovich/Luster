import {createProjectPackage,openProjectPackage,normalizeRecipe} from './project.js';
import {openTrialHandoff} from './trial-handoff.js';

const $=id=>document.getElementById(id),controller=window.lusterController;
let dirty=false,projectName='Untitled',pendingRecipe=null,previousFocus=null;
const defaults=normalizeRecipe();
function status(message){controller.status(message);}
function sync(){
  const recipe=controller.recipe;
  const labels={
    'soft-folds':['Fold density','Fold depth','Fold direction · °'],
    'fine-grain':['Grain density','Grain depth','Grain direction · °'],
    prism:['Facet frequency','Facet depth','Facet direction · °'],
    smooth:['Wave spacing','Wave depth','Wave direction · °']
  }[recipe.template];
  ['density','depth','direction'].forEach((key,index)=>{document.querySelector(`[data-param="${key}"]`).parentElement.firstChild.textContent=labels[index]+' ';});
  for(const input of document.querySelectorAll('[data-param]'))input.value=String(recipe[input.dataset.param]);
  for(const input of document.querySelectorAll('[data-number]'))input.value=String(recipe[input.dataset.number]);
  $('undo').disabled=!controller.state.canUndo;$('redo').disabled=!controller.state.canRedo;
  $('saveProject').disabled=!controller.file;
  $('mapInfo').textContent=controller.maps?`${controller.maps.normal.width} × ${controller.maps.normal.height} film XY16 and substrate RGBA · generated locally`:controller.file?'Generating maps…':'Choose artwork first.';
  $('dirtyStatus').textContent=`${projectName} · ${dirty?'Unsaved changes':'Saved on this device'}`;
}
function markDirty(){dirty=true;sync();}
function downloadBytes(bytes,name,type='application/zip'){
  const url=URL.createObjectURL(new Blob([bytes],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
document.addEventListener('luster:recipe-change',markDirty);
document.addEventListener('luster:maps-ready',sync);
for(const input of document.querySelectorAll('[data-param]')){
  const key=input.dataset.param;
  input.addEventListener('input',()=>{
    document.querySelector(`[data-number="${key}"]`).value=input.value;
    try{controller.paintRecipe({...controller.recipe,[key]:Number(input.value)});}catch(error){status(error.message);}
  });
  input.addEventListener('change',()=>{
    try{controller.commitRecipe({...controller.recipe,[key]:Number(input.value)});sync();}catch(error){status(error.message);sync();}
  });
}
for(const input of document.querySelectorAll('[data-number]')){
  input.addEventListener('change',()=>{
    try{controller.commitRecipe({...controller.recipe,[input.dataset.number]:Number(input.value)});sync();}catch(error){status(error.message);sync();}
  });
}
for(const button of document.querySelectorAll('[data-reset]'))button.addEventListener('click',()=>{
  const keys=button.dataset.reset==='surface'?['seed','density','depth','direction']:button.dataset.reset==='foil'?['strength','richness']:['light'];
  const patch=Object.fromEntries(keys.map(key=>[key,defaults[key]]));
  controller.commitRecipe({...controller.recipe,...patch});sync();
});
$('randomSeed').addEventListener('click',()=>{const seed=crypto.getRandomValues(new Uint32Array(1))[0];controller.commitRecipe({...controller.recipe,seed});sync();});
$('undo').addEventListener('click',()=>{controller.undo();sync();});
$('redo').addEventListener('click',()=>{controller.redo();sync();});
$('newProject').addEventListener('click',async()=>{
  if(dirty&&!confirm('Discard unsaved changes and start a new project?'))return;
  await controller.resetProject();projectName='Untitled';dirty=false;sync();
});
async function packedProject(){
  if(!await controller.whenMapsReady())throw new Error('Material maps are not ready');
  const source=controller.file,maps=controller.maps,original=controller.sourceDimensions;
  return createProjectPackage({
    sourceBytes:new Uint8Array(await source.arrayBuffer()),sourceName:source.name,sourceMime:source.type,
    sourceWidth:original[0],sourceHeight:original[1],recipe:controller.recipe,
    mapWidth:maps.normal.width,mapHeight:maps.normal.height,angle:controller.angle
  });
}
async function saveProject(){
  if(!controller.file)return;
  status('Packing project…');
  try{
    const archive=await packedProject();
    downloadBytes(archive,`${projectName==='Untitled'?'luster-project':projectName}.luster`);
    dirty=false;sync();controller.persist();status('Project download started');
  }catch(error){status(error.message);}
}
$('saveProject').addEventListener('click',()=>saveProject());
async function openFile(input){
  if(dirty&&!confirm('Discard unsaved changes and open another project?'))return;
  const bytes=new Uint8Array(await input.arrayBuffer());
  if(input.name.toLowerCase().endsWith('.lustertrial')){
    const handoff=await openTrialHandoff(bytes);
    if(handoff.sourceBytes){
      await controller.importProject({sourceBytes:handoff.sourceBytes,sourceName:handoff.manifest.source.name,sourceMime:handoff.manifest.source.mime,recipe:handoff.recipe,angle:handoff.manifest.view.angle});
      projectName='Imported trial look';dirty=true;controller.persist();
    }else{
      pendingRecipe=handoff;
      status('Choose the original artwork for this recipe-only handoff.');
      $('sourceForRecipe').click();return;
    }
  }else{
    const opened=await openProjectPackage(bytes),source=opened.manifest.source;
    await controller.importProject({sourceBytes:opened.sourceBytes,sourceName:source.name,sourceMime:source.mime,recipe:opened.recipe,angle:opened.angle});
    projectName=input.name.replace(/\.luster$/i,'');dirty=false;controller.persist();
  }
  sync();status('Project opened locally');
}
$('openProject').addEventListener('change',async event=>{
  const input=event.target.files?.[0];if(!input)return;
  try{await openFile(input);}catch(error){status(error.message);}finally{event.target.value='';}
});
$('sourceForRecipe').addEventListener('change',async event=>{
  const input=event.target.files?.[0];if(!input||!pendingRecipe)return;
  try{
    await controller.importProject({sourceBytes:new Uint8Array(await input.arrayBuffer()),sourceName:input.name,sourceMime:input.type,recipe:pendingRecipe.recipe,angle:pendingRecipe.manifest.view.angle});
    projectName='Imported trial recipe';dirty=true;pendingRecipe=null;controller.persist();sync();status('Recipe restored with selected artwork');
  }catch(error){status(error.message);}finally{event.target.value='';}
});
function proModal(open){
  if(open){previousFocus=document.activeElement;$('proBackdrop').hidden=false;$('closeProModal').focus();}
  else{$('proBackdrop').hidden=true;previousFocus?.focus();}
}
$('export').addEventListener('click',event=>{event.stopImmediatePropagation();proModal(true);},true);
$('closeProModal').addEventListener('click',()=>proModal(false));
$('proBackdrop').addEventListener('click',event=>{if(event.target===$('proBackdrop'))proModal(false);});
function exportTab(value){
  for(const name of ['png','package','web','unity']){
    $(name+'Content').hidden=value!==name;
    $(name+'Tab').setAttribute('aria-selected',String(value===name));
  }
}
$('pngTab').addEventListener('click',()=>exportTab('png'));
$('packageTab').addEventListener('click',()=>exportTab('package'));
$('webTab').addEventListener('click',()=>exportTab('web'));
$('unityTab').addEventListener('click',()=>exportTab('unity'));
$('proDownloadPng').addEventListener('click',()=>$('download').click());
$('proExportPackage').addEventListener('click',()=>saveProject());
$('proExportWeb').addEventListener('click',async()=>{
  if(!controller.file)return;
  status('Packing Web demo…');
  $('proExportWeb').disabled=true;
  try{
    const {exportWebPackage}=await import('./export-web.mjs');
    downloadBytes(await exportWebPackage(await packedProject()),'luster-web.zip');
    status('Web package download started');
  }catch(error){status(error.message);}
  finally{$('proExportWeb').disabled=false;}
});
$('proExportUnity').addEventListener('click',async()=>{
  if(!controller.file||!controller.art)return;
  status('Packing Unity assets…');
  $('proExportUnity').disabled=true;
  try{
    const png=await new Promise(resolve=>controller.art.toBlob(resolve,'image/png'));
    const {exportUnityPackage}=await import('./export-unity.mjs');
    downloadBytes(await exportUnityPackage(await packedProject(),new Uint8Array(await png.arrayBuffer())),'luster-unity.zip');
    status('Unity package download started');
  }catch(error){status(error.message);}
  finally{$('proExportUnity').disabled=false;}
});
document.addEventListener('keydown',event=>{
  if($('proBackdrop').hidden)return;
  if(event.key==='Escape'){proModal(false);return;}
  if(event.key==='Tab'){
    const controls=[...$('proBackdrop').querySelectorAll('button:not(:disabled):not([hidden])')].filter(button=>button.offsetParent!==null);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
sync();
window.lusterPro={
  get state(){return {dirty,projectName,recipe:controller.recipe,revision:controller.state.revision,canUndo:controller.state.canUndo,canRedo:controller.state.canRedo,ready:!!controller.renderer&&!!controller.maps};}
};
void window.lusterRestoration?.then(record=>{
  if(!record)return;
  projectName=typeof record.projectName==='string'&&record.projectName?record.projectName:'Untitled';
  dirty=record.dirty===true;
  sync();
});
