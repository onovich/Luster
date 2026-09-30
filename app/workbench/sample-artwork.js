/** Original Luster examples, drawn locally without fetching artwork. */
export function makeSampleArtwork(kind='poster'){
  if(!['poster','card'].includes(kind))throw new Error('Unknown example');
  const canvas=document.createElement('canvas');canvas.width=kind==='poster'?800:960;canvas.height=kind==='poster'?1000:600;
  const x=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  x.fillStyle='#f5ecd9';x.fillRect(0,0,w,h);
  x.strokeStyle='#1646ce';x.lineWidth=2;x.strokeRect(32,32,w-64,h-64);
  x.fillStyle='#1646ce';x.font='bold 20px Arial';x.fillText('LUSTER / MATERIAL STUDY',56,78);
  if(kind==='poster'){
    x.font='bold 152px Arial';x.fillText('SHIFT',48,270);x.fillText('THE',48,420);x.fillText('LIGHT.',48,570);
    x.lineWidth=18;for(let i=0;i<5;i++){x.beginPath();x.arc(440,770,70+i*27,Math.PI,Math.PI*2);x.stroke();}
    x.font='bold 20px Arial';x.fillText('SMALL MOVEMENTS. NEW PERSPECTIVES.',56,920);
  }else{
    x.font='bold 120px Arial';x.fillText('ORBIT',48,250);
    x.font='24px Arial';x.fillText('A COLLECTIBLE FROM ANOTHER WORLD',56,304);
    x.lineWidth=8;for(let i=0;i<4;i++){x.beginPath();x.ellipse(745,295,125,48+i*20,-.65,0,Math.PI*2);x.stroke();}
    x.fillRect(56,390,848,2);x.font='bold 22px Arial';x.fillText('NO. 001',56,462);x.fillText('EXPLORER EDITION',56,510);
    x.font='bold 58px Arial';x.fillText('01 / ∞',690,500);
  }
  return canvas;
}
export async function makeSampleFile(kind='poster'){
  const canvas=makeSampleArtwork(kind);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Example could not be prepared')),'image/png'));
  return new File([blob],`luster-example-${kind}.png`,{type:'image/png'});
}
