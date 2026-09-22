export const vertexShader = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}';
export async function loadShader(variant='B14') {
  if (!['B11','B14'].includes(variant)) throw new RangeError('Unknown material variant');
  const response=await fetch(new URL(`../shaders/${variant}.frag`,import.meta.url));
  if (!response.ok) throw new Error(`Shader ${response.status}`);
  return response.text();
}
export function compile(gl,type,source) {
  const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { const error=gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error); }
  return shader;
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
