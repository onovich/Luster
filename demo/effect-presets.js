import {presets} from '../src/core/presets.js';

// Art-directed lighting treatments, independent of the B11/B14 optical model.
export const effects = Object.freeze({
 original: {name:'Original',description:'Balanced foil',values:{}},
 soft: {name:'Soft',description:'Gentle glow',values:{spread:1.2,strength:.22,flatFloor:.08,localBoost:2,threshold:.02,softness:.06,whiteGain:2}},
 vivid: {name:'Vivid',description:'Rich spectral color',values:{spread:.4,strength:.48,flatFloor:.03,localBoost:4,threshold:.025,softness:.04,whiteGain:1.2}},
 fine: {name:'Fine',description:'Narrow highlights',values:{spread:0,strength:.35,flatFloor:.01,localBoost:3,threshold:.045,softness:.014,whiteGain:1.5}}
});
export function effectParameters(variant,effect='original'){
 return {...presets[variant],...effects[effect].values};
}
