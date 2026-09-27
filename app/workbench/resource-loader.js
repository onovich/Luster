export async function readResource(url){
  if(url.protocol==='file:'){
    const {readFile}=await import('node:fs/promises');
    return new Uint8Array(await readFile(url));
  }
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Export resource unavailable: ${url.pathname}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function rendererRoot(){
  for(const root of [new URL('./src/',import.meta.url),new URL('../../src/',import.meta.url)]){
    try{await readResource(new URL('index.js',root));return root;}catch{}
  }
  throw new Error('Renderer resources are missing from this Web build');
}
