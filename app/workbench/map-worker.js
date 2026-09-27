import {makeMaterialMaps} from './material-maps.js';

self.onmessage=event=>{
  const {id,input}=event.data;
  try{
    const maps=makeMaterialMaps(input);
    self.postMessage({id,maps},[maps.normal.data.buffer,maps.surface.data.buffer]);
  }catch(error){self.postMessage({id,error:error.message});}
};
