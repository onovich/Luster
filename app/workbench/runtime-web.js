import {LayeredRenderer} from './src/index.js';

const $=id=>document.getElementById(id);
async function loadBytes(url){const response=await fetch(url);if(!response.ok)throw new Error(`Missing package resource: ${url}`);return new Uint8Array(await response.arrayBuffer());}
async function run(){
  const manifest=await (await fetch('./manifest.json')).json();
  if(manifest.format!=='luster-web-export'||manifest.version!==1||!['soft-folds','fine-grain','prism','smooth'].includes(manifest.template))throw new Error('Unsupported Web package');
  const [sourceBytes,normalBytes,surfaceBytes]=await Promise.all([
    loadBytes(manifest.source.path),loadBytes(manifest.normal.path),loadBytes(manifest.surface.path)
  ]);
  const {width,height}=manifest.maps;
  if(normalBytes.length!==width*height*4||surfaceBytes.length!==width*height*4)throw new Error('Map size mismatch');
  const image=await createImageBitmap(new Blob([sourceBytes],{type:manifest.source.mime}),{imageOrientation:'from-image'});
  const art=document.createElement('canvas');art.width=manifest.preview.width;art.height=manifest.preview.height;
  const context=art.getContext('2d',{alpha:false});context.fillStyle='#f5ecd9';context.fillRect(0,0,art.width,art.height);context.drawImage(image,0,0,art.width,art.height);image.close();
  const recipe=manifest.recipe;
  const renderer=await LayeredRenderer.create($('material'),{
    layout:'full',background:art,normal:{data:normalBytes,width,height},surface:{data:surfaceBytes,width,height,type:6},
    parameters:{strength:recipe.strength,richness:recipe.richness,light:recipe.light},width:art.width,height:art.height
  });
  $('angle').value=String(manifest.view.angle);
  function draw(){
    const angle=Number($('angle').value);
    renderer.setLayers($('original').checked?{card:0,film:0}:{card:1,film:$('foil').checked?1:0});
    renderer.render({angle});$('angleValue').textContent=`${angle.toFixed(1)}°`;
  }
  $('angle').addEventListener('input',draw);$('foil').addEventListener('change',draw);$('original').addEventListener('change',draw);
  draw();$('status').textContent='Ready · local Web package';
  window.lusterWeb={ready:true,renderer,manifest};
}
run().catch(error=>{$('status').textContent=error.message;window.lusterWeb={ready:false,error:error.message};});
