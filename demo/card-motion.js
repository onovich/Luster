// The card slides inside a stationary sleeve. Units are source-art pixels.
export class CardMotion {
 constructor(slot,image,sleeve){
  this.slot=slot;this.image=image;this.sleeve=sleeve;
  this.offset=this.start=this.target=0;this.elapsed=.16;this.active=false;this.previous=null;

 }
 to(raised){
  const next=raised?55/228*274:0;
  if(next===this.target)return;
  this.start=this.offset;this.target=next;this.elapsed=0;this.active=true;
 }
 advance(dt){
  if(!this.active)return;
  this.elapsed=Math.min(.16,this.elapsed+dt);
  const t=this.elapsed/.16,eased=this.target>0?1-(1-t)**3:t;
  this.offset=this.start+(this.target-this.start)*eased;this.active=t<1;
 }
 apply(renderer){
  if(this.previous===this.offset)return;
  this.slot.style.setProperty('--card-lift',`${-this.offset/274*100}%`);
  this.slot.style.setProperty('--card-rotation',`${-3*this.offset/(55/228*274)}deg`);
  if(renderer.setCardPose){renderer.setCardPose(this.offset/274,3*Math.PI/180*this.offset/(55/228*274));}
  else if(this.offset===0)renderer.setBackground(this.image);
  else{
   if(!this.background){this.background=document.createElement('canvas');this.background.width=244;this.background.height=274;this.context=this.background.getContext('2d');}
   const ctx=this.context;
   ctx.clearRect(0,0,244,274);ctx.drawImage(this.sleeve,0,0,244,274);
   // Trim only the baked sleeve rim from the example; it must not slide with the card.
   const w=this.image.naturalWidth,h=this.image.naturalHeight;
   ctx.save();ctx.translate(122,137-this.offset);ctx.rotate(-3*Math.PI/180*this.offset/(55/228*274));
   ctx.drawImage(this.image,w*8/244,h*8/274,w*228/244,h*258/274,-114,-129,228,258);ctx.restore();
   renderer.setBackground(this.background);
  }
  this.previous=this.offset;
 }
}
