import {makeMaterialMaps} from './material-maps.js';

export class MapEngine{
  constructor(limit=24,useWorker=true){this.limit=limit;this.cache=new Map();this.worker=null;this.pending=null;this.nextId=0;this.useWorker=useWorker;this.mode=useWorker?'worker':'main-thread';}
  cancel(){
    if(this.pending){if(this.pending.timer)clearTimeout(this.pending.timer);this.pending.reject(new DOMException('Map request superseded','AbortError'));this.pending=null;}
    if(this.worker){this.worker.terminate();this.worker=null;}
  }
  remember(key,maps){
    this.cache.delete(key);this.cache.set(key,maps);
    while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);
  }
  generate(input){
    const key=JSON.stringify(input);
    if(this.cache.has(key)){
      if(this.pending)this.cancel();
      const maps=this.cache.get(key);this.remember(key,maps);
      return Promise.resolve(maps);
    }
    if(this.pending)this.cancel();
    if(!this.useWorker){
      const id=++this.nextId;
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{
          if(this.pending?.id!==id)return;
          this.pending=null;
          try{const maps=makeMaterialMaps(input);this.remember(key,maps);resolve(maps);}
          catch(error){reject(error);}
        },0);
        this.pending={id,reject,timer};
      });
    }
    if(!this.worker){
      try{this.worker=new Worker(new URL('./map-worker.js',import.meta.url),{type:'module'});}
      catch{this.mode='main-thread';return Promise.resolve().then(()=>{const maps=makeMaterialMaps(input);this.remember(key,maps);return maps;});}
    }
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      this.pending={id,reject};
      this.worker.onmessage=event=>{
        if(event.data.id!==id)return;
        this.pending=null;
        if(event.data.error){reject(new Error(event.data.error));return;}
        this.remember(key,event.data.maps);resolve(event.data.maps);
      };
      this.worker.onerror=error=>{this.cancel();reject(new Error(error.message||'Map worker failed'));};
      this.worker.postMessage({id,input});
    });
  }
  dispose(){this.cancel();this.cache.clear();}
}
