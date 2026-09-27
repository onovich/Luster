import {openProjectPackage} from './project.js';
import {writeStoredZip} from './zip-store.js';
import {readResource,rendererRoot} from './resource-loader.js';

const encoder=new TextEncoder();
const modules=[
  'src/index.js','src/core/presets.js','src/core/parameters.js',
  'src/webgl/fetch-resource.js','src/webgl/resources.js','src/webgl/renderer.js','src/webgl/layered-renderer.js','src/webgl/card-layer.js',
  'src/shaders/B14.frag','src/shaders/B11.frag'
];
export async function exportWebPackage(projectBytes){
  const project=await openProjectPackage(projectBytes),source=project.manifest.source,maps=project.manifest.maps;
  const root=await rendererRoot();
  const max=Math.max(source.width,source.height),scale=Math.min(1,1024/max);
  const manifest={
    format:'luster-web-export',version:1,sourceProjectSchema:project.manifest.schemaVersion,
    generatorVersion:project.manifest.generatorVersion,opticalModel:project.manifest.opticalModel,
    template:project.recipe.template,recipe:project.recipe,view:{angle:project.angle},
    source:{path:source.path,mime:source.mime,width:source.width,height:source.height},
    preview:{width:Math.max(1,Math.round(source.width*scale)),height:Math.max(1,Math.round(source.height*scale))},
    maps:{width:maps.width,height:maps.height},normal:{path:'assets/film.rgba'},surface:{path:'assets/substrate.rgba'}
  };
  const entries=new Map([
    ['index.html',await readResource(new URL('./runtime-web.html',import.meta.url))],
    ['runtime-web.js',await readResource(new URL('./runtime-web.js',import.meta.url))],
    ['manifest.json',encoder.encode(JSON.stringify(manifest,null,2))],
    ['README.md',encoder.encode('Luster Web export prototype\n\nServe this folder with a static HTTP server; open index.html through localhost or HTTPS. No Luster service is contacted. This prototype includes your source artwork and is not licensed for distribution until product terms are defined.\n')],
    [source.path,project.sourceBytes],
    ['assets/film.rgba',project.maps.normal.data],
    ['assets/substrate.rgba',project.maps.surface.data]
  ]);
  for(const name of modules)entries.set(name,await readResource(new URL(name.replace(/^src\//,''),root)));
  return writeStoredZip(entries);
}
