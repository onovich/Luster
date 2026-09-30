import {copyFile,mkdir,readdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workbench=path.join(repo,'app','workbench');
const output=path.join(repo,'dist-online');
if(path.dirname(output)!==repo)throw new Error('Online output must stay inside the repository');
const shared=[
  'trial.html','trial.css','trial.js','image.js','soft-folds.js','material-maps.js',
  'map-engine.js','map-worker.js','recipe.js','zip-store.js','trial-handoff.js','source-image.js','sample-artwork.js'
];
const proOnly=[
  'pro.html','pro.css','pro.js','project.js','export-web.mjs','export-unity.mjs',
  'resource-loader.js','runtime-web.html','runtime-web.js'
];
const publicAssets=['preview-poster.png','preview-card.png'];
const builds=[
  {name:'trial',files:shared,index:'online-trial-index.html',unity:false},
  {name:'pro',files:[...shared,...proOnly],index:'online-pro-index.html',unity:true}
];

async function copyTree(source,destination){
  await mkdir(destination,{recursive:true});
  for(const entry of await readdir(source,{withFileTypes:true})){
    if(entry.isDirectory())await copyTree(path.join(source,entry.name),path.join(destination,entry.name));
    else if(entry.isFile())await copyFile(path.join(source,entry.name),path.join(destination,entry.name));
  }
}
async function collect(root){
  const files=new Set();
  async function visit(directory,prefix=''){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const name=prefix?`${prefix}/${entry.name}`:entry.name;
      if(entry.isDirectory())await visit(path.join(directory,entry.name),name);
      else if(entry.isFile())files.add(name);
    }
  }
  await visit(root);return files;
}
const reports=[];
await rm(output,{recursive:true,force:true});
for(const build of builds){
  const site=path.join(output,build.name),app=path.join(site,'app','workbench');
  await mkdir(app,{recursive:true});
  for(const name of build.files)await copyFile(path.join(workbench,name),path.join(app,name));
  await mkdir(path.join(site,'assets'),{recursive:true});
  for(const name of publicAssets)await copyFile(path.join(workbench,'assets',name),path.join(site,'assets',name));
  await copyFile(path.join(workbench,build.index),path.join(site,'index.html'));
  await copyFile(path.join(workbench,'online-pricing-index.html'),path.join(site,'pricing.html'));
  await copyFile(path.join(workbench,'online-entry.css'),path.join(site,'online-entry.css'));
  await copyTree(path.join(repo,'src'),path.join(site,'src'));
  if(build.unity)await copyTree(path.join(workbench,'unity'),path.join(app,'unity'));
  const expected=new Set(['index.html','pricing.html','online-entry.css',...build.files.map(name=>`app/workbench/${name}`)]);
  for(const name of publicAssets)expected.add(`assets/${name}`);
  const renderer=await collect(path.join(site,'src'));
  for(const name of renderer)expected.add(`src/${name}`);
  if(build.unity){const unity=await collect(path.join(app,'unity'));for(const name of unity)expected.add(`app/workbench/unity/${name}`);}
  const actual=await collect(site);
  if(expected.size!==actual.size||[...expected].some(name=>!actual.has(name)))throw new Error(`${build.name} contains missing or stale resources`);
  if([...actual].some(name=>/(?:^|\/)(?:desktop|node_modules|integration|commercial-plan|\.local)(?:\/|$)/i.test(name)))throw new Error(`Private resource in ${build.name}`);
  if(!build.unity&&[...actual].some(name=>/(?:^|\/)(?:pro\.html|pro\.js|pro\.css|project\.js|export-web\.mjs|export-unity\.mjs|unity)(?:\/|$)/i.test(name)))throw new Error('Pro resource in public Trial build');
  reports.push({name:build.name,site:path.relative(repo,site).replaceAll(path.sep,'/'),files:actual.size,entry:build.unity?'app/workbench/pro.html':'app/workbench/trial.html',privatePaths:0});
}
await writeFile(path.join(output,'build-audit.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
