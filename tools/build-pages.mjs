import {cp, mkdir, rm, writeFile, readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {siteHeader,replaceHeader} from './site-shell.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const galleryOnly=process.argv.includes('--gallery-only');
const output=path.join(root,galleryOnly?'dist-public':'dist');
// Local preview includes work in progress; production currently publishes only the gallery.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of ['src','demo']) {
  await cp(path.join(root,name),path.join(output,name),{recursive:true});
}
await cp(path.join(root,'index.html'),path.join(output,'index.html'));
if(!galleryOnly){
await cp(path.join(root,'dist-online/trial'),path.join(output,'trial'),{recursive:true});
const landing=await readFile(path.join(root,'dist-online/trial/index.html'),'utf8');
await mkdir(path.join(output,'product'));
function publicPage(html,current){return replaceHeader(html,siteHeader(current,{home:'../',product:'../product/',pricing:'../pricing/',editor:'../trial/'}))
  .replace('href="./online-entry.css"','href="../trial/online-entry.css"')
  .replace('href="./src/site.css"','href="../src/site.css"')
  .replaceAll('href="./pricing.html"','href="../pricing/"')
  .replaceAll('href="./index.html#data"','href="../product/#data"')
  .replaceAll('src="./assets/','src="../trial/assets/')
  .replaceAll('href="./app/workbench/trial.html','href="../trial/');}
await writeFile(path.join(output,'product/index.html'),publicPage(landing,'product'));
await mkdir(path.join(output,'pricing'));
await writeFile(path.join(output,'pricing/index.html'),publicPage(await readFile(path.join(root,'app/workbench/online-pricing-index.html'),'utf8'),'pricing'));
const trial=await readFile(path.join(root,'app/workbench/trial.html'),'utf8');
await writeFile(path.join(output,'trial/index.html'),replaceHeader(trial,siteHeader('editor',{home:'../../../',product:'../../../product/',pricing:'../../../pricing/',editor:'../../'}))
  .replace('<head>','<head><base href="./app/workbench/">')
  .replace('href="../../src/site.css"','href="../../../src/site.css"')
  .replaceAll('href="../../pricing.html"','href="../../../pricing/"'));
}
function redirect(destination){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${destination}"><title>Luster · Redirecting</title></head><body><a href="${destination}">Continue to Luster</a><script>location.replace(new URL(${JSON.stringify(destination)}+location.search+location.hash,location.href));</script></body></html>`;
}
await mkdir(path.join(output,'showcase'));
await writeFile(path.join(output,'showcase/index.html'),redirect('../'));
if(!galleryOnly){
 await writeFile(path.join(output,'trial/app/workbench/trial.html'),redirect('../../'));
 await writeFile(path.join(output,'trial/pricing.html'),redirect('../pricing/'));
}
// One persistent navigation shell; isolated views retain editor state and WebGL resources.
await mkdir(path.join(output,'content'));
const views=galleryOnly?{home:'index.html'}:{home:'index.html',product:'product/index.html',pricing:'pricing/index.html',editor:'trial/index.html'};
for(const [key,file] of Object.entries(views)){
 let content=await readFile(path.join(output,file),'utf8');
 content=content.replace(/<header\b[^>]*>[\s\S]*?<\/header>/,'');
 const base=key==='home'?'../':key==='editor'?'../trial/app/workbench/':`../${key}/`;
 content=content.replace(/<base\b[^>]*>/,'').replace('<head>',`<head><base href="${base}">`);
 const runtime=key==='home'?'./src/site-content.js':key==='editor'?'../../../src/site-content.js':'../src/site-content.js';
 content=content.replace('<body', '<body data-site-view="'+key+'"').replace('</body>',`<script type="module" src="${runtime}"></script></body>`);
 await writeFile(path.join(output,'content',`${key}.html`),content);
 const prefix=key==='home'?'./':'../';
 const header=siteHeader(key,galleryOnly?{home:prefix}:{home:prefix,product:prefix+'product/',pricing:prefix+'pricing/',editor:prefix+'trial/'});
 const title={home:'Luster · Material gallery',product:'Product · Luster',pricing:'Pricing · Luster',editor:'Editor · Luster'}[key];
 const shell=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="canonical" href="https://luster.onovich.com/${{home:'',product:'product/',pricing:'pricing/',editor:'trial/'}[key]}"><link rel="icon" href="data:,"><link rel="stylesheet" href="${prefix}src/site.css"></head><body class="siteShell">${header}<div id="pageAnnouncement" class="srOnly" role="status" aria-live="polite"></div><section id="pageFrames" class="pageFrames" aria-busy="true" aria-label="Page content"></section><noscript><iframe title="${title}" src="${prefix}content/${key}.html" style="width:100%;height:85vh;border:0"></iframe></noscript><script type="module" src="${prefix}src/site-app.js"></script></body></html>`;
 await writeFile(path.join(output,file),galleryOnly?shell.replace('class="siteShell"','class="siteShell" data-site-mode="gallery"'):shell);
}
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'CNAME'),'luster.onovich.com\n');
// Version the entire module graph together so cached modules cannot mix releases.
const files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(js|css|html)$/.test(file))files.push(file);}}
await walk(output);
const contents=await Promise.all(files.sort().map(file=>readFile(file,'utf8')));
const version=createHash('sha256').update(contents.join('\n')).digest('hex').slice(0,12);
for(let i=0;i<files.length;i++){
  const text=contents[i].replace(/(['"])(\.{1,2}\/[^'"?]+\.(?:js|css))\1/g,(_,quote,url)=>`${quote}${url}?v=${version}${quote}`);
  await writeFile(files[i],text);
}
console.log(galleryOnly?'Built production Pages artifact: gallery only; product, pricing and editor excluded':'Built local preview: gallery, product, pricing and Trial; Pro excluded');
