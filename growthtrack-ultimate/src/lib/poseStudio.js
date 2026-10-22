import config from '../config/poseStudio.json';
import {sanitizeDigits} from './humanSurface';

export const POSE_STUDIO = config;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
export const emptyPose = () => ({ enabled:false, joints:{}, targets:{} });
export const DEFAULT_POSE_STUDIO = Object.freeze({ current:emptyPose(), goal:emptyPose() });
export function sanitizePose(input) {
  const source=object(input),joints={},targets={};
  for(const joint of config.joints) {
    if(Array.isArray(source.joints?.[joint.id]) && source.joints[joint.id].length===3)
      joints[joint.id]=joint.limits.map(([min,max],i)=>number(source.joints[joint.id][i],min,max));
  }
  for(const limb of config.limbs) {
    const target=source.targets?.[limb.id];
    if(Array.isArray(target) && target.length===3 && target.every(v=>typeof v==='number' && Number.isFinite(v)))
      targets[limb.id]=target.map(v=>number(v,-config.targetLimit,config.targetLimit));
  }
  const digits=sanitizeDigits(source.digits);
  return {enabled:source.enabled===true,joints,targets,...(digits?{digits}:{})};
}
export function sanitizePoseStudio(input) {
  return {current:sanitizePose(input?.current),goal:sanitizePose(input?.goal)};
}
export function patchPose(studio,context,patch) {
  const next=sanitizePoseStudio(studio),key=context==='goal'?'goal':'current';
  next[key]=sanitizePose({...next[key],...patch});
  return next;
}
export function poseIsActive({pose,viewMode,measurementView,renderMode,overridden=false}) {
  return Boolean(pose?.enabled && viewMode==='SOLO' && !measurementView && renderMode==='normal' && !overridden);
}
