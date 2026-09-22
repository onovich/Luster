import {presets} from '../core/presets.js';
import {validateParameters,validatePose} from '../core/parameters.js';
import {vertexShader,compile,uploadNormal,uploadBackground,loadShader} from './resources.js';
/** Owns GPU resources, never animation, DOM controls, assets or book layout. */
export class FoilRenderer {
  static async create(canvas, {variant='B14',normal,background,parameters={},width=488,height=548}={}) {
    const source=await loadShader(variant);
    const renderer=new FoilRenderer(canvas);
    try {
      renderer.setVariantSource(variant,source);
      renderer.setNormal(normal); renderer.setBackground(background);
      renderer.setParameters(parameters); renderer.resize(width,height);
      return renderer;
    } catch(error) { renderer.dispose(); throw error; }
  }
  constructor(canvas) {
    this.canvas=canvas;
    const gl=this.gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});
    if (!gl || !gl.getExtension('OES_standard_derivatives')) throw new Error('WebGL with derivatives is required');
    this.buffer=gl.createBuffer(); this.normalTexture=gl.createTexture(); this.baseTexture=gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.disposed=false;
  }
  ensureLive() { if(this.disposed) throw new Error('Renderer disposed'); if(this.gl.isContextLost()) throw new Error('WebGL context lost; recreate the renderer'); }
  setVariantSource(variant,source) {
    this.ensureLive(); if (!presets[variant]) throw new RangeError('Unknown variant');
    const gl=this.gl, program=gl.createProgram(), shaders=[];
    try {
      shaders.push(compile(gl,gl.VERTEX_SHADER,vertexShader)); shaders.push(compile(gl,gl.FRAGMENT_SHADER,source));
      for(const shader of shaders) gl.attachShader(program,shader);
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch(error) { gl.deleteProgram(program); throw error; }
    finally { for(const shader of shaders) gl.deleteShader(shader); }
    if(this.program) gl.deleteProgram(this.program);
    this.program=program; this.variant=variant; this.parameters={...presets[variant]}; this.uniforms={};
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    const p=gl.getAttribLocation(program,'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
    for(const name of ['angle','lightAngle','period','spread','strength','kind','inspect','flatFloor','localBoost','threshold','softness','whiteGain','richness','bend','normalSize','normalMap','background']) this.uniforms[name]=gl.getUniformLocation(program,name);
    gl.uniform1i(this.uniforms.normalMap,0); gl.uniform1i(this.uniforms.background,1);
  }
  setParameters(patch) { this.ensureLive(); this.parameters=validateParameters({...this.parameters,...patch}); }
  setNormal(normal) { this.ensureLive(); uploadNormal(this.gl,this.normalTexture,normal); this.normalSize=[normal.width,normal.height]; }
  setBackground(image) { this.ensureLive(); uploadBackground(this.gl,this.baseTexture,image); }
  resize(width,height) {
    this.ensureLive(); if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1) throw new RangeError('Positive integer canvas dimensions required');
    this.canvas.width=width; this.canvas.height=height; this.gl.viewport(0,0,width,height);
  }
  render({angle=0,inspect=0,kind=2}={}) {
    this.ensureLive(); validatePose(angle);
    const gl=this.gl,u=this.uniforms,p=this.parameters;
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.normalTexture);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.baseTexture);
    gl.uniform2f(u.normalSize,...this.normalSize);
    const values={...p,angle,lightAngle:p.light,strength:p.enabled?p.strength:0,kind,inspect};
    for(const [name,location] of Object.entries(u)) if(location!==null && typeof values[name]==='number') gl.uniform1f(location,values[name]);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  dispose() {
    if(this.disposed) return;
    const gl=this.gl;
    gl.useProgram(null);
    if(this.program) gl.deleteProgram(this.program);
    gl.deleteTexture(this.normalTexture);gl.deleteTexture(this.baseTexture);gl.deleteBuffer(this.buffer);
    this.disposed=true;
  }
}
