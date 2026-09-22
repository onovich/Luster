import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const excluded=new Set(['.git','.local','.test-output','node_modules','__pycache__']);
async function files(dir=root){
  const found=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(excluded.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())found.push(...await files(full));else found.push(full);
  }
  return found;
}
test('public text contains no machine paths, private keys or embedded application images',async()=>{
  for(const file of await files()){
    if(!/\.(md|json|js|cjs|py|html|css)$/.test(file))continue;
    const text=await readFile(file,'utf8');
    assert(!/\b[A-Za-z]:[\\/]/.test(text),`Absolute machine path: ${path.relative(root,file)}`);
    assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),`Private key: ${file}`);
    if(file.endsWith('.html'))assert(!/data:image\//.test(text),`Embedded image in HTML: ${file}`);
  }
});
test('core imports stay inside the reusable source tree',async()=>{
  for(const file of (await files(path.join(root,'src'))).filter(p=>p.endsWith('.js'))){
    const text=await readFile(file,'utf8');
    for(const [,specifier] of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
      const target=path.resolve(path.dirname(file),specifier);
      assert(target.startsWith(path.join(root,'src')+path.sep),`Core dependency escaped src: ${file}`);
    }
  }
});
