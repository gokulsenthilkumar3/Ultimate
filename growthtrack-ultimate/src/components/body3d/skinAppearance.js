import {Float32BufferAttribute} from 'three';

// Optical-density deltas from docs/real-human-3d/code/skin-layers.mjs.
// Apply relative to the existing authored albedo; the reference model's
// absolute colours have not been calibrated against colorimeter readings.
export const SKIN_OPTICS=Object.freeze({melanin:[1,(550/610)**-3.33,(465/610)**-3.33],blood:[.05,1,.5],carotene:[0,.1,1],melaninScale:1.3,bloodScale:.9,caroteneScale:.25,tanMax:.22});
const TAN_CAPACITY=Object.freeze([.2,.5,.85,1,.75,.35]);
const clamp=(value,min,max,fallback=0)=>value==null || value==='' || !Number.isFinite(Number(value))?fallback:Math.max(min,Math.min(max,Number(value)));
export function resolveSkinAppearance(metrics={}) {
  const undertone={cool:-1,pink:-1,neutral:0,warm:1,golden:1}[metrics.skinUndertone];
  const type=['I','II','III','IV','V','VI'].indexOf(metrics.skinTone);
  return {tan:clamp(metrics.skinTan,0,1),undertone:undertone ?? clamp(metrics.skinUndertone,-1,1),flush:clamp(metrics.skinFlush,0,1),capacity:TAN_CAPACITY[type<0?3:type]};
}
export function skinLayerMultiplier({tan=0,undertone=0,flush=0,capacity=1,exposure=1,blood=1}={}) {
  const p=SKIN_OPTICS,melanin=p.tanMax*tan*capacity*exposure;
  const hb=(.35*blood+.5*flush)*(1-.18*undertone)-.35*blood;
  const carotene=.15*.8*undertone;
  return [0,1,2].map(i=>Math.exp(-2*p.melaninScale*p.melanin[i]*melanin-p.bloodScale*p.blood[i]*hb-2*p.caroteneScale*p.carotene[i]*carotene));
}
export function skinOpticsGLSL(){
  const vec=value=>`vec3(${value.map(v=>v.toFixed(7)).join(',')})`;
  const p=SKIN_OPTICS;
  return `vec3 skinLayerMultiplier(vec3 layers, float exposure, float blood) {
    float melanin=${p.tanMax.toFixed(3)}*layers.x*exposure;
    float hb=(.35*blood+.5*layers.z)*(1.0-.18*layers.y)-.35*blood;
    float car=.15*.8*layers.y;
    return exp(-2.0*${p.melaninScale.toFixed(3)}*${vec(p.melanin)}*melanin-${p.bloodScale.toFixed(3)}*${vec(p.blood)}*hb-2.0*${p.caroteneScale.toFixed(3)}*${vec(p.carotene)}*car);
  }`;
}

/** Smooth exposure masks from the asset's own skin weights and rest normals.
 * This is a regional approximation, not an authored UV tan-line atlas. */
export function prepareSkinRegions(mesh){
  const geometry=mesh?.geometry,position=geometry?.attributes.position,normal=geometry?.attributes.normal;
  const joints=geometry?.attributes.skinIndex,weights=geometry?.attributes.skinWeight;
  if(!position || !normal || !joints || !weights || !mesh.skeleton)return;
  const exposure=new Float32Array(position.count),blood=new Float32Array(position.count);
  for(let i=0;i<position.count;i++) {
    let sun=0,hb=0,total=0;
    for(let slot=0;slot<joints.itemSize;slot++) {
      const weight=weights.getComponent(i,slot);if(weight<=0)continue;
      const name=mesh.skeleton.bones[joints.getComponent(i,slot)]?.name || '';
      let e=.45,b=1;
      if(/head/i.test(name)){e=1;b=1.35;}
      else if(/neck/i.test(name)){e=.9;b=1.1;}
      else if(/hand/i.test(name)){e=.04+.96*Math.max(0,-normal.getZ(i));b=1.3;}
      else if(/forearm|upperarm/i.test(name)){
        const inner=Math.max(0,-normal.getX(i)*Math.sign(position.getX(i)));
        e=(/forearm/i.test(name)?.9:.7)*(1-inner)+.15*inner;
      }
      else if(/foot/i.test(name))e=.04+.51*Math.max(0,normal.getY(i));
      else if(/hips/i.test(name))e=.1;
      else if(/spine/i.test(name))e=.2+.3*Math.max(0,normal.getZ(i));
      sun+=weight*e;hb+=weight*b;total+=weight;
    }
    exposure[i]=total?sun/total:.45;blood[i]=total?hb/total:1;
  }
  geometry.setAttribute('skinExposure',new Float32BufferAttribute(exposure,1));
  geometry.setAttribute('skinBlood',new Float32BufferAttribute(blood,1));
}
