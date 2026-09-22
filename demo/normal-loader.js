// Lossless byte prediction, followed by gzip. The decoded data is still XY16.
export async function loadNormal(index) {
  const packed=typeof DecompressionStream==='function';
  const suffix=packed?'delta.gz':'rgba';
  const response=await fetch(new URL(`./assets/normals/normal-${index}.${suffix}`,import.meta.url));
  if(!response.ok)throw new Error(`法线 ${index+1} 加载失败 (${response.status})`);
  const body=packed?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))):response;
  const data=new Uint8Array(await body.arrayBuffer());
  if(data.length!==512*512*4)throw new Error(`法线 ${index+1} 数据不完整`);
  if(packed)for(let i=4;i<data.length;i++)data[i]=(data[i]+data[i-4])&255;
  return {data,width:512,height:512};
}
