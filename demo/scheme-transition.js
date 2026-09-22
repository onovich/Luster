/** Keep the previous rendered frame visible while the new material fades in. */
export function captureTransition(renderers) {
 const layers=renderers.filter(Boolean).map(renderer=>{
  const layer=document.createElement('canvas');layer.className='scheme-transition';
  layer.width=renderer.canvas.width;layer.height=renderer.canvas.height;
  layer.getContext('2d').drawImage(renderer.canvas,0,0);
  renderer.canvas.after(layer);return layer;
 });
 return {
  async play(duration=450){try{await Promise.all(layers.map(layer=>layer.animate([{opacity:1},{opacity:0}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished));}finally{this.dispose();}},
  dispose(){for(const layer of layers)layer.remove();}
 };
}
