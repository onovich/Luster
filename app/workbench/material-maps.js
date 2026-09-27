import {makeSoftFolds,generateField,validateMapSettings} from './soft-folds.js';

export const materialGeneratorVersion='material-maps-p1.0';
export const templates=Object.freeze(['soft-folds','fine-grain','prism','smooth']);
const fract=x=>x-Math.floor(x);
const smooth=x=>x*x*(3-2*x);
function random(seed){let state=seed||0x6d2b79f5;return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};}
function noise(x,y,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
  const point=(a,b)=>{let n=Math.imul(a+seed,374761393)+Math.imul(b^seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  const a=point(ix,iy),b=point(ix+1,iy),c=point(ix,iy+1),d=point(ix+1,iy+1);
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
function fieldFor(template,seed,density,direction){
  const next=random(seed),angle=direction*Math.PI/180,ca=Math.cos(angle),sa=Math.sin(angle),phase=next();
  if(template==='fine-grain'){
    const scale=13+density*45;
    return (x,y)=>{
      const u=x*ca+y*sa,v=y*ca-x*sa;
      return .58*noise(u*scale,v*scale*.83,seed)+.28*noise(u*scale*2,v*scale*1.7,seed^0x6d2b79f5)+.14*noise(u*scale*.35,v*scale*.35,seed^0x9e3779b9);
    };
  }
  if(template==='prism'){
    const frequency=5+density*18,warp=.008+next()*.018;
    return (x,y)=>{
      const u=x*ca+y*sa,v=y*ca-x*sa;
      const band=fract((u+warp*Math.sin(v*13+phase*6.2831853))*frequency+phase);
      const facet=1-Math.abs(band*2-1);
      return .82*facet+.18*noise(u*4,v*4,seed);
    };
  }
  if(template==='smooth'){
    const frequency=.55+density*1.5,offset=next()*6.2831853;
    return (x,y)=>{
      const u=x*ca+y*sa,v=y*ca-x*sa;
      return .5+.28*Math.sin((u*frequency+phase)*6.2831853+.08*Math.sin(v*6.2831853+offset))+.12*Math.sin((v*.7+phase)*6.2831853);
    };
  }
  throw new Error('Unsupported material template');
}
export function makeMaterialMaps({template='soft-folds',width=256,height=256,seed=2048,density=.42,depth=.18,direction=35}={}){
  if(!templates.includes(template))throw new Error('Unsupported material template');
  const settings={width,height,seed,density,depth,direction};
  validateMapSettings(settings);
  if(template==='soft-folds')return {...makeSoftFolds(settings),generatorVersion:materialGeneratorVersion};
  const film=fieldFor(template,seed,density,direction),substrate=fieldFor(template,(seed^0x9e3779b9)>>>0,density*.82,direction+19);
  const gain=template==='smooth' ? .35 : template==='fine-grain' ? .22 : .65;
  return {
    normal:generateField(width,height,film,depth*gain,true),
    surface:{...generateField(width,height,substrate,depth*gain*.78,false),type:6},
    generatorVersion:materialGeneratorVersion
  };
}
