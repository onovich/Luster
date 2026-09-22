// Authored interpretations of the eight artworks, not normals recovered from a photograph.
export const cardSurfaces=[
 {name:'Orbit',material:'Pearlescent relief · satin silver',type:1},
 {name:'Silk',material:'Anisotropic cobalt satin',type:2},
 {name:'Ribbon',material:'Pearlescent lacquer · silver',type:3},
 {name:'Facet',material:'Embossed prismatic metal',type:4},
 {name:'Diagonal',material:'Brushed graphite · polished ridge',type:5},
 {name:'Fold',material:'Creased metallized foil',type:6},
 {name:'Grain',material:'Mica flakes · satin lacquer',type:7},
 {name:'Wave',material:'Cobalt enamel · clearcoat',type:8}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function field(type,x,y){
 const u=x-.5,v=(y-.5)*1.333,r=Math.hypot(u,v);
 let nx=0,ny=0,phase=0,mask=0;
 if(type===1){const edge=Math.exp(-(((r-.365)/.023)**2));nx=u*(r<.365?.35:.08)+edge*u*.8;ny=v*(r<.365?.35:.08)+edge*v*.8;phase=r*2.1+x*.3-y*.2;mask=r<.365?.88:.25;}
 // These artwork-guided profiles get their normals and phase below.
 if(type===2||type===3)mask=.5;
 if(type===4)mask=.95;
 if(type===6)mask=.75;
 if(type===8)mask=.9;
 if(type===5){const t=y-x*.88-.04;nx=.24+.16*Math.tanh(t*11);ny=-.08+.11*Math.exp(-t*t*28);phase=t*.9;mask=Math.exp(-t*t*24);}
 if(type===7){const q=hash(Math.floor(x*210),Math.floor(y*280));nx=.28+(q-.5)*.38;ny=(hash(Math.floor(x*210)+17,Math.floor(y*280))-.5)*.30;phase=(y-x*.9)*.75;mask=q;}
 return [clamp(nx,-.8,.8),clamp(-ny,-.8,.8),phase-Math.floor(phase),mask];
}
export function makeCardSurface(index,image,size=256){
 const profile=cardSurfaces[index];if(!profile)throw new RangeError('Unknown card surface');
 const data=new Uint8Array(size*size*4);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,64,64);
 const pixels=ctx.getImageData(0,0,64,64).data;
 const pixel=(x,y)=>{const i=(clamp(y,0,63)*64+clamp(x,0,63))*4;return (pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;};
 const light=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;return (pixel(ix,iy)*(1-fx)+pixel(ix+1,iy)*fx)*(1-fy)+(pixel(ix,iy+1)*(1-fx)+pixel(ix+1,iy+1)*fx)*fy;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const values=field(profile.type,(x+.5)/size,1-(y+.5)/size),i=(y*size+x)*4;
  const sx=Math.min(63,x/size*64),sy=Math.min(63,(1-y/size)*64);
  const dx=light(sx+1,sy)-light(sx-1,sy),dy=light(sx,sy+1)-light(sx,sy-1);
  if([2,3,4,6,8].includes(profile.type)){
   values[0]=clamp(.22+dx*1.7,-.6,.7);values[1]=clamp(-dy*1.7,-.6,.6);
   if(profile.type===4){values[0]=Math.round(values[0]*24)/24;values[1]=Math.round(values[1]*24)/24;}
   values[2]=light(sx,sy)*.8;
  }
  data[i]=Math.round((values[0]*.5+.5)*255);data[i+1]=Math.round((values[1]*.5+.5)*255);data[i+2]=Math.round(values[2]*255);data[i+3]=Math.round(values[3]*255);
 }
 return {data,width:size,height:size,type:profile.type};
}
