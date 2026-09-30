import {cp, mkdir, rm, writeFile, readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
// Publish the audited Trial artifact and the material showcase.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of ['src','demo']) {
  await cp(path.join(root,name),path.join(output,name),{recursive:true});
}
await cp(path.join(root,'dist-online/trial'),path.join(output,'trial'),{recursive:true});
const landing=await readFile(path.join(root,'dist-online/trial/index.html'),'utf8');
await writeFile(path.join(output,'index.html'),landing
  .replace('href="./online-entry.css"','href="./trial/online-entry.css"')
  .replaceAll('src="./assets/','src="./trial/assets/')
  .replaceAll('href="./app/workbench/','href="./trial/app/workbench/'));
await mkdir(path.join(output,'showcase'));
await writeFile(path.join(output,'showcase/index.html'),(await readFile(path.join(root,'index.html'),'utf8')).replace('<head>','<head><base href="../">'));
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
console.log('Built public Pages artifact: landing, Trial, showcase; Pro excluded');
