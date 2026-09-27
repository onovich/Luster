export const mimeToExtension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};

export function verifySource(bytes,mime){
  if(!(bytes instanceof Uint8Array)||bytes.length<12||bytes.length>20*1024*1024||!mimeToExtension[mime])throw new Error('Invalid source image');
  const isPng=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isWebp=String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
  if(!(mime==='image/png'&&isPng||mime==='image/jpeg'&&isJpeg||mime==='image/webp'&&isWebp))throw new Error('Image bytes do not match declared type');
}
