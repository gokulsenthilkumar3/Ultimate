import config from '../config/cameraBookmarks.json';
export const CAMERA_BOOKMARKS=config;
const finite=value=>typeof value==='number' && Number.isFinite(value);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function sanitizeCameraView(input) {
  if(!input || !finite(input.azimuth) || !finite(input.polar) || !finite(input.distanceRatio) || input.distanceRatio<=0 ||
    !Array.isArray(input.targetOffset) || input.targetOffset.length!==3 || !input.targetOffset.every(finite))return null;
  return {azimuth:Math.atan2(Math.sin(input.azimuth),Math.cos(input.azimuth)),
    polar:clamp(input.polar,...config.polar),distanceRatio:clamp(input.distanceRatio,...config.distanceRatio),
    targetOffset:input.targetOffset.map(v=>clamp(v,-config.targetLimit,config.targetLimit))};
}
export function sanitizeCameraBookmarks(input) {
  const seen=new Set();
  return (Array.isArray(input)?input:[]).slice(0,config.maximum).flatMap(item=>{
    const view=sanitizeCameraView(item?.view),name=typeof item?.name==='string'?item.name.trim().slice(0,config.nameLength):'';
    const id=typeof item?.id==='string' && /^[\w-]{1,80}$/.test(item.id)?item.id:null;
    if(!id || !name || !view || seen.has(id))return [];
    seen.add(id);return [{id,name,view}];
  });
}
// Values are relative to the evaluated model height, not a particular owner's body.
export function normalizeCameraView({position,target,frame}) {
  if(!finite(frame?.height) || frame.height<=0 || !position?.every(finite) || !target?.every(finite))return null;
  const vector=position.map((v,i)=>v-target[i]),distance=Math.hypot(...vector);
  return sanitizeCameraView({azimuth:Math.atan2(vector[0],vector[2]),polar:Math.acos(clamp(vector[1]/distance,-1,1)),
    distanceRatio:distance/frame.height,targetOffset:target.map(v=>v/frame.height)});
}
export function restoreCameraView(view,frame) {
  const safe=sanitizeCameraView(view);
  if(!safe || !finite(frame?.height) || frame.height<=0)return null;
  return {target:safe.targetOffset.map(v=>v*frame.height),distance:safe.distanceRatio*frame.height,azimuth:safe.azimuth,polar:safe.polar};
}
