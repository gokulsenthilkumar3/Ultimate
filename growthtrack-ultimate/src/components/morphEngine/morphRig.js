import {Vector3} from 'three';
import {HUMAN_SURFACE} from '../../lib/humanSurface';

/** Joint offsets are measured by the asset build and stored in the GLB. Keep
 * the inverse bind pose in the same authored rig coordinates so moving a pivot
 * cannot translate the neutral skin a second time. Only opted-in assets run. */
export function createMorphRig(body){
  const metadata=body?.userData.growthtrack,skeleton=body?.skeleton;
  if(!metadata?.jointOffsets || !metadata.bindingPrepared || !skeleton)return ()=>{};
  const bones=skeleton.bones,byBone=new Map(bones.map((bone,i)=>[bone,i]));
  const base=bones.map(b=>b.position.clone()),parents=bones.map(b=>byBone.get(b.parent));
  const restGlobal=skeleton.boneInverses.map(matrix=>new Vector3().setFromMatrixPosition(matrix.clone().invert())),attachments=new Map();
  const morphs=Object.entries(metadata.jointOffsets).filter(([name,offsets])=>Object.keys(offsets).length && body.morphTargetDictionary?.[name]!=null)
    .map(([name,offsets])=>({index:body.morphTargetDictionary[name],offsets:bones.map(b=>new Vector3(...(offsets[b.name] || [0,0,0])))}));
  let previous=null;
  const shifts=bones.map(()=>new Vector3()),global=bones.map(()=>new Vector3()),local=bones.map(()=>new Vector3());
  const update=()=>{
    for(let i=0;i<bones.length;i++)for(const object of bones[i].children)if(!object.isBone && !attachments.has(object))attachments.set(object,{joint:i,position:object.position.clone()});
    const values=morphs.map(m=>body.morphTargetInfluences[m.index] || 0);
    const compensate=()=>{for(const [object,saved] of attachments){if(object.parent!==bones[saved.joint]){attachments.delete(object);continue;}object.position.copy(saved.position).sub(global[saved.joint].clone().sub(restGlobal[saved.joint]));}};
    if(previous && values.every((value,i)=>Math.abs(value-previous[i])<1e-7)){compensate();return;}
    previous=values;shifts.forEach(v=>v.set(0,0,0));
    morphs.forEach((m,i)=>{if(values[i])m.offsets.forEach((offset,j)=>shifts[j].addScaledVector(offset,values[i]));});
    const visited=new Set();
    const evaluate=i=>{
      if(visited.has(i))return;const parent=parents[i];if(parent!=null)evaluate(parent);
      local[i].copy(shifts[i]);if(parent!=null)local[i].sub(shifts[parent]);
      const limit=base[i].length()*HUMAN_SURFACE.jointOffsets.maximumSegmentRatio;
      if(local[i].length()>limit)local[i].setLength(limit);
      bones[i].position.copy(base[i]).add(local[i]);global[i].copy(bones[i].position);if(parent!=null)global[i].add(global[parent]);
      skeleton.boneInverses[i].makeTranslation(-global[i].x,-global[i].y,-global[i].z);visited.add(i);
    };
    bones.forEach((_,i)=>evaluate(i));
    compensate();
    body.userData.morphRig={method:'asset-measured-joint-offsets',joints:bones.length,morphs:morphs.length,active:values.filter(v=>v>1e-7).length};
  };
  return update;
}
