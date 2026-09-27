import {openProjectPackage} from './project.js';
import {writeStoredZip} from './zip-store.js';
import {readResource} from './resource-loader.js';

const encoder=new TextEncoder();
function pngSize(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<33||bytes.length>24*1024*1024||
     ![137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte)||
     String.fromCharCode(...bytes.subarray(12,16))!=='IHDR')throw new Error('Unity artwork must be a PNG');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const width=view.getUint32(16),height=view.getUint32(20);
  if(width<1||height<1||width*height>24_000_000)throw new Error('Invalid Unity artwork dimensions');
  return {width,height};
}
export async function exportUnityPackage(projectBytes,artworkPng){
  const project=await openProjectPackage(projectBytes),preview=pngSize(artworkPng),source=project.manifest.source;
  const expectedScale=Math.min(1,1024/Math.max(source.width,source.height));
  if(preview.width!==Math.max(1,Math.round(source.width*expectedScale))||
     preview.height!==Math.max(1,Math.round(source.height*expectedScale)))throw new Error('Unity artwork does not match project preview dimensions');
  const root='Assets/LusterExport/';
  const manifest={
    format:'luster-unity-export',version:1,target:'builtin-gamma-ugui',
    generatorVersion:project.manifest.generatorVersion,opticalModel:project.manifest.opticalModel,
    template:project.recipe.template,source:{path:'Source/artwork.png',width:preview.width,height:preview.height,originalWidth:source.width,originalHeight:source.height},
    maps:{width:project.manifest.maps.width,height:project.manifest.maps.height},
    recipe:project.recipe,view:{angle:project.angle}
  };
  const entries=new Map([
    [root+'manifest.json',encoder.encode(JSON.stringify(manifest,null,2))],
    [root+'Source/artwork.png',artworkPng],
    [root+'Maps/film.rgba',project.maps.normal.data],
    [root+'Maps/substrate.rgba',project.maps.surface.data]
  ]);
  for(const [name,target] of [
    ['LayeredUI.shader','Runtime/LayeredUI.shader'],
    ['LusterAngleDriver.cs','Runtime/LusterAngleDriver.cs'],
    ['LusterImport.cs','Editor/LusterImport.cs']
  ])entries.set(root+target,await readResource(new URL(`./unity/${name}`,import.meta.url)));
  entries.set('README.md',encoder.encode(
    'Luster Unity export prototype\n\nTarget: Unity 6000.4.8f1, Built-in Render Pipeline, Gamma color, uGUI RawImage.\n'+
    'Extract the ZIP into the root of a Unity project. Open Unity and run Tools > Luster > Build Imported Material.\n'+
    'The generated scene and material are under Assets/LusterExport/Generated. Source/artwork.png is a locally composited preview up to 1024 px on the longest side.\n'+
    'The film map uses XY16 packed into RGBA and point filtering; substrate uses RGBA32 and bilinear filtering. Keep both linear and uncompressed.\n'+
    'This prototype has been tested only on the stated target. It includes your artwork; product distribution terms are not yet defined.\n'
  ));
  return writeStoredZip(entries);
}
