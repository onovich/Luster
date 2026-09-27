export async function loadArtwork(file){
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP image.');
  if(file.size>20*1024*1024)throw new Error('Image is over the 20 MB prototype limit.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  try{
    if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>24_000_000)throw new Error('Image exceeds the 24 MP prototype limit.');
    const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#f5ecd9';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return {canvas,original:[bitmap.width,bitmap.height],scaled:scale<1};
  }finally{bitmap.close();}
}
