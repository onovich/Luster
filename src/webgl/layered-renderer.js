import {FoilRenderer} from './renderer.js';
import {loadShader} from './resources.js';
import {withCardLayer} from './card-layer.js';

/** Card substrate and stationary sleeve in one fragment pass and one WebGL context. */
export class LayeredRenderer extends FoilRenderer {
 static async create(canvas,{variant='B14',normal,background,surface,parameters={},width=488,height=548}={}){
  const source=await loadShader(variant),r=new LayeredRenderer(canvas);
  try{r.setVariantSource(variant,source);r.setNormal(normal);r.setBackground(background);r.setSurface(surface);r.setParameters(parameters);r.resize(width,height);return r;}
  catch(error){r.dispose();throw error;}
 }
 constructor(canvas){super(canvas,{alpha:true});this.cardTexture=this.gl.createTexture();this.layers={card:1,film:1};this.cardPose={lift:0,turn:0};}
 setVariantSource(variant,source){
  super.setVariantSource(variant,withCardLayer(source));
  for(const name of ['cardMap','cardType','cardAmount','filmAmount','cardLift','cardTurn','cardViewport'])this.uniforms[name]=this.gl.getUniformLocation(this.program,name);
  this.gl.uniform1i(this.uniforms.cardMap,2);
 }
 setSurface({data,width,height,type}){
  this.ensureLive();if(!(data instanceof Uint8Array)||data.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!Number.isInteger(type)||type<1||type>8)throw new TypeError('Invalid card surface');
  const gl=this.gl;gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.cardTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
  for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
  for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
  this.cardType=type;
 }
 setLayers({card=this.layers.card,film=this.layers.film}={}){
  this.ensureLive();if(![card,film].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new RangeError('Layer weights must be in [0,1]');
  this.layers={card,film};
 }
 setCardPose(lift,turn){this.ensureLive();if(!Number.isFinite(lift)||!Number.isFinite(turn))throw new RangeError('Invalid card pose');this.cardPose={lift,turn};}
 resize(width,height){super.resize(width,height);this.baseWidth=width;this.baseHeight=height;}
 render(options={}){
  this.ensureLive();const diagnostic=(options.inspect||0)>.5,height=diagnostic?this.baseHeight:Math.ceil(this.baseHeight*1.32);
  if(this.canvas.height!==height)super.resize(this.baseWidth,height);
  this.canvas.classList.toggle('layered-card',!diagnostic);
  const gl=this.gl;gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.cardTexture);
  const values={cardType:this.cardType,cardAmount:this.layers.card,filmAmount:this.layers.film,cardLift:diagnostic?0:this.cardPose.lift,cardTurn:diagnostic?0:this.cardPose.turn,cardViewport:height/this.baseHeight};
  for(const [key,value] of Object.entries(values))gl.uniform1f(this.uniforms[key],value);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  super.render(options);
 }
 dispose(){if(this.disposed)return;this.gl.deleteTexture(this.cardTexture);super.dispose();}
}
