import {Float32BufferAttribute} from 'three';

export const FACIAL_MORPHS = Object.freeze(['brow_depth','nose_bridge_width','nose_tip_size','ear_prominence',
  'jaw_width','chin_projection','lip_fullness','eye_size','cheekbone_width','forehead_height',
  'temple_narrowing','nose_length','jaw_angle','blink','smile','jaw_open']);

/** The approved base contains expression deltas on the shoulders. Restrict
 * facial channels to vertices whose dominant skin joint is the head. Copy
 * only corrected attributes; never modify the cached source or the goal. */
export function scopeFacialMorphs(mesh) {
  const geometry=mesh?.geometry, joints=geometry?.attributes.skinIndex, weights=geometry?.attributes.skinWeight;
  const head=mesh?.skeleton?.bones.findIndex(bone=> /^(head|mixamorighead|bip01_head)$/i.test(bone.name));
  if(!joints || !weights || head == null || head < 0) return null;
  const allowed=new Uint8Array(joints.count);
  for(let i=0;i<joints.count;i++) {
    let dominant=-1, maximum=-1;
    for(let slot=0;slot<joints.itemSize;slot++) {
      const weight=weights.getComponent(i,slot);
      if(weight>maximum){maximum=weight;dominant=joints.getComponent(i,slot);}
    }
    allowed[i]=dominant===head?1:0;
  }
  const corrected={};
  for(const name of FACIAL_MORPHS) {
    const index=mesh.morphTargetDictionary?.[name], source=geometry.morphAttributes.position?.[index];
    if(!source)continue;
    let removed=0;
    for(let i=0;i<source.count;i++) if(!allowed[i] &&
      ['X','Y','Z'].some(axis=>Math.abs(source[`get${axis}`](i) - (geometry.morphTargetsRelative?0:geometry.attributes.position[`get${axis}`](i)))>1e-9)) removed++;
    if(!removed)continue;
    for(const key of ['position','normal']) {
      const original=geometry.morphAttributes[key]?.[index];if(!original)continue;
      const replacement=new Float32BufferAttribute(original.array.slice(),original.itemSize);
      for(let i=0;i<replacement.count;i++) if(!allowed[i]) for(let channel=0;channel<3;channel++)
        replacement.setComponent(i,channel,geometry.morphTargetsRelative?0:geometry.attributes[key].getComponent(i,channel));
      geometry.morphAttributes[key][index]=replacement;
    }
    corrected[name]=removed;
  }
  return {method:'dominant-head-joint',corrected};
}
