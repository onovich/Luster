import {makeSoftFolds,generatorVersion as softFoldsVersion} from './soft-folds.js';
import {makeMaterialMaps,materialGeneratorVersion,templates} from './material-maps.js';
import {readStoredZip,writeStoredZip} from './zip-store.js';
import {normalizeRecipe,shape,viewAngle} from './recipe.js';
import {mimeToExtension,verifySource} from './source-image.js';
export {normalizeRecipe,ProjectSession} from './recipe.js';

export const projectSchemaVersion=3;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
function dimensions(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>24_000_000)throw new RangeError('Invalid source dimensions');
}
function mapDimensions(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width>2048||height>2048)throw new RangeError('Invalid map dimensions');
}
async function digest(bytes){const result=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),v=>v.toString(16).padStart(2,'0')).join('');}
function simpleName(name){
  if(typeof name!=='string'||name.length<1||name.length>120||/[\\/\x00-\x1f]/.test(name))throw new Error('Invalid source name');
  return name;
}
export async function createProjectPackage({sourceBytes,sourceName,sourceMime,sourceWidth,sourceHeight,recipe={},mapWidth=256,mapHeight=256,angle=0}){
  verifySource(sourceBytes,sourceMime);dimensions(sourceWidth,sourceHeight);mapDimensions(mapWidth,mapHeight);
  const parameters=normalizeRecipe(recipe),name=simpleName(sourceName),pose=viewAngle(angle);
  const maps=makeMaterialMaps({width:mapWidth,height:mapHeight,...parameters});
  const sourcePath=`assets/source.${mimeToExtension[sourceMime]}`;
  const manifest={
    format:'luster-project',schemaVersion:projectSchemaVersion,generatorVersion:materialGeneratorVersion,opticalModel:'B14-layered-p0',template:parameters.template,
    source:{path:sourcePath,name,mime:sourceMime,width:sourceWidth,height:sourceHeight,bytes:sourceBytes.length,sha256:await digest(sourceBytes),transparentBackground:'#f5ecd9'},
    recipe:parameters,
    maps:{width:mapWidth,height:mapHeight,normal:{path:'maps/film.rgba',sha256:await digest(maps.normal.data)},surface:{path:'maps/substrate.rgba',sha256:await digest(maps.surface.data)}},
    view:{angle:pose}
  };
  return writeStoredZip(new Map([
    ['manifest.json',encoder.encode(JSON.stringify(manifest))],
    [sourcePath,sourceBytes],
    ['maps/film.rgba',maps.normal.data],
    ['maps/substrate.rgba',maps.surface.data]
  ]));
}
export async function openProjectPackage(archive){
  const entries=readStoredZip(archive);
  if(entries.size!==4||!entries.has('manifest.json'))throw new Error('Project package entry count mismatch');
  let manifest;
  try{manifest=JSON.parse(decoder.decode(entries.get('manifest.json')));}catch{throw new Error('Project manifest is invalid JSON');}
  shape(manifest,['format','schemaVersion','generatorVersion','opticalModel','template','source','recipe','maps','view']);
  const legacy=manifest.schemaVersion===2&&manifest.generatorVersion===softFoldsVersion&&(manifest.template===undefined||manifest.template==='soft-folds');
  const current=manifest.schemaVersion===projectSchemaVersion&&manifest.generatorVersion===materialGeneratorVersion&&templates.includes(manifest.template);
  if(manifest.format!=='luster-project'||(!legacy&&!current)||manifest.opticalModel!=='B14-layered-p0')throw new Error('Unsupported project or generator version');
  const source=manifest.source,maps=manifest.maps;
  shape(source,['path','name','mime','width','height','bytes','sha256','transparentBackground']);
  shape(maps,['width','height','normal','surface']);shape(maps.normal,['path','sha256']);shape(maps.surface,['path','sha256']);shape(manifest.view,['angle']);
  const recipe=normalizeRecipe(manifest.recipe),angle=viewAngle(manifest.view.angle);
  if(recipe.template!==(manifest.template??(legacy?'soft-folds':undefined)))throw new Error('Project template and recipe disagree');
  dimensions(source.width,source.height);mapDimensions(maps.width,maps.height);simpleName(source.name);
  if(source.transparentBackground!=='#f5ecd9'||source.path!==`assets/source.${mimeToExtension[source.mime]}`||maps.normal.path!=='maps/film.rgba'||maps.surface.path!=='maps/substrate.rgba')throw new Error('Unexpected project resource paths');
  if(new Set(entries.keys()).size!==4||[source.path,maps.normal.path,maps.surface.path].some(name=>!entries.has(name)))throw new Error('Missing or extra project resources');
  const sourceBytes=entries.get(source.path),normalBytes=entries.get(maps.normal.path),surfaceBytes=entries.get(maps.surface.path);
  verifySource(sourceBytes,source.mime);
  if(source.bytes!==sourceBytes.length||normalBytes.length!==maps.width*maps.height*4||surfaceBytes.length!==maps.width*maps.height*4)throw new Error('Project resource size mismatch');
  if(await digest(sourceBytes)!==source.sha256||await digest(normalBytes)!==maps.normal.sha256||await digest(surfaceBytes)!==maps.surface.sha256)throw new Error('Project resource hash mismatch');
  const regenerated=legacy?makeSoftFolds({width:maps.width,height:maps.height,...recipe}):makeMaterialMaps({width:maps.width,height:maps.height,...recipe});
  if(await digest(regenerated.normal.data)!==maps.normal.sha256||await digest(regenerated.surface.data)!==maps.surface.sha256)throw new Error('Project maps do not match recipe');
  return {manifest,sourceBytes,maps:{normal:regenerated.normal,surface:regenerated.surface},recipe,angle};
}
