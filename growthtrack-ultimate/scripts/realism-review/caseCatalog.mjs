import {CLOTHING_OPTIONS} from '../../src/lib/wardrobePreferences.js';
import {ANIMATION_PRESETS} from '../../src/components/morphEngine/animationPresets.js';
export const REVIEW_REVISION='clothing-fit-r3';
export const reviewFileId=(model,id)=>(model+'-'+id).replace(/[^a-zA-Z0-9_-]/g,'');
export const REVIEW_CASES=[];
for(const [preset,config] of Object.entries(CLOTHING_OPTIONS))for(const [variant] of config.variants) {
  for(const pose of ANIMATION_PRESETS)for(const phase of pose.loop?[0,.25,.5,.75]:[0])REVIEW_CASES.push({id:`${preset}-${variant}-${pose.id}-${phase}`,preset,variant,pose:pose.id,sampleTime:pose.duration*phase,fit:'regular',color:null});
  for(const fit of ['fitted','relaxed'])REVIEW_CASES.push({id:`${preset}-${variant}-size-${fit}`,preset,variant,pose:'standing',fit,color:null});
  for(const color of ['#ffffff','#111111','#cc3344'])REVIEW_CASES.push({id:`${preset}-${variant}-color-${color.slice(1)}`,preset,variant,pose:'standing',fit:'regular',color});
}
for(const [preset,config] of Object.entries(CLOTHING_OPTIONS))for(const [variant] of config.variants) {
  for(const view of ['SIDE','BACK'])for(const pose of ['standing','sitting','squat'])REVIEW_CASES.push({id:`${preset}-${variant}-${pose}-${view}`,preset,variant,pose,view,fit:'regular'});
  REVIEW_CASES.push({id:`${preset}-${variant}-independent-colors`,preset,variant,pose:'standing',fit:'regular',options:{topColor:'#ffffff',bottomColor:'#cc3344',trimColor:'#111111'}});
}
