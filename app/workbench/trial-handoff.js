import {generatorVersion as softFoldsVersion} from './soft-folds.js';
import {materialGeneratorVersion,templates} from './material-maps.js';
import {normalizeRecipe} from './recipe.js';
import {readStoredZip,writeStoredZip} from './zip-store.js';

const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
export async function createTrialHandoff({recipe,angle=5,includeArtwork=true,sourceBytes,sourceMime,sourceName,sourceWidth,sourceHeight}){
  const normalized=normalizeRecipe(recipe);
  if(!Number.isFinite(angle)||angle< -90||angle>90)throw new RangeError('Invalid view angle');
  const manifest={format:'luster-trial-handoff',schemaVersion:3,generatorVersion:materialGeneratorVersion,template:normalized.template,recipe:normalized,view:{angle},needsImage:!includeArtwork};
  const files=new Map();
  if(includeArtwork){
    if(!(sourceBytes instanceof Uint8Array)||sourceBytes.length>20*1024*1024||!extensions[sourceMime])throw new Error('Invalid handoff artwork');
    if(!Number.isInteger(sourceWidth)||!Number.isInteger(sourceHeight)||sourceWidth<1||sourceHeight<1||sourceWidth*sourceHeight>24_000_000)throw new Error('Invalid artwork size');
    if(typeof sourceName!=='string'||sourceName.length<1||sourceName.length>120||/[\\/\x00-\x1f]/.test(sourceName))throw new Error('Invalid artwork name');
    const path=`assets/source.${extensions[sourceMime]}`;
    manifest.source={path,mime:sourceMime,name:sourceName,width:sourceWidth,height:sourceHeight,sha256:await digest(sourceBytes)};
    files.set(path,sourceBytes);
  }
  files.set('manifest.json',encoder.encode(JSON.stringify(manifest)));
  return writeStoredZip(files);
}
export async function openTrialHandoff(archive){
  const files=readStoredZip(archive);
  if(!files.has('manifest.json'))throw new Error('Missing trial manifest');
  let manifest;
  try{manifest=JSON.parse(decoder.decode(files.get('manifest.json')));}catch{throw new Error('Invalid trial manifest');}
  const legacy=manifest.schemaVersion===2&&manifest.generatorVersion===softFoldsVersion&&(manifest.template===undefined||manifest.template==='soft-folds');
  const current=manifest.schemaVersion===3&&manifest.generatorVersion===materialGeneratorVersion&&templates.includes(manifest.template);
  if(manifest.format!=='luster-trial-handoff'||(!legacy&&!current))throw new Error('Unsupported trial handoff');
  const recipe=normalizeRecipe(manifest.recipe);
  if(recipe.template!==(manifest.template??(legacy?'soft-folds':undefined)))throw new Error('Trial template and recipe disagree');
  if(!Number.isFinite(manifest.view?.angle)||manifest.view.angle< -90||manifest.view.angle>90)throw new Error('Invalid trial view');
  if(manifest.needsImage){if(files.size!==1||manifest.source!==undefined)throw new Error('Unexpected artwork in recipe-only handoff');return {manifest,recipe,sourceBytes:null};}
  const source=manifest.source,extension=extensions[source?.mime];
  if(!extension||source.path!==`assets/source.${extension}`||files.size!==2||!files.has(source.path))throw new Error('Invalid trial artwork path');
  const bytes=files.get(source.path);
  if(bytes.length>20*1024*1024||await digest(bytes)!==source.sha256)throw new Error('Trial artwork hash mismatch');
  if(!Number.isInteger(source.width)||!Number.isInteger(source.height)||source.width<1||source.height<1||source.width*source.height>24_000_000)throw new Error('Invalid trial artwork size');
  return {manifest,recipe,sourceBytes:bytes};
}
