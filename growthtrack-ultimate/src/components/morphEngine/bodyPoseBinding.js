import { Float32BufferAttribute, Line3, Uint16BufferAttribute, Vector3 } from 'three';
import { POSE_STUDIO } from '../../lib/poseStudio';

/** The bundled converter used distance to joint origins, which gives even
 * mid-torso vertices arm/hand influences. Use the measured bone segments to
 * localize those weights on this clone. This remains a preview repair, not
 * artist-authored anatomical skinning or a replacement for full v3 weights. */
export function prepareBodyPoseBinding(body) {
  const geometry=body?.geometry,skeleton=body?.skeleton;
  if(!geometry?.attributes.skinIndex || !geometry.attributes.skinWeight || !skeleton)return null;
  const {segments,distancePower,distanceFloorRatio,armBlend}=POSE_STUDIO.bodyBinding;
  // Apply only to the declared shipped skeleton; custom rigs keep their weights.
  const byName=Object.fromEntries(skeleton.bones.map((bone,index)=>[bone.name,index]));
  if(Object.entries(segments).some(([start,end])=>byName[start]==null || byName[end]==null))return null;
  body.updateWorldMatrix(true,false);
  const points=skeleton.bones.map(bone=>body.worldToLocal(bone.getWorldPosition(new Vector3())));
  const lines=skeleton.bones.map((bone,index)=>new Line3(points[index],points[byName[segments[bone.name]]] || points[index]));
  const lengths=lines.map(line=>line.distance()).filter(length=>length>0).sort((a,b)=>a-b);
  const floor=lengths[Math.floor(lengths.length/2)]*distanceFloorRatio;
  const center=points[byName.Hips].x;
  const armSide=skeleton.bones.map(bone=>/^(Left|Right)(UpperArm|ForeArm|Hand)$/.exec(bone.name)?.[1]);
  const joints=geometry.attributes.skinIndex,weights=geometry.attributes.skinWeight,position=geometry.attributes.position;
  const nextJoints=new Uint16BufferAttribute(joints.array.slice(),4),nextWeights=new Float32BufferAttribute(weights.array.slice(),4);
  const point=new Vector3(),closest=new Vector3();let corrected=0;
  for(let i=0;i<position.count;i++) {
    let dominant=0;
    for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,dominant))dominant=k;
    if(['Head','Neck'].includes(skeleton.bones[joints.getComponent(i,dominant)]?.name))continue;
    point.fromBufferAttribute(position,i);
    const nearest=lines.map((line,joint)=>{
      const distance=point.distanceTo(line.closestPointToPoint(point,true,closest)),side=armSide[joint];let gate=1;
      if(side) {
        // Bone axes alone underestimate the torso's thickness. Keep arm
        // influence outside its measured shoulder span, with a smooth seam.
        const span=points[byName[`${side}UpperArm`]].x-center;
        const t=Math.max(0,Math.min(1,((point.x-center)/span-armBlend[0])/(armBlend[1]-armBlend[0])));
        gate=t*t*(3-2*t);
      }
      return {joint,score:gate/Math.max(floor,distance)**distancePower};
    }).sort((a,b)=>b.score-a.score).slice(0,4);
    const values=nearest.map(item=>item.score),sum=values.reduce((a,b)=>a+b,0);
    nextJoints.setXYZW(i,...nearest.map(item=>item.joint));nextWeights.setXYZW(i,...values.map(value=>value/sum));corrected++;
  }
  geometry.setAttribute('skinIndex',nextJoints);geometry.setAttribute('skinWeight',nextWeights);
  const report={method:'measured-bone-segments',corrected};body.userData.bodyPoseBinding=report;return report;
}
