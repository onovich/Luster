// Prototype generator v0.1. The two maps have independent seeded fields.
// Typed-array rows begin at UV y=0, matching the public renderer contract.
export const generatorVersion='soft-folds-p0.1';

export function validateMapSettings({width,height,seed,density,depth,direction}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width>2048||height>2048)throw new RangeError('Map dimensions must be 32–2048');
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be a uint32');
  if(!Number.isFinite(density)||density<0||density>1)throw new RangeError('Density must be 0–1');
  if(!Number.isFinite(depth)||depth<0||depth>1)throw new RangeError('Depth must be 0–1');
  if(!Number.isFinite(direction)||direction< -90||direction>90)throw new RangeError('Direction must be −90–90°');
}
function random(seed){
  let state=seed||0x6d2b79f5;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
const fract=x=>x-Math.floor(x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function buildField(seed,density,direction){
  const next=random(seed);
  const angle=Math.round(Math.cos(direction*Math.PI/180)*1e6)/1e6;
  const bend=Math.round(Math.sin(direction*Math.PI/180)*1e6)/1e6;
  const waves=Array.from({length:3},(_,i)=>({
    freq:1.2+density*3.8+i*.29+(next()-.5)*.3,
    phase:next(),
    warp:.012+next()*.028,
    warpFreq:1+Math.floor(next()*2),
    width:.10+next()*.14,
    weight:.35+next()*.65,
    offset:(next()-.5)*.24
  }));
  return (x,y)=>{
    const u=x*angle+y*bend,v=y*angle-x*bend;
    let h=0;
    for(const w of waves){
      const warped=u+w.warp*Math.sin(2*Math.PI*(v*w.warpFreq+w.phase))+w.offset;
      const t=fract(warped*w.freq+w.phase);
      const d=Math.min(t,1-t);
      const q=clamp(1-d/w.width,0,1);
      h+=w.weight*q*q*(3-2*q);
    }
    return h/3;
  };
}
function packed16(value,out,index){
  const q=Math.round(clamp(value*.5+.5,0,1)*65535);
  out[index]=q>>>8;out[index+1]=q&255;
}
export function generateField(width,height,field,depth,film){
  const data=new Uint8Array(width*height*4);
  const step=1/Math.max(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=(x+.5)/width,v=(y+.5)/height;
    const dx=(field(u+step,v)-field(u-step,v))*depth*1.7;
    const dy=(field(u,v+step)-field(u,v-step))*depth*1.7;
    const nx=clamp(-dx,-.72,.72),ny=clamp(-dy,-.72,.72);
    const index=(y*width+x)*4;
    if(film){packed16(nx,data,index);packed16(ny,data,index+2);}
    else{
      data[index]=Math.round((nx*.5+.5)*255);
      data[index+1]=Math.round((ny*.5+.5)*255);
      data[index+2]=Math.round(clamp(field(u,v)*.8,0,1)*255);
      data[index+3]=192;
    }
  }
  return {data,width,height};
}
export function makeSoftFolds({width=256,height=256,seed=2048,density=.42,depth=.18,direction=35}={}){
  validateMapSettings({width,height,seed,density,depth,direction});
  const filmField=buildField(seed,density,direction);
  const substrateField=buildField((seed^0x9e3779b9)>>>0,density*.82,direction+19);
  return {
    normal:generateField(width,height,filmField,depth,true),
    surface:{...generateField(width,height,substrateField,depth*.78,false),type:6},
    generatorVersion
  };
}
