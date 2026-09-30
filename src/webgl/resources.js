import {fetchResource} from './fetch-resource.js';
export const vertexShader = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}';
const shaderSources=new Map();
export async function loadShader(variant='B14') {
  if (!['B11','B14'].includes(variant)) throw new RangeError('Unknown material variant');
  if (!shaderSources.has(variant)) {
    const pending=fetchResource(new URL(`../shaders/${variant}.frag`,import.meta.url)).then(response=>{
      if (!response.ok) throw new Error(`Shader ${response.status}`);
      return response.text();
    }).catch(error=>{shaderSources.delete(variant);throw error;});
    shaderSources.set(variant,pending);
  }
  return shaderSources.get(variant);
}
export function compile(gl,type,source) {
  const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { const error=gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error); }
  return shader;
}
/** The same 64 CIE samples as B14, cached as float texels instead of shader code. */
export function createSpectrumTexture(gl){
  if(!gl.getExtension('OES_texture_float'))return null;
  const data=new Float32Array(64*4),gauss=x=>Math.exp(-.5*x*x);
  for(let k=0;k<64;k++){
    const w=380+(k+.5)*400/64;
    data[k*4]=.362*gauss((w-442)*(w<442?.0624:.0374))+1.056*gauss((w-599.8)*(w<599.8?.0264:.0323))-.065*gauss((w-501.1)*(w<501.1?.049:.0382));
    data[k*4+1]=.821*gauss((w-568.8)*(w<568.8?.0213:.0247))+.286*gauss((w-530.9)*(w<530.9?.0613:.0322));
    data[k*4+2]=1.217*gauss((w-437)*(w<437?.0845:.0278))+.681*gauss((w-459)*(w<459?.0385:.0725));
    data[k*4+3]=1;
  }
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,64,1,0,gl.RGBA,gl.FLOAT,data);
  sampling(gl,gl.NEAREST);return texture;
}
/** Packed normal bytes have their first row at UV y=0. No color management, alpha or filtering. */
export function uploadNormal(gl,texture,{data,width,height}) {
  if (!(data instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 || data.length!==width*height*4) throw new TypeError('Invalid RGBA normal bytes');
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
  sampling(gl,gl.NEAREST);
}
export function uploadBackground(gl,texture,image) {
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  sampling(gl,gl.LINEAR);
}
function sampling(gl,filter) {
  for (const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
  for (const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,p,filter);
}
