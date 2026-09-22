import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
// Publish only the runnable demo, never the repository or local evidence tree.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of ['index.html','src','demo']) {
  await cp(path.join(root,name),path.join(output,name),{recursive:true});
}
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'CNAME'),'luster.onovich.com\n');
console.log('Built Pages artifact: index.html, src/, demo/, .nojekyll, CNAME');
