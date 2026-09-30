import {cp, mkdir, rm, writeFile, readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
// Publish the gallery home, product page and audited Trial resources.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of ['src','demo']) {
  await cp(path.join(root,name),path.join(output,name),{recursive:true});
}
await cp(path.join(root,'dist-online/trial'),path.join(output,'trial'),{recursive:true});
const landing=await readFile(path.join(root,'dist-online/trial/index.html'),'utf8');
await cp(path.join(root,'index.html'),path.join(output,'index.html'));
await mkdir(path.join(output,'product'));
await writeFile(path.join(output,'product/index.html'),landing
  .replace('href="./online-entry.css"','href="../trial/online-entry.css"')
  .replace('href="./"','href="../"')
  .replace('href="/showcase/"','href="../"')
  .replaceAll('src="./assets/','src="../trial/assets/')
  .replaceAll('href="./app/workbench/trial.html','href="../trial/'));
const trial=await readFile(path.join(root,'app/workbench/trial.html'),'utf8');
await writeFile(path.join(output,'trial/index.html'),trial
  .replace('<head>','<head><base href="./app/workbench/">')
  .replace('href="../../index.html#plans"','href="../../../product/"')
  .replace('href="../../index.html"','href="../../../"'));
function redirect(destination){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${destination}"><title>Luster · Redirecting</title></head><body><a href="${destination}">Continue to Luster</a><script>location.replace(new URL(${JSON.stringify(destination)}+location.search+location.hash,location.href));</script></body></html>`;
}
await mkdir(path.join(output,'showcase'));
await writeFile(path.join(output,'showcase/index.html'),redirect('../'));
await writeFile(path.join(output,'trial/app/workbench/trial.html'),redirect('../../'));
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
console.log('Built public Pages artifact: gallery home, product, Trial, legacy redirects; Pro excluded');
