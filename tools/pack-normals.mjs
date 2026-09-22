import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';

let before=0,after=0;
for(let i=0;i<8;i++){
  const base=new URL(`../demo/assets/normals/normal-${i}.`,import.meta.url);
  const raw=await readFile(new URL(`${base}rgba`)),delta=Buffer.from(raw);
  for(let k=raw.length-1;k>=4;k--)delta[k]=(raw[k]-raw[k-4])&255;
  const packed=gzipSync(delta,{level:9});
  await writeFile(new URL(`${base}delta.gz`),packed);
  before+=raw.length;after+=packed.length;
}
console.log(JSON.stringify({rawBytes:before,packedBytes:after,savedPercent:Math.round((1-after/before)*100)}));
