import {templates} from './material-maps.js';

const fields=['template','seed','density','depth','direction','strength','richness','light'];
export function shape(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw new Error('Unknown or malformed project field');
}
export function normalizeRecipe(input={}){
  shape(input,fields);
  const recipe={template:input.template??'soft-folds',seed:input.seed??2048,density:input.density??.42,depth:input.depth??.18,direction:input.direction??35,strength:input.strength??.3,richness:input.richness??22,light:input.light??24.39};
  if(!templates.includes(recipe.template))throw new Error('Unsupported material template');
  if(!Number.isInteger(recipe.seed)||recipe.seed<0||recipe.seed>0xffffffff)throw new RangeError('Seed must be a uint32');
  for(const key of ['density','depth'])if(!Number.isFinite(recipe[key])||recipe[key]<0||recipe[key]>1)throw new RangeError(`${key} must be 0–1`);
  if(!Number.isFinite(recipe.direction)||recipe.direction< -90||recipe.direction>90)throw new RangeError('Direction must be −90–90°');
  for(const [key,min,max] of [['strength',0,.8],['richness',0,35],['light',3,35]])if(!Number.isFinite(recipe[key])||recipe[key]<min||recipe[key]>max)throw new RangeError(`${key} must be ${min}–${max}`);
  return recipe;
}
export function viewAngle(value){if(!Number.isFinite(value)||value< -90||value>90)throw new RangeError('View angle must be −90–90°');return value;}
export class ProjectSession{
  constructor(recipe={}){this.recipe=normalizeRecipe(recipe);this.revision=0;this.viewRevision=0;this.angle=0;this.undoStack=[];this.redoStack=[];}
  read(){return {revision:this.revision,viewRevision:this.viewRevision,recipe:{...this.recipe},angle:this.angle,canUndo:this.undoStack.length>0,canRedo:this.redoStack.length>0};}
  assertRevision(expected){if(expected!==this.revision)throw new Error(`Revision conflict: expected ${expected}, current ${this.revision}`);}
  apply(patch,expectedRevision){
    this.assertRevision(expectedRevision);shape(patch,fields);
    const next=normalizeRecipe({...this.recipe,...patch});
    if(fields.every(key=>next[key]===this.recipe[key]))return this.read();
    this.undoStack.push(this.recipe);if(this.undoStack.length>100)this.undoStack.shift();
    this.recipe=next;this.redoStack=[];this.revision++;return this.read();
  }
  undo(expectedRevision){this.assertRevision(expectedRevision);if(!this.undoStack.length)return this.read();this.redoStack.push(this.recipe);this.recipe=this.undoStack.pop();this.revision++;return this.read();}
  redo(expectedRevision){this.assertRevision(expectedRevision);if(!this.redoStack.length)return this.read();this.undoStack.push(this.recipe);this.recipe=this.redoStack.pop();this.revision++;return this.read();}
  setViewAngle(angle){this.angle=viewAngle(angle);this.viewRevision++;return this.read();}
}
